<script lang="ts">
	import type { Torrent } from './types';
	import { addToast } from './stores';

	interface Props {
		torrent: Torrent;
	}

	let { torrent }: Props = $props();
	let showActions = $state(false);

	const statePalette: Record<string, { bg: string; text: string }> = {
		downloading: { bg: 'var(--color-accent-blue)', text: '#fff' },
		seeding:     { bg: '#22c55e', text: '#fff' },
		uploading:   { bg: '#22c55e', text: '#fff' },
		pausedDL:    { bg: 'var(--color-accent-yellow)', text: '#000' },
		pausedUP:    { bg: 'var(--color-accent-yellow)', text: '#000' },
		error:       { bg: 'var(--color-danger)', text: '#fff' },
		missingFiles:{ bg: 'var(--color-danger)', text: '#fff' },
		queuedUP:    { bg: 'var(--color-text-info)', text: '#000' },
		queuedDL:    { bg: 'var(--color-text-info)', text: '#000' },
		stalledUP:   { bg: '#22c55e', text: '#fff' },
		stalledDL:   { bg: 'var(--color-accent-blue)', text: '#fff' },
		forcedUP:    { bg: 'var(--color-accent-blue)', text: '#fff' },
	};

	function getStateColor(state: string): { bg: string; text: string } {
		return statePalette[state] ?? { bg: 'var(--color-border-medium)', text: '#fff' };
	}

	function getStateText(state: string): string {
		const labels: Record<string, string> = {
			downloading: 'downloading', seeding: 'seeding', uploading: 'uploading',
			pausedDL: 'paused', pausedUP: 'paused', error: 'error',
			missingFiles: 'missing files', queuedUP: 'queued', queuedDL: 'queued',
			stalledUP: 'stalled', stalledDL: 'stalled',
		};
		return labels[state] ?? state;
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 b';
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

	async function api(action: string, hashes: string, extra?: Record<string, string>) {
		try {
			const params = new URLSearchParams({ hashes, ...extra });
			const res = await fetch(`/api/torrents/${action}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params
			});
			if (!res.ok) throw new Error(`http ${res.status}`);
			return true;
		} catch (err) {
			addToast(`${action} failed.`, 'error');
			return false;
		}
	}

	async function togglePause() {
		const isPaused = torrent.state.includes('paused');
		const ok = await api(isPaused ? 'resume' : 'pause', torrent.hash);
		if (ok) addToast(isPaused ? 'resumed' : 'paused', 'success');
	}

	async function forceRecheck() {
		const ok = await api('recheck', torrent.hash);
		if (ok) addToast('recheck started', 'success');
	}

	async function deleteTorrent(deleteFiles = false) {
		const ok = await api('delete', torrent.hash, { deleteFiles: String(deleteFiles) });
		if (ok) addToast('deleted', 'success');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="border border-border-subtle p-4 relative transition-colors duration-150 hover:border-border-medium"
	style="background: var(--color-surface-card); border-radius: 10px;"
	onmouseenter={() => showActions = true}
	onmouseleave={() => showActions = false}
>
	<!-- header -->
	<div class="flex items-start justify-between gap-3 mb-3">
		<h3 class="text-sm leading-tight text-white line-clamp-2 pr-16">{torrent.name}</h3>
		<span
			class="px-2 py-0.5 text-[10px] whitespace-nowrap"
			style="border-radius: 9999px; background: {getStateColor(torrent.state).bg}; color: {getStateColor(torrent.state).text};"
		>
			{getStateText(torrent.state)}
		</span>
	</div>

	<!-- progress bar -->
	<div class="mb-2">
		<div class="w-full border border-border-subtle" style="border-radius: 9999px; height: 6px; background: var(--color-bg-dark);">
			<div
				class="transition-all duration-300"
				style="height: 100%; width: {Math.round(torrent.progress * 100)}%; background: {getStateColor(torrent.state).bg}; border-radius: 9999px;"
			></div>
		</div>
	</div>

	<!-- stats row -->
	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs" style="font-variant-numeric: tabular-nums;">
		<span class="text-white">{formatBytes(torrent.downloaded)} / {formatBytes(torrent.size)}</span>
		<span class="text-white">↓ {formatBytes(torrent.dlspeed)}/s</span>
		<span class="text-white">↑ {formatBytes(torrent.upspeed)}/s</span>
		<span>eta: <span class="text-white">{formatETA(torrent.eta)}</span></span>
		<span>ratio: <span class="text-white">{torrent.ratio.toFixed(2)}</span></span>
	</div>

	<!-- hover actions -->
	{#if showActions}
		<div class="absolute top-2 right-2 flex gap-1">
			<button
				onclick={togglePause}
				class="p-1.5 text-[11px] transition-all duration-150 active:scale-95 border"
				style="background: var(--color-bg-dark); border-color: var(--color-border-medium); border-radius: 6px; color: #fff;"
				aria-label={torrent.state.includes('paused') ? 'resume' : 'pause'}
			>
				{torrent.state.includes('paused') ? '▶' : '⏸'}
			</button>
			<button
				onclick={forceRecheck}
				class="p-1.5 text-[11px] transition-all duration-150 active:scale-95 border"
				style="background: var(--color-bg-dark); border-color: var(--color-border-medium); border-radius: 6px; color: #fff;"
				aria-label="recheck"
			>
				↻
			</button>
			<button
				onclick={() => deleteTorrent(false)}
				class="p-1.5 text-[11px] transition-all duration-150 active:scale-95 border"
				style="background: var(--color-bg-dark); border-color: var(--color-danger); border-radius: 6px; color: var(--color-danger);"
				aria-label="delete"
			>
				✕
			</button>
		</div>
	{/if}
</div>