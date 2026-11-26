// Condizione dell'offerta tracciata su Keepa (dal testo dell'avviso) e confronto
// con le offerte mostrate da Amazon nel pannello "Tutte le offerte".

export const CONDITION_KINDS = ['any', 'new', 'amazon', 'used', 'warehouse', 'refurbished', 'collectible'];
export const USED_GRADES = ['like_new', 'very_good', 'good', 'acceptable'];

const GRADE_PATTERNS = {
  like_new: /come nuovo|like new|wie neu|comme neuf|como nuevo|als nieuw|jak nowy|som ny/i,
  very_good: /ottime condizioni|very good|sehr gut|tr[eè]s bon [ée]tat|muy bueno|zeer goed|bardzo dobry|mycket bra/i,
  good: /buone condizioni|\bgood\b|\bgut\b|bon [ée]tat|\bbueno\b|\bgoed\b|\bdobry\b|\bbra\b/i,
  acceptable: /accettabil|acceptab|akzeptabel|[ée]tat correct|aceptable|acceptabel|dopuszczaln|godtagbar/i
};

const KEEPA_PATTERNS = [
  ['warehouse', /warehouse|retourenkauf|seconda mano amazon|amazon seconde main|segunda mano de amazon/i],
  ['refurbished', /ricondizionat|refurbished|renewed|generalüberholt|reconditionn|reacondicionad|gereviseerd|odnowion|rekonditionerad/i],
  ['collectible', /da collezione|collectible|sammlerst|de collection|coleccionable|verzamel|kolekcjonersk|samlarobjekt/i],
  ['used', /usato|\bused\b|gebraucht|d['’]occasion|occasion|segunda mano|tweedehands|gebruikt|używan|begagnad/i],
  ['amazon', /^\s*amazon\s*$|prezzo amazon|amazon price|amazon-preis|prix amazon|precio de amazon|venduto da amazon|sold by amazon/i],
  ['new', /nuovo|\bnew\b|\bneu\b|\bneuf\b|\bnuevo\b|\bnieuw\b|\bnowy\b|\bny\b/i]
];

const REACHED = /ha raggiunto il prezzo|reached your desired price|gew[uü]nschten preis|prix souhait|precio deseado|gewenste prijs|[oö]nskade pris/i;

function gradeOf(text) {
  for (const grade of USED_GRADES) if (GRADE_PATTERNS[grade].test(text)) return grade;
  return null;
}

function classify(text) {
  for (const [kind, pattern] of KEEPA_PATTERNS) {
    if (pattern.test(text)) {
      const grade = kind === 'used' || kind === 'warehouse' ? gradeOf(text) : null;
      return { kind, grade, label: text.trim().slice(0, 80) };
    }
  }
  return null;
}

/**
 * Legge dal messaggio Keepa il tipo di prezzo tracciato.
 * Cerca prima nella riga del prezzo attuale (es. "Prezzo attuale (Usato - Come nuovo): 18,47 €"),
 * poi nelle righe con un'etichetta di tipo/condizione, infine nelle righe brevi del messaggio.
 * Restituisce { kind: 'any' } se non trova nulla: in quel caso le offerte non vengono filtrate.
 */
export function parseKeepaCondition(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const priceLine = lines.find((line) => /prezzo attuale|current price|aktueller preis|prix actuel|precio actual|huidige prijs|aktuellt pris|aktualna cena/i.test(line));
  if (priceLine) {
    const qualifier = priceLine.replace(/[\d.,]+\s*(?:€|zł|PLN|kr|SEK)|(?:€|zł|PLN|kr|SEK)\s*[\d.,]+/gi, ' ');
    const found = classify(qualifier.replace(/prezzo attuale|current price|aktueller preis|prix actuel|precio actual|huidige prijs|aktuellt pris|aktualna cena/gi, ' '));
    if (found) return found;
  }
  const labelled = lines.find((line) => /^(?:tipo(?: di prezzo)?|condizione|price type|condition|preistyp|zustand|type de prix|[ée]tat|tipo de precio|estado|prijstype|staat|typ ceny|stan|pristyp|skick)\s*:/i.test(line));
  if (labelled) {
    const found = classify(labelled.replace(/^[^:]*:/, ''));
    if (found) return found;
  }
  // Righe che sono solo un'etichetta di condizione (non il titolo del prodotto).
  const labelStart = /^(?:prezzo\s+)?(?:usato|used|gebraucht|d['’]occasion|occasion|segunda mano|tweedehands|gebruikt|używan|begagnad|nuovo|new|neu|neuf|nuevo|nieuw|nowy|ny|amazon|offerte warehouse|warehouse|amazon warehouse|ricondizionat|refurbished|renewed|generalüberholt|reconditionn|reacondicionad|da collezione|collectible|sammlerst|de collection|coleccionable)\b/i;
  const candidates = lines
    .map((line) => line.replace(/^[^\p{L}]+/u, '').trim())
    .filter((line) => line.length <= 50 && !/https?:\/\//i.test(line) && !REACHED.test(line) && labelStart.test(line));
  for (const line of candidates) {
    const found = classify(line);
    if (found) return found;
  }
  return { kind: 'any', grade: null, label: '' };
}

export function normalizeCondition(input) {
  const kind = CONDITION_KINDS.includes(input?.kind) ? input.kind : 'any';
  const grade = USED_GRADES.includes(input?.grade) ? input.grade : null;
  return { kind, grade, label: String(input?.label || '').slice(0, 80) };
}

export function describeCondition(condition) {
  const names = { any: 'qualsiasi', new: 'nuovo', amazon: 'nuovo venduto da Amazon', used: 'usato', warehouse: 'Amazon Warehouse', refurbished: 'ricondizionato', collectible: 'da collezione' };
  const grades = { like_new: 'come nuovo', very_good: 'ottime condizioni', good: 'buone condizioni', acceptable: 'accettabile' };
  return condition.grade ? `${names[condition.kind]} (${grades[condition.grade]} o migliore)` : names[condition.kind];
}

/** Classifica un'offerta Amazon a partire dall'intestazione condizione e dal venditore. */
export function classifyAmazonOffer(heading, seller) {
  const head = String(heading || '');
  const sold = String(seller || '');
  const refurbished = KEEPA_PATTERNS.find(([kind]) => kind === 'refurbished')[1].test(head);
  const collectible = KEEPA_PATTERNS.find(([kind]) => kind === 'collectible')[1].test(head);
  const used = !refurbished && !collectible && KEEPA_PATTERNS.find(([kind]) => kind === 'used')[1].test(head);
  const sellerName = sold.replace(/^\s*(?:sold by|venduto da|verkauf durch|vendu par|vendido por|verkocht door|sprzedawca|säljs av)\s*/i, '').split(/\n/)[0].trim();
  const warehouse = /warehouse|retourenkauf|seconda mano|seconde main|segunda mano|tweedehands/i.test(sellerName);
  const soldByAmazon = !warehouse && /^amazon(?:\.[a-z.]+|\s+eu\b.*)?$/i.test(sellerName);
  return {
    kind: refurbished ? 'refurbished' : collectible ? 'collectible' : used ? 'used' : 'new',
    grade: used ? gradeOf(head) : null,
    soldByAmazon,
    warehouse
  };
}

export function offerMatchesCondition(offer, wanted) {
  if (!wanted || wanted.kind === 'any') return true;
  if (wanted.kind === 'new') return offer.kind === 'new';
  if (wanted.kind === 'amazon') return offer.kind === 'new' && offer.soldByAmazon;
  if (wanted.kind === 'refurbished' || wanted.kind === 'collectible') return offer.kind === wanted.kind;
  if (wanted.kind === 'warehouse' && !(offer.kind === 'used' && offer.warehouse)) return false;
  if (wanted.kind === 'used' && offer.kind !== 'used') return false;
  // Grado richiesto da Keepa: accetta lo stesso grado o uno migliore.
  if (!wanted.grade) return true;
  if (!offer.grade) return false;
  return USED_GRADES.indexOf(offer.grade) <= USED_GRADES.indexOf(wanted.grade);
}
