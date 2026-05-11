import { writable } from 'svelte/store';
import type { Torrent, MainData } from './types';

export const isAuthenticated = writable(false);
export const torrents = writable<Torrent[]>([]);
export const maindata = writable<MainData>({});

type ToastType = 'info' | 'error' | 'success';
export interface Toast { id: number; message: string; type: ToastType; }
export const toasts = writable<Toast[]>([]);

let toastId = 0;
export function addToast(message: string, type: ToastType = 'info', duration = 3500) {
	const id = ++toastId;
	toasts.update(t => [...t, { id, message, type }]);
	setTimeout(() => {
		toasts.update(t => t.filter(toast => toast.id !== id));
	}, duration);
}