<script lang="ts">
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

	let adjustedX = $derived(x + 200 > window.innerWidth ? window.innerWidth - 200 : x);
	let adjustedY = $derived(y + items.length * 40 > window.innerHeight ? window.innerHeight - (items.length * 40) : y);

	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
		}
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	$effect(() => {
		function handleClickOutside(e: MouseEvent) {
			onclose();
		}
		window.addEventListener('click', handleClickOutside);
		return () => window.removeEventListener('click', handleClickOutside);
	});
</script>

<div
	class="fixed z-[100] border py-1"
	style="left: {adjustedX}px; top: {adjustedY}px; background: var(--color-bg-dark); border-color: var(--color-border-medium); border-radius: 8px; min-width: 180px;"
	onclick={(e) => e.stopPropagation()}
	oncontextmenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
	role="menu"
	tabindex="-1"
>
	{#each items as item}
		{#if item.separator}
			<div class="px-4 py-1" style="border-bottom: 1px solid var(--color-border-subtle);"></div>
		{:else if item.disabled}
			<div class="px-4 py-2 text-xs" style="color: var(--color-border-medium); cursor: not-allowed;">
				{item.label}
			</div>
		{:else}
			<button
				class="w-full text-left px-4 py-2 text-xs transition-colors active:scale-[0.98]"
				style="color: {item.danger ? 'var(--color-danger)' : 'var(--color-text-primary)'}; background: transparent;"
				onclick={() => handleClick(item.action)}
			>
				{item.label}
			</button>
		{/if}
	{/each}
</div>