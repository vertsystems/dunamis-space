<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button, Input } from '$lib/components/ui';

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
		if (err) {
			loading = false;
			error = err.message;
			return;
		}
		// Mantém loading=true até a navegação concluir (evita duplo submit / flash do botão).
		await invalidateAll();
		await goto('/');
	}
</script>

<section class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-[26rem]">
		<div class="text-center mb-6">
			<div
				class="inline-grid size-14 place-items-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[#4c82ff] to-[#2f5fe0] text-white text-2xl font-bold shadow-[0_8px_24px_-6px_rgba(59,110,246,0.55)] mb-4"
			>
				D
			</div>
			<h1 class="text-2xl font-bold text-navy tracking-tight">
				Dunamis<span class="text-brand">.</span>Space
			</h1>
			<p class="text-grey text-sm mt-1">Plataforma de gestão da agência</p>
		</div>

		<div
			class="rounded-[var(--radius-xl)] border border-grey-200 bg-surface/85 backdrop-blur-xl shadow-xl p-7"
		>
			<form onsubmit={handleLogin} class="space-y-4">
				<Input
					label="E-mail"
					type="email"
					placeholder="voce@dunamis.com"
					bind:value={email}
					required
					autocomplete="email"
				/>
				<Input
					label="Senha"
					type="password"
					placeholder="••••••••"
					bind:value={password}
					required
					autocomplete="current-password"
				/>

				{#if error}
					<div
						class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger"
					>
						{error}
					</div>
				{/if}

				<Button type="submit" block loading={loading}>Entrar</Button>
			</form>
		</div>

		<p class="text-center text-xs text-grey mt-5">Dunamis Company · Marketing Digital</p>
	</div>
</section>
