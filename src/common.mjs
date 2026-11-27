import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { normalizeCondition } from './offer-condition.mjs';

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, '..');
export const settings = {};

export const EU_AMAZON_MARKETPLACES = new Set([
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.nl',
  'amazon.com.be',
  'amazon.pl',
  'amazon.se',
  'amazon.ie'
]);

export function normalizeAmazonMarketplaceHost(value) {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  return EU_AMAZON_MARKETPLACES.has(host) ? `www.${host}` : null;
}

export function amazonMarketplaceFromUrl(rawUrl) {
  try {
    return normalizeAmazonMarketplaceHost(new URL(rawUrl).hostname);
  } catch {
    return null;
  }
}

export const AMAZON_MARKETPLACE_LABELS = {
  'www.amazon.it': 'IT', 'www.amazon.de': 'DE', 'www.amazon.fr': 'FR', 'www.amazon.es': 'ES', 'www.amazon.nl': 'NL',
  'www.amazon.com.be': 'BE', 'www.amazon.pl': 'PL', 'www.amazon.se': 'SE', 'www.amazon.ie': 'IE'
};

function amazonMarketsPath() {
  return path.join(settings.dataDir, 'amazon-marketplaces.json');
}

export async function readAmazonMarkets() {
  try {
    return JSON.parse(await readFile(amazonMarketsPath(), 'utf8')) || {};
  } catch {
    return {};
  }
}

export async function recordAmazonMarket(marketplaceHost, displayName) {
  const host = normalizeAmazonMarketplaceHost(marketplaceHost);
  if (!host) return;
  const markets = await readAmazonMarkets();
  markets[host] = { displayName: String(displayName || '').slice(0, 120), confirmedAt: new Date().toISOString() };
  await writeFile(amazonMarketsPath(), JSON.stringify(markets, null, 2), 'utf8');
}

export async function forgetAmazonMarket(marketplaceHost) {
  const host = normalizeAmazonMarketplaceHost(marketplaceHost);
  const markets = await readAmazonMarkets();
  if (!host || !markets[host]) return;
  delete markets[host];
  await writeFile(amazonMarketsPath(), JSON.stringify(markets, null, 2), 'utf8');
}

export function marketplaceCurrency(marketplaceHost) {
  const host = normalizeAmazonMarketplaceHost(marketplaceHost);
  if (!host) throw new Error('Marketplace Amazon non supportato.');
  if (host === 'www.amazon.pl') return 'PLN';
  if (host === 'www.amazon.se') return 'SEK';
  return 'EUR';
}

export function reloadSettings() {
  dotenv.config({ path: path.resolve(projectRoot, '.env'), override: true });
  Object.assign(settings, {
    port: Number(process.env.KEEP_BUY_PORT || process.env.PORT || 8787),
    hookSecret: process.env.HOOK_SECRET || '',
    amazonHost: normalizeAmazonMarketplaceHost(process.env.AMAZON_HOST || 'www.amazon.it') || 'www.amazon.it',
    profileDir: path.resolve(projectRoot, process.env.PROFILE_DIR || './data/amazon-profile'),
    autoBuy: /^true$/i.test(process.env.AUTO_BUY || 'false'),
    headless: /^true$/i.test(process.env.HEADLESS || 'false'),
    // Avvia il monitoraggio all'apertura del programma e lo riavvia se si chiude per errore.
    autoStartMonitor: !/^false$/i.test(process.env.AUTO_START_MONITOR || 'true'),
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

export function amazonBaseUrl(marketplaceHost = settings.amazonHost) {
  const host = normalizeAmazonMarketplaceHost(marketplaceHost);
  if (!host) throw new Error('Marketplace Amazon non supportato.');
  return `https://${host}`;
}

export function extractMarketplaceMinor(value, currency) {
  const text = String(value || '');
  const symbol = currency === 'PLN' ? '(?:zł|PLN)' : currency === 'SEK' ? '(?:kr|SEK)' : '€';
  // L'importo deve iniziare con una cifra: "€18.47" non va letto come " " + "€".
  const amountPattern = String.raw`(\d[\d\s\u00a0.,]*)`;
  const before = text.match(new RegExp(`${symbol}\\s*${amountPattern}`, 'i'));
  const after = text.match(new RegExp(`${amountPattern}\\s*${symbol}`, 'i'));
  const raw = (after || before)?.[1];
  if (!raw) return null;
  const normalized = raw.replace(/[\s\u00a0]/g, '');
  const separator = Math.max(normalized.lastIndexOf(','), normalized.lastIndexOf('.'));
  if (separator < 0) {
    const whole = Number(normalized.replace(/\D/g, ''));
    return Number.isSafeInteger(whole) && whole > 0 ? whole * 100 : null;
  }
  const whole = Number(normalized.slice(0, separator).replace(/\D/g, '') || '0');
  const fractionDigits = normalized.slice(separator + 1).replace(/\D/g, '');
  if (fractionDigits.length < 1 || fractionDigits.length > 2) return null;
  const fraction = Number(fractionDigits.padEnd(2, '0'));
  const minor = whole * 100 + fraction;
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function formatMarketplacePrice(minor, currency) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(minor / 100);
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
  const marketplaceHost = normalizeAmazonMarketplaceHost(input.marketplaceHost);

  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(notificationId) || notificationId === '__proto__') throw new Error('notificationId mancante o non valido.');
  if (!/^[A-Z0-9]{10}$/.test(asin)) throw new Error('ASIN non valido.');
  if (!Number.isInteger(maxItemCents) || maxItemCents < 1) throw new Error('maxItemCents deve essere un intero positivo in unità minori della valuta del marketplace.');
  if (!Number.isInteger(maxTotalCents) || maxTotalCents < maxItemCents) throw new Error('maxTotalCents deve essere almeno pari a maxItemCents nella valuta del marketplace.');
  if (!marketplaceHost) throw new Error('Marketplace Amazon europeo non valido o non supportato.');
  const condition = normalizeCondition(input.condition);
  return { notificationId, asin, maxItemCents, maxTotalCents, marketplaceHost, condition, currency: marketplaceCurrency(marketplaceHost) };
}
