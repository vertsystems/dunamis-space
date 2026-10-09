<script lang="ts">
	// Painel público do financeiro do cliente (link gerado na Planilha Mensal).
	// Mostra os pagamentos do mês e deixa baixar as NFs e os recibos — um por um
	// ou todos num .zip. Quem abre não tem login.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/dspace-logo.svg';
	import { formatBRL } from '$lib/clientes';
	import { lojaNome } from '$lib/pagsup/types';
	import {
		DOC_GENERO,
		DOC_ROTULO,
		MESES_DE_RETENCAO,
		nomeDeDownload,
		nomesUnicos,
		urlDoDocumento,
		type PagamentoPublico
	} from '$lib/pagsup/documentos';
	import { toast } from '$lib/toast.svelte';
	import { Card } from '$lib/components/ui';
	import { Download, Eye, FileText, Check, Clock, Archive } from '@lucide/svelte';

	let { data } = $props();
	const painel = $derived(data.painel);
	const supabaseUrl = env.PUBLIC_SUPABASE_URL ?? '';

	function rotuloMes(m: string | null): string {
		const [a, mm] = (m ?? '').split('-').map(Number);
		if (!a || !mm) return m ?? '';
		const t = new Date(a, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	function fmtData(iso: string): string {
		const [a, m, d] = (iso ?? '').split('-');
		return a && m && d ? `${d}/${m}/${a}` : iso;
	}

	const comPdf = (p: PagamentoPublico) => !!p.doc_arquivo;

	/**
	 * Número de cada pagamento na lista do mês, na ordem de lançamento (a função
	 * pagsup_publico já devolve nessa ordem). Fica o mesmo com qualquer filtro,
	 * para "o 14" ser o mesmo pagamento para quem conversa sobre ele.
	 */
	const numero = $derived(new Map(painel.pagamentos.map((p, i) => [p.id, i + 1])));
	/**
	 * A tela mostra do lançamento mais recente para o mais antigo. O número
	 * continua contando do primeiro: assim um pagamento novo entra no topo sem
	 * mudar o número de quem já estava na lista.
	 */
	const recentesPrimeiro = $derived([...painel.pagamentos].reverse());
	const casas = $derived(String(painel.pagamentos.length).length);
	const numeroDe = (p: PagamentoPublico) => String(numero.get(p.id) ?? 0).padStart(casas, '0');

	// O número vai no nome do arquivo: na pasta, os PDFs ficam na ordem da lista.
	const nomeDe = (p: PagamentoPublico) =>
		`${numeroDe(p)} - ${nomeDeDownload(p.doc_tipo ?? 'nf', p.prestador, p.data)}`;

	// ---- O que este navegador já baixou --------------------------------------
	// Só conveniência de quem abre: some se limparem o navegador, e não é
	// compartilhado entre pessoas. Serve para achar "as que faltam" sem planilha
	// paralela.
	const chave = $derived(`pagsup_baixados_${page.params.token}`);
	let baixados = $state<Record<string, string>>({});

	$effect(() => {
		try {
			baixados = JSON.parse(localStorage.getItem(chave) ?? '{}') ?? {};
		} catch {
			baixados = {};
		}
	});

	function marcar(ids: string[]) {
		const hoje = new Date().toISOString().slice(0, 10);
		baixados = { ...baixados, ...Object.fromEntries(ids.map((id) => [id, hoje])) };
		try {
			localStorage.setItem(chave, JSON.stringify(baixados));
		} catch {
			/* navegador sem armazenamento: só não lembra depois */
		}
	}

	// ---- Filtro ---------------------------------------------------------------
	type Filtro = 'todos' | 'faltam' | 'aguardando';
	let filtro = $state<Filtro>('todos');

	const disponiveis = $derived(recentesPrimeiro.filter(comPdf));
	const faltam = $derived(disponiveis.filter((p) => !baixados[p.id]));
	const aguardando = $derived(recentesPrimeiro.filter((p) => !p.doc_tipo));
	const total = $derived(painel.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0));

	const visiveis = $derived(
		filtro === 'faltam' ? faltam : filtro === 'aguardando' ? aguardando : recentesPrimeiro
	);

	// Trocar de mês limpa o filtro: "faltam baixar" de outro mês confunde.
	function trocarMes(mes: string) {
		filtro = 'todos';
		goto(`?mes=${mes}`, { keepFocus: true, noScroll: true });
	}

	// ---- Baixar todos (.zip) --------------------------------------------------
	let zipando = $state(false);

	async function baixarZip(lista: PagamentoPublico[]) {
		if (!lista.length || zipando) return;
		zipando = true;
		try {
			const [{ zipSync }, arquivos] = await Promise.all([
				import('fflate'),
				Promise.all(
					lista.map(async (p) => {
						const r = await fetch(urlDoDocumento(supabaseUrl, p.doc_arquivo!));
						if (!r.ok) throw new Error(`${r.status}`);
						return new Uint8Array(await r.arrayBuffer());
					})
				)
			]);
			const nomes = nomesUnicos(lista.map(nomeDe));
			// Nível 0: PDF já vem comprimido, recomprimir só gasta tempo.
			const zip = zipSync(Object.fromEntries(nomes.map((n, i) => [n, [arquivos[i], { level: 0 }]])));

			const a = document.createElement('a');
			a.href = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
			a.download = `NFs e recibos - ${painel.cliente} - ${rotuloMes(painel.mes)}.zip`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
			marcar(lista.map((p) => p.id));
		} catch (e) {
			console.error('[pagamentos] zip', e);
			toast.error('Não foi possível montar o .zip. Baixe os arquivos um por um.');
		} finally {
			zipando = false;
		}
	}

	const paraZip = $derived(filtro === 'faltam' ? faltam : disponiveis);

	const abaCls = (ativa: boolean) =>
		`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
			ativa ? 'bg-surface text-navy shadow-sm' : 'text-grey hover:text-navy'
		}`;
</script>

{#snippet documento(p: PagamentoPublico)}
	{#if p.doc_arquivo && p.doc_tipo}
		<div class="flex items-center gap-1.5">
			<a
				href={urlDoDocumento(supabaseUrl, p.doc_arquivo, nomeDe(p))}
				onclick={() => marcar([p.id])}
				class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-semibold transition-colors {baixados[p.id]
					? 'bg-bg text-slate hover:bg-grey-200'
					: 'bg-brand/10 text-brand hover:bg-brand/20'}"
			>
				{#if baixados[p.id]}<Check size={13} />{:else}<Download size={13} />{/if}
				{DOC_ROTULO[p.doc_tipo]}
			</a>
			<a
				href={urlDoDocumento(supabaseUrl, p.doc_arquivo)}
				target="_blank"
				rel="noopener noreferrer"
				title="Ver sem baixar"
				aria-label="Ver {DOC_ROTULO[p.doc_tipo]} de {p.prestador}"
				class="grid size-6 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-bg hover:text-navy"
			><Eye size={14} /></a>
			{#if baixados[p.id]}<span class="hidden text-[10px] text-grey sm:inline">baixad{DOC_GENERO[p.doc_tipo]}</span>{/if}
		</div>
	{:else if p.doc_tipo}
		<span
			class="inline-flex items-center gap-1.5 text-[11px] text-grey"
			title="Os PDFs ficam disponíveis por {MESES_DE_RETENCAO} meses depois do envio."
		><Archive size={13} /> {DOC_ROTULO[p.doc_tipo]} expirad{DOC_GENERO[p.doc_tipo]}</span>
	{:else}
		<span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-brown">
			<Clock size={13} /> Aguardando prestador
		</span>
	{/if}
{/snippet}
<svelte:head>
	<title>Pagamentos · {painel.cliente}</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<main class="min-h-screen bg-bg px-4 py-8 sm:py-12">
	<div class="mx-auto w-full max-w-5xl">
		<header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<img src={logo} alt="Dunamis Space" class="mb-4 h-[22px] w-auto" />
				<h1 class="text-2xl font-bold text-navy">Pagamentos · {painel.cliente}</h1>
				<p class="mt-1 text-sm text-grey">Prestadores pagos no mês, com as NFs e os recibos para baixar.</p>
			</div>
			{#if painel.meses.length}
				<label class="flex items-center gap-2 text-sm text-slate">
					<span class="sr-only sm:not-sr-only">Mês</span>
					<select
						value={painel.mes}
						onchange={(e) => trocarMes(e.currentTarget.value)}
						class="h-10 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm font-medium text-navy shadow-xs focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					>
						{#each painel.meses as m (m)}<option value={m}>{rotuloMes(m)}</option>{/each}
					</select>
				</label>
			{/if}
		</header>

		{#if !painel.mes}
			<Card class="py-12 text-center">
				<p class="text-base font-medium text-navy">Ainda não há pagamentos registrados.</p>
			</Card>
		{:else}
			<!-- Resumo do mês -->
			<div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
				{#each [
					{ rotulo: 'Total do mês', valor: formatBRL(total) },
					{ rotulo: 'Pagamentos', valor: String(painel.pagamentos.length) },
					{ rotulo: 'NFs e recibos', valor: String(disponiveis.length) },
					{ rotulo: 'Aguardando prestador', valor: String(aguardando.length) }
				] as t (t.rotulo)}
					<div class="rounded-[var(--radius)] border border-grey-200 bg-surface px-4 py-3 shadow-xs">
						<p class="text-[10px] font-bold uppercase tracking-wider text-grey">{t.rotulo}</p>
						<p class="mt-1 text-lg font-bold tabular-nums text-navy">{t.valor}</p>
					</div>
				{/each}
			</div>

			<!-- Filtro + baixar todos -->
			<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<nav class="inline-flex flex-wrap self-start rounded-full bg-grey-200/60 p-0.5" aria-label="Filtrar pagamentos">
					<button type="button" class={abaCls(filtro === 'todos')} aria-pressed={filtro === 'todos'} onclick={() => (filtro = 'todos')}>
						Todos
					</button>
					<button type="button" class={abaCls(filtro === 'faltam')} aria-pressed={filtro === 'faltam'} onclick={() => (filtro = 'faltam')}>
						Faltam baixar <span class="tabular-nums">({faltam.length})</span>
					</button>
					<button type="button" class={abaCls(filtro === 'aguardando')} aria-pressed={filtro === 'aguardando'} onclick={() => (filtro = 'aguardando')}>
						Aguardando <span class="tabular-nums">({aguardando.length})</span>
					</button>
				</nav>
				{#if paraZip.length}
					<button
						type="button"
						onclick={() => baixarZip(paraZip)}
						disabled={zipando}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[color:color-mix(in_srgb,var(--color-brand)_90%,black)] px-4 text-sm font-semibold text-white shadow-xs transition-all hover:brightness-[1.07] disabled:opacity-60"
					>
						{#if zipando}
							<span class="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span> Montando o .zip…
						{:else}
							<Download size={16} />
							{filtro === 'faltam' ? 'Baixar as que faltam' : 'Baixar todas'} ({paraZip.length}) .zip
						{/if}
					</button>
				{/if}
			</div>

			{#if visiveis.length === 0}
				<Card class="border-dashed py-12 text-center">
					<span class="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-brand-green/12 text-brand-green"><Check size={26} /></span>
					<p class="text-base font-medium text-navy">
						{filtro === 'faltam' ? 'Você já baixou todas as NFs e recibos deste mês.' : 'Nenhum pagamento aguardando documento.'}
					</p>
				</Card>
			{:else}
				<!-- Uma lista só, por ordem de lançamento, do mais recente (no topo) ao
				     mais antigo. (Era agrupada por categoria.) -->
				<Card padding="none" class="overflow-hidden">
					<!-- Celular: o link chega pelo WhatsApp, então a lista empilha em vez de
					     espremer as colunas. -->
					<ul class="divide-y divide-grey-200/70 sm:hidden">
						{#each visiveis as p (p.id)}
							<li class="flex items-center justify-between gap-3 px-4 py-2.5">
								<div class="flex min-w-0 items-start gap-2.5">
									<span class="mt-0.5 shrink-0 font-mono text-[11px] font-semibold text-grey">{numeroDe(p)}</span>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium text-navy">{p.prestador}</p>
										<p class="truncate text-[11px] text-slate">{p.servico}</p>
										<p class="text-[11px] text-slate">
											<span class="font-semibold">{p.lj || '-'}</span> · {fmtData(p.data)} ·
											<span class="font-mono font-medium text-navy">{formatBRL(p.valor)}</span>
										</p>
									</div>
								</div>
								<div class="shrink-0">{@render documento(p)}</div>
							</li>
						{/each}
					</ul>
					<div class="hidden overflow-x-auto sm:block">
						<table class="w-full min-w-[860px] table-fixed border-collapse text-left">
							<thead>
								<tr class="border-b border-grey-200 bg-bg/50 text-[10px] uppercase tracking-wider text-grey">
									<th scope="col" class="w-12 py-2.5 pl-5 pr-2 font-semibold">Nº</th>
									<th scope="col" class="px-3 py-2.5 font-semibold">Prestador</th>
									<th scope="col" class="w-44 px-3 py-2.5 font-semibold">Serviço</th>
									<th scope="col" class="w-28 px-3 py-2.5 font-semibold">Região</th>
									<th scope="col" class="w-14 px-3 py-2.5 font-semibold">LJ</th>
									<th scope="col" class="w-24 px-3 py-2.5 font-semibold">Data</th>
									<th scope="col" class="w-28 px-3 py-2.5 text-right font-semibold">Valor</th>
									<th scope="col" class="w-48 px-5 py-2.5 font-semibold">NF / Recibo</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grey-200/70">
								{#each visiveis as p (p.id)}
									<tr>
										<td class="py-2 pl-5 pr-2 font-mono text-[11px] font-semibold text-grey">{numeroDe(p)}</td>
										<td class="truncate px-3 py-2 text-xs font-medium text-navy" title={p.prestador}>{p.prestador}</td>
										<td class="truncate px-3 py-2 text-[11px] text-slate" title={p.servico}>{p.servico}</td>
										<td class="truncate px-3 py-2 text-[11px] text-slate" title={p.regiao ?? ''}>{p.regiao || '-'}</td>
										<td class="px-3 py-2 text-[11px] font-semibold text-slate" title={lojaNome(p.lj)}>{p.lj || '-'}</td>
										<td class="px-3 py-2 text-[11px] tabular-nums text-slate">{fmtData(p.data)}</td>
										<td class="px-3 py-2 text-right font-mono text-[11px] font-medium text-navy">{formatBRL(p.valor)}</td>
										<td class="px-5 py-2">{@render documento(p)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/if}

			<p class="mt-6 flex items-start gap-2 text-xs text-grey">
				<FileText size={14} class="mt-px shrink-0" />
				Os PDFs ficam disponíveis por {MESES_DE_RETENCAO} meses depois do envio. O ✓ de já baixado vale só para este
				navegador.
			</p>
		{/if}
	</div>
</main>
