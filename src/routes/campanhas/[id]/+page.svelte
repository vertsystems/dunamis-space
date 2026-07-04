<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/toast.svelte';
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { SEMANA, MESES, chaveDia, celulasMes } from '$lib/calendario';
	import {
		conteudoStatusTone,
		conteudoStatusLabel,
		conteudoTipoLabel,
		CONTEUDO_TIPO,
		CONTEUDO_STATUS,
		CONTEUDO_REDE
	} from '$lib/conteudo';
	import { Card, Button, Breadcrumb, Modal, Input, Select, toneClasses } from '$lib/components/ui';

	let { data, form } = $props();
	let campanha = $derived(form?.values ?? data.campanha);
	let confirmDelete = $state(false);

	// --- Calendário de conteúdos (só quando a campanha tem início e fim) ---
	const cal = $derived(data.calendario);
	const celulas = $derived(cal ? celulasMes(cal.ano, cal.mes) : []);
	const porDia = $derived.by(() => {
		const map = new Map<string, NonNullable<typeof cal>['conteudos']>();
		if (!cal) return map;
		for (const c of cal.conteudos) {
			if (!c.data_publicacao) continue;
			const k = chaveDia(new Date(c.data_publicacao));
			const arr = map.get(k) ?? [];
			arr.push(c);
			map.set(k, arr);
		}
		return map;
	});
	const hojeKey = chaveDia(new Date());

	// Dia dentro do período da campanha? (datas são 'AAAA-MM-DD' → comparação de string).
	function naCampanha(k: string): boolean {
		const ini = data.campanha.data_inicio;
		const fim = data.campanha.data_fim;
		return !!ini && !!fim && k >= ini && k <= fim;
	}

	function horaCurta(iso: string | null) {
		return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
	}

	// --- Modal de agendamento rápido de conteúdo ---
	const HORARIOS = ['08:00', '09:00', '10:00', '12:00', '15:00', '18:00', '19:00', '20:00'];

	let modalAberto = $state(false);
	let diaSelecionado = $state(''); // 'AAAA-MM-DD'
	let hora = $state('09:00');
	let redes = $state<string[]>([]);
	let salvando = $state(false);

	function toggleRede(v: string) {
		redes = redes.includes(v) ? redes.filter((r) => r !== v) : [...redes, v];
	}

	function abrirAgendar(k: string) {
		diaSelecionado = k;
		hora = '09:00';
		redes = ['instagram'];
		modalAberto = true;
	}

	// Rótulo amigável do dia escolhido ("segunda-feira, 15 de julho").
	const diaLabel = $derived.by(() => {
		if (!diaSelecionado) return '';
		const [a, m, d] = diaSelecionado.split('-').map(Number);
		return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
			weekday: 'long',
			day: '2-digit',
			month: 'long'
		});
	});
</script>

