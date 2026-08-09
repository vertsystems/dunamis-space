<script lang="ts">
	// Espelho do mês de uma pessoa: cada dia com suas quatro batidas, horas,
	// saldo e o que a gestão corrigiu. É aqui que se resolve divergência.
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Badge, Button, Card, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { chamarAction } from '$lib/acoesRemotas';
	import { formatDateBR } from '$lib/alertas';
	import { funcaoLabel } from '$lib/equipe';
	import { toast } from '$lib/toast.svelte';
	import { DIAS } from '$lib/rotina';
	import {
		CAMPOS,
		batida,
		deslocaMes,
		diaSemana,
		diasDoIntervalo,
		ehFalta,
		esperadoNoDia,
		formatMinutos,
		formatSaldo,
		horaSP,
		intervaloDoMes,
		labelMes,
		minutosTrabalhados,
		saldoDoDia,
		saldoTone,
		type Campo,
		type Registro
	} from '$lib/ponto';

	let { data } = $props();

	const cargo = $derived(() => {
		const f = data.colaborador.funcoes?.length ? data.colaborador.funcoes[0] : data.colaborador.funcao;
		return f ? funcaoLabel(f) : '';
	});

	const porData = $derived(new Map((data.registros as Registro[]).map((r) => [r.data, r])));
	const ajustePorData = $derived(new Map(data.ajustes.map((a) => [a.data, a])));

	const dias = $derived.by(() => {
		const { inicio, fim } = intervaloDoMes(data.mes);
		return diasDoIntervalo(inicio, fim).filter((d) => d <= data.hoje);
	});

	const q = (mes: string) => `?mes=${mes}`;

	/* ---------------- Edição de um dia ---------------- */
	let diaEdicao = $state<string | null>(null);
	let horas = $state<Record<Campo, string>>({
		entrada: '',
		almoco_saida: '',
		almoco_volta: '',
		saida: ''
	});
	let observacao = $state('');
	let salvando = $state(false);

	function editar(dia: string) {
		const r = porData.get(dia) ?? null;
		diaEdicao = dia;
		horas = {
			entrada: horaSP(r?.entrada),
			almoco_saida: horaSP(r?.almoco_saida),
			almoco_volta: horaSP(r?.almoco_volta),
			saida: horaSP(r?.saida)
		};
		observacao = r?.observacao ?? '';
	}

	async function salvarDia() {
		if (!diaEdicao) return;
		salvando = true;
		const ok = await chamarAction(
			'?/salvarDia',
			{ data: diaEdicao, ...horas, observacao },
			{ ok: 'Dia atualizado.', erro: 'Não foi possível salvar o dia.' }
		);
		salvando = false;
		if (ok) diaEdicao = null;
	}

	/* ---------------- Jornada ---------------- */
	let jornadaAberta = $state(false);
	// Só ao abrir o modal: assim trocar de mês (que recarrega `data`) não
	// sobrescreve o que a pessoa está digitando.
	let horasJornada = $state('8');
	function abrirJornada() {
		horasJornada = String(Math.round((data.jornada.minutos / 60) * 100) / 100);
		jornadaAberta = true;
	}
	const minutosJornada = $derived(Math.round(Number(horasJornada.replace(',', '.')) * 60) || 0);
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<a href="/administrativo/ponto" class="text-xs text-brand hover:underline">‹ Ponto da equipe</a>
		<h1 class="mt-0.5 text-base font-semibold text-navy">{data.colaborador.nome}</h1>
		<p class="text-sm text-grey">
			{cargo()} · jornada {formatMinutos(data.jornada.minutos)}/dia em
			{data.jornada.dias.map((d) => DIAS[d].curto).join(', ')}
			{#if data.podeEditar}
				<button type="button" class="ml-1 text-brand hover:underline" onclick={abrirJornada}>
					alterar
				</button>
			{/if}
		</p>
	</div>

	<div class="flex items-center gap-1">
		<a
			href={q(deslocaMes(data.mes, -1))}
			class="grid size-8 place-items-center rounded-[var(--radius)] text-slate transition-colors hover:bg-bg"
			aria-label="Mês anterior"
		>
			<span class="rotate-180"><Icon name="chevron" size={16} /></span>
		</a>
		<span class="min-w-40 text-center font-semibold text-navy">{labelMes(data.mes)}</span>
		<a
			href={q(deslocaMes(data.mes, 1))}
			class="grid size-8 place-items-center rounded-[var(--radius)] text-slate transition-colors hover:bg-bg"
			aria-label="Próximo mês"
		>
			<Icon name="chevron" size={16} />
		</a>
	</div>
</div>

<!-- Resumo do mês -->
<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
	{#each [{ label: 'Dias trabalhados', valor: String(data.resumo.diasTrabalhados), tom: 'text-navy' }, { label: 'Faltas', valor: String(data.resumo.faltas), tom: data.resumo.faltas ? 'text-brand-danger' : 'text-navy' }, { label: 'Horas no mês', valor: formatMinutos(data.resumo.minutosTrabalhados), tom: 'text-navy' }, { label: 'Saldo', valor: formatSaldo(data.resumo.saldo), tom: saldoTone(data.resumo.saldo) === 'danger' ? 'text-brand-danger' : 'text-[#067647]' }] as c (c.label)}
		<Card>
			<div class="text-xs font-semibold tracking-wide text-grey uppercase">{c.label}</div>
			<div class="mt-1 text-2xl font-bold tabular-nums {c.tom}">{c.valor}</div>
		</Card>
	{/each}
</div>

<Card padding="none" class="overflow-hidden">
	<div class="hidden grid-cols-[minmax(0,1.1fr)_repeat(4,minmax(0,0.7fr))_repeat(2,minmax(0,0.7fr))_auto] gap-2 border-b border-grey-200 px-5 py-2 text-[0.68rem] font-semibold tracking-wide text-grey uppercase lg:grid">
		<span>Dia</span>
		{#each CAMPOS as c (c)}<span class="text-center">{batida(c).label}</span>{/each}
		<span class="text-right">Horas</span>
		<span class="text-right">Saldo</span>
		<span></span>
	</div>

	<ul class="divide-y divide-grey-200/60">
		{#each dias as dia (dia)}
			{@const r = porData.get(dia) ?? null}
			{@const esperado = esperadoNoDia(dia, data.jornada)}
			{@const trab = minutosTrabalhados(r)}
			{@const saldo = saldoDoDia(r, dia, data.jornada, data.hoje)}
			{@const falta = ehFalta(r, dia, data.jornada, data.hoje)}
			{@const ajuste = ajustePorData.get(dia)}
			<li class="px-5 py-2 {esperado ? '' : 'bg-bg/50'}">
				<div class="grid grid-cols-2 items-center gap-2 lg:grid-cols-[minmax(0,1.1fr)_repeat(4,minmax(0,0.7fr))_repeat(2,minmax(0,0.7fr))_auto]">
					<div class="col-span-2 flex items-center gap-2 lg:col-span-1">
						<span class="text-sm text-navy tabular-nums">{formatDateBR(dia)}</span>
						<span class="text-xs text-grey">{DIAS[diaSemana(dia)].curto}</span>
						{#if falta}<Badge tone="danger">Falta</Badge>{/if}
						{#if ajuste?.status === 'pendente'}<Badge tone="warning">Ajuste pedido</Badge>{/if}
						{#if r?.observacao}
							<span class="text-grey" title={r.observacao}><Icon name="message" size={13} /></span>
						{/if}
					</div>

					{#each CAMPOS as campo (campo)}
						<div class="text-center text-sm tabular-nums {r?.[campo] ? 'text-navy' : 'text-grey/50'}">
							<span class="text-[0.65rem] text-grey lg:hidden">{batida(campo).label}: </span>
							{horaSP(r?.[campo]) || '--:--'}
						</div>
					{/each}

					<div class="text-right text-sm text-navy tabular-nums">{trab ? formatMinutos(trab) : '—'}</div>
					<div class="text-right text-sm tabular-nums {saldoTone(saldo) === 'danger' ? 'text-brand-danger' : saldoTone(saldo) === 'success' ? 'text-[#067647]' : 'text-grey'}">
						{saldo ? formatSaldo(saldo) : '—'}
					</div>

					{#if data.podeEditar}
						<button
							type="button"
							onclick={() => (diaEdicao === dia ? (diaEdicao = null) : editar(dia))}
							class="justify-self-end text-xs text-brand hover:underline"
						>
							{diaEdicao === dia ? 'Fechar' : 'Editar'}
						</button>
					{:else}
						<span></span>
					{/if}
				</div>

				{#if diaEdicao === dia}
					<form
						class="mt-2 rounded-[var(--radius)] bg-bg p-3"
						onsubmit={(e) => {
							e.preventDefault();
							salvarDia();
						}}
					>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each CAMPOS as campo (campo)}
								<label class="block">
									<span class="mb-1 block text-[0.68rem] font-medium text-grey uppercase">{batida(campo).label}</span>
									<input
										type="time"
										bind:value={horas[campo]}
										class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy focus:border-brand focus:outline-none"
									/>
								</label>
							{/each}
						</div>
						<input
							bind:value={observacao}
							placeholder="Observação (fica registrada no dia)"
							class="mt-2 h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy focus:border-brand focus:outline-none"
						/>
						<div class="mt-2 flex items-center justify-between gap-2">
							<span class="text-xs text-grey">Hora vazia apaga a batida.</span>
							<div class="flex gap-2">
								<Button variant="ghost" size="sm" onclick={() => (diaEdicao = null)}>Cancelar</Button>
								<Button type="submit" size="sm" loading={salvando} disabled={salvando}>Salvar dia</Button>
							</div>
						</div>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
</Card>

<!-- Jornada esperada -->
<Modal
	open={jornadaAberta}
	title="Jornada de {data.colaborador.nome}"
	subtitle="Base do cálculo de saldo e de faltas."
	onClose={() => (jornadaAberta = false)}
>
	<form
		method="POST"
		action="?/salvarJornada"
		use:enhance={() => async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Jornada atualizada.');
				jornadaAberta = false;
				await invalidateAll();
			} else {
				toast.error('Não foi possível salvar a jornada.');
				await update({ reset: false });
			}
		}}
	>
		<label class="block">
			<span class="mb-1.5 block text-sm font-medium text-navy">Horas por dia</span>
			<input
				type="number"
				step="0.5"
				min="0"
				max="24"
				bind:value={horasJornada}
				class="h-10 w-32 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy focus:border-brand focus:outline-none"
			/>
			<input type="hidden" name="jornada_minutos" value={minutosJornada} />
		</label>

		<div class="mt-4">
			<span class="mb-1.5 block text-sm font-medium text-navy">Dias de trabalho</span>
			<div class="flex flex-wrap gap-1.5">
				{#each DIAS as d (d.idx)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="jornada_dias"
							value={d.idx}
							checked={data.jornada.dias.includes(d.idx)}
							class="peer sr-only"
						/>
						<span
							class="inline-flex rounded-full bg-bg px-3.5 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-grey-200/70 peer-checked:bg-brand peer-checked:text-white"
							>{d.curto}</span
						>
					</label>
				{/each}
			</div>
		</div>

		<div class="mt-5 flex justify-end gap-2">
			<Button variant="ghost" onclick={() => (jornadaAberta = false)}>Cancelar</Button>
			<Button type="submit">Salvar jornada</Button>
		</div>
	</form>
</Modal>
