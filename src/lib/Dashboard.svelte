<script lang="ts">
	import { torrents, maindata, connectionError, addToast, modal, startPolling, stopPolling } from '$lib/stores';
	import TorrentCard from '$lib/TorrentCard.svelte';
	import AddTorrentModal from '$lib/AddTorrentModal.svelte';
	import ContextMenu, { type ContextMenuItem } from '$lib/ContextMenu.svelte';
	import type { Torrent } from './types';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	type SortField = 'name' | 'progress' | 'size' | 'dlspeed' | 'upspeed' | 'eta' | 'ratio' | 'state';
	type SortDirection = 'asc' | 'desc';

	let searchQuery = $state('');
	let sortField = $state<SortField>('progress');
	let sortDirection = $state<SortDirection>('desc');
	let contextMenu = $state<{ items: ContextMenuItem[]; x: number; y: number; torrent: Torrent } | null>(null);

	let uploadSpeed = $state(0);
	let downloadSpeed = $state(0);
	let loading = $state(true);
	let error = $state('');
	let hasLoadedOnce = $state(false);
	let loadTimer: ReturnType<typeof setTimeout> | null = null;

	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = $state(false);

	function getNumericValue(value: unknown): number {
		const numeric = Number(value ?? 0);
		return Number.isFinite(numeric) ? numeric : 0;
	}

	function compareTorrents(a: Torrent, b: Torrent): number {
		const primary = (() => {
			switch (sortField) {
				case 'name': return a.name.localeCompare(b.name);
				case 'progress': return getNumericValue(a.progress) - getNumericValue(b.progress);
				case 'size': return getNumericValue(a.size) - getNumericValue(b.size);
				case 'dlspeed': return getNumericValue(a.dlspeed) - getNumericValue(b.dlspeed);
				case 'upspeed': return getNumericValue(a.upspeed) - getNumericValue(b.upspeed);
				case 'eta': return getNumericValue(a.eta) - getNumericValue(b.eta);
				case 'ratio': return getNumericValue(a.ratio) - getNumericValue(b.ratio);
				case 'state': return (a.state ?? '').localeCompare(b.state ?? '');
				default: return 0;
			}
		})();

		const safePrimary = Number.isFinite(primary) ? primary : 0;
		if (safePrimary !== 0) {
			return sortDirection === 'desc' ? -safePrimary : safePrimary;
		}

		const nameFallback = a.name.localeCompare(b.name);
		if (nameFallback !== 0) {
			return nameFallback;
		}

		return a.hash.localeCompare(b.hash);
	}

	let filteredTorrents = $derived.by(() => {
		const items = $torrents as Torrent[];
		let result = items.filter((t) =>
			t.name.toLowerCase().includes(searchQuery.toLowerCase())
		);

		result.sort(compareTorrents);

		return result;
	});

	// force-loading fallback: if no data after 8s, show error state
	$effect(() => {
		if (loading && !loadTimer) {
			loadTimer = setTimeout(() => {
				if (loading) {
					error = 'cannot reach qbittorrent.';
					loading = false;
				}
			}, 8000);
		}
		return () => { if (loadTimer) clearTimeout(loadTimer); };
	});

	$effect(() => {
		const md = $maindata as any;
		if (md?.server_state) {
			uploadSpeed = md.server_state.up_info_speed || 0;
			downloadSpeed = md.server_state.dl_info_speed || 0;
			if (!hasLoadedOnce) {
				loading = false;
				hasLoadedOnce = true;
			}
			error = '';
			if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
		}
	});

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'desc';
		}
	}

	function formatSpeed(bytes: number): string {
		if (bytes === 0) return '0 b/s';
		const units = ['b/s', 'kb/s', 'mb/s', 'gb/s'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
	}

	function handleTouchStart(e: TouchEvent, torrent: Torrent) {
		longPressFired = false;
		longPressTimer = setTimeout(() => {
			longPressFired = true;
			const touch = e.touches[0];
			handleContextMenu({ preventDefault: () => {}, clientX: touch.clientX, clientY: touch.clientY } as MouseEvent, torrent);
		}, 500);
	}

	function handleTouchEnd() {
		if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
	}

	function handleContextMenuSafe(e: MouseEvent, torrent: Torrent) {
		if (longPressFired) { longPressFired = false; return; }
		handleContextMenu(e, torrent);
	}

	function handleContextMenu(e: MouseEvent, torrent: Torrent) {
		e.preventDefault();
		const isPaused = torrent.state.includes('paused');
		contextMenu = {
			items: [
				{ label: isPaused ? 'resume' : 'pause', action: async () => {
					const s = await import('$lib/stores');
					isPaused ? s.doResumeTorrent(torrent.hash) : s.doPauseTorrent(torrent.hash);
				}},
				{ label: 'force start', action: async () => { (await import('$lib/stores')).doForceStart(torrent.hash); } },
				{ label: 'force recheck', action: async () => { (await import('$lib/stores')).doForceRecheck(torrent.hash); } },
				{ label: 'reannounce', action: async () => { (await import('$lib/stores')).doReannounce(torrent.hash); } },
				{ label: '', action: () => {}, separator: true },
				{ label: 'delete', danger: true, action: async () => { (await import('$lib/stores')).doDeleteTorrent(torrent.hash, false); } },
				{ label: 'delete with files', danger: true, action: async () => { (await import('$lib/stores')).doDeleteTorrent(torrent.hash, true); } }
			],
			x: e.clientX,
			y: e.clientY,
			torrent
		};
	}

	afterNavigate(() => {
		// If SvelteKit keeps this component mounted across navigation,
		// ensure we re-enter a known-good loading state when returning to the dashboard.
		const pathname = window.location.pathname;
		if (pathname === '/') {
			loading = true;
			error = '';
			hasLoadedOnce = false;

			if (loadTimer) {
				clearTimeout(loadTimer);
				loadTimer = null;
			}

			startPolling(2000);
		}
	});

	onMount(() => {
		startPolling(2000);
	});

	onDestroy(() => {
		stopPolling();
	});
</script>

<AddTorrentModal />
{#if contextMenu}
	<ContextMenu items={contextMenu.items} x={contextMenu.x} y={contextMenu.y} onclose={() => contextMenu = null} />
{/if}

<div class="px-4 sm:px-6 py-4 pb-24 sm:pb-6" style="max-width: 1200px; margin: 0 auto;">
	<!-- speed bar -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex gap-4 text-sm" style="font-variant-numeric: tabular-nums;">
			<span style="color: var(--color-accent-blue);">↓ {formatSpeed(downloadSpeed)}</span>
			<span style="color: var(--color-success);">↑ {formatSpeed(uploadSpeed)}</span>
		</div>
		<button onclick={() => modal.set({ type: 'add' })}
			class="px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-[0.98]"
			style="background: var(--color-accent-blue); border-radius: 8px; color: #050505;"
			aria-label="add torrent">+ add</button>
	</div>

	<!-- controls -->
	<div class="flex flex-col sm:flex-row gap-3 mb-6">
		<div class="flex-1">
			<input type="text" bind:value={searchQuery}
				class="w-full px-4 py-3 border text-sm"
				style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 8px; color: var(--color-text-primary);"
				placeholder="search torrents..." />
		</div>
		<div class="flex gap-1.5 flex-wrap">
			{#each ['name', 'progress', 'size', 'state'] as field}
				<button
					class="px-3 py-2 text-xs border transition-all duration-150 active:scale-[0.98]"
					style="background: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-surface-input)'}; border-color: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-border-subtle)'}; border-radius: 6px; color: {sortField === field ? '#050505' : 'var(--color-text-primary)'};"
					onclick={() => toggleSort(field as SortField)}
				>{field}{sortField === field ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}</button>
			{/each}
		</div>
	</div>

	<!-- states -->
	{#if loading}
		<div class="flex flex-col gap-3">
			{#each Array(4) as _}
				<div class="border p-4" style="border-color: var(--color-border-subtle); background: var(--color-surface-card); border-radius: 10px;">
					<div>
						<div class="w-3/4 mb-3 animate-shimmer" style="background: var(--color-border-subtle); height: 14px; border-radius: 4px;"></div>
						<div class="w-full mb-2 animate-shimmer" style="background: var(--color-border-subtle); height: 6px; border-radius: 9999px;"></div>
						<div class="flex gap-4">
							<div class="w-20 animate-shimmer" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
							<div class="w-16 animate-shimmer" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
							<div class="w-12 animate-shimmer" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error || $connectionError}
		<div class="text-center py-16">
			<p class="text-sm mb-4" style="color: var(--color-danger);">{error || $connectionError}</p>
			<button onclick={() => { loading = true; error = ''; connectionError.set(''); startPolling(); }}
				class="px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-[0.98]"
				style="background: var(--color-accent-blue); border-radius: 8px; color: #050505;">retry</button>
		</div>
	{:else if filteredTorrents.length === 0}
		<div class="text-center py-16">
			<p class="text-sm mb-1" style="color: var(--color-accent-yellow);">{searchQuery ? 'no matches' : 'no torrents'}</p>
			<p class="text-xs" style="color: var(--color-text-info);">
				{searchQuery ? `nothing found for "${searchQuery}"` : 'add a magnet link or url to get started.'}
			</p>
		</div>
	{:else}
		<div class="flex flex-col gap-3" role="list">
			{#each filteredTorrents as torrent, i (torrent.hash || torrent.name || i)}
				<div role="listitem"
					oncontextmenu={(e) => handleContextMenuSafe(e, torrent)}
					ontouchstart={(e) => handleTouchStart(e, torrent)}
					ontouchend={handleTouchEnd}
					ontouchmove={handleTouchEnd}
					ontouchcancel={handleTouchEnd}>
					<TorrentCard {torrent} />
				</div>
			{/each}
		</div>
	{/if}
</div>