<Breadcrumb items={[{ label: 'Campanhas', href: '/campanhas' }, { label: data.campanha.nome }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Campanha salva com sucesso.</div>
{/if}

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">{data.campanha.nome}</h1>
	<CampanhaForm {campanha} clientes={data.clientes} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</Card>

{#if cal}
	<Card class="mt-6">
		<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
			<div>
				<h2 class="text-base font-semibold text-navy">Calendário de conteúdos</h2>
				<p class="text-xs text-grey">Dias da campanha em destaque — clique no + de um dia para agendar um conteúdo.</p>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-navy tabular-nums whitespace-nowrap">{MESES[cal.mes]} {cal.ano}</span>
				<div class="flex gap-1">
					<Button size="sm" variant="secondary" onclick={() => goto(`?cal=${cal.prev}`)} aria-label="Mês anterior">‹</Button>
					{#if cal.atual !== cal.inicioMes}
						<Button size="sm" variant="secondary" onclick={() => goto(`?cal=${cal.inicioMes}`)}>Início</Button>
					{/if}
					<Button size="sm" variant="secondary" onclick={() => goto(`?cal=${cal.next}`)} aria-label="Próximo mês">›</Button>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-7 gap-1.5 mb-1.5">
			{#each SEMANA as dia (dia)}
				<div class="text-center text-xs font-semibold uppercase tracking-wide text-grey">{dia}</div>
			{/each}
		</div>
		<div class="grid grid-cols-7 gap-1.5">
			{#each celulas as d (d.toISOString())}
				{@const k = chaveDia(d)}
				{@const itens = porDia.get(k) ?? []}
				{@const foraDoMes = d.getMonth() !== cal.mes}
				{@const daCampanha = naCampanha(k)}
				<div
					class="min-h-23 flex flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1 {daCampanha
						? 'border-brand/50 bg-brand/10'
						: foraDoMes
							? 'border-grey-200/60 bg-bg'
							: 'border-grey-200 bg-surface'} {k === hojeKey ? 'ring-1 ring-brand' : ''}"
				>
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold leading-none {foraDoMes ? 'text-grey-200' : daCampanha ? 'text-brand' : 'text-slate'}">{d.getDate()}</span>
						{#if daCampanha}
							<button
								type="button"
								onclick={() => abrirAgendar(k)}
								class="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-base leading-none text-brand transition hover:bg-brand hover:text-white"
								title="Agendar conteúdo neste dia"
								aria-label={`Agendar conteúdo em ${k}`}
							>+</button>
						{/if}
					</div>
					{#each itens as c (c.id)}
						<a
							class="block truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.72rem] font-medium {toneClasses[conteudoStatusTone(c.status)]}"
							href={`/conteudo/${c.id}`}
							title={`${conteudoTipoLabel(c.tipo)} · ${conteudoStatusLabel(c.status)}`}
						>
							<span class="opacity-70 mr-1 tabular-nums">{horaCurta(c.data_publicacao)}</span>{c.titulo ?? conteudoTipoLabel(c.tipo)}
						</a>
					{/each}
				</div>
			{/each}
		</div>

		<div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-grey">
			<span class="flex items-center gap-1.5"><span class="size-3 rounded border border-brand/50 bg-brand/10"></span> Período da campanha</span>
			<span class="flex items-center gap-1.5"><span class="size-3 rounded ring-1 ring-brand"></span> Hoje</span>
		</div>
	</Card>
{/if}

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir esta campanha? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir campanha</Button>
	{/if}
</Card>

<!-- Agendamento rápido de conteúdo (abre ao clicar no + de um dia da campanha) -->
<Modal open={modalAberto} title="Agendar conteúdo" subtitle={diaLabel} onClose={() => (modalAberto = false)}>
	<form
		method="POST"
		action="?/agendar"
		use:enhance={({ formData }) => {
			// Monta o instante UTC a partir do dia + horário local escolhidos.
			const dt = new Date(`${diaSelecionado}T${hora}:00`);
			if (!isNaN(dt.getTime())) formData.set('data_publicacao', dt.toISOString());
			// Redes selecionadas (cross-post) — vão como múltiplos campos "redes".
			formData.delete('redes');
			redes.forEach((r) => formData.append('redes', r));
			salvando = true;
			return async ({ result, update }) => {
				salvando = false;
				if (result.type === 'success') {
					modalAberto = false;
					toast.success('Conteúdo agendado no calendário');
					await update(); // recarrega o load → calendário mostra o novo post
				} else if (result.type === 'failure') {
					toast.error((result.data?.agendarError as string) ?? 'Não foi possível agendar');
				} else {
					await update();
				}
			};
		}}
		class="space-y-4"
	>
		<Input label="Título (opcional)" name="titulo" placeholder="Ex.: Post de oferta da semana" />

		<div>
			<span class="mb-1.5 block text-sm font-medium text-navy">Redes sociais</span>
			<div class="flex flex-wrap gap-1.5">
				{#each CONTEUDO_REDE as r (r.value)}
					<button
						type="button"
						onclick={() => toggleRede(r.value)}
						aria-pressed={redes.includes(r.value)}
						class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors {redes.includes(r.value)
							? 'bg-brand text-white'
							: 'bg-bg text-slate hover:bg-grey-200/70'}"
					>{r.label}</button>
				{/each}
			</div>
		</div>

		<div>
			<span class="mb-1.5 block text-sm font-medium text-navy">Horário</span>
			<div class="flex flex-wrap items-center gap-1.5">
				{#each HORARIOS as h (h)}
					<button
						type="button"
						onclick={() => (hora = h)}
						class="rounded-full px-3 py-1 text-sm font-medium tabular-nums transition-colors {hora === h
							? 'bg-brand text-white'
							: 'bg-bg text-slate hover:bg-grey-200/70'}"
					>{h}</button>
				{/each}
				<label class="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-sm text-grey">
					Outro
					<input
						type="time"
						bind:value={hora}
						class="bg-transparent text-sm font-medium tabular-nums text-navy-900 outline-none"
					/>
				</label>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<Select label="Tipo" name="tipo" value="feed">
				{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</Select>
			<Select label="Status" name="status" value="programado">
				{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</Select>
		</div>

		<Select label="Responsável" name="responsavel_id" value="">
			<option value="">— Ninguém —</option>
			{#each data.colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>

		<div class="flex justify-end gap-2 pt-1">
			<Button type="button" variant="secondary" onclick={() => (modalAberto = false)}>Cancelar</Button>
			<Button type="submit" loading={salvando} disabled={!hora}>Agendar</Button>
		</div>
	</form>
</Modal>
