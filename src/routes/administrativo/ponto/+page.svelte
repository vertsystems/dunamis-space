<script lang="ts">
	// Painel de ponto da gestão. Três leituras da mesma base:
	//   Hoje  — quem está trabalhando, em almoço, encerrado ou não bateu.
	//   Mês   — fechamento por pessoa (horas, faltas, saldo) + CSV.
	//   Ajustes — a fila de pedidos de correção, com o que muda em cada dia.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Badge, Button, Card, EmptyState, SegmentedNav } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { chamarAction } from '$lib/acoesRemotas';
	import { formatDateBR } from '$lib/alertas';
	import { funcaoLabel } from '$lib/equipe';
	import { DIAS } from '$lib/rotina';
	import {
		BATIDAS,
		CAMPOS,
		batida,
		csvDoMes,
		deslocaMes,
		diaSemana,
		diasDoIntervalo,
		formatMinutos,
		formatSaldo,
		horaSP,
		intervaloDoMes,
		jornadaDe,
		labelMes,
		minutosTrabalhados,
		saldoTone,
		statusDe,
		STATUS_LABEL,
		STATUS_TONE,
		type Registro,
		type Status
	} from '$lib/ponto';

	let { data } = $props();

	// Relógio compartilhado: as horas de quem está com o expediente aberto sobem
	// sozinhas, senão o painel "ao vivo" mente até alguém recarregar.
	let agora = $state(new Date());
	onMount(() => {
		const t = setInterval(() => (agora = new Date()), 30_000);
		return () => clearInterval(t);
	});

	const aba = $derived(page.url.searchParams.get('aba') ?? 'hoje');
	const q = (extra: Record<string, string>) => {
		const p = new URLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(extra)) p.set(k, v);
		return `?${p.toString()}`;
	};
	const pendentes = $derived(data.ajustes.filter((a) => a.status === 'pendente'));
	const abas = $derived([
		{ label: 'Hoje', href: q({ aba: 'hoje' }) },
		{ label: 'Mês', href: q({ aba: 'mes' }) },
		{ label: pendentes.length ? `Ajustes (${pendentes.length})` : 'Ajustes', href: q({ aba: 'ajustes' }) }
	]);
	const abaAtual = $derived(
		aba === 'mes' ? 'Mês' : aba === 'ajustes' ? abas[2].label : 'Hoje'
	);

	const nomeDe = $derived((id: string) => data.colaboradores.find((c) => c.id === id)?.nome ?? '—');
	const cargoDe = $derived((c: { funcoes: string[] | null; funcao: string | null }) => {
		const f = c.funcoes?.length ? c.funcoes[0] : c.funcao;
		return f ? funcaoLabel(f) : '';
	});

	/* ---------------- Hoje ---------------- */
	const linhasHoje = $derived(
		data.colaboradores.map((c) => {
			const registro = (data.registrosHoje[c.id] ?? null) as Registro | null;
			return {
				colab: c,
				registro,
				status: statusDe(registro),
				minutos: minutosTrabalhados(registro, agora)
			};
		})
	);
	// Quem está em atividade primeiro; quem não bateu, por último.
	const ORDEM: Record<Status, number> = { trabalhando: 0, almoco: 1, encerrado: 2, nao_iniciado: 3 };
	const linhasHojeOrdenadas = $derived(
		[...linhasHoje].sort(
			(a, b) => ORDEM[a.status] - ORDEM[b.status] || a.colab.nome.localeCompare(b.colab.nome, 'pt-BR')
		)
	);
	const contagem = $derived.by(() => {
		const c: Record<Status, number> = { trabalhando: 0, almoco: 0, encerrado: 0, nao_iniciado: 0 };
		for (const l of linhasHoje) c[l.status]++;
		return c;
	});
	const CARTOES: { status: Status; icon: string }[] = [
		{ status: 'trabalhando', icon: 'zap' },
		{ status: 'almoco', icon: 'clock' },
		{ status: 'encerrado', icon: 'check' },
		{ status: 'nao_iniciado', icon: 'x' }
	];

	/* ---------------- Mês ---------------- */
	const resumoDe = $derived((id: string) => data.resumos.find((r) => r.colaborador_id === id));
	const totalMes = $derived.by(() => {
		const t = { minutosTrabalhados: 0, saldo: 0, faltas: 0 };
		for (const r of data.resumos) {
			t.minutosTrabalhados += r.minutosTrabalhados;
			t.saldo += r.saldo;
			t.faltas += r.faltas;
		}
		return t;
	});

	function baixarCsv() {
		const { inicio, fim } = intervaloDoMes(data.mes);
		const porChave = new Map(
			(data.registrosMes as (Registro & { colaborador_id: string })[]).map((r) => [
				`${r.colaborador_id}|${r.data}`,
				r
			])
		);
		const linhas = data.colaboradores.flatMap((c) =>
			diasDoIntervalo(inicio, fim)
				.filter((d) => d <= data.hoje)
				.map((d) => ({
					nome: c.nome,
					data: d,
					registro: porChave.get(`${c.id}|${d}`) ?? null,
					jornada: jornadaDe(c)
				}))
		);
		// BOM para o Excel abrir os acentos certos.
		const blob = new Blob(['﻿' + csvDoMes(linhas, data.hoje)], {
			type: 'text/csv;charset=utf-8'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ponto-${data.mes}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/* ---------------- Ajustes ---------------- */
	const registroDoPedido = $derived((colaborador_id: string, dia: string) =>
		(data.registrosDosPedidos as (Registro & { colaborador_id: string })[]).find(
			(r) => r.colaborador_id === colaborador_id && r.data === dia
		) ?? null
	);

	let respostaDe = $state<Record<string, string>>({});
	let decidindo = $state<string | null>(null);

	async function decidir(id: string, decisao: 'aprovado' | 'recusado') {
		decidindo = id;
		await chamarAction(
			'?/decidirAjuste',
			{ id, decisao, resposta: respostaDe[id] ?? '' },
			{
				ok: decisao === 'aprovado' ? 'Ajuste aprovado e aplicado.' : 'Pedido recusado.',
				erro: 'Não foi possível concluir.'
			}
		);
		decidindo = null;
	}

	const decididos = $derived(data.ajustes.filter((a) => a.status !== 'pendente'));
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-base font-semibold text-navy">Ponto da equipe</h1>
		<p class="text-sm text-grey">Quem está trabalhando agora, o fechamento do mês e os pedidos de correção.</p>
	</div>
	<SegmentedNav items={abas} current={abaAtual} />
</div>

{#if aba === 'hoje'}
	<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each CARTOES as c (c.status)}
			<Card>
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="text-xs font-semibold tracking-wide text-grey uppercase">{STATUS_LABEL[c.status]}</div>
						<div class="mt-1 text-3xl font-bold text-navy tabular-nums">{contagem[c.status]}</div>
					</div>
					<span class="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-bg text-slate">
						<Icon name={c.icon} size={20} />
					</span>
				</div>
			</Card>
		{/each}
	</div>

	<Card padding="none" class="overflow-hidden">
		<div class="flex items-center justify-between gap-2 border-b border-grey-200 px-5 py-3.5">
			<h2 class="flex items-center gap-2 font-semibold text-navy">
				<Icon name="clock" size={16} /> {formatDateBR(data.hoje)} · {DIAS[diaSemana(data.hoje)].nome}
			</h2>
			<span class="text-xs text-grey">Atualiza sozinho</span>
		</div>

		<div class="hidden grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.8fr))_minmax(0,0.8fr)_auto] gap-2 border-b border-grey-200 px-5 py-2 text-[0.68rem] font-semibold tracking-wide text-grey uppercase lg:grid">
			<span>Colaborador</span>
			{#each BATIDAS as b (b.campo)}<span class="text-center">{b.label}</span>{/each}
			<span class="text-right">Trabalhado</span>
			<span></span>
		</div>

		<ul class="divide-y divide-grey-200/60">
			{#each linhasHojeOrdenadas as l (l.colab.id)}
				<li class="grid grid-cols-2 items-center gap-2 px-5 py-2.5 hover:bg-bg lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.8fr))_minmax(0,0.8fr)_auto]">
					<div class="col-span-2 min-w-0 lg:col-span-1">
						<div class="flex items-center gap-2">
							<span class="truncate text-sm text-navy">{l.colab.nome}</span>
							<Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
						</div>
						<div class="truncate text-xs text-grey">{cargoDe(l.colab)}</div>
					</div>

					{#each BATIDAS as b (b.campo)}
						<div class="text-center">
							<span class="text-[0.65rem] text-grey lg:hidden">{b.label}: </span>
							<span class="text-sm tabular-nums {l.registro?.[b.campo] ? 'text-navy' : 'text-grey/50'}">
								{horaSP(l.registro?.[b.campo]) || '--:--'}
							</span>
						</div>
					{/each}

					<div class="text-right text-sm font-medium text-navy tabular-nums">
						{l.minutos ? formatMinutos(l.minutos) : '—'}
					</div>
					<a
						href={`/administrativo/ponto/${l.colab.id}?mes=${data.mes}`}
						class="justify-self-end text-xs text-brand hover:underline"
					>
						Espelho
					</a>
				</li>
			{/each}
		</ul>

		{#if !data.colaboradores.length}
			<EmptyState title="Nenhum colaborador ativo" description="Cadastre a equipe para acompanhar o ponto." />
		{/if}
	</Card>
{:else if aba === 'mes'}
	<Card padding="none" class="overflow-hidden">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-grey-200 px-5 py-3">
			<div class="flex items-center gap-1">
				<a
					href={q({ mes: deslocaMes(data.mes, -1) })}
					class="grid size-8 place-items-center rounded-[var(--radius)] text-slate transition-colors hover:bg-bg"
					aria-label="Mês anterior"
				>
					<span class="rotate-180"><Icon name="chevron" size={16} /></span>
				</a>
				<h2 class="min-w-40 text-center font-semibold text-navy">{labelMes(data.mes)}</h2>
				<a
					href={q({ mes: deslocaMes(data.mes, 1) })}
					class="grid size-8 place-items-center rounded-[var(--radius)] text-slate transition-colors hover:bg-bg"
					aria-label="Próximo mês"
				>
					<Icon name="chevron" size={16} />
				</a>
			</div>
			<Button variant="secondary" size="sm" onclick={baixarCsv}>
				<Icon name="file" size={15} /> Baixar CSV
			</Button>
		</div>

		<div class="hidden grid-cols-[minmax(0,1.8fr)_repeat(5,minmax(0,0.8fr))_auto] gap-2 border-b border-grey-200 px-5 py-2 text-[0.68rem] font-semibold tracking-wide text-grey uppercase lg:grid">
			<span>Colaborador</span>
			<span class="text-right">Dias</span>
			<span class="text-right">Faltas</span>
			<span class="text-right">Horas</span>
			<span class="text-right">Esperado</span>
			<span class="text-right">Saldo</span>
			<span></span>
		</div>

		<ul class="divide-y divide-grey-200/60">
			{#each data.colaboradores as c (c.id)}
				{@const r = resumoDe(c.id)}
				<li class="grid grid-cols-2 items-center gap-2 px-5 py-2.5 hover:bg-bg lg:grid-cols-[minmax(0,1.8fr)_repeat(5,minmax(0,0.8fr))_auto]">
					<div class="col-span-2 min-w-0 lg:col-span-1">
						<div class="truncate text-sm text-navy">{c.nome}</div>
						<div class="truncate text-xs text-grey">
							{cargoDe(c)} · jornada {formatMinutos(jornadaDe(c).minutos)}/dia
						</div>
					</div>
					<div class="text-right text-sm text-navy tabular-nums">
						<span class="text-[0.65rem] text-grey lg:hidden">Dias </span>{r?.diasTrabalhados ?? 0}
					</div>
					<div class="text-right text-sm tabular-nums {r?.faltas ? 'text-brand-danger' : 'text-grey'}">
						<span class="text-[0.65rem] text-grey lg:hidden">Faltas </span>{r?.faltas ?? 0}
					</div>
					<div class="text-right text-sm text-navy tabular-nums">
						<span class="text-[0.65rem] text-grey lg:hidden">Horas </span>{formatMinutos(r?.minutosTrabalhados ?? 0)}
					</div>
					<div class="text-right text-sm text-grey tabular-nums">
						{formatMinutos(r?.minutosEsperados ?? 0)}
					</div>
					<div class="text-right text-sm font-semibold tabular-nums {saldoTone(r?.saldo ?? 0) === 'danger' ? 'text-brand-danger' : saldoTone(r?.saldo ?? 0) === 'success' ? 'text-[#067647]' : 'text-grey'}">
						{formatSaldo(r?.saldo ?? 0)}
					</div>
					<a
						href={`/administrativo/ponto/${c.id}?mes=${data.mes}`}
						class="justify-self-end text-xs text-brand hover:underline"
					>
						Espelho
					</a>
				</li>
			{/each}
		</ul>

		<div class="flex flex-wrap items-center justify-end gap-4 border-t border-grey-200 bg-bg/60 px-5 py-3 text-sm">
			<span class="text-grey">Total da equipe:</span>
			<span class="text-navy">{formatMinutos(totalMes.minutosTrabalhados)} trabalhadas</span>
			<span class={totalMes.faltas ? 'text-brand-danger' : 'text-grey'}>{totalMes.faltas} faltas</span>
			<span class="font-semibold {saldoTone(totalMes.saldo) === 'danger' ? 'text-brand-danger' : 'text-[#067647]'}">
				saldo {formatSaldo(totalMes.saldo)}
			</span>
		</div>
	</Card>
{:else}
	<!-- ===================== Ajustes ===================== -->
	{#if !pendentes.length}
		<Card>
			<EmptyState
				icon="check"
				title="Nenhum pedido pendente"
				description="Quando alguém pedir correção de uma batida, o pedido aparece aqui para você aprovar."
			/>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each pendentes as a (a.id)}
				{@const atual = registroDoPedido(a.colaborador_id, a.data)}
				<Card>
					<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
						<div>
							<h3 class="font-semibold text-navy">{nomeDe(a.colaborador_id)}</h3>
							<p class="text-xs text-grey">
								{formatDateBR(a.data)} · {DIAS[diaSemana(a.data)].nome} · pedido em {formatDateBR(a.created_at.slice(0, 10))}
							</p>
						</div>
						<Badge tone="warning">Aguardando decisão</Badge>
					</div>

					<div class="grid gap-2 sm:grid-cols-4">
						{#each CAMPOS as campo (campo)}
							{@const de = horaSP(atual?.[campo])}
							{@const para = horaSP(a[campo])}
							{@const mudou = de !== para}
							<div class="rounded-[var(--radius)] px-3 py-2 {mudou ? 'bg-brand/5 ring-1 ring-brand/25' : 'bg-bg'}">
								<div class="text-[0.68rem] font-semibold tracking-wide text-grey uppercase">{batida(campo).label}</div>
								<div class="mt-0.5 text-sm tabular-nums">
									{#if mudou}
										<span class="text-grey line-through">{de || '--:--'}</span>
										<span class="mx-1 text-grey">→</span>
										<strong class="text-navy">{para || '--:--'}</strong>
									{:else}
										<span class="text-slate">{para || '--:--'}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<p class="mt-3 rounded-[var(--radius)] bg-bg px-3 py-2 text-sm text-slate">
						<span class="text-xs font-semibold text-grey uppercase">Motivo:</span>
						{a.motivo}
					</p>

					{#if data.podeEditar}
						<div class="mt-3 flex flex-wrap items-center justify-end gap-2">
							<input
								bind:value={respostaDe[a.id]}
								placeholder="Resposta (opcional)"
								class="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy focus:border-brand focus:outline-none sm:max-w-xs"
							/>
							<Button
								variant="ghost"
								size="sm"
								disabled={decidindo === a.id}
								onclick={() => decidir(a.id, 'recusado')}
							>
								Recusar
							</Button>
							<Button
								variant="success"
								size="sm"
								loading={decidindo === a.id}
								disabled={decidindo === a.id}
								onclick={() => decidir(a.id, 'aprovado')}
							>
								<Icon name="check" size={15} /> Aprovar e aplicar
							</Button>
						</div>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}

	{#if decididos.length}
		<Card class="mt-4">
			<h3 class="mb-2 text-sm font-semibold text-navy">Decididos recentemente</h3>
			<ul class="divide-y divide-grey-200/60">
				{#each decididos.slice(0, 20) as a (a.id)}
					<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
						<div class="min-w-0">
							<span class="text-navy">{nomeDe(a.colaborador_id)}</span>
							<span class="text-grey"> · {formatDateBR(a.data)}</span>
							<span class="block truncate text-xs text-grey">{a.motivo}</span>
						</div>
						<Badge tone={a.status === 'aprovado' ? 'success' : 'danger'}>
							{a.status === 'aprovado' ? 'Aprovado' : 'Recusado'}
						</Badge>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
{/if}
