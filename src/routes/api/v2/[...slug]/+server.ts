import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const QBIT_URL = env.QBITTORRENT_API_URL;
const QBIT_USERNAME = env.QBITTORRENT_USERNAME;
const QBIT_PASSWORD = env.QBITTORRENT_PASSWORD;

function qbitError() {
	if (!QBIT_URL) throw error(500, 'QBITTORRENT_API_URL not configured');
}

// Cache qBittorrent auth cookie (SID) after a server-side login.
// This avoids needing browser cookie jar support for /api/v2/* calls.
let cachedSidCookie: string | null = null;

function extractSidCookie(setCookie: string): string | null {
	// Example: "SID=abcd1234; path=/; HttpOnly"
	// Be liberal: match any "SID=..." segment case-insensitively.
	const match = /(?:^|;\s*)sid=([^;]+)/i.exec(setCookie);
	if (!match) return null;
	const value = match[1]?.trim();
	if (!value) return null;
	return `SID=${value}`;
}

async function ensureQbitAuthed(force = false): Promise<string | null> {
	// If we already have a cached SID cookie, reuse it.
	if (!force && cachedSidCookie) return cachedSidCookie;
	if (force) cachedSidCookie = null;

	if (!QBIT_USERNAME || !QBIT_PASSWORD) return null;

	const loginUrl = `${QBIT_URL}/api/v2/auth/login`;

	try {
		const res = await fetch(loginUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				username: QBIT_USERNAME,
				password: QBIT_PASSWORD
			}).toString()
		});

		// qBittorrent login returns 200 and sets cookies on success.
		// If it returns 403/failed, we fall through without caching.
		if (!res.ok) return null;

		// Extract all Set-Cookie header values.
		// (Node's fetch Headers does not reliably expose getSetCookie; use forEach instead.)
		const setCookies: string[] = [];
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') {
				setCookies.push(value);
			}
		});

		for (const sc of setCookies) {
			const sid = extractSidCookie(sc);
			if (sid) {
				cachedSidCookie = sid;
				return cachedSidCookie;
			}
		}

		return null;
	} catch {
		return null;
	}
}

function forwardCookies(response: Response): Headers {
	const h = new Headers();
	response.headers.forEach((value, key) => {
		if (key.toLowerCase() === 'set-cookie') h.append(key, value);
	});
	return h;
}

function mergeCookies(reqCookie: string | null | undefined, sidCookie: string | null): string {
	// qBittorrent is strict about auth; if we have an SID from our server-side login,
	// only send that (don’t combine with any inbound/foreign cookies).
	// The incoming browser cookie header may include unrelated cookies that can confuse auth.
	if (sidCookie) return sidCookie;
	return (reqCookie || '').trim();
}

async function proxyRequest(
	request: Request,
	method: 'GET' | 'POST',
	params: { slug: string },
	url: URL,
	bodyText?: string
) {
	qbitError();

	const apiUrl = new URL(`${QBIT_URL}/api/v2/${params.slug}`);
	apiUrl.search = url.search;

	async function doFetch(withSid: string | null) {
		const clientCookie = request.headers.get('cookie');
		const mergedCookie = mergeCookies(clientCookie, withSid);

		return fetch(apiUrl, {
			method,
			headers: {
				'Cookie': mergedCookie,
				...(method === 'POST'
					? {
							'Content-Type':
								request.headers.get('content-type') ||
								'application/x-www-form-urlencoded'
						}
					: {})
			},
			...(method === 'POST' ? { body: bodyText } : {})
		});
	}

	try {
	// first attempt (cached SID if available). If we don’t have SID, force a login.
		let sidCookie = await ensureQbitAuthed(false);
		if (!sidCookie) {
			sidCookie = await ensureQbitAuthed(true);
		}

		let res = await doFetch(sidCookie);

		// Retry once on 403 (likely stale SID / login didn’t produce usable SID).
		if (res.status === 403) {
			// force relogin and reattempt with fresh SID
			cachedSidCookie = null;
			sidCookie = await ensureQbitAuthed(true);
			res = await doFetch(sidCookie);
		}

		return new Response(res.body, { status: res.status, headers: forwardCookies(res) });
	} catch (err) {
		throw error(502, `proxy error: ${err instanceof Error ? err.message : String(err)}`);
	}
}

export async function GET({
	request,
	params,
	url
}: {
	request: Request;
	params: { slug: string };
	url: URL;
}) {
	return proxyRequest(request, 'GET', params, url);
}

export async function POST({
	request,
	params,
	url
}: {
	request: Request;
	params: { slug: string };
	url: URL;
}) {
	const body = await request.text();
	return proxyRequest(request, 'POST', params, url, body);
}
