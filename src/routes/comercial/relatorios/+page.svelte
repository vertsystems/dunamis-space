<script lang="ts">
	import CrmRelatorios from '$lib/components/crm/CrmRelatorios.svelte';
	import { computeMotivosPerda, computeOrigens } from '$lib/crm';
	import { usarComercial } from '$lib/comercial.svelte';

	const loja = usarComercial();

	const motivos = $derived(computeMotivosPerda(loja.negocios));
	const origens = $derived(computeOrigens(loja.negocios, loja.dados.contatos));
</script>

<CrmRelatorios {motivos} {origens} />
