<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Card, Badge, Button } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { diasAte, formatDateBR } from '$lib/alertas';
	import { prioridadeTone, prioridadeLabel } from '$lib/tarefas';
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

	let editando = $state(false);
	let novos = $state<Record<number, string>>({});

	async function post(action: string, body: Record<string, string>): Promise<boolean> {
		const fd = new FormData();
		for (const [k, v] of Object.entries(body)) fd.set(k, v);
		try {
			const res = await fetch(`?/${action}`, {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});
			return res.ok;
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

	async function adicionar(dia: number) {
		const titulo = (novos[dia] ?? '').trim();
		if (!titulo) return;
		if (await post('criarItem', { cargo: data.rotina.cargoSel, dia_semana: String(dia), titulo })) {
			novos[dia] = '';
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

	/* ---------------- Tarefas / CRM (existente) ---------------- */
	const GRUPOS_T = [
		{ chave: 'atrasada', label: 'Atrasadas', tone: 'danger' as const },
		{ chave: 'hoje', label: 'Hoje', tone: 'warning' as const },
		{ chave: 'proxima', label: 'Em breve', tone: 'info' as const },
		{ chave: 'sem', label: 'Sem prazo', tone: 'neutral' as const }
	];
	function grupoTarefa(prazo: string | null): string {
		const d = diasAte(prazo);
		if (d === null) return 'sem';
		if (d < 0) return 'atrasada';
		if (d === 0) return 'hoje';
		return 'proxima';
	}
	const tarefasDo = $derived((k: string) => data.tarefas.filter((t) => grupoTarefa(t.prazo) === k));

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
		<div class="flex items-center gap-2">
			{#if data.rotina.cargos.length > 1}
				<select
					value={data.rotina.cargoSel}
					onchange={trocarCargo}
					class="rounded-[var(--radius)] border border-grey-200 bg-surface px-2.5 py-1.5 text-sm text-navy focus:border-brand focus:outline-none"
				>
					{#each data.rotina.cargos as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
				</select>
			{/if}
			<Button variant={editando ? 'primary' : 'secondary'} size="sm" onclick={() => (editando = !editando)}>
				<Icon name={editando ? 'check' : 'edit'} size={14} /> {editando ? 'Concluir edição' : 'Editar'}
			</Button>
		</div>
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
									<span
										class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors
											{feito ? 'border-brand-green bg-brand-green text-white' : 'border-grey-300 text-transparent'}"
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
				<span class="text-xs text-grey">Domingo → Sábado</span>
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
				{#each DIAS as d (d.idx)}
					{@const itens = itensPorDia[d.idx] ?? []}
					{@const ehHoje = d.idx === data.rotina.dia}
					<div class="rounded-[var(--radius)] p-2 {ehHoje ? 'bg-brand/5 ring-2 ring-brand/40' : 'bg-bg'}">
						<div class="mb-1.5 flex items-center justify-between px-0.5">
							<span class="text-xs font-semibold {ehHoje ? 'text-brand' : 'text-slate'}">{d.curto}</span>
							{#if ehHoje}<span class="rounded-full bg-brand px-1.5 text-[0.6rem] font-bold text-white">HOJE</span>{/if}
						</div>
						<div class="space-y-1">
							{#each itens as it (it.id)}
								{@const feito = ehHoje && feitos.has(it.id)}
								{#if editando}
									<div class="flex items-center gap-1 rounded-[var(--radius)] bg-surface px-1.5 py-1 shadow-xs">
										<input
											value={it.titulo}
											onchange={(e) => renomear(it.id, e.currentTarget.value)}
											class="min-w-0 flex-1 bg-transparent text-[0.7rem] text-navy focus:outline-none"
										/>
										<button type="button" onclick={() => excluir(it.id)} class="shrink-0 text-grey hover:text-brand-danger" aria-label="Excluir item" title="Excluir">
											<Icon name="trash" size={11} />
										</button>
									</div>
								{:else}
									<div class="rounded-[var(--radius)] bg-surface px-2 py-1.5 text-[0.72rem] leading-snug shadow-xs {feito ? 'text-grey line-through' : 'text-slate'}">
										{it.titulo}
									</div>
								{/if}
							{/each}

							{#if editando}
								<div class="flex items-center gap-1 rounded-[var(--radius)] border border-dashed border-grey-300 px-1.5 py-1">
									<input
										bind:value={novos[d.idx]}
										placeholder="+ item"
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												adicionar(d.idx);
											}
										}}
										class="min-w-0 flex-1 bg-transparent text-[0.7rem] text-navy placeholder:text-grey focus:outline-none"
									/>
									<button type="button" onclick={() => adicionar(d.idx)} class="shrink-0 text-brand hover:text-brand-600" aria-label="Adicionar item" title="Adicionar">
										<Icon name="plus" size={12} />
									</button>
								</div>
							{:else if !itens.length}
								<p class="px-1 py-1.5 text-[0.68rem] text-grey/70">—</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			{#if editando}
				<p class="mt-2 text-xs text-grey">Editando a rotina de <strong>{data.rotina.cargoLabel}</strong>. As mudanças valem para todos desse cargo.</p>
			{/if}
		</Card>
	</div>
</section>

<!-- ===================== TAREFAS / CRM ===================== -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
	<!-- Tarefas -->
	<Card padding="none" class="overflow-hidden">
		<div class="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-grey-200">
			<h2 class="font-semibold text-navy flex items-center gap-2"><Icon name="check" size={16} /> Tarefas</h2>
			<a class="text-xs text-brand hover:underline" href="/tarefas">Ver Kanban</a>
		</div>
		<div class="p-3">
			{#if !data.tarefas.length}
				<p class="px-2 py-8 text-center text-sm text-grey">Nenhuma tarefa em aberto. 🎉</p>
			{:else}
				{#each GRUPOS_T as g (g.chave)}
					{@const itens = tarefasDo(g.chave)}
					{#if itens.length}
						<div class="mb-2 last:mb-0">
							<div class="flex items-center gap-2 px-2 mb-1">
								<span class="text-xs uppercase tracking-wide font-semibold text-grey">{g.label}</span>
								<Badge tone={g.tone}>{itens.length}</Badge>
							</div>
							{#each itens as t (t.id)}
								<div class="flex items-start justify-between gap-2 px-2 py-2 rounded-[var(--radius)] hover:bg-bg">
									<div class="min-w-0">
										<div class="text-sm text-navy">{t.titulo}</div>
										<div class="text-xs text-grey truncate">
											{t.projeto_nome ?? 'Sem projeto'}{t.prazo ? ` · ${formatDateBR(t.prazo)}` : ''}
										</div>
									</div>
									<Badge tone={prioridadeTone(t.prioridade)}>{prioridadeLabel(t.prioridade)}</Badge>
								</div>
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
			<a class="text-xs text-brand hover:underline" href="/crm">Abrir CRM</a>
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
