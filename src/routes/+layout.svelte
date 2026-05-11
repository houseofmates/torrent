<script lang="ts">
	import '$lib/base.css';
	import Toast from '$lib/Toast.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { isAuthenticated, doLogout } from '$lib/stores';

	let { children } = $props();

	let navItems = [
		{ href: '/', label: 'torrents', icon: '◉' },
		{ href: '/search', label: 'search', icon: '◎' }
	];

	function navTo(href: string) {
		goto(href);
	}
</script>

<div class="min-h-[100dvh]" style="background: var(--color-bg-primary);">
	<!-- top bar: desktop only -->
	<header class="hidden sm:flex items-center justify-between px-6 py-3 border-b" style="border-color: var(--color-border-subtle); background: var(--color-bg-dark);">
		<div class="flex items-center gap-4">
			<a href="/" class="text-lg tracking-wide no-underline" style="color: var(--color-accent-yellow);" aria-label="home">torrent</a>
			<div class="flex gap-1">
				{#each navItems as item}
					<a
						href={item.href}
						onclick={(e) => {
							e.preventDefault();
							navTo(item.href);
						}}
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
	</header>

	<!-- mobile top bar: title only -->
	<header class="sm:hidden flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--color-border-subtle); background: var(--color-bg-dark);">
		<span class="text-lg tracking-wide" style="color: var(--color-accent-yellow);">torrent</span>
		{#if $isAuthenticated}
			<button
				onclick={() => doLogout()}
				class="px-3 py-1.5 text-xs border rounded-md transition-all duration-150 active:scale-[0.98]"
				style="border-color: var(--color-border-medium); color: var(--color-text-info);"
				aria-label="disconnect"
			>disconnect</button>
		{/if}
	</header>

	{@render children()}
	<Toast />

	<!-- mobile bottom nav -->
	<nav class="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t" style="background: var(--color-bg-dark); border-color: var(--color-border-subtle); padding-bottom: env(safe-area-inset-bottom, 0px);">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex-1 flex flex-col items-center justify-center py-3 gap-1 no-underline transition-colors duration-150 active:scale-[0.98]"
				style="color: {page.url.pathname === item.href ? 'var(--color-accent-yellow)' : 'var(--color-text-info)'};"
				aria-label={item.label}
			>
				<span class="text-lg">{item.icon}</span>
				<span class="text-[10px]">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>