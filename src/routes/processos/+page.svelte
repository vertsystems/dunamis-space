<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, Button, Badge, Modal } from '$lib/components/ui';
	import { PROCESSO_ETAPAS, etapaCelula, situacaoTone, situacaoLabel, type EtapaStatus } from '$lib/processos';
	import type { ProcessoRow } from '$lib/components/ProcessosGrid.svelte';
	import ProcessoForm from '$lib/components/ProcessoForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/processos/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	const processos = $derived((data.processos ?? []) as ProcessoRow[]);

	function fmtPrazo(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}

	let novoAberto = $state(false);
	let editando = $state<ProcessoRow | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Processo criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Processo salvo');
		invalidateAll();
	}
</script>

<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-lg font-semibold text-navy">Cronograma de Processos</h1>
		<p class="text-sm text-grey">Visão tabular dos processos e etapas</p>
	</div>
	<Button onclick={() => (novoAberto = true)}>+ Novo processo</Button>
</div>

{#if data.processosPendente}
	<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Aplique a migration <code class="font-mono">supabase/migrations/0004_processos.sql</code> no SQL Editor do Supabase para ativar o módulo.
	</div>
{:else}
	<Card>
		<div class="flex flex-wrap items-center gap-4 text-xs text-slate mb-3">
			<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-green"></span>Concluído</span>
			<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-blue-600"></span>Em andamento</span>
			<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-grey-200"></span>Pendente</span>
			<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-danger"></span>Atrasado/Devolvido</span>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm border-collapse">
				<thead>
					<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
						<th class="px-3 py-3 font-semibold">#</th>
						<th class="px-3 py-3 font-semibold">Processo</th>
						<th class="px-3 py-3 font-semibold">Secretaria</th>
						<th class="px-3 py-3 font-semibold">Responsável</th>
						{#each PROCESSO_ETAPAS as e (e.key)}
							<th class="px-2 py-3 font-semibold text-center whitespace-nowrap">{e.label}</th>
						{/each}
						<th class="px-3 py-3 font-semibold">Prazo</th>
						<th class="px-3 py-3 font-semibold">Situação</th>
						<th class="px-3 py-3 font-semibold"></th>
					</tr>
				</thead>
				<tbody>
					{#each processos as p, i (p.id)}
						<tr
							class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
							onclick={() => (editando = p)}
						>
							<td class="px-3 py-3 text-grey">{i + 1}</td>
							<td class="px-3 py-3">
								<div class="font-medium text-navy">{p.nome}</div>
								{#if p.numero}<div class="text-xs text-grey">{p.numero}</div>{/if}
							</td>
							<td class="px-3 py-3 whitespace-nowrap">{p.secretaria ?? '—'}</td>
							<td class="px-3 py-3 whitespace-nowrap">{p.responsavel ?? '—'}</td>
							{#each PROCESSO_ETAPAS as e (e.key)}
								{@const cel = etapaCelula(p.etapas?.[e.key] as EtapaStatus | undefined)}
								<td class="px-2 py-3 text-center">
									<span
										class="inline-flex size-7 items-center justify-center rounded-md text-sm font-bold {cel.cls}"
										title={e.label}
									>{cel.glyph}</span>
								</td>
							{/each}
							<td class="px-3 py-3 whitespace-nowrap">{fmtPrazo(p.prazo)}</td>
							<td class="px-3 py-3"><Badge tone={situacaoTone(p.situacao)}>{situacaoLabel(p.situacao)}</Badge></td>
							<td class="px-3 py-3 text-right">
								<a class="text-sm text-brand hover:underline" href={`/processos/${p.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan={PROCESSO_ETAPAS.length + 7} class="px-3 py-12 text-center text-grey">
								Nenhum processo cadastrado ainda.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}

<Modal open={novoAberto} title="Novo processo" size="lg" onClose={() => (novoAberto = false)}>
	<ProcessoForm
		action="/processos/novo"
		submitLabel="Criar processo"
		processo={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar processo" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ProcessoForm
			action={`/processos/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			processo={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
