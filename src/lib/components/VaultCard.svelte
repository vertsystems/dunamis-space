<script lang="ts">
	// Vault do cliente — cofre de acessos que vive só na área do cliente.
	// Governado pelo módulo de permissão 'vault': quem não tem 'ver' nem recebe
	// os dados do servidor (o load nem consulta).
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import { Badge, Button, Card, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import VaultForm from '$lib/components/VaultForm.svelte';
	import { Copy, Eye, EyeOff, Pencil, Trash2, ExternalLink } from '@lucide/svelte';
	import { urlAbsoluta, urlCurta } from '$lib/vault';
	import type { VaultItem } from '$lib/vault';
	import { toast } from '$lib/toast.svelte';

	let {
		vault,
		colaboradores = [],
		form = null
	}: {
		vault: { itens: VaultItem[]; pendente: boolean; erro: string | null };
		colaboradores?: {
			id: string;
			nome: string;
			avatar_url?: string | null;
			funcao?: string | null;
			funcoes?: string[] | null;
		}[];
		form?: Record<string, unknown> | null;
	} = $props();

	const perms = $derived(page.data.permissoes);
	const podeMexer = $derived(podeEditar(perms, 'vault'));
	const podeApagar = $derived(podeExcluir(perms, 'vault'));

	// Senhas reveladas nesta sessão de tela (id → visível). Fecha a página, some.
	let reveladas = $state<Record<string, boolean>>({});

	let criando = $state(false);
	let editando = $state<VaultItem | null>(null);
	let excluindo = $state<VaultItem | null>(null);
	let apagando = $state(false);

	function nomeResp(id: string | null): string | null {
		if (!id) return null;
		return colaboradores.find((c) => c.id === id)?.nome ?? null;
	}

	async function copiar(texto: string | null, rotulo: string) {
		if (!texto) return;
		try {
			await navigator.clipboard.writeText(texto);
			toast.success(`${rotulo} copiado`);
		} catch {
			toast.error('Não foi possível copiar. Copie manualmente.');
		}
	}

	function aposSalvar() {
		criando = false;
		editando = null;
		toast.success('Acesso salvo');
		invalidateAll();
	}
	function aposExcluir() {
		excluindo = null;
		toast.success('Acesso excluído');
		invalidateAll();
	}
</script>

<Card class="mt-4">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 text-sm font-semibold text-navy">
			<Icon name="key" size={17} /> Vault
			<span class="text-sm font-normal text-grey">({vault.itens.length})</span>
		</h2>
		{#if podeMexer && !vault.pendente}
			<Button size="sm" variant="secondary" onclick={() => (criando = true)}>
				<Icon name="plus" size={15} /> Adicionar acesso
			</Button>
		{/if}
	</div>

	{#if vault.pendente}
		<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
			O cofre ainda não existe no banco. Rode a migration
			<code>0051_cliente_vault.sql</code> no Supabase para liberar esta seção.
		</div>
	{:else if vault.erro}
		<div role="alert" class="text-sm text-brand-danger">{vault.erro}</div>
	{:else if !vault.itens.length}
		<p class="text-sm text-grey">
			Nenhum acesso guardado ainda. Aqui ficam logins e senhas das contas deste cliente — visíveis
			só para quem tem o Vault liberado.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each vault.itens as it (it.id)}
				{@const resp = nomeResp(it.responsavel_id)}
				{@const link = urlAbsoluta(it.url)}
				<li
					class="rounded-[var(--radius)] border border-grey-200 bg-surface px-4 py-3 shadow-xs transition-colors hover:border-grey"
				>
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-semibold text-navy">{it.titulo}</span>
								{#if it.categoria}<Badge tone="neutral">{it.categoria}</Badge>{/if}
							</div>
							{#if link}
								<a
									href={link}
									target="_blank"
									rel="noopener"
									class="mt-0.5 inline-flex items-center gap-1 text-xs text-brand hover:underline"
								>
									<ExternalLink size={12} />{urlCurta(it.url)}
								</a>
							{/if}
						</div>
						{#if podeMexer || podeApagar}
							<div class="flex shrink-0 items-center gap-1">
								{#if podeMexer}
									<button
										class="grid size-8 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-bg hover:text-navy"
										aria-label="Editar acesso"
										title="Editar"
										onclick={() => (editando = it)}
									>
										<Pencil size={15} />
									</button>
								{/if}
								{#if podeApagar}
									<button
										class="grid size-8 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
										aria-label="Excluir acesso"
										title="Excluir"
										onclick={() => (excluindo = it)}
									>
										<Trash2 size={15} />
									</button>
								{/if}
							</div>
						{/if}
					</div>

					<div class="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
						<div class="flex items-center gap-2">
							<span class="w-14 shrink-0 text-xs text-grey">Login</span>
							<span class="min-w-0 flex-1 truncate text-sm text-navy">{it.login || '—'}</span>
							{#if it.login}
								<button
									class="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-bg hover:text-navy"
									aria-label="Copiar login"
									title="Copiar login"
									onclick={() => copiar(it.login, 'Login')}
								>
									<Copy size={14} />
								</button>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<span class="w-14 shrink-0 text-xs text-grey">Senha</span>
							<span class="min-w-0 flex-1 truncate font-mono text-sm text-navy">
								{#if !it.senha}
									—
								{:else if reveladas[it.id]}
									{it.senha}
								{:else}
									••••••••
								{/if}
							</span>
							{#if it.senha}
								<button
									class="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-bg hover:text-navy"
									aria-label={reveladas[it.id] ? 'Ocultar senha' : 'Mostrar senha'}
									title={reveladas[it.id] ? 'Ocultar' : 'Mostrar'}
									onclick={() => (reveladas = { ...reveladas, [it.id]: !reveladas[it.id] })}
								>
									{#if reveladas[it.id]}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
								</button>
								<button
									class="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-bg hover:text-navy"
									aria-label="Copiar senha"
									title="Copiar senha"
									onclick={() => copiar(it.senha, 'Senha')}
								>
									<Copy size={14} />
								</button>
							{/if}
						</div>
					</div>

					{#if it.observacoes || resp}
						<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-grey">
							{#if resp}<span>Responsável: {resp}</span>{/if}
							{#if it.observacoes}<span class="whitespace-pre-line">{it.observacoes}</span>{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Card>

<Modal open={criando} title="Novo acesso" size="lg" onClose={() => (criando = false)}>
	<VaultForm
		action="?/vault_criar"
		submitLabel="Adicionar"
		{colaboradores}
		item={(form?.values as Record<string, unknown>) ?? null}
		error={(form?.vaultError as string | null) ?? null}
		onCancel={() => (criando = false)}
		onDone={aposSalvar}
	/>
</Modal>

<Modal
	open={!!editando}
	title="Editar acesso"
	size="lg"
	onClose={() => (editando = null)}
>
	{#if editando}
		<VaultForm
			action="?/vault_atualizar"
			submitLabel="Salvar alterações"
			{colaboradores}
			item={editando}
			error={(form?.vaultError as string | null) ?? null}
			onCancel={() => (editando = null)}
			onDone={aposSalvar}
		/>
	{/if}
</Modal>

<Modal open={!!excluindo} title="Excluir acesso" onClose={() => (excluindo = null)}>
	{#if excluindo}
		<p class="mb-4 text-sm text-slate">
			Excluir <strong class="text-navy">{excluindo.titulo}</strong> do cofre deste cliente? A senha
			guardada some junto e não dá para desfazer.
		</p>
		<form
			method="POST"
			action="?/vault_excluir"
			use:enhance={() => {
				apagando = true;
				return async ({ result, update }) => {
					apagando = false;
					if (result.type === 'success') {
						aposExcluir();
						return;
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={excluindo.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" variant="secondary" onclick={() => (excluindo = null)}>
					Cancelar
				</Button>
				<Button type="submit" variant="danger" loading={apagando}>Sim, excluir</Button>
			</div>
		</form>
	{/if}
</Modal>
