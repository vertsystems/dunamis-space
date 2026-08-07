<script lang="ts">
	import CrmMetas from '$lib/components/crm/CrmMetas.svelte';
	import { computeRanking } from '$lib/crm';
	import { usarComercial } from '$lib/comercial.svelte';

	const loja = usarComercial();

	const ranking = $derived(
		computeRanking(
			loja.negocios,
			loja.dados.colaboradores,
			loja.metas,
			new Date(),
			loja.dados.mesRef
		)
	);
	const mesLabel = $derived(
		new Date(loja.dados.mesRef.ano, loja.dados.mesRef.mes - 1, 1).toLocaleDateString('pt-BR', {
			month: 'long',
			year: 'numeric'
		})
	);
</script>

<CrmMetas
	{ranking}
	{mesLabel}
	metasPendente={loja.dados.metasPendente}
	onSetMeta={(id, valor) => loja.definirMeta(id, valor)}
/>
