<script lang="ts">
	// A caixinha do gráfico "Visitas por dia": escolhe um mês, um ano inteiro ou
	// os dias no calendário (clica no primeiro e no último; até 1 ano). Devolve o
	// que vai na URL (?grafico=), no formato de lerGrafico.
	import {
		MAX_DIAS_GRAFICO,
		dataBr,
		diasDoMes,
		diasEntre,
		rotuloDias,
		rotuloMes,
		somarDias,
		type EscolhaGrafico
	} from '$lib/dmetric/painel';
	import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from '@lucide/svelte';

	let {
		escolha,
		meses,
		anos,
		hoje,
		primeiroDia,
		onescolher
	}: {
		escolha: EscolhaGrafico;
		meses: { id: string; rotulo: string }[];
		anos: string[];
		hoje: string;
		primeiroDia: string | null;
		onescolher: (id: string) => void;
	} = $props();

	const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

	let caixa = $state<HTMLDivElement>();
	let aberto = $state(false);
	let aba = $state<'mes' | 'dias'>('mes');
	// Calendário: o mês que está à vista e a seleção em andamento.
	let visto = $state('');
	let ini = $state<string | null>(null);
	let fim = $state<string | null>(null);
	let passando = $state<string | null>(null);
	let aviso = $state('');

	function abrir() {
		aba = escolha.tipo === 'dias' ? 'dias' : 'mes';
		ini = escolha.tipo === 'dias' ? escolha.de : null;
		fim = escolha.tipo === 'dias' ? escolha.ate : null;
		visto = (escolha.tipo === 'dias' ? escolha.ate : escolha.de > hoje ? hoje : escolha.de).slice(0, 7);
		aviso = '';
		aberto = true;
	}
	function escolher(id: string) {
		aberto = false;
		if (id !== escolha.id) onescolher(id);
	}

	function andar(n: number) {
		let [a, m] = visto.split('-').map(Number);
		m += n;
		if (m < 1) [a, m] = [a - 1, 12];
		if (m > 12) [a, m] = [a + 1, 1];
		visto = `${a}-${String(m).padStart(2, '0')}`;
	}
	// Não passa de dezembro do ano que vem nem volta antes de 2000.
	const podeVoltar = $derived(visto > '2000-01');
	const podeAvancar = $derived(visto < `${Number(hoje.slice(0, 4)) + 1}-12`);

	const grade = $derived.by(() => {
		if (!visto) return [];
		const { de, ate } = diasDoMes(visto);
		const vazios = new Date(`${de}T12:00:00Z`).getUTCDay();
		return [...Array<string | null>(vazios).fill(null), ...diasEntre(de, ate)];
	});

	function clicar(dia: string) {
		aviso = '';
		if (!ini || fim) {
			ini = dia;
			fim = null;
			return;
		}
		let [de, ate] = [ini, dia].sort();
		const limite = somarDias(de, MAX_DIAS_GRAFICO - 1);
		if (ate > limite) {
			ate = limite;
			aviso = `No máximo 1 ano: o fim ficou em ${dataBr(ate)}.`;
		}
		ini = de;
		fim = ate;
	}
	// Enquanto escolhe o fim, o trecho acompanha o mouse.
	const trecho = $derived.by(() => {
		if (!ini) return null;
		const outro = fim ?? passando ?? ini;
		return [ini, outro].sort() as [string, string];
	});
	const noTrecho = (d: string) => !!trecho && d >= trecho[0] && d <= trecho[1];
	const ponta = (d: string) => d === ini || d === fim;
</script>

<svelte:window
	onpointerdown={(e) => aberto && caixa && !caixa.contains(e.target as Node) && (aberto = false)}
	onkeydown={(e) => aberto && e.key === 'Escape' && (aberto = false)}
/>

