<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { supabase } = $derived(data);

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		const { error: err } = await supabase.auth.signInWithPassword({ email, password });
		loading = false;
		if (err) {
			error = err.message;
			return;
		}
		await invalidateAll();
		await goto('/');
	}
</script>

<section class="min-vh-100 d-flex align-items-center justify-content-center p-3" style="background-color: var(--ds-light);">
	<div class="card card-body shadow-sm" style="width: 100%; max-width: 400px;">
		<h1 class="h4 text-center mb-1">
			Dunamis<span style="color: var(--ds-red);">.</span>Space
		</h1>
		<p class="text-center text-muted">Entre para continuar</p>

		<form onsubmit={handleLogin}>
			<div class="mb-3">
				<label class="form-label" for="email">E-mail</label>
				<input id="email" class="form-control" type="email" bind:value={email} required autocomplete="email" />
			</div>

			<div class="mb-3">
				<label class="form-label" for="password">Senha</label>
				<input id="password" class="form-control" type="password" bind:value={password} required autocomplete="current-password" />
			</div>

			{#if error}
				<p class="text-danger small">{error}</p>
			{/if}

			<button class="btn btn-primary w-100 mt-2" type="submit" disabled={loading}>
				{#if loading}<span class="spinner-border spinner-border-sm me-2"></span>{/if}Entrar
			</button>
		</form>
	</div>
</section>
