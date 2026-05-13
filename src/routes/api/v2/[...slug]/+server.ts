import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const QBIT_URL = env.QBITTORRENT_API_URL;
const QBIT_USERNAME = env.QBITTORRENT_USERNAME;
const QBIT_PASSWORD = env.QBITTORRENT_PASSWORD;

function qbitError() {
	if (!QBIT_URL) throw error(500, 'QBITTORRENT_API_URL not configured');
}

function extractCookiesFromSetCookie(setCookieValues: string[]): string | null {
	// Build a Cookie header value like:
	// "SID=abcd1234; foo=bar"
	// from upstream Set-Cookie strings.
	const parts: string[] = [];

	for (const sc of setCookieValues) {
		// Set-Cookie format: "name=value; Path=/; HttpOnly; ..."
		// We only take the first "name=value" segment.
		const firstSegment = sc.split(';')[0]?.trim();
		if (!firstSegment) continue;

		const eqIdx = firstSegment.indexOf('=');
		if (eqIdx === -1) continue;

		const name = firstSegment.slice(0, eqIdx).trim();
		const value = firstSegment.slice(eqIdx + 1).trim();

		if (!name || !value) continue;
		parts.push(`${name}=${value}`);
	}

	if (parts.length === 0) return null;
	return parts.join('; ');
}

let cachedSidCookie: string | null = null;

async function loginAndGetCookieHeader(force = false): Promise<string | null> {
	if (!QBIT_USERNAME || !QBIT_PASSWORD) return null;
	if (cachedSidCookie && !force) return cachedSidCookie;

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

		if (!res.ok) return null;

		const setCookies: string[] = [];
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') setCookies.push(value);
		});

		cachedSidCookie = extractCookiesFromSetCookie(setCookies);
		return cachedSidCookie;
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

function mergeCookies(_reqCookie: string | null | undefined, upstreamCookie: string | null): string {
	// We intentionally only send cookies obtained from qBittorrent login.
	return upstreamCookie || cachedSidCookie || '';
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

	function buildUpstreamHeaders(cookie: string | null) {
		const headers: Record<string, string> = {};
		if (cookie) {
			headers['Cookie'] = cookie;
		}
		if (method === 'POST') {
			headers['Content-Type'] =
				request.headers.get('content-type') ||
				'application/x-www-form-urlencoded';
		}
		return headers;
	}

	async function doFetch(withSid: string | null) {
		return fetch(apiUrl, {
			method,
			headers: buildUpstreamHeaders(withSid),
			...(method === 'POST' ? { body: bodyText } : {})
		});
	}

	try {
		const isLoginRequest = params.slug === 'auth/login' && method === 'POST';

		if (isLoginRequest) {
			const res = await doFetch(null);
			const setCookies: string[] = [];
			res.headers.forEach((value, key) => {
				if (key.toLowerCase() === 'set-cookie') setCookies.push(value);
			});

			if (!res.ok) {
				const errorBody = await res.text();
				console.error(`qBittorrent auth/login failed: ${res.status} ${res.statusText} ${errorBody.slice(0, 1000)}`);
				return new Response(
					JSON.stringify({
						error: 'upstream auth/login failed',
						status: res.status,
						bodySnippet: errorBody.slice(0, 1000)
					}),
					{ status: res.status, headers: { 'Content-Type': 'application/json' } }
				);
			}

			cachedSidCookie = extractCookiesFromSetCookie(setCookies);
			return new Response(res.body, { status: res.status, headers: forwardCookies(res) });
		}

			let sidCookie = await loginAndGetCookieHeader();
			let res = await doFetch(sidCookie);
			if (res.status === 403) {
				sidCookie = await loginAndGetCookieHeader(true);
				res = await doFetch(sidCookie);
			}

			if (!res.ok) {
				const errorBody = await res.text();
				console.error(`qBittorrent proxy request failed: ${res.status} ${res.statusText} ${errorBody.slice(0, 1000)}`);
				return new Response(
					JSON.stringify({
						error: 'upstream proxy failed',
						status: res.status,
						bodySnippet: errorBody.slice(0, 1000)
					}),
					{ status: res.status, headers: { 'Content-Type': 'application/json' } }
				);
			}

			return new Response(res.body, { status: res.status, headers: forwardCookies(res) });

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
