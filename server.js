#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, 'build');
const QBIT_URL = process.env.QBITTORRENT_API_URL;
const QBIT_USERNAME = process.env.QBITTORRENT_USERNAME;
const QBIT_PASSWORD = process.env.QBITTORRENT_PASSWORD;
const PORT = Number(process.env.PORT || 3004);

console.log(`Starting torrent app server...`);
console.log(`QBITTORRENT_API_URL: ${QBIT_URL || '(not set)'}`);
console.log(`QBITTORRENT_USERNAME: ${QBIT_USERNAME || '(not set)'}`);
console.log(`QBITTORRENT_PASSWORD: ${QBIT_PASSWORD ? '(set)' : '(not set)'}`);
console.log(`PORT: ${PORT}`);

const mimeTypes = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  txt: 'text/plain; charset=utf-8',
  map: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json; charset=utf-8',
  woff: 'font/woff',
  woff2: 'font/woff2',
  mp4: 'video/mp4',
  webm: 'video/webm'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).slice(1);
  return mimeTypes[ext] || 'application/octet-stream';
}

function respondJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeApiPath(pathname) {
  let normalized = path.posix.normalize(pathname.replace(/\/api\/v2(\/api\/v2)+/g, '/api/v2'));
  if (!normalized.endsWith('/')) normalized += '/';
  if (!normalized.includes('/api/v2/')) {
    normalized = path.posix.join(normalized, 'api/v2/');
  }
  return normalized.replace(/\/+/g, '/');
}

function buildQbitUrl(slug, originalUrl) {
  const url = new URL(QBIT_URL);
  const prefix = normalizeApiPath(url.pathname);
  url.pathname = path.posix.join(prefix, slug);
  const incomingUrl = new URL(originalUrl, `http://localhost`);
  url.search = incomingUrl.search;
  return url;
}

function buildHeaders(reqHeaders, sidCookie) {
  const headers = {};
  for (const [key, value] of Object.entries(reqHeaders)) {
    if (!value || key === 'host' || key === 'connection' || key === 'content-length') continue;
    headers[key] = value;
  }
  if (sidCookie) {
    headers.Cookie = sidCookie;
  }
  return headers;
}

let cachedSidCookie = null;

async function loginCookie(force = false) {
  if (!QBIT_URL || !QBIT_USERNAME || !QBIT_PASSWORD) return null;
  if (cachedSidCookie && !force) return cachedSidCookie;

  const loginUrl = new URL(QBIT_URL);
  const prefix = normalizeApiPath(loginUrl.pathname);
  loginUrl.pathname = path.posix.join(prefix, 'auth/login');

  const res = await fetch(loginUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ username: QBIT_USERNAME, password: QBIT_PASSWORD }).toString()
  });

  if (!res.ok) {
    console.error(`qBittorrent login failed: ${res.status} ${res.statusText}`);
    const errorBody = await res.text();
    console.error(`qBittorrent login error body: ${errorBody}`);
    return null;
  }

  const cookies = [];
  for (const [key, value] of res.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      cookies.push(value.split(';')[0].trim());
    }
  }

  cachedSidCookie = cookies.length > 0 ? cookies.join('; ') : null;
  return cachedSidCookie;
}

async function proxyApi(req, res, slug) {
  if (!QBIT_URL) {
    respondJSON(res, 500, { error: 'QBITTORRENT_API_URL is not configured' });
    return;
  }

  const upstreamUrl = buildQbitUrl(slug, req.url || '/');
  let sidCookie = await loginCookie();
  const body = req.method === 'POST' || req.method === 'PUT' ? await readRequestBody(req) : null;

  async function doFetch(cookie) {
    return fetch(upstreamUrl.toString(), {
      method: req.method,
      headers: buildHeaders(req.headers, cookie),
      body: body?.length ? body : undefined
    });
  }

  try {
    let upstreamRes = await doFetch(sidCookie);
    if (upstreamRes.status === 403) {
      sidCookie = await loginCookie(true);
      upstreamRes = await doFetch(sidCookie);
    }

    const responseHeaders = {};
    upstreamRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders['Set-Cookie'] = responseHeaders['Set-Cookie']
          ? [].concat(responseHeaders['Set-Cookie'], value)
          : value;
      } else if (key.toLowerCase() === 'content-encoding' || key.toLowerCase() === 'transfer-encoding') {
        return;
      } else {
        responseHeaders[key] = value;
      }
    });

    res.writeHead(upstreamRes.status, responseHeaders);
    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    respondJSON(res, 502, { error: err instanceof Error ? err.message : String(err) });
  }
}

async function serveStatic(req, res) {
  const incomingUrl = new URL(req.url || '/', `http://localhost`);
  let filePath = path.join(buildDir, decodeURIComponent(incomingUrl.pathname));

  try {
    let stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stat = await fs.stat(filePath);
    }

    const file = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(file);
  } catch {
    try {
      const fallback = path.join(buildDir, 'index.html');
      const fallbackFile = await fs.readFile(fallback);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fallbackFile);
    } catch {
      respondJSON(res, 404, { error: 'Not found' });
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost`);

  if (url.pathname.startsWith('/api/v2/')) {
    await proxyApi(req, res, url.pathname.slice('/api/v2/'.length));
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Torrent app server running on http://0.0.0.0:${PORT}`);
});
