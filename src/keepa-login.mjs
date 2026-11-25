import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chromium } from 'playwright';
import { settings } from './common.mjs';

await mkdir(settings.keepaProfileDir, { recursive: true });
await mkdir(settings.dataDir, { recursive: true });

const context = await chromium.launchPersistentContext(settings.keepaProfileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 }
});
const page = context.pages()[0] || await context.newPage();
const prompt = createInterface({ input: stdin, output: stdout });

try {
  await page.goto('https://keepa.com/#!trackings', { waitUntil: 'domcontentloaded' });
  console.log('Accedi al sito Keepa nel browser. Non inserire la password nel pannello.');

  let confirmed = false;
  while (!confirmed) {
    await prompt.question('Quando vedi Panoramica Tracking e Notifiche recenti, premi Conferma nel pannello. ');
    const text = await page.locator('body').innerText().catch(() => '');
    const hasTrackingPage = /Panoramica Tracking|Tracking Overview/i.test(text);
    const hasRecentNotifications = /Notifiche recenti|Recent notifications/i.test(text);
    if (!hasTrackingPage || !hasRecentNotifications) {
      console.log('Non trovo la pagina Tracking di Keepa. Accedi e apri Panoramica Tracking, poi premi di nuovo Conferma.');
      continue;
    }
    confirmed = true;
  }

  const account = { displayName: 'Sessione Keepa verificata', confirmedAt: new Date().toISOString() };
  await writeFile(`${settings.dataDir}/keepa-account.json`, JSON.stringify(account, null, 2), 'utf8');
  await writeFile(`${settings.dataDir}/keepa-login.ok`, account.confirmedAt, 'utf8');
  console.log('Sito Keepa collegato. Il profilo browser è salvato in data/keepa-profile.');
} finally {
  prompt.close();
  await context.close();
}
