<script lang="ts">
	// Link do financeiro errado ou desligado. Sem o app shell (rota pública).
	import { page } from '$app/state';
	import logo from '$lib/assets/dspace-logo.svg';
</script>

<svelte:head>
	<title>Link indisponível · Dunamis Space</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="grid min-h-screen place-items-center bg-bg px-4">
	<div class="max-w-md text-center">
		<img src={logo} alt="Dunamis Space" class="mx-auto mb-6 h-[22px] w-auto" />
		<h1 class="mb-2 text-xl font-bold text-navy">
			{page.status === 404 ? 'Link indisponível' : 'Algo deu errado'}
		</h1>
		<p class="text-sm text-slate">
			{page.status === 404
				? 'Este link não existe ou foi desligado. Peça um novo à Dunamis Company.'
				: 'Não foi possível carregar os pagamentos. Tente de novo em alguns minutos.'}
		</p>
	</div>
</main>
