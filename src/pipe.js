import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const gunzipAsync = promisify(gunzip);

const MIRURO_PIPE_URL = 'https://www.miruro.to/api/secure/pipe';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Referer': 'https://www.miruro.to/',
};

const PROVIDER_STREAM_TYPES = {
  kiwi: 'mixed',
  pahe: 'embed',
  zoro: 'hls',
  arc: 'hls',
  jet: 'hls',
  telli: 'hls',
  dune: 'hls',
  ally: 'mp4',
  bee: 'mixed',
  hop: 'hls',
  ANIMEKAI: 'hls',
  KUUDERE: 'hls',
  SENSHI: 'hls',
  ANIMEGG: 'hls',
  CRUNCHYROLL: 'hls',
  UNIQUESTREAM: 'embed',
};

export function getProviderStreamType(name) {
  return PROVIDER_STREAM_TYPES[name] || 'unknown';
}

export function translateId(encodedId) {
  try {
    let decoded = Buffer.from(encodedId, 'base64url').toString();
    if (decoded.includes(':')) return decoded;
    return encodedId;
  } catch (_) {
    return encodedId;
  }
}

export function deepTranslate(obj) {
  if (Array.isArray(obj)) {
    for (let item of obj) {
      if (item && typeof item === 'object') deepTranslate(item);
    }
  } else if (obj && typeof obj === 'object') {
    for (let key in obj) {
      let val = obj[key];
      if (key === 'id' && typeof val === 'string') {
        obj[key] = translateId(val);
      } else if (val && typeof val === 'object') {
        deepTranslate(val);
      }
    }
  }
}

function findCategory(episodesObj, targetList) {
  for (let cat in episodesObj) {
    if (episodesObj[cat] === targetList) return cat;
  }
  return 'sub';
}

export function injectSourceSlugs(data, anilistId) {
  let providers = data.providers || {};
  for (let name in providers) {
    let pd = providers[name];
    if (!pd || typeof pd !== 'object') continue;
    pd.streamType = getProviderStreamType(name);
    let eps = pd.episodes;
    if (!eps || typeof eps !== 'object') {
      if (Array.isArray(eps)) {
        pd.episodes = { sub: eps };
        eps = pd.episodes;
      } else {
        continue;
      }
    }
    for (let cat in eps) {
      let list = eps[cat];
      if (!Array.isArray(list)) continue;
      for (let ep of list) {
        if (!ep || typeof ep !== 'object') continue;
        if ('id' in ep && 'number' in ep) {
          let origId = ep.id;
          let prefix = origId.includes(':') ? origId.split(':')[0] : origId;
          ep.id = 'watch/' + name + '/' + anilistId + '/' + cat + '/' + prefix + '-' + ep.number;
        }
      }
    }
  }
  return data;
}

export function encodePipeRequest(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export async function decodePipeResponse(encodedStr) {
  try {
    let compressed = Buffer.from(encodedStr, 'base64url');
    let decompressed = await gunzipAsync(compressed);
    return JSON.parse(decompressed.toString('utf-8'));
  } catch (_) {
    throw new Error('Failed to decode pipe response');
  }
}

export async function fetchRawEpisodes(anilistId) {
  let payload = {
    path: 'episodes',
    method: 'GET',
    query: { anilistId },
    body: null,
    version: '0.1.0',
  };
  let encoded = encodePipeRequest(payload);
  let res = await fetch(MIRURO_PIPE_URL + '?e=' + encoded, { headers: HEADERS });
  if (!res.ok) throw new Error('Pipe request failed');
  let text = await res.text();
  let data = await decodePipeResponse(text.trim());
  deepTranslate(data);
  return data;
}

export async function fetchPipeSources(episodeId, provider, anilistId, category) {
  let encId = Buffer.from(episodeId).toString('base64url');
  let payload = {
    path: 'sources',
    method: 'GET',
    query: { episodeId: encId, provider, category, anilistId },
    body: null,
    version: '0.1.0',
  };
  let encoded = encodePipeRequest(payload);
  let res = await fetch(MIRURO_PIPE_URL + '?e=' + encoded, { headers: HEADERS });
  if (!res.ok) throw new Error('Pipe request failed');
  let text = await res.text();
  return decodePipeResponse(text.trim());
}
