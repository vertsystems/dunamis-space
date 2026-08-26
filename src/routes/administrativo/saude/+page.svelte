<script lang="ts">
	// Painel de Saúde: em uma tela, quanto o sistema ocupa e onde a informação
	// ainda está entrando. A pergunta que ele responde é "o que está vivo aqui?".
	import { Card, Badge } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import {
		GRUPOS,
		formatarBytes,
		montarLinhas,
		ordenar,
		quandoFoi,
		tabelasDeApoio
	} from '$lib/saude';
	import type { Grupo } from '$lib/saude';

	let { data } = $props();
	const r = $derived(data.resumo);

	const linhas = $derived(r ? ordenar(montarLinhas(r)) : []);
	const ativos = $derived(linhas.filter((l) => l.situacao === 'ativo'));
	const parados = $derived(linhas.filter((l) => l.situacao === 'parado'));
	const vazios = $derived(linhas.filter((l) => l.situacao === 'vazio'));
	const registros = $derived(linhas.reduce((s, l) => s + l.linhas, 0));

	// O limite do plano gratuito do Supabase. Serve de régua: o número sozinho
	// ("2,6 MB") não diz se é muito ou pouco.
	const LIMITE_BYTES = 500 * 1024 * 1024;
	const usoPct = $derived(r ? (r.dados_bytes / LIMITE_BYTES) * 100 : 0);

	// Só mostra o grupo que tem alguma linha (evita cabeçalho órfão).
	function doGrupo(g: Grupo) {
		return linhas.filter((l) => l.grupo === g);
	}

	const TOM = {
		ativo: { classe: 'bg-brand-green', texto: 'ativo' },
		parado: { classe: 'bg-brand-amber', texto: 'parado' },
		vazio: { classe: 'bg-grey-200', texto: 'sem uso' }
	} as const;
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Saúde do sistema</h1>
	<p class="text-sm text-grey">
		Quanto o sistema ocupa e onde a informação está entrando.
		{#if r}
			<span class="text-grey/80">
				· medido agora, {new Date(r.gerado_em).toLocaleString('pt-BR', {
					hour: '2-digit',
					minute: '2-digit'
				})}
			</span>
		{/if}
	</p>
</div>

{#if data.pendente}
	<Card>
		<p class="text-sm text-brand-brown">
			Rode a migration <code>0063_saude.sql</code> no Supabase para liberar este painel.
		</p>
	</Card>
{:else if r}
	<!-- Quatro números que respondem "está tudo bem?" -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<Card>
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Espaço usado</div>
			<div class="mt-1 text-3xl font-bold tabular-nums text-navy">{formatarBytes(r.dados_bytes)}</div>
			<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg">
				<div
					class="h-full rounded-full bg-brand-green"
					style="width: {Math.max(1, Math.min(100, usoPct))}%"
				></div>
			</div>
			<div class="mt-1 text-xs text-grey">
				{usoPct < 1 ? 'menos de 1%' : `${usoPct.toFixed(0)}%`} de 500 MB
			</div>
		</Card>

		<Card>
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Registros</div>
			<div class="mt-1 text-3xl font-bold tabular-nums text-navy">{registros.toLocaleString('pt-BR')}</div>
			<div class="mt-1 text-xs text-grey">em {linhas.length} módulos</div>
		</Card>

		<Card>
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Arquivos</div>
			<div class="mt-1 text-3xl font-bold tabular-nums text-navy">{r.arquivos_qtd}</div>
			<div class="mt-1 text-xs text-grey">{formatarBytes(r.arquivos_bytes)} em logos e prints</div>
		</Card>

		<Card>
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Módulos ativos</div>
			<div class="mt-1 text-3xl font-bold tabular-nums text-navy">
				{ativos.length}<span class="text-lg font-semibold text-grey">/{linhas.length}</span>
			</div>
			<div class="mt-1 text-xs text-grey">
				{parados.length} parados · {vazios.length} sem uso
			</div>
		</Card>
	</div>

	<!-- Uma linha por módulo, agrupada por área. Ativos primeiro. -->
	<Card class="mt-4">
		<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
			<Icon name="chart" size={17} /> Onde a informação está entrando
		</h2>

		<div class="overflow-hidden rounded-[var(--radius)] border border-grey-200">
			<div
				class="hidden border-b border-grey-200 bg-bg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.6fr)_minmax(0,0.8fr)_auto]"
			>
				<span>Módulo</span>
				<span class="text-right">Registros</span>
				<span>Última entrada</span>
				<span class="sr-only">Situação</span>
			</div>

			{#each GRUPOS as g (g)}
				{@const doG = doGrupo(g)}
				{#if doG.length}
					<div
						class="border-b border-grey-200/70 bg-bg/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate"
					>
						{g}
					</div>
					<ul class="divide-y divide-grey-200/70">
						{#each doG as l (l.label)}
							<li
								class="grid items-center gap-x-3 gap-y-0.5 px-3 py-1.5 transition-colors hover:bg-bg/40 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.6fr)_minmax(0,0.8fr)_auto]"
							>
								<span class="truncate text-sm text-navy" title={l.label}>{l.label}</span>
								<span
									class="text-sm tabular-nums {l.linhas ? 'text-navy' : 'text-grey'} sm:text-right"
								>
									{l.linhas.toLocaleString('pt-BR')}
								</span>
								<span class="text-sm text-grey">{quandoFoi(l.dias)}</span>
								<span class="flex items-center gap-1.5 justify-self-start sm:justify-self-end">
									<span class="size-1.5 rounded-full {TOM[l.situacao].classe}"></span>
									<span class="text-xs text-grey">{TOM[l.situacao].texto}</span>
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			{/each}
		</div>

		<p class="mt-3 text-xs text-grey">
			<strong class="font-medium text-slate">Ativo</strong> = recebeu algo nos últimos 30 dias.
			Fora da lista, {tabelasDeApoio(r)} tabelas de apoio (permissões, configuração do funil) que
			não têm cadastro do dia a dia.
		</p>
	</Card>

	<!-- Backup: o painel é o lugar natural para saber se a cópia está em dia. -->
	<Card class="mt-4">
		<h2 class="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
			<Icon name="shield" size={17} /> Backup
		</h2>
		<p class="text-sm text-slate">
			Cópia automática dos dados e dos arquivos nos dias <strong class="text-navy">10 e 25</strong>,
			ao meio-dia, na pasta <code class="text-xs">backups/</code> do Google Drive. Guarda os últimos
			24 backups.
		</p>
		<p class="mt-1.5 text-xs text-grey">
			O resumo da última rodada fica em <code class="text-xs">backups/ultimo-backup.txt</code>. Como
			restaurar está em <code class="text-xs">docs/BACKUP.md</code>.
		</p>
	</Card>
{/if}
