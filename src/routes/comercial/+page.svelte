<script lang="ts">
	// Dashboard do Comercial — a tela que responde "como estamos e o que fazer
	// agora". Tudo é derivado do estado compartilhado, então um card arrastado no
	// Kanban já muda os números aqui sem recarregar.
	import CrmKpis from '$lib/components/crm/CrmKpis.svelte';
	import CrmForecast from '$lib/components/crm/CrmForecast.svelte';
	import CrmFollowups from '$lib/components/crm/CrmFollowups.svelte';
	import CrmFunil from '$lib/components/crm/CrmFunil.svelte';
	import CrmRankingResumo from '$lib/components/crm/CrmRankingResumo.svelte';
	import CrmFechamentos from '$lib/components/crm/CrmFechamentos.svelte';
	import CrmAgenda from '$lib/components/crm/CrmAgenda.svelte';
	import {
		computeAgenda,
		computeFechamentos,
		computeFollowups,
		computeForecast,
		computeKpis,
		computeRanking
	} from '$lib/crm';
	import { usarComercial } from '$lib/comercial.svelte';

	const loja = usarComercial();

	// `mesRef` (mês do servidor) é a fonte única do "mês corrente" — casa com as
	// metas e o rótulo, sem divergência de fuso na virada do mês.
	const mesRef = $derived(loja.dados.mesRef);

	const kpis = $derived(
		computeKpis(loja.negocios, loja.atividades, loja.dados.stages, new Date(), mesRef)
	);
	const forecast = $derived(
		computeForecast(loja.negocios, loja.stagesDoPipeline, new Date(), mesRef)
	);
	const followups = $derived(computeFollowups(loja.negocios));
	const ranking = $derived(
		computeRanking(loja.negocios, loja.dados.colaboradores, loja.metas, new Date(), mesRef)
	);
	const fechamentos = $derived(computeFechamentos(loja.negocios));
	const agenda = $derived(computeAgenda(loja.atividades));

	const mesLabel = $derived(
		new Date(mesRef.ano, mesRef.mes - 1, 1).toLocaleDateString('pt-BR', {
			month: 'long',
			year: 'numeric'
		})
	);
</script>

<div class="space-y-4">
	<CrmKpis {kpis} />

	<div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
		<CrmForecast {forecast} />
		<CrmFollowups {followups} onOpen={(id) => loja.abrirNegocio(id)} />
	</div>

	<div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
		<CrmFunil etapas={forecast.por_stage} />
		<CrmRankingResumo {ranking} {mesLabel} />
	</div>

	<div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
		<CrmFechamentos {fechamentos} onAbrir={(id) => loja.abrirNegocio(id)} />
		<CrmAgenda
			{agenda}
			onToggle={(id, feita) => loja.concluirAtividade(id, feita)}
			onAbrirNegocio={(id) => loja.abrirNegocio(id)}
			onAbrirContato={(id) => loja.abrirContato(id)}
		/>
	</div>
</div>
