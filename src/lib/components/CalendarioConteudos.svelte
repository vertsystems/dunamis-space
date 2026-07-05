<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Card, Button, Select, Modal, toneClasses } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	import { SEMANA, MESES, chaveDia, celulasMes } from '$lib/calendario';
	import { conteudoTipoLabel, conteudoStatusLabel, conteudoStatusTone } from '$lib/conteudo';
	import { toast } from '$lib/toast.svelte';

	let {
		data,
		form = null,
		clienteFixo = '',
		basePath = '/calendario',
		mostrarCabecalho = true
	}: {
		data: Record<string, any>;
		form?: { values?: Record<string, any>; error?: string } | null;
		clienteFixo?: string;
		basePath?: string;
		mostrarCabecalho?: boolean;
	} = $props();

	// As actions (mover/copiar/excluir/definirStatus) vivem sempre na rota /calendario.
	const ACTION = '/calendario';
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	// --- Novo post a partir de um dia do calendário ---
	let novoConteudo = $state<Record<string, any> | null>(null);
	function abrirNovo(key: string) {
		const [a, m, d] = key.split('-').map(Number);
		const dt = new Date(a, m - 1, d, 9, 0, 0);
		novoConteudo = { data_publicacao: dt.toISOString(), cliente_id: data.clienteFiltro || clienteFixo || '' };
	}
	function aposCriar() {
		novoConteudo = null;
		toast.success('Conteúdo criado');
		invalidateAll();
	}

	// --- Editar post direto pelo card do calendário ---
	let editando = $state<Record<string, any> | null>(null);
	function aposEditar() {
		editando = null;
		toast.success('Conteúdo salvo');
		invalidateAll();
	}
	async function excluir(c: Record<string, any> | null, e?: Event) {
		e?.stopPropagation();
		if (!c || processando) return;
		processando = true;
		const fd = new FormData();
		fd.set('id', c.id);
		const resp = await fetch(`${ACTION}?/excluir`, { method: 'POST', body: fd });
		const result = deserialize(await resp.text());
		processando = false;
		if (result.type === 'success') {
			if (editando?.id === c.id) editando = null;
			toast.success('Conteúdo excluído');
			invalidateAll();
		} else if (result.type === 'failure') {
			toast.error((result.data?.error as string) ?? 'Falha ao excluir');
		}
	}

	// --- Arrastar-e-soltar: mover/copiar post entre dias ---
	let arrastando = $state<Record<string, any> | null>(null);
	let sobreDia = $state<string | null>(null);
	let moverCopiar = $state<{ c: Record<string, any>; novaData: string; novaISO: string } | null>(null);
	let processando = $state(false);

	function soltarEm(novaData: string) {
		const c = arrastando;
		arrastando = null;
		sobreDia = null;
		if (!c || c.dia === novaData) return;
		const [hh, mm] = String(c.hora ?? '09:00').split(':').map(Number);
		const [y, mo, d] = novaData.split('-').map(Number);
		const nova = new Date(y, mo - 1, d, hh || 0, mm || 0, 0, 0);
		moverCopiar = { c, novaData, novaISO: nova.toISOString() };
	}

	async function executar(acao: 'mover' | 'copiar') {
		const alvo = moverCopiar;
		if (!alvo || processando) return;
		processando = true;
		const fd = new FormData();
		fd.set('id', alvo.c.id);
		fd.set('data_publicacao', alvo.novaISO);
		const resp = await fetch(`${ACTION}?/${acao}`, { method: 'POST', body: fd });
		const result = deserialize(await resp.text());
		processando = false;
		moverCopiar = null;
		if (result.type === 'success') {
			toast.success(acao === 'mover' ? 'Post movido' : 'Post copiado');
			invalidateAll();
		} else if (result.type === 'failure') {
			toast.error((result.data?.error as string) ?? 'Falha na operação');
		}
	}

	// Ação rápida: mudar o status pelo card (bolinhas ao lado do status).
	async function definirStatusRapido(c: Record<string, any>, status: string, e?: Event) {
		e?.stopPropagation();
		if (c.status === status) return;
		const fd = new FormData();
		fd.set('id', c.id);
		fd.set('status', status);
		const resp = await fetch(`${ACTION}?/definirStatus`, { method: 'POST', body: fd });
		const result = deserialize(await resp.text());
		if (result.type === 'success') {
			toast.success(`Status: ${conteudoStatusLabel(status)}`);
			invalidateAll();
		} else if (result.type === 'failure') {
			toast.error((result.data?.error as string) ?? 'Falha ao alterar status');
		}
	}

	// --- Agenda do dia (clique no quadrado) ---
	let diaAberto = $state<string | null>(null);
	function editarDoDia(c: Record<string, any>) {
		diaAberto = null;
		editando = c;
	}
	function novoNoDia() {
		const k = diaAberto;
		diaAberto = null;
		if (k) abrirNovo(k);
	}

	const VIEWS = [
		{ key: 'semana', label: 'Semana', icon: 'calendar' },
		{ key: 'lista', label: 'Conteúdos', icon: 'clipboard' },
		{ key: 'mes', label: 'Calendário', icon: 'calendar' }
	] as const;

	const MAX_CELULA = 3;

	const conteudosPorDia = $derived.by(() => {
		const m = new Map<string, typeof data.conteudos>();
		for (const c of data.conteudos) {
			const arr = m.get(c.dia) ?? [];
			arr.push(c);
			m.set(c.dia, arr);
		}
		return m;
	});
	const tarefasPorDia = $derived.by(() => {
		const m = new Map<string, typeof data.tarefas>();
		for (const t of data.tarefas) {
			const arr = m.get(t.prazo) ?? [];
			arr.push(t);
			m.set(t.prazo, arr);
		}
		return m;
	});
	const tiposDe = (c: { tipos?: string[]; tipo?: string }) =>
		c.tipos?.length ? c.tipos : c.tipo ? [c.tipo] : [];
	function acoesDoDia(key: string) {
		return [
			...(conteudosPorDia.get(key) ?? []).map((c: any) => ({ k: 'c' as const, c })),
			...(tarefasPorDia.get(key) ?? []).map((t: any) => ({ k: 't' as const, t }))
		];
	}

	const hojeKey = $derived(data.hojeKey);
	const semCliente = $derived(!data.clienteFiltro);
	const celulasDoMes = $derived(celulasMes(data.ano, data.mes));
	const diasDaSemana = $derived.by(() => {
		if (!data.semanaInicio) return [] as Date[];
		const [a, m, d] = data.semanaInicio.split('-').map(Number);
		return Array.from({ length: 7 }, (_, i) => new Date(a, m - 1, d + i));
	});
	const mesAtual = $derived(`${data.ano}-${String(data.mes + 1).padStart(2, '0')}`);
	const diasComAcoes = $derived.by(() =>
		[...new Set<string>([...conteudosPorDia.keys(), ...tarefasPorDia.keys()])]
			.filter((k) => k.startsWith(mesAtual + '-'))
			.sort()
	);

	// --- URLs / navegação ---
	function href(o: { view?: string; mes?: string; semana?: string; cliente?: string | undefined }) {
		const p = new URLSearchParams();
		p.set('view', o.view ?? data.view);
		if (o.mes) p.set('mes', o.mes);
		if (o.semana) p.set('semana', o.semana);
		if (!clienteFixo) {
			const cli = 'cliente' in o ? o.cliente : data.clienteFiltro;
			if (cli) p.set('cliente', cli);
		}
		return basePath + '?' + p.toString();
	}
	function parseKey(k: string) {
		const [a, m, d] = k.split('-').map(Number);
		return new Date(a, m - 1, d);
	}
	function addDias(k: string, n: number) {
		const [a, m, d] = k.split('-').map(Number);
		return chaveDia(new Date(a, m - 1, d + n));
	}
	const semanaSwitch = $derived.by(() => {
		if (data.view === 'semana') return data.semanaInicio;
		const base = hojeKey.startsWith(mesAtual + '-') ? parseKey(hojeKey) : new Date(data.ano, data.mes, 1);
		return chaveDia(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1));
	});
	const navPrev = $derived(
		data.view === 'semana' ? href({ semana: addDias(data.semanaInicio, -7) }) : href({ mes: data.prev })
	);
	const navNext = $derived(
		data.view === 'semana' ? href({ semana: addDias(data.semanaInicio, 7) }) : href({ mes: data.next })
	);
	const navHoje = $derived(href({}));

	function trocarCliente(e: Event) {
		const v = (e.currentTarget as HTMLSelectElement).value;
		goto(
			href({
				cliente: v || undefined,
				mes: data.view !== 'semana' ? mesAtual : undefined,
				semana: data.view === 'semana' ? data.semanaInicio : undefined
			})
		);
	}

	function fmtData(k: string) {
		const [, m, d] = k.split('-');
		return `${d}/${m}`;
	}
	function diaLongo(k: string) {
		const [a, m, d] = k.split('-').map(Number);
		return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
			weekday: 'long',
			day: '2-digit',
			month: 'long'
		});
	}
	const periodoLabel = $derived.by(() => {
		if (data.view === 'semana' && diasDaSemana.length) {
			const f = (dt: Date, ano = false) =>
				dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...(ano ? { year: 'numeric' } : {}) });
			return `${f(diasDaSemana[0])} – ${f(diasDaSemana[6], true)}`;
		}
		return `${MESES[data.mes]} ${data.ano}`;
	});
