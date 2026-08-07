<script lang="ts">
	// Calendário editorial: mês, semana e lista, com arrastar-e-soltar entre dias.
	// O desenho de cada post está em calendario/PostCard, e as duas janelas
	// (agenda do dia e mover/copiar) são componentes — aqui fica a grade e o
	// estado que elas compartilham.
	import { goto, invalidateAll } from '$app/navigation';
	import { Card, Button, Select, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	import PostCard from '$lib/components/calendario/PostCard.svelte';
	import AgendaDia from '$lib/components/calendario/AgendaDia.svelte';
	import MoverOuCopiar from '$lib/components/calendario/MoverOuCopiar.svelte';
	import {
		SEMANA,
		MESES,
		addDias,
		chaveDia,
		celulasMes,
		colunaSemana,
		diaLongo,
		inicioDaSemana,
		parseChave
	} from '$lib/calendario';
	import { conteudoTipoLabel, conteudoStatusLabel } from '$lib/conteudo';
	import { chamarAction } from '$lib/acoesRemotas';
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
		novoConteudo = {
			data_publicacao: dt.toISOString(),
			cliente_id: data.clienteFiltro || clienteFixo || ''
		};
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
		// Sem o finally, uma queda de rede deixava `processando` travado em true e o
		// calendário parava de aceitar qualquer ação até recarregar a página.
		try {
			const ok = await chamarAction(
				`${ACTION}?/excluir`,
				{ id: c.id },
				{ ok: 'Conteúdo excluído', erro: 'Falha ao excluir' }
			);
			if (ok && editando?.id === c.id) editando = null;
		} finally {
			processando = false;
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
		try {
			await chamarAction(
				`${ACTION}?/${acao}`,
				{ id: alvo.c.id, data_publicacao: alvo.novaISO },
				{ ok: acao === 'mover' ? 'Post movido' : 'Post copiado', erro: 'Falha na operação' }
			);
		} finally {
			processando = false;
			moverCopiar = null;
		}
	}

	// Ação rápida: mudar o status pelo card (bolinhas ao lado do status).
	async function definirStatusRapido(c: Record<string, any>, status: string, e?: Event) {
		e?.stopPropagation();
		if (c.status === status) return;
		await chamarAction(
			`${ACTION}?/definirStatus`,
			{ id: c.id, status },
			{ ok: `Status: ${conteudoStatusLabel(status)}`, erro: 'Falha ao alterar status' }
		);
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

	// As três visões do Calendário Editorial, todas sobre o mesmo período.
	const VIEWS = [
		{ key: 'mes', label: 'Mês', icon: 'calendar' },
		{ key: 'semana', label: 'Semana', icon: 'calendar' },
		{ key: 'lista', label: 'Conteúdos', icon: 'clipboard' }
	] as const;

	const MAX_CELULA = 3;

	const conteudosPorDia = $derived.by(() => {
		const m = new Map<string, Record<string, any>[]>();
		for (const c of data.conteudos) {
			const arr = m.get(c.dia) ?? [];
			arr.push(c);
			m.set(c.dia, arr);
		}
		return m;
	});
	const doDia = (key: string) => conteudosPorDia.get(key) ?? [];

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
		[...conteudosPorDia.keys()].filter((k) => k.startsWith(mesAtual + '-')).sort()
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
	// Ao trocar para a aba Semana: a semana (segunda→domingo) de hoje, ou a da
	// primeira semana do mês que está sendo visto.
	const semanaSwitch = $derived.by(() => {
		if (data.view === 'semana') return data.semanaInicio;
		const base = hojeKey.startsWith(mesAtual + '-')
			? parseChave(hojeKey)
			: new Date(data.ano, data.mes, 1);
		return chaveDia(inicioDaSemana(base));
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

	const periodoLabel = $derived.by(() => {
		if (data.view === 'semana' && diasDaSemana.length) {
			const f = (dt: Date, ano = false) =>
				dt.toLocaleDateString('pt-BR', {
					day: '2-digit',
					month: 'short',
					...(ano ? { year: 'numeric' } : {})
				});
			return `${f(diasDaSemana[0])} – ${f(diasDaSemana[6], true)}`;
		}
		return `${MESES[data.mes]} ${data.ano}`;
	});

	/** Handlers de solta, iguais nas visões mês e semana. */
	function dropProps(key: string) {
		return {
			ondragover: (e: DragEvent) => {
				if (!arrastando) return;
				e.preventDefault();
				sobreDia = key;
			},
			ondragleave: () => {
				if (sobreDia === key) sobreDia = null;
			},
			ondrop: (e: DragEvent) => {
				e.preventDefault();
				soltarEm(key);
			}
		};
	}
</script>

<!-- Os posts do dia; `cap` limita quantos cabem na célula do mês. -->
{#snippet pills(key: string, cap: number)}
	{@const itens = doDia(key)}
	{@const limite = cap && itens.length > cap ? cap - 1 : itens.length}
	{#each itens.slice(0, limite) as c (c.id)}
		<PostCard
			conteudo={c}
			mostrarCliente={semCliente}
			onAbrir={() => (editando = c)}
			onExcluir={(e) => excluir(c, e)}
			onStatus={(status, e) => definirStatusRapido(c, status, e)}
			onDragStart={(e) => {
				arrastando = c;
				e.dataTransfer?.setData('text/plain', c.id);
				if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
			}}
			onDragEnd={() => {
				arrastando = null;
				sobreDia = null;
			}}
		/>
	{/each}
	{#if cap && itens.length > cap}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				diaAberto = key;
			}}
			class="mt-auto text-left text-[0.7rem] font-medium text-grey hover:text-navy"
			>+{itens.length - limite} mais</button
		>
	{/if}
{/snippet}

{#if mostrarCabecalho}
	<div class="mb-4">
		<h1 class="text-base font-semibold text-navy">Calendário</h1>
		<p class="text-sm text-grey">Conteúdos do período.</p>
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
		<Select
			value={data.clienteFiltro}
			onchange={trocarCliente}
			aria-label="Filtrar por cliente"
			wrapperClass="w-full sm:w-60"
		>
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
		<div class="mb-1.5 grid grid-cols-7 gap-1.5">
			{#each SEMANA as dia (dia)}
				<div class="text-center text-xs font-semibold uppercase tracking-wide text-grey">{dia}</div>
			{/each}
		</div>
		<div class="grid grid-cols-7 gap-1.5">
			{#each celulasDoMes as d (chaveDia(d))}
				{@const key = chaveDia(d)}
				{@const foraDoMes = d.getMonth() !== data.mes}
				<!-- Container NEUTRO: o botão "Ver agenda" cobre a célula por baixo do
				     conteúdo (isolate + -z-10) e os botões de ação (＋, pílulas) são IRMÃOS
				     dele, não filhos — sem interativo aninhado e navegável por teclado. -->
				<div
					role="group"
					aria-label={`Dia ${key}`}
					{...dropProps(key)}
					class="relative isolate flex min-h-40 cursor-pointer flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1.5 text-left transition-colors hover:border-brand/50 {foraDoMes
						? 'border-grey-200/60 bg-bg'
						: 'border-grey-200 bg-surface'} {key === hojeKey ? 'ring-1 ring-brand' : ''} {arrastando &&
					sobreDia === key
						? 'border-brand ring-2 ring-brand/40'
						: ''}"
				>
					<button
						type="button"
						aria-label={`Ver agenda de ${key}`}
						onclick={() => (diaAberto = key)}
						class="absolute inset-0 -z-10 cursor-pointer rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60"
					></button>
					<!-- pointer-events-none: o clique no número do dia atravessa e cai no
					     botão de fundo, mantendo o comportamento de "clicar em qualquer
					     lugar abre o dia". -->
					<div class="pointer-events-none flex items-center justify-between leading-none">
						<span class="text-xs font-semibold {foraDoMes ? 'text-grey-200' : 'text-slate'}">
							{d.getDate()}
						</span>
						{#if !foraDoMes}
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									abrirNovo(key);
								}}
								title="Adicionar post"
								aria-label={`Adicionar post em ${key}`}
								class="pointer-events-auto relative grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm transition-opacity after:absolute after:-inset-2 after:content-[''] hover:opacity-90"
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
		<div class="grid grid-cols-1 gap-2 md:grid-cols-7">
			{#each diasDaSemana as d (chaveDia(d))}
				{@const key = chaveDia(d)}
				<div
					role="group"
					aria-label={`Dia ${key}`}
					{...dropProps(key)}
					class="flex min-h-20 flex-col gap-1 rounded-[var(--radius-sm)] border bg-surface p-2 md:min-h-40 {arrastando &&
					sobreDia === key
						? 'border-brand ring-2 ring-brand/40'
						: key === hojeKey
							? 'border-brand ring-1 ring-brand'
							: 'border-grey-200'}"
				>
					<div class="mb-1 flex items-baseline justify-between border-b border-grey-200/60 pb-1">
						<span class="text-xs font-semibold uppercase tracking-wide text-grey">
							{SEMANA[colunaSemana(d)]}
						</span>
						<span class="flex items-center gap-1.5">
							<button
								type="button"
								onclick={() => abrirNovo(key)}
								title="Adicionar post"
								aria-label={`Adicionar post em ${key}`}
								class="grid size-5 shrink-0 place-items-center self-center rounded-full bg-brand text-white shadow-sm transition-opacity hover:opacity-90"
							><Icon name="plus" size={13} /></button>
							<span class="text-sm font-bold {key === hojeKey ? 'text-brand' : 'text-navy'}">
								{d.getDate()}
							</span>
						</span>
					</div>
					{@render pills(key, 0)}
				</div>
			{/each}
		</div>
	</Card>
{:else}
	<Card>
		{#if diasComAcoes.length === 0}
			<p class="text-sm text-grey">Nenhuma publicação neste mês.</p>
		{:else}
			<div class="flex flex-col divide-y divide-grey-200/60">
				{#each diasComAcoes as key (key)}
					<div class="py-3 first:pt-0 last:pb-0">
						<div
							class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey first-letter:uppercase"
						>
							{diaLongo(key)}{key === hojeKey ? ' · hoje' : ''}
						</div>
						<div class="flex flex-col gap-1">
							{#each doDia(key) as c (c.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
								<div
									onclick={() => editarDoDia(c)}
									class="group flex cursor-pointer items-center gap-2 rounded-[var(--radius)] px-2 py-1 text-sm transition-colors hover:bg-bg"
								>
									<span
										class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand/10 text-brand"
									><Icon name="edit" size={13} /></span>
									<span class="w-10 shrink-0 tabular-nums text-xs text-grey">{c.hora}</span>
									<span class="min-w-0 flex-1 truncate text-navy">
										{c.titulo ?? conteudoTipoLabel(c.tipo)}
									</span>
									{#if semCliente && c.cliente_nome}
										<span class="shrink-0 text-xs text-slate">{c.cliente_nome}</span>
									{/if}
									<button
										type="button"
										onclick={(e) => excluir(c, e)}
										class="shrink-0 text-grey/70 transition-colors hover:text-brand-danger"
										title="Excluir conteúdo"
										aria-label="Excluir conteúdo"
									>
										<Icon name="trash" size={14} />
									</button>
								</div>
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
			campanhas={data.campanhasNomes ?? []}
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
			campanhas={data.campanhasNomes ?? []}
			conteudo={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
			onDelete={() => excluir(editando)}
		/>
	{/if}
</Modal>

<AgendaDia
	bind:dia={diaAberto}
	conteudos={diaAberto ? doDia(diaAberto) : []}
	mostrarCliente={semCliente}
	onEditar={editarDoDia}
	onNovo={novoNoDia}
/>

<MoverOuCopiar
	alvo={moverCopiar}
	{processando}
	onEscolher={executar}
	onCancelar={() => (moverCopiar = null)}
/>

<div class="mt-4 flex flex-wrap items-center gap-4 text-xs text-grey">
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand"></span> Conteúdo</span>
</div>
