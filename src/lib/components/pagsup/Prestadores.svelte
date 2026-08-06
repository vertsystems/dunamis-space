<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { LOJAS, lojaNome, type Provider } from '$lib/pagsup/types';
	import { caberEmUmaLinha } from '$lib/caberEmUmaLinha';
	import BotaoWhatsApp from './BotaoWhatsApp.svelte';
	import { whatsappLegivel } from '$lib/pagsup/whatsapp';
	import { Button, Card } from '$lib/components/ui';
	import ClienteSelector from './ClienteSelector.svelte';
	import { toast } from '$lib/toast.svelte';
	import { Plus, Search, Trash2, Pencil, Check, X } from '@lucide/svelte';

	// As abas do Pag's Up vêm do +page.svelte para ficarem nesta mesma barra.
	let { abas }: { abas?: import('svelte').Snippet } = $props();

	let searchTerm = $state('');
	let isAdding = $state(false);
	let editingId = $state<string | null>(null);

	type Form = { name: string; service: string; region: string; defaultPrice: number; cpf: string; pix: string; whatsapp: string; especialidade: string; lj: string };
	const emptyForm = (): Form => ({ name: '', service: 'Carros e Veículos de Som', region: '', defaultPrice: 0, cpf: '', pix: '', whatsapp: '', especialidade: '', lj: '' });
	let novo = $state<Form>(emptyForm());
	let edit = $state<Form>(emptyForm());

	const filtered = $derived(
		pagsup.filteredProviders.filter((p) => {
			const q = searchTerm.toLowerCase();
			return (
				p.name.toLowerCase().includes(q) ||
				p.service.toLowerCase().includes(q) ||
				p.region.toLowerCase().includes(q)
			);
		})
	);

	const grouped = $derived.by(() => {
		const g: Record<string, Provider[]> = {};
		for (const p of filtered) (g[p.service] ??= []).push(p);
		return g;
	});
	const categories = $derived(Object.keys(grouped).sort());

	function catAccent(cat: string): { bar: string; chip: string } {
		switch (cat) {
			case 'Carros e Veículos de Som':
				return { bar: 'bg-brand', chip: 'bg-brand/10 text-brand' };
			case 'Locução Loja':
				return { bar: 'bg-brand-amber', chip: 'bg-brand-amber/15 text-brand-brown' };
			case 'Influenciadores':
				return { bar: 'bg-pink-500', chip: 'bg-pink-50 text-pink-700' };
			case 'Gráficas':
				return { bar: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700' };
			case 'Serviços':
				return { bar: 'bg-brand-green', chip: 'bg-brand-green/12 text-brand-green' };
			default:
				return { bar: 'bg-slate', chip: 'bg-bg text-slate' };
		}
	}

	function handleAdd(e: Event) {
		e.preventDefault();
		if (!novo.name || !novo.service || !novo.region) return;
		pagsup.addProvider({ ...novo, defaultPrice: Number(novo.defaultPrice) || 0 });
		isAdding = false;
		novo = emptyForm();
		toast.success('Prestador adicionado');
	}

	/** Em <select> o Enter confirma a opção: interceptar ali perdia a escolha. */
	function escOuNada(e: KeyboardEvent) {
		if (e.key === 'Escape') editingId = null;
	}

	/** Enter salva, Esc cancela — sem tirar as mãos do teclado. */
	function teclaEdicao(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit(id);
		} else if (e.key === 'Escape') {
			editingId = null;
		}
	}

	function startEdit(p: Provider) {
		editingId = p.id;
		edit = {
			name: p.name,
			service: p.service,
			region: p.region,
			defaultPrice: p.defaultPrice,
			lj: p.lj ?? '',
			cpf: p.cpf ?? '',
			pix: p.pix ?? '',
			whatsapp: p.whatsapp ?? '',
			especialidade: p.especialidade ?? ''
		};
	}

	function saveEdit(id: string) {
		pagsup.updateProvider(id, { ...edit, defaultPrice: Number(edit.defaultPrice) || 0 });
		editingId = null;
		toast.success('Prestador atualizado');
	}

	function remove(id: string) {
		pagsup.deleteProvider(id);
		toast.info('Prestador removido');
	}

	const fieldCls =
		'h-9 w-full rounded-[var(--radius-sm)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<div>
	<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
		{@render abas?.()}
		<div class="flex items-center gap-2.5">
			<Button onclick={() => (isAdding = !isAdding)}>
				<Plus size={18} /> Novo Prestador
			</Button>
			<ClienteSelector />
		</div>
	</div>

	{#if isAdding}
		<Card class="mb-6">
			<h3 class="text-sm font-semibold text-navy mb-4">Adicionar Novo Prestador</h3>
			<form onsubmit={handleAdd} class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-9 gap-3 items-end">
				<div class="xl:col-span-1">
					<label for="np-nome" class="block text-xs font-medium text-slate mb-1">Nome</label>
					<input id="np-nome" required bind:value={novo.name} placeholder="Ex: João Silva" class={fieldCls} />
				</div>
				<div class="xl:col-span-1">
					<label for="np-serv" class="block text-xs font-medium text-slate mb-1">Serviço</label>
					<select id="np-serv" bind:value={novo.service} class={fieldCls}>
						{#each pagsup.serviceOptions as c (c)}<option value={c}>{c}</option>{/each}
					</select>
				</div>
				<div class="xl:col-span-1">
					<label for="np-reg" class="block text-xs font-medium text-slate mb-1">Região</label>
					<input id="np-reg" required bind:value={novo.region} placeholder="Ex: Sorocaba SP" class={fieldCls} />
				</div>
				<div class="xl:col-span-1">
					<!-- O select acima agrupa; aqui vai o que a pessoa faz de fato. -->
					<label for="np-esp" class="block text-xs font-medium text-slate mb-1">Descrição</label>
					<input id="np-esp" bind:value={novo.especialidade} placeholder="Ex: Pintura Facial" class={fieldCls} />
				</div>
				<div class="xl:col-span-1">
					<label for="np-doc" class="block text-xs font-medium text-slate mb-1">CPF / CNPJ</label>
					<input id="np-doc" bind:value={novo.cpf} placeholder="000.000.000-00" class={fieldCls} />
				</div>
				<div class="xl:col-span-1">
					<label for="np-pix" class="block text-xs font-medium text-slate mb-1">Chave PIX</label>
					<input id="np-pix" bind:value={novo.pix} placeholder="Telefone, e-mail..." class={fieldCls} />
				</div>
				<div class="xl:col-span-1">
					<label for="np-zap" class="block text-xs font-medium text-slate mb-1">WhatsApp</label>
					<input id="np-zap" bind:value={novo.whatsapp} placeholder="(15) 99999-9999" class={fieldCls} />
				</div>
				<div class="xl:col-span-1">
					<!-- LJ: unidade onde o trabalho é feito; vai congelada no pagamento. -->
					<label for="np-lj" class="block text-xs font-medium text-slate mb-1">LJ (loja)</label>
					<select id="np-lj" bind:value={novo.lj} class={fieldCls}>
						<option value="">—</option>
						{#each LOJAS as l (l.sigla)}<option value={l.sigla} title={l.nome}>{l.sigla} · {l.nome}</option>{/each}
					</select>
				</div>
				<div class="xl:col-span-1 flex gap-2">
					<Button type="submit" block>Salvar</Button>
					<Button type="button" variant="ghost" onclick={() => (isAdding = false)}>Cancelar</Button>
				</div>
			</form>
		</Card>
	{/if}

	<Card padding="none" class="mb-6">
		<div class="p-4 flex items-center">
			<div class="relative flex-1 max-w-md">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-grey"><Search size={18} /></span>
				<input
					type="search"
					placeholder="Buscar prestadores..."
					aria-label="Buscar prestadores"
					bind:value={searchTerm}
					class="{fieldCls} h-10 pl-10"
				/>
			</div>
		</div>
	</Card>

	{#if categories.length}
		<div class="space-y-5">
			{#each categories as category (category)}
				{@const accent = catAccent(category)}
				<Card padding="none" class="overflow-hidden">
					<div class="px-5 py-3.5 border-b border-grey-200 bg-bg/50 flex items-center gap-3">
						<span class="w-1.5 h-7 rounded-full {accent.bar}"></span>
						<h3 class="text-base font-bold text-navy">{category}</h3>
						<span class="rounded-full bg-grey-200 text-slate text-xs font-bold px-2.5 py-0.5">
							{grouped[category].length}
							{grouped[category].length === 1 ? 'prestador' : 'prestadores'}
						</span>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-left border-collapse">
							<thead>
								<tr class="text-grey text-xs uppercase tracking-wider border-b border-grey-200">
									<th scope="col" class="px-5 py-3 font-semibold w-[260px]">Nome</th>
									<th scope="col" class="px-5 py-3 font-semibold">Serviço</th>
									<th scope="col" class="px-5 py-3 font-semibold">Região</th>
									<th scope="col" class="px-5 py-3 font-semibold">CPF / CNPJ</th>
									<th scope="col" class="px-5 py-3 font-semibold">Chave PIX</th>
									<th scope="col" class="px-5 py-3 font-semibold">WhatsApp</th>
									<th scope="col" class="px-5 py-3 font-semibold w-32">LJ</th>
									<th scope="col" class="px-5 py-3 font-semibold text-right w-28">Ações</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grey-200/70">
								{#each grouped[category] as p (p.id)}
									{#if editingId === p.id}
										<tr class="bg-brand/[0.04]">
											<td class="px-5 py-3">
												<input onkeydown={(e) => teclaEdicao(e, p.id)} bind:value={edit.name} aria-label="Nome do prestador" class={fieldCls} />
											</td>
											<td class="px-5 py-3">
												<div class="flex flex-col gap-1.5">
													<select onkeydown={escOuNada} bind:value={edit.service} aria-label="Categoria" class={fieldCls}>
														{#each pagsup.serviceOptions as c (c)}<option value={c}>{c}</option>{/each}
													</select>
													<input onkeydown={(e) => teclaEdicao(e, p.id)} bind:value={edit.especialidade} aria-label="Descrição do serviço" class={fieldCls} placeholder="Descrição (opcional)" />
												</div>
											</td>
											<td class="px-5 py-3">
												<input onkeydown={(e) => teclaEdicao(e, p.id)} bind:value={edit.region} aria-label="Região" class={fieldCls} />
											</td>
											<td class="px-5 py-3">
												<input onkeydown={(e) => teclaEdicao(e, p.id)} bind:value={edit.cpf} aria-label="CPF / CNPJ" class={fieldCls} placeholder="CPF / CNPJ" />
											</td>
											<td class="px-5 py-3">
												<input onkeydown={(e) => teclaEdicao(e, p.id)} bind:value={edit.pix} aria-label="Chave PIX" class={fieldCls} placeholder="PIX" />
											</td>
											<td class="px-5 py-3">
												<input onkeydown={(e) => teclaEdicao(e, p.id)} bind:value={edit.whatsapp} aria-label="WhatsApp" class={fieldCls} placeholder="(15) 99999-9999" />
											</td>
											<td class="px-5 py-3">
												<select onkeydown={escOuNada} bind:value={edit.lj} aria-label="LJ (loja)" class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25">
													<option value="">—</option>
													{#each LOJAS as l (l.sigla)}<option value={l.sigla} title={l.nome}>{l.sigla}</option>{/each}
												</select>
											</td>
											<td class="px-5 py-3">
												<div class="flex justify-end gap-1">
													<button onclick={() => saveEdit(p.id)} title="Salvar" class="p-2 rounded-[var(--radius-sm)] text-brand-green hover:bg-brand-green/10 transition-colors"><Check size={18} /></button>
													<button onclick={() => (editingId = null)} title="Cancelar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:bg-bg transition-colors"><X size={18} /></button>
												</div>
											</td>
										</tr>
									{:else}
										<!-- A linha toda abre a edição; o lápis continua ali. -->
										<tr
											class="group cursor-pointer transition-colors hover:bg-bg/50"
											onclick={() => startEdit(p)}
											onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); startEdit(p); } }}
											tabindex="0"
											role="button"
											aria-label="Editar {p.name}"
										>
											<td class="px-5 py-3.5">
												<div class="flex items-center gap-2">
													<BotaoWhatsApp prestador={p} nome={p.name} size={16} reservaEspaco />
													<!-- line-clamp-2: nome comprido para em duas linhas com reticências,
													     em vez de esticar a altura da linha inteira. -->
													<span class="line-clamp-2 font-medium text-navy" title={p.name}>{p.name}</span>
												</div>
											</td>
											<td class="px-5 py-3.5">
												<!-- max-w-full + overflow-hidden + nowrap: é o que permite a ação
												     medir o estouro e encolher a fonte em vez de quebrar a linha. -->
												<span
													use:caberEmUmaLinha={{ max: 11, min: 8 }}
													class="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2.5 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide {accent.chip}"
													title={p.especialidade ? `${p.especialidade} · ${p.service}` : p.service}
													>{p.especialidade || p.service}</span
												>
											</td>
											<td class="px-5 py-3.5 text-slate text-sm">{p.region}</td>
											<td class="px-5 py-3.5 text-slate text-sm font-mono">{p.cpf || '-'}</td>
											<td class="px-5 py-3.5 text-slate text-sm">
												{#if p.pix}<span class="block max-w-[150px] truncate" title={p.pix}>{p.pix}</span>{:else}-{/if}
											</td>
											<td class="px-5 py-3.5 text-slate text-sm whitespace-nowrap">{whatsappLegivel(p)}</td>
											<td class="px-5 py-3.5">
												{#if p.lj}
													<span class="inline-flex items-center rounded-[var(--radius-sm)] bg-bg px-2 py-0.5 text-xs font-bold text-slate" title={lojaNome(p.lj)}>{p.lj}</span>
												{:else}<span class="text-sm text-grey">-</span>{/if}
											</td>
											<td class="px-5 py-3.5">
												<div class="flex items-center justify-end gap-1">
													<div class="flex gap-1 opacity-40 transition-opacity group-hover:opacity-100">
														<button onclick={() => startEdit(p)} title="Editar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand hover:bg-brand/10 transition-colors"><Pencil size={17} /></button>
														<button onclick={(e) => { e.stopPropagation(); remove(p.id); }} title="Excluir" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"><Trash2 size={17} /></button>
													</div>
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/each}
		</div>
	{:else}
		<Card class="border-dashed text-center py-12">
			<h3 class="text-base font-medium text-navy mb-1">Nenhum prestador encontrado</h3>
			<p class="text-sm text-grey max-w-sm mx-auto">Cadastre um novo prestador ou altere os termos da sua busca.</p>
		</Card>
	{/if}
</div>
