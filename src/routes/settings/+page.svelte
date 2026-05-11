<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated, doLogout } from '$lib/stores';
	import { searchPlugins } from '$lib/stores';
	import type { SearchPlugin } from '$lib/types';
	import { get } from 'svelte/store';

	let loading = $state(true);
	let error = $state<string | null>(null);

	let plugins = $state<SearchPlugin[]>([]);
	let saving = $state(false);

	async function load() {
		loading = true;
		error = null;
		try {
			// Plugins endpoint may be 403 depending on session; handle gracefully.
			const res = await fetch('/api/v2/search/plugins', { credentials: 'include' });
			if (!res.ok) {
				throw new Error(`failed to load plugins: ${res.status} ${res.statusText}`);
			}
			plugins = (await res.json()) as SearchPlugin[];
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed to load settings';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void load();
	});

	function reconnect() {
		// Force a full reload so the existing auth/session cookies get established correctly.
		// (qBittorrent 403 indicates cookie auth is not ready.)
		window.location.href = '/';
	}
</script>

<div class="px-4 sm:px-6 py-4 pb-24 sm:pb-6" style="max-width: 1200px; margin: 0 auto;">
	<h1 class="text-lg font-bold mb-4" style="color: var(--color-accent-yellow);">settings</h1>

	<div class="mb-4 flex gap-3 items-center flex-wrap">
		{#if $isAuthenticated}
			<p class="text-xs" style="color: var(--color-success);">authenticated</p>
			<button
				onclick={() => { doLogout(); reconnect(); }}
				class="px-3 py-2 text-xs border rounded-md active:scale-[0.98]"
				style="border-color: var(--color-border-medium); color: var(--color-text-info);"
			>
				disconnect
			</button>
		{:else}
			<p class="text-xs" style="color: var(--color-accent-yellow);">not authenticated</p>
			<button
				onclick={reconnect}
				class="px-3 py-2 text-xs border rounded-md active:scale-[0.98]"
				style="border-color: var(--color-border-medium); color: var(--color-text-info);"
			>
				reconnect
			</button>
		{/if}
	</div>

	<div class="border rounded-lg p-4" style="border-color: var(--color-border-subtle); background: var(--color-surface-card);">
		<p class="text-sm font-semibold mb-2">Search providers</p>

		{#if loading}
			<p class="text-xs" style="color: var(--color-text-info);">loading…</p>
		{:else if error}
			<p class="text-xs" style="color: var(--color-danger);">{error}</p>
			<p class="text-[11px] mt-2" style="color: var(--color-text-info);">
				If you see 403, your auth cookies for the qBittorrent API aren’t being sent/accepted yet.
				Use “reconnect” and try again.
			</p>
		{:else}
			{#if plugins.length === 0}
				<p class="text-xs" style="color: var(--color-text-info);">no providers found</p>
			{:else}
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{#each plugins as p (p.name)}
						<div class="border rounded-md p-3" style="border-color: var(--color-border-subtle);">
							<div class="text-sm font-bold" style="color: var(--color-text-primary);">{p.name}</div>
							<div class="text-[11px] mt-1" style="color: var(--color-text-info);">
								version: {p.version}
							</div>
							<div class="text-[11px] mt-2" style="color: var(--color-text-info);">
								categories: {p.supported_categories?.join(', ') || '—'}
							</div>
						</div>
					{/each}
				</div>
				<p class="text-[11px] mt-3" style="color: var(--color-text-info);">
					Provider enable/disable UI requires authenticated access to qBittorrent preferences; currently this page loads plugins read-only.
				</p>
			{/if}
		{/if}
	</div>
</div>
