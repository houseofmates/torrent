<script lang="ts">
	import { onMount } from 'svelte';

	export interface ContextMenuItem {
		label: string;
		action: () => void;
		danger?: boolean;
		disabled?: boolean;
		separator?: boolean;
	}

	interface Props {
		items: ContextMenuItem[];
		x: number;
		y: number;
		onclose: () => void;
	}

	let { items, x, y, onclose }: Props = $props();

	function handleClick(action: () => void) {
		onclose();
		action();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function handleOutsideClick(e: MouseEvent) {
		onclose();
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('click', handleOutsideClick);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('click', handleOutsideClick);
		};
	});

	// Adjust position to keep menu in viewport
	let adjustedX = $derived(x + 200 > window.innerWidth ? window.innerWidth - 200 : x);
	let adjustedY = $derived(y + items.length * 40 > window.innerHeight ? window.innerHeight - (items.length * 40) : y);
</script>

<div
		class="fixed z-[1000] border py-1"
		style="left: {adjustedX}px; top: {adjustedY}px; background: var(--color-bg-dark); border-color: var(--color-border-medium); border-radius: 8px; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
		onclick={(e) => e.stopPropagation()}
		oncontextmenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
		role="menu"
		tabindex="-1"
	>
	{#each items as item}
		{#if item.separator}
			<div class="px-4 py-1" style="border-bottom: 1px solid var(--color-border-subtle);"></div>
		{:else if item.disabled}
			<div class="px-4 py-2 text-xs cursor-not-allowed" style="color: var(--color-border-medium);">
				{item.label}
			</div>
		{:else}
			<button
				class="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[var(--color-surface-card)]"
				style="color: {item.danger ? 'var(--color-danger)' : 'var(--color-text-primary)'};"
				onclick={() => handleClick(item.action)}
			>
				{item.label}
			</button>
		{/if}
	{/each}
</div>