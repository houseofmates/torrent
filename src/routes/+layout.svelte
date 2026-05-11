<script lang="ts">
	import '$lib/base.css';
	import Toast from '$lib/Toast.svelte';
	import { page } from '$app/state';
	import { isAuthenticated, doLogout } from '$lib/stores';

	let { children } = $props();

	let navItems = [
		{ href: '/', label: 'torrents', icon: '◉' },
		{ href: '/search', label: 'search', icon: '◎' }
	];
</script>

<div class="min-h-[100dvh]" style="background: var(--color-bg-primary);">
	<!-- top nav -->
	<nav class="flex items-center justify-between px-6 py-3 border-b" style="border-color: var(--color-border-subtle); background: var(--color-bg-dark);">
		<div class="flex items-center gap-4">
			<a href="/" class="text-lg tracking-wide no-underline" style="color: var(--color-accent-yellow);" aria-label="home">torrent</a>
			<div class="flex gap-1">
				{#each navItems as item}
					<a
						href={item.href}
						class="px-3 py-1.5 text-sm rounded-md transition-all duration-150 active:scale-[0.98] no-underline"
						style="color: {page.url.pathname === item.href ? 'var(--color-accent-yellow)' : 'var(--color-text-info)'}; background: {page.url.pathname === item.href ? 'var(--color-surface-card)' : 'transparent'};"
					>{item.label}</a>
				{/each}
			</div>
		</div>
		{#if $isAuthenticated}
			<button
				onclick={() => doLogout()}
				class="px-3 py-1.5 text-sm border rounded-md transition-all duration-150 active:scale-[0.98]"
				style="border-color: var(--color-border-medium); color: var(--color-text-info);"
				aria-label="disconnect"
			>disconnect</button>
		{/if}
	</nav>

	{@render children()}
	<Toast />
</div>
