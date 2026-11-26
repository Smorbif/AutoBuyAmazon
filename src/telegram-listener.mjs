import { readFile } from 'node:fs/promises';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { NewMessage } from 'teleproto/events';
import { settings, persistEnvValue, amazonMarketplaceFromUrl, marketplaceCurrency, formatMarketplacePrice } from './common.mjs';
import { parseKeepaAlert } from './keepa-alert.mjs';
import { findKeepaSenderInHistory } from './keepa-sender.mjs';

if (!settings.telegramApiId || !settings.telegramApiHash) {
  throw new Error('Imposta TELEGRAM_API_ID e TELEGRAM_API_HASH nel file .env.');
}

let session;
try {
  session = await readFile(`${settings.dataDir}/telegram.session`, 'utf8');
} catch {
  throw new Error('Sessione Telegram assente: esegui prima npm run telegram-login.');
}

const client = new TelegramClient(new StringSession(session), settings.telegramApiId, settings.telegramApiHash, {
  connectionRetries: 5
});
await client.connect();
await client.getMe();

function amazonProductFromUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const marketplaceHost = amazonMarketplaceFromUrl(url.toString());
  if (!marketplaceHost) return null;
  const match = url.pathname.match(/\/(?:dp|product|offer-listing|aw\/d|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);
  return match ? { asin: match[1].toUpperCase(), marketplaceHost } : null;
}

async function amazonUrlFromMessage(message) {
  const candidates = [];
  const add = (value) => {
    if (typeof value === 'string' && value.trim()) candidates.push(value.trim().replace(/[),.!?]+$/, ''));
  };
  const rawButtons = message.replyMarkup?.rows?.flatMap((row) => row.buttons || []) || [];
  for (const item of rawButtons) {
    const text = item.text || '';
    const url = item.url || item.type?.url || item.button?.url || item.button?.type?.url;
    if (/vai su amazon|go to amazon/i.test(text)) add(url);
  }

  let buttons;
  try {
    if (typeof message.getButtons === 'function') buttons = await message.getButtons();
  } catch {}
  for (const button of buttons?.flat() || []) {
    if (/vai su amazon|go to amazon/i.test(button.text || '')) add(button.url);
  }

  for (const entity of message.entities || []) add(entity.url);
  for (const match of String(message.message || '').matchAll(/https?:\/\/[^\s<>()[\]]+/gi)) add(match[0]);

  const parsed = candidates.map(amazonProductFromUrl).filter(Boolean);
  const unique = new Map(parsed.map((product) => [`${product.marketplaceHost}:${product.asin}`, product]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

async function detectKeepaSenderFromHistory() {
  if (settings.keepaSenderId) return settings.keepaSenderId;
  const detection = await findKeepaSenderInHistory(client);
  if (!detection.senderId) {
    if (detection.ambiguous) console.warn('Più mittenti Keepa trovati nella cronologia; nessun ID è stato scelto automaticamente.');
    return '';
  }
  await persistEnvValue('KEEPA_SENDER_ID', detection.senderId);
  console.log(`Mittente Keepa trovato nella ${detection.source}.`);
  console.log(`KEEP_BUY_KEEPA_SENDER_ID=${detection.senderId}`);
  return detection.senderId;
}

if (!settings.keepaSenderId) await detectKeepaSenderFromHistory();
console.log('Ascolto locale delle notifiche Keepa Telegram.');

async function forwardAlert(message) {
  const text = String(message.message || '');
  if (parseKeepaAlert(text) === null) return;

  const senderId = String(message.senderId || '');
  const product = await amazonUrlFromMessage(message);
  if (!product) {
    console.warn(`Keepa alert ${message.id} ignorato: link Amazon europeo supportato/ASIN assente o ambiguo.`);
    return;
  }
  const { asin, marketplaceHost } = product;
  const currency = marketplaceCurrency(marketplaceHost);
  const priceCents = parseKeepaAlert(text, currency);
  if (priceCents === null) {
    console.warn(`Keepa alert ${message.id} ignorato: prezzo nella valuta ${currency} assente o non riconosciuto.`);
    return;
  }

  if (!senderId) return;
  if (!settings.keepaSenderId) {
    if (settings.autoBuy) {
      console.warn('Acquisto automatico fermato: il mittente Keepa non è stato ancora verificato.');
      return;
    }
    if (message.fwdFrom) return;
    await persistEnvValue('KEEPA_SENDER_ID', senderId);
    console.log(`KEEP_BUY_KEEPA_SENDER_ID=${senderId}`);
  } else if (senderId !== settings.keepaSenderId) {
    return;
  }

  const notificationId = `tg-${String(message.chatId || 'chat')}-${message.id}`;
  const trigger = {
    notificationId,
    asin,
    maxItemCents: priceCents,
    maxTotalCents: priceCents,
    marketplaceHost
  };
  const response = await fetch(`http://127.0.0.1:${settings.port}/trigger`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${settings.hookSecret}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(trigger)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Purchase runner ha risposto ${response.status}: ${body}`);
  }
  console.log(`Keepa alert inoltrato: sender ${senderId}, ASIN ${asin}, marketplace ${marketplaceHost}, tetto articolo ${formatMarketplacePrice(priceCents, currency)}. ` +
    `Stato: ${(await response.json()).status}.`);
}

client.addEventHandler((event) => {
  forwardAlert(event.message).catch((error) => console.error(`Errore lettura alert: ${error.message}`));
}, new NewMessage({ incoming: true }));

process.on('SIGINT', async () => {
  await client.disconnect();
  process.exit(0);
});
