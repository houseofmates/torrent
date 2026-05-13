import { writable, get } from 'svelte/store';
import * as api from './api';
import type {
	Torrent,
	MainData,
	Category,
	SearchPlugin,
	SearchResult,
	SearchResults,
	TorrentPreferences
} from './types';

// -- state stores --
export const isAuthenticated = writable(false);
export const torrents = writable<Torrent[]>([]);
export const maindata = writable<Partial<MainData>>({});
export const preferences = writable<TorrentPreferences | null>(null);
export const categories = writable<Record<string, Category>>({});
export const searchPlugins = writable<SearchPlugin[]>([]);
export const connectionError = writable<string>('');

// -- ui stores --
type ToastType = 'info' | 'error' | 'success';
export interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
}
export const toasts = writable<ToastItem[]>([]);

export interface ModalState {
	type: 'add' | 'confirm_delete' | null;
	torrentHash?: string;
	torrentName?: string;
}
export const modal = writable<ModalState>({ type: null });

let toastId = 0;
export function addToast(message: string, type: ToastType = 'info', duration = 3500) {
	const id = ++toastId;
	toasts.update((t) => [...t, { id, message, type }]);
	setTimeout(() => {
		toasts.update((t) => t.filter((toast) => toast.id !== id));
	}, duration);
}

// -- polling --
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastRid = 0;
let polling = false;
let connectionLostToastShown = false;

async function pollMaindata() {
	if (polling) return;
	polling = true;
	try {
		const data = await api.syncMaindata(lastRid);
		if (data.rid !== undefined) lastRid = data.rid;

		maindata.set(data);
		connectionError.set('');

		if (data.torrents) {
			const current = get(torrents);
			const existing = current.reduce<Record<string, Torrent>>((acc, t) => {
				acc[t.hash] = t;
				return acc;
			}, {});

			const incoming = data.torrents as Record<string, Torrent>;
			const updated = Object.values(incoming).map((t) => {
				existing[t.hash] = { ...existing[t.hash], ...t };
				return existing[t.hash];
			});

			if (data.torrents_removed) {
				const removed = new Set(data.torrents_removed);
				torrents.set(updated.filter((t) => !removed.has(t.hash)));
			} else {
				torrents.set(updated);
			}
		}

		if (connectionLostToastShown) {
			connectionLostToastShown = false;
			connectionError.set('');
			addToast('reconnected', 'success');
		}
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		if (get(isAuthenticated)) {
			connectionError.set(errorMessage);
			if (!connectionLostToastShown) {
				addToast('connection lost. retrying...', 'error');
				connectionLostToastShown = true;
			}
		}
		// always update maindata so the loading state can resolve
		maindata.update((md) => md);
	} finally {
		polling = false;
	}
}

export function startPolling(intervalMs = 2000) {
	stopPolling();
	pollMaindata();
	pollTimer = setInterval(pollMaindata, intervalMs);
}

export function stopPolling() {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
	lastRid = 0;
}

// -- actions --
export async function doLogin(username: string, password: string): Promise<boolean> {
	try {
		const ok = await api.login(username, password);
		if (ok) {
			connectionError.set('');
			const data = await api.syncMaindata(0);
			if (data.rid !== undefined) lastRid = data.rid;
			maindata.set(data);

			if (data.torrents) {
				const current = get(torrents);
				const existing = current.reduce<Record<string, Torrent>>((acc, t) => {
					acc[t.hash] = t;
					return acc;
				}, {});

				const incoming = data.torrents as Record<string, Torrent>;
				const updated = Object.values(incoming).map((t) => {
					existing[t.hash] = { ...existing[t.hash], ...t };
					return existing[t.hash];
				});

				if (data.torrents_removed) {
					const removed = new Set(data.torrents_removed);
					torrents.set(updated.filter((t) => !removed.has(t.hash)));
				} else {
					torrents.set(updated);
				}
			}

			isAuthenticated.set(true);
			startPolling();
			api.getCategories()
				.then((cats) => categories.set(cats))
				.catch(() => {});
			api.getPreferences()
				.then((prefs) => preferences.set(prefs))
				.catch(() => {});
			api.searchPlugins()
				.then((plugins) => searchPlugins.set(plugins))
				.catch(() => {});
			addToast('connected', 'success');
		}
		return ok;
	} catch {
		addToast('connection failed. is qbittorrent running?', 'error');
		return false;
	}
}

