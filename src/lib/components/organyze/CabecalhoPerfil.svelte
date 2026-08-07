<script lang="ts">
	// Faixa de identificação do Organyze: quem está usando, as abas e o botão de
	// trocar de perfil. Igual em Tarefas e em Metas — só muda a legenda.
	import { organyze } from '$lib/organyze/store.svelte';
	import { Button } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Abas from './Abas.svelte';
	import Avatar from './Avatar.svelte';
	import { LogOut } from '@lucide/svelte';

	let { legenda }: { legenda: string } = $props();

	const c = $derived(organyze.colaborador);
</script>

<div class="flex items-center gap-3">
	<span class="relative inline-block">
		{#if c}
			<Avatar id={c.id} nome={c.nome} avatarUrl={c.avatarUrl} size="size-11" />
			<span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
				<CargoBadge funcao={c.funcao} />
			</span>
		{/if}
	</span>
	<div class="flex-1">
		<div class="text-lg font-bold leading-tight text-navy">{c?.nome}</div>
		<div class="text-xs text-grey">{legenda}</div>
	</div>
	<Abas />
	<Button variant="secondary" size="sm" onclick={() => organyze.sair()}>
		<LogOut size={15} /> Trocar
	</Button>
</div>
