<script lang="ts">
	import { torrents, maindata, addToast, modal, startPolling, stopPolling, doPauseTorrent, doResumeTorrent, doDeleteTorrent, doForceRecheck, doForceStart, doReannounce } from '$lib/stores';
	import TorrentCard from '$lib/TorrentCard.svelte';
	import AddTorrentModal from '$lib/AddTorrentModal.svelte';
	import ContextMenu, { type ContextMenuItem } from '$lib/ContextMenu.svelte';
	import type { Torrent } from './types';
	import { onMount, onDestroy } from 'svelte';

	type SortField = 'name' | 'progress' | 'size' | 'dlspeed' | 'upspeed' | 'eta' | 'ratio' | 'state';
	type SortDirection = 'asc' | 'desc';

	let searchQuery = $state('');
	let sortField = $state<SortField>('name');
	let sortDirection = $state<SortDirection>('desc');
	let contextMenu = $state<{ items: ContextMenuItem[]; x: number; y: number; torrent: Torrent } | null>(null);

	let uploadSpeed = $state(0);
	let downloadSpeed = $state(0);
	let loading = $state(true);
	let error = $state('');
	let hasLoadedOnce = $state(false);

	let filteredTorrents = $derived.by(() => {
		const items = $torrents as Torrent[];
		let result = items.filter((t) =>
			t.name.toLowerCase().includes(searchQuery.toLowerCase())
		);

		result.sort((a, b) => {
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

	let serverState = $derived($maindata as any);

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

	function handleContextMenu(e: MouseEvent, torrent: Torrent) {
		e.preventDefault();
		const isPaused = torrent.state.includes('paused');

		const items: ContextMenuItem[] = [
			{ label: isPaused ? 'resume' : 'pause', action: async () => {
				if (isPaused) await doResumeTorrent(torrent.hash);
				else await doPauseTorrent(torrent.hash);
			}},
			{ label: 'force start', action: () => doForceStart(torrent.hash) },
			{ label: 'force recheck', action: () => doForceRecheck(torrent.hash) },
			{ label: 'reannounce', action: () => doReannounce(torrent.hash) },
			{ label: '', action: () => {}, separator: true },
			{ label: 'delete', danger: true, action: () => doDeleteTorrent(torrent.hash, false) },
			{ label: 'delete with files', danger: true, action: () => doDeleteTorrent(torrent.hash, true) }
		];

		contextMenu = {
			items,
			x: e.clientX,
			y: e.clientY,
			torrent
		};
	}

	onMount(() => {
		startPolling(2000);
	});

	onDestroy(() => {
		stopPolling();
	});
</script>

<AddTorrentModal />
{#if contextMenu}
	<ContextMenu
		items={contextMenu.items}
		x={contextMenu.x}
		y={contextMenu.y}
		onclose={() => contextMenu = null}
	/>
{/if}

<!-- main content -->
<div class="px-4 sm:px-6 py-4" style="max-width: 1200px; margin: 0 auto;">
	<!-- speed bar -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex gap-4 text-sm" style="font-variant-numeric: tabular-nums;">
			<span style="color: var(--color-accent-blue);">↓ {formatSpeed(downloadSpeed)}</span>
			<span style="color: var(--color-success);">↑ {formatSpeed(uploadSpeed)}</span>
		</div>
		<button
			onclick={() => modal.set({ type: 'add' })}
			class="px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-[0.98]"
			style="background: var(--color-accent-blue); border-radius: 8px; color: #050505;"
			aria-label="add torrent"
		>+ add</button>
	</div>

	<!-- controls row -->
	<div class="flex flex-col sm:flex-row gap-3 mb-6">
		<div class="flex-1">
			<input
				type="text"
				bind:value={searchQuery}
				class="w-full px-4 py-3 border text-sm"
				style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 8px; color: var(--color-text-primary);"
				placeholder="search torrents..."
			/>
		</div>
		<div class="flex gap-1.5 flex-wrap">
			{#each ['name', 'progress', 'size', 'state'] as field}
				<button
					class="px-3 py-2 text-xs border transition-all duration-150 active:scale-[0.98]"
					style="background: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-surface-input)'}; border-color: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-border-subtle)'}; border-radius: 6px; color: {sortField === field ? '#050505' : 'var(--color-text-primary)'};"
					onclick={() => toggleSort(field as SortField)}
				>
					{field}{sortField === field ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}
				</button>
			{/each}
		</div>
	</div>

	<!-- states -->
	{#if loading}
		<div class="flex flex-col gap-3">
			{#each Array(4) as _, i}
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
	{:else if error}
		<div class="text-center py-16">
			<p class="text-sm mb-4" style="color: var(--color-danger);">{error}</p>
			<button
				onclick={() => { loading = true; error = ''; startPolling(); }}
				class="px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-[0.98]"
				style="background: var(--color-accent-blue); border-radius: 8px; color: #050505;"
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
		<div class="flex flex-col gap-3" role="list">
			{#each filteredTorrents as torrent (torrent.hash)}
				<div role="listitem" oncontextmenu={(e) => handleContextMenu(e, torrent)}>
					<TorrentCard {torrent} />
				</div>
			{/each}
		</div>
	{/if}
</div>
