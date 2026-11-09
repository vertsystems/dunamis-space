<script lang="ts">
	// DGathe: o escritório da Dunamis em forma de jogo. Protótipo com o avatar de
	// quem está logado; os agentes e o resto da equipe entram nas próximas fases.
	import Escritorio from '$lib/components/dgathe/Escritorio.svelte';
	import { funcaoSigla } from '$lib/equipe';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const perfil = $derived(
		data.perfil as { nome?: string; avatar_url?: string; cor_tema?: string; funcao?: string; funcoes?: string[] } | null
	);
	const nome = $derived(perfil?.nome?.trim() || data.session?.user?.email?.split('@')[0] || 'Você');
	const cargo = $derived(funcaoSigla(perfil?.funcoes?.[0] ?? perfil?.funcao) ?? 'Equipe');
</script>

<svelte:head>
	<title>DGathe | Dunamis Space</title>
</svelte:head>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<div>
		<h1 class="text-base font-semibold text-navy">DGathe</h1>
		<p class="text-sm text-grey">O escritório da Dunamis em forma de jogo. Clique com o botão direito para andar.</p>
	</div>
	<span class="rounded-full bg-brand-cream px-2.5 py-1 text-xs font-semibold text-brand-brown">Protótipo</span>
</div>

<Escritorio {nome} {cargo} foto={perfil?.avatar_url ?? null} cor={perfil?.cor_tema ?? null} />
