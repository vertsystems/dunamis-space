<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { carregarExcel, erroExport } from '$lib/pagsup/exportacao';
	import { LOJAS, lojaNome, type Provider, type ScheduledService } from '$lib/pagsup/types';
	import BotaoWhatsApp from './BotaoWhatsApp.svelte';
	import { formatBRL } from '$lib/clientes';
	import { Button, Card } from '$lib/components/ui';
	import ClienteSelector from './ClienteSelector.svelte';
	import { toast } from '$lib/toast.svelte';
	import { hojeISO } from '$lib/datas';
	import { Trash2, Calendar, DollarSign, Pencil, Check, X, FileSpreadsheet, Search } from '@lucide/svelte';

	// As abas do Pag's Up vêm do +page.svelte para ficarem nesta mesma barra.
	let { abas }: { abas?: import('svelte').Snippet } = $props();

	type SchedRow = ScheduledService & { provider: Provider };

	let isAddingExtra = $state(false);
	let showResetModal = $state(false);
	let sendToFinanceDate = $state('');
	let paymentDate = $state('');
	let editingId = $state<string | null>(null);
	let editPrice = $state<number | ''>('');
	let editNotes = $state('');
	let editLj = $state('');

	const emptyExtra = () => ({ name: '', service: 'Carros e Veículos de Som', region: '', cpf: '', pix: '', whatsapp: '', lj: '', price: '' as number | '', notes: '' });
	let extra = $state(emptyExtra());

	// ---- Busca de prestador (entrou no lugar da grade de pré-selecionados) ----
	let busca = $state('');
	let campoBusca = $state<HTMLInputElement | null>(null);
	let destaque = $state(0);

	const MAX_RESULTADOS = 8;
	const resultados = $derived.by(() => {
		const q = busca.trim().toLowerCase();
		if (!q) return [] as Provider[];
		// Nome, região e categoria: é por um dos três que se procura alguém aqui.
		return pagsup.filteredProviders
			.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.region.toLowerCase().includes(q) ||
					p.service.toLowerCase().includes(q)
			)
			.slice(0, MAX_RESULTADOS);
	});

	function escalar(p: Provider) {
		if (isScheduled(p.id)) {
			toast.error(`${p.name} já está no cronograma.`);
			return;
		}
		pagsup.scheduleProvider(p.id, '');
		toast.success(`${p.name} escalado`);
		busca = '';
		destaque = 0;
		campoBusca?.focus();
	}

	function teclaBusca(e: KeyboardEvent) {
		if (!resultados.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			destaque = (destaque + 1) % resultados.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			destaque = (destaque - 1 + resultados.length) % resultados.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			escalar(resultados[destaque] ?? resultados[0]);
		} else if (e.key === 'Escape') {
			busca = '';
		}
	}

	const groupedSchedule = $derived.by(() => {
		const g: Record<string, SchedRow[]> = {};
		for (const item of pagsup.filteredScheduledServices) {
			const provider = pagsup.filteredProviders.find((p) => p.id === item.providerId);
			if (!provider) continue;
			(g[provider.service] ??= []).push({ ...item, provider });
		}
		return g;
	});
	const scheduleGroups = $derived(Object.entries(groupedSchedule));
	const hasSchedule = $derived(scheduleGroups.length > 0);

	const grandTotal = $derived(
		pagsup.filteredScheduledServices.reduce((sum, i) => sum + (Number(i.price) || 0), 0)
	);

	function isScheduled(providerId: string): boolean {
		return pagsup.filteredScheduledServices.some((s) => s.providerId === providerId);
	}

	function addExtra() {
		if (!extra.name || !extra.region) {
			toast.error('Preencha ao menos o nome e a região do novo prestador.');
			return;
		}
		const provider = pagsup.addProvider({
			name: extra.name,
			service: extra.service,
			region: extra.region,
			cpf: extra.cpf,
			pix: extra.pix,
			whatsapp: extra.whatsapp,
			lj: extra.lj,
			defaultPrice: typeof extra.price === 'number' ? extra.price : 0
		});
		pagsup.scheduleProvider(provider.id, extra.price, extra.notes);
		isAddingExtra = false;
		extra = emptyExtra();
		toast.success('Prestador adicionado ao cronograma');
	}

	function startEdit(item: SchedRow) {
		editingId = item.id;
		editPrice = item.price;
		editNotes = item.notes ?? '';
		editLj = item.provider.lj ?? '';
	}
	function saveEdit(item: SchedRow) {
		pagsup.updateScheduled(item.id, { price: editPrice, notes: editNotes });
		// A LJ pertence ao prestador, não à escala: salvar aqui deixa o cadastro
		// certo para as próximas semanas também.
		if (editLj !== (item.provider.lj ?? '')) pagsup.updateProvider(item.providerId, { lj: editLj });
		editingId = null;
	}
	/**
	 * Em <select> o Enter pertence ao próprio campo (é ele que confirma a opção
	 * destacada). Interceptar ali salvava com o valor ANTIGO e a escolha sumia,
	 * então nos selects tratamos só o Esc.
	 */
	function escOuNada(e: KeyboardEvent) {
		if (e.key === 'Escape') editingId = null;
	}

	/** Enter salva, Esc cancela — sem tirar as mãos do teclado. */
	function teclaEdicao(e: KeyboardEvent, item: SchedRow) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit(item);
		} else if (e.key === 'Escape') {
			editingId = null;
		}
	}

	// Data com que os itens entram na Planilha Mensal ao finalizar.
	let dataFinalizacao = $state(hojeISO());

	function finalizar() {
		const n = pagsup.clearScheduleForCurrentClient(dataFinalizacao);
		sendToFinanceDate = '';
		paymentDate = '';
		showResetModal = false;
		toast.success(
			n ? `Cronograma finalizado — ${n} ${n === 1 ? 'pagamento foi' : 'pagamentos foram'} para a Planilha Mensal` : 'Cronograma finalizado'
		);
	}

	async function gerarPlanilha() {
		if (!hasSchedule) {
			toast.error('Adicione prestadores ao cronograma para gerar a planilha.');
			return;
		}
		const groups = scheduleGroups.map(([serviceType, items]) => ({
			serviceType,
			items: items.map((it) => ({
				providerName: it.provider.name,
				region: it.provider.region,
				cpf: it.provider.cpf ?? '',
				description: it.notes || it.provider.service,
				pix: it.provider.pix ?? '',
				price: it.price
			}))
		}));
		try {
			const { exportScheduleXlsx } = await carregarExcel();
			await exportScheduleXlsx(groups, { sendToFinanceDate, paymentDate });
			toast.success('Planilha gerada');
		} catch (e) {
			toast.error(erroExport(e));
		}
	}

	const fieldCls =
		'h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<div>
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
		{@render abas?.()}
		<div class="flex flex-wrap items-center gap-2.5">
			<div class="flex items-center gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-4 h-10 shadow-xs">
				<span class="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-brand-green/12 text-brand-green"><DollarSign size={15} /></span>
				<p class="text-[10px] font-bold text-grey uppercase tracking-wider leading-none">Total</p>
				<p class="text-sm font-bold text-navy leading-none tabular-nums">{formatBRL(grandTotal)}</p>
			</div>
			<Button onclick={() => (isAddingExtra = !isAddingExtra)}>Novo Prestador</Button>
			<ClienteSelector />
		</div>
	</div>

	<!-- Busca: substituiu a grade com todos os prestadores pré-selecionados.
	     Os prestadores continuam cadastrados (aba Prestadores) — só deixaram de
	     ser listados em bloco aqui. -->
	<Card class="mb-6">
		<label for="busca-prestador" class="mb-1.5 block text-xs font-medium text-slate">
			Escalar prestador
		</label>
		<div class="relative">
			<span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-grey">
				<Search size={17} />
			</span>
			<input
				bind:this={campoBusca}
				bind:value={busca}
				onkeydown={teclaBusca}
				id="busca-prestador"
				type="search"
				role="combobox"
				aria-expanded={resultados.length > 0}
				aria-controls="busca-resultados"
				autocomplete="off"
				placeholder="Buscar por nome, região ou categoria…"
				class="{fieldCls} pl-10"
			/>

			{#if busca.trim()}
				<div
					id="busca-resultados"
					role="listbox"
					class="absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-[var(--radius)] border border-grey-200 bg-surface shadow-lg"
				>
					{#if resultados.length === 0}
						<p class="px-4 py-3 text-sm text-grey">
							Nenhum prestador encontrado. Use <b class="font-medium text-navy">Novo Prestador</b> para cadastrar.
						</p>
					{:else}
						{#each resultados as p, i (p.id)}
							{@const sched = isScheduled(p.id)}
							<button
								type="button"
								role="option"
								aria-selected={i === destaque}
								onclick={() => escalar(p)}
								onmouseenter={() => (destaque = i)}
								disabled={sched}
								class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors {i === destaque && !sched
									? 'bg-brand/[0.06]'
									: ''} {sched ? 'cursor-not-allowed opacity-60' : 'hover:bg-brand/[0.06]'}"
							>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-medium text-navy">{p.name}</span>
									<span class="block truncate text-xs text-grey">{p.service} · {p.region}</span>
								</span>
								{#if sched}
									<span class="shrink-0 text-xs font-medium text-brand-green">no cronograma</span>
								{:else}
									<span class="shrink-0 text-xs font-medium text-brand">Escalar</span>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</Card>

	{#if isAddingExtra}
		<Card class="mb-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-sm font-semibold text-navy">Adicionar Novo Prestador</h3>
				<button onclick={() => (isAddingExtra = false)} class="p-1 text-grey hover:text-navy transition-colors"><X size={20} /></button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<div>
					<label for="ex-cat" class="block text-xs font-medium text-slate mb-1">Categoria</label>
					<select id="ex-cat" bind:value={extra.service} class={fieldCls}>
						{#each pagsup.serviceOptions as c (c)}<option value={c}>{c}</option>{/each}
					</select>
				</div>
				<div>
					<label for="ex-nome" class="block text-xs font-medium text-slate mb-1">Nome</label>
					<input id="ex-nome" bind:value={extra.name} placeholder="Nome do prestador" class={fieldCls} />
				</div>
				<div>
					<label for="ex-reg" class="block text-xs font-medium text-slate mb-1">Região</label>
					<input id="ex-reg" bind:value={extra.region} placeholder="Região/Cidade" class={fieldCls} />
				</div>
				<div>
					<!-- LJ: unidade onde o trabalho é feito; vai congelada no pagamento. -->
					<label for="ex-lj" class="block text-xs font-medium text-slate mb-1">LJ (loja)</label>
					<select id="ex-lj" bind:value={extra.lj} class={fieldCls}>
						<option value="">—</option>
						{#each LOJAS as l (l.sigla)}<option value={l.sigla} title={l.nome}>{l.sigla} · {l.nome}</option>{/each}
					</select>
				</div>
				<div>
					<label for="ex-doc" class="block text-xs font-medium text-slate mb-1">CPF / CNPJ</label>
					<input id="ex-doc" bind:value={extra.cpf} placeholder="000.000.000-00" class={fieldCls} />
				</div>
				<div>
					<label for="ex-pix" class="block text-xs font-medium text-slate mb-1">Chave PIX</label>
					<input id="ex-pix" bind:value={extra.pix} placeholder="Telefone, e-mail..." class={fieldCls} />
				</div>
				<div>
					<label for="ex-zap" class="block text-xs font-medium text-slate mb-1">WhatsApp</label>
					<input id="ex-zap" bind:value={extra.whatsapp} placeholder="(15) 99999-9999" class={fieldCls} />
				</div>
				<div>
					<label for="ex-obs" class="block text-xs font-medium text-slate mb-1">Observações</label>
					<input id="ex-obs" bind:value={extra.notes} placeholder="Opcional..." class={fieldCls} />
				</div>
				<div>
					<label for="ex-val" class="block text-xs font-medium text-slate mb-1">Valor</label>
					<input id="ex-val" type="number" min="0" step="0.01" placeholder="R$ 0,00" value={extra.price}
						oninput={(e) => (extra.price = e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))} class={fieldCls} />
				</div>
				<div class="flex items-end">
					<Button block onclick={addExtra}>Adicionar ao Cronograma</Button>
				</div>
			</div>
		</Card>
	{/if}

	{#if !hasSchedule}
		<Card class="border-dashed text-center py-12">
			<span class="grid size-16 place-items-center rounded-full bg-bg text-grey mx-auto mb-4"><Calendar size={30} /></span>
			<h3 class="text-base font-medium text-navy mb-1">Nenhum prestador escalado</h3>
			<p class="text-sm text-grey max-w-sm mx-auto">Comece adicionando prestadores ao cronograma desta semana para calcular os custos.</p>
			<button onclick={() => campoBusca?.focus()} class="mt-5 text-sm font-medium text-brand hover:underline">+ Escalar primeiro prestador</button>
		</Card>
	{:else}
		<div class="space-y-5">
			<Card>
				<h3 class="text-sm font-medium text-navy mb-3">Obs Importante:</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="sf-date" class="block text-xs font-medium text-slate mb-1">Enviar pagamento para o financeiro:</label>
						<input id="sf-date" bind:value={sendToFinanceDate} placeholder="Ex: 25/10/2023" class={fieldCls} />
					</div>
					<div>
						<label for="pay-date" class="block text-xs font-medium text-slate mb-1">Data para pagamento:</label>
						<input id="pay-date" bind:value={paymentDate} placeholder="Ex: 27/10/2023" class={fieldCls} />
					</div>
				</div>
			</Card>

			{#each scheduleGroups as [serviceType, items] (serviceType)}
				{@const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0)}
				<Card padding="none" class="overflow-hidden">
					<div class="px-5 py-3.5 border-b border-grey-200 bg-bg/50 flex items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<span class="w-1.5 h-7 rounded-full bg-brand"></span>
							<h3 class="text-base font-bold text-navy">{serviceType}</h3>
							<span class="rounded-full bg-grey-200 text-slate text-xs font-bold px-2.5 py-0.5">{items.length} {items.length === 1 ? 'prestador' : 'prestadores'}</span>
						</div>
						<div class="text-right">
							<p class="text-[10px] font-semibold text-grey uppercase tracking-wider">Subtotal</p>
							<p class="text-base font-bold text-navy tabular-nums">{formatBRL(subtotal)}</p>
						</div>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-left border-collapse">
							<thead>
								<tr class="text-grey text-xs uppercase tracking-wider border-b border-grey-200">
									<th scope="col" class="px-5 py-3 font-semibold">Prestador</th>
									<th scope="col" class="px-5 py-3 font-semibold">Região</th>
									<th scope="col" class="w-32 px-5 py-3 font-semibold">LJ</th>
									<th scope="col" class="px-5 py-3 font-semibold">Observações</th>
									<th scope="col" class="px-5 py-3 font-semibold text-right">Valor</th>
									<th scope="col" class="px-5 py-3 font-semibold text-right w-20"><span class="sr-only">Ações</span></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grey-200/70">
								{#each items as item (item.id)}
									{#if editingId === item.id}
										<tr class="bg-brand/[0.04]">
											<td class="px-5 py-3 font-medium text-navy">{item.provider.name}</td>
											<td class="px-5 py-3 text-slate text-sm">{item.provider.region}</td>
											<td class="px-5 py-3">
												<select bind:value={editLj} onkeydown={escOuNada} aria-label="LJ (loja)" class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25">
													<option value="">—</option>
													{#each LOJAS as l (l.sigla)}<option value={l.sigla} title={l.nome}>{l.sigla}</option>{/each}
												</select>
											</td>
											<td class="px-5 py-3"><input bind:value={editNotes} onkeydown={(e) => teclaEdicao(e, item)} placeholder="Observações..." class="{fieldCls} h-9" /></td>
											<td class="px-5 py-3">
												<input type="number" min="0" step="0.01" value={editPrice}
													oninput={(e) => (editPrice = e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))}
													onkeydown={(e) => teclaEdicao(e, item)}
													class="{fieldCls} h-9 max-w-[120px] ml-auto text-right font-mono" />
											</td>
											<td class="px-5 py-3">
												<div class="flex justify-end gap-1">
													<button onclick={() => saveEdit(item)} title="Salvar" class="p-2 rounded-[var(--radius-sm)] text-brand-green hover:bg-brand-green/10 transition-colors"><Check size={18} /></button>
													<button onclick={() => (editingId = null)} title="Cancelar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:bg-bg transition-colors"><X size={18} /></button>
												</div>
											</td>
										</tr>
									{:else}
										<!-- A linha toda abre a edição; o lápis continua ali para
										     quem procura o botão. -->
										<tr
											class="group cursor-pointer transition-colors hover:bg-bg/50"
											onclick={() => startEdit(item)}
											onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); startEdit(item); } }}
											tabindex="0"
											role="button"
											aria-label="Editar {item.provider.name}"
										>
											<td class="px-5 py-3.5 font-medium text-navy">{item.provider.name}</td>
											<td class="px-5 py-3.5 text-slate text-sm">{item.provider.region}</td>
											<td class="px-5 py-3.5">
												{#if item.provider.lj}
													<span class="inline-flex items-center rounded-[var(--radius-sm)] bg-bg px-2 py-0.5 text-xs font-bold text-slate" title={lojaNome(item.provider.lj)}>{item.provider.lj}</span>
												{:else}<span class="text-sm text-grey">-</span>{/if}
											</td>
											<td class="px-5 py-3.5 text-grey text-sm italic">{item.notes || '-'}</td>
											<td class="px-5 py-3.5 text-right font-mono text-navy font-medium">{item.price === '' ? '-' : formatBRL(item.price)}</td>
											<td class="px-5 py-3.5">
												<div class="flex items-center justify-end gap-1">
													<!-- Sempre visível: avisar o prestador escalado é parte da rotina
													     da semana, não uma ação de edição. -->
													<BotaoWhatsApp prestador={item.provider} nome={item.provider.name} />
													<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<button onclick={() => startEdit(item)} title="Editar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand hover:bg-brand/10 transition-colors"><Pencil size={17} /></button>
														<button onclick={(e) => { e.stopPropagation(); pagsup.deleteScheduled(item.id); }} title="Remover" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"><Trash2 size={17} /></button>
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

			<div class="flex flex-wrap justify-end gap-3 pt-2">
				<Button variant="danger" onclick={() => (showResetModal = true)}><Check size={18} /> Finalizar</Button>
				<Button onclick={gerarPlanilha}><FileSpreadsheet size={18} /> Gerar Planilha</Button>
			</div>
		</div>
	{/if}
</div>

{#if showResetModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
		<Card class="max-w-md w-full shadow-xl">
			<h3 class="text-sm font-semibold text-navy mb-2">Finalizar Cronograma</h3>
			<p class="text-slate mb-4">
				Os {pagsup.filteredScheduledServices.length}
				{pagsup.filteredScheduledServices.length === 1 ? 'item vai' : 'itens vão'} para a
				<b class="font-medium text-navy">Planilha Mensal</b> como pagamentos, e o cronograma fica limpo para a próxima semana.
			</p>
			<div class="mb-6">
				<label for="fin-data" class="mb-1 block text-xs font-medium text-slate">Data do pagamento</label>
				<input id="fin-data" type="date" bind:value={dataFinalizacao} class={fieldCls} />
			</div>
			<div class="flex justify-end gap-3">
				<Button variant="ghost" onclick={() => (showResetModal = false)}>Cancelar</Button>
				<Button onclick={finalizar}>Sim, finalizar</Button>
			</div>
		</Card>
	</div>
{/if}
