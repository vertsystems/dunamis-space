<script lang="ts">
	import { page } from '$app/state';
	import {
		APROVACAO_STATUS,
		aprovacaoStatusTone,
		aprovacaoStatusLabel,
		conteudoTipoLabel
	} from '$lib/conteudo';
	import { Card, Badge, Button, Select, SegmentedNav } from '$lib/components/ui';

	let { data } = $props();
	let status = $state(data.status);
	let copiadoId = $state<string | null>(null);

	const segs = [
		{ label: 'Lista', href: '/conteudo' },
		{ label: 'Calendário', href: '/conteudo/calendario' },
		{ label: 'Aprovações', href: '/conteudo/aprovacoes' }
	];

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}

	function linkDe(token: string) {
		return `${page.url.origin}/aprovar/${token}`;
	}

	async function copiar(token: string, id: string) {
		await navigator.clipboard.writeText(linkDe(token));
		copiadoId = id;
		setTimeout(() => (copiadoId = null), 2000);
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div class="flex flex-wrap items-end gap-2">
		<SegmentedNav items={segs} current="Aprovações" />
		<form method="GET">
			<Select name="status" bind:value={status} wrapperClass="w-56" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="pendente">Pendentes</option>
				<option value="todas">Todas</option>
				{#each APROVACAO_STATUS.filter((s) => s.value !== 'pendente') as s (s.value)}
					<option value={s.value}>{s.label}</option>
				{/each}
			</Select>
			<noscript><Button variant="secondary" type="submit">Filtrar</Button></noscript>
		</form>
	</div>
	<Button onclick={() => location.assign('/conteudo/novo')}>+ Novo conteúdo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Conteúdo</th>
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Tipo</th>
					<th class="px-4 py-3 font-semibold">Status</th>
					<th class="px-4 py-3 font-semibold">Enviado</th>
					<th class="px-4 py-3 font-semibold">Resposta</th>
					<th class="px-4 py-3 font-semibold">Link</th>
				</tr>
			</thead>
			<tbody>
				{#each data.aprovacoes as a (a.id)}
					<tr class="border-b border-grey-200/60 last:border-0 hover:bg-bg">
						<td class="px-4 py-3">
							{#if a.conteudo_id}
								<a class="text-brand hover:underline" href={`/conteudo/${a.conteudo_id}`}>{a.conteudo_titulo ?? '(sem título)'}</a>
							{:else}
								<span class="text-grey">(conteúdo removido)</span>
							{/if}
							{#if a.comentario_cliente}
								<p class="text-xs text-grey mt-1"><em>“{a.comentario_cliente}”</em></p>
							{/if}
						</td>
						<td class="px-4 py-3">{a.cliente_nome ?? '—'}</td>
						<td class="px-4 py-3">{a.conteudo_tipo ? conteudoTipoLabel(a.conteudo_tipo) : '—'}</td>
						<td class="px-4 py-3"><Badge tone={aprovacaoStatusTone(a.status)}>{aprovacaoStatusLabel(a.status)}</Badge></td>
						<td class="px-4 py-3 text-xs whitespace-nowrap">{fmt(a.data_envio)}</td>
						<td class="px-4 py-3 text-xs whitespace-nowrap">{fmt(a.data_resposta)}</td>
						<td class="px-4 py-3">
							<Button size="sm" variant="secondary" onclick={() => copiar(a.token_publico, a.id)}>
								{copiadoId === a.id ? 'Copiado!' : 'Copiar link'}
							</Button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-12 text-center text-grey">
							{data.status === 'pendente' ? 'Nenhuma aprovação pendente. 🎉' : 'Nenhuma aprovação para este filtro.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
