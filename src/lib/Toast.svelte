<script lang="ts">
	import { toasts } from './stores';

	function borderColor(type: string): string {
		switch (type) {
			case 'error': return 'var(--color-danger)';
			case 'success': return 'var(--color-accent-yellow)';
			default: return 'var(--color-accent-blue)';
		}
	}

	function textColor(type: string): string {
		switch (type) {
			case 'success': return 'var(--color-accent-yellow)';
			case 'error': return 'var(--color-danger)';
			default: return 'var(--color-accent-blue)';
		}
	}
</script>

{#if $toasts.length}
	<div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-2" style="max-width: 320px;">
		{#each $toasts as toast (toast.id)}
			<div
				class="px-4 py-3 text-sm border-l-2"
				style="background: var(--color-surface-card); border-color: {borderColor(toast.type)}; border-radius: 0 8px 8px 0; color: {textColor(toast.type)}; animation: slide-in-right 200ms ease-out;"
				role="status"
				aria-live="polite"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}
