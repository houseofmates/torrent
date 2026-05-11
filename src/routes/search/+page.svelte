<script lang="ts">
	import {
		doSearchStart,
		doSearchResults,
		doSearchStop,
		doAddTorrent,
		searchPlugins,
		addToast
	} from '$lib/stores';
	import type { SearchResult } from '$lib/types';

	let query = $state('');
	let selectedPlugin = $state('all');
	let results = $state<SearchResult[]>([]);
	let searchStatus = $state<'idle' | 'searching' | 'done'>('idle');
	let searchId = $state<number | null>(null);
	let totalResults = $state(0);
	let downloading = $state<Record<string, boolean>>({});

	let $searchPlugins = $state($searchPlugins);
	let plugins = $derived($searchPlugins || []);

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function startSearch() {
		if (!query.trim() || searchStatus === 'searching') return;

		if (searchId !== null) {
			await doSearchStop(searchId);
		}

		searchStatus = 'searching';
		results = [];
		totalResults = 0;

		try {
			const id = await doSearchStart(query.trim(), selectedPlugin);
			searchId = id;
			pollResults(id);
		} catch {
			searchStatus = 'idle';
		}
	}

	async function pollResults(id: number) {
		const poll = async () => {
			try {
				const data = await doSearchResults(id);
				results = data.results || [];
				totalResults = data.total || 0;

				if (data.status === 'Stopped') {
					searchStatus = 'done';
					searchId = null;
					return;
				}

				// continue polling
				setTimeout(poll, 1000);
			} catch {
				searchStatus = 'idle';
				searchId = null;
			}
		};

		setTimeout(poll, 1000);
	}

	function onInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			startSearch();
		}, 400);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (debounceTimer) clearTimeout(debounceTimer);
			startSearch();
		}
	}

	async function download(result: SearchResult) {
		if (!result.fileUrl && !result.descrLink) return;
		const key = result.fileName;
		downloading = { ...downloading, [key]: true };

		try {
			const url = result.fileUrl || result.descrLink || '';
			await doAddTorrent(url);
			downloading = { ...downloading, [key]: false };
		} catch {
			downloading = { ...downloading, [key]: false };
		}
	}

	function formatSize(bytes: number): string {
		if (!bytes || bytes === 0) return '0 b';
		const units = ['b', 'kb', 'mb', 'gb', 'tb'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
	}

	function stopSearch() {
		if (searchId !== null) {
			doSearchStop(searchId);
			searchStatus = 'done';
			searchId = null;
		}
	}
</script>

<div class="px-4 sm:px-6 py-4" style="max-width: 1200px; margin: 0 auto;">
	<!-- search bar -->
	<div class="flex flex-col sm:flex-row gap-3 mb-6">
		<div class="flex-1">
			<input
				type="text"
				bind:value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				class="w-full px-4 py-3 border text-sm"
				style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 8px; color: var(--color-text-primary);"
				placeholder="search for torrents..."
				aria-label="search torrents"
			/>
		</div>
		<div class="flex gap-2">
			{#if plugins.length > 0}
				<select
					bind:value={selectedPlugin}
					class="px-3 py-3 border text-sm"
					style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 8px; color: var(--color-text-primary);"
					onchange={startSearch}
				>
					<option value="all">all</option>
					{#each plugins as plugin}
						<option value={plugin.name}>{plugin.name}</option>
					{/each}
				</select>
			{/if}
			<button
				onclick={startSearch}
				disabled={searchStatus === 'searching' || !query.trim()}
				class="px-4 py-3 text-sm font-bold border disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
				style="background: var(--color-accent-blue); border-color: var(--color-accent-blue); border-radius: 8px; color: #050505;"
			>
				{searchStatus === 'searching' ? 'searching...' : 'search'}
			</button>
		</div>
	</div>

	<!-- status bar -->
	{#if searchStatus === 'searching'}
		<div class="flex items-center justify-between mb-4">
			<p class="text-sm" style="color: var(--color-accent-blue);">searching...</p>
			<button
				onclick={stopSearch}
				class="px-3 py-1 text-xs border transition-all duration-150 active:scale-[0.98]"
				style="border-color: var(--color-border-medium); border-radius: 6px; color: var(--color-text-info);"
			>stop</button>
		</div>
	{/if}
	{#if searchStatus === 'done'}
		<p class="text-sm mb-4" style="color: var(--color-text-info);">{totalResults} results found</p>
	{/if}

	<!-- loading skeleton -->
	{#if searchStatus === 'searching' && results.length === 0}
		<div class="flex flex-col gap-3">
			{#each Array(5) as _}
				<div class="border p-4" style="border-color: var(--color-border-subtle); background: var(--color-surface-card); border-radius: 10px;">
					<div class="animate-shimmer w-3/4 mb-3" style="background: var(--color-border-subtle); height: 14px; border-radius: 4px;"></div>
					<div class="flex gap-4">
						<div class="animate-shimmer w-16" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
						<div class="animate-shimmer w-20" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
						<div class="animate-shimmer w-24" style="background: var(--color-border-subtle); height: 12px; border-radius: 4px;"></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- results -->
	{#if results.length > 0}
		<div class="flex flex-col gap-3" role="list">
			{#each results as result (result.fileName)}
				<div role="listitem" class="border p-4 transition-colors duration-150" style="border-color: var(--color-border-subtle); background: var(--color-surface-card); border-radius: 10px;">
					<div class="flex items-start justify-between gap-3">
						<div class="flex-1 min-w-0">
							<h3 class="text-sm leading-tight mb-2 line-clamp-2">{result.fileName}</h3>
							<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs" style="font-variant-numeric: tabular-nums;">
								<span style="color: var(--color-success);">seeds: {result.nbSeeders}</span>
								<span style="color: var(--color-danger);">leeches: {result.nbLeechers}</span>
								<span>size: {formatSize(result.fileSize)}</span>
								<span style="color: var(--color-text-info);">{result.siteUrl}</span>
							</div>
						</div>
						<button
							onclick={() => download(result)}
							disabled={downloading[result.fileName]}
							class="px-3 py-2 text-xs font-bold border whitespace-nowrap disabled:opacity-40 transition-all duration-150 active:scale-[0.98] flex-shrink-0"
							style="border-color: var(--color-accent-blue); color: {downloading[result.fileName] ? 'var(--color-text-info)' : 'var(--color-accent-blue)'}; border-radius: 6px; background: {downloading[result.fileName] ? 'transparent' : 'var(--color-accent-blue)'};"
						>
							{downloading[result.fileName] ? 'adding...' : 'download'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- empty state -->
	{#if searchStatus === 'idle' && results.length === 0}
		<div class="text-center py-16">
			<p class="text-sm mb-1" style="color: var(--color-accent-yellow);">search for torrents</p>
			<p class="text-xs" style="color: var(--color-text-info);">type above to search across all enabled plugins.</p>
		</div>
	{/if}
	{#if searchStatus === 'done' && results.length === 0}
		<div class="text-center py-16">
			<p class="text-sm mb-1" style="color: var(--color-accent-yellow);">no results</p>
			<p class="text-xs" style="color: var(--color-text-info);">try a different query or plugin.</p>
		</div>
	{/if}
</div>
