<script lang="ts">
	// Aba Saúde: a nota de 0 a 100 de cada site e o porquê dela — a velocidade
	// medida no aparelho de quem visitou, os erros e os links quebrados (ver
	// src/lib/dmetric/saude.ts). À esquerda a lista, o pior primeiro; à direita,
	// o site escolhido.
	import { Card } from '$lib/components/ui';
	import { enderecoDaPagina, enderecoDoSite, haQuanto, nomeDoSite, numero, porcentagem, type DMetricSite } from '$lib/dmetric/painel';
	import {
		AMOSTRA_MINIMA,
		HORAS_ERROS,
		MEDIDAS,
		ROTULO_AVALIACAO,
		ROTULO_FAIXA,
		valorDaMedida,
		type Avaliacao,
		type Faixa,
		type SaudeSite
	} from '$lib/dmetric/saude';
	import { CircleCheck, CircleX, TriangleAlert, Gauge, Bug, Unlink, Info, FileDown, LoaderCircle } from '@lucide/svelte';
	import { toast } from '$lib/toast.svelte';

	let { saude, sites }: { saude: SaudeSite[]; sites: DMetricSite[] } = $props();

	const sitesPorId = $derived(new Map(sites.map((s) => [s.id, s])));
	let escolhido = $state<string | null>(null);
	const atual = $derived(saude.find((s) => s.site_id === escolhido) ?? saude[0]);
	const siteAtual = $derived(atual ? sitesPorId.get(atual.site_id) : undefined);

	// Cores de estado do design system (bom / atenção / ruim) — sempre com
	// ícone e texto ao lado, nunca a cor sozinha.
	const COR = { bom: '#17b26a', medio: '#f5a524', ruim: '#f04438' } as const;
	const TINTA = { bom: '#107d4a', medio: '#9a6b16', ruim: '#b42318' } as const;
	const deFaixa = (f: Faixa): Avaliacao => (f === 'otima' ? 'bom' : f === 'melhorar' ? 'medio' : 'ruim');
	const ICONE = { bom: CircleCheck, medio: TriangleAlert, ruim: CircleX } as const;
	const deNota = (n: number): Avaliacao => (n >= 90 ? 'bom' : n >= 50 ? 'medio' : 'ruim');

	// O PDF dos erros, para mandar a uma IA e pedir a correção. Feito aqui no
	// navegador (relatorioErros.ts), com o que a tela já tem.
	let gerando = $state(false);
	async function baixarPdf() {
		if (!atual || gerando) return;
		gerando = true;
		try {
			const { gerarPdfErros, nomeDoArquivo } = await import('$lib/dmetric/relatorioErros');
			const endereco = siteAtual ? enderecoDoSite(siteAtual) : '';
			const geradoEm = new Date();
			const bytes = await gerarPdfErros({
				site: { nome: siteAtual ? nomeDoSite(siteAtual) : 'Site', endereco },
				erros: atual.listaErros,
				distintos: atual.nErros,
				paginas: atual.cargas72,
				nota: atual.erros,
				horas: HORAS_ERROS,
				geradoEm
			});
			const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
			const a = document.createElement('a');
			a.href = url;
			a.download = nomeDoArquivo(endereco, geradoEm);
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		} catch (e) {
			console.error('[dmetric] pdf dos erros', e);
			toast.error('Não foi possível gerar o PDF dos erros.');
		} finally {
			gerando = false;
		}
	}

	const limites = (m: (typeof MEDIDAS)[number]) => `bom até ${valorDaMedida(m.id, m.bom)} · ruim acima de ${valorDaMedida(m.id, m.ruim)}`;
	const dataCurta = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
</script>

