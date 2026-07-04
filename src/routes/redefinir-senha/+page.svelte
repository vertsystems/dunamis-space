<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Input } from '$lib/components/ui';
	import logo from '$lib/assets/dspace-logo.svg';

	let { data } = $props();
	let { supabase } = $derived(data);

	// checando: processando o link do e-mail | pronto: tem sessão de recuperação
	// invalido: link inválido/expirado | ok: senha trocada
	let estado = $state<'checando' | 'pronto' | 'invalido' | 'ok'>('checando');
	let senha = $state('');
	let senha2 = $state('');
	let salvando = $state(false);
	let erro = $state('');

	onMount(() => {
		// O client (createBrowserClient, detectSessionInUrl) troca o ?code= da URL
		// por uma sessão e dispara onAuthStateChange. Se nada vier, o link é inválido.
		const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
			if (session) estado = 'pronto';
		});
		supabase.auth.getSession().then(({ data: d }) => {
			if (d.session) estado = 'pronto';
		});
		const t = setTimeout(() => {
			if (estado === 'checando') estado = 'invalido';
		}, 3500);
		return () => {
			sub.subscription.unsubscribe();
			clearTimeout(t);
		};
	});

	async function salvar(e: Event) {
		e.preventDefault();
		erro = '';
		if (senha.length < 8) {
			erro = 'A senha deve ter ao menos 8 caracteres.';
			return;
		}
		if (senha !== senha2) {
			erro = 'As senhas não conferem.';
			return;
		}
		salvando = true;
		const { error } = await supabase.auth.updateUser({ password: senha });
		salvando = false;
		if (error) {
			erro = error.message;
			return;
		}
		estado = 'ok';
		setTimeout(() => goto('/'), 900);
	}
</script>

<section class="grid min-h-screen place-items-center p-4">
	<div class="w-full max-w-[26rem]">
		<div class="mb-6 flex items-center justify-center gap-2.5">
			<span
				class="grid size-9 place-items-center rounded-[var(--radius)] bg-brand text-lg font-bold text-white shadow-md"
			>
				D
			</span>
			<img src={logo} alt="Dunamis Space" class="h-5 w-auto" />
		</div>

		<div class="rounded-[var(--radius-xl)] border border-grey-200 bg-surface p-7 shadow-xl">
			{#if estado === 'checando'}
				<p class="py-6 text-center text-sm text-grey">Verificando o link…</p>
			{:else if estado === 'invalido'}
				<h1 class="text-lg font-bold text-navy">Link inválido ou expirado</h1>
				<p class="mt-1 text-sm text-grey">
					Solicite um novo link de redefinição na tela de login.
				</p>
				<a
					href="/login"
					class="mt-5 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-brand text-sm font-semibold text-white transition hover:brightness-105"
				>
					Voltar ao login
				</a>
			{:else if estado === 'ok'}
				<h1 class="text-lg font-bold text-navy">Senha atualizada!</h1>
				<p class="mt-1 text-sm text-grey">Redirecionando para o sistema…</p>
			{:else}
				<h1 class="text-xl font-bold tracking-tight text-navy">Criar nova senha</h1>
				<p class="mt-1 mb-6 text-sm text-grey">Escolha uma nova senha para sua conta.</p>

				<form onsubmit={salvar} class="space-y-4">
					<Input
						label="Nova senha"
						type="password"
						placeholder="••••••••"
						bind:value={senha}
						required
						autocomplete="new-password"
					/>
					<Input
						label="Confirmar nova senha"
						type="password"
						placeholder="••••••••"
						bind:value={senha2}
						required
						autocomplete="new-password"
					/>

					{#if erro}
						<div
							class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger"
						>
							{erro}
						</div>
					{/if}

					<Button type="submit" block loading={salvando}>Salvar nova senha</Button>
				</form>
			{/if}
		</div>
	</div>
</section>
