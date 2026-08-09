<script lang="ts">
	// Bloco de ponto do Meu Dia: a pessoa bate os quatro pontos do dia, vê o
	// andamento em tempo real e, quando erra ou esquece, pede correção ao gestor.
	//
	// O horário de uma batida é sempre o do servidor (a action carimba `now()`);
	// os campos de hora só existem no pedido de ajuste, que passa por aprovação.
	import { onMount } from 'svelte';
	import { Badge, Button, Card, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { chamarAction } from '$lib/acoesRemotas';
	import { formatDateBR } from '$lib/alertas';
	import { DIAS } from '$lib/rotina';
	import {
		BATIDAS,
		CAMPOS,
		batida,
		diaSemana,
		esperadoNoDia,
		formatMinutos,
		formatSaldo,
		horaSP,
		minutosAlmoco,
		minutosTrabalhados,
		proximaBatida,
		saldoDoDia,
		saldoTone,
		statusDe,
		STATUS_LABEL,
		STATUS_TONE,
		type Campo,
		type Jornada,
		type Registro
	} from '$lib/ponto';

	type Ajuste = {
		id: string;
		data: string;
		entrada: string | null;
		almoco_saida: string | null;
		almoco_volta: string | null;
		saida: string | null;
		motivo: string;
		status: string;
		resposta: string | null;
		created_at: string;
	};

	let {
		ponto,
		semColaborador = false
	}: {
		ponto: {
			hoje: Registro | null;
			dias: Registro[];
			ajustes: Ajuste[];
			jornada: Jornada;
			dataHoje: string;
			desde: string;
		};
		semColaborador?: boolean;
	} = $props();

	// Relógio: o card anda sozinho enquanto o expediente está aberto, então
	// "trabalhado hoje" não fica congelado no valor do último carregamento.
	let agora = $state(new Date());
	onMount(() => {
		const t = setInterval(() => (agora = new Date()), 1000);
		return () => clearInterval(t);
	});

	const hoje = $derived(ponto.hoje);
	const status = $derived(statusDe(hoje));
	const proxima = $derived(proximaBatida(hoje));
	const trabalhado = $derived(minutosTrabalhados(hoje, agora));
	const esperado = $derived(esperadoNoDia(ponto.dataHoje, ponto.jornada));
	const restante = $derived(Math.max(0, esperado - trabalhado));
	const progresso = $derived(esperado ? Math.min(100, Math.round((trabalhado / esperado) * 100)) : 0);
	const relogio = $derived(
		agora.toLocaleTimeString('pt-BR', {
			timeZone: 'America/Sao_Paulo',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
	);

	let batendo = $state(false);
	async function bater(campo: Campo) {
		batendo = true;
		await chamarAction(
			'?/baterPonto',
			{ campo },
			{ ok: `${batida(campo).label} registrada às ${horaSP(new Date().toISOString())}.`, erro: 'Não foi possível registrar.' }
		);
		batendo = false;
	}

	/* ---------------- Histórico e pedidos de ajuste ---------------- */

	let historicoAberto = $state(false);
	const porData = $derived(new Map(ponto.dias.map((r) => [r.data, r])));
	const ajustePendenteDe = $derived(
		new Map(ponto.ajustes.filter((a) => a.status === 'pendente').map((a) => [a.data, a]))
	);

	// Dias do histórico, do mais recente para trás (inclui os sem batida nenhuma,
	// que são justamente os que costumam precisar de ajuste).
	const historico = $derived.by(() => {
		const dias: { data: string; registro: Registro | null }[] = [];
		let d = ponto.dataHoje;
		while (d >= ponto.desde) {
			dias.push({ data: d, registro: porData.get(d) ?? null });
			const anterior = new Date(`${d}T12:00:00Z`);
			anterior.setUTCDate(anterior.getUTCDate() - 1);
			d = anterior.toISOString().slice(0, 10);
		}
		return dias;
	});

	// Formulário de ajuste — um dia por vez, aberto dentro do modal do histórico.
	let ajusteData = $state<string | null>(null);
	let ajusteHoras = $state<Record<Campo, string>>({
		entrada: '',
		almoco_saida: '',
		almoco_volta: '',
		saida: ''
	});
	let ajusteMotivo = $state('');
	let salvandoAjuste = $state(false);

	function abrirAjuste(data: string) {
		const pendente = ajustePendenteDe.get(data);
		const base = pendente ?? porData.get(data) ?? null;
		ajusteData = data;
		ajusteHoras = {
			entrada: horaSP(base?.entrada),
			almoco_saida: horaSP(base?.almoco_saida),
			almoco_volta: horaSP(base?.almoco_volta),
			saida: horaSP(base?.saida)
		};
		ajusteMotivo = pendente?.motivo ?? '';
	}

	async function enviarAjuste() {
		if (!ajusteData) return;
		salvandoAjuste = true;
		const ok = await chamarAction(
			'?/pedirAjuste',
			{ data: ajusteData, ...ajusteHoras, motivo: ajusteMotivo },
			{ ok: 'Pedido enviado para aprovação.', erro: 'Não foi possível enviar o pedido.' }
		);
		salvandoAjuste = false;
		if (ok) ajusteData = null;
	}

	async function cancelarAjuste(id: string) {
		await chamarAction(
			'?/cancelarAjuste',
			{ id },
			{ ok: 'Pedido cancelado.', erro: 'Não foi possível cancelar.' }
		);
	}

	const AJUSTE_TONE: Record<string, 'warning' | 'success' | 'danger'> = {
		pendente: 'warning',
		aprovado: 'success',
		recusado: 'danger'
	};
	const AJUSTE_LABEL: Record<string, string> = {
		pendente: 'Aguardando aprovação',
		aprovado: 'Aprovado',
		recusado: 'Recusado'
	};

	const decididos = $derived(ponto.ajustes.filter((a) => a.status !== 'pendente').slice(0, 5));
	const pendentes = $derived(ponto.ajustes.filter((a) => a.status === 'pendente'));
</script>

<section class="mb-5">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 font-semibold text-navy">
			<Icon name="clock" size={16} /> Meu Ponto
			<span class="text-sm font-normal text-grey">· {formatDateBR(ponto.dataHoje)}</span>
		</h2>
		<button
			type="button"
			onclick={() => (historicoAberto = true)}
			class="text-xs text-brand hover:underline"
		>
			Ver histórico e pedir ajuste
			{#if pendentes.length}<span class="ml-1 rounded-full bg-brand-amber/20 px-1.5 py-px text-[0.65rem] font-semibold text-[#7a5310]">{pendentes.length}</span>{/if}
		</button>
	</div>

	<Card padding="none" class="overflow-hidden">
		<div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
			<!-- Linha do tempo das quatro batidas -->
			<div>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					<Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
					<span class="font-mono text-sm tabular-nums text-slate">{relogio}</span>
				</div>

				<ol class="grid gap-2 sm:grid-cols-4">
					{#each BATIDAS as b (b.campo)}
						{@const valor = hoje?.[b.campo] ?? null}
						{@const ehProxima = proxima === b.campo}
						<li
							class="rounded-[var(--radius)] border px-3 py-2 transition-colors {valor
								? 'border-brand-green/40 bg-brand-green/8'
								: ehProxima
									? 'border-brand/40 bg-brand/5'
									: 'border-grey-200 bg-bg'}"
						>
							<div class="flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-wide uppercase {valor ? 'text-[#067647]' : ehProxima ? 'text-brand' : 'text-grey'}">
								<Icon name={b.icon} size={12} />
								{b.label}
							</div>
							<div class="mt-0.5 text-lg font-semibold tabular-nums {valor ? 'text-navy' : 'text-grey/60'}">
								{valor ? horaSP(valor) : '--:--'}
							</div>
						</li>
					{/each}
				</ol>

				<!-- Andamento do dia -->
				<div class="mt-3">
					<div class="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
						<span class="text-slate">
							Trabalhado hoje <strong class="text-navy tabular-nums">{formatMinutos(trabalhado)}</strong>
							{#if minutosAlmoco(hoje)}
								<span class="text-grey">· almoço {formatMinutos(minutosAlmoco(hoje))}</span>
							{/if}
						</span>
						<span class="text-xs text-grey">
							{#if !esperado}
								Hoje não é dia de jornada
							{:else if status === 'encerrado'}
								Jornada {formatMinutos(esperado)} · saldo
								<strong class={saldoTone(trabalhado - esperado) === 'danger' ? 'text-brand-danger' : 'text-[#067647]'}>
									{formatSaldo(trabalhado - esperado)}
								</strong>
							{:else}
								Faltam {formatMinutos(restante)} para {formatMinutos(esperado)}
							{/if}
						</span>
					</div>
					<div class="h-1.5 overflow-hidden rounded-full bg-grey-200/70">
						<div
							class="h-full rounded-full bg-brand transition-[width] duration-700"
							style={`width:${progresso}%`}
						></div>
					</div>
				</div>
			</div>

			<!-- Ação: a próxima batida da sequência -->
			<div class="lg:w-56">
				{#if semColaborador}
					<p class="rounded-[var(--radius)] bg-brand-amber/15 px-3 py-2 text-xs text-brand-brown">
						Vincule seu login a um colaborador em <a class="underline" href="/equipe">Equipe</a> para bater ponto.
					</p>
				{:else if proxima}
					{@const b = batida(proxima)}
					<Button block size="lg" loading={batendo} disabled={batendo} onclick={() => bater(proxima)}>
						<Icon name={b.icon} size={18} />
						{b.acao}
					</Button>
					<p class="mt-1.5 text-center text-xs text-grey">Registra o horário de agora</p>
				{:else}
					<div class="rounded-[var(--radius)] bg-brand-green/10 px-3 py-3 text-center">
						<p class="text-sm font-semibold text-[#067647]">Expediente encerrado 🎉</p>
						<p class="mt-0.5 text-xs text-grey">
							{formatMinutos(trabalhado)} registradas hoje
						</p>
					</div>
				{/if}
			</div>
		</div>
	</Card>
</section>

<!-- ===================== Histórico / pedidos de ajuste ===================== -->
<Modal
	open={historicoAberto}
	title="Meu ponto — últimos 30 dias"
	subtitle="Errou ou esqueceu de bater? Peça o ajuste que a gestão aprova."
	size="lg"
	onClose={() => {
		historicoAberto = false;
		ajusteData = null;
	}}
>
	{#if pendentes.length}
		<div class="mb-4 space-y-2">
			{#each pendentes as a (a.id)}
				<div class="flex items-start justify-between gap-3 rounded-[var(--radius)] bg-brand-amber/10 px-3 py-2">
					<div class="min-w-0 text-sm">
						<div class="font-medium text-navy">{formatDateBR(a.data)} · aguardando aprovação</div>
						<div class="truncate text-xs text-grey">{a.motivo}</div>
					</div>
					<button
						type="button"
						onclick={() => cancelarAjuste(a.id)}
						class="shrink-0 text-xs text-grey hover:text-brand-danger hover:underline"
					>
						Cancelar
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<ul class="divide-y divide-grey-200/60">
		{#each historico as { data, registro } (data)}
			{@const esperadoDia = esperadoNoDia(data, ponto.jornada)}
			{@const trab = minutosTrabalhados(registro, agora)}
			{@const saldo = saldoDoDia(registro, data, ponto.jornada, ponto.dataHoje)}
			{@const pendente = ajustePendenteDe.get(data)}
			<li class="py-2">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<div class="w-32 shrink-0 text-sm">
						<span class="text-navy">{formatDateBR(data)}</span>
						<span class="ml-1 text-xs text-grey">{DIAS[diaSemana(data)].curto}</span>
					</div>

					<div class="flex-1 font-mono text-xs tabular-nums text-slate">
						{#if registro?.entrada}
							{horaSP(registro.entrada) || '--:--'} · {horaSP(registro.almoco_saida) || '--:--'} · {horaSP(registro.almoco_volta) || '--:--'} · {horaSP(registro.saida) || '--:--'}
						{:else if esperadoDia}
							<span class="font-sans text-brand-danger">Sem registro</span>
						{:else}
							<span class="font-sans text-grey/70">Folga</span>
						{/if}
					</div>

					<div class="w-16 shrink-0 text-right text-sm tabular-nums text-navy">
						{trab ? formatMinutos(trab) : '—'}
					</div>
					<div class="w-16 shrink-0 text-right text-sm tabular-nums {saldoTone(saldo) === 'danger' ? 'text-brand-danger' : saldoTone(saldo) === 'success' ? 'text-[#067647]' : 'text-grey'}">
						{saldo ? formatSaldo(saldo) : '—'}
					</div>

					<button
						type="button"
						onclick={() => (ajusteData === data ? (ajusteData = null) : abrirAjuste(data))}
						class="shrink-0 text-xs {pendente ? 'text-[#7a5310]' : 'text-brand'} hover:underline"
					>
						{pendente ? 'Editar pedido' : 'Pedir ajuste'}
					</button>
				</div>

				{#if ajusteData === data}
					<form
						class="mt-2 rounded-[var(--radius)] bg-bg p-3"
						onsubmit={(e) => {
							e.preventDefault();
							enviarAjuste();
						}}
					>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each CAMPOS as campo (campo)}
								<label class="block">
									<span class="mb-1 block text-[0.68rem] font-medium text-grey uppercase">{batida(campo).label}</span>
									<input
										type="time"
										bind:value={ajusteHoras[campo]}
										class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy focus:border-brand focus:outline-none"
									/>
								</label>
							{/each}
						</div>
						<textarea
							bind:value={ajusteMotivo}
							rows="2"
							placeholder="Motivo do ajuste (ex.: esqueci de bater a saída)"
							class="mt-2 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 text-sm text-navy focus:border-brand focus:outline-none"
						></textarea>
						<div class="mt-2 flex items-center justify-end gap-2">
							<Button variant="ghost" size="sm" onclick={() => (ajusteData = null)}>Cancelar</Button>
							<Button
								type="submit"
								size="sm"
								loading={salvandoAjuste}
								disabled={salvandoAjuste || ajusteMotivo.trim().length < 5}
							>
								Enviar para aprovação
							</Button>
						</div>
					</form>
				{/if}
			</li>
		{/each}
	</ul>

	{#if decididos.length}
		<div class="mt-4 border-t border-grey-200 pt-3">
			<h3 class="mb-2 text-xs font-semibold tracking-wide text-grey uppercase">Pedidos decididos</h3>
			<ul class="space-y-1.5">
				{#each decididos as a (a.id)}
					<li class="flex items-start justify-between gap-3 text-sm">
						<div class="min-w-0">
							<span class="text-navy">{formatDateBR(a.data)}</span>
							<span class="ml-1 text-xs text-grey">{a.motivo}</span>
							{#if a.resposta}<span class="block text-xs text-grey">Resposta: {a.resposta}</span>{/if}
						</div>
						<Badge tone={AJUSTE_TONE[a.status] ?? 'neutral'}>{AJUSTE_LABEL[a.status] ?? a.status}</Badge>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</Modal>
