<script lang="ts">
	import { conteudoStatusTone, conteudoStatusLabel, conteudoTipoLabel } from '$lib/conteudo';
	import { Card, Button, SegmentedNav, toneClasses } from '$lib/components/ui';

	let { data } = $props();

	const segs = [
		{ label: 'Lista', href: '/conteudo' },
		{ label: 'Calendário', href: '/conteudo/calendario' },
		{ label: 'Aprovações', href: '/conteudo/aprovacoes' }
	];

	const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const MESES = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];

	function chave(d: Date) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const porDia = $derived.by(() => {
		const map = new Map<string, typeof data.conteudos>();
		for (const c of data.conteudos) {
			if (!c.data_publicacao) continue;
			const k = chave(new Date(c.data_publicacao));
			const arr = map.get(k) ?? [];
			arr.push(c);
			map.set(k, arr);
		}
		return map;
	});

	const celulas = $derived.by(() => {
		const primeiro = new Date(data.ano, data.mes, 1);
		const inicioSemana = primeiro.getDay();
		const diasNoMes = new Date(data.ano, data.mes + 1, 0).getDate();
		const total = Math.ceil((inicioSemana + diasNoMes) / 7) * 7;
		const inicio = new Date(data.ano, data.mes, 1 - inicioSemana);
		return Array.from({ length: total }, (_, i) => {
			const d = new Date(inicio);
			d.setDate(inicio.getDate() + i);
			return d;
		});
	});

	const hojeKey = chave(new Date());

	function horaCurta(iso: string | null) {
		return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
	<SegmentedNav items={segs} current="Calendário" />
	<Button onclick={() => location.assign('/conteudo/novo')}>+ Novo conteúdo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card>
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-lg font-semibold text-navy">{MESES[data.mes]} {data.ano}</h1>
		<div class="flex gap-1">
			<Button size="sm" variant="secondary" onclick={() => location.assign(`/conteudo/calendario?mes=${data.prev}`)} aria-label="Mês anterior">‹</Button>
			<Button size="sm" variant="secondary" onclick={() => location.assign('/conteudo/calendario')}>Hoje</Button>
			<Button size="sm" variant="secondary" onclick={() => location.assign(`/conteudo/calendario?mes=${data.next}`)} aria-label="Próximo mês">›</Button>
		</div>
	</div>

	<div class="grid grid-cols-7 gap-1.5 mb-1.5">
		{#each SEMANA as dia (dia)}
			<div class="text-center text-xs font-semibold uppercase tracking-wide text-grey">{dia}</div>
		{/each}
	</div>
	<div class="grid grid-cols-7 gap-1.5">
		{#each celulas as d (d.toISOString())}
			{@const k = chave(d)}
			{@const itens = porDia.get(k) ?? []}
			{@const foraDoMes = d.getMonth() !== data.mes}
			<div
				class="min-h-23 flex flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1 {foraDoMes
					? 'bg-bg border-grey-200/60'
					: 'bg-surface border-grey-200'} {k === hojeKey ? 'border-brand ring-1 ring-brand' : ''}"
			>
				<div class="text-xs font-semibold leading-none {foraDoMes ? 'text-grey-200' : 'text-slate'}">{d.getDate()}</div>
				{#each itens as c (c.id)}
					<a
						class="block truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.72rem] font-medium {toneClasses[conteudoStatusTone(c.status)]}"
						href={`/conteudo/${c.id}`}
						title={`${conteudoTipoLabel(c.tipo)} · ${conteudoStatusLabel(c.status)}${c.cliente_nome ? ' · ' + c.cliente_nome : ''}`}
					>
						<span class="opacity-70 mr-1 tabular-nums">{horaCurta(c.data_publicacao)}</span>{c.titulo ?? conteudoTipoLabel(c.tipo)}
					</a>
				{/each}
			</div>
		{/each}
	</div>
</Card>

{#if data.semData.length}
	<Card class="mt-6">
		<h2 class="text-base font-semibold text-navy mb-3">Sem data agendada ({data.semData.length})</h2>
		<div class="flex flex-wrap gap-1.5">
			{#each data.semData as c (c.id)}
				<a
					class="rounded-full px-2 py-0.5 text-xs font-semibold no-underline {toneClasses[conteudoStatusTone(c.status)]}"
					href={`/conteudo/${c.id}`}
				>
					{c.titulo ?? conteudoTipoLabel(c.tipo)}{c.cliente_nome ? ' · ' + c.cliente_nome : ''}
				</a>
			{/each}
		</div>
	</Card>
{/if}
