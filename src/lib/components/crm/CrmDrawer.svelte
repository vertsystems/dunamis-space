<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge, Button, Input, Select } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CrmNegocioForm from './CrmNegocioForm.svelte';
	import CrmContatoForm from './CrmContatoForm.svelte';
	import {
		ATIVIDADE_TIPOS,
		MOTIVOS_PERDA,
		atividadeTipo,
		formatBRL,
		formatData,
		formatDataHora,
		negocioStatusLabel,
		negocioStatusTone,
		stageDot,
		vencimentoDe,
		vencimentoTone,
		type Negocio,
		type Contato,
		type Atividade,
		type Stage,
		type Colaborador
	} from '$lib/crm';

	let {
		open = false,
		tipo,
		id,
		negocios = [],
		contatos = [],
		atividades = [],
		stages = [],
		colaboradores = [],
		clientes = [],
		pipelineAtivoId = null,
		onClose,
		onToggleAtividade,
		onOpenNegocio,
		onOpenContato
	}: {
		open?: boolean;
		tipo: 'negocio' | 'contato';
		id: string | null;
		negocios?: Negocio[];
		contatos?: Contato[];
		atividades?: Atividade[];
		stages?: Stage[];
		colaboradores?: Colaborador[];
		clientes?: { id: string; nome: string }[];
		pipelineAtivoId?: string | null;
		onClose: () => void;
		onToggleAtividade: (id: string, concluida: boolean) => void;
		onOpenNegocio: (id: string) => void;
		onOpenContato: (id: string) => void;
	} = $props();

	const negocio = $derived(tipo === 'negocio' && id ? (negocios.find((n) => n.id === id) ?? null) : null);
	const contato = $derived(tipo === 'contato' && id ? (contatos.find((c) => c.id === id) ?? null) : null);
	const existe = $derived(tipo === 'negocio' ? !!negocio : !!contato);

	// Contato vinculado ao negócio aberto.
	const contatoDoNegocio = $derived(
		negocio?.contato_id ? (contatos.find((c) => c.id === negocio.contato_id) ?? null) : null
	);
	// Negócios do contato aberto.
	const negociosDoContato = $derived(contato ? negocios.filter((n) => n.contato_id === contato.id) : []);

	// Atividades do registro aberto.
	const minhasAtividades = $derived.by(() => {
		const lista =
			tipo === 'negocio'
				? atividades.filter((a) => a.negocio_id === id)
				: atividades.filter((a) => a.contato_id === id);
		return [...lista].sort((a, b) => {
			if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
			return (a.data_hora ?? a.created_at).localeCompare(b.data_hora ?? b.created_at);
		});
	});

	const stageDoNegocio = $derived(negocio?.stage_id ? stages.find((s) => s.id === negocio.stage_id) : null);
	// Etapas do funil do próprio negócio (para o select de edição).
	const stagesDoNegocio = $derived(
		negocio ? stages.filter((s) => s.pipeline_id === negocio.pipeline_id) : []
	);

	let addSaving = $state(false);
	let statusSaving = $state(false);
	let delSaving = $state(false);
	let perderMode = $state(false);
	let confirmDel = $state(false);

	function erroDe(result: { data?: unknown }): string {
		return (result.data as { error?: string })?.error ?? 'Não foi possível concluir a ação.';
	}

	// Reseta estados efêmeros ao trocar de registro.
	$effect(() => {
		id;
		perderMode = false;
		confirmDel = false;
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

{#if open}
	<div class="fixed inset-0 z-40 bg-navy-900/40" role="presentation" onclick={onClose}></div>
	<aside
		class="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-surface shadow-2xl flex flex-col"
		aria-label="Detalhe"
	>
		{#if !existe}
			<div class="flex items-center justify-between px-5 py-4 border-b border-grey-200">
				<span class="text-navy font-semibold">Registro não encontrado</span>
				<button type="button" class="text-grey hover:text-navy" onclick={onClose} aria-label="Fechar">
					<Icon name="x" size={18} />
				</button>
			</div>
		{:else if tipo === 'negocio' && negocio}
			<!-- ===================== NEGÓCIO ===================== -->
			<header class="flex items-start justify-between gap-3 px-5 py-4 border-b border-grey-200">
				<div class="min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<Badge tone={negocioStatusTone(negocio.status)}>{negocioStatusLabel(negocio.status)}</Badge>
						{#if stageDoNegocio}
							<span class="inline-flex items-center gap-1.5 text-xs text-slate">
								<span class="size-2 rounded-full {stageDot(stageDoNegocio.cor)}"></span>
								{stageDoNegocio.nome}
							</span>
						{/if}
					</div>
					<h2 class="text-sm font-semibold text-navy mt-1 break-words">{negocio.titulo}</h2>
					<div class="text-sm text-grey mt-0.5 tabular-nums">{formatBRL(negocio.valor)}</div>
				</div>
				<button type="button" class="text-grey hover:text-navy shrink-0" onclick={onClose} aria-label="Fechar">
					<Icon name="x" size={20} />
				</button>
			</header>

			<div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
				<!-- Ganho / Perdido / Reabrir -->
				<div class="flex flex-wrap gap-2">
					{#if negocio.status !== 'ganho'}
						<form method="POST" action="?/negocio_status" use:enhance={() => { statusSaving = true; return async ({ result, update }) => { await update(); statusSaving = false; if (result.type === 'failure') toast.error(erroDe(result)); }; }}>
							<input type="hidden" name="id" value={negocio.id} />
							<input type="hidden" name="status" value="ganho" />
							<Button variant="success" size="sm" type="submit" loading={statusSaving}>
								<Icon name="check" size={15} /> Marcar ganho
							</Button>
						</form>
					{/if}
					{#if negocio.status === 'aberto'}
						<Button variant="secondary" size="sm" type="button" onclick={() => (perderMode = !perderMode)}>
							<Icon name="x" size={15} /> Marcar perdido
						</Button>
					{/if}
					{#if negocio.status !== 'aberto'}
						<form method="POST" action="?/negocio_status" use:enhance={() => { statusSaving = true; return async ({ result, update }) => { await update(); statusSaving = false; if (result.type === 'failure') toast.error(erroDe(result)); }; }}>
							<input type="hidden" name="id" value={negocio.id} />
							<input type="hidden" name="status" value="aberto" />
							<Button variant="ghost" size="sm" type="submit">Reabrir</Button>
						</form>
					{/if}
				</div>

				{#if perderMode && negocio.status === 'aberto'}
					<form method="POST" action="?/negocio_status" class="flex items-end gap-2" use:enhance={() => { statusSaving = true; return async ({ result, update }) => { await update(); statusSaving = false; if (result.type === 'success') perderMode = false; else if (result.type === 'failure') toast.error(erroDe(result)); }; }}>
						<input type="hidden" name="id" value={negocio.id} />
						<input type="hidden" name="status" value="perdido" />
						<Select label="Motivo da perda" name="motivo_perda" wrapperClass="flex-1">
							<option value="">Selecione…</option>
							{#each MOTIVOS_PERDA as m (m)}<option value={m}>{m}</option>{/each}
						</Select>
						<Button variant="danger" size="md" type="submit" loading={statusSaving}>Confirmar</Button>
					</form>
				{/if}

				{#if negocio.status === 'perdido' && negocio.motivo_perda}
					<div class="rounded-[var(--radius)] bg-brand-danger/8 px-3 py-2 text-sm text-brand-danger">
						Perdido: {negocio.motivo_perda}
					</div>
				{/if}

				<!-- Contato vinculado -->
				{#if contatoDoNegocio}
					{@const c = contatoDoNegocio}
					<div class="rounded-[var(--radius-lg)] border border-grey-200 p-3">
						<div class="flex items-center justify-between gap-2">
							<div class="min-w-0">
								<div class="font-medium text-navy truncate">{c.nome}</div>
								{#if c.empresa}<div class="text-xs text-grey truncate">{c.empresa}</div>{/if}
							</div>
							<button type="button" class="text-xs text-brand hover:underline shrink-0" onclick={() => onOpenContato(c.id)}>Abrir</button>
						</div>
						<div class="flex flex-wrap gap-3 mt-2 text-xs text-slate">
							{#if c.email}<span class="inline-flex items-center gap-1"><Icon name="mail" size={13} />{c.email}</span>{/if}
							{#if c.whatsapp}<span class="inline-flex items-center gap-1"><Icon name="message" size={13} />{c.whatsapp}</span>{/if}
						</div>
					</div>
				{/if}

				<!-- Editar negócio -->
				<div>
					<h3 class="text-xs uppercase tracking-wide font-semibold text-grey mb-2">Dados do negócio</h3>
					<CrmNegocioForm
						negocio={negocio}
						stages={stagesDoNegocio}
						contatos={contatos.map((c) => ({ id: c.id, nome: c.nome, empresa: c.empresa }))}
						{colaboradores}
						action="?/negocio_atualizar"
						submitLabel="Salvar alterações"
					/>
				</div>

				<!-- Atividades -->
				{@render blocoAtividades(negocio.id, null)}

				<!-- Excluir -->
				{@render zonaPerigo('?/negocio_excluir', negocio.id, 'Excluir negócio')}
			</div>
		{:else if tipo === 'contato' && contato}
			<!-- ===================== CONTATO ===================== -->
			<header class="flex items-start justify-between gap-3 px-5 py-4 border-b border-grey-200">
				<div class="min-w-0">
					<h2 class="text-sm font-semibold text-navy break-words">{contato.nome}</h2>
					<div class="text-sm text-grey mt-0.5">
						{contato.empresa ?? ''}{contato.cargo ? ` · ${contato.cargo}` : ''}
					</div>
					<div class="flex flex-wrap gap-3 mt-1.5 text-xs text-slate">
						{#if contato.email}<span class="inline-flex items-center gap-1"><Icon name="mail" size={13} />{contato.email}</span>{/if}
						{#if contato.whatsapp}<span class="inline-flex items-center gap-1"><Icon name="message" size={13} />{contato.whatsapp}</span>{/if}
						{#if contato.telefone}<span class="inline-flex items-center gap-1"><Icon name="phone" size={13} />{contato.telefone}</span>{/if}
					</div>
				</div>
				<button type="button" class="text-grey hover:text-navy shrink-0" onclick={onClose} aria-label="Fechar">
					<Icon name="x" size={20} />
				</button>
			</header>

			<div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
				<!-- Negócios do contato -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-xs uppercase tracking-wide font-semibold text-grey">Negócios ({negociosDoContato.length})</h3>
					</div>
					{#if negociosDoContato.length}
						<div class="space-y-1.5">
							{#each negociosDoContato as n (n.id)}
								<button
									type="button"
									class="w-full flex items-center justify-between gap-2 rounded-[var(--radius)] border border-grey-200 px-3 py-2 text-left hover:bg-bg"
									onclick={() => onOpenNegocio(n.id)}
								>
									<span class="min-w-0">
										<span class="block text-sm font-medium text-navy truncate">{n.titulo}</span>
										<Badge tone={negocioStatusTone(n.status)}>{negocioStatusLabel(n.status)}</Badge>
									</span>
									<span class="text-sm tabular-nums text-navy shrink-0">{formatBRL(n.valor)}</span>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-grey">Nenhum negócio ainda.</p>
					{/if}
				</div>

				<!-- Editar contato -->
				<div>
					<h3 class="text-xs uppercase tracking-wide font-semibold text-grey mb-2">Dados do contato</h3>
					<CrmContatoForm
						contato={contato}
						{colaboradores}
						{clientes}
						action="?/contato_atualizar"
						submitLabel="Salvar alterações"
					/>
				</div>

				<!-- Atividades -->
				{@render blocoAtividades(null, contato.id)}

				<!-- Excluir -->
				{@render zonaPerigo('?/contato_excluir', contato.id, 'Excluir contato')}
			</div>
		{/if}
	</aside>
{/if}

{#snippet blocoAtividades(negocioId: string | null, contatoId: string | null)}
	<div>
		<h3 class="text-xs uppercase tracking-wide font-semibold text-grey mb-2">Atividades &amp; notas</h3>

		<form
			method="POST"
			action="?/atividade_criar"
			class="rounded-[var(--radius-lg)] bg-bg p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3"
			use:enhance={({ formData }) => {
				// datetime-local não carrega fuso; converte para instante ISO antes de gravar.
				const dh = formData.get('data_hora');
				if (typeof dh === 'string' && dh) formData.set('data_hora', new Date(dh).toISOString());
				addSaving = true;
				return async ({ result, update }) => {
					await update({ reset: result.type === 'success' });
					addSaving = false;
					if (result.type === 'failure') toast.error(erroDe(result));
				};
			}}
		>
			{#if negocioId}<input type="hidden" name="negocio_id" value={negocioId} />{/if}
			{#if contatoId}<input type="hidden" name="contato_id" value={contatoId} />{/if}
			<Select name="tipo" wrapperClass="sm:col-span-4" aria-label="Tipo">
				{#each ATIVIDADE_TIPOS as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</Select>
			<Input name="data_hora" type="datetime-local" wrapperClass="sm:col-span-8" aria-label="Data e hora" />
			<Input name="titulo" placeholder="O que fazer ou anotar…" wrapperClass="sm:col-span-12" aria-label="Descrição" />
			<div class="sm:col-span-12">
				<Button type="submit" size="sm" loading={addSaving}>
					<Icon name="plus" size={14} /> Adicionar
				</Button>
			</div>
		</form>

		{#if minhasAtividades.length}
			<div class="rounded-[var(--radius-lg)] border border-grey-200 divide-y divide-grey-200/60">
				{#each minhasAtividades as a (a.id)}
					{@const t = atividadeTipo(a.tipo)}
					<div class="flex items-start gap-2.5 px-3 py-2.5">
						<button
							type="button"
							class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors {a.concluida
								? 'bg-brand-green border-brand-green text-white'
								: 'border-grey-200 text-transparent hover:border-brand-green'}"
							aria-label={a.concluida ? 'Reabrir' : 'Concluir'}
							onclick={() => onToggleAtividade(a.id, !a.concluida)}
						>
							<Icon name="check" size={12} />
						</button>
						<span class="mt-0.5 text-slate shrink-0"><Icon name={t.icon} size={14} /></span>
						<div class="min-w-0 flex-1">
							<div class="text-sm text-navy {a.concluida ? 'line-through text-grey' : ''}">{a.titulo || t.label}</div>
							{#if a.data_hora}
								<Badge tone={a.concluida ? 'neutral' : vencimentoTone(vencimentoDe(a.data_hora))} class="mt-0.5">
									{formatDataHora(a.data_hora)}
								</Badge>
							{/if}
						</div>
						<form method="POST" action="?/atividade_excluir" use:enhance>
							<input type="hidden" name="id" value={a.id} />
							<button type="submit" class="text-grey hover:text-brand-danger" aria-label="Excluir atividade">
								<Icon name="trash" size={14} />
							</button>
						</form>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-grey">Nenhuma atividade registrada.</p>
		{/if}
	</div>
{/snippet}

{#snippet zonaPerigo(action: string, registroId: string, label: string)}
	<div class="border-t border-grey-200 pt-4">
		{#if confirmDel}
			<div class="flex items-center gap-2">
				<span class="text-sm text-slate">Tem certeza?</span>
				<form method="POST" {action} use:enhance={() => { delSaving = true; return async ({ result, update }) => { await update(); delSaving = false; if (result.type === 'success') onClose(); else if (result.type === 'failure') toast.error(erroDe(result)); }; }}>
					<input type="hidden" name="id" value={registroId} />
					<Button variant="danger" size="sm" type="submit" loading={delSaving}>Sim, excluir</Button>
				</form>
				<Button variant="secondary" size="sm" type="button" onclick={() => (confirmDel = false)}>Cancelar</Button>
			</div>
		{:else}
			<button type="button" class="inline-flex items-center gap-1.5 text-sm text-brand-danger hover:underline" onclick={() => (confirmDel = true)}>
				<Icon name="trash" size={14} /> {label}
			</button>
		{/if}
	</div>
{/snippet}