{#snippet anel(nota: number | null, faixa: Faixa | null, tamanho: number)}
	{@const r = tamanho / 2 - 5}
	{@const volta = 2 * Math.PI * r}
	<svg width={tamanho} height={tamanho} viewBox="0 0 {tamanho} {tamanho}" class="shrink-0" aria-hidden="true">
		<circle cx={tamanho / 2} cy={tamanho / 2} {r} fill="none" stroke="#eef1f5" stroke-width="6" />
		{#if nota !== null && faixa}
			<circle
				cx={tamanho / 2}
				cy={tamanho / 2}
				{r}
				fill="none"
				stroke={COR[deFaixa(faixa)]}
				stroke-width="6"
				stroke-linecap="round"
				stroke-dasharray="{(volta * nota) / 100} {volta}"
				transform="rotate(-90 {tamanho / 2} {tamanho / 2})"
			/>
		{/if}
		<text
			x="50%"
			y="50%"
			dominant-baseline="central"
			text-anchor="middle"
			class="fill-navy-900 font-bold tabular-nums"
			font-size={tamanho * 0.3}>{nota ?? '—'}</text
		>
	</svg>
{/snippet}

{#snippet selo(a: Avaliacao, texto: string)}
	{@const Ico = ICONE[a]}
	<span class="inline-flex items-center gap-1 text-xs font-semibold" style="color: {TINTA[a]}">
		<Ico size={13} />{texto}
	</span>
{/snippet}

{#if !saude.length}
	<Card class="border-dashed py-10 text-center">
		<Gauge size={28} class="mx-auto mb-2 text-grey" />
		<p class="text-sm font-medium text-navy">Ainda não há medidas de saúde neste recorte.</p>
		<p class="mx-auto mt-1 max-w-lg text-xs text-grey">
			O script mede a velocidade, os erros e os links quebrados no aparelho de quem visita desde 12/10/2026. As notas aparecem
			conforme as pessoas entram nos sites, sem precisar trocar o código.
		</p>
	</Card>
{:else}
	<p class="mb-4 flex items-start gap-1.5 text-xs text-slate">
		<Info size={13} class="mt-0.5 shrink-0 text-grey" />
		<span>
			Medido no celular e no computador de quem visitou de verdade, não num teste de laboratório. A nota vai de 0 a 100: velocidade
			(60%), erros (25%) e links quebrados (15%). As medidas são por dia: na última hora e nas 24 horas, valem hoje e ontem. Os erros da
			página valem só pelas últimas {HORAS_ERROS} horas: o que você corrigir some sozinho.
		</span>
	</p>

	<div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
		<!-- Lista: o pior primeiro -->
		<Card padding="none" class="self-start overflow-hidden">
			<p class="border-b border-grey-200 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-grey">
				{saude.length}
				{saude.length === 1 ? 'site medido' : 'sites medidos'} · o pior primeiro
			</p>
			<ul class="max-h-[34rem] overflow-y-auto">
				{#each saude as s (s.site_id)}
					{@const site = sitesPorId.get(s.site_id)}
					<li>
						<button
							type="button"
							onclick={() => (escolhido = s.site_id)}
							aria-current={atual?.site_id === s.site_id ? 'true' : undefined}
							class="flex w-full items-center gap-3 border-b border-grey-200/70 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-bg focus-visible:bg-bg focus-visible:outline-none {atual?.site_id ===
							s.site_id
								? 'bg-brand/[0.06]'
								: ''}"
						>
							{@render anel(s.nota, s.faixa, 40)}
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-semibold text-navy">{site ? nomeDoSite(site) : 'Site excluído'}</span>
								<span class="block truncate text-[11px] text-grey">{site ? enderecoDoSite(site) : ''}</span>
							</span>
							{#if s.faixa}
								{@const a = deFaixa(s.faixa)}
								{@const Ico = ICONE[a]}
								<span style="color: {TINTA[a]}" title={ROTULO_FAIXA[s.faixa]}><Ico size={15} /></span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</Card>

		{#if atual}
			<div class="min-w-0 space-y-5">
				<!-- Cabeçalho: a nota e as três partes -->
				<Card>
					<div class="flex flex-wrap items-center gap-4">
						{@render anel(atual.nota, atual.faixa, 76)}
						<div class="min-w-0 flex-1">
							<h2 class="truncate text-lg font-bold text-navy">{siteAtual ? nomeDoSite(siteAtual) : 'Site excluído'}</h2>
							{#if siteAtual}<p class="truncate text-xs text-grey">{enderecoDoSite(siteAtual)}</p>{/if}
							<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
								{#if atual.faixa}
									{@render selo(deFaixa(atual.faixa), ROTULO_FAIXA[atual.faixa])}
								{:else}
									<span class="text-xs text-grey">Sem nota: ainda não chegaram medidas de velocidade.</span>
								{/if}
								<span class="text-[11px] text-grey">
									{numero(atual.amostra)}
									{atual.amostra === 1 ? 'visita medida' : 'visitas medidas'} · {numero(atual.cargas)}
									{atual.cargas === 1 ? 'página aberta' : 'páginas abertas'}
								</span>
							</div>
							{#if atual.nota !== null && atual.amostra < AMOSTRA_MINIMA}
								<p class="mt-1.5 text-[11px] text-[#9a6b16]">Poucas medidas ainda: a nota pode mudar bastante nos próximos dias.</p>
							{/if}
						</div>
					</div>

					<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
						{#each [
							{ rotulo: 'Velocidade', nota: atual.velocidade, nota2: 'no aparelho de quem visitou', icon: Gauge },
							{ rotulo: 'Erros', nota: atual.erros, nota2: atual.nErros ? `${numero(atual.nErros)} ${atual.nErros === 1 ? 'tipo de erro' : 'tipos de erro'} em ${HORAS_ERROS} h` : `nenhum em ${HORAS_ERROS} h`, icon: Bug },
							{ rotulo: 'Links quebrados', nota: atual.links, nota2: atual.nQuebrados ? `${numero(atual.nQuebrados)} ${atual.nQuebrados === 1 ? 'endereço deu 404' : 'endereços deram 404'}` : 'nenhum 404', icon: Unlink }
						] as p (p.rotulo)}
							{@const Ico = p.icon}
							<div class="rounded-[var(--radius)] border border-grey-200 px-3 py-2.5">
								<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-grey"><Ico size={13} />{p.rotulo}</p>
								<p class="mt-1 flex items-baseline gap-2">
									<span class="text-xl font-bold tabular-nums text-navy-900">{p.nota ?? '—'}</span>
									{#if p.nota !== null}{@render selo(deNota(p.nota), p.nota >= 90 ? 'Bom' : p.nota >= 50 ? 'Atenção' : 'Ruim')}{/if}
								</p>
								<p class="mt-0.5 truncate text-[11px] text-grey">{p.nota2}</p>
							</div>
						{/each}
					</div>
				</Card>

				<!-- Velocidade, medida a medida -->
				<Card>
					<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
						<h3 class="text-base font-bold text-navy">Velocidade no aparelho de quem visitou</h3>
						<div class="flex items-center gap-3 text-[11px] text-slate" aria-label="Legenda">
							{#each (['bom', 'medio', 'ruim'] as const) as a (a)}
								<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-[2px]" style="background: {COR[a]}"></span>{ROTULO_AVALIACAO[a]}</span>
							{/each}
						</div>
					</div>
					{#if !atual.medidas.length}
						<p class="py-4 text-center text-xs text-grey">Nenhuma medida de velocidade chegou ainda deste site.</p>
					{:else}
						<ul class="divide-y divide-grey-200/70">
							{#each MEDIDAS as m (m.id)}
								{@const v = atual.medidas.find((x) => x.id === m.id)}
								<li class="grid grid-cols-1 gap-x-5 gap-y-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-center">
									<div class="min-w-0">
										<p class="text-sm font-semibold text-navy">
											{m.nome} <span class="text-[10px] font-medium text-grey">{m.sigla}</span>
										</p>
										<p class="text-[11px] text-grey">{m.explica}</p>
									</div>
									{#if v}
										<div class="min-w-0">
											<div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
												<p class="text-sm">
													<b class="font-bold tabular-nums text-navy-900">{valorDaMedida(m.id, v.media)}</b>
													<span class="text-[11px] text-grey">em média · {numero(v.n)} {v.n === 1 ? 'medida' : 'medidas'}</span>
												</p>
												{@render selo(v.avaliacao, ROTULO_AVALIACAO[v.avaliacao])}
											</div>
											<!-- Bom / a melhorar / ruim, lado a lado, com um respiro entre eles -->
											<div class="flex h-2.5 gap-[2px] overflow-hidden rounded-full" title={limites(m)}>
												{#each (['bom', 'medio', 'ruim'] as const) as a (a)}
													{@const n = a === 'bom' ? v.bons : a === 'medio' ? v.medios : v.ruins}
													{#if n}<span style="flex: {n} 1 0%; background: {COR[a]}"></span>{/if}
												{/each}
											</div>
											<p class="mt-1 text-[11px] tabular-nums text-slate">
												{porcentagem(v.bons / v.n)} bom · {porcentagem(v.medios / v.n)} a melhorar · {porcentagem(v.ruins / v.n)} ruim
												<span class="text-grey">({limites(m)})</span>
											</p>
										</div>
									{:else}
										<p class="text-[11px] text-grey">
											{m.id === 'inp'
												? 'Ninguém tocou ou clicou em nada ainda, ou o navegador não mede (Safari).'
												: m.id === 'cls'
													? 'O Safari (iPhone) não mede esta; aparece com as visitas de Android e computador.'
													: 'Sem medida ainda.'}
										</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</Card>

				<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
					<!-- Erros -->
					<Card class="min-w-0">
						<div class="flex items-center justify-between gap-2">
							<h3 class="text-base font-bold text-navy">Erros na página</h3>
							<div class="flex items-center gap-2">
								<span class="text-xs font-medium text-grey">{numero(atual.nErros)}</span>
								{#if atual.listaErros.length}
									<!-- Só o ícone; a explicação aparece ao passar o mouse (ou focar). -->
									<button
										type="button"
										onclick={baixarPdf}
										disabled={gerando}
										aria-label="Baixar PDF com estes erros, para mandar a uma IA e pedir a correção"
										class="group relative grid size-8 place-items-center rounded-[var(--radius-sm)] bg-[#f04438]/10 text-[#b42318] transition-colors hover:bg-[#f04438]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f04438]/40 disabled:opacity-60"
									>
										{#if gerando}<LoaderCircle size={15} class="animate-spin" />{:else}<FileDown size={15} />{/if}
										<span
											role="tooltip"
											class="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-max max-w-64 rounded-[var(--radius-sm)] bg-navy-900 px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
										>
											Baixar PDF com estes erros, organizado para mandar a uma IA e pedir a correção
										</span>
									</button>
								{/if}
							</div>
						</div>
						<!-- A lista anda sozinha: só as últimas 72 horas (migration 0083). -->
						<p class="mb-3 mt-0.5 text-[11px] text-grey">
							Últimas {HORAS_ERROS} horas · o que for corrigido some quando passar {HORAS_ERROS} h sem acontecer
						</p>
						{#if !atual.listaErros.length}
							<p class="flex items-center gap-1.5 py-2 text-xs text-slate">
								<CircleCheck size={14} class="text-[#107d4a]" /> Nenhum erro de JavaScript nem arquivo que não carregou nas últimas {HORAS_ERROS} horas.
							</p>
						{:else}
							<ul class="max-h-80 space-y-2 overflow-y-auto pr-1">
								{#each atual.listaErros as e (`${e.tipo}|${e.mensagem}|${e.pagina}`)}
									<li class="rounded-[var(--radius)] border border-grey-200 px-3 py-2">
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 break-words font-mono text-xs text-navy-900">{e.mensagem}</p>
											<span class="shrink-0 text-xs font-bold tabular-nums text-navy-900" title="vezes">{numero(e.ocorrencias)}×</span>
										</div>
										<p class="mt-1 text-[11px] text-grey">
											<span class="font-semibold text-slate">{e.tipo === 'js' ? 'Erro de JavaScript' : 'Arquivo não carregou'}</span>
											· em {enderecoDaPagina(siteAtual, e.pagina)}
											{#if e.origem && e.tipo === 'js'}· script de {e.origem}{/if}
											· última vez {e.ultimo_em ? haQuanto(e.ultimo_em) : `em ${dataCurta(e.ultimo)}`}
										</p>
									</li>
								{/each}
							</ul>
							{#if atual.nErros > atual.listaErros.length}
								<p class="mt-2 text-[11px] text-grey">
									Mostrando os {atual.listaErros.length} mais frequentes de {numero(atual.nErros)} erros diferentes.
								</p>
							{/if}
						{/if}
					</Card>

					<!-- Links quebrados -->
					<Card class="min-w-0">
						<h3 class="mb-3 flex items-baseline justify-between text-base font-bold text-navy">
							Links quebrados (404)
							<span class="text-xs font-medium text-grey">{numero(atual.nQuebrados)}</span>
						</h3>
						{#if !atual.quebrados.length}
							<p class="flex items-center gap-1.5 py-2 text-xs text-slate">
								<CircleCheck size={14} class="text-[#107d4a]" /> Ninguém caiu numa página que não existe no período.
							</p>
						{:else}
							<ul class="max-h-80 space-y-2 overflow-y-auto pr-1">
								{#each atual.quebrados as e (`${e.mensagem}|${e.pagina}`)}
									<li class="rounded-[var(--radius)] border border-grey-200 px-3 py-2">
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 break-all text-xs font-semibold text-navy-900">{enderecoDaPagina(siteAtual, e.mensagem)}</p>
											<span class="shrink-0 text-xs font-bold tabular-nums text-navy-900">{numero(e.ocorrencias)}×</span>
										</div>
										<p class="mt-1 text-[11px] text-grey">
											{#if e.origem.startsWith('/')}
												O link quebrado está em <span class="font-semibold text-slate">{enderecoDaPagina(siteAtual, e.origem)}</span>
											{:else if e.origem && e.origem !== 'Direto'}
												Chegaram de <span class="font-semibold text-slate">{e.origem}</span>: o link errado está lá
											{:else}
												Abriram direto (link salvo, QR Code ou app que não diz de onde veio)
											{/if}
											· último em {dataCurta(e.ultimo)}
										</p>
									</li>
								{/each}
							</ul>
							{#if atual.nQuebrados > atual.quebrados.length}
								<p class="mt-2 text-[11px] text-grey">
									Mostrando os {atual.quebrados.length} mais frequentes de {numero(atual.nQuebrados)} endereços.
								</p>
							{/if}
						{/if}
					</Card>
				</div>
			</div>
		{/if}
	</div>
{/if}
