<script lang="ts">
	import CrmContatos from '$lib/components/crm/CrmContatos.svelte';
	import { usarComercial } from '$lib/comercial.svelte';

	const loja = usarComercial();
</script>

<CrmContatos contatos={loja.dados.contatos} onOpen={(id) => loja.abrirContato(id)} />