<div class="relative" bind:this={caixa}>
	<button
		type="button"
		onclick={() => (aberto ? (aberto = false) : abrir())}
		aria-expanded={aberto}
		aria-haspopup="dialog"
		class="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-2.5 text-xs font-semibold text-navy shadow-xs transition-colors hover:border-grey focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
	>
		<CalendarDays size={14} class="text-grey" />
		{maiuscula(escolha.rotulo)}
		<ChevronDown size={14} class="text-grey transition-transform {aberto ? 'rotate-180' : ''}" />
	</button>

	{#if aberto}
		<div
			role="dialog"
			aria-label="Período do gráfico"
			class="absolute left-0 top-full z-30 mt-2 w-[18.5rem] rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-3 shadow-lg sm:left-auto sm:right-0"
		>
			<div class="mb-3 grid grid-cols-2 gap-0.5 rounded-full bg-bg p-0.5 text-xs font-medium">
				{#each [{ id: 'mes', rotulo: 'Mês' }, { id: 'dias', rotulo: 'Dias' }] as const as t (t.id)}
					<button
						type="button"
						onclick={() => (aba = t.id)}
						aria-pressed={aba === t.id}
						class="rounded-full px-3 py-1.5 transition-colors {aba === t.id ? 'bg-surface text-navy shadow-sm' : 'text-grey hover:text-navy'}"
					>
						{t.rotulo}
					</button>
				{/each}
			</div>

			{#if aba === 'mes'}
				<p class="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-grey">Mês</p>
				<ul class="max-h-52 overflow-y-auto">
					{#each meses as m (m.id)}
						<li>
							<button
								type="button"
								onclick={() => escolher(m.id)}
								class="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-bg {escolha.id ===
								m.id
									? 'bg-brand/[0.08] font-semibold text-brand'
									: 'text-navy'}"
							>
								{maiuscula(m.rotulo)}
								{#if m.id === hoje.slice(0, 7)}<span class="text-[10px] font-medium text-grey">este mês</span>{/if}
							</button>
						</li>
					{/each}
				</ul>
				<p class="mb-1 mt-3 px-1 text-[10px] font-bold uppercase tracking-wider text-grey">Ano inteiro</p>
				<ul>
					{#each anos as a (a)}
						<li>
							<button
								type="button"
								onclick={() => escolher(a)}
								class="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-bg {escolha.id ===
								a
									? 'bg-brand/[0.08] font-semibold text-brand'
									: 'text-navy'}"
							>
								{a}
								<span class="text-[10px] font-medium text-grey">1º/jan a 31/dez</span>
							</button>
						</li>
					{/each}
				</ul>
				{#if primeiroDia}
					<p class="mt-3 px-1 text-[11px] text-grey">O DMetric conta desde {dataBr(primeiroDia)}.</p>
				{/if}
			{:else}
				<div class="mb-2 flex items-center justify-between">
					<button
						type="button"
						onclick={() => andar(-1)}
						disabled={!podeVoltar}
						aria-label="Mês anterior"
						class="grid size-7 place-items-center rounded-full text-navy transition-colors hover:bg-bg disabled:opacity-30"
					>
						<ChevronLeft size={16} />
					</button>
					<p class="text-sm font-semibold text-navy">{maiuscula(rotuloMes(visto))}</p>
					<button
						type="button"
						onclick={() => andar(1)}
						disabled={!podeAvancar}
						aria-label="Próximo mês"
						class="grid size-7 place-items-center rounded-full text-navy transition-colors hover:bg-bg disabled:opacity-30"
					>
						<ChevronRight size={16} />
					</button>
				</div>

				<div class="grid grid-cols-7 text-center text-[10px] font-semibold text-grey" aria-hidden="true">
					{#each ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as d, i (i)}<span class="py-1">{d}</span>{/each}
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="grid grid-cols-7 gap-y-0.5" onpointerleave={() => (passando = null)}>
					{#each grade as dia, i (dia ?? `vazio-${i}`)}
						{#if dia}
							<button
								type="button"
								onclick={() => clicar(dia)}
								onpointerenter={() => (passando = dia)}
								aria-label={dataBr(dia)}
								aria-pressed={ponta(dia)}
								class="h-8 text-xs tabular-nums transition-colors {ponta(dia)
									? 'rounded-full bg-brand font-bold text-white'
									: noTrecho(dia)
										? 'bg-brand/10 text-navy'
										: 'rounded-full text-navy hover:bg-bg'} {dia === hoje && !ponta(dia) ? 'font-bold underline underline-offset-2' : ''} {dia > hoje && !ponta(dia) && !noTrecho(dia)
									? 'text-grey/70'
									: ''}"
							>
								{Number(dia.slice(8))}
							</button>
						{:else}
							<span></span>
						{/if}
					{/each}
				</div>

				<p class="mt-2 min-h-8 px-1 text-[11px] leading-snug text-slate">
					{#if aviso}
						<span class="text-[#9a6b16]">{aviso}</span>
					{:else if ini && fim}
						{rotuloDias(ini, fim)} · {diasEntre(ini, fim).length} {diasEntre(ini, fim).length === 1 ? 'dia' : 'dias'}
					{:else if ini}
						Agora clique no último dia (até 1 ano).
					{:else}
						Clique no primeiro dia do período.
					{/if}
				</p>
				<div class="mt-1 flex items-center justify-between gap-2">
					<button
						type="button"
						onclick={() => {
							ini = null;
							fim = null;
							aviso = '';
						}}
						class="rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium text-grey transition-colors hover:text-navy"
					>
						Limpar
					</button>
					<button
						type="button"
						disabled={!ini || !fim}
						onclick={() => ini && fim && escolher(`${ini}_${fim}`)}
						class="rounded-[var(--radius)] bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-40"
					>
						Ver estes dias
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
