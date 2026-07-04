<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button, Input } from '$lib/components/ui';
	import logo from '$lib/assets/dspace-logo.svg';
	import '@fontsource/dancing-script/600.css';

	let { data } = $props();
	let { supabase } = $derived(data);

	let modo = $state<'login' | 'reset'>('login');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let aviso = $state('');

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		const { error: err } = await supabase.auth.signInWithPassword({ email, password });
		if (err) {
			loading = false;
			error = 'E-mail ou senha inválidos.';
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
		modo = 'login';
		error = '';
		aviso = '';
	}
</script>

<section class="grid min-h-screen place-items-center p-4">
	<div
		class="grid w-full max-w-4xl overflow-hidden rounded-[var(--radius-2xl)] border border-grey-200 bg-surface shadow-xl lg:min-h-[560px] lg:grid-cols-2"
	>
		<!-- Formulário -->
		<div class="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
			<div class="mb-7 flex items-center">
				<img src={logo} alt="Dunamis Space" class="h-[23px] w-auto" />
			</div>

			{#if modo === 'login'}
				<h1 class="text-2xl font-bold tracking-tight text-navy">Entrar</h1>
				<p class="mt-1 mb-6 text-sm text-grey">Acesse sua conta para continuar.</p>

				<form onsubmit={handleLogin} class="space-y-4">
					<Input
						label="E-mail"
						type="email"
						placeholder="voce@dunamis.com"
						bind:value={email}
						required
						autocomplete="email"
					/>
					<div>
						<Input
							label="Senha"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							required
							autocomplete="current-password"
						/>
						<div class="mt-1.5 text-right">
							<button
								type="button"
								onclick={irParaReset}
								class="text-xs font-medium text-brand hover:underline"
							>
								Esqueceu sua senha?
							</button>
						</div>
					</div>

					{#if error}
						<div
							class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger"
						>
							{error}
						</div>
					{/if}

					<Button type="submit" block loading={loading}>Entrar</Button>
				</form>
			{:else}
				<h1 class="text-2xl font-bold tracking-tight text-navy">Redefinir senha</h1>
				<p class="mt-1 mb-6 text-sm text-grey">
					Informe seu e-mail e enviaremos um link para criar uma nova senha.
				</p>

				<form onsubmit={handleReset} class="space-y-4">
					<Input
						label="E-mail"
						type="email"
						placeholder="voce@dunamis.com"
						bind:value={email}
						required
						autocomplete="email"
					/>

					{#if error}
						<div
							class="rounded-[var(--radius)] bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger"
						>
							{error}
						</div>
					{/if}
					{#if aviso}
						<div
							class="rounded-[var(--radius)] bg-brand-green/10 px-3.5 py-2.5 text-sm text-brand-green"
						>
							{aviso}
						</div>
					{/if}

					<Button type="submit" block loading={loading}>Enviar link</Button>
					<button
						type="button"
						onclick={voltarLogin}
						class="w-full text-center text-sm font-medium text-slate hover:text-navy"
					>
						← Voltar ao login
					</button>
				</form>
			{/if}

			<p class="mt-8 text-xs text-grey">Dunamis Company · Marketing Digital</p>
		</div>

		<!-- Hero: foto rotativa (sorteada em static/login-fotos/) com fallback de gradiente -->
		<div class="login-hero relative hidden overflow-hidden lg:block">
			<div
				class="login-hero__img"
				style={data.hero ? `background-image: url('${data.hero}')` : ''}
			></div>
			<div class="login-hero__scrim"></div>
			<div class="relative flex h-full flex-col justify-end p-10 text-white">
				{#if data.frase}
					<blockquote class="max-w-sm text-xl leading-snug font-medium drop-shadow-md">
						“{data.frase.q}”
					</blockquote>
					<p class="font-calig mt-2 text-lg text-white/85 drop-shadow-md">{data.frase.a}</p>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.login-hero {
		background: linear-gradient(135deg, #3b6ef6 0%, #2f5fe0 45%, #6d28d9 100%);
	}
	/* A foto (background-image) é definida inline a partir de data.hero; sem foto,
	   fica transparente e o gradiente da marca (.login-hero) aparece. */
	.login-hero__img {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
	}
	.login-hero__scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(11, 18, 32, 0.82) 0%,
			rgba(11, 18, 32, 0.35) 45%,
			rgba(11, 18, 32, 0.05) 100%
		);
	}
	/* Autor em fonte caligráfica */
	.font-calig {
		font-family: 'Dancing Script', ui-rounded, cursive;
	}
</style>
