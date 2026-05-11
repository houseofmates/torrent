<script lang="ts">
	import { isAuthenticated, torrents, maindata, addToast } from '$lib/stores';
	import TorrentCard from '$lib/TorrentCard.svelte';
	import AddTorrentModal from '$lib/AddTorrentModal.svelte';
	import ContextMenu, { type ContextMenuItem } from '$lib/ContextMenu.svelte';
	import type { Torrent } from './types';
	import { onMount } from 'svelte';

	type SortField = 'name' | 'progress' | 'size' | 'dlspeed' | 'upspeed' | 'eta' | 'ratio' | 'state';
	type SortDirection = 'asc' | 'desc';

	let searchQuery = $state('');
	let sortField = $state<SortField>('name');
	let sortDirection = $state<SortDirection>('desc');
	let showAddModal = $state(false);
	let contextMenu = $state<{ items: ContextMenuItem[]; x: number; y: number; torrent: Torrent } | null>(null);

	let uploadSpeed = $state(0);
	let downloadSpeed = $state(0);
	let loading = $state(true);
	let error = $state('');
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	let filteredTorrents = $derived.by(() => {
		let result = $torrents.filter((t: Torrent) =>
			t.name.toLowerCase().includes(searchQuery.toLowerCase())
		);

		result.sort((a: Torrent, b: Torrent) => {
			let comparison = 0;
			switch (sortField) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'progress':
					comparison = (a.progress || 0) - (b.progress || 0);
					break;
				case 'size':
					comparison = (a.size || 0) - (b.size || 0);
					break;
				case 'dlspeed':
					comparison = (a.dlspeed || 0) - (b.dlspeed || 0);
					break;
				case 'upspeed':
					comparison = (a.upspeed || 0) - (b.upspeed || 0);
					break;
				case 'eta':
					comparison = (a.eta || 0) - (b.eta || 0);
					break;
				case 'ratio':
					comparison = (a.ratio || 0) - (b.ratio || 0);
					break;
				case 'state':
					comparison = (a.state || '').localeCompare(b.state || '');
					break;
			}
			return sortDirection === 'desc' ? -comparison : comparison;
		});

		return result;
	});

	async function pollMaindata() {
		try {
			const res = await fetch('/api/sync/maindata');
			if (res.ok) {
				const data = await res.json();
				maindata.set(data);
				if (data.server_state) {
					uploadSpeed = data.server_state.up_info_speed || 0;
					downloadSpeed = data.server_state.dl_info_speed || 0;
				}
				if (data.torrents) {
					const existing = $torrents.reduce<Record<string, Torrent>>((acc, t) => {
						acc[t.hash] = t;
						return acc;
					}, {});
					const incoming = data.torrents as Record<string, Torrent>;
					const updated = Object.values(incoming).map((t) => {
						existing[t.hash] = { ...existing[t.hash], ...t };
						return existing[t.hash];
					});
					if (data.torrents_removed) {
						const removed = new Set(data.torrents_removed as string[]);
						const final = updated.filter((t: Torrent) => !removed.has(t.hash));
						torrents.set(final);
					} else {
						torrents.set(updated);
					}
				}
				loading = false;
				error = '';
			} else if (res.status === 403) {
				isAuthenticated.set(false);
			} else {
				error = 'failed to load torrent data';
				loading = false;
			}
		} catch {
			error = 'connection failed.';
			loading = false;
		}
	}

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

	function handleContextMenu(e: MouseEvent, torrent: Torrent) {
		e.preventDefault();
		const isPaused = torrent.state.includes('paused');
		
		const items: ContextMenuItem[] = [
			{
				label: isPaused ? 'resume' : 'pause',
				action: async () => {
					try {
						const action = isPaused ? 'resume' : 'pause';
						const res = await fetch(`/api/torrents/${action}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({ hashes: torrent.hash })
						});
						if (res.ok) addToast(isPaused ? 'resumed' : 'paused', 'success');
						else addToast('failed to toggle pause', 'error');
					} catch {
						addToast('failed to toggle pause', 'error');
					}
				}
			},
			{
				label: 'force start',
				action: async () => {
					try {
						const res = await fetch('/api/torrents/setForceStart', {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({ hashes: torrent.hash, value: 'true' })
						});
						if (res.ok) addToast('force started', 'success');
						else addToast('failed to force start', 'error');
					} catch {
						addToast('failed to force start', 'error');
					}
				}
			},
			{
				label: 'force recheck',
				action: async () => {
					try {
						const res = await fetch('/api/torrents/recheck', {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({ hashes: torrent.hash })
						});
						if (res.ok) addToast('recheck started', 'success');
						else addToast('failed to recheck', 'error');
					} catch {
						addToast('failed to recheck', 'error');
					}
				}
			},
			{
				label: 'reannounce',
				action: async () => {
					try {
						const res = await fetch('/api/torrents/reannounce', {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({ hashes: torrent.hash })
						});
						if (res.ok) addToast('reannounced', 'success');
						else addToast('failed to reannounce', 'error');
					} catch {
						addToast('failed to reannounce', 'error');
					}
				}
			},
			{
				label: 'delete',
				danger: true,
				action: async () => {
					try {
						const res = await fetch('/api/torrents/delete', {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({ hashes: torrent.hash, deleteFiles: 'false' })
						});
						if (res.ok) addToast('deleted', 'success');
						else addToast('failed to delete', 'error');
					} catch {
						addToast('failed to delete', 'error');
					}
				}
			},
			{
				label: 'delete with files',
				danger: true,
				action: async () => {
					try {
						const res = await fetch('/api/torrents/delete', {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({ hashes: torrent.hash, deleteFiles: 'true' })
						});
						if (res.ok) addToast('deleted with files', 'success');
						else addToast('failed to delete with files', 'error');
					} catch {
						addToast('failed to delete with files', 'error');
					}
				}
			}
		];

		// Insert separators properly
		const menuItems = [
			...items.slice(0, 4),
			{ label: '', action: () => {}, separator: true } as ContextMenuItem,
			...items.slice(4)
		];

		contextMenu = {
			items: menuItems,
			x: e.clientX,
			y: e.clientY,
			torrent
		};
	}

	onMount(() => {
		pollMaindata();
		pollTimer = setInterval(pollMaindata, 2000);
		return () => { if (pollTimer) clearInterval(pollTimer); };
	});
</script>

<AddTorrentModal bind:open={showAddModal} />
{#if contextMenu}
	<ContextMenu
		items={contextMenu.items}
		x={contextMenu.x}
		y={contextMenu.y}
		onclose={() => contextMenu = null}
	/>
{/if}

<div class="min-h-[100dvh]" style="background: var(--color-bg-primary);">
	<!-- top bar -->
	<header class="flex items-center justify-between px-6 py-4 border-b" style="border-color: var(--color-border-subtle);">
		<div class="flex items-center gap-6">
			<h1 class="text-lg tracking-wide" style="color: var(--color-accent-yellow);">torrent</h1>
			<div class="flex gap-4 text-sm" style="font-variant-numeric: tabular-nums;">
				<span class="text-white">↓ {formatSpeed(downloadSpeed)}</span>
				<span class="text-white">↑ {formatSpeed(uploadSpeed)}</span>
			</div>
		</div>
		<button
			onclick={() => showAddModal = true}
			class="w-8 h-8 flex items-center justify-center text-lg transition-all duration-150 active:scale-95"
			style="background: var(--color-accent-blue); border-radius: 8px; color: #fff;"
			aria-label="add torrent"
		>+</button>
	</header>

	<!-- main content -->
	<main class="px-6 py-6" style="max-width: 1024px; margin: 0 auto;">
		<!-- controls row -->
		<div class="flex flex-col sm:flex-row gap-4 mb-6">
			<!-- search -->
			<div class="flex-1">
				<input
					type="text"
					bind:value={searchQuery}
					class="w-full px-4 py-3 border text-sm"
					style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 8px; color: #fff;"
					placeholder="search torrents..."
				/>
			</div>
			<!-- sort controls -->
			<div class="flex gap-2">
				<div class="flex gap-1">
					{#each ['name', 'progress', 'size', 'state'] as field}
						<button
							class="px-3 py-2 text-xs border transition-all duration-150 active:scale-95"
							style="background: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-surface-input)'}; border-color: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-border-subtle)'}; border-radius: 6px; color: #fff;"
							onclick={() => toggleSort(field as SortField)}
						>
							{field}{sortField === field ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- states -->
		{#if loading}
			<div class="flex flex-col gap-3">
				{#each Array(4) as _, i}
					<div class="border p-4" style="border-color: var(--color-border-subtle); background: var(--color-surface-card); border-radius: 10px;">
						<div class="animate-pulse">
							<div class="w-3/4 mb-3" style="background: var(--color-border-subtle); height: 14px; border-radius: 4px;"></div>
							<div class="w-full mb-2" style="background: var(--color-border-subtle); height: 6px; border-radius: 9999px;"></div>
							<div class="flex gap-4">
								<div class="w-20" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
								<div class="w-16" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
								<div class="w-12" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if error}
			<div class="text-center py-16">
				<p class="text-sm mb-4" style="color: var(--color-danger);">{error}</p>
				<button
					onclick={() => { loading = true; error = ''; pollMaindata(); }}
					class="px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-95"
					style="background: var(--color-accent-blue); border-radius: 8px; color: #fff;"
				>retry</button>
			</div>
		{:else if filteredTorrents.length === 0}
			<div class="text-center py-16">
				<p class="text-sm mb-1" style="color: var(--color-accent-yellow);">{searchQuery ? 'no matches' : 'no torrents'}</p>
				<p class="text-xs" style="color: var(--color-text-info);">
					{searchQuery
						? `nothing found for "${searchQuery}"`
						: 'add a magnet link or url to get started.'}
				</p>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#each filteredTorrents as torrent (torrent.hash)}
					<div oncontextmenu={(e) => handleContextMenu(e, torrent)}>
						<TorrentCard {torrent} />
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>