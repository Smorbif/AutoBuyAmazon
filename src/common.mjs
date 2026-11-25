import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, '..');
export const settings = {};

export function reloadSettings() {
  dotenv.config({ path: path.resolve(projectRoot, '.env'), override: true });
  Object.assign(settings, {
    port: Number(process.env.KEEP_BUY_PORT || process.env.PORT || 8787),
    hookSecret: process.env.HOOK_SECRET || '',
    amazonHost: (process.env.AMAZON_HOST || 'www.amazon.it').toLowerCase(),
    profileDir: path.resolve(projectRoot, process.env.PROFILE_DIR || './data/amazon-profile'),
    autoBuy: /^true$/i.test(process.env.AUTO_BUY || 'false'),
    headless: /^true$/i.test(process.env.HEADLESS || 'false'),
    telegramApiId: Number(process.env.TELEGRAM_API_ID || 0),
    telegramApiHash: process.env.TELEGRAM_API_HASH || '',
    keepaSenderId: process.env.KEEPA_SENDER_ID || '',
    notificationSource: process.env.NOTIFICATION_SOURCE === 'keepa-web' ? 'keepa-web' : 'telegram',
    keepaProfileDir: path.resolve(projectRoot, process.env.KEEPA_PROFILE_DIR || './data/keepa-profile'),
    dataDir: path.resolve(projectRoot, './data')
  });
  return settings;
}

reloadSettings();

export async function persistEnvValue(name, value) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error('Nome impostazione non valido.');
  const envPath = path.join(projectRoot, '.env');
  let envText = '';
  try {
    envText = await readFile(envPath, 'utf8');
  } catch {}
  const line = `${name}=${JSON.stringify(String(value))}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  envText = pattern.test(envText)
    ? envText.replace(pattern, line)
    : `${envText.replace(/\s*$/, '')}\n${line}\n`;
  await writeFile(envPath, envText, 'utf8');
  reloadSettings();
}

export function amazonBaseUrl() {
  return `https://${settings.amazonHost}`;
}

export function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function extractEuroCents(value) {
  const matches = [...String(value || '').matchAll(/(?:€\s*)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*€/g)];
  if (matches.length === 0) {
    const reverseMatches = [...String(value || '').matchAll(/€\s*(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/g)];
    if (reverseMatches.length === 0) return null;
    const match = reverseMatches[0];
    return Number(match[1].replaceAll('.', '')) * 100 + Number(match[2]);
  }
  const match = matches[0];
  return Number(match[1].replaceAll('.', '')) * 100 + Number(match[2]);
}

export function formatEuro(cents) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function validateTrigger(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Body JSON non valido.');
  const notificationId = String(input.notificationId || '').trim();
  const asin = String(input.asin || '').trim().toUpperCase();
  const maxItemCents = Number(input.maxItemCents);
  const maxTotalCents = Number(input.maxTotalCents);

  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(notificationId) || notificationId === '__proto__') throw new Error('notificationId mancante o non valido.');
  if (!/^[A-Z0-9]{10}$/.test(asin)) throw new Error('ASIN non valido.');
  if (!Number.isInteger(maxItemCents) || maxItemCents < 1) throw new Error('maxItemCents deve essere un intero positivo in centesimi.');
  if (!Number.isInteger(maxTotalCents) || maxTotalCents < maxItemCents) throw new Error('maxTotalCents deve essere almeno pari a maxItemCents.');
  return { notificationId, asin, maxItemCents, maxTotalCents };
}
