import { chromium } from 'playwright';
import { settings, amazonBaseUrl } from './common.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';

await mkdir(settings.profileDir, { recursive: true });
await mkdir(settings.dataDir, { recursive: true });
const context = await chromium.launchPersistentContext(settings.profileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 }
});

const page = context.pages()[0] || await context.newPage();
await page.goto(amazonBaseUrl(), { waitUntil: 'domcontentloaded' });
console.log('Accedi ad Amazon nel browser. Il nome account verrà mostrato nel pannello; non inserire credenziali nel terminale.');
const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
let displayName = '';
while (!displayName) {
  await prompt.question('Accedi ad Amazon, poi premi Invio per verificare l’account. ');
  const greeting = await page.locator('#nav-link-accountList-nav-line-1').first().innerText().catch(() => '');
  if (!greeting || /accedi|sign\s*in/i.test(greeting)) {
    console.log('Non vedo ancora un account Amazon collegato. Accedi nella finestra e premi di nuovo Invio.');
    continue;
  }
  displayName = greeting.trim().replace(/^(ciao|hello)\s*,?\s*/i, '').trim();
  if (!displayName) {
    console.log('Il nome account Amazon non è leggibile. Verifica l’accesso nella finestra e premi di nuovo Invio.');
  }
}
prompt.close();
await context.close();
await writeFile(`${settings.dataDir}/amazon-login.ok`, new Date().toISOString(), 'utf8');
await writeFile(`${settings.dataDir}/amazon-account.json`, JSON.stringify({ displayName, confirmedAt: new Date().toISOString() }, null, 2), 'utf8');
console.log(`Amazon collegato all’account: ${displayName}.`);
