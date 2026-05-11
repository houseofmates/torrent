<script lang="ts">
	import { isAuthenticated } from '$lib/stores';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function login() {
		if (!username || !password) return;
		loading = true;
		error = '';

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ username, password })
			});
			if (res.ok) {
				isAuthenticated.set(true);
			} else {
				error = 'login failed. check your credentials.';
			}
		} catch {
			error = 'connection failed. is qbittorrent running?';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-[100dvh] flex items-center justify-center p-4">
	<form onsubmit={(e) => { e.preventDefault(); login(); }} class="w-full max-w-sm">
		<div class="p-8 border border-border-subtle" style="background: var(--color-surface-card); border-radius: 12px;">
			<h1 class="text-xl mb-6 text-center" style="color: var(--color-accent-yellow);">torrent</h1>

			<label for="user" class="block text-sm mb-1 text-white">username</label>
			<input
				id="user" type="text" bind:value={username}
				class="w-full p-3 border border-border-medium text-sm mb-4"
				style="background: var(--color-surface-input); border-radius: 8px;"
				autocomplete="username"
			/>

			<label for="pass" class="block text-sm mb-1 text-white">password</label>
			<input
				id="pass" type="password" bind:value={password}
				class="w-full p-3 border border-border-medium text-sm mb-6"
				style="background: var(--color-surface-input); border-radius: 8px;"
				autocomplete="current-password"
			/>

			{#if error}
				<p class="text-sm mb-4" style="color: var(--color-danger);">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full p-3 text-sm font-bold disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
				style="background: var(--color-accent-blue); border-radius: 8px; color: #fff;"
			>
				{loading ? 'connecting...' : 'connect'}
			</button>
		</div>
	</form>
</div>