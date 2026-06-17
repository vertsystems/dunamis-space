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

<section class="hero is-fullheight" style="background-color: var(--ds-light);">
	<div class="hero-body is-justify-content-center">
		<div class="box" style="width: 100%; max-width: 400px;">
			<h1 class="title is-4 has-text-centered">
				Dunamis<span style="color: var(--ds-red);">.</span>Space
			</h1>
			<p class="subtitle is-6 has-text-centered has-text-grey">Entre para continuar</p>

			<form onsubmit={handleLogin}>
				<div class="field">
					<label class="label" for="email">E-mail</label>
					<div class="control">
						<input
							id="email"
							class="input"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
						/>
					</div>
				</div>

				<div class="field">
					<label class="label" for="password">Senha</label>
					<div class="control">
						<input
							id="password"
							class="input"
							type="password"
							bind:value={password}
							required
							autocomplete="current-password"
						/>
					</div>
				</div>

				{#if error}
					<p class="help is-danger">{error}</p>
				{/if}

				<button class="button is-primary is-fullwidth mt-3" class:is-loading={loading} type="submit">
					Entrar
				</button>
			</form>
		</div>
	</div>
</section>
