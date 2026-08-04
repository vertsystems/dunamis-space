<script lang="ts">
	// Fechamento do mês: junta tudo que foi pago (as semanas finalizadas no
	// cronograma + lançamentos avulsos) e gera a planilha de prestação de contas.
	import { pagsup } from '$lib/pagsup/store.svelte';
	import type { Payment, Provider } from '$lib/pagsup/types';
	import { formatBRL } from '$lib/clientes';
	import { Button, Card } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import { hojeISO } from '$lib/datas';
	import { Search, Trash2, FileSpreadsheet, Plus, X, DollarSign } from '@lucide/svelte';

	// As abas do Pag's Up vêm do +page.svelte para ficarem nesta mesma barra.
	let { abas }: { abas?: import('svelte').Snippet } = $props();

	/** AAAA-MM do mês corrente — o fechamento é sempre "o mês que passou ou este". */
	let mes = $state(hojeISO().slice(0, 7));

	const doMes = $derived(pagsup.payments.filter((p) => (p.date ?? '').startsWith(mes)));
	const total = $derived(doMes.reduce((s, p) => s + (Number(p.value) || 0), 0));

	/** Agrupado por loja — é assim que a prestação de contas é lida. */
	const porLoja = $derived.by(() => {
		const g: Record<string, Payment[]> = {};
		for (const p of doMes) (g[nomeLoja(p.clientId)] ??= []).push(p);
		return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
	});

	function nomeLoja(clientId: string): string {
		return pagsup.clients.find((c) => c.id === clientId)?.name ?? '(loja removida)';
	}

	function rotuloMes(m: string): string {
		const [a, mm] = m.split('-').map(Number);
		if (!a || !mm) return m;
		return new Date(a, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
	}

	function fmtData(iso: string): string {
		const [a, m, d] = (iso ?? '').split('-');
		return a && m && d ? `${d}/${m}/${a}` : iso;
	}

	// ---- Lançar pagamento avulso (feito antes ou esquecido) ----
	let lancando = $state(false);
	let busca = $state('');
	let escolhido = $state<Provider | null>(null);
	let valor = $state<number | ''>('');
	let data = $state(hojeISO());
	let obs = $state('');

	const resultados = $derived.by(() => {
		const q = busca.trim().toLowerCase();
		if (!q || escolhido) return [] as Provider[];
		// Todos os prestadores, de todas as lojas: o lançamento avulso pode ser de
		// qualquer uma, independente da loja selecionada no topo.
		return pagsup.providers
			.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.region.toLowerCase().includes(q) ||
					p.service.toLowerCase().includes(q)
			)
			.slice(0, 8);
	});

	function abrirLancamento() {
		lancando = true;
		escolhido = null;
		busca = '';
		valor = '';
		obs = '';
		// Cai no dia 1 do mês que está sendo fechado, não no de hoje: quase sempre
		// se lança um pagamento do mês visto, não do atual.
		data = mes === hojeISO().slice(0, 7) ? hojeISO() : `${mes}-01`;
	}

	function registrar() {
		if (!escolhido) {
			toast.error('Escolha o prestador na busca.');
			return;
		}
		if (valor === '' || Number(valor) <= 0) {
			toast.error('Informe o valor pago.');
			return;
		}
		pagsup.addPayment({
			clientId: escolhido.clientId ?? pagsup.selectedClientId,
			providerId: escolhido.id,
			providerName: escolhido.name,
			service: escolhido.service,
			region: escolhido.region,
			value: Number(valor),
			date: data,
			notes: obs
		});
		toast.success(`Pagamento de ${escolhido.name} registrado`);
		lancando = false;
	}

	async function gerarPlanilha() {
		if (!doMes.length) {
			toast.error('Não há pagamentos neste mês para gerar a planilha.');
			return;
		}
		try {
			const { exportMonthlyXlsx } = await import('$lib/pagsup/excel');
			await exportMonthlyXlsx(
				porLoja.map(([loja, itens]) => ({
					loja,
					itens: itens.map((p) => ({
						providerName: p.providerName,
						service: p.service,
						region: p.region ?? '',
						date: fmtData(p.date),
						value: Number(p.value) || 0
					}))
				})),
				{ mesLabel: rotuloMes(mes) }
			);
			toast.success('Planilha mensal gerada');
		} catch {
			toast.error('Falha ao gerar a planilha.');
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
				<p class="text-[10px] font-bold text-grey uppercase tracking-wider leading-none">Total do mês</p>
				<p class="text-sm font-bold text-navy leading-none tabular-nums">{formatBRL(total)}</p>
			</div>
			<input type="month" bind:value={mes} aria-label="Mês da planilha" class="{fieldCls} w-auto" />
			<Button variant="secondary" onclick={abrirLancamento}><Plus size={17} /> Lançar pagamento</Button>
			<Button onclick={gerarPlanilha}><FileSpreadsheet size={17} /> Gerar Planilha</Button>
		</div>
	</div>

	{#if lancando}
		<Card class="mb-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-navy">Lançar pagamento avulso</h3>
				<button onclick={() => (lancando = false)} class="p-1 text-grey transition-colors hover:text-navy"><X size={20} /></button>
			</div>

			{#if escolhido}
				<div class="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-grey-200 bg-bg/50 px-4 py-2.5">
					<span class="text-sm font-medium text-navy">{escolhido.name}</span>
					<span class="text-xs text-grey">{escolhido.service} · {escolhido.region}</span>
					<span class="text-xs text-slate">Loja: {nomeLoja(escolhido.clientId ?? '')}</span>
					<button onclick={() => (escolhido = null)} class="ml-auto text-xs font-medium text-brand hover:underline">Trocar</button>
				</div>
			{:else}
				<div class="relative mb-4">
					<span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-grey"><Search size={17} /></span>
					<input
						bind:value={busca}
						type="search"
						autocomplete="off"
						placeholder="Buscar prestador por nome, região ou categoria…"
						class="{fieldCls} pl-10"
					/>
					{#if busca.trim()}
						<div class="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-[var(--radius)] border border-grey-200 bg-surface shadow-lg">
							{#if resultados.length === 0}
								<p class="px-4 py-3 text-sm text-grey">Nenhum prestador encontrado.</p>
							{:else}
								{#each resultados as p (p.id)}
									<button
										type="button"
										onclick={() => { escolhido = p; valor = p.defaultPrice || ''; }}
										class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand/[0.06]"
									>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-sm font-medium text-navy">{p.name}</span>
											<span class="block truncate text-xs text-grey">{p.service} · {p.region} · {nomeLoja(p.clientId ?? '')}</span>
										</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
				<div>
					<label for="pg-valor" class="mb-1 block text-xs font-medium text-slate">Valor pago</label>
					<input id="pg-valor" type="number" min="0" step="0.01" placeholder="R$ 0,00" value={valor}
						oninput={(e) => (valor = e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))}
						class={fieldCls} />
				</div>
				<div>
					<label for="pg-data" class="mb-1 block text-xs font-medium text-slate">Data do pagamento</label>
					<input id="pg-data" type="date" bind:value={data} class={fieldCls} />
				</div>
				<div>
					<label for="pg-obs" class="mb-1 block text-xs font-medium text-slate">Observações</label>
					<input id="pg-obs" bind:value={obs} placeholder="Opcional…" class={fieldCls} />
				</div>
				<div class="flex items-end">
					<Button block onclick={registrar}>Registrar pagamento</Button>
				</div>
			</div>
		</Card>
	{/if}

	{#if doMes.length === 0}
		<Card class="border-dashed py-12 text-center">
			<span class="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-bg text-grey"><FileSpreadsheet size={30} /></span>
			<h3 class="mb-1 text-base font-medium text-navy">Nenhum pagamento em {rotuloMes(mes)}</h3>
			<p class="mx-auto max-w-md text-sm text-grey">
				Os pagamentos entram aqui quando você finaliza o cronograma da semana. Use
				<b class="font-medium text-navy">Lançar pagamento</b> para registrar o que foi pago fora dele.
			</p>
		</Card>
	{:else}
		<div class="space-y-5">
			{#each porLoja as [loja, itens] (loja)}
				{@const subtotal = itens.reduce((s, p) => s + (Number(p.value) || 0), 0)}
				<Card padding="none" class="overflow-hidden">
					<div class="flex items-center justify-between gap-3 border-b border-grey-200 bg-bg/50 px-5 py-3.5">
						<div class="flex items-center gap-3">
							<span class="h-7 w-1.5 rounded-full bg-brand"></span>
							<h3 class="text-base font-bold text-navy">{loja}</h3>
							<span class="rounded-full bg-grey-200 px-2.5 py-0.5 text-xs font-bold text-slate">
								{itens.length} {itens.length === 1 ? 'pagamento' : 'pagamentos'}
							</span>
						</div>
						<div class="text-right">
							<p class="text-[10px] font-semibold uppercase tracking-wider text-grey">Subtotal</p>
							<p class="text-base font-bold tabular-nums text-navy">{formatBRL(subtotal)}</p>
						</div>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-left">
							<thead>
								<tr class="border-b border-grey-200 text-xs uppercase tracking-wider text-grey">
									<th scope="col" class="px-5 py-3 font-semibold">Prestador</th>
									<th scope="col" class="px-5 py-3 font-semibold">Serviço</th>
									<th scope="col" class="px-5 py-3 font-semibold">Região</th>
									<th scope="col" class="px-5 py-3 font-semibold">Data</th>
									<th scope="col" class="px-5 py-3 text-right font-semibold">Valor</th>
									<th scope="col" class="w-14 px-5 py-3"><span class="sr-only">Ações</span></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grey-200/70">
								{#each itens as p (p.id)}
									<tr class="group transition-colors hover:bg-bg/50">
										<td class="px-5 py-3 font-medium text-navy">{p.providerName}</td>
										<td class="px-5 py-3 text-sm text-slate">{p.service}</td>
										<td class="px-5 py-3 text-sm text-slate">{p.region || '-'}</td>
										<td class="px-5 py-3 text-sm tabular-nums text-slate">{fmtData(p.date)}</td>
										<td class="px-5 py-3 text-right font-mono font-medium text-navy">{formatBRL(p.value)}</td>
										<td class="px-5 py-3">
											<button
												onclick={() => pagsup.deletePayment(p.id)}
												title="Excluir pagamento"
												aria-label="Excluir pagamento de {p.providerName}"
												class="rounded-[var(--radius-sm)] p-2 text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
											><Trash2 size={17} /></button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
