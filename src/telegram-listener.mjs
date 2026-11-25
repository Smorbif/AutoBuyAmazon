import { readFile } from 'node:fs/promises';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { NewMessage } from 'teleproto/events';
import { settings, persistEnvValue } from './common.mjs';

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

function parseCents(raw) {
  const value = String(raw || '').trim();
  const separator = Math.max(value.lastIndexOf(','), value.lastIndexOf('.'));
  if (separator < 0) return Number(value.replace(/\D/g, '')) * 100;
  const whole = value.slice(0, separator).replace(/\D/g, '') || '0';
  const decimals = value.slice(separator + 1).replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
  return Number(whole) * 100 + Number(decimals || '0');
}

function asinFromAmazonUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!(url.hostname === 'amazon.it' || url.hostname.endsWith('.amazon.it'))) return null;
  const match = url.pathname.match(/\/(?:dp|product|offer-listing|aw\/d)\/([A-Z0-9]{10})(?:\/|$)/i);
  return match?.[1]?.toUpperCase() || null;
}

async function amazonUrlFromMessage(message) {
  const rawButtons = message.replyMarkup?.rows?.flatMap((row) => row.buttons || []) || [];
  const rawButton = rawButtons.find((item) => {
    const text = item.text || '';
    const url = item.url || item.type?.url || item.button?.url || item.button?.type?.url;
    return /vai su amazon/i.test(text) && url;
  });
  if (rawButton) {
    return rawButton.url || rawButton.type?.url || rawButton.button?.url || rawButton.button?.type?.url;
  }

  const buttons = await message.getButtons().catch(() => undefined);
  const button = buttons?.flat().find((item) => /vai su amazon/i.test(item.text || '') && item.url);
  if (button?.url) return button.url;

  const entities = message.entities || [];
  const entity = entities.find((item) => item.url && /amazon\.it/i.test(item.url));
  if (entity?.url) return entity.url;
  const inlineLink = String(message.message || '').match(/https?:\/\/[^\s]+amazon\.it[^\s]*/i);
  return inlineLink?.[0] || null;
}

function parseKeepaAlert(text) {
  if (!/ha raggiunto il prezzo che desideri/i.test(text)) return null;
  const priceMatch = text.match(/Prezzo attuale:\s*([\d.,]+)\s*€/i);
  if (!priceMatch) return null;
  const cents = parseCents(priceMatch[1]);
  if (!Number.isSafeInteger(cents) || cents < 1) return null;
  return cents;
}

async function detectKeepaSenderFromHistory() {
  if (settings.keepaSenderId) return settings.keepaSenderId;
  try {
    const recentMessages = await client.getMessages(undefined, {
      search: 'ha raggiunto il prezzo che desideri',
      limit: 50
    });
    const alert = recentMessages.find((message) =>
      !message.out && !message.fwdFrom && message.senderId && parseKeepaAlert(message.message) !== null
    );
    if (!alert) return '';
    const senderId = String(alert.senderId);
    await persistEnvValue('KEEPA_SENDER_ID', senderId);
    console.log(`KEEP_BUY_KEEPA_SENDER_ID=${senderId}`);
    return senderId;
  } catch (error) {
    console.warn(`Lettura cronologia Keepa non riuscita: ${error.message}`);
    return '';
  }
}

if (!settings.keepaSenderId) await detectKeepaSenderFromHistory();
console.log('Ascolto locale delle notifiche Keepa Telegram.');

async function forwardAlert(message) {
  const text = String(message.message || '');
  const maxItemCents = parseKeepaAlert(text);
  if (maxItemCents === null) return;

  const senderId = String(message.senderId || '');
  const productUrl = await amazonUrlFromMessage(message);
  const asin = productUrl ? asinFromAmazonUrl(productUrl) : null;
  if (!asin) {
    console.warn(`Keepa alert ${message.id} ignorato: link Amazon.it/ASIN non trovato.`);
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
    maxItemCents,
    maxTotalCents: maxItemCents
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
  console.log(`Keepa alert inoltrato: sender ${senderId}, ASIN ${asin}, tetto articolo ${(maxItemCents / 100).toFixed(2)} €. ` +
    `Stato: ${(await response.json()).status}.`);
}

client.addEventHandler((event) => {
  forwardAlert(event.message).catch((error) => console.error(`Errore lettura alert: ${error.message}`));
}, new NewMessage({ incoming: true }));

process.on('SIGINT', async () => {
  await client.disconnect();
  process.exit(0);
});
