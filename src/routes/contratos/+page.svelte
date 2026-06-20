<script lang="ts">
	import { goto } from '$app/navigation';
	import { CONTRATO_STATUS, contratoStatusStyle, contratoStatusLabel, formatBRL } from '$lib/contratos';

	let { data } = $props();
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<form class="d-flex gap-2" method="GET">
		<select class="form-select" style="max-width:190px" name="status" bind:value={status}>
			<option value="">Todos os status</option>
			{#each CONTRATO_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</select>
		<button class="btn btn-light" type="submit">Filtrar</button>
	</form>
	<div class="d-flex gap-2">
		<a class="btn btn-light" href="/contratos/planos">Gerenciar planos</a>
		<a class="btn btn-primary" href="/contratos/novo">+ Novo contrato</a>
	</div>
</div>

{#if data.loadError}
	<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr>
					<th>Cliente</th>
					<th>Plano</th>
					<th class="text-end">Valor mensal</th>
					<th>Vigência</th>
					<th>Renovação</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.contratos as c (c.id)}
					{@const st = contratoStatusStyle(c.status)}
					<tr style="cursor:pointer" onclick={() => goto(`/contratos/${c.id}`)}>
						<td><a href={`/contratos/${c.id}`}>{c.cliente?.nome ?? '—'}</a></td>
						<td>{c.plano?.nome ?? '—'}</td>
						<td class="text-end">{formatBRL(c.valor_mensal)}</td>
						<td>{fmtData(c.data_inicio)} → {fmtData(c.data_fim)}</td>
						<td>{c.renovacao_automatica ? 'Automática' : 'Manual'}</td>
						<td>
							<span class="badge" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>
								{contratoStatusLabel(c.status)}
							</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-center text-muted p-5">
							Nenhum contrato ainda. Cadastre os planos e crie o primeiro contrato.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