export async function doLogout() {
	stopPolling();
	isAuthenticated.set(false);
	torrents.set([]);
	maindata.set({});
	connectionError.set('');
	try {
		await api.logout();
	} catch {
		// ignore logout errors
	}
	addToast('disconnected', 'info');
}

export async function doAddTorrent(
	urls?: string,
	savepath?: string,
	category?: string,
	files?: File[]
) {
	try {
		if (files && files.length > 0) {
			await api.addTorrentFiles(files, savepath, category);
		} else if (urls) {
			await api.addTorrent(urls, savepath, category);
		}
		addToast('torrent added', 'success');
		modal.set({ type: null });
		pollMaindata(); // immediate refresh
	} catch (err) {
		addToast(`failed to add: ${err instanceof Error ? err.message : 'unknown error'}`, 'error');
		throw err;
	}
}

export async function doPauseTorrent(hash: string) {
	try {
		await api.pauseTorrent(hash);
		addToast('paused', 'success');
	} catch {
		addToast('failed to pause', 'error');
	}
}

export async function doResumeTorrent(hash: string) {
	try {
		await api.resumeTorrent(hash);
		addToast('resumed', 'success');
	} catch {
		addToast('failed to resume', 'error');
	}
}

export async function doDeleteTorrent(hash: string, deleteFiles = false) {
	try {
		await api.deleteTorrent(hash, deleteFiles);
		addToast(deleteFiles ? 'deleted with files' : 'deleted', 'success');
	} catch {
		addToast('failed to delete', 'error');
	}
}

export async function doForceRecheck(hash: string) {
	try {
		await api.forceRecheck(hash);
		addToast('recheck started', 'success');
	} catch {
		addToast('failed to recheck', 'error');
	}
}

export async function doSetCategory(hashes: string, category: string) {
	try {
		await api.setCategory(hashes, category);
		addToast('category updated', 'success');
	} catch {
		addToast('failed to set category', 'error');
	}
}

export async function doSetSavePath(hashes: string, location: string) {
	try {
		await api.setSavePath(hashes, location);
		addToast('save path updated', 'success');
	} catch {
		addToast('failed to set save path', 'error');
	}
}

export async function doForceStart(hash: string) {
	try {
		await api.setForceStart(hash, true);
		addToast('force started', 'success');
	} catch {
		addToast('failed to force start', 'error');
	}
}

export async function doReannounce(hash: string) {
	try {
		await api.reannounce(hash);
		addToast('reannounced', 'success');
	} catch {
		addToast('failed to reannounce', 'error');
	}
}

// search actions
export async function doSearchStart(
	pattern: string,
	plugins = 'all',
	category = 'all'
): Promise<number> {
	try {
		return await api.searchStart(pattern, plugins, category);
	} catch (err) {
		addToast(`search failed: ${err instanceof Error ? err.message : 'unknown'}`, 'error');
		throw err;
	}
}

export async function doSearchResults(id: number): Promise<SearchResults> {
	return api.searchResults(id);
}

export async function doSearchStop(id: number) {
	await api.searchStop(id);
}

export async function doSearchDelete(id: number) {
	await api.searchDelete(id);
}

export async function doDownloadFromSearch(fileUrl: string, savepath?: string, category?: string) {
	try {
		await api.addTorrent(fileUrl, savepath, category);
		addToast('download started', 'success');
	} catch {
		addToast('failed to start download', 'error');
	}
}

export async function refreshCategories() {
	try {
		const cats = await api.getCategories();
		categories.set(cats);
	} catch {
		// silent fail
	}
}

export async function refreshSearchPlugins() {
	try {
		const plugins = await api.searchPlugins();
		searchPlugins.set(plugins);
	} catch {
		// silent fail
	}
}
