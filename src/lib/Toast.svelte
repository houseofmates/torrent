<script lang="ts">
	import { toasts, type Toast } from './stores';

	function toastColor(type: Toast['type']): string {
		switch (type) {
			case 'error': return 'var(--color-danger)';
			case 'success': return 'var(--color-accent-yellow)';
			default: return 'var(--color-accent-blue)';
		}
	}
</script>

{#if $toasts.length}
	<div class="fixed bottom-6 right-6 z-1000 flex flex-col gap-2" style="max-width: 320px;">
		{#each $toasts as toast (toast.id)}
			<div
				class="px-4 py-3 text-sm text-white border-l-2 shadow-lg"
				style="background: var(--color-surface-card); border-color: {toastColor(toast.type)}; border-radius: 0 8px 8px 0; animation: slideIn 200ms ease-out;"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes slideIn {
		from { opacity: 0; transform: translateX(16px); }
		to { opacity: 1; transform: translateX(0); }
	}
</style>