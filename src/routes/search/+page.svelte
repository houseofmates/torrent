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
	let selectedCategory = $state('all');
	let results = $state<SearchResult[]>([]);
	let searchStatus = $state<'idle' | 'searching' | 'done'>('idle');
	let searchId = $state<number | null>(null);
	let totalResults = $state(0);
	let downloading = $state<Record<string, boolean>>({});
	let sortField = $state<'seeds' | 'size' | 'name'>('seeds');
	let sortReverse = $state(true);

	let plugins = $derived($searchPlugins || []);
	let pluginCategories = $derived.by(() => {
		const cats = new Set<string>();
		($searchPlugins || []).forEach((p) => {
			(p.supported_categories || []).forEach((c) => cats.add(c));
		});
		return ['all', ...Array.from(cats)];
	});

	let sortedResults = $derived.by(() => {
		const sorted = [...results];
		sorted.sort((a, b) => {
			let cmp = 0;
			if (sortField === 'seeds') cmp = (a.nbSeeders || 0) - (b.nbSeeders || 0);
			else if (sortField === 'size') cmp = (a.fileSize || 0) - (b.fileSize || 0);
			else cmp = (a.fileName || '').localeCompare(b.fileName || '');
			return sortReverse ? -cmp : cmp;
		});
		return sorted;
	});

	let pollTimeout: ReturnType<typeof setTimeout> | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function startSearch() {
		if (!query.trim()) return;
		if (debounceTimer) clearTimeout(debounceTimer);

		if (searchId !== null) {
			await doSearchStop(searchId);
			if (pollTimeout) clearTimeout(pollTimeout);
		}

		searchStatus = 'searching';
		results = [];
		totalResults = 0;

		try {
			const id = await doSearchStart(query.trim(), selectedPlugin, selectedCategory);
			searchId = id;
			pollResults(id);
		} catch {
			searchStatus = 'idle';
		}
	}

	function pollResults(id: number) {
		if (pollTimeout) clearTimeout(pollTimeout);
		pollTimeout = setTimeout(async () => {
			try {
				const data = await doSearchResults(id);
				results = data.results || [];
				totalResults = data.total || 0;

				if (data.status === 'Stopped') {
					searchStatus = 'done';
					searchId = null;
					pollTimeout = null;
					return;
				}

				pollResults(id);
			} catch {
				searchStatus = 'idle';
				searchId = null;
				pollTimeout = null;
			}
		}, 1000);
	}

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (query.trim()) startSearch();
		}, 400);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (debounceTimer) clearTimeout(debounceTimer);
			startSearch();
		}
	}

	async function download(result: SearchResult) {
		const url = result.fileUrl || result.descrLink;
		if (!url) return;
		const key = result.fileName;
		downloading = { ...downloading, [key]: true };

		try {
			await doAddTorrent(url);
		} catch {
			// toast shown by store
		} finally {
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
			if (pollTimeout) clearTimeout(pollTimeout);
			searchStatus = 'done';
			searchId = null;
		}
	}

	function toggleSort(field: 'seeds' | 'size' | 'name') {
		if (sortField === field) {
			sortReverse = !sortReverse;
		} else {
			sortField = field;
			sortReverse = field === 'seeds';
		}
	}
</script>

<div class="px-4 sm:px-6 py-4 pb-24 sm:pb-6" style="max-width: 1200px; margin: 0 auto;">
	<!-- search bar -->
	<div class="mb-4">
		<input
			type="text"
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class="w-full px-4 py-3 border text-sm"
			style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 8px; color: var(--color-text-primary);"
			placeholder="search for torrents..."
			aria-label="search torrents"
		/>
	</div>

	<!-- filter row -->
	<div class="flex flex-wrap gap-2 mb-4">
		{#if plugins.length > 0}
			<select
				bind:value={selectedPlugin}
				class="px-3 py-2 border text-xs"
				style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 6px; color: var(--color-text-primary);"
				onchange={() => { if (query.trim()) startSearch(); }}
			>
				<option value="all">all plugins</option>
				{#each plugins as plugin}
					<option value={plugin.name}>{plugin.name}</option>
				{/each}
			</select>
		{/if}

		{#if pluginCategories.length > 1}
			<select
				bind:value={selectedCategory}
				class="px-3 py-2 border text-xs"
				style="background: var(--color-surface-input); border-color: var(--color-border-subtle); border-radius: 6px; color: var(--color-text-primary);"
				onchange={() => { if (query.trim()) startSearch(); }}
			>
				{#each pluginCategories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		{/if}

		<div class="flex gap-1 ml-auto">
			{#each ['seeds', 'size', 'name'] as field}
				<button
					class="px-3 py-2 text-xs border transition-all duration-150 active:scale-[0.98]"
					style="background: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-surface-input)'}; border-color: {sortField === field ? 'var(--color-accent-blue)' : 'var(--color-border-subtle)'}; border-radius: 6px; color: {sortField === field ? '#050505' : 'var(--color-text-primary)'};"
					onclick={() => toggleSort(field as 'seeds' | 'size' | 'name')}
				>
					{field}{sortField === field ? (sortReverse ? ' ↓' : ' ↑') : ''}
				</button>
			{/each}
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
	{#if sortedResults.length > 0}
		<div class="flex flex-col gap-3" role="list">
			{#each sortedResults as result (result.fileName + result.fileSize + result.siteUrl)}
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
							style="background: {downloading[result.fileName] ? 'transparent' : 'var(--color-accent-blue)'}; border-color: var(--color-accent-blue); border-radius: 6px; color: {downloading[result.fileName] ? 'var(--color-text-info)' : '#050505'};"
						>
							{downloading[result.fileName] ? 'adding...' : 'download'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- empty states -->
	{#if searchStatus === 'idle' && results.length === 0}
		<div class="text-center py-16">
			<p class="text-sm mb-1" style="color: var(--color-accent-yellow);">search for torrents</p>
			<p class="text-xs" style="color: var(--color-text-info);">type above to search across all enabled plugins.</p>
		</div>
	{/if}
	{#if searchStatus === 'done' && sortedResults.length === 0}
		<div class="text-center py-16">
			<p class="text-sm mb-1" style="color: var(--color-accent-yellow);">no results</p>
			<p class="text-xs" style="color: var(--color-text-info);">try a different query or plugin.</p>
		</div>
	{/if}
</div>