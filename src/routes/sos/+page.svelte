<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, Badge, EmptyState } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import type { SosChamado } from './+page.server';

	let { data } = $props();

	const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
		aberto: { label: 'Aberto', tone: 'danger' },
		em_andamento: { label: 'Em andamento', tone: 'warning' },
		resolvido: { label: 'Resolvido', tone: 'success' }
	};

	const FILTROS = [
		{ value: '', label: 'Todos' },
		{ value: 'aberto', label: 'Abertos' },
		{ value: 'em_andamento', label: 'Em andamento' },
		{ value: 'resolvido', label: 'Resolvidos' }
	];

	function quando(v: string): string {
		return new Date(v).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function inicial(c: SosChamado): string {
		return (c.autor_nome || c.autor_email || '?').trim().charAt(0).toUpperCase() || '?';
	}

	// enhance: atualiza status (recarrega a lista para refletir badge/ordem)
	const onStatus = () => async ({ result, update }: any) => {
		await update();
		if (result.type === 'failure') toast.error(result.data?.error ?? 'Não foi possível atualizar.');
		else if (result.type === 'success') toast.success('Status atualizado.');
	};

	const onExcluir = () => async ({ result, update }: any) => {
		await update();
		if (result.type === 'success') toast.success('Chamado excluído.');
		else if (result.type === 'failure') toast.error('Não foi possível excluir.');
	};
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="flex items-center gap-2 text-base font-semibold text-navy">
			<Icon name="lifebuoy" size={20} class="text-brand-danger" />
			Central SOS
		</h1>
		<p class="text-sm text-grey">
			Problemas relatados pelo botão SOS.
			{#if data.abertos > 0}
				<span class="font-medium text-brand-danger">{data.abertos} em aberto.</span>
			{/if}
		</p>
	</div>
</div>

<!-- Filtros por status -->
<div class="mb-4 flex flex-wrap gap-2">
	{#each FILTROS as f (f.value)}
		{@const ativo = (data.filtro ?? '') === f.value}
		<a
			href={f.value ? `/sos?status=${f.value}` : '/sos'}
			class="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors {ativo
				? 'bg-navy text-white'
				: 'bg-surface text-slate border border-grey-200 hover:bg-bg hover:text-navy'}"
		>
			{f.label}
		</a>
	{/each}
</div>

{#if data.pendente}
	<Card>
		<p class="text-sm text-navy">
			A tabela do SOS ainda não foi criada. Aplique a migration
			<span class="font-mono text-xs">0010_sos.sql</span> no Supabase.
		</p>
	</Card>
{:else if data.itens.length === 0}
	<EmptyState
		icon="lifebuoy"
		title="Nenhum chamado por aqui"
		description="Quando alguém relatar um problema pelo botão SOS, ele aparece nesta lista."
	/>
{:else}
	<div class="space-y-3">
		{#each data.itens as c (c.id)}
			<Card>
				<div class="flex items-start gap-3">
					<span
						class="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-bold text-navy"
						title={c.autor_nome ?? c.autor_email ?? ''}
					>
						{inicial(c)}
					</span>

					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-semibold text-navy">{c.titulo}</h3>
							<Badge tone={STATUS_META[c.status]?.tone ?? 'neutral'}>
								{STATUS_META[c.status]?.label ?? c.status}
							</Badge>
						</div>

						{#if c.descricao}
							<p class="mt-1 text-sm whitespace-pre-line text-slate">{c.descricao}</p>
						{/if}

						<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-grey">
							<span>{c.autor_nome || c.autor_email || 'Anônimo'}</span>
							{#if c.rota}
								<span class="inline-flex items-center gap-1">
									<Icon name="folder" size={12} />
									<span class="font-mono">{c.rota}</span>
								</span>
							{/if}
							<span>{quando(c.created_at)}</span>
						</div>
					</div>

					<div class="flex shrink-0 items-center gap-2">
						<form method="POST" action="?/status" use:enhance={onStatus}>
							<input type="hidden" name="id" value={c.id} />
							<select
								name="status"
								value={c.status}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
								class="h-8 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-xs text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
								aria-label="Alterar status"
							>
								<option value="aberto">Aberto</option>
								<option value="em_andamento">Em andamento</option>
								<option value="resolvido">Resolvido</option>
							</select>
						</form>

						<form method="POST" action="?/excluir" use:enhance={onExcluir}>
							<input type="hidden" name="id" value={c.id} />
							<button
								type="submit"
								onclick={(e) => {
									if (!confirm('Excluir este chamado?')) e.preventDefault();
								}}
								class="grid size-8 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
								title="Excluir"
								aria-label="Excluir chamado"
							>
								<Icon name="trash" size={16} />
							</button>
						</form>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}