</script>

{#snippet bandaCampanhas()}
	{#if data.campanhas.length}
		<div class="mb-3 flex flex-wrap gap-1.5">
			{#each data.campanhas as c (c.id)}
				<a
					href={`/campanhas/${c.id}`}
					title={`Campanha: ${c.nome}${semCliente && c.cliente_nome ? ' · ' + c.cliente_nome : ''}`}
					class="inline-flex items-center gap-1.5 rounded-full bg-brand-green/12 px-2.5 py-1 text-xs text-navy-900 no-underline transition-colors hover:bg-brand-green/20"
				>
					<span class="text-brand-green"><Icon name="tag" size={11} /></span>
					<span class="max-w-40 truncate font-semibold">{c.nome}</span>
					<span class="text-grey">{fmtData(c.data_inicio)}–{fmtData(c.data_fim)}</span>
					{#if semCliente && c.cliente_nome}<span class="text-slate">· {c.cliente_nome}</span>{/if}
				</a>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet pills(key: string, cap: number)}
	{@const itens = acoesDoDia(key)}
	{@const limite = cap && itens.length > cap ? cap - 1 : itens.length}
	{#each itens.slice(0, limite) as a (a.k + (a.k === 'c' ? a.c.id : a.t.id))}
		{#if a.k === 'c'}
			<div
				role="button"
				tabindex="0"
				draggable="true"
				ondragstart={(e) => {
					arrastando = a.c;
					e.dataTransfer?.setData('text/plain', a.c.id);
					if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
				}}
				ondragend={() => {
					arrastando = null;
					sobreDia = null;
				}}
				onclick={(e) => {
					e.stopPropagation();
					editando = a.c;
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						editando = a.c;
					}
				}}
				title={`${conteudoTipoLabel(a.c.tipo)} · ${conteudoStatusLabel(a.c.status)}${a.c.cliente_nome ? ' · ' + a.c.cliente_nome : ''}`}
				class="relative flex w-full cursor-grab flex-col gap-0.5 rounded-[var(--radius-sm)] border border-grey-200/70 bg-surface px-1.5 py-1 pr-5 text-left transition-colors hover:bg-bg active:cursor-grabbing"
			>
				<span class="flex items-baseline gap-1">
					<span class="truncate text-[0.68rem] font-semibold leading-tight text-navy-900">{a.c.titulo ?? conteudoTipoLabel(a.c.tipo)}</span>
					<span class="ml-auto shrink-0 tabular-nums text-[0.6rem] text-brand">{a.c.hora}</span>
				</span>
				<span class="flex items-center gap-1">
					<span class="inline-flex items-center rounded-full px-1 py-px text-[0.56rem] font-medium leading-tight {toneClasses[conteudoStatusTone(a.c.status)]}">{conteudoStatusLabel(a.c.status)}</span>
					{#if a.c.status !== 'programar' && a.c.status !== 'publicado'}
						<button
							type="button"
							onclick={(e) => definirStatusRapido(a.c, 'programar', e)}
							title="Marcar como Programar"
							aria-label="Marcar como Programar"
							class="size-3 shrink-0 rounded-full border border-brand-amber bg-brand-amber/30 transition-colors hover:bg-brand-amber"
						></button>
					{:else if a.c.status === 'programar'}
						<button
							type="button"
							onclick={(e) => definirStatusRapido(a.c, 'publicado', e)}
							title="Marcar como Publicado"
							aria-label="Marcar como Publicado"
							class="size-3 shrink-0 rounded-full border border-brand-green bg-brand-green/30 transition-colors hover:bg-brand-green"
						></button>
					{/if}
				</span>
				<span class="flex flex-wrap gap-0.5">
					{#each tiposDe(a.c) as tp (tp)}
						<span class="inline-flex items-center rounded-full bg-bg px-1 py-px text-[0.56rem] font-medium leading-tight text-slate">{conteudoTipoLabel(tp)}</span>
					{/each}
				</span>
				{#if semCliente && a.c.cliente_nome}
					<span class="flex items-center gap-0.5 truncate text-[0.56rem] leading-tight text-grey">
						<Icon name="building" size={9} /><span class="truncate">{a.c.cliente_nome}</span>
					</span>
				{/if}
				<button
					type="button"
					onclick={(e) => excluir(a.c, e)}
					title="Excluir conteúdo"
					aria-label="Excluir conteúdo"
					class="absolute bottom-1 right-1 grid size-4 place-items-center rounded-full bg-brand-danger/15 text-brand-danger transition-colors hover:bg-brand-danger hover:text-white"
				><Icon name="trash" size={9} /></button>
			</div>
		{:else}
			<a
				href="/tarefas"
				onclick={(e) => e.stopPropagation()}
				title={`Tarefa: ${a.t.titulo}${semCliente && a.t.cliente_nome ? ' · ' + a.t.cliente_nome : ''}`}
				class="flex items-center gap-1 truncate rounded-[var(--radius-sm)] bg-brand-amber/15 px-1.5 py-0.5 text-[0.64rem] font-medium text-brand-brown no-underline transition-colors hover:bg-brand-amber/25"
			>
				<Icon name="check" size={10} /><span class="truncate">{a.t.titulo}</span>
			</a>
		{/if}
	{/each}
	{#if cap && itens.length > cap}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				diaAberto = key;
			}}
			class="mt-auto text-left text-[0.7rem] font-medium text-grey hover:text-navy"
		>+{itens.length - limite} mais</button>
	{/if}
{/snippet}

{#if mostrarCabecalho}
	<div class="mb-4">
		<h1 class="text-base font-semibold text-navy">Calendário</h1>
		<p class="text-sm text-grey">Conteúdos, tarefas e campanhas do período.</p>
	</div>
{/if}

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<div class="inline-flex self-start rounded-full bg-bg p-0.5">
		{#each VIEWS as v (v.key)}
			<a
				href={href({
					view: v.key,
					mes: v.key !== 'semana' ? mesAtual : undefined,
					semana: v.key === 'semana' ? semanaSwitch : undefined
				})}
				aria-current={data.view === v.key ? 'page' : undefined}
				class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium no-underline transition-colors {data.view ===
				v.key
					? 'bg-surface text-navy shadow-sm'
					: 'text-grey hover:text-navy'}"
			>
				<Icon name={v.icon} size={15} />{v.label}
			</a>
		{/each}
	</div>

	{#if !clienteFixo}
		<Select value={data.clienteFiltro} onchange={trocarCliente} wrapperClass="w-full sm:w-60">
			<option value="">Todos os clientes</option>
			{#each data.clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
	{/if}
</div>

<div class="mb-4 flex items-center justify-between gap-2">
	<h2 class="text-sm font-semibold capitalize text-navy">{periodoLabel}</h2>
	<div class="flex gap-1">
		<Button size="sm" variant="secondary" onclick={() => goto(navPrev)} aria-label="Período anterior">‹</Button>
		<Button size="sm" variant="secondary" onclick={() => goto(navHoje)}>Hoje</Button>
		<Button size="sm" variant="secondary" onclick={() => goto(navNext)} aria-label="Próximo período">›</Button>
	</div>
</div>

{#if data.view === 'mes'}
	<Card>
		{@render bandaCampanhas()}
		<div class="mb-1.5 grid grid-cols-7 gap-1.5">
			{#each SEMANA as dia (dia)}
				<div class="text-center text-xs font-semibold uppercase tracking-wide text-grey">{dia}</div>
			{/each}
		</div>
		<div class="grid grid-cols-7 gap-1.5">
			{#each celulasDoMes as d (chaveDia(d))}
				{@const key = chaveDia(d)}
				{@const foraDoMes = d.getMonth() !== data.mes}
				<div
					role="button"
					tabindex="0"
					aria-label={`Ver agenda de ${key}`}
					onclick={() => (diaAberto = key)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							diaAberto = key;
						}
					}}
					ondragover={(e) => {
						if (!arrastando) return;
						e.preventDefault();
						sobreDia = key;
					}}
					ondragleave={() => {
						if (sobreDia === key) sobreDia = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						soltarEm(key);
					}}
					class="flex min-h-40 cursor-pointer flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1.5 text-left transition-colors hover:border-brand/50 {foraDoMes
						? 'border-grey-200/60 bg-bg'
						: 'border-grey-200 bg-surface'} {key === hojeKey ? 'ring-1 ring-brand' : ''} {arrastando &&
					sobreDia === key
						? 'border-brand ring-2 ring-brand/40'
						: ''}"
				>
					<div class="flex items-center justify-between leading-none">
						<span class="text-xs font-semibold {foraDoMes ? 'text-grey-200' : 'text-slate'}">{d.getDate()}</span>
						{#if !foraDoMes}
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									abrirNovo(key);
								}}
								title="Adicionar post"
								aria-label={`Adicionar post em ${key}`}
								class="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm transition-opacity hover:opacity-90"
							><Icon name="plus" size={13} /></button>
						{/if}
					</div>
					{@render pills(key, MAX_CELULA)}
				</div>
			{/each}
		</div>
	</Card>
{:else if data.view === 'semana'}
	<Card>
		{@render bandaCampanhas()}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-7">
			{#each diasDaSemana as d (chaveDia(d))}
				{@const key = chaveDia(d)}
				<div
					ondragover={(e) => {
						if (!arrastando) return;
						e.preventDefault();
						sobreDia = key;
					}}
					ondragleave={() => {
						if (sobreDia === key) sobreDia = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						soltarEm(key);
					}}
					class="flex min-h-20 flex-col gap-1 rounded-[var(--radius-sm)] border bg-surface p-2 md:min-h-40 {arrastando &&
					sobreDia === key
						? 'border-brand ring-2 ring-brand/40'
						: key === hojeKey
							? 'border-brand ring-1 ring-brand'
							: 'border-grey-200'}"
				>
					<div class="mb-1 flex items-baseline justify-between border-b border-grey-200/60 pb-1">
						<span class="text-xs font-semibold uppercase tracking-wide text-grey">{SEMANA[d.getDay()]}</span>
						<span class="flex items-center gap-1.5">
							<button
								type="button"
								onclick={() => abrirNovo(key)}
								title="Adicionar post"
								aria-label={`Adicionar post em ${key}`}
								class="grid size-5 shrink-0 place-items-center self-center rounded-full bg-brand text-white shadow-sm transition-opacity hover:opacity-90"
							><Icon name="plus" size={13} /></button>
							<span class="text-sm font-bold {key === hojeKey ? 'text-brand' : 'text-navy'}">{d.getDate()}</span>
						</span>
					</div>
					{@render pills(key, 0)}
				</div>
			{/each}
		</div>
	</Card>
{:else}
	{#if data.campanhas.length}
		<Card class="mb-4">
			<h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy">
				<Icon name="tag" size={14} /> Campanhas no período
			</h2>
			<div class="flex flex-col gap-1.5">
				{#each data.campanhas as c (c.id)}
					<a
						href={`/campanhas/${c.id}`}
						class="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[var(--radius)] bg-brand-green/10 px-3 py-2 text-sm no-underline transition-colors hover:bg-brand-green/15"
					>
						<span class="font-semibold text-navy-900">{c.nome}</span>
						<span class="text-grey">{fmtData(c.data_inicio)} – {fmtData(c.data_fim)}</span>
						{#if semCliente && c.cliente_nome}<span class="text-xs text-slate">· {c.cliente_nome}</span>{/if}
					</a>
				{/each}
			</div>
		</Card>
	{/if}
	<Card>
		{#if diasComAcoes.length === 0}
			<p class="text-sm text-grey">Nenhuma publicação ou tarefa neste mês.</p>
		{:else}
			<div class="flex flex-col divide-y divide-grey-200/60">
				{#each diasComAcoes as key (key)}
					<div class="py-3 first:pt-0 last:pb-0">
						<div class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey first-letter:uppercase">
							{diaLongo(key)}{key === hojeKey ? ' · hoje' : ''}
						</div>
						<div class="flex flex-col gap-1">
							{#each conteudosPorDia.get(key) ?? [] as c (c.id)}
								<a
									href={`/conteudo/${c.id}`}
									class="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1 text-sm no-underline transition-colors hover:bg-bg"
								>
									<span class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand/10 text-brand"><Icon name="edit" size={13} /></span>
									<span class="w-10 shrink-0 tabular-nums text-xs text-grey">{c.hora}</span>
									<span class="truncate text-navy">{c.titulo ?? conteudoTipoLabel(c.tipo)}</span>
									{#if semCliente && c.cliente_nome}<span class="ml-auto shrink-0 text-xs text-slate">{c.cliente_nome}</span>{/if}
								</a>
							{/each}
							{#each tarefasPorDia.get(key) ?? [] as t (t.id)}
								<a
									href="/tarefas"
									class="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1 text-sm no-underline transition-colors hover:bg-bg"
								>
									<span class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand-amber/15 text-brand-brown"><Icon name="check" size={13} /></span>
									<span class="w-10 shrink-0" aria-hidden="true"></span>
									<span class="truncate text-navy">{t.titulo}</span>
									{#if semCliente && t.cliente_nome}<span class="ml-auto shrink-0 text-xs text-slate">{t.cliente_nome}</span>{/if}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card>
{/if}

<Modal open={!!novoConteudo} title="Novo conteúdo" size="lg" onClose={() => (novoConteudo = null)}>
	{#if novoConteudo}
		<ConteudoForm
			action="/conteudo/novo"
			submitLabel="Criar conteúdo"
			clientes={data.clientes}
			projetos={data.projetos}
			colaboradores={data.colaboradores}
			conteudo={res?.values ?? novoConteudo}
			error={res?.error ?? null}
			onCancel={() => (novoConteudo = null)}
			onDone={aposCriar}
		/>
	{/if}
</Modal>

<Modal open={!!editando} title="Editar conteúdo" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ConteudoForm
			action={`/conteudo/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			projetos={data.projetos}
			colaboradores={data.colaboradores}
			conteudo={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
			onDelete={() => excluir(editando)}
		/>
	{/if}
</Modal>

<Modal open={!!diaAberto} title={diaAberto ? diaLongo(diaAberto) : ''} size="md" onClose={() => (diaAberto = null)}>
	{#if diaAberto}
		{@const cs = conteudosPorDia.get(diaAberto) ?? []}
		{@const ts = tarefasPorDia.get(diaAberto) ?? []}
		<div class="flex flex-col gap-3">
			{#if cs.length === 0 && ts.length === 0}
				<p class="text-sm text-grey">Nada programado neste dia.</p>
			{:else}
				<div class="flex flex-col gap-1.5">
					{#each cs as c (c.id)}
						<button
							type="button"
							onclick={() => editarDoDia(c)}
							class="flex w-full flex-col gap-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 text-left transition-colors hover:bg-bg"
						>
							<span class="flex items-center gap-2">
								<span class="shrink-0 tabular-nums text-xs text-brand">{c.hora}</span>
								<span class="truncate font-medium text-navy">{c.titulo ?? conteudoTipoLabel(c.tipo)}</span>
							</span>
							<span class="flex flex-wrap items-center gap-1">
								<span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium {toneClasses[conteudoStatusTone(c.status)]}">{conteudoStatusLabel(c.status)}</span>
								{#each tiposDe(c) as tp (tp)}
									<span class="inline-flex items-center rounded-full bg-bg px-1.5 py-0.5 text-[0.7rem] font-medium text-slate">{conteudoTipoLabel(tp)}</span>
								{/each}
								{#if semCliente && c.cliente_nome}<span class="inline-flex items-center gap-0.5 text-[0.7rem] text-grey"><Icon name="building" size={11} />{c.cliente_nome}</span>{/if}
							</span>
						</button>
					{/each}
					{#each ts as t (t.id)}
						<a
							href="/tarefas"
							class="flex items-center gap-2 rounded-[var(--radius)] bg-brand-amber/10 px-3 py-2 text-sm text-brand-brown no-underline transition-colors hover:bg-brand-amber/20"
						>
							<Icon name="check" size={13} /><span class="truncate">{t.titulo}</span>
							{#if semCliente && t.cliente_nome}<span class="ml-auto shrink-0 text-xs text-slate">{t.cliente_nome}</span>{/if}
						</a>
					{/each}
				</div>
			{/if}
			<Button onclick={novoNoDia}><Icon name="plus" size={15} /> Novo post</Button>
		</div>
	{/if}
</Modal>

<Modal
	open={!!moverCopiar}
	title="Mover ou copiar?"
	size="sm"
	onClose={() => !processando && (moverCopiar = null)}
>
	{#if moverCopiar}
		<p class="text-sm text-grey">
			<span class="font-medium text-navy">{moverCopiar.c.titulo ?? conteudoTipoLabel(moverCopiar.c.tipo)}</span>
			para <span class="font-medium text-navy">{diaLongo(moverCopiar.novaData)}</span> às {moverCopiar.c.hora}.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<Button variant="primary" loading={processando} onclick={() => executar('mover')}>Mover</Button>
			<Button variant="secondary" loading={processando} onclick={() => executar('copiar')}>Copiar</Button>
			<Button variant="ghost" onclick={() => (moverCopiar = null)}>Cancelar</Button>
		</div>
	{/if}
</Modal>

<div class="mt-4 flex flex-wrap items-center gap-4 text-xs text-grey">
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand"></span> Conteúdo</span>
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-amber"></span> Tarefa</span>
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-green"></span> Campanha</span>
</div>
