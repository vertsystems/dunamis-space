<script lang="ts">
	import {
		CONTEUDO_STATUS,
		CONTEUDO_TIPO,
		conteudoStatusTone,
		conteudoStatusLabel,
		conteudoTipoLabel
	} from '$lib/conteudo';
	import { goto } from '$app/navigation';
	import { Card, Badge, Button, Select, SegmentedNav } from '$lib/components/ui';

	let { data } = $props();
	let status = $state(data.status);
	let tipo = $state(data.tipo);

	const segs = [
		{ label: 'Lista', href: '/conteudo' },
		{ label: 'Calendário', href: '/conteudo/calendario' },
		{ label: 'Aprovações', href: '/conteudo/aprovacoes' }
	];

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div class="flex flex-wrap items-end gap-2">
		<SegmentedNav items={segs} current="Lista" />
		<form class="flex gap-2" method="GET">
			<Select name="status" bind:value={status} wrapperClass="w-40">
				<option value="">Todos os status</option>
				{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</Select>
			<Select name="tipo" bind:value={tipo} wrapperClass="w-40">
				<option value="">Todos os tipos</option>
				{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</Select>
			<Button variant="secondary" type="submit">Filtrar</Button>
		</form>
	</div>
	<Button onclick={() => goto('/conteudo/novo')}>+ Novo conteúdo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Publicação</th>
					<th class="px-4 py-3 font-semibold">Título</th>
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Tipo</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.conteudos as c (c.id)}
					<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/conteudo/${c.id}`)}>
						<td class="px-4 py-3 whitespace-nowrap">{fmt(c.data_publicacao)}</td>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/conteudo/${c.id}`}>{c.titulo ?? '(sem título)'}</a></td>
						<td class="px-4 py-3">{c.cliente?.nome ?? '—'}</td>
						<td class="px-4 py-3">{conteudoTipoLabel(c.tipo)}</td>
						<td class="px-4 py-3"><Badge tone={conteudoStatusTone(c.status)}>{conteudoStatusLabel(c.status)}</Badge></td>
					</tr>
				{:else}
					<tr><td colspan="5" class="px-4 py-12 text-center text-grey">Nenhum conteúdo ainda. Clique em “Novo conteúdo”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
