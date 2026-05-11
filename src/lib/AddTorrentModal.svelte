<script lang="ts">
	import { modal, doAddTorrent, categories, preferences, addToast } from '$lib/stores';
	import { onDestroy } from 'svelte';

	let show = $derived($modal?.type === 'add');
	let input = $state('');
	let savePath = $state('');
	let selectedCategory = $state('');
	let loading = $state(false);
	let error = $state('');
	let selectedFiles = $state<File[]>([]);
	let fileInput: HTMLInputElement | null = $state(null);

	let categoryList = $derived(Object.entries($categories || {}));

	$effect(() => {
		if (show && $preferences?.save_path) {
			savePath = $preferences.save_path;
		}
	});

	function dismiss() {
		modal.set({ type: null });
		input = '';
		savePath = '';
		selectedCategory = '';
		selectedFiles = [];
		error = '';
		loading = false;
		if (fileInput) fileInput.value = '';
	}

	async function submit() {
		const urls = input.trim();
		if (!urls && selectedFiles.length === 0) {
			error = 'enter a magnet link, url, or select a torrent file.';
			return;
		}
		loading = true;
		error = '';

		try {
			await doAddTorrent(
				urls || undefined,
				savePath || undefined,
				selectedCategory || undefined,
				selectedFiles.length > 0 ? selectedFiles : undefined
			);
			dismiss();
		} catch {
			error = 'failed to add torrent.';
		} finally {
			loading = false;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			selectedFiles = Array.from(target.files);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dismiss();
	}

	$effect(() => {
		if (show) {
			window.addEventListener('keydown', handleKeydown);
		}
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if show}
	<!-- backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40"
		style="background: var(--color-bg-dark);"
		onclick={dismiss}
		aria-label="close modal"
	></div>
	<!-- panel -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="pointer-events: none;">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-lg p-6 border"
			style="background: var(--color-surface-card); border-color: var(--color-border-medium); border-radius: 12px; pointer-events: auto; animation: modal-in 200ms ease-out;"
		>
			<h2 class="text-lg mb-4" style="color: var(--color-accent-yellow);">add torrent</h2>

			<label for="torrent-input" class="block text-sm mb-1" style="color: var(--color-text-info);">magnet link or url</label>
			<textarea
				id="torrent-input"
				bind:value={input}
				rows="3"
				class="w-full p-3 border text-sm mb-4 resize-none"
				style="background: var(--color-surface-input); border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
				placeholder="magnet:?xt=urn:btih:..."
			></textarea>

			<label for="file-input" class="block text-sm mb-1" style="color: var(--color-text-info);">or select .torrent file</label>
			<input
				id="file-input"
				type="file"
				bind:this={fileInput}
				onchange={handleFileChange}
				accept=".torrent"
				class="w-full p-3 border text-sm mb-4"
				style="background: var(--color-surface-input); border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
			/>
			{#if selectedFiles.length > 0}
				<p class="text-xs mb-4" style="color: var(--color-success);">{selectedFiles.length} file(s) selected</p>
			{/if}

			<label for="save-path" class="block text-sm mb-1" style="color: var(--color-text-info);">save to (optional)</label>
			<input
				id="save-path"
				type="text"
				bind:value={savePath}
				class="w-full p-3 border text-sm mb-4"
				style="background: var(--color-surface-input); border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
			/>

			{#if categoryList.length > 0}
				<label for="category" class="block text-sm mb-1" style="color: var(--color-text-info);">category (optional)</label>
				<select
					id="category"
					bind:value={selectedCategory}
					class="w-full p-3 border text-sm mb-4"
					style="background: var(--color-surface-input); border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
				>
					<option value="">none</option>
					{#each categoryList as [key, _]}
						<option value={key}>{key}</option>
					{/each}
				</select>
			{/if}

			{#if error}
				<p class="text-sm mb-4" style="color: var(--color-danger);">{error}</p>
			{/if}

			<div class="flex justify-end gap-3">
				<button
					onclick={dismiss}
					class="px-4 py-2 text-sm border transition-all duration-150 active:scale-[0.98]"
					style="border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
				>cancel</button>
				<button
					onclick={submit}
					disabled={loading || (!input.trim() && selectedFiles.length === 0)}
					class="px-4 py-2 text-sm font-bold disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
					style="background: var(--color-accent-blue); border-radius: 8px; color: #050505;"
				>
					{loading ? 'adding...' : 'add'}
				</button>
			</div>
		</div>
	</div>
{/if}
