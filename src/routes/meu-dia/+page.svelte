<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Card, Badge, Button, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { diasAte, formatDateBR } from '$lib/alertas';
	import { conteudoTipoLabel, conteudoStatusLabel, conteudoStatusTone } from '$lib/conteudo';
	import { atividadeTipo, formatDataHora, vencimentoDe, vencimentoTone } from '$lib/crm';
	import { DIAS, porDia } from '$lib/rotina';
	import { toast } from '$lib/toast.svelte';

	let { data } = $props();

	/* ---------------- Mapa de Rotina ---------------- */
	const itensPorDia = $derived(porDia(data.rotina.itens));
	const hojeItens = $derived(itensPorDia[data.rotina.dia] ?? []);
	const diaHoje = $derived(DIAS[data.rotina.dia]);

	let feitos = $state(new Set<string>(data.rotina.feitos));
	$effect(() => {
		feitos = new Set(data.rotina.feitos);
	});
	const feitosHoje = $derived(hojeItens.filter((i) => feitos.has(i.id)).length);
	const progresso = $derived(hojeItens.length ? Math.round((feitosHoje / hojeItens.length) * 100) : 0);

	// Modal de um dia (visualizar / gerenciar os itens daquele dia).
	let diaModal = $state<number | null>(null);
	let novoItem = $state('');
	const itensModal = $derived(diaModal !== null ? (itensPorDia[diaModal] ?? []) : []);
	function abrirDia(dia: number) {
		diaModal = dia;
		novoItem = '';
	}

	// O SvelteKit responde `fail()` com HTTP 200 e o erro no corpo — `res.ok` seria
	// true mesmo com a action falhando, e todo o Mapa de Rotina marcava/renomeava
	// só na tela. É preciso desserializar e checar o tipo do resultado.
	async function post(action: string, body: Record<string, string>): Promise<boolean> {
		const fd = new FormData();
		for (const [k, v] of Object.entries(body)) fd.set(k, v);
		try {
			const res = await fetch(`?/${action}`, {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});
			return deserialize(await res.text()).type === 'success';
		} catch {
			return false;
		}
	}

	async function toggle(id: string) {
		if (data.semColaborador) {
			toast.error('Vincule seu login a um colaborador (em Equipe) para marcar sua rotina.');
			return;
		}
		const novo = new Set(feitos);
		novo.has(id) ? novo.delete(id) : novo.add(id);
		feitos = novo;
		if (!(await post('toggleRotina', { item_id: id }))) {
			const rollback = new Set(feitos);
			rollback.has(id) ? rollback.delete(id) : rollback.add(id);
			feitos = rollback;
			toast.error('Não foi possível salvar. Tente de novo.');
		}
	}

	async function adicionar() {
		if (diaModal === null) return;
		const titulo = novoItem.trim();
		if (!titulo) return;
		if (await post('criarItem', { cargo: data.rotina.cargoSel, dia_semana: String(diaModal), titulo })) {
			novoItem = '';
			await invalidateAll();
		} else toast.error('Não foi possível adicionar.');
	}

	async function renomear(id: string, titulo: string) {
		const t = titulo.trim();
		if (!t) return;
		if (!(await post('editarItem', { id, titulo: t }))) toast.error('Não foi possível salvar a alteração.');
	}

	async function excluir(id: string) {
		if (await post('excluirItem', { id })) await invalidateAll();
		else toast.error('Não foi possível excluir.');
	}

	function trocarCargo(e: Event) {
		const cargo = (e.currentTarget as HTMLSelectElement).value;
		goto(`/meu-dia?cargo=${encodeURIComponent(cargo)}`, { keepFocus: true });
	}

	/* ---------------- Publicações / CRM ---------------- */
	const GRUPOS_P = [
		{ chave: 'atrasada', label: 'Atrasadas', tone: 'danger' as const },
		{ chave: 'hoje', label: 'Hoje', tone: 'warning' as const },
		{ chave: 'proxima', label: 'Em breve', tone: 'info' as const }
	];
	function grupoPublicacao(data_publicacao: string): string {
		const d = diasAte(data_publicacao.slice(0, 10));
		if (d === null) return 'proxima';
		if (d < 0) return 'atrasada';
		if (d === 0) return 'hoje';
		return 'proxima';
	}
	const publicacoesDo = $derived((k: string) =>
		data.publicacoes.filter((c) => grupoPublicacao(c.data_publicacao) === k)
	);
	function horaDe(iso: string) {
		return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
	}

	const GRUPOS_A = [
		{ chave: 'atrasada', label: 'Atrasadas' },
		{ chave: 'hoje', label: 'Hoje' },
		{ chave: 'em_breve', label: 'Esta semana' },
		{ chave: 'futura', label: 'Depois' },
		{ chave: 'sem_data', label: 'Sem data' }
	];
	const ativDo = $derived((k: string) => data.atividades.filter((a) => vencimentoDe(a.data_hora) === k));
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Meu Dia{data.nome ? ` · ${data.nome}` : ''}</h1>
	<p class="text-sm text-grey">Sua rotina de hoje e o que está em aberto, tudo num lugar só.</p>
