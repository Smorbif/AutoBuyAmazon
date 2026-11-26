import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { settings, projectRoot, reloadSettings, amazonBaseUrl, amazonMarketplaceFromUrl, normalizeText, extractMarketplaceMinor, formatMarketplacePrice, validateTrigger } from './common.mjs';

await mkdir(settings.profileDir, { recursive: true });
await mkdir(settings.dataDir, { recursive: true });

const journalPath = `${settings.dataDir}/processed.json`;
let journal = {};
try {
  journal = JSON.parse(await readFile(journalPath, 'utf8'));
} catch {
  journal = {};
}

let context;
let queue = Promise.resolve();
let interactiveChild = null;
let interactiveKind = null;
let monitorChild = null;
let amazonLoginContext = null;
const activityLog = [];

function logActivity(level, message) {
  activityLog.push({ time: new Date().toISOString(), level, message: String(message).slice(0, 1000) });
  if (activityLog.length > 120) activityLog.splice(0, activityLog.length - 120);
}

function attachChild(child, label) {
  let pending = '';
  let promptTimer;
  const consume = (chunk, level) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      const detectedSender = line.trim().match(/^KEEP_BUY_KEEPA_SENDER_ID=([^\s]+)$/);
      if (detectedSender) {
        reloadSettings();
        logActivity('success', 'ID mittente Keepa rilevato automaticamente e salvato.');
      } else if (line.trim()) {
        logActivity(level, `${label}: ${line.trim()}`);
      }
    }
    clearTimeout(promptTimer);
    if (pending.trim()) {
      promptTimer = setTimeout(() => {
        if (pending.trim()) logActivity(level, `${label}: ${pending.trim()}`);
        pending = '';
      }, 250);
    }
  };
  child.stdout?.on('data', (chunk) => consume(chunk, 'info'));
  child.stderr?.on('data', (chunk) => consume(chunk, 'warning'));
  child.on('error', (error) => logActivity('error', `${label}: ${error.message}`));
  child.on('close', (code) => {
    clearTimeout(promptTimer);
    if (pending.trim()) logActivity(code === 0 ? 'info' : 'error', `${label}: ${pending.trim()}`);
    logActivity(code === 0 ? 'success' : 'warning', `${label}: terminato (codice ${code}).`);
    if (child === interactiveChild) {
      interactiveChild = null;
      interactiveKind = null;
    }
    if (child === monitorChild) monitorChild = null;
  });
}

async function getContext() {
  if (!context) {
    context = await chromium.launchPersistentContext(settings.profileDir, {
      headless: settings.headless,
      viewport: { width: 1440, height: 1000 }
    });
  }
  return context;
}

async function saveJournal() {
  await writeFile(journalPath, JSON.stringify(journal, null, 2), 'utf8');
}

const OFFER_READY_SELECTOR = '#aod-pinned-offer, #aod-offer, .olpOffer, #add-to-cart-button, #outOfStock, #availability';
const ADD_TO_CART_NAME = /aggiungi al carrello|add to (?:cart|basket)|in den einkaufswagen|ajouter au panier|añadir a (?:la )?cesta|in winkelwagen|do koszyka|kundvagnen/i;

async function cardPriceCents(card, currency) {
  // Prima il prezzo da pagare, poi qualsiasi prezzo non barrato.
  for (const selector of [
    '.priceToPay .a-offscreen', '.priceToPay .aok-offscreen', '.apexPriceToPay .a-offscreen',
    '[id^="aod-price-"] .a-offscreen', '[id^="aod-price-"] .aok-offscreen',
    '.a-price:not(.a-text-price) .a-offscreen', '.a-price:not(.a-text-price) .aok-offscreen', '.a-price:not(.a-text-price)'
  ]) {
    const value = await card.locator(selector).first().textContent({ timeout: 1000 }).catch(() => '');
    const cents = extractMarketplaceMinor(value, currency);
    if (cents !== null) return cents;
  }
  const text = await card.innerText().catch(() => '');
  return extractMarketplaceMinor(text, currency);
}

