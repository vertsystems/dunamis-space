<script lang="ts">
	import { page } from '$app/state';
	import {
		APROVACAO_STATUS,
		aprovacaoStatusStyle,
		aprovacaoStatusLabel,
		conteudoTipoLabel
	} from '$lib/conteudo';

	let { data } = $props();
	let status = $state(data.status);
	let copiadoId = $state<string | null>(null);

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}

	function linkDe(token: string) {
		return `${page.url.origin}/aprovar/${token}`;
	}

	async function copiar(token: string, id: string) {
		await navigator.clipboard.writeText(linkDe(token));
		copiadoId = id;
		setTimeout(() => (copiadoId = null), 2000);
	}
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<div class="d-flex align-items-center flex-wrap gap-2">
		<div class="btn-group">
			<a class="btn btn-outline-secondary" href="/conteudo">Lista</a>
			<a class="btn btn-outline-secondary" href="/conteudo/calendario">Calendário</a>
			<span class="btn btn-primary">Aprovações</span>
		</div>
		<form method="GET">
			<select class="form-select" style="max-width:220px" name="status" bind:value={status} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="pendente">Pendentes</option>
				<option value="todas">Todas</option>
				{#each APROVACAO_STATUS.filter((s) => s.value !== 'pendente') as s (s.value)}
					<option value={s.value}>{s.label}</option>
				{/each}
			</select>
			<noscript><button class="btn btn-light" type="submit">Filtrar</button></noscript>
		</form>
	</div>
	<a class="btn btn-primary" href="/conteudo/novo">+ Novo conteúdo</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr>
					<th>Conteúdo</th>
					<th>Cliente</th>
					<th>Tipo</th>
					<th>Status</th>
					<th>Enviado</th>
					<th>Resposta</th>
					<th>Link</th>
				</tr>
			</thead>
			<tbody>
				{#each data.aprovacoes as a (a.id)}
					{@const st = aprovacaoStatusStyle(a.status)}
					<tr>
						<td>
							{#if a.conteudo_id}
								<a href={`/conteudo/${a.conteudo_id}`}>{a.conteudo_titulo ?? '(sem título)'}</a>
							{:else}
								<span class="text-muted">(conteúdo removido)</span>
							{/if}
							{#if a.comentario_cliente}
								<p class="small text-muted mt-1 mb-0"><em>“{a.comentario_cliente}”</em></p>
							{/if}
						</td>
						<td>{a.cliente_nome ?? '—'}</td>
						<td>{a.conteudo_tipo ? conteudoTipoLabel(a.conteudo_tipo) : '—'}</td>
						<td><span class="badge" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>{aprovacaoStatusLabel(a.status)}</span></td>
						<td class="small">{fmt(a.data_envio)}</td>
						<td class="small">{fmt(a.data_resposta)}</td>
						<td>
							<button class="btn btn-sm btn-light" onclick={() => copiar(a.token_publico, a.id)}>
								{copiadoId === a.id ? 'Copiado!' : 'Copiar link'}
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="text-center text-muted p-5">
							{data.status === 'pendente'
								? 'Nenhuma aprovação pendente. 🎉'
								: 'Nenhuma aprovação para este filtro.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
