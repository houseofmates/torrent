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

async function loginAndGetCookieHeader(): Promise<string | null> {
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

		if (!res.ok) return null;

		const setCookies: string[] = [];
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') setCookies.push(value);
		});

		return extractCookiesFromSetCookie(setCookies);
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
	return upstreamCookie || '';
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
	// Login per request so we always have a fresh/valid SID.
		let sidCookie = await loginAndGetCookieHeader();
		let res = await doFetch(sidCookie);

		// Retry once on 403: re-login and try again.
		if (res.status === 403) {
			sidCookie = await loginAndGetCookieHeader();
			res = await doFetch(sidCookie);
		}

		// Improve visibility when qBittorrent denies access/auth.
		if (res.status === 401 || res.status === 403) {
			const text = await res.text();
			const snippet = text.slice(0, 500);
			return new Response(
				JSON.stringify({
					error: 'upstream auth failed',
					upstreamStatus: res.status,
					upstreamBodySnippet: snippet
				}),
				{
					status: res.status,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
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
