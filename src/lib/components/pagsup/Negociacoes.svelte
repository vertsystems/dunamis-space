<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import type { Negotiation, ScheduledNegotiation } from '$lib/pagsup/types';
	import { exportNegociacoesXlsx } from '$lib/pagsup/excel';
	import { formatBRL } from '$lib/clientes';
	import { Button, Card } from '$lib/components/ui';
	import ClienteSelector from './ClienteSelector.svelte';
	import { toast } from '$lib/toast.svelte';
	import { Plus, Trash2, Calendar, DollarSign, Pencil, Check, X, FileSpreadsheet } from '@lucide/svelte';

	type SchedNegRow = ScheduledNegotiation & { negotiation: Negotiation };

	let isAdding = $state(false);
	let isAddingExtra = $state(false);
	let showResetModal = $state(false);
	let paymentDate = $state('');
	let editingId = $state<string | null>(null);
	let editPrice = $state<number | ''>('');
	let editNotes = $state('');

	const emptyExtra = () => ({ company: '', service: '', supplier: '', contractValue: '' as number | '', region: '', pix: '', dueDate: '' });
	let extra = $state(emptyExtra());

	const CATEGORY = 'Serviços Mensais';
	const byCategory = $derived.by(() => {
		const g: Record<string, Negotiation[]> = {};
		for (const n of pagsup.filteredNegotiations) (g[CATEGORY] ??= []).push(n);
		return g;
	});

	const scheduledList = $derived.by(() => {
		const rows: SchedNegRow[] = [];
		for (const item of pagsup.filteredScheduledNegotiations) {
			const negotiation = pagsup.filteredNegotiations.find((n) => n.id === item.negotiationId);
			if (negotiation) rows.push({ ...item, negotiation });
		}
		return rows;
	});

	const grandTotal = $derived(scheduledList.reduce((sum, i) => sum + (Number(i.price) || 0), 0));

	function isScheduled(id: string): boolean {
		return pagsup.filteredScheduledNegotiations.some((s) => s.negotiationId === id);
	}

	function quickAdd(n: Negotiation) {
		if (isScheduled(n.id)) return;
		pagsup.scheduleNegotiation(n.id, n.contractValue);
	}

	function addExtra(e: Event) {
		e.preventDefault();
		if (!extra.company || !extra.service) return;
		const value = typeof extra.contractValue === 'number' ? extra.contractValue : 0;
		const negotiation = pagsup.addNegotiation({
			company: extra.company,
			service: extra.service,
			supplier: extra.supplier,
			region: extra.region,
			contractValue: value,
			pix: extra.pix,
			dueDate: extra.dueDate
		});
		pagsup.scheduleNegotiation(negotiation.id, extra.contractValue, '');
		isAddingExtra = false;
		extra = emptyExtra();
		toast.success('Negociação adicionada');
	}

	function startEdit(item: ScheduledNegotiation) {
		editingId = item.id;
		editPrice = item.price;
		editNotes = item.notes ?? '';
	}
	function saveEdit(id: string) {
		pagsup.updateScheduledNeg(id, { price: editPrice, notes: editNotes });
		editingId = null;
	}

	function finalizar() {
		pagsup.clearScheduledNegForCurrentClient();
		paymentDate = '';
		showResetModal = false;
		toast.success('Negociações finalizadas');
	}

	async function gerarPlanilha() {
		if (scheduledList.length === 0) {
			toast.error('Adicione negociações ao cronograma para gerar a planilha.');
			return;
		}
		const items = scheduledList.map((it) => ({
			company: it.negotiation.company,
			service: it.negotiation.service,
			supplier: it.negotiation.supplier,
			pix: it.negotiation.pix ?? '',
			region: it.negotiation.region ?? '',
			dueDate: it.negotiation.dueDate ?? '',
			price: it.price
		}));
		try {
			await exportNegociacoesXlsx(items, { paymentDate });
			toast.success('Planilha gerada');
		} catch {
			toast.error('Falha ao gerar a planilha.');
		}
	}

	const fieldCls =
		'h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<div>
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
		<div>
			<h2 class="text-base font-semibold text-navy tracking-tight">Cronograma de Negociações</h2>
			<p class="text-sm text-grey mt-0.5">Selecione os serviços mensais fixos para o pagamento.</p>
		</div>
		<div class="flex flex-wrap items-center gap-2.5">
			<div class="flex items-center gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-4 h-10 shadow-xs">
				<span class="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-brand-green/12 text-brand-green"><DollarSign size={15} /></span>
				<p class="text-[10px] font-bold text-grey uppercase tracking-wider leading-none">Total</p>
				<p class="text-sm font-bold text-navy leading-none tabular-nums">{formatBRL(grandTotal)}</p>
			</div>
			<Button onclick={() => { isAddingExtra = false; isAdding = !isAdding; }}>Adic. Pagamento</Button>
			<Button variant="secondary" onclick={() => { isAdding = false; isAddingExtra = !isAddingExtra; }}>Novo Pagamento</Button>
			<ClienteSelector />
		</div>
	</div>

	{#if isAdding}
		<Card class="mb-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-semibold text-navy">Escalar Negociação Fixa</h3>
				<button onclick={() => (isAdding = false)} class="p-1 text-grey hover:text-navy transition-colors"><X size={20} /></button>
			</div>
			{#if pagsup.filteredNegotiations.length === 0}
				<p class="text-center py-8 text-grey">Nenhuma negociação cadastrada no sistema.</p>
			{:else}
				{#each Object.entries(byCategory) as [category, list] (category)}
					<div class="rounded-[var(--radius)] border border-grey-200 bg-bg/40 p-4">
						<div class="flex items-center justify-between mb-3">
							<h4 class="text-sm font-bold text-slate flex items-center gap-2"><span class="w-1.5 h-4 rounded-full bg-brand"></span>{category}</h4>
							<span class="rounded-full bg-surface border border-grey-200 text-grey text-[10px] font-bold px-2 py-0.5">{list.length}</span>
						</div>
						<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
							{#each list as n (n.id)}
								{@const sched = isScheduled(n.id)}
								<button
									onclick={() => quickAdd(n)}
									disabled={sched}
									class="group text-left p-2.5 rounded-[var(--radius-sm)] border transition-all {sched
										? 'bg-bg border-grey-200 opacity-50 cursor-not-allowed'
										: 'bg-surface border-grey-200 shadow-xs hover:border-brand hover:shadow-sm hover:-translate-y-0.5'}"
								>
									<div class="font-semibold text-navy text-xs truncate mb-0.5" title={n.company}>{n.company}</div>
									<div class="text-[10px] text-grey truncate leading-tight" title={n.service}>{n.service}</div>
									<div class="text-[10px] text-grey/80 truncate mt-0.5">DDV: {n.dueDate || '-'}</div>
									{#if sched}
										<div class="mt-1 text-[10px] font-medium text-slate flex items-center gap-1"><Check size={10} /> Adicionado</div>
									{:else}
										<div class="mt-1 text-[10px] font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Plus size={10} /> Adicionar</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</Card>
	{/if}

	{#if isAddingExtra}
		<Card class="mb-6">
			<div class="flex items-start justify-between mb-5">
				<div>
					<h3 class="text-sm font-semibold text-navy">Novo Fornecedor Extra</h3>
					<p class="text-sm text-grey">Adicione uma negociação que não está na lista padrão.</p>
				</div>
				<button onclick={() => (isAddingExtra = false)} class="p-1 text-grey hover:text-navy transition-colors"><X size={20} /></button>
			</div>
			<form onsubmit={addExtra} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<label for="n-comp" class="block text-xs font-bold text-slate uppercase mb-1.5">Empresa/Prestador *</label>
						<input id="n-comp" required bind:value={extra.company} placeholder="Nome do prestador" class={fieldCls} />
					</div>
					<div>
						<label for="n-forn" class="block text-xs font-bold text-slate uppercase mb-1.5">Fornecedor *</label>
						<input id="n-forn" required bind:value={extra.supplier} placeholder="Nome e contato" class={fieldCls} />
					</div>
					<div>
						<label for="n-serv" class="block text-xs font-bold text-slate uppercase mb-1.5">Serviço *</label>
						<input id="n-serv" required bind:value={extra.service} placeholder="Tipo de serviço" class={fieldCls} />
					</div>
					<div>
						<label for="n-reg" class="block text-xs font-bold text-slate uppercase mb-1.5">Região</label>
						<input id="n-reg" bind:value={extra.region} placeholder="Ex: SP" class={fieldCls} />
					</div>
					<div>
						<label for="n-pix" class="block text-xs font-bold text-slate uppercase mb-1.5">Chave Pix</label>
						<input id="n-pix" bind:value={extra.pix} placeholder="Telefone, CPF, Email..." class={fieldCls} />
					</div>
					<div>
						<label for="n-val" class="block text-xs font-bold text-slate uppercase mb-1.5">Valor (R$)</label>
						<input id="n-val" type="number" step="0.01" placeholder="0.00" value={extra.contractValue}
							oninput={(e) => (extra.contractValue = e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} class={fieldCls} />
					</div>
					<div>
						<label for="n-ddv" class="block text-xs font-bold text-slate uppercase mb-1.5">Data de Venc. (DDV)</label>
						<input id="n-ddv" bind:value={extra.dueDate} placeholder="Ex: 10" class={fieldCls} />
					</div>
				</div>
				<div class="flex justify-end">
					<Button type="submit"><Check size={18} /> Adicionar Extra</Button>
				</div>
			</form>
		</Card>
	{/if}

	{#if scheduledList.length === 0}
		<Card class="border-dashed text-center py-12">
			<span class="grid size-16 place-items-center rounded-full bg-bg text-grey mx-auto mb-4"><Calendar size={30} /></span>
			<h3 class="text-base font-medium text-navy mb-1">Nenhuma negociação escalada</h3>
			<p class="text-sm text-grey max-w-sm mx-auto mb-4">Adicione uma negociação para começar a montar a lista de pagamentos mensais.</p>
			<button onclick={() => (isAdding = true)} class="text-sm font-medium text-brand hover:underline">Adic. Pagamento</button>
		</Card>
	{:else}
		<div class="space-y-5">
			<Card>
				<h3 class="text-sm font-bold text-navy mb-3 flex items-center gap-2"><Calendar size={17} class="text-brand" /> Configurações do Relatório</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="neg-pay" class="block text-xs font-semibold text-grey uppercase tracking-wider mb-1.5">Data para Pagamento</label>
						<input id="neg-pay" bind:value={paymentDate} placeholder="Ex: Sexta-Feira X/X" class={fieldCls} />
					</div>
				</div>
			</Card>

			<Card padding="none" class="overflow-hidden">
				<div class="px-5 py-3.5 border-b border-grey-200 bg-bg/50 flex items-center gap-3">
					<span class="w-1.5 h-6 rounded-full bg-brand"></span>
					<h3 class="font-bold text-navy text-base">Negociações Escaladas ({scheduledList.length})</h3>
				</div>
				<div class="divide-y divide-grey-200/70">
					{#each scheduledList as item (item.id)}
						<div class="p-4 hover:bg-bg/50 transition-colors group">
							<div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
								<div class="md:col-span-3">
									<div class="font-bold text-navy">{item.negotiation.company}</div>
									<div class="text-xs text-grey mt-1 truncate">{item.negotiation.service}</div>
								</div>
								<div class="md:col-span-3 text-sm">
									<div class="font-medium text-slate truncate">{item.negotiation.supplier}</div>
									<div class="text-xs text-grey mt-1 truncate" title={item.negotiation.region}>{item.negotiation.region || '-'}</div>
								</div>
								<div class="md:col-span-2 text-sm">
									<span class="inline-flex items-center rounded-[var(--radius-sm)] bg-bg text-slate px-2.5 py-0.5 text-xs font-bold border border-grey-200">DDV: {item.negotiation.dueDate || '-'}</span>
									<div class="text-xs text-grey mt-1.5 truncate" title={item.negotiation.pix}>Pix: {item.negotiation.pix || '-'}</div>
								</div>
								<div class="md:col-span-3">
									{#if editingId === item.id}
										<div class="flex flex-col gap-2">
											<div class="relative">
												<span class="absolute left-3 top-1/2 -translate-y-1/2 text-grey font-medium">R$</span>
												<input type="number" step="0.01" value={editPrice}
													oninput={(e) => (editPrice = e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))}
													placeholder="0,00" class="{fieldCls} h-9 pl-9 font-semibold" />
											</div>
											<input bind:value={editNotes} placeholder="Observações..." class="{fieldCls} h-9" />
											<div class="flex justify-end gap-2">
												<Button size="sm" variant="ghost" onclick={() => (editingId = null)}>Cancelar</Button>
												<Button size="sm" onclick={() => saveEdit(item.id)}>Salvar</Button>
											</div>
										</div>
									{:else}
										<div class="flex flex-col items-start md:items-end">
											<span class="font-bold text-lg {item.price === '' ? 'text-brand-danger' : 'text-navy'}">{item.price === '' ? 'A definir' : formatBRL(item.price)}</span>
											{#if item.notes}
												<span class="text-xs text-brand-brown bg-brand-amber/15 px-2 py-0.5 rounded border border-brand-amber/20 mt-1 truncate max-w-full" title={item.notes}>Obs: {item.notes}</span>
											{/if}
										</div>
									{/if}
								</div>
								<div class="md:col-span-1 flex justify-end">
									{#if editingId !== item.id}
										<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<button onclick={() => startEdit(item)} title="Editar" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand hover:bg-brand/10 transition-colors"><Pencil size={16} /></button>
											<button onclick={() => pagsup.removeScheduledNeg(item.id)} title="Remover" class="p-2 rounded-[var(--radius-sm)] text-grey hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"><Trash2 size={16} /></button>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
					<div class="px-5 py-4 bg-bg/60 border-t border-grey-200 flex justify-between items-center">
						<span class="text-sm font-bold text-grey uppercase tracking-wider">Subtotal</span>
						<span class="text-base font-semibold text-navy tabular-nums">{formatBRL(grandTotal)}</span>
					</div>
				</div>
			</Card>

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
			<p class="text-slate mb-6">Tem certeza que deseja finalizar? Isso irá zerar a escalação atual para que você possa iniciar um novo mês.</p>
			<div class="flex justify-end gap-3">
				<Button variant="ghost" onclick={() => (showResetModal = false)}>Cancelar</Button>
				<Button onclick={finalizar}>Sim, finalizar</Button>
			</div>
		</Card>
	</div>
{/if}
