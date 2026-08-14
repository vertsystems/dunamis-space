<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Card, Badge, EmptyState, Modal } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import type { SosChamado } from './+page.server';
	import { imagensDe } from '$lib/sosImagem';

	let { data } = $props();

	const perms = $derived(page.data.permissoes);

	// Print aberto no modal: o chamado dá o título, o índice diz qual das imagens.
	let vendo = $state<SosChamado | null>(null);
	let indice = $state(0);
	const galeria = $derived(vendo ? imagensDe(vendo) : []);

	function abrirPrint(c: SosChamado, i: number) {
		vendo = c;
		indice = i;
	}
	/** Anda pela galeria dando a volta: do último vai para o primeiro. */
	function passar(delta: number) {
		if (galeria.length < 2) return;
		indice = (indice + delta + galeria.length) % galeria.length;
	}

	const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
		aberto: { label: 'Aberto', tone: 'danger' },
		resolvido: { label: 'Resolvido', tone: 'success' }
	};

	// O chamado só tem dois estados. Chamados gravados antes disso podem ter
	// 'em_andamento' no banco até a migration 0043 rodar — tratamos como aberto.
	function statusDe(c: SosChamado): 'aberto' | 'resolvido' {
		return c.status === 'resolvido' ? 'resolvido' : 'aberto';
	}

	// Cor da caixa do chamado: vermelho claro em aberto, verde claro resolvido.
	const CARD_COR = {
		aberto: 'bg-brand-danger/10! border-brand-danger/40!',
		resolvido: 'bg-brand-green/10! border-brand-green/40!'
	} as const;

	const FILTROS = [
		{ value: '', label: 'Todos' },
		{ value: 'aberto', label: 'Abertos' },
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
			{@const st = statusDe(c)}
			{@const prints = imagensDe(c)}
			<Card class={CARD_COR[st]}>
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
							<Badge tone={STATUS_META[st].tone}>{STATUS_META[st].label}</Badge>
						</div>

						{#if c.descricao}
							<p class="mt-1 text-sm whitespace-pre-line text-slate">{c.descricao}</p>
						{/if}

						{#if prints.length}
							<!-- A miniatura serve para reconhecer a tela; para ler o erro, o
							     clique abre o print grande sem sair da lista. -->
							<div class="mt-2 flex flex-wrap gap-2">
								{#each prints as url, i (url)}
									<button
										type="button"
										onclick={() => abrirPrint(c, i)}
										title="Ver o print {i + 1} de {prints.length}"
										class="block overflow-hidden rounded-[var(--radius)] border border-grey-200 transition-colors hover:border-brand focus-visible:border-brand focus-visible:outline-none"
									>
										<img
											src={url}
											alt="Print {i + 1} do chamado {c.titulo}"
											loading="lazy"
											class="h-24 w-auto object-contain"
										/>
									</button>
								{/each}
							</div>
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
						{#if podeEditar(perms, 'sos')}
							<form method="POST" action="?/status" use:enhance={onStatus}>
								<input type="hidden" name="id" value={c.id} />
								<select
									name="status"
									value={st}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
									class="h-8 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-xs text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
									aria-label="Alterar status"
								>
									<option value="aberto">Aberto</option>
									<option value="resolvido">Resolvido</option>
								</select>
							</form>
						{/if}

						{#if podeExcluir(perms, 'sos')}
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
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}

<!-- Print em tamanho grande, sem tirar a pessoa da lista de chamados. -->
<Modal
	open={!!vendo}
	title={vendo?.titulo ?? 'Print do chamado'}
	subtitle={galeria.length > 1 ? `Print ${indice + 1} de ${galeria.length}` : 'Print enviado no chamado'}
	size="xl"
	onClose={() => (vendo = null)}
>
	{#if galeria[indice]}
		<div class="flex flex-col items-center gap-3">
			<div class="flex w-full items-center gap-2">
				{#if galeria.length > 1}
					<button
						type="button"
						onclick={() => passar(-1)}
						aria-label="Print anterior"
						class="grid size-9 shrink-0 place-items-center rounded-full border border-grey-200 text-slate transition-colors hover:border-brand hover:text-brand"
					>
						<Icon name="chevron" size={18} class="rotate-180" />
					</button>
				{/if}
				<!-- max-h em vh: print alto (celular) não empurra o rodapé do modal
				     para fora da tela. -->
				<img
					src={galeria[indice]}
					alt="Print {indice + 1} do chamado {vendo?.titulo}"
					class="mx-auto max-h-[70vh] w-auto rounded-[var(--radius)] border border-grey-200 object-contain"
				/>
				{#if galeria.length > 1}
					<button
						type="button"
						onclick={() => passar(1)}
						aria-label="Próximo print"
						class="grid size-9 shrink-0 place-items-center rounded-full border border-grey-200 text-slate transition-colors hover:border-brand hover:text-brand"
					>
						<Icon name="chevron" size={18} />
					</button>
				{/if}
			</div>

			{#if galeria.length > 1}
				<!-- Tiras embaixo: dá para pular direto para a imagem certa. -->
				<div class="flex flex-wrap justify-center gap-2">
					{#each galeria as url, i (url)}
						<button
							type="button"
							onclick={() => (indice = i)}
							aria-label="Ver print {i + 1}"
							aria-current={i === indice}
							class="overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors {i === indice
								? 'border-brand'
								: 'border-transparent opacity-60 hover:opacity-100'}"
						>
							<img src={url} alt="" class="size-12 object-cover" />
						</button>
					{/each}
				</div>
			{/if}

			<a
				href={galeria[indice]}
				target="_blank"
				rel="noopener"
				class="text-xs font-medium text-grey hover:text-brand hover:underline"
			>
				abrir em nova aba
			</a>
		</div>
	{/if}
</Modal>
