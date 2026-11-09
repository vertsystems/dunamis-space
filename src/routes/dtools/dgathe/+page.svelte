<script lang="ts">
	// DGathe: o escritório da Dunamis em forma de jogo. Cada pessoa logada é um
	// avatar, e quem está no DGathe ao mesmo tempo se vê (Supabase Realtime).
	// Os agentes entram na próxima fase.
	import Escritorio from '$lib/components/dgathe/Escritorio.svelte';
	import { funcaoSigla } from '$lib/equipe';
	import { lerAparencia } from '$lib/dgathe/aparencia';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const perfil = $derived(
		data.perfil as {
			id?: string;
			nome?: string;
			avatar_url?: string;
			cor_tema?: string;
			funcao?: string;
			funcoes?: string[];
		} | null
	);
	const nome = $derived(perfil?.nome?.trim() || data.session?.user?.email?.split('@')[0] || 'Você');
	const cargo = $derived(funcaoSigla(perfil?.funcoes?.[0] ?? perfil?.funcao) ?? 'Equipe');
</script>

<svelte:head>
	<title>DGathe | Dunamis Space</title>
</svelte:head>

<Escritorio
	{nome}
	{cargo}
	foto={perfil?.avatar_url ?? null}
	cor={perfil?.cor_tema ?? null}
	aparencia={lerAparencia(data.aparenciaSalva, perfil?.cor_tema)}
	id={perfil?.id ?? data.session?.user?.id ?? null}
	supabase={data.supabase}
/>

<!-- Legenda discreta, embaixo à direita: a tela de cima fica toda para o jogo. -->
<div class="mt-1.5 text-right text-3xs leading-4 text-grey">
	<h1 class="inline text-2xs font-semibold text-navy">DGathe</h1>
	· O escritório da Dunamis em forma de jogo. Clique com o botão direito para andar.
</div>
