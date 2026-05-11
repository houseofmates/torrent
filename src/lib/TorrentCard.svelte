<script lang="ts">
	import type { Torrent } from './types';
	import { doPauseTorrent, doResumeTorrent, doForceRecheck, doDeleteTorrent, addToast } from './stores';

	interface Props {
		torrent: Torrent;
	}

	let { torrent }: Props = $props();
	let showActions = $state(false);

	const statePalette: Record<string, { bg: string; text: string }> = {
		downloading:   { bg: 'var(--color-accent-blue)', text: '#050505' },
		seeding:       { bg: 'var(--color-success)', text: '#050505' },
		uploading:     { bg: 'var(--color-success)', text: '#050505' },
		pausedDL:      { bg: 'var(--color-accent-yellow)', text: '#050505' },
		pausedUP:      { bg: 'var(--color-accent-yellow)', text: '#050505' },
		error:         { bg: 'var(--color-danger)', text: '#fff' },
		missingFiles:  { bg: 'var(--color-danger)', text: '#fff' },
		queuedUP:      { bg: 'var(--color-text-info)', text: '#050505' },
		queuedDL:      { bg: 'var(--color-text-info)', text: '#050505' },
		stalledUP:     { bg: 'var(--color-success)', text: '#050505' },
		stalledDL:     { bg: 'var(--color-accent-blue)', text: '#050505' },
		forcedUP:      { bg: 'var(--color-accent-blue)', text: '#050505' },
		metaDL:        { bg: 'var(--color-text-info)', text: '#050505' },
		forcedDL:      { bg: 'var(--color-accent-blue)', text: '#050505' },
		allocating:    { bg: 'var(--color-text-info)', text: '#050505' },
		moving:        { bg: 'var(--color-text-info)', text: '#050505' },
	};

	function getStateColor(state: string): { bg: string; text: string } {
		return statePalette[state] ?? { bg: 'var(--color-border-medium)', text: '#fff' };
	}

	function getStateText(state: string): string {
		const labels: Record<string, string> = {
			downloading: 'downloading',
			seeding: 'seeding',
			uploading: 'uploading',
			pausedDL: 'paused',
			pausedUP: 'paused',
			error: 'error',
			missingFiles: 'missing files',
			queuedUP: 'queued',
			queuedDL: 'queued',
			stalledUP: 'stalled',
			stalledDL: 'stalled',
			metaDL: 'metadata',
			forcedDL: 'forced',
			forcedUP: 'forced',
			allocating: 'allocating',
			moving: 'moving',
		};
		return labels[state] ?? state;
	}

	function formatBytes(bytes: number): string {
		if (!bytes || bytes === 0) return '0 b';
		const units = ['b', 'kb', 'mb', 'gb', 'tb'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
	}

	function formatETA(seconds: number): string {
		if (seconds === 8640000 || seconds < 0) return '∞';
		if (seconds < 60) return `${Math.ceil(seconds)}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}

	async function togglePause() {
		const isPaused = torrent.state.includes('paused');
		if (isPaused) {
			await doResumeTorrent(torrent.hash);
		} else {
			await doPauseTorrent(torrent.hash);
		}
	}

	async function recheck() {
		await doForceRecheck(torrent.hash);
	}

	async function deleteTorrent(deleteFiles = false) {
		await doDeleteTorrent(torrent.hash, deleteFiles);
	}

	let progressPct = $derived(Math.round((torrent.progress ?? 0) * 100));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="border p-4 relative transition-colors duration-150 hover:border-border-medium cursor-default"
	style="background: var(--color-surface-card); border-color: var(--color-border-subtle); border-radius: 10px;"
	onmouseenter={() => showActions = true}
	onmouseleave={() => showActions = false}
>
	<!-- header -->
	<div class="flex items-start justify-between gap-3 mb-3">
		<h3 class="text-sm leading-tight line-clamp-2 pr-20">{torrent.name}</h3>
		<span
			class="px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
			style="border-radius: 9999px; background: {getStateColor(torrent.state).bg}; color: {getStateColor(torrent.state).text};"
		>
			{getStateText(torrent.state)}
		</span>
	</div>

	<!-- progress bar -->
	<div class="mb-3">
		<div class="w-full border" style="border-color: var(--color-border-subtle); border-radius: 9999px; height: 6px; background: var(--color-bg-dark);">
			<div
				class="transition-all duration-300"
				style="height: 100%; width: {progressPct}%; background: {getStateColor(torrent.state).bg}; border-radius: 9999px;"
			></div>
		</div>
	</div>

	<!-- stats row + hover actions aligned under the status pill -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs" style="font-variant-numeric: tabular-nums;">
			<span>{formatBytes(torrent.downloaded)} / {formatBytes(torrent.size)}</span>
			{#if torrent.dlspeed > 0}
				<span style="color: var(--color-accent-blue);">↓ {formatBytes(torrent.dlspeed)}/s</span>
			{/if}
			{#if torrent.upspeed > 0}
				<span style="color: var(--color-success);">↑ {formatBytes(torrent.upspeed)}/s</span>
			{/if}
			<span>eta: {formatETA(torrent.eta)}</span>
			<span>ratio: {(torrent.ratio ?? 0).toFixed(2)}</span>
			{#if torrent.num_seeds !== undefined}
				<span style="color: var(--color-success);">s: {torrent.num_seeds}</span>
			{/if}
			{#if torrent.num_leechs !== undefined}
				<span style="color: var(--color-danger);">l: {torrent.num_leechs}</span>
			{/if}
		</div>

		{#if showActions}
			<div class="flex gap-1 mt-1">
				<button
					onclick={togglePause}
					class="p-2 text-xs border transition-all duration-150 active:scale-[0.98]"
					style="background: var(--color-bg-dark); border-color: var(--color-border-medium); border-radius: 6px; color: var(--color-text-primary);"
					aria-label={torrent.state.includes('paused') ? 'resume' : 'pause'}
				>
					{torrent.state.includes('paused') ? '▶' : '⏸'}
				</button>
				<button
					onclick={recheck}
					class="p-2 text-xs border transition-all duration-150 active:scale-[0.98]"
					style="background: var(--color-bg-dark); border-color: var(--color-border-medium); border-radius: 6px; color: var(--color-text-primary);"
					aria-label="recheck"
				>
					↻
				</button>
				<button
					onclick={() => deleteTorrent(false)}
					class="p-2 text-xs border transition-all duration-150 active:scale-[0.98]"
					style="background: var(--color-bg-dark); border-color: var(--color-danger); border-radius: 6px; color: var(--color-danger);"
					aria-label="delete"
				>
					✕
				</button>
			</div>
		{/if}
	</div>
</div>
