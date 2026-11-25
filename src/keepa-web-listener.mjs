import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { settings } from './common.mjs';

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

function parsePriceToken(raw) {
  const value = String(raw || '').replace(/[^\d.,]/g, '');
  if (!value) return null;
  const separator = Math.max(value.lastIndexOf(','), value.lastIndexOf('.'));
  if (separator < 0) return Number(value) * 100;
  const fraction = value.slice(separator + 1);
  if (fraction.length !== 2) return null;
  const whole = value.slice(0, separator).replace(/[.,]/g, '') || '0';
  const cents = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function currentPriceCents(text) {
  const currentPrice = String(text).match(/(?:prezzo attuale|current price)[^\d]{0,24}(?:€\s*)?([\d.,]+)\s*€?/i);
  if (currentPrice) return parsePriceToken(currentPrice[1]);

  const matches = [...String(text).matchAll(/(?:€\s*([\d.,]+)|([\d.,]+)\s*€)/g)];
  const amounts = [...new Set(matches.map((match) => match[1] || match[2]))];
  return amounts.length === 1 ? parsePriceToken(amounts[0]) : null;
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
        if (asinPattern.test(`${text} ${parent.querySelector('a[href]')?.getAttribute('href') || ''}`) && /€/.test(text)) {
          candidates.add(parent);
          break;
        }
      }
    }

    const rows = [];
    for (const element of candidates) {
      const text = (element.innerText || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 1600 || !/€/.test(text)) continue;
      const hrefs = [...element.querySelectorAll('a[href]')].map((link) => link.href).join(' ');
      const asin = `${text} ${hrefs}`.match(asinPattern)?.[0]?.toUpperCase();
      if (!asin) continue;
      rows.push({ asin, text, hrefs });
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
  const digest = createHash('sha256').update(`${row.asin}|${priceCents}|${stableText}`).digest('hex');
  return `keepa-${digest}`;
}

async function forwardNotification(row) {
  const maxItemCents = currentPriceCents(row.text);
  if (!maxItemCents) {
    console.warn(`Notifica Keepa per ${row.asin} ignorata: prezzo attuale assente o ambiguo.`);
    return;
  }

  const trigger = {
    notificationId: notificationId(row, maxItemCents),
    asin: row.asin,
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
  if (!response.ok) throw new Error(`Purchase runner ha risposto ${response.status}: ${await response.text()}`);
  const result = await response.json();
  console.log(`Notifica Keepa inoltrata: ASIN ${row.asin}, prezzo ${maxItemCents} centesimi. Stato: ${result.status}.`);
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
          const price = currentPriceCents(row.text);
          if (price) seen.add(notificationId(row, price));
        }
        console.log(`Prima lettura completata: ${rows.length} avvisi già presenti ignorati; attendo i nuovi.`);
        firstRead = false;
      } else {
        for (const row of rows) {
          const price = currentPriceCents(row.text);
          const id = notificationId(row, price || 0);
          if (seen.has(id)) continue;
          seen.add(id);
          if (!price) {
            console.warn(`Notifica Keepa per ${row.asin} non elaborata: prezzo attuale assente o ambiguo.`);
            continue;
          }
          await forwardNotification(row);
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
