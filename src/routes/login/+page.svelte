<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Card, Button, Input } from '$lib/components/ui';

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

<section class="min-h-screen flex items-center justify-center p-3 bg-bg">
	<Card class="w-full max-w-100 shadow-lg">
		<h1 class="text-2xl font-bold text-center text-navy mb-1">
			Dunamis<span class="text-brand">.</span>Space
		</h1>
		<p class="text-center text-grey mb-6">Entre para continuar</p>

		<form onsubmit={handleLogin} class="space-y-4">
			<Input label="E-mail" type="email" bind:value={email} required autocomplete="email" />
			<Input label="Senha" type="password" bind:value={password} required autocomplete="current-password" />

			{#if error}<p class="text-brand-danger text-sm">{error}</p>{/if}

			<Button type="submit" block loading={loading}>Entrar</Button>
		</form>
	</Card>
</section>
