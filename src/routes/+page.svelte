<script lang="ts">
	import { isAuthenticated, doLogout } from '$lib/stores';
	import Login from '$lib/Login.svelte';
	import Dashboard from '$lib/Dashboard.svelte';
	import { onMount } from 'svelte';

	let checking = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/v2/sync/maindata');
			if (res.ok) {
				isAuthenticated.set(true);
			} else if (res.status === 403) {
				doLogout();
			}
		} catch {
			// not authenticated
		} finally {
			checking = false;
		}
	});
</script>

{#if checking}
	<div class="min-h-[100dvh] flex items-center justify-center" style="background: var(--color-bg-primary);">
		<div class="animate-shimmer w-32 h-4 rounded" style="background: var(--color-border-subtle);"></div>
	</div>
{:else if $isAuthenticated}
	<Dashboard />
{:else}
	<Login />
{/if}
