<script lang="ts">
	import { conteudoStatusStyle, conteudoStatusLabel, conteudoTipoLabel } from '$lib/conteudo';

	let { data } = $props();

	const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const MESES = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];

	function chave(d: Date) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const porDia = $derived.by(() => {
		const map = new Map<string, typeof data.conteudos>();
		for (const c of data.conteudos) {
			if (!c.data_publicacao) continue;
			const k = chave(new Date(c.data_publicacao));
			const arr = map.get(k) ?? [];
			arr.push(c);
			map.set(k, arr);
		}
		return map;
	});

	const celulas = $derived.by(() => {
		const primeiro = new Date(data.ano, data.mes, 1);
		const inicioSemana = primeiro.getDay();
		const diasNoMes = new Date(data.ano, data.mes + 1, 0).getDate();
		const total = Math.ceil((inicioSemana + diasNoMes) / 7) * 7;
		const inicio = new Date(data.ano, data.mes, 1 - inicioSemana);
		return Array.from({ length: total }, (_, i) => {
			const d = new Date(inicio);
			d.setDate(inicio.getDate() + i);
			return d;
		});
	});

	const hojeKey = chave(new Date());

	function horaCurta(iso: string | null) {
		return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
	}
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<div class="btn-group">
		<a class="btn btn-outline-secondary" href="/conteudo">Lista</a>
		<span class="btn btn-primary">Calendário</span>
		<a class="btn btn-outline-secondary" href="/conteudo/aprovacoes">Aprovações</a>
	</div>
	<a class="btn btn-primary" href="/conteudo/novo">+ Novo conteúdo</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card card-body">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h1 class="h5 mb-0">{MESES[data.mes]} {data.ano}</h1>
		<div class="btn-group">
			<a class="btn btn-sm btn-outline-secondary" href={`/conteudo/calendario?mes=${data.prev}`} aria-label="Mês anterior">‹</a>
			<a class="btn btn-sm btn-outline-secondary" href="/conteudo/calendario">Hoje</a>
			<a class="btn btn-sm btn-outline-secondary" href={`/conteudo/calendario?mes=${data.next}`} aria-label="Próximo mês">›</a>
		</div>
	</div>

	<div class="cal-grid cal-head">
		{#each SEMANA as dia (dia)}<div class="cal-weekday">{dia}</div>{/each}
	</div>
	<div class="cal-grid">
		{#each celulas as d (d.toISOString())}
			{@const k = chave(d)}
			{@const itens = porDia.get(k) ?? []}
			{@const foraDoMes = d.getMonth() !== data.mes}
			<div class="cal-cell" class:is-muted={foraDoMes} class:is-today={k === hojeKey}>
				<div class="cal-day">{d.getDate()}</div>
				{#each itens as c (c.id)}
					{@const st = conteudoStatusStyle(c.status)}
					<a
						class="cal-chip"
						href={`/conteudo/${c.id}`}
						style={`background:${st.bg};color:${st.fg};`}
						title={`${conteudoTipoLabel(c.tipo)} · ${conteudoStatusLabel(c.status)}${c.cliente_nome ? ' · ' + c.cliente_nome : ''}`}
					>
						<span class="cal-chip-time">{horaCurta(c.data_publicacao)}</span>
						{c.titulo ?? conteudoTipoLabel(c.tipo)}
					</a>
				{/each}
			</div>
		{/each}
	</div>
</div>

{#if data.semData.length}
	<div class="card card-body">
		<h2 class="h6">Sem data agendada ({data.semData.length})</h2>
		<div class="d-flex flex-wrap gap-1">
			{#each data.semData as c (c.id)}
				{@const st = conteudoStatusStyle(c.status)}
				<a class="badge text-decoration-none" href={`/conteudo/${c.id}`} style={`background:${st.bg};color:${st.fg};`}>
					{c.titulo ?? conteudoTipoLabel(c.tipo)}{c.cliente_nome ? ' · ' + c.cliente_nome : ''}
				</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
	}
	.cal-head {
		margin-bottom: 6px;
	}
	.cal-weekday {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.cal-cell {
		min-height: 92px;
		border: 1px solid #e6e6e6;
		border-radius: 6px;
		padding: 4px;
		background: #fff;
		display: flex;
		flex-direction: column;
		gap: 3px;
		overflow: hidden;
	}
	.cal-cell.is-muted {
		background: #fafafa;
	}
	.cal-cell.is-muted .cal-day {
		color: #c4c4c4;
	}
	.cal-cell.is-today {
		border-color: var(--ds-red, #de4908);
		box-shadow: inset 0 0 0 1px var(--ds-red, #de4908);
	}
	.cal-day {
		font-size: 0.8rem;
		font-weight: 600;
		color: #555;
		line-height: 1;
	}
	.cal-chip {
		display: block;
		font-size: 0.72rem;
		line-height: 1.2;
		padding: 2px 5px;
		border-radius: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 500;
		text-decoration: none;
	}
	.cal-chip-time {
		opacity: 0.7;
		margin-right: 3px;
		font-variant-numeric: tabular-nums;
	}
</style>
