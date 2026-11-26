import { extractMarketplaceMinor } from './common.mjs';

export function parseKeepaAlert(text, expectedCurrency = null) {
  if (!/(?:ha raggiunto il prezzo che desideri|has reached your desired price|reached your desired price|hat den gew[uü]nschten preis erreicht|a atteint le prix souhait[eé]|ha alcanzado el precio deseado|heeft de gewenste prijs bereikt|har n[aå]tt ditt [oö]nskade pris)/i.test(text)) return null;
  const label = text.match(/(?:prezzo attuale|current price|aktueller preis|prix actuel|precio actual|huidige prijs|aktuellt pris|aktuell pris|aktualna cena)\s*:?\s*/i);
  if (!label) return null;
  const tail = text.slice(label.index + label[0].length, label.index + label[0].length + 70);
  const priceMatch = tail.match(/(?:€|zł|PLN|kr|SEK)\s*[\d][\d\s.,]*|[\d][\d\s.,]*\s*(?:€|zł|PLN|kr|SEK)/i);
  if (!priceMatch) return null;
  const symbol = priceMatch[0].match(/€|zł|PLN|kr|SEK/i)?.[0] || '';
  const currency = /zł|PLN/i.test(symbol) ? 'PLN' : /kr|SEK/i.test(symbol) ? 'SEK' : 'EUR';
  if (expectedCurrency && currency !== expectedCurrency) return null;
  const cents = extractMarketplaceMinor(priceMatch[0], currency);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function isKeepaAlertMessage(message) {
  return Boolean(message && !message.out && !message.fwdFrom && message.senderId &&
    parseKeepaAlert(String(message.message || '')) !== null);
}