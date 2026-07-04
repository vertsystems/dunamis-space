<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { SEMANA, MESES, chaveDia, celulasMes } from '$lib/calendario';
	import { conteudoStatusTone, conteudoStatusLabel, conteudoTipoLabel } from '$lib/conteudo';
	import { Card, Button, Breadcrumb, toneClasses } from '$lib/components/ui';

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

	// Link p/ criar conteúdo já com o cliente da campanha e a data do dia clicado.
	function novoConteudoHref(k: string): string {
		const params = new URLSearchParams({ data: k });
		if (data.campanha.cliente_id) params.set('cliente', data.campanha.cliente_id);
		return `/conteudo/novo?${params.toString()}`;
	}
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
				<p class="text-xs text-grey">Dias da campanha em destaque — clique num dia para agendar um conteúdo.</p>
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
							<a
								href={novoConteudoHref(k)}
								class="grid size-4 place-items-center rounded-full bg-brand/15 text-sm leading-none text-brand no-underline transition hover:bg-brand hover:text-white"
								title="Agendar conteúdo neste dia"
								aria-label={`Agendar conteúdo em ${k}`}
							>+</a>
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
