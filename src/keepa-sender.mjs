import { isKeepaAlertMessage } from './keepa-alert.mjs';

const GLOBAL_SEARCHES = [
  'ha raggiunto il prezzo che desideri',
  'has reached your desired price',
  'hat den gewünschten Preis erreicht',
  'a atteint le prix souhaité',
  'ha alcanzado el precio deseado',
  'heeft de gewenste prijs bereikt',
  'har nått ditt önskade pris'
];

function dialogLabel(dialog) {
  return [dialog.title, dialog.name, dialog.entity?.username]
    .filter(Boolean)
    .join(' ');
}

function selectUniqueSender(matches, source) {
  const senderIds = [...new Set(matches.map(({ message }) => String(message.senderId)))];
  if (senderIds.length !== 1) return { senderId: '', source, ambiguous: senderIds.length > 1 };
  return { senderId: senderIds[0], source, ambiguous: false };
}

export async function findKeepaSenderInHistory(client) {
  let dialogs = [];
  try {
    dialogs = await client.getDialogs({ limit: 100 });
  } catch {}

  const keepaDialogs = dialogs
    .filter((dialog) => /keepa/i.test(dialogLabel(dialog)) && (dialog.entity || dialog.inputEntity))
    .slice(0, 10);
  const directMatches = [];
  for (const dialog of keepaDialogs) {
    try {
      const messages = await client.getMessages(dialog.entity || dialog.inputEntity, { limit: 50 });
      directMatches.push(...messages.filter(isKeepaAlertMessage).map((message) => ({
        message,
        chat: dialog.title || dialog.name || 'Keepa'
      })));
    } catch {}
  }
  if (directMatches.length) return selectUniqueSender(directMatches, 'chat Keepa');

  const globalMatches = [];
  for (const search of GLOBAL_SEARCHES) {
    try {
      const messages = await client.getMessages(undefined, { search, limit: 50 });
      globalMatches.push(...messages.filter(isKeepaAlertMessage).map((message) => ({ message, chat: '' })));
    } catch {}
  }
  if (globalMatches.length) return selectUniqueSender(globalMatches, 'ricerca Telegram');
  return { senderId: '', source: keepaDialogs.length ? 'chat Keepa e ricerca Telegram' : 'ricerca Telegram', ambiguous: false };
}