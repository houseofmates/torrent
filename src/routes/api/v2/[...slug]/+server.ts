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
	const firstPart = setCookie.split(';', 1)[0]?.trim();
	if (!firstPart) return null;
	if (!firstPart.toUpperCase().startsWith('SID=')) return null;
	return firstPart;
}

async function ensureQbitAuthed(): Promise<string | null> {
	// If we already have a cached SID cookie, reuse it.
	if (cachedSidCookie) return cachedSidCookie;

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

		const setCookies: string[] = res.headers
			.getSetCookie?.() ?? [];

		// Fallback if getSetCookie isn't available: iterate all set-cookie headers.
		if (!setCookies.length) {
			res.headers.forEach((_, key) => {
				if (key.toLowerCase() === 'set-cookie') {
					// This branch isn't reliable to extract value without getSetCookie,
					// so we just ignore it.
				}
			});
		}

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
	const a = (reqCookie || '').trim();
	const b = (sidCookie || '').trim();
	if (a && b) return `${a}; ${b}`;
	return a || b;
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

	const sidCookie = await ensureQbitAuthed();
	const clientCookie = request.headers.get('cookie');
	const mergedCookie = mergeCookies(clientCookie, sidCookie);

	try {
		const res = await fetch(apiUrl, {
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
