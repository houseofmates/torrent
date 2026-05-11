<script lang="ts">
	import { doLogin } from '$lib/stores';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function login() {
		if (!username || !password) return;
		loading = true;
		error = '';

		const ok = await doLogin(username, password);
		if (!ok) {
			error = 'login failed. check credentials.';
		}
		loading = false;
	}
</script>

<div class="min-h-[100dvh] flex items-center justify-center p-4">
	<form onsubmit={(e) => { e.preventDefault(); login(); }} class="w-full max-w-sm">
		<div class="p-8 border" style="background: var(--color-surface-card); border-color: var(--color-border-subtle); border-radius: 12px;">
			<h1 class="text-xl mb-6 text-center" style="color: var(--color-accent-yellow);">torrent</h1>

			<label for="user" class="block text-sm mb-1" style="color: var(--color-text-info);">username</label>
			<input
				id="user" type="text" bind:value={username}
				class="w-full p-3 border text-sm mb-4"
				style="background: var(--color-surface-input); border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
				autocomplete="username"
			/>

			<label for="pass" class="block text-sm mb-1" style="color: var(--color-text-info);">password</label>
			<input
				id="pass" type="password" bind:value={password}
				class="w-full p-3 border text-sm mb-6"
				style="background: var(--color-surface-input); border-color: var(--color-border-medium); border-radius: 8px; color: var(--color-text-primary);"
				autocomplete="current-password"
			/>

			{#if error}
				<p class="text-sm mb-4" style="color: var(--color-danger);">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full p-3 text-sm font-bold disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
				style="background: var(--color-accent-blue); border-radius: 8px; color: #050505;"
			>
				{loading ? 'connecting...' : 'connect'}
			</button>
		</div>
	</form>
</div>
