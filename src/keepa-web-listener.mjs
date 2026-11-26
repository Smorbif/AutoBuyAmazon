import { parseKeepaCondition } from './offer-condition.mjs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { settings, amazonMarketplaceFromUrl, marketplaceCurrency, extractMarketplaceMinor, formatMarketplacePrice } from './common.mjs';

if (!settings.hookSecret || settings.hookSecret.startsWith('replace-with-')) {
  throw new Error('Salva prima la configurazione dal pannello.');
}

const context = await chromium.launchPersistentContext(settings.keepaProfileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 }
});
let page = context.pages()[0] || await context.newPage();
const seen = new Set();
const pageUrl = 'https://keepa.com/#!trackings';

function currentPriceCents(text, currency) {
  const symbol = currency === 'PLN' ? '(?:zł|PLN)' : currency === 'SEK' ? '(?:kr|SEK)' : '€';
  const tokenPattern = new RegExp(`(?:${symbol}\\s*[\\d][\\d\\s.,]*|[\\d][\\d\\s.,]*\\s*${symbol})`, 'i');
  const label = String(text).match(/(?:prezzo attuale|current price|aktueller preis|prix actuel|precio actual|huidige prijs|aktuellt pris|aktuell pris|aktualna cena)\s*:?\s*/i);
  if (label) {
    const tail = String(text).slice(label.index + label[0].length, label.index + label[0].length + 70);
    const currentPrice = tail.match(tokenPattern);
    if (currentPrice) return extractMarketplaceMinor(currentPrice[0], currency);
  }

  const amounts = [...String(text).matchAll(new RegExp(tokenPattern.source, 'gi'))].map((match) => match[0]);
  const unique = [...new Set(amounts)];
  return unique.length === 1 ? extractMarketplaceMinor(unique[0], currency) : null;
}

function marketplaceFromRow(row) {
  const hosts = new Set();
  for (const href of row.links || []) {
    const host = amazonMarketplaceFromUrl(href);
    if (!host) continue;
    try {
      if (new URL(href).pathname.toUpperCase().includes(row.asin)) hosts.add(host);
    } catch {}
  }
  return hosts.size === 1 ? [...hosts][0] : null;
}

async function openRecentNotifications() {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1800);
  const tab = page.getByText(/^(Notifiche recenti|Recent notifications)$/i).first();
  if (!(await tab.count().catch(() => 0))) {
    throw new Error('Non trovo la scheda “Notifiche recenti” nella pagina Keepa.');
  }
  await tab.click({ timeout: 10000 });
  await page.waitForTimeout(700);
  console.log('Pagina Keepa aperta: controllo periodicamente le notifiche recenti.');
}

async function readNotificationRows() {
  return page.evaluate(() => {
    const asinPattern = /\b[A-Z0-9]{10}\b/i;
    const candidates = new Set(document.querySelectorAll(
      'tr, [role="row"], li, [class*="notification"], [class*="Notification"]'
    ));
    for (const link of document.querySelectorAll('a[href]')) {
      const value = `${link.getAttribute('href') || ''} ${link.innerText || ''}`;
      if (!asinPattern.test(value)) continue;
      let parent = link;
      for (let depth = 0; parent && depth < 7; depth += 1, parent = parent.parentElement) {
        const text = (parent.innerText || '').replace(/\s+/g, ' ').trim();
        if (text.length > 1600) break;
        if (asinPattern.test(`${text} ${parent.querySelector('a[href]')?.getAttribute('href') || ''}`) && /€|zł|PLN|kr|SEK/i.test(text)) {
          candidates.add(parent);
          break;
        }
      }
    }

    const rows = [];
    for (const element of candidates) {
      const text = (element.innerText || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 1600 || !/(?:€|zł|PLN|kr|SEK)/i.test(text)) continue;
      const links = [...element.querySelectorAll('a[href]')].map((link) => link.href);
      const asin = `${text} ${links.join(' ')}`.match(asinPattern)?.[0]?.toUpperCase();
      if (!asin) continue;
      rows.push({ asin, text, links });
    }

    rows.sort((a, b) => a.text.length - b.text.length);
    const unique = [];
    for (const row of rows) {
      if (unique.some((item) => item.asin === row.asin && item.text.includes(row.text))) continue;
      unique.push(row);
    }
    return unique;
  });
}

function notificationId(row, priceCents) {
  const stableText = row.text
    .replace(/\b\d+\s*(?:second|minute|hour|day)s?\s+ago\b/gi, '')
    .replace(/\b\d+\s*(?:secondi|minuti|ore|giorni)\s+fa\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const digest = createHash('sha256').update(`${row.asin}|${row.marketplaceHost || 'unknown'}|${priceCents}|${stableText}`).digest('hex');
  return `keepa-${digest}`;
}

async function forwardNotification(row, maxItemCents) {
  const currency = marketplaceCurrency(row.marketplaceHost);
  if (!maxItemCents) {
    console.warn(`Notifica Keepa per ${row.asin} ignorata: prezzo attuale assente o ambiguo.`);
    return;
  }

  const trigger = {
    notificationId: notificationId(row, maxItemCents),
    asin: row.asin,
    maxItemCents,
    maxTotalCents: maxItemCents,
    marketplaceHost: row.marketplaceHost,
    condition: parseKeepaCondition(row.text)
  };
  const response = await fetch(`http://127.0.0.1:${settings.port}/trigger`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${settings.hookSecret}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(trigger)
  });
  if (!response.ok) throw new Error(`Purchase runner ha risposto ${response.status}: ${await response.text()}`);
  const result = await response.json();
  console.log(`Notifica Keepa inoltrata: ASIN ${row.asin}, marketplace ${row.marketplaceHost}, prezzo ${formatMarketplacePrice(maxItemCents, currency)}. Stato: ${result.status}.`);
}

try {
  await openRecentNotifications();
  let firstRead = true;
  while (true) {
    try {
      if (page.isClosed()) {
        page = await context.newPage();
        await openRecentNotifications();
      }
      const rows = await readNotificationRows();
      if (firstRead) {
        for (const row of rows) {
          row.marketplaceHost = marketplaceFromRow(row);
          const price = row.marketplaceHost ? currentPriceCents(row.text, marketplaceCurrency(row.marketplaceHost)) : null;
          if (price) seen.add(notificationId(row, price));
        }
        console.log(`Prima lettura completata: ${rows.length} avvisi già presenti ignorati; attendo i nuovi.`);
        firstRead = false;
      } else {
        for (const row of rows) {
          row.marketplaceHost = marketplaceFromRow(row);
          const price = row.marketplaceHost ? currentPriceCents(row.text, marketplaceCurrency(row.marketplaceHost)) : null;
          const id = notificationId(row, price || 0);
          if (seen.has(id)) continue;
          seen.add(id);
          if (!row.marketplaceHost) {
            console.warn(`Notifica Keepa per ${row.asin} ignorata: marketplace europeo non identificato dal link Amazon.`);
            continue;
          }
          if (!price) {
            console.warn(`Notifica Keepa per ${row.asin} non elaborata: prezzo attuale assente o ambiguo.`);
            continue;
          }
          await forwardNotification(row, price);
        }
      }
    } catch (error) {
      console.error(`Lettura Keepa non riuscita: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
} finally {
  await context.close();
}
