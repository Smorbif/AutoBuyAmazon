import { chromium } from 'playwright';
import { settings, amazonBaseUrl, normalizeAmazonMarketplaceHost, recordAmazonMarket } from './common.mjs';

// Marketplace su cui fare l'accesso: argomento da riga di comando, altrimenti quello principale.
const loginHost = normalizeAmazonMarketplaceHost(process.argv[2]) || settings.amazonHost;
import { mkdir, writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';

await mkdir(settings.profileDir, { recursive: true });
await mkdir(settings.dataDir, { recursive: true });
const context = await chromium.launchPersistentContext(settings.profileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 }
});

const page = context.pages()[0] || await context.newPage();
const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
let done = false;
let checking = false;
let browserClosed = false;
let pollTimer;
let resolveClosed;
const contextClosed = new Promise((resolve) => { resolveClosed = resolve; });
context.once('close', () => {
  browserClosed = true;
  resolveClosed();
});

async function detectAmazonAccount() {
  if (done || checking || browserClosed || page.isClosed()) return false;
  checking = true;
  try {
    const greeting = await page.locator('#nav-link-accountList-nav-line-1').first().innerText({ timeout: 2500 }).catch(() => '');
    const displayName = greeting.trim()
      .replace(/^(?:ciao|hello|hallo|bonjour|hola)\s*[,!:\-]?\s*/i, '')
      .trim();
    if (!displayName || /^(?:accedi|sign\s*in|account(?:s)?(?:\s|$)|accounts\s*&\s*lists|anmelden|se\s*connecter|iniciar\s*sesi[oó]n)/i.test(displayName)) {
      return false;
    }

    const confirmedAt = new Date().toISOString();
    await writeFile(`${settings.dataDir}/amazon-account.json`, JSON.stringify({ displayName, confirmedAt }, null, 2), 'utf8');
    await writeFile(`${settings.dataDir}/amazon-login.ok`, confirmedAt, 'utf8');
    await recordAmazonMarket(loginHost, displayName);
    done = true;
    clearInterval(pollTimer);
    prompt.close();
    console.log(`Amazon (${loginHost.replace(/^www\./, '')}) collegato all’account: ${displayName}.`);
    await context.close().catch(() => {});
    return true;
  } finally {
    checking = false;
  }
}

try {
  await page.goto(amazonBaseUrl(loginHost), { waitUntil: 'domcontentloaded' });
} catch (error) {
  if (!browserClosed) throw error;
}

if (!browserClosed) {
  console.log(`Accedi ad Amazon su ${loginHost.replace(/^www\./, '')}, poi premi Conferma per verificare l’account. Se sei già connesso, il rilevamento avviene automaticamente.`);
  pollTimer = setInterval(() => {
    detectAmazonAccount().catch((error) => console.error(`Verifica Amazon: ${error.message}`));
  }, 1200);
  await detectAmazonAccount();
}

async function waitForManualVerification() {
  while (!done && !browserClosed) {
    await prompt.question('Premi Conferma nel pannello per controllare subito, oppure completa l’accesso nella finestra Amazon.\n');
    if (done || browserClosed) break;
    const detected = await detectAmazonAccount();
    if (!detected && !done && !browserClosed) {
      console.log('Amazon non mostra ancora un account connesso. Completa l’accesso; il controllo automatico continua.');
    }
  }
}

if (!done && !browserClosed) {
  const inputTask = waitForManualVerification().catch((error) => {
    if (!browserClosed && !done) console.error(`Verifica Amazon: ${error.message}`);
  });
  await Promise.race([contextClosed, inputTask]);
}

clearInterval(pollTimer);
prompt.close();
if (browserClosed && !done) {
  console.log('Finestra Amazon chiusa prima della verifica. Premi di nuovo Verifica account per controllare la sessione salvata.');
  process.exitCode = 1;
}
