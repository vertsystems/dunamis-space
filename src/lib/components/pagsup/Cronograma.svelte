<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { SERVICE_CATEGORIES, type Provider, type ScheduledService } from '$lib/pagsup/types';
	import { exportScheduleXlsx } from '$lib/pagsup/excel';
	import { formatBRL } from '$lib/clientes';
	import { Button, Card } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import { Plus, Trash2, Calendar, DollarSign, Pencil, Check, X, FileSpreadsheet } from '@lucide/svelte';

	type SchedRow = ScheduledService & { provider: Provider };

	let isAdding = $state(false);
	let isAddingExtra = $state(false);
	let showResetModal = $state(false);
	let sendToFinanceDate = $state('');
	let paymentDate = $state('');
	let editingId = $state<string | null>(null);
	let editPrice = $state<number | ''>('');
	let editNotes = $state('');

	const emptyExtra = () => ({ name: '', service: 'Carro de Som', region: '', cpf: '', pix: '', price: '' as number | '', notes: '' });
	let extra = $state(emptyExtra());

	const providersByCategory = $derived.by(() => {
		const g: Record<string, Provider[]> = {};
		for (const p of pagsup.filteredProviders) (g[p.service] ??= []).push(p);
		return g;
	});

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

	function quickAdd(p: Provider) {
		if (isScheduled(p.id)) return;
		pagsup.scheduleProvider(p.id, '');
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
			defaultPrice: typeof extra.price === 'number' ? extra.price : 0
		});
		pagsup.scheduleProvider(provider.id, extra.price, extra.notes);
		isAddingExtra = false;
		extra = emptyExtra();
		toast.success('Prestador adicionado ao cronograma');
	}

	function startEdit(item: ScheduledService) {
		editingId = item.id;
		editPrice = item.price;
		editNotes = item.notes ?? '';
	}
	function saveEdit(id: string) {
		pagsup.updateScheduled(id, { price: editPrice, notes: editNotes });
		editingId = null;
	}

	function finalizar() {
		pagsup.clearScheduleForCurrentClient();
		pagsup.resetProvidersForCurrentClient();
		sendToFinanceDate = '';
		paymentDate = '';
		showResetModal = false;
		toast.success('Cronograma finalizado');
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
			await exportScheduleXlsx(groups, { sendToFinanceDate, paymentDate });
			toast.success('Planilha gerada');
		} catch {
			toast.error('Falha ao gerar a planilha.');
		}
	}

	const fieldCls =
		'h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<div class="mx-auto max-w-6xl">
	<div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
		<div>
			<h2 class="text-xl font-bold text-navy tracking-tight">Cronograma da Semana</h2>
			<p class="text-sm text-grey mt-0.5">Selecione os prestadores e calcule os custos totais.</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-3 rounded-[var(--radius-lg)] border border-grey-200 bg-surface px-5 h-14 shadow-sm">
				<span class="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-brand-green/12 text-brand-green"><DollarSign size={18} /></span>
				<div>
					<p class="text-[10px] font-bold text-grey uppercase tracking-widest leading-none mb-1">Total da Semana</p>
					<p class="text-lg font-bold text-navy leading-none tabular-nums">{formatBRL(grandTotal)}</p>
				</div>
			</div>
			<Button variant="success" onclick={() => { isAddingExtra = false; isAdding = !isAdding; }}>Adic. Pagamento</Button>
			<Button onclick={() => { isAdding = false; isAddingExtra = !isAddingExtra; }}>Novo Pagamento</Button>
		</div>
	</div>

	{#if isAdding}
		<Card class="mb-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-base font-semibold text-navy">Escalar Prestador para a Semana</h3>
				<button onclick={() => (isAdding = false)} class="p-1 text-grey hover:text-navy transition-colors"><X size={20} /></button>
			</div>
			{#if pagsup.filteredProviders.length === 0}
				<p class="text-center py-8 text-grey">Nenhum prestador cadastrado no sistema.</p>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each Object.entries(providersByCategory) as [category, list] (category)}
						<div class="rounded-[var(--radius)] border border-grey-200 bg-bg/40 p-4">
							<div class="flex items-center justify-between mb-3">
								<h4 class="text-sm font-bold text-slate flex items-center gap-2">
									<span class="w-1.5 h-4 rounded-full bg-brand"></span>{category}
								</h4>
								<span class="rounded-full bg-surface border border-grey-200 text-grey text-[10px] font-bold px-2 py-0.5">{list.length}</span>
							</div>
							<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{#each list as p (p.id)}
									{@const sched = isScheduled(p.id)}
									<button
										onclick={() => quickAdd(p)}
										disabled={sched}
										class="flex flex-col text-left p-2 rounded-[var(--radius-sm)] border transition-all {sched
											? 'border-brand-green/30 bg-brand-green/[0.06] opacity-60 cursor-not-allowed'
											: 'border-grey-200 bg-surface hover:border-brand hover:bg-brand/[0.04] hover:shadow-sm'}"
									>
										<span class="text-xs font-semibold leading-tight truncate {sched ? 'text-brand-green' : 'text-navy'}" title={p.name}>{p.name}</span>
										<span class="text-[10px] mt-1 flex items-center gap-1 {sched ? 'text-brand-green/70' : 'text-grey'}" title={p.region}>
											<span class="size-1 rounded-full shrink-0 {sched ? 'bg-brand-green' : 'bg-grey'}"></span>
											<span class="truncate">{p.region}</span>
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	{/if}

	{#if isAddingExtra}
		<Card class="mb-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-base font-semibold text-navy">Adicionar Novo Prestador</h3>
				<button onclick={() => (isAddingExtra = false)} class="p-1 text-grey hover:text-navy transition-colors"><X size={20} /></button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<div>
					<label for="ex-cat" class="block text-xs font-medium text-slate mb-1">Categoria</label>
					<select id="ex-cat" bind:value={extra.service} class={fieldCls}>
						{#each SERVICE_CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
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
					<label for="ex-doc" class="block text-xs font-medium text-slate mb-1">CPF / CNPJ</label>
					<input id="ex-doc" bind:value={extra.cpf} placeholder="000.000.000-00" class={fieldCls} />
				</div>
				<div>
					<label for="ex-pix" class="block text-xs font-medium text-slate mb-1">Chave PIX</label>
					<input id="ex-pix" bind:value={extra.pix} placeholder="Telefone, e-mail..." class={fieldCls} />
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
			<button onclick={() => (isAdding = true)} class="mt-5 text-sm font-medium text-brand hover:underline">+ Escalar primeiro prestador</button>
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
									<th class="px-5 py-3 font-semibold">Prestador</th>
									<th class="px-5 py-3 font-semibold">Região</th>
									<th class="px-5 py-3 font-semibold">Observações</th>
									<th class="px-5 py-3 font-semibold text-right">Valor</th>
									<th class="px-5 py-3 font-semibold text-right w-20"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grey-200/70">
								{#each items as item (item.id)}
									{#if editingId === item.id}
										<tr class="bg-brand/[0.04]">
											<td class="px-5 py-3 font-medium text-navy">{item.provider.name}</td>
											<td class="px-5 py-3 text-slate text-sm">{item.provider.region}</td>
											<td class="px-5 py-3"><input bind:value={editNotes} placeholder="Observações..." class="{fieldCls} h-9" /></td>
											<td class="px-5 py-3">
												<input type="number" min="0" step="0.01" value={editPrice}
													oninput={(e) => (editPrice = e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))}
													class="{fieldCls} h-9 max-w-[120px] ml-auto text-right font-mono" />
											</td>
											<td class="px-5 py-3">
												<div class="flex justify-end gap-1">
													<button onclick={() => saveEdit(item.id)} title="Salvar" class="p-2 rounded-[var(--radius-sm)] text-brand-green hover:bg-brand-green/10 transition-colors"><Check size={18} /></button>
													<button onclick={() => (editingId = null)} title="Cancelar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:bg-bg transition-colors"><X size={18} /></button>
												</div>
											</td>
										</tr>
									{:else}
										<tr class="group hover:bg-bg/50 transition-colors">
											<td class="px-5 py-3.5 font-medium text-navy">{item.provider.name}</td>
											<td class="px-5 py-3.5 text-slate text-sm">{item.provider.region}</td>
											<td class="px-5 py-3.5 text-grey text-sm italic">{item.notes || '-'}</td>
											<td class="px-5 py-3.5 text-right font-mono text-navy font-medium">{item.price === '' ? '-' : formatBRL(item.price)}</td>
											<td class="px-5 py-3.5">
												<div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button onclick={() => startEdit(item)} title="Editar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand hover:bg-brand/10 transition-colors"><Pencil size={17} /></button>
													<button onclick={() => pagsup.deleteScheduled(item.id)} title="Remover" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"><Trash2 size={17} /></button>
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
			<h3 class="text-lg font-semibold text-navy mb-2">Finalizar Cronograma</h3>
			<p class="text-slate mb-6">Tem certeza que deseja finalizar? Isso irá zerar o cronograma atual para que você possa iniciar um novo.</p>
			<div class="flex justify-end gap-3">
				<Button variant="ghost" onclick={() => (showResetModal = false)}>Cancelar</Button>
				<Button onclick={finalizar}>Sim, finalizar</Button>
			</div>
		</Card>
	</div>
{/if}
