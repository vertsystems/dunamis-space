<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui';
	import logo from '$lib/assets/dspace-logo.svg';
	import { Eye, EyeOff } from '@lucide/svelte';
	import '@fontsource/dancing-script/600.css';

	let { data } = $props();
	let { supabase } = $derived(data);

	type Perfil = { id: string; nome: string; email: string; avatar_url: string | null; funcao: string | null };
	const perfis = $derived((data.perfis ?? []) as Perfil[]);

	// 'perfis' é o caminho principal; cai direto no formulário de e-mail quando
	// não há nenhum perfil (migration 0045 pendente, ou equipe sem cadastro).
	let modo = $state<'perfis' | 'login' | 'reset'>('perfis');
	let escolhido = $state<Perfil | null>(null);
	let campoSenha = $state<HTMLInputElement | null>(null);
	let email = $state('');
	let password = $state('');
	let mostrarSenha = $state(false);
	let loading = $state(false);
	let error = $state('');
	let aviso = $state('');

	const telaPerfis = $derived(modo === 'perfis' && perfis.length > 0);

	function iniciais(nome: string): string {
		const p = (nome ?? '').trim().split(/\s+/).filter(Boolean);
		return ((p.length >= 2 ? p[0][0] + p[1][0] : (nome ?? '?').slice(0, 2)) || '?').toUpperCase();
	}

	async function escolher(p: Perfil) {
		escolhido = p;
		email = p.email;
		password = '';
		error = '';
		// O campo só existe depois que o Svelte redesenha com o perfil escolhido.
		await tick();
		campoSenha?.focus();
	}

	function trocarPerfil() {
		escolhido = null;
		password = '';
		error = '';
	}

	function irParaEmail() {
		modo = 'login';
		escolhido = null;
		email = '';
		password = '';
		error = '';
	}

	function voltarAosPerfis() {
		modo = 'perfis';
		escolhido = null;
		password = '';
		error = '';
	}

	// Efeito máquina de escrever na citação do painel direito.
	let digitado = $state('');
	$effect(() => {
		const frase = data.frase?.q ?? '';
		digitado = '';
		let i = 0;
		const id = setInterval(() => {
			digitado = frase.slice(0, i + 1);
			if (++i >= frase.length) clearInterval(id);
		}, 55);
		return () => clearInterval(id);
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		const { error: err } = await supabase.auth.signInWithPassword({ email, password });
		if (err) {
			loading = false;
			// Com o perfil escolhido o e-mail é certo, então o que falhou foi a senha.
			error = escolhido ? 'Senha incorreta.' : 'E-mail ou senha inválidos.';
			return;
		}
		// Mantém loading=true até a navegação concluir (evita duplo submit / flash do botão).
		await invalidateAll();
		await goto('/');
	}

	async function handleReset(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		aviso = '';
		const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/redefinir-senha`
		});
		loading = false;
		if (err) {
			error = 'Não foi possível enviar o e-mail. Tente novamente.';
			return;
		}
		aviso =
			'Se este e-mail tiver conta, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.';
	}

	function irParaReset() {
		modo = 'reset';
		error = '';
		aviso = '';
	}
	function voltarLogin() {
		// Volta para de onde a pessoa veio: a grade de perfis é a tela inicial.
		modo = perfis.length ? 'perfis' : 'login';
		error = '';
		aviso = '';
	}
</script>

<div class="min-h-screen w-full md:grid md:grid-cols-2">
	<!-- ===== Coluna do formulário ===== -->
	<div class="flex min-h-screen items-center justify-center p-6 md:min-h-0 md:p-10">
		<div class="w-full max-w-[350px]">
			<div class="mb-8 flex items-center">
				<img src={logo} alt="Dunamis Space" class="h-[23px] w-auto" />
			</div>

			{#if telaPerfis}
				<div class="mb-7">
					<h1 class="text-2xl font-bold tracking-tight text-navy">Quem está entrando?</h1>
					<p class="mt-1.5 text-sm text-grey">
						{escolhido ? 'Digite sua senha para acessar.' : 'Escolha seu perfil para continuar.'}
					</p>
				</div>

				<div class="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-x-2 gap-y-4">
					{#each perfis as p (p.id)}
						{@const ativo = escolhido?.id === p.id}
						<button
							type="button"
							onclick={() => escolher(p)}
							aria-pressed={ativo}
							class="group flex flex-col items-center gap-1.5 text-center focus-visible:outline-none"
						>
							{#if p.avatar_url}
								<img
									src={p.avatar_url}
									alt=""
									class="size-16 rounded-full object-cover shadow-sm transition group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-brand/50 {ativo
										? 'ring-2 ring-brand ring-offset-2'
										: 'outline-2 outline-offset-1 outline-dotted outline-grey'}"
								/>
							{:else}
								<span
									class="grid size-16 place-items-center rounded-full bg-navy text-base font-bold text-white shadow-sm transition group-hover:scale-105 {ativo
										? 'ring-2 ring-brand ring-offset-2'
										: 'outline-2 outline-offset-1 outline-dotted outline-grey'}"
								>{iniciais(p.nome)}</span>
							{/if}
							<span class="w-full text-xs leading-tight {ativo ? 'font-semibold text-navy' : 'text-slate'}">
								{p.nome}
							</span>
						</button>
					{/each}
				</div>

				{#if escolhido}
					<!-- Campo de senha do perfil escolhido, logo abaixo das bolinhas. -->
					<form onsubmit={handleLogin} class="mt-6 flex flex-col gap-3">
						<div class="grid gap-2">
							<div class="flex items-center justify-between">
								<label for="senha-perfil" class="text-sm font-medium text-navy">
									Senha de {escolhido.nome.split(' ')[0]}
								</label>
								<button type="button" onclick={irParaReset} class="text-xs font-medium text-brand hover:underline">
									Esqueceu sua senha?
								</button>
							</div>
							<div class="relative">
								<input
									bind:this={campoSenha}
									id="senha-perfil"
									name="password"
									type={mostrarSenha ? 'text' : 'password'}
									placeholder="••••••••"
									bind:value={password}
									required
									autocomplete="current-password"
									aria-invalid={error ? 'true' : undefined}
									aria-describedby={error ? 'perfil-erro' : undefined}
									class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 pe-11 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
								/>
								<button
									type="button"
									onclick={() => (mostrarSenha = !mostrarSenha)}
									aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
									class="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
								>
									{#if mostrarSenha}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
								</button>
							</div>
						</div>

						{#if error}
							<div id="perfil-erro" role="alert" class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger">
								{error}
							</div>
						{/if}

						<Button type="submit" block loading={loading}>Entrar</Button>
						<button type="button" onclick={trocarPerfil} class="text-center text-sm font-medium text-slate hover:text-navy">
							← Escolher outro perfil
						</button>
					</form>
				{/if}

				<button type="button" onclick={irParaEmail} class="mt-6 text-sm font-medium text-slate hover:text-navy">
					Entrar com e-mail
				</button>
			{:else if modo === 'login' || modo === 'perfis'}
				<div class="mb-7">
					<h1 class="text-2xl font-bold tracking-tight text-navy">Entrar na sua conta</h1>
					<p class="mt-1.5 text-sm text-grey">Informe seu e-mail abaixo para acessar.</p>
				</div>

				<form onsubmit={handleLogin} class="flex flex-col gap-4">
					<div class="grid gap-2">
						<label for="email" class="text-sm font-medium text-navy">E-mail</label>
						<input
							id="email"
							name="email"
							type="email"
							placeholder="voce@dunamis.com"
							bind:value={email}
							required
							autocomplete="email"
							aria-invalid={error ? 'true' : undefined}
							aria-describedby={error ? 'login-erro' : undefined}
							class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
						/>
					</div>

					<div class="grid gap-2">
						<div class="flex items-center justify-between">
							<label for="password" class="text-sm font-medium text-navy">Senha</label>
							<button
								type="button"
								onclick={irParaReset}
								class="text-xs font-medium text-brand hover:underline"
							>
								Esqueceu sua senha?
							</button>
						</div>
						<div class="relative">
							<input
								id="password"
								name="password"
								type={mostrarSenha ? 'text' : 'password'}
								placeholder="••••••••"
								bind:value={password}
								required
								autocomplete="current-password"
								aria-invalid={error ? 'true' : undefined}
								aria-describedby={error ? 'login-erro' : undefined}
								class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 pe-11 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
							/>
							<button
								type="button"
								onclick={() => (mostrarSenha = !mostrarSenha)}
								aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
								class="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
							>
								{#if mostrarSenha}
									<EyeOff size={18} />
								{:else}
									<Eye size={18} />
								{/if}
							</button>
						</div>
					</div>

					{#if error}
						<div
							id="login-erro"
							role="alert"
							class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger"
						>
							{error}
						</div>
					{/if}

					<Button type="submit" block loading={loading} class="mt-2">Entrar</Button>
					{#if perfis.length}
						<button type="button" onclick={voltarAosPerfis} class="text-center text-sm font-medium text-slate hover:text-navy">
							← Escolher usuário
						</button>
					{/if}
				</form>
			{:else}
				<div class="mb-7">
					<h1 class="text-2xl font-bold tracking-tight text-navy">Redefinir senha</h1>
					<p class="mt-1.5 text-sm text-grey">
						Informe seu e-mail e enviaremos um link para criar uma nova senha.
					</p>
				</div>

				<form onsubmit={handleReset} class="flex flex-col gap-4">
					<div class="grid gap-2">
						<label for="email-reset" class="text-sm font-medium text-navy">E-mail</label>
						<input
							id="email-reset"
							name="email"
							type="email"
							placeholder="voce@dunamis.com"
							bind:value={email}
							required
							autocomplete="email"
							aria-invalid={error ? 'true' : undefined}
							aria-describedby={error ? 'reset-erro' : undefined}
							class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
						/>
					</div>

					{#if error}
						<div
							id="reset-erro"
							role="alert"
							class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger"
						>
							{error}
						</div>
					{/if}
					{#if aviso}
						<div
							role="status"
							class="rounded-[var(--radius)] bg-brand-green/10 px-3.5 py-2.5 text-sm text-brand-green"
						>
							{aviso}
						</div>
					{/if}

					<Button type="submit" block loading={loading} class="mt-2">Enviar link</Button>
					<button
						type="button"
						onclick={voltarLogin}
						class="w-full text-center text-sm font-medium text-slate hover:text-navy"
					>
						← Voltar ao login
					</button>
				</form>
			{/if}

			<p class="mt-10 text-xs text-grey">Dunamis Company · Marketing Digital</p>
		</div>
	</div>

	<!-- ===== Coluna da imagem + citação (typewriter) ===== -->
	<div
		class="login-hero relative hidden bg-cover bg-center md:block"
		style={data.hero ? `background-image: url('${data.hero}')` : ''}
	>
		<!-- fade na base para leitura da citação -->
		<div class="login-hero__fade"></div>

		<div class="relative z-10 flex h-full flex-col items-center justify-end p-8 pb-12">
			{#if data.frase}
				<blockquote class="max-w-md space-y-2 text-center text-white drop-shadow-md">
					<p class="text-lg font-medium leading-snug">
						“{digitado}<span class="animate-pulse">|</span>”
					</p>
					<cite class="font-calig block text-sm font-light not-italic text-white/85">
						— {data.frase.a}
					</cite>
				</blockquote>
			{/if}
		</div>
	</div>
</div>

<style>
	.login-hero {
		background-color: #1c2534;
		background-image: linear-gradient(135deg, #3b6ef6 0%, #2f5fe0 45%, #6d28d9 100%);
	}
	/* Gradiente na base: escurece só o rodapé para a citação em branco ficar legível,
	   sem lavar a foto inteira. */
	.login-hero__fade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(11, 18, 32, 0.85) 0%,
			rgba(11, 18, 32, 0.35) 30%,
			rgba(11, 18, 32, 0) 55%
		);
	}
	.font-calig {
		font-family: 'Dancing Script', ui-rounded, cursive;
	}
</style>
