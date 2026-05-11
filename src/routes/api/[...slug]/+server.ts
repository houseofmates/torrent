import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ request, params, url }) {
	const qbitUrl = env.QBITTORRENT_API_URL;
	if (!qbitUrl) {
		throw error(500, 'QBITTORRENT_API_URL not configured');
	}

	const apiUrl = new URL(`${qbitUrl}/api/v2/${params.slug}`);
	apiUrl.search = url.search;

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'Cookie': request.headers.get('cookie') || '',
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		const responseHeaders = new Headers();
		response.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') {
				responseHeaders.append(key, value);
			}
		});

		return new Response(response.body, {
			status: response.status,
			headers: responseHeaders
		});
	} catch (err) {
		throw error(500, `Failed to proxy request: ${err instanceof Error ? err.message : String(err)}`);
	}
}

export async function POST({ request, params, url }) {
	const qbitUrl = env.QBITTORRENT_API_URL;
	if (!qbitUrl) {
		throw error(500, 'QBITTORRENT_API_URL not configured');
	}

	const apiUrl = new URL(`${qbitUrl}/api/v2/${params.slug}`);
	apiUrl.search = url.search;

	try {
		const body = await request.text();
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Cookie': request.headers.get('cookie') || '',
				'Content-Type': request.headers.get('content-type') || 'application/x-www-form-urlencoded'
			},
			body
		});

		const responseHeaders = new Headers();
		response.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') {
				responseHeaders.append(key, value);
			}
		});

		return new Response(response.body, {
			status: response.status,
			headers: responseHeaders
		});
	} catch (err) {
		throw error(500, `Failed to proxy request: ${err instanceof Error ? err.message : String(err)}`);
	}
}