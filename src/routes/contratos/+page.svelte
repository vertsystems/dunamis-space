<script lang="ts">
	import { goto } from '$app/navigation';
	import { CONTRATO_STATUS, contratoStatusStyle, contratoStatusLabel, formatBRL } from '$lib/contratos';

	let { data } = $props();
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="level mb-4">
	<div class="level-left">
		<form class="level-item" method="GET" style="gap:.5rem; display:flex;">
			<div class="control">
				<div class="select">
					<select name="status" bind:value={status}>
						<option value="">Todos os status</option>
						{#each CONTRATO_STATUS as s (s.value)}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="control"><button class="button" type="submit">Filtrar</button></div>
		</form>
	</div>
	<div class="level-right">
		<div class="buttons">
			<a class="button is-light" href="/contratos/planos">Gerenciar planos</a>
			<a class="button is-primary" href="/contratos/novo">+ Novo contrato</a>
		</div>
	</div>
</div>

{#if data.loadError}
	<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr>
				<th>Cliente</th>
				<th>Plano</th>
				<th class="has-text-right">Valor mensal</th>
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
					<td class="has-text-right">{formatBRL(c.valor_mensal)}</td>
					<td>{fmtData(c.data_inicio)} → {fmtData(c.data_fim)}</td>
					<td>{c.renovacao_automatica ? 'Automática' : 'Manual'}</td>
					<td>
						<span class="tag" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>
							{contratoStatusLabel(c.status)}
						</span>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="has-text-centered has-text-grey p-5">
						Nenhum contrato ainda. Cadastre os planos e crie o primeiro contrato.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
