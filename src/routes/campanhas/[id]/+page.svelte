<script lang="ts">
	import { enhance } from '$app/forms';
	import { optimistic, tempId } from '$lib/optimistic';
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { MATERIAL_TIPO, materialTipoLabel, formatBRL } from '$lib/campanhas';
	import { Card, Badge, Button, Input, Select, Breadcrumb } from '$lib/components/ui';

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

<Breadcrumb items={[{ label: 'Campanhas', href: '/campanhas' }, { label: data.campanha.nome }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Campanha salva com sucesso.</div>
{/if}

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">{data.campanha.nome}</h1>
	<CampanhaForm {campanha} clientes={data.clientes} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-navy mb-3">Produtos</h2>
	{#if produtoError}<div class="mb-3 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{produtoError}</div>{/if}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-3 py-2 font-semibold">Ref</th>
					<th class="px-3 py-2 font-semibold">Produto</th>
					<th class="px-3 py-2 font-semibold text-right">Preço</th>
					<th class="px-3 py-2 font-semibold text-right">Promo</th>
					<th class="px-3 py-2 font-semibold text-center">Limite</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each produtos as p (p.id)}
					<tr class="border-b border-grey-200/60 last:border-0 {p._pending ? 'opacity-55' : ''}">
						<td class="px-3 py-2">{p.ref ?? '—'}</td>
						<td class="px-3 py-2">{p.nome}</td>
						<td class="px-3 py-2 text-right tabular-nums">{p.preco != null ? formatBRL(p.preco) : '—'}</td>
						<td class="px-3 py-2 text-right tabular-nums">{p.preco_promocional != null ? formatBRL(p.preco_promocional) : '—'}</td>
						<td class="px-3 py-2 text-center">{p.limite ?? '—'}</td>
						<td class="px-3 py-2 text-right">
							<form method="POST" action="?/delProduto" use:enhance={delProduto} class="inline">
								<input type="hidden" name="id" value={p.id} />
								<Button size="sm" variant="danger" type="submit" disabled={p._pending}>Remover</Button>
							</form>
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-3 py-4 text-grey">Nenhum produto.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<form method="POST" action="?/addProduto" use:enhance={addProduto} class="grid grid-cols-2 md:grid-cols-12 gap-2 items-end mt-3">
		<Input name="ref" placeholder="REF" wrapperClass="md:col-span-2" />
		<Input name="nome" placeholder="Nome do produto *" required wrapperClass="md:col-span-3" />
		<Input type="number" step="0.01" name="preco" placeholder="Preço" wrapperClass="md:col-span-2" />
		<Input type="number" step="0.01" name="preco_promocional" placeholder="Promo" wrapperClass="md:col-span-2" />
		<Input type="number" name="limite" placeholder="Lim." wrapperClass="md:col-span-1" />
		<Button type="submit" block class="md:col-span-2">Adicionar</Button>
	</form>
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-navy mb-3">Materiais</h2>
	{#if materialError}<div class="mb-3 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{materialError}</div>{/if}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-3 py-2 font-semibold">Tipo</th>
					<th class="px-3 py-2 font-semibold">Arquivo</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each materiais as m (m.id)}
					<tr class="border-b border-grey-200/60 last:border-0 {m._pending ? 'opacity-55' : ''}">
						<td class="px-3 py-2"><Badge tone="neutral">{materialTipoLabel(m.tipo)}</Badge></td>
						<td class="px-3 py-2">{#if m.arquivo_url}<a class="text-brand hover:underline" href={m.arquivo_url} target="_blank" rel="noopener">{m.arquivo_url}</a>{:else}—{/if}</td>
						<td class="px-3 py-2 text-right">
							<form method="POST" action="?/delMaterial" use:enhance={delMaterial} class="inline">
								<input type="hidden" name="id" value={m.id} />
								<Button size="sm" variant="danger" type="submit" disabled={m._pending}>Remover</Button>
							</form>
						</td>
					</tr>
				{:else}
					<tr><td colspan="3" class="px-3 py-4 text-grey">Nenhum material.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<form method="POST" action="?/addMaterial" use:enhance={addMaterial} class="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mt-3">
		<Select name="tipo" wrapperClass="md:col-span-3">
			{#each MATERIAL_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
		</Select>
		<Input name="arquivo_url" placeholder="URL do arquivo (Drive/imagem)" wrapperClass="md:col-span-7" />
		<Button type="submit" block class="md:col-span-2">Adicionar</Button>
	</form>
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir esta campanha? Produtos e materiais também serão removidos.</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir campanha</Button>
	{/if}
</Card>
