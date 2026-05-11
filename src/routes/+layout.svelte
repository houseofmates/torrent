<script lang="ts">
	import '$lib/base.css';
	import Toast from '$lib/Toast.svelte';

	let { children } = $props();
</script>

{@render children()}
<Toast />