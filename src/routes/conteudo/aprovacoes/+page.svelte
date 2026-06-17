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

<div class="level mb-4">
	<div class="level-left">
		<div class="buttons has-addons mr-4 mb-0">
			<a class="button" href="/conteudo">Lista</a>
			<a class="button" href="/conteudo/calendario">Calendário</a>
			<span class="button is-primary is-selected">Aprovações</span>
		</div>
		<form class="level-item" method="GET" style="gap:.5rem; display:flex;">
			<div class="control">
				<div class="select">
					<select name="status" bind:value={status} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
						<option value="pendente">Pendentes</option>
						<option value="todas">Todas</option>
						{#each APROVACAO_STATUS.filter((s) => s.value !== 'pendente') as s (s.value)}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<noscript><div class="control"><button class="button" type="submit">Filtrar</button></div></noscript>
		</form>
	</div>
	<div class="level-right">
		<a class="button is-primary" href="/conteudo/novo">+ Novo conteúdo</a>
	</div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
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
							<span class="has-text-grey">(conteúdo removido)</span>
						{/if}
						{#if a.comentario_cliente}
							<p class="is-size-7 has-text-grey mt-1"><em>“{a.comentario_cliente}”</em></p>
						{/if}
					</td>
					<td>{a.cliente_nome ?? '—'}</td>
					<td>{a.conteudo_tipo ? conteudoTipoLabel(a.conteudo_tipo) : '—'}</td>
					<td><span class="tag" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>{aprovacaoStatusLabel(a.status)}</span></td>
					<td class="is-size-7">{fmt(a.data_envio)}</td>
					<td class="is-size-7">{fmt(a.data_resposta)}</td>
					<td>
						<button class="button is-small is-light" onclick={() => copiar(a.token_publico, a.id)}>
							{copiadoId === a.id ? 'Copiado!' : 'Copiar link'}
						</button>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="7" class="has-text-centered has-text-grey p-5">
						{data.status === 'pendente'
							? 'Nenhuma aprovação pendente. 🎉'
							: 'Nenhuma aprovação para este filtro.'}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