async function offerCards(page) {
  const cards = [];
  // Pannello "Tutte le offerte" (AOD): offerta in evidenza + altre offerte.
  const pinned = page.locator('#aod-pinned-offer').first();
  if (await pinned.count().catch(() => 0)) {
    // Il prezzo dell'offerta in evidenza può stare fuori dal suo contenitore (#aod-price-0).
    const pinnedPrice = page.locator('#aod-price-0').first();
    cards.push({ priceCard: pinned, fallbackPriceCard: (await pinnedPrice.count().catch(() => 0)) ? pinnedPrice : null, actionCard: pinned });
  }
  for (const card of await page.locator('#aod-offer').all().catch(() => [])) cards.push({ priceCard: card, actionCard: card });
  if (!cards.length) {
    for (const card of await page.locator('.olpOffer, [data-csa-c-offer-id]').all().catch(() => [])) cards.push({ priceCard: card, actionCard: card });
  }
  // Buy box della pagina prodotto: sempre come candidato aggiuntivo.
  for (const selector of ['#corePrice_feature_div', '#corePriceDisplay_desktop_feature_div', '#apex_desktop', '#desktop_buybox', '#buybox']) {
    const box = page.locator(selector).first();
    if (await box.count().catch(() => 0)) {
      const buyBox = page.locator('#desktop_buybox, #buybox, #addToCart_feature_div').first();
      if (await buyBox.count().catch(() => 0)) cards.push({ priceCard: box, actionCard: buyBox });
      break;
    }
  }
  return cards;
}

async function waitForOfferPrices(page) {
  await page.waitForFunction(() => {
    const nodes = document.querySelectorAll('#aod-pinned-offer .a-price, #aod-price-0 .a-price, #aod-offer .a-price, #corePrice_feature_div .a-price, #corePriceDisplay_desktop_feature_div .a-price, #apex_desktop .a-price');
    return [...nodes].some((node) => /\d/.test(node.textContent || ''));
  }, null, { timeout: 15000 }).catch(() => {});
}

async function saveOfferDebug(page, trigger) {
  try {
    const base = path.join(settings.dataDir, `offer-debug-${trigger.asin}`);
    await page.screenshot({ path: `${base}.png`, fullPage: false });
    await writeFile(`${base}.html`, await page.content(), 'utf8');
    return `${base}.png`;
  } catch {
    return null;
  }
}

async function detectOffer(page, trigger) {
  await page.waitForSelector(OFFER_READY_SELECTOR, { timeout: 20000 }).catch(() => {});
  // Il pannello AOD si carica in modo asincrono dopo la pagina prodotto.
  await page.waitForSelector('#aod-pinned-offer, #aod-offer', { timeout: 8000 }).catch(() => {});
  await waitForOfferPrices(page);
  const cards = await offerCards(page);
  if (cards.length === 0) {
    const debug = await saveOfferDebug(page, trigger);
    throw new Error(`Amazon non ha mostrato offerte riconoscibili; nessun acquisto eseguito.${debug ? ` Schermata salvata in ${debug}.` : ''}`);
  }

  const matches = [];
  let cheapest = null;
  for (const item of cards) {
    const { priceCard, actionCard, fallbackPriceCard } = item;
    let cents = await cardPriceCents(priceCard, trigger.currency);
    if (cents === null && fallbackPriceCard) cents = await cardPriceCents(fallbackPriceCard, trigger.currency);
    if (cents === null) continue;
    if (cheapest === null || cents < cheapest) cheapest = cents;
    if (cents > trigger.maxItemCents) continue;
    matches.push({ card: actionCard, cents });
  }

  matches.sort((a, b) => a.cents - b.cents);
  if (matches.length === 0) {
    const seen = cheapest === null ? 'nessun prezzo leggibile' : `migliore offerta vista ${formatMarketplacePrice(cheapest, trigger.currency)}`;
    const debug = cheapest === null ? await saveOfferDebug(page, trigger) : null;
    throw new Error(`Nessuna offerta del prodotto è disponibile entro il prezzo indicato da Keepa (${seen}).${debug ? ` Schermata salvata in ${debug}.` : ''}`);
  }
  return matches[0];
}

