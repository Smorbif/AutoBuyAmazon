import { amazonMarketplaceFromUrl, normalizeAmazonMarketplaceHost } from './common.mjs';

// Keepa domain id -> Amazon marketplace (solo store europei supportati).
const KEEPA_DOMAINS = {
  3: 'www.amazon.de',
  4: 'www.amazon.fr',
  8: 'www.amazon.it',
  9: 'www.amazon.es'
};

const ASIN_PATH = /\/(?:dp|product|offer-listing|aw\/d|gp\/product|gp\/aw\/d|exec\/obidos\/asin|o\/asin)\/([A-Z0-9]{10})(?=[/?#&]|$)/i;
const ASIN_PARAM_NAMES = ['asin', 'ASIN', 'pd_rd_i', 'creativeASIN'];
const SHORT_LINK_HOSTS = /^(?:amzn\.(?:eu|to|com)|a\.co|amzlink\.to|bit\.ly|tinyurl\.com|t\.co)$/i;
const isAsin = (value) => /^[A-Z0-9]{10}$/i.test(String(value || ''));

function parseUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function asinFromParams(params) {
  for (const name of ASIN_PARAM_NAMES) {
    const value = params.get(name);
    if (value && isAsin(value)) return value.toUpperCase();
  }
  return null;
}

function keepaProduct(url) {
  if (!/(^|\.)keepa\.com$/i.test(url.hostname)) return null;
  // Formati: https://keepa.com/#!product/8-B0XXXXXXXX  |  .../r/?domain=8&asin=B0XXXXXXXX  |  url=<amazon url>
  const haystack = `${url.pathname}${url.search}${decodeURIComponent(url.hash || '')}`;
  const productMatch = haystack.match(/product\/(\d+)-([A-Z0-9]{10})/i);
  if (productMatch && KEEPA_DOMAINS[productMatch[1]]) {
    return { asin: productMatch[2].toUpperCase(), marketplaceHost: KEEPA_DOMAINS[productMatch[1]] };
  }
  const hashParams = new URLSearchParams((url.hash || '').replace(/^#!?[^?]*\??/, ''));
  for (const params of [url.searchParams, hashParams]) {
    for (const key of ['url', 'u', 'link', 'target']) {
      const nested = params.get(key);
      const product = nested && amazonProductFromUrl(nested);
      if (product) return product;
    }
    const asin = asinFromParams(params);
    const domain = params.get('domain') || params.get('domainId');
    if (asin && KEEPA_DOMAINS[domain]) return { asin, marketplaceHost: KEEPA_DOMAINS[domain] };
  }
  return null;
}

export function amazonProductFromUrl(rawUrl) {
  const url = parseUrl(rawUrl);
  if (!url) return null;
  const keepa = keepaProduct(url);
  if (keepa) return keepa;
  const marketplaceHost = amazonMarketplaceFromUrl(url.toString()) ||
    normalizeAmazonMarketplaceHost(url.hostname.replace(/^(?:smile|m)\./i, ''));
  if (!marketplaceHost) return null;
  const pathMatch = decodeURIComponent(url.pathname).match(ASIN_PATH);
  const asin = pathMatch?.[1]?.toUpperCase() || asinFromParams(url.searchParams);
  return asin ? { asin, marketplaceHost } : null;
}

export function needsRedirectResolution(rawUrl) {
  const url = parseUrl(rawUrl);
  if (!url) return false;
  return SHORT_LINK_HOSTS.test(url.hostname) || /(^|\.)keepa\.com$/i.test(url.hostname);
}

export async function resolveRedirects(rawUrl, { maxHops = 5, timeoutMs = 8000, fetchImpl = fetch } = {}) {
  let current = rawUrl;
  for (let hop = 0; hop < maxHops; hop += 1) {
    if (amazonProductFromUrl(current)) return current;
    let response;
    try {
      response = await fetchImpl(current, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      return current;
    }
    const location = response.headers.get('location');
    if (!location || response.status < 300 || response.status >= 400) return current;
    current = new URL(location, current).toString();
  }
  return current;
}

/**
 * Sceglie un unico prodotto Amazon tra i link candidati.
 * I link del pulsante "Vai su Amazon" hanno priorità sui link nel testo.
 */
export async function pickAmazonProduct(candidates, { resolve = resolveRedirects } = {}) {
  const groups = [candidates.filter((c) => c.primary), candidates.filter((c) => !c.primary)];
  const tried = [];
  for (const group of groups) {
    const products = new Map();
    for (const { url } of group) {
      let product = amazonProductFromUrl(url);
      if (!product && needsRedirectResolution(url)) {
        const resolved = await resolve(url);
        product = amazonProductFromUrl(resolved);
        tried.push(resolved === url ? url : `${url} -> ${resolved}`);
      } else {
        tried.push(url);
      }
      if (product) products.set(`${product.marketplaceHost}:${product.asin}`, product);
    }
    if (products.size === 1) return { product: [...products.values()][0], tried };
    if (products.size > 1) return { product: null, reason: 'ambiguo', tried, found: [...products.keys()] };
  }
  return { product: null, reason: candidates.length ? 'nessun link Amazon europeo con ASIN' : 'nessun link nel messaggio', tried };
}
