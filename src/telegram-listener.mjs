import { readFile } from 'node:fs/promises';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { NewMessage } from 'teleproto/events';
import { settings, persistEnvValue, marketplaceCurrency, formatMarketplacePrice } from './common.mjs';
import { parseKeepaAlert } from './keepa-alert.mjs';
import { parseKeepaCondition, describeCondition } from './offer-condition.mjs';
import { findKeepaSenderInHistory } from './keepa-sender.mjs';
import { pickAmazonProduct } from './amazon-link.mjs';

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

async function amazonUrlFromMessage(message) {
  const candidates = [];
  const add = (value, primary = false) => {
    if (typeof value !== 'string' || !value.trim()) return;
    const url = value.trim().replace(/[),.!?]+$/, '');
    const existing = candidates.find((c) => c.url === url);
    if (existing) existing.primary ||= primary;
    else candidates.push({ url, primary });
  };
  const isAmazonButton = (text) => /amazon/i.test(text || '');
  const rawButtons = message.replyMarkup?.rows?.flatMap((row) => row.buttons || []) || [];
  for (const item of rawButtons) {
    const url = item.url || item.type?.url || item.button?.url || item.button?.type?.url;
    add(url, isAmazonButton(item.text));
  }

  let buttons;
  try {
    if (typeof message.getButtons === 'function') buttons = await message.getButtons();
  } catch {}
  for (const button of buttons?.flat() || []) {
    add(button.url, isAmazonButton(button.text));
  }

  const text = String(message.message || '');
  for (const entity of message.entities || []) {
    if (entity.url) add(entity.url);
    else if (/Url/i.test(entity.className || '') && Number.isInteger(entity.offset)) add(text.slice(entity.offset, entity.offset + entity.length));
  }
  for (const match of text.matchAll(/https?:\/\/[^\s<>()[\]]+/gi)) add(match[0]);
  for (const match of text.matchAll(/(?<![\w/])(?:www\.)?(?:amazon\.[a-z.]{2,6}|amzn\.(?:eu|to))\/[^\s<>()[\]]+/gi)) add(`https://${match[0]}`);

  return pickAmazonProduct(candidates);
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
  const { product, reason, tried, found } = await amazonUrlFromMessage(message);
  if (!product) {
    console.warn(`Keepa alert ${message.id} ignorato: ${reason}.` +
      (found ? ` Prodotti trovati: ${found.join(', ')}.` : '') +
      (tried.length ? ` Link esaminati: ${tried.join(' | ')}` : ''));
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
    marketplaceHost,
    condition: parseKeepaCondition(text)
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
  console.log(`Keepa alert inoltrato: sender ${senderId}, ASIN ${asin}, marketplace ${marketplaceHost}, tetto articolo ${formatMarketplacePrice(priceCents, currency)}, condizione ${describeCondition(trigger.condition)}` +
    `${trigger.condition.label ? ` ("${trigger.condition.label}")` : ''}. ` +
    `Stato: ${(await response.json()).status}.`);
}

client.addEventHandler((event) => {
  forwardAlert(event.message).catch((error) => console.error(`Errore lettura alert: ${error.message}`));
}, new NewMessage({ incoming: true }));

process.on('SIGINT', async () => {
  await client.disconnect();
  process.exit(0);
});
