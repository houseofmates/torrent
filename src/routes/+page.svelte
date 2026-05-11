<script lang="ts">
	import { isAuthenticated } from '$lib/stores';
	import Login from '$lib/Login.svelte';
	import Dashboard from '$lib/Dashboard.svelte';
	import { onMount } from 'svelte';

	onMount(async () => {
		try {
			const res = await fetch('/api/sync/maindata');
			if (res.ok) {
				isAuthenticated.set(true);
			}
		} catch {
			// not authenticated
		}
	});
</script>

{#if $isAuthenticated}
	<Dashboard />
{:else}
	<Login />
{/if}