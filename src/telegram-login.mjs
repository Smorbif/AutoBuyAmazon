import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { settings, persistEnvValue } from './common.mjs';
import { findKeepaSenderInHistory } from './keepa-sender.mjs';

if (!settings.telegramApiId || !settings.telegramApiHash) {
  throw new Error('Imposta TELEGRAM_API_ID e TELEGRAM_API_HASH nel file .env.');
}

const prompt = createInterface({ input: stdin, output: stdout });
const sessionPath = `${settings.dataDir}/telegram.session`;
await mkdir(settings.dataDir, { recursive: true });
let existingSession = '';
try {
  existingSession = await readFile(sessionPath, 'utf8');
} catch {}

const client = new TelegramClient(new StringSession(existingSession), settings.telegramApiId, settings.telegramApiHash, {
  connectionRetries: 5
});

await client.start({
  phoneNumber: async () => prompt.question('Numero Telegram con prefisso internazionale: '),
  phoneCode: async () => prompt.question('Codice ricevuto da Telegram: '),
  password: async () => prompt.question('Password Telegram di verifica in due passaggi (se attiva): '),
  onError: (error) => console.error(error.message)
});

const me = await client.getMe();
await writeFile(sessionPath, client.session.save(), 'utf8');
const account = {
  id: String(me.id),
  username: me.username || '',
  firstName: me.firstName || '',
  lastName: me.lastName || ''
};
await writeFile(`${settings.dataDir}/telegram-account.json`, JSON.stringify(account, null, 2), 'utf8');
const configuredSenderId = settings.keepaSenderId;
try {
  const detection = await findKeepaSenderInHistory(client);
  if (detection.senderId && !configuredSenderId) {
    await persistEnvValue('KEEPA_SENDER_ID', detection.senderId);
    console.log(`Mittente Keepa trovato nella ${detection.source} e salvato.`);
    console.log(`KEEP_BUY_KEEPA_SENDER_ID=${detection.senderId}`);
  } else if (detection.senderId && configuredSenderId === detection.senderId) {
    console.log(`ID mittente Keepa verificato nella ${detection.source}.`);
  } else if (detection.senderId && configuredSenderId) {
    console.warn('Il mittente trovato nella cronologia è diverso da quello configurato; il valore esistente non è stato sostituito.');
  } else if (detection.ambiguous) {
    console.log('Trovati più mittenti Keepa nella cronologia; nessun ID è stato scelto automaticamente.');
  } else if (!configuredSenderId) {
    console.log('Nessun avviso Keepa valido trovato nella cronologia; il mittente verrà rilevato dal primo avviso valido in modalità prova.');
  } else {
    console.log('Cronologia consultata: ID configurato conservato, nessun avviso Keepa riconoscibile trovato.');
  }
} catch (error) {
  console.warn(`Lettura cronologia Keepa non riuscita; il mittente verrà rilevato dal primo avviso valido in modalità prova: ${error.message}`);
}
const accountLabel = [account.firstName, account.lastName].filter(Boolean).join(' ') || `ID ${account.id}`;
console.log(`Telegram collegato: ${accountLabel}${account.username ? ` (@${account.username})` : ''}.`);
console.log('Sessione e identità salvate localmente in data/. Non condividerle.');
prompt.close();
await client.disconnect();
