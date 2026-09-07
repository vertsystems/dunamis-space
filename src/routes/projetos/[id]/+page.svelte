<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { ExternalLink } from '@lucide/svelte';
	import { Card, Badge, Button, Breadcrumb, Modal } from '$lib/components/ui';
	import { projetoStatusTone, projetoStatusLabel, PROJETO_ONDE } from '$lib/projetos';
	import { urlAbsoluta, urlCurta } from '$lib/vault';
	import { ehHtml, sanitizarHtml } from '$lib/richtext';
	import { iniciais } from '$lib/crm';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	const p = $derived(data.projeto);
	const perms = $derived(page.data.permissoes);

	// Cor determinística do avatar a partir do nome.
	const AVATAR_CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function corAvatar(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return AVATAR_CORES[h % AVATAR_CORES.length];
	}

	function fmtQuando(s: string | null): string | null {
		return s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
	}

	// Onde o projeto está — só o que foi preenchido; linha vazia é ruído.
	const onde = $derived(
		PROJETO_ONDE.map((c) => ({ ...c, valor: (p[c.campo] as string | null) ?? null })).filter(
			(c) => c.valor != null && c.valor !== ''
		)
	);

	// --- Edição em modal (mesmo padrão do resto do sistema) ---
	let editAberto = $state(false);
	function aposEditar() {
		editAberto = false;
		toast.success('Projeto salvo');
		invalidateAll();
	}
	let confirmDelete = $state(false);
	let excluindo = $state(false);
</script>

<Breadcrumb items={[{ label: 'Projetos', href: '/projetos' }, { label: p.nome }]} />

<!-- Header: identidade do projeto + em que pé está + quem cuida -->
<Card>
	<div class="flex flex-wrap items-start gap-4">
		<span
			class="grid size-16 shrink-0 place-items-center rounded-full text-lg font-semibold text-white shadow-sm {corAvatar(
				p.nome
			)}">{iniciais(p.nome)}</span
		>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-[1.3rem] font-semibold text-navy">{p.nome}</h1>
				<Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge>
			</div>
			{#if fmtQuando(p.updated_at)}
				<p class="mt-0.5 text-sm text-grey">Atualizado em {fmtQuando(p.updated_at)}</p>
			{/if}
			{#if p.responsavel}
				<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 origin-left scale-[0.8]">
					<span class="text-xs text-grey">Resp.:</span>
					<span class="flex items-center gap-1.5">
						{#if p.responsavel.avatar_url}
							<img
								src={p.responsavel.avatar_url}
								alt={p.responsavel.nome}
								class="size-6 shrink-0 rounded-full object-cover shadow-sm"
							/>
						{:else}
							<span
								class="grid size-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(
									p.responsavel.nome
								)}">{iniciais(p.responsavel.nome)}</span
							>
						{/if}
						<span class="text-sm font-medium text-navy">{p.responsavel.nome}</span>
						{#each p.responsavel.funcoes ?? [] as f (f)}<CargoBadge funcao={f} />{/each}
					</span>
				</div>
			{/if}
		</div>
		{#if podeEditar(perms, 'projetos')}
			<Button variant="secondary" onclick={() => (editAberto = true)}>
				<Icon name="edit" size={15} /> Editar
			</Button>
		{/if}
	</div>
</Card>

{#if onde.length}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-navy">Onde está</h2>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each onde as c (c.campo)}
				<div class="min-w-0">
					<dt class="text-xs text-grey">{c.label}</dt>
					<dd class="truncate text-sm font-medium text-navy">
						{#if c.link}
							<a
								href={urlAbsoluta(c.valor)}
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1 text-brand hover:underline"
								title={c.valor}
							>
								{urlCurta(c.valor)}<ExternalLink size={13} />
							</a>
						{:else}
							{c.valor}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</Card>
{/if}

<!-- As anotações técnicas: o miolo da tela. -->
<Card class="mt-4">
	<h2 class="mb-3 text-sm font-semibold text-navy">Anotações</h2>
	{#if p.descricao}
		{#if ehHtml(p.descricao)}
			<!-- Conteúdo do editor. Passa pelo sanitizador na saída também: o que
			     está no banco pode ser anterior à higienização na gravação. -->
			<div class="projeto-nota text-sm text-navy-900">{@html sanitizarHtml(p.descricao)}</div>
		{:else}
			<p class="whitespace-pre-wrap text-sm text-navy-900">{p.descricao}</p>
		{/if}
	{:else}
		<p class="text-sm text-grey">
			Nada anotado ainda. Aqui vão hospedagem, banco de dados, domínio, variáveis — o que você
			precisa reencontrar depois.
		</p>
	{/if}
</Card>

<Comentarios entidadeTipo="projeto" entidadeId={p.id} />

<!-- Zona de perigo -->
{#if podeExcluir(perms, 'projetos')}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-brand-danger">Zona de perigo</h2>
		{#if confirmDelete}
			<form method="POST" action="?/delete">
				<p class="mb-3 text-sm text-slate">
					Excluir este projeto? As anotações dele somem junto e não dá para desfazer.
				</p>
				<div class="flex gap-2">
					<Button variant="danger" type="submit" loading={excluindo} onclick={() => (excluindo = true)}>
						Sim, excluir
					</Button>
					<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
				</div>
			</form>
		{:else}
			<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir projeto</Button>
		{/if}
	</Card>
{/if}

<Modal open={editAberto} title="Editar projeto" size="xl" onClose={() => (editAberto = false)}>
	<ProjetoForm
		action="?/update"
		submitLabel="Salvar alterações"
		colaboradores={data.colaboradores}
		projeto={form?.values ?? p}
		error={form?.error ?? null}
		onCancel={() => (editAberto = false)}
		onDone={aposEditar}
	/>
</Modal>

<style>
	/* Espelha o que o RichText mostra enquanto se escreve. */
	.projeto-nota :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
		margin: 0.25rem 0;
	}
	.projeto-nota :global(a) {
		color: var(--color-brand);
		text-decoration: underline;
		word-break: break-all;
	}
</style>
