<script lang="ts">
	import { enhance } from '$app/forms';
	import { optimistic, tempId } from '$lib/optimistic';
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { MATERIAL_TIPO, materialTipoLabel, formatBRL } from '$lib/campanhas';

	let { data, form } = $props();
	let campanha = $derived(form?.values ?? data.campanha);
	let confirmDelete = $state(false);

	// Estado local otimista (re-sincroniza quando o servidor devolve dados novos).
	let produtos = $state([...data.produtos]);
	let materiais = $state([...data.materiais]);
	$effect(() => {
		produtos = [...data.produtos];
	});
	$effect(() => {
		materiais = [...data.materiais];
	});

	let produtoError = $state<string | null>(null);
	let materialError = $state<string | null>(null);

	// Leitura de campos do FormData.
	const txt = (fd: FormData, k: string) => {
		const v = fd.get(k);
		return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
	};
	const dec = (fd: FormData, k: string) => {
		const s = txt(fd, k);
		return s === null ? null : Number(s.replace(/\./g, '').replace(',', '.'));
	};

	const addProduto = optimistic({
		resetOnSuccess: true,
		onError: (m) => (produtoError = m),
		apply: (fd) => {
			produtoError = null;
			const lim = txt(fd, 'limite');
			const item = {
				id: tempId(),
				ref: txt(fd, 'ref'),
				nome: txt(fd, 'nome') ?? '',
				preco: dec(fd, 'preco'),
				preco_promocional: dec(fd, 'preco_promocional'),
				limite: lim === null ? null : parseInt(lim, 10),
				_pending: true
			};
			produtos = [...produtos, item];
			return () => (produtos = produtos.filter((p) => p.id !== item.id));
		}
	});

	const delProduto = optimistic({
		onError: (m) => (produtoError = m),
		apply: (fd) => {
			produtoError = null;
			const id = fd.get('id');
			const idx = produtos.findIndex((p) => p.id === id);
			const removed = produtos[idx];
			produtos = produtos.filter((p) => p.id !== id);
			return () => {
				if (removed) produtos = [...produtos.slice(0, idx), removed, ...produtos.slice(idx)];
			};
		}
	});

	const addMaterial = optimistic({
		resetOnSuccess: true,
		onError: (m) => (materialError = m),
		apply: (fd) => {
			materialError = null;
			const item = {
				id: tempId(),
				tipo: txt(fd, 'tipo') ?? 'feed',
				arquivo_url: txt(fd, 'arquivo_url'),
				_pending: true
			};
			materiais = [...materiais, item];
			return () => (materiais = materiais.filter((m) => m.id !== item.id));
		}
	});

	const delMaterial = optimistic({
		onError: (m) => (materialError = m),
		apply: (fd) => {
			materialError = null;
			const id = fd.get('id');
			const idx = materiais.findIndex((m) => m.id === id);
			const removed = materiais[idx];
			materiais = materiais.filter((m) => m.id !== id);
			return () => {
				if (removed) materiais = [...materiais.slice(0, idx), removed, ...materiais.slice(idx)];
			};
		}
	});
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/campanhas">Campanhas</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.campanha.nome}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Campanha salva com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.campanha.nome}</h1>
	<CampanhaForm {campanha} clientes={data.clientes} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="box">
	<h2 class="title is-6">Produtos</h2>
	{#if produtoError}<div class="notification is-danger is-light">{produtoError}</div>{/if}
	<table class="table is-fullwidth is-narrow">
		<thead><tr><th>Ref</th><th>Produto</th><th class="has-text-right">Preço</th><th class="has-text-right">Promo</th><th class="has-text-centered">Limite</th><th></th></tr></thead>
		<tbody>
			{#each produtos as p (p.id)}
				<tr class:is-pending={p._pending}>
					<td>{p.ref ?? '—'}</td>
					<td>{p.nome}</td>
					<td class="has-text-right">{p.preco != null ? formatBRL(p.preco) : '—'}</td>
					<td class="has-text-right">{p.preco_promocional != null ? formatBRL(p.preco_promocional) : '—'}</td>
					<td class="has-text-centered">{p.limite ?? '—'}</td>
					<td class="has-text-right">
						<form method="POST" action="?/delProduto" use:enhance={delProduto} style="display:inline">
							<input type="hidden" name="id" value={p.id} />
							<button class="button is-small is-danger is-outlined" type="submit" disabled={p._pending}>Remover</button>
						</form>
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="has-text-grey">Nenhum produto.</td></tr>
			{/each}
		</tbody>
	</table>
	<form method="POST" action="?/addProduto" use:enhance={addProduto} class="columns is-vcentered is-multiline mt-2">
		<div class="column is-2"><input class="input" name="ref" placeholder="REF" /></div>
		<div class="column is-3"><input class="input" name="nome" placeholder="Nome do produto *" required /></div>
		<div class="column is-2"><input class="input" type="number" step="0.01" name="preco" placeholder="Preço" /></div>
		<div class="column is-2"><input class="input" type="number" step="0.01" name="preco_promocional" placeholder="Promo" /></div>
		<div class="column is-1"><input class="input" type="number" name="limite" placeholder="Lim." /></div>
		<div class="column is-2"><button class="button is-primary is-fullwidth" type="submit">Adicionar</button></div>
	</form>
</div>

<div class="box">
	<h2 class="title is-6">Materiais</h2>
	{#if materialError}<div class="notification is-danger is-light">{materialError}</div>{/if}
	<table class="table is-fullwidth is-narrow">
		<thead><tr><th>Tipo</th><th>Arquivo</th><th></th></tr></thead>
		<tbody>
			{#each materiais as m (m.id)}
				<tr class:is-pending={m._pending}>
					<td><span class="tag is-light">{materialTipoLabel(m.tipo)}</span></td>
					<td>{#if m.arquivo_url}<a href={m.arquivo_url} target="_blank" rel="noopener">{m.arquivo_url}</a>{:else}—{/if}</td>
					<td class="has-text-right">
						<form method="POST" action="?/delMaterial" use:enhance={delMaterial} style="display:inline">
							<input type="hidden" name="id" value={m.id} />
							<button class="button is-small is-danger is-outlined" type="submit" disabled={m._pending}>Remover</button>
						</form>
					</td>
				</tr>
			{:else}
				<tr><td colspan="3" class="has-text-grey">Nenhum material.</td></tr>
			{/each}
		</tbody>
	</table>
	<form method="POST" action="?/addMaterial" use:enhance={addMaterial} class="columns is-vcentered mt-2">
		<div class="column is-3">
			<div class="select is-fullwidth">
				<select name="tipo">
					{#each MATERIAL_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
				</select>
			</div>
		</div>
		<div class="column is-7"><input class="input" name="arquivo_url" placeholder="URL do arquivo (Drive/imagem)" /></div>
		<div class="column is-2"><button class="button is-primary is-fullwidth" type="submit">Adicionar</button></div>
	</form>
</div>

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir esta campanha? Produtos e materiais também serão removidos.</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir campanha</button>
	{/if}
</div>

<style>
	tr.is-pending {
		opacity: 0.55;
	}
</style>
