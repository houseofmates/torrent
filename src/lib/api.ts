import type {
	Torrent,
	MainData,
	Category,
	SearchPlugin,
	SearchResults,
	TorrentPreferences,
	TorrentPeers
} from './types';

const api = '/api/v2';

async function post(path: string, body: URLSearchParams | FormData, signal?: AbortSignal) {
	const res = await fetch(`${api}/${path}`, {
		method: 'POST',
		body,
		signal
	});
	if (!res.ok) throw new Error(`api error: ${res.status} ${res.statusText}`);
	return res;
}

async function get(path: string, params?: Record<string, string>, signal?: AbortSignal) {
	const url = new URL(`${api}/${path}`, window.location.origin);
	if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
	const res = await fetch(url.toString(), { signal });
	if (!res.ok) throw new Error(`api error: ${res.status} ${res.statusText}`);
	return res.json();
}

export async function login(username: string, password: string): Promise<boolean> {
	const res = await fetch(`${api}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ username, password })
	});
	return res.ok;
}

export async function logout(): Promise<void> {
	await post('auth/logout', new URLSearchParams());
}

export async function syncMaindata(rid: number = 0, signal?: AbortSignal): Promise<MainData> {
	return get('sync/maindata', { rid: String(rid) }, signal);
}

export async function getTorrents(
	filter?: string,
	category?: string,
	sort?: string,
	reverse?: boolean,
	limit?: number,
	offset?: number,
	signal?: AbortSignal
): Promise<Torrent[]> {
	const params: Record<string, string> = {};
	if (filter) params.filter = filter;
	if (category) params.category = category;
	if (sort) params.sort = sort;
	if (reverse !== undefined) params.reverse = String(reverse);
	if (limit !== undefined) params.limit = String(limit);
	if (offset !== undefined) params.offset = String(offset);
	return get('torrents/info', params, signal);
}

export async function addTorrent(
	urls?: string,
	savepath?: string,
	category?: string,
	tags?: string,
	skip_checking?: boolean,
	paused?: boolean,
	signal?: AbortSignal
): Promise<void> {
	const body = new URLSearchParams();
	if (urls) body.set('urls', urls);
	if (savepath) body.set('savepath', savepath);
	if (category) body.set('category', category);
	if (tags) body.set('tags', tags);
	if (skip_checking) body.set('skip_checking', String(skip_checking));
	if (paused) body.set('paused', String(paused));
	await post('torrents/add', body, signal);
}

export async function addTorrentFiles(
	files: File[],
	savepath?: string,
	category?: string,
	tags?: string,
	signal?: AbortSignal
): Promise<void> {
	const body = new FormData();
	files.forEach((file) => body.append('torrents', file));
	if (savepath) body.append('savepath', savepath);
	if (category) body.append('category', category);
	if (tags) body.append('tags', tags);
	const res = await fetch(`${api}/torrents/add`, {
		method: 'POST',
		body,
		signal
	});
	if (!res.ok) throw new Error(`api error: ${res.status} ${res.statusText}`);
}

export async function pauseTorrent(hashes: string, signal?: AbortSignal): Promise<void> {
	await post('torrents/pause', new URLSearchParams({ hashes }), signal);
}

export async function resumeTorrent(hashes: string, signal?: AbortSignal): Promise<void> {
	await post('torrents/resume', new URLSearchParams({ hashes }), signal);
}

export async function deleteTorrent(
	hashes: string,
	deleteFiles = false,
	signal?: AbortSignal
): Promise<void> {
	await post(
		'torrents/delete',
		new URLSearchParams({ hashes, deleteFiles: String(deleteFiles) }),
		signal
	);
}

export async function forceRecheck(hashes: string, signal?: AbortSignal): Promise<void> {
	await post('torrents/recheck', new URLSearchParams({ hashes }), signal);
}

export async function setCategory(hashes: string, category: string, signal?: AbortSignal): Promise<void> {
	await post('torrents/setCategory', new URLSearchParams({ hashes, category }), signal);
}

export async function setSavePath(hashes: string, location: string, signal?: AbortSignal): Promise<void> {
	await post('torrents/setLocation', new URLSearchParams({ hashes, location }), signal);
}

export async function setForceStart(hashes: string, value: boolean, signal?: AbortSignal): Promise<void> {
	await post('torrents/setForceStart', new URLSearchParams({ hashes, value: String(value) }), signal);
}

export async function reannounce(hashes: string, signal?: AbortSignal): Promise<void> {
	await post('torrents/reannounce', new URLSearchParams({ hashes }), signal);
}

export async function getCategories(): Promise<Record<string, Category>> {
	return get('torrents/categories');
}

export async function createCategory(name: string, savePath: string): Promise<void> {
	await post('torrents/createCategory', new URLSearchParams({ name, savePath }));
}

export async function removeCategory(name: string): Promise<void> {
	await post('torrents/removeCategories', new URLSearchParams({ categories: name }));
}

export async function getTags(): Promise<string[]> {
	return get('torrents/tags');
}

export async function addTags(hashes: string, tags: string): Promise<void> {
	await post('torrents/addTags', new URLSearchParams({ hashes, tags }));
}

export async function removeTags(hashes: string, tags: string): Promise<void> {
	await post('torrents/removeTags', new URLSearchParams({ hashes, tags }));
}

export async function getPreferences(): Promise<TorrentPreferences> {
	return get('app/preferences');
}

export async function setPreferences(prefs: Partial<TorrentPreferences>): Promise<void> {
	await post('app/setPreferences', new URLSearchParams({ json: JSON.stringify(prefs) }));
}

export async function getTorrentProperties(hash: string): Promise<Record<string, unknown>> {
	return get('torrents/properties', { hash });
}

export async function getTorrentPeers(hash: string, rid?: number): Promise<TorrentPeers> {
	return get('torrents/peers', { hash, ...(rid ? { rid: String(rid) } : {}) });
}

export async function getTorrentTrackers(hash: string): Promise<unknown[]> {
	return get('torrents/trackers', { hash });
}

export async function getTorrentFiles(hash: string): Promise<unknown[]> {
	return get('torrents/files', { hash });
}

// Search API
export async function searchPlugins(): Promise<SearchPlugin[]> {
	return get('search/plugins');
}

export async function searchStart(
	pattern: string,
	plugins = 'all',
	category = 'all'
): Promise<number> {
	const res = await post('search/start', new URLSearchParams({ pattern, plugins, category }));
	const data = await res.json() as { id: number };
	return data.id;
}

export async function searchResults(id: number, limit?: number, offset?: number): Promise<SearchResults> {
	const params: Record<string, string> = { id: String(id) };
	if (limit !== undefined) params.limit = String(limit);
	if (offset !== undefined) params.offset = String(offset);
	return get('search/results', params);
}

export async function searchStop(id: number): Promise<void> {
	await post('search/stop', new URLSearchParams({ id: String(id) }));
}

export async function searchDelete(id: number): Promise<void> {
	await post('search/delete', new URLSearchParams({ id: String(id) }));
}