</div>

{#if data.semColaborador}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Seu login ainda não está vinculado a um colaborador — mostrando itens de toda a equipe. Vincule em
		<a class="underline" href="/equipe">Equipe</a> para ver só o que é seu.
	</div>
{/if}

<!-- ===================== MAPA DE ROTINA ===================== -->
<section class="mb-5">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 font-semibold text-navy">
			<Icon name="map" size={16} /> Mapa de Rotina
			<span class="text-sm font-normal text-grey">· {data.rotina.cargoLabel}</span>
		</h2>
		{#if data.rotina.podeGerenciar && data.rotina.cargos.length > 1}
			<select
				value={data.rotina.cargoSel}
				onchange={trocarCargo}
				aria-label="Ver mapa de rotina de outro cargo"
				class="rounded-[var(--radius)] border border-grey-200 bg-surface px-2.5 py-1.5 text-sm text-navy focus:border-brand focus:outline-none"
			>
				{#each data.rotina.cargos as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
			</select>
		{/if}
	</div>

	<div class="space-y-4">
		<!-- HERO: Hoje (checklist) — largura inteira -->
		<Card padding="none" class="overflow-hidden">
			<div class="bg-gradient-to-br from-brand to-brand-600 px-5 py-4 text-white">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-white/80">Hoje · {diaHoje.nome}</p>
						<p class="text-sm text-white/90">{formatDateBR(data.rotina.dataHoje)}</p>
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold tabular-nums">{feitosHoje}<span class="text-base font-medium text-white/70">/{hojeItens.length}</span></div>
						<div class="text-xs text-white/80">{progresso}% feito</div>
					</div>
				</div>
				<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
					<div class="h-full rounded-full bg-white transition-[width] duration-300" style={`width:${progresso}%`}></div>
				</div>
			</div>

			<div class="p-3">
				{#if hojeItens.length}
					<ul class="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
						{#each hojeItens as it (it.id)}
							{@const feito = feitos.has(it.id)}
							<li>
								<button
									type="button"
									onclick={() => toggle(it.id)}
									class="flex w-full items-start gap-3 rounded-[var(--radius)] px-2.5 py-2 text-left transition-colors hover:bg-bg"
								>
									<!-- Pendente: bolinha de borda laranja e miolo laranja bem claro.
									     Feita: o certo dentro de uma bolinha verde clara. A borda era
									     `border-grey-300`, cor que NÃO existe no tema — sem cor ela cai
									     em currentColor, que aqui é text-transparent, e a bolinha
									     inteira ficava invisível. -->
									<span
										class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors
											{feito
												? 'border-brand-green bg-brand-green/15 text-brand-green'
												: 'border-brand-amber bg-brand-amber/10 text-transparent'}"
									>
										<Icon name="check" size={12} />
									</span>
									<span class="text-sm {feito ? 'text-grey line-through' : 'text-navy'}">{it.titulo}</span>
								</button>
							</li>
						{/each}
					</ul>
					{#if feitosHoje === hojeItens.length}
						<p class="mt-2 rounded-[var(--radius)] bg-brand-green/10 px-3 py-2 text-center text-sm font-medium text-brand-green">
							Rotina de hoje concluída! 🎉
						</p>
					{/if}
				{:else}
					<p class="px-2 py-10 text-center text-sm text-grey">
						{data.rotina.dia === 0 ? 'Domingo é dia de descanso. 😌' : 'Sem rotina cadastrada para hoje.'}
					</p>
				{/if}
			</div>
		</Card>

		<!-- SEMANA -->
		<Card padding="sm">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-navy">A semana</h3>
				<span class="text-xs text-grey">Clique num dia para {data.rotina.podeGerenciar ? 'ver / editar' : 'ver'}</span>
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:[grid-template-columns:0.34fr_repeat(6,minmax(0,1fr))]">
				{#each DIAS as d (d.idx)}
					{@const itens = itensPorDia[d.idx] ?? []}
					{@const ehHoje = d.idx === data.rotina.dia}
					<!-- `flex flex-col` é o que alinha os cabeçalhos: <button> nativo
					     centraliza o próprio conteúdo verticalmente, e como o grid estica
					     todos os blocos para a mesma altura, o nome do dia descia conforme
					     a coluna tinha menos itens (o domingo, vazio, ficava no meio). -->
					<button
						type="button"
						onclick={() => abrirDia(d.idx)}
						class="flex flex-col rounded-[var(--radius)] p-2 text-left transition-colors {ehHoje
							? 'bg-brand/5 ring-2 ring-brand/40'
							: 'bg-bg hover:bg-grey-200/50'}"
					>
						<!-- Altura fixa e sem quebra: o selo HOJE não pode empurrar o
						     cabeçalho para uma segunda linha e desalinhar só essa coluna. -->
						<div class="mb-1.5 flex h-5 shrink-0 items-center gap-1.5 px-0.5">
							<span class="text-xs font-semibold {ehHoje ? 'text-brand' : 'text-slate'}">{d.curto}</span>
							{#if ehHoje}<span class="shrink-0 rounded-full bg-brand px-1.5 py-px text-[0.6rem] leading-none font-bold text-white">HOJE</span>{/if}
							{#if itens.length}
								<span class="ml-auto shrink-0 text-[0.65rem] tabular-nums {ehHoje ? 'text-brand/70' : 'text-grey'}">{itens.length}</span>
							{/if}
						</div>
						<div class="flex-1 space-y-1">
							{#each itens as it (it.id)}
								{@const feito = ehHoje && feitos.has(it.id)}
								<div class="rounded-[var(--radius)] bg-surface px-2 py-1.5 text-[0.72rem] leading-snug shadow-xs {feito ? 'text-grey line-through' : 'text-slate'}">
									{it.titulo}
								</div>
							{/each}
							{#if !itens.length}
								<p class="px-1 py-1.5 text-[0.68rem] text-grey/70">Sem rotina</p>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</Card>
	</div>
</section>

<!-- Modal do dia: visualizar / gerenciar itens -->
<Modal
	open={diaModal !== null}
	title={diaModal !== null ? `${DIAS[diaModal].nome} · ${data.rotina.cargoLabel}` : ''}
	onClose={() => (diaModal = null)}
>
	{#if diaModal !== null}
		{#if itensModal.length}
			<ul class="space-y-2">
				{#each itensModal as it (it.id)}
					<li class="flex items-center gap-2">
						{#if data.rotina.podeGerenciar}
							<input
								value={it.titulo}
								onblur={(e) => renomear(it.id, e.currentTarget.value)}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										e.currentTarget.blur();
									}
								}}
								class="min-w-0 flex-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 text-sm text-navy focus:border-brand focus:outline-none"
							/>
							<button
								type="button"
								onclick={() => excluir(it.id)}
								class="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
								title="Excluir item"
								aria-label="Excluir item"
							>
								<Icon name="trash" size={16} />
							</button>
						{:else}
							<div class="flex-1 rounded-[var(--radius)] bg-bg px-3 py-2 text-sm text-slate">{it.titulo}</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-6 text-center text-sm text-grey">Nenhum item para {DIAS[diaModal].nome}.</p>
		{/if}

		{#if data.rotina.podeGerenciar}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					adicionar();
				}}
				class="mt-4 flex items-center gap-2 border-t border-grey-200 pt-4"
			>
				<input
					bind:value={novoItem}
					placeholder="Adicionar novo item…"
					class="min-w-0 flex-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 text-sm text-navy focus:border-brand focus:outline-none"
				/>
				<Button type="submit" size="sm" disabled={!novoItem.trim()}>
					<Icon name="plus" size={15} /> Adicionar
				</Button>
			</form>
			<p class="mt-2 text-xs text-grey">As mudanças valem para todos do cargo <strong>{data.rotina.cargoLabel}</strong>.</p>
		{/if}
	{/if}
</Modal>

<!-- ===================== TAREFAS / CRM ===================== -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
	<!-- Próximas publicações (substituiu o bloco de Tarefas, aposentado) -->
	<Card padding="none" class="overflow-hidden">
		<div class="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-grey-200">
			<h2 class="font-semibold text-navy flex items-center gap-2">
				<Icon name="calendar" size={16} /> Próximas publicações
			</h2>
			<a class="text-xs text-brand hover:underline" href="/calendario">Abrir calendário</a>
		</div>
		<div class="p-3">
			{#if !data.publicacoes.length}
				<p class="px-2 py-8 text-center text-sm text-grey">Nada programado para você. 🎉</p>
			{:else}
				{#each GRUPOS_P as g (g.chave)}
					{@const itens = publicacoesDo(g.chave)}
					{#if itens.length}
						<div class="mb-2 last:mb-0">
							<div class="mb-1 flex items-center gap-2 px-2">
								<span class="text-xs font-semibold uppercase tracking-wide text-grey">{g.label}</span>
								<Badge tone={g.tone}>{itens.length}</Badge>
							</div>
							{#each itens as c (c.id)}
								<a
									href={`/conteudo/${c.id}`}
									class="flex items-start justify-between gap-2 rounded-[var(--radius)] px-2 py-2 no-underline hover:bg-bg"
								>
									<div class="min-w-0">
										<div class="truncate text-sm text-navy">{c.titulo || conteudoTipoLabel(c.tipo)}</div>
										<div class="truncate text-xs text-grey">
											{formatDateBR(c.data_publicacao.slice(0, 10))} · {horaDe(c.data_publicacao)}{c.cliente_nome
												? ` · ${c.cliente_nome}`
												: ''}
										</div>
									</div>
									<Badge tone={conteudoStatusTone(c.status)}>{conteudoStatusLabel(c.status)}</Badge>
								</a>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</Card>

	<!-- Atividades do CRM -->
	<Card padding="none" class="overflow-hidden">
		<div class="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-grey-200">
			<h2 class="font-semibold text-navy flex items-center gap-2"><Icon name="funnel" size={16} /> Atividades do CRM</h2>
			<a class="text-xs text-brand hover:underline" href="/comercial">Abrir Comercial</a>
		</div>
		<div class="p-3">
			{#if !data.atividades.length}
				<p class="px-2 py-8 text-center text-sm text-grey">Nenhuma atividade pendente.</p>
			{:else}
				{#each GRUPOS_A as g (g.chave)}
					{@const itens = ativDo(g.chave)}
					{#if itens.length}
						<div class="mb-2 last:mb-0">
							<div class="flex items-center gap-2 px-2 mb-1">
								<span class="text-xs uppercase tracking-wide font-semibold text-grey">{g.label}</span>
								<span class="text-xs text-grey">({itens.length})</span>
							</div>
							{#each itens as a (a.id)}
								{@const tp = atividadeTipo(a.tipo)}
								<div class="flex items-start gap-2.5 px-2 py-2 rounded-[var(--radius)] hover:bg-bg">
									<span class="mt-0.5 text-slate shrink-0" title={tp.label}><Icon name={tp.icon} size={15} /></span>
									<div class="min-w-0 flex-1">
										<div class="text-sm text-navy">{a.titulo || tp.label}</div>
										<div class="text-xs text-grey truncate">
											{a.negocio_titulo ?? a.contato_nome ?? '—'}
										</div>
									</div>
									{#if a.data_hora}
										<Badge tone={vencimentoTone(vencimentoDe(a.data_hora))}>{formatDataHora(a.data_hora)}</Badge>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</Card>
</div>