async function getCheckoutTotalCents(page, currency) {
  const selectors = [
    '#subtotals-marketplace-table .grand-total-price',
    '#sc-subtotal-amount-activecart',
    '#sc-subtotal-amount-buybox',
    '[data-testid="grand-total"]'
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      const value = await locator.innerText().catch(() => '');
      const cents = extractMarketplaceMinor(value, currency);
      if (cents !== null) return cents;
    }
  }
  return null;
}

async function ensureSingleTargetInCart(page, trigger) {
  const lines = page.locator('#sc-active-cart .sc-list-item');
  const count = await lines.count().catch(() => 0);
  if (count !== 1) throw new Error(`Il carrello non contiene un solo articolo (rilevati ${count}); fermo prima del checkout.`);
  const targetLink = page.locator(`#sc-active-cart a[href*="${trigger.asin}"]`).first();
  if (!(await targetLink.count().catch(() => 0))) throw new Error('Non riesco a verificare che l’unico articolo nel carrello sia l’ASIN richiesto.');
}

async function runTrigger(trigger) {
  const browserContext = await getContext();
  const page = browserContext.pages()[0] || await browserContext.newPage();
  const marketplaceUrl = amazonBaseUrl(trigger.marketplaceHost);
  const offersUrl = `${marketplaceUrl}/dp/${trigger.asin}?aod=1&psc=1`;
  await page.goto(offersUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

  if (/\/ap\/signin|\/signin/i.test(page.url())) throw new Error('Sessione Amazon non autenticata; esegui npm run login.');
  if (amazonMarketplaceFromUrl(page.url()) !== trigger.marketplaceHost) throw new Error('Navigazione fuori dal marketplace indicato dall’avviso Keepa; nessun acquisto eseguito.');

  const offer = await detectOffer(page, trigger);
  console.log(`[${trigger.notificationId}] Offerta su ${trigger.marketplaceHost}: ${formatMarketplacePrice(offer.cents, trigger.currency)} entro il prezzo dell’avviso Keepa.`);

  if (!settings.autoBuy) return { status: 'dry_run', offerCents: offer.cents };

  let addButton = offer.card.getByRole('button', { name: ADD_TO_CART_NAME }).first();
  if (!(await addButton.count().catch(() => 0))) addButton = offer.card.locator('input[name="submit.addToCart"], #add-to-cart-button').first();
  if (!(await addButton.count().catch(() => 0))) throw new Error('Nessun pulsante Aggiungi al carrello riconosciuto dentro l’offerta; nessun ordine eseguito.');
  await addButton.click();
  await page.waitForTimeout(1200);
  await page.goto(`${marketplaceUrl}/cart`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await ensureSingleTargetInCart(page, trigger);

  const cartTotal = await getCheckoutTotalCents(page, trigger.currency);
  if (cartTotal === null) throw new Error('Totale carrello non riconoscibile; fermo prima del checkout.');
  if (cartTotal > trigger.maxTotalCents) throw new Error(`Totale carrello ${formatMarketplacePrice(cartTotal, trigger.currency)} oltre il tetto di ${formatMarketplacePrice(trigger.maxTotalCents, trigger.currency)}.`);

  const checkoutButton = page.locator('input[name="proceedToRetailCheckout"], #sc-buy-box-ptc-button, button').filter({ hasText: /procedi all.acquisto|procedi all.ordine|proceed to checkout|zur kasse|passer (?:la commande|à la caisse)|tramitar pedido|proceder al pago|afrekenen|przejdź do kasy|gå till kassan/i }).first();
  if (!(await checkoutButton.count().catch(() => 0))) throw new Error('Pulsante checkout non riconosciuto; articolo lasciato nel carrello.');
  await checkoutButton.click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1200);

  if (/\/ap\/signin|\/signin/i.test(page.url())) throw new Error('Amazon richiede un nuovo accesso; nessun ordine inviato.');
  if (amazonMarketplaceFromUrl(page.url()) !== trigger.marketplaceHost) throw new Error('Checkout fuori dal marketplace indicato dall’avviso Keepa; ordine non inviato.');
  const summaryText = normalizeText(await page.locator('body').innerText().catch(() => ''));
  const targetCheckoutLink = page.locator(`a[href*="${trigger.asin}"]`).first();
  if (!(await targetCheckoutLink.count().catch(() => 0))) throw new Error('Riepilogo checkout senza link prodotto verificabile; ordine non inviato.');
  const finalTotal = await getCheckoutTotalCents(page, trigger.currency);
  if (finalTotal === null) throw new Error('Totale finale non riconoscibile; ordine non inviato.');
  if (finalTotal > trigger.maxTotalCents) throw new Error(`Totale finale ${formatMarketplacePrice(finalTotal, trigger.currency)} oltre il tetto di ${formatMarketplacePrice(trigger.maxTotalCents, trigger.currency)}.`);

  const submit = page.locator('#submitOrderButtonId').first();
  if (!(await submit.count().catch(() => 0))) throw new Error('Pulsante finale non riconosciuto; ordine non inviato.');
  await submit.click();
  await page.waitForTimeout(2500);
  const confirmation = normalizeText(await page.locator('body').innerText().catch(() => ''));
  if (!/ordine ricevuto|ordine effettuato|order placed|order received|thank you|bestellung (?:aufgegeben|abgeschlossen)|commande (?:passée|confirmée)|pedido (?:realizado|confirmado)|bestelling geplaatst|zam[oó]wienie (?:złożone|zrealizowane)|best[aä]llning (?:skickad|bekr[aä]ftad)/i.test(confirmation)) {
    throw new Error('Click finale inviato ma conferma ordine non riconosciuta: controlla Amazon prima di ritentare.');
  }
  return { status: 'ordered', offerCents: offer.cents, finalTotalCents: finalTotal };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let data = '';
  for await (const chunk of request) {
    data += chunk;
    if (data.length > 32768) throw new Error('Richiesta troppo grande.');
  }
  return JSON.parse(data || '{}');
}

async function readOptionalJson(filename) {
  try {
    return JSON.parse(await readFile(filename, 'utf8'));
  } catch {
    return null;
  }
}

function configView() {
  return {
    notificationSource: settings.notificationSource,
    telegramApiIdSet: Boolean(settings.telegramApiId),
    telegramApiHashSet: Boolean(settings.telegramApiHash),
    keepaSenderId: settings.keepaSenderId,
    hookSecretSet: Boolean(settings.hookSecret && !settings.hookSecret.startsWith('replace-with-')),
    autoBuy: settings.autoBuy,
    amazonHost: settings.amazonHost
  };
}

function safeEnv(value, label, { required = false, maxLength = 256 } = {}) {
  const text = String(value ?? '').trim();
  if (required && !text) throw new Error(`${label} è obbligatorio.`);
  if (text.length > maxLength || /[\r\n\0]/.test(text)) throw new Error(`${label} non valido.`);
  return text;
}

async function persistConfig(input) {
  const notificationSource = safeEnv(input.notificationSource ?? settings.notificationSource, 'Fonte notifiche');
  if (!['telegram', 'keepa-web'].includes(notificationSource)) throw new Error('Scegli Telegram oppure Keepa tramite sito.');
  if (monitorChild && notificationSource !== settings.notificationSource) {
    throw new Error('Ferma il monitoraggio prima di cambiare la fonte delle notifiche.');
  }

  const apiIdInput = safeEnv(input.telegramApiId, 'TELEGRAM_API_ID');
  const apiHashInput = safeEnv(input.telegramApiHash, 'TELEGRAM_API_HASH');
  const telegramApiId = apiIdInput || String(settings.telegramApiId || '');
  const telegramApiHash = apiHashInput || settings.telegramApiHash;
  if (notificationSource === 'telegram') {
    if (!/^\d+$/.test(telegramApiId)) throw new Error('Inserisci il numero api_id di Telegram.');
    if (!/^[a-fA-F0-9]{32}$/.test(telegramApiHash)) throw new Error('Inserisci l’api_hash Telegram di 32 caratteri esadecimali.');
  }

  const senderId = safeEnv(input.keepaSenderId ?? settings.keepaSenderId, 'ID mittente Keepa', { maxLength: 80 });
  const sourceChanged = notificationSource !== settings.notificationSource;
  const autoBuy = sourceChanged ? false : Boolean(input.autoBuy ?? settings.autoBuy);

  const secret = settings.hookSecret && !settings.hookSecret.startsWith('replace-with-')
    ? settings.hookSecret
    : randomBytes(32).toString('hex');
  const envLines = [
    `PORT=${settings.port}`,
    `HOOK_SECRET=${JSON.stringify(secret)}`,
    'AMAZON_HOST=www.amazon.it',
    'PROFILE_DIR=./data/amazon-profile',
    'KEEPA_PROFILE_DIR=./data/keepa-profile',
    `NOTIFICATION_SOURCE=${notificationSource}`,
    `AUTO_BUY=${autoBuy}`,
    `TELEGRAM_API_ID=${telegramApiId}`,
    `TELEGRAM_API_HASH=${telegramApiHash}`,
    `KEEPA_SENDER_ID=${JSON.stringify(senderId)}`,
    'HEADLESS=false',
    ''
  ];
  await writeFile(path.resolve(projectRoot, '.env'), envLines.join('\n'), 'utf8');
  reloadSettings();
  logActivity('success', sourceChanged
    ? `Configurazione salvata. Fonte notifiche: ${notificationSource === 'telegram' ? 'Telegram' : 'sito Keepa'}; acquisti automatici disattivati per la verifica della nuova sorgente.`
    : `Configurazione salvata localmente. Acquisto automatico ${settings.autoBuy ? 'attivo' : 'disattivato'}.`);
  return configView();
}

async function setAutoBuy(enabled) {
  if (enabled) {
    if (settings.notificationSource === 'telegram') {
      if (!settings.telegramApiId || !settings.telegramApiHash || !existsSync(path.join(settings.dataDir, 'telegram.session'))) {
        throw new Error('Collega prima Telegram e salva le credenziali nel pannello.');
      }
      if (!settings.keepaSenderId) throw new Error('Imposta l’ID mittente Keepa prima di attivare gli acquisti.');
      if (!existsSync(path.join(settings.dataDir, 'telegram-account.json'))) throw new Error('Verifica l’account Telegram dal pulsante Collega/Verifica.');
    } else if (!existsSync(path.join(settings.dataDir, 'keepa-login.ok')) || !existsSync(path.join(settings.dataDir, 'keepa-account.json'))) {
      throw new Error('Collega e verifica prima l’account dal sito Keepa.');
    }
    if (!existsSync(path.join(settings.dataDir, 'amazon-login.ok')) || !existsSync(path.join(settings.dataDir, 'amazon-account.json'))) {
      throw new Error('Accedi ad Amazon e verifica il nome account dal pannello.');
    }
  }
  const config = await persistConfig({ autoBuy: enabled });
  logActivity(enabled ? 'warning' : 'success', enabled
    ? 'Acquisto automatico abilitato: le nuove notifiche Keepa possono inviare ordini.'
    : 'Acquisto automatico disattivato.');
  return config;
}

function launchInteractive(kind) {
  if (kind === 'keepa' && monitorChild && settings.notificationSource === 'keepa-web') {
    throw new Error('Ferma prima il monitoraggio Keepa: sta usando il profilo del browser.');
  }
  if (interactiveChild) {
    if (interactiveKind === kind) return { running: true, kind, alreadyRunning: true };
    throw new Error(`È già attivo il passaggio: ${interactiveKind}. Completa o annulla quello in corso.`);
  }
  if (kind === 'telegram' && (!settings.telegramApiId || !settings.telegramApiHash)) {
    throw new Error('Prima salva api_id e api_hash Telegram nella configurazione.');
  }
  const filename = kind === 'telegram' ? 'telegram-login.mjs' : kind === 'amazon' ? 'login.mjs' : kind === 'keepa' ? 'keepa-login.mjs' : null;
  if (!filename) throw new Error('Passaggio di accesso non riconosciuto.');
  const child = spawn(process.execPath, [path.join(projectRoot, 'src', filename)], {
    cwd: projectRoot,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });
  interactiveChild = child;
  interactiveKind = kind;
  const label = kind === 'telegram' ? 'Telegram' : kind === 'amazon' ? 'Amazon' : 'Keepa';
  attachChild(child, label);
  logActivity('info', `Avviato accesso ${label}: segui le istruzioni nel browser e nel pannello.`);
  return { running: true, kind };
}

function startMonitoring() {
  if (monitorChild) return { running: true };
  if (!settings.hookSecret || settings.hookSecret.startsWith('replace-with-')) throw new Error('Salva prima la configurazione dal pannello.');
  let filename;
  let label;
  if (settings.notificationSource === 'telegram') {
    if (!settings.telegramApiId || !settings.telegramApiHash) throw new Error('Completa prima la configurazione Telegram.');
    if (!existsSync(path.join(settings.dataDir, 'telegram.session'))) throw new Error('Completa prima il collegamento Telegram.');
    filename = 'telegram-listener.mjs';
    label = 'Keepa Telegram';
  } else {
    if (!existsSync(path.join(settings.dataDir, 'keepa-login.ok')) || !existsSync(path.join(settings.dataDir, 'keepa-account.json'))) {
      throw new Error('Collega prima l’account dal sito Keepa.');
    }
    filename = 'keepa-web-listener.mjs';
    label = 'Keepa Web';
  }
  if (settings.autoBuy) {
    if (settings.notificationSource === 'telegram') {
      if (!settings.keepaSenderId) throw new Error('Imposta l’ID mittente Keepa prima di avviare gli acquisti.');
      if (!existsSync(path.join(settings.dataDir, 'telegram-account.json'))) throw new Error('Verifica l’account Telegram dal pannello.');
    } else if (!existsSync(path.join(settings.dataDir, 'keepa-account.json'))) {
      throw new Error('Verifica l’account Keepa dal pannello.');
    }
    if (!existsSync(path.join(settings.dataDir, 'amazon-login.ok')) || !existsSync(path.join(settings.dataDir, 'amazon-account.json'))) {
      throw new Error('Verifica l’account Amazon dal pannello.');
    }
  }
  const child = spawn(process.execPath, [path.join(projectRoot, 'src', filename)], {
    cwd: projectRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  monitorChild = child;
  attachChild(child, label);
  logActivity('success', `Monitoraggio ${settings.notificationSource === 'telegram' ? 'Telegram' : 'Keepa web'} avviato${settings.autoBuy ? ' con ordini automatici attivi.' : ' in modalità di prova.'}`);
  return { running: true };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const publicFiles = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
    '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
    '/favicon.svg': ['favicon.svg', 'image/svg+xml']
  };
  if (request.method === 'GET' && publicFiles[url.pathname]) {
    const [filename, contentType] = publicFiles[url.pathname];
    const content = await readFile(path.join(projectRoot, 'public', filename));
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    response.end(content);
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/config') {
    return sendJson(response, 200, configView());
  }
  if (request.method === 'GET' && url.pathname === '/api/state') {
    const telegramAccount = await readOptionalJson(path.join(settings.dataDir, 'telegram-account.json'));
    const amazonAccount = await readOptionalJson(path.join(settings.dataDir, 'amazon-account.json'));
    const keepaAccount = await readOptionalJson(path.join(settings.dataDir, 'keepa-account.json'));
    return sendJson(response, 200, {
      status: 'ready',
      monitorRunning: Boolean(monitorChild),
      interactiveKind,
      autoBuy: settings.autoBuy,
      telegramSessionExists: existsSync(path.join(settings.dataDir, 'telegram.session')),
      keepaSessionConfirmed: existsSync(path.join(settings.dataDir, 'keepa-login.ok')),
      amazonSessionConfirmed: existsSync(path.join(settings.dataDir, 'amazon-login.ok')),
      telegramAccount,
      keepaAccount,
      amazonAccount,
      config: configView(),
      activity: activityLog.slice(-60),
      events: Object.values(journal).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 12)
    });
  }
  if (request.method === 'POST' && url.pathname === '/api/config') {
    try {
      const config = await persistConfig(await readJson(request));
      return sendJson(response, 200, { status: 'saved', config });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/auto-buy') {
    try {
      const input = await readJson(request);
      if (typeof input.enabled !== 'boolean') throw new Error('Valore abilitazione non valido.');
      const config = await setAutoBuy(input.enabled);
      return sendJson(response, 200, { status: 'saved', config });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/login/start') {
    try {
      const input = await readJson(request);
      return sendJson(response, 202, launchInteractive(String(input.kind || '')));
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/login/input') {
    if (!interactiveChild?.stdin?.writable) return sendJson(response, 409, { error: 'Nessun passaggio di accesso in attesa.' });
    try {
      const input = await readJson(request);
      const value = String(input.value ?? '');
      if (value.length > 1000 || /[\0]/.test(value)) throw new Error('Valore non valido.');
      interactiveChild.stdin.write(`${value}\n`);
      logActivity('info', 'Valore di accesso inviato al passaggio selezionato.');
      return sendJson(response, 200, { status: 'sent' });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/login/stop') {
    if (!interactiveChild) return sendJson(response, 200, { status: 'idle' });
    interactiveChild.kill();
    return sendJson(response, 200, { status: 'stopping' });
  }
  if (request.method === 'POST' && url.pathname === '/api/monitor/start') {
    try {
      return sendJson(response, 202, startMonitoring());
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/monitor/stop') {
    if (!monitorChild) return sendJson(response, 200, { status: 'idle' });
    monitorChild.kill();
    return sendJson(response, 200, { status: 'stopping' });
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    return sendJson(response, 200, { status: 'ready', autoBuy: settings.autoBuy, marketplace: settings.amazonHost });
  }
  const eventMatch = url.pathname.match(/^\/events\/([A-Za-z0-9._:-]{1,200})$/);
  if (request.method === 'GET' && eventMatch) {
    const event = journal[eventMatch[1]];
    return event ? sendJson(response, 200, event) : sendJson(response, 404, { error: 'Event not found' });
  }
  if (request.method !== 'POST' || url.pathname !== '/trigger') return sendJson(response, 404, { error: 'Not found' });
  if (!settings.hookSecret || settings.hookSecret.startsWith('replace-with-')) return sendJson(response, 503, { error: 'Salva prima la configurazione dal pannello.' });
  if (request.headers.authorization !== `Bearer ${settings.hookSecret}`) return sendJson(response, 401, { error: 'Unauthorized' });

  let trigger;
  try {
    trigger = validateTrigger(await readJson(request));
  } catch (error) {
    return sendJson(response, 400, { error: error.message });
  }

  if (journal[trigger.notificationId]) return sendJson(response, 200, { status: 'duplicate_ignored' });
  journal[trigger.notificationId] = { status: 'queued', createdAt: new Date().toISOString(), asin: trigger.asin, marketplaceHost: trigger.marketplaceHost };
  await saveJournal();
  sendJson(response, 202, { status: 'queued', autoBuy: settings.autoBuy });

  queue = queue.then(async () => {
    journal[trigger.notificationId].status = 'processing';
    await saveJournal();
    try {
      const result = await runTrigger(trigger);
      journal[trigger.notificationId] = { ...journal[trigger.notificationId], ...result, finishedAt: new Date().toISOString() };
      console.log(`[${trigger.notificationId}] ${result.status}`);
    } catch (error) {
      journal[trigger.notificationId] = { ...journal[trigger.notificationId], status: 'stopped', error: error.message, finishedAt: new Date().toISOString() };
      console.error(`[${trigger.notificationId}] Fermato: ${error.message}`);
    }
    await saveJournal();
  });
});

server.listen(settings.port, '127.0.0.1', () => {
  logActivity('success', `Pannello Keepa aperto su http://127.0.0.1:${settings.port}`);
  console.log(`Keepa Amazon buyer in ascolto su http://127.0.0.1:${settings.port}`);
  console.log('Pannello grafico, accessi Telegram/Amazon e monitoraggio disponibili dal browser.');
});

function stopChildren() {
  interactiveChild?.kill();
  monitorChild?.kill();
  amazonLoginContext?.close().catch(() => {});
  context?.close().catch(() => {});
  server.close();
}

process.on('SIGINT', stopChildren);
process.on('SIGTERM', stopChildren);
