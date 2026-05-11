<script lang="ts">
	import { addToast } from './stores';

	interface Props {
		open: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	let input = $state('');
	let savePath = $state('');
	let loading = $state(false);
	let error = $state('');

	function dismiss() {
		open = false;
		onclose?.();
	}

	async function addTorrent() {
		const trimmed = input.trim();
		if (!trimmed) return;
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			if (trimmed.startsWith('magnet:') || trimmed.startsWith('http')) {
				params.set('urls', trimmed);
			}
			if (savePath) params.set('savepath', savePath);
			if (!params.has('urls') && !params.has('torrents')) {
				error = 'must be a magnet link or url.';
				loading = false;
				return;
			}

			const res = await fetch('/api/torrents/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params
			});

			if (res.ok) {
				addToast('torrent added', 'success');
				input = '';
				savePath = '';
				dismiss();
			} else {
				const text = await res.text();
				error = text || 'failed to add torrent.';
			}
		} catch {
			error = 'connection failed.';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dismiss();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<!-- backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<button
		class="fixed inset-0 z-40 cursor-default"
		style="background: rgba(0,0,0,0.7);"
		onclick={dismiss}
		aria-label="close modal"
	></button>
	<!-- panel -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="pointer-events: none;">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-lg p-6 border border-border-medium"
			style="background: var(--color-surface-card); border-radius: 12px; pointer-events: auto; animation: modalIn 200ms ease-out;"
		>
			<h2 class="text-lg mb-4" style="color: var(--color-accent-yellow);">add torrent</h2>

			<label for="torrent-input" class="block text-sm mb-1 text-white">magnet link or url</label>
			<textarea
				id="torrent-input"
				bind:value={input}
				rows="3"
				class="w-full p-3 border border-border-medium text-sm mb-4 resize-none"
				style="background: var(--color-surface-input); border-radius: 8px;"
				placeholder="magnet:?xt=urn:btih:..."
			></textarea>

			<label for="save-path" class="block text-sm mb-1 text-white">save to (optional)</label>
			<input
				id="save-path"
				type="text"
				bind:value={savePath}
				class="w-full p-3 border border-border-medium text-sm mb-4"
				style="background: var(--color-surface-input); border-radius: 8px;"
			/>

			{#if error}
				<p class="text-sm mb-4" style="color: var(--color-danger);">{error}</p>
			{/if}

			<div class="flex justify-end gap-3">
				<button
					onclick={dismiss}
					class="px-4 py-2 text-sm border border-border-medium transition-all duration-150 active:scale-95"
					style="border-radius: 8px; color: #fff;"
				>cancel</button>
				<button
					onclick={addTorrent}
					disabled={loading || !input.trim()}
					class="px-4 py-2 text-sm font-bold disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
					style="background: var(--color-accent-blue); border-radius: 8px; color: #fff;"
				>
					{loading ? 'adding...' : 'add'}
				</button>
			</div>
		</div>
	</div>

	<style>
		@keyframes modalIn {
			from { opacity: 0; transform: translateY(-8px) scale(0.98); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
	</style>
{/if}