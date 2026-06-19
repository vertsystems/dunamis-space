<script lang="ts">
	import { conteudoTipoLabel } from '$lib/conteudo';

	let { data, form } = $props();
	const a = $derived(data.aprovacao);
	const respondida = $derived(!!a.data_resposta || !!form?.done);
	const statusFinal = $derived(form?.status ?? a.status);
	let pedindoAlteracao = $state(false);

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
	}
</script>

<section class="min-vh-100 d-flex align-items-center justify-content-center p-3" style="background-color: var(--ds-light);">
	<div style="width:100%; max-width:540px;">
		<h1 class="h4 text-center mb-1">
			Dunamis<span style="color: var(--ds-red);">.</span>Space
		</h1>
		<p class="text-center text-muted">
			Aprovação de conteúdo{a.cliente_nome ? ` — ${a.cliente_nome}` : ''}
		</p>

		<div class="card card-body">
			{#if a.arte_url}
				<img src={a.arte_url} alt="Arte do conteúdo" style="width:100%; border-radius:8px; margin-bottom:1rem;" />
			{/if}
			<p class="mb-2">
				<span class="badge text-bg-light">{conteudoTipoLabel(a.tipo)}</span>
				{#if a.data_publicacao}<span class="ms-2 text-muted">📅 {fmt(a.data_publicacao)}</span>{/if}
			</p>
			{#if a.titulo}<h2 class="h5">{a.titulo}</h2>{/if}
			{#if a.legenda}<p style="white-space:pre-wrap;">{a.legenda}</p>{/if}
		</div>

		{#if respondida}
			{#if statusFinal === 'aprovado'}
				<div class="alert alert-success text-center">
					<strong>Conteúdo aprovado ✓</strong><br />Obrigado! A agência foi avisada.
				</div>
			{:else}
				<div class="alert alert-warning text-center">
					<strong>Alteração solicitada</strong><br />Seu comentário foi enviado para a agência.
				</div>
			{/if}
			{#if a.comentario_cliente}
				<div class="card card-body"><strong>Seu comentário:</strong><p class="mb-0">{a.comentario_cliente}</p></div>
			{/if}
		{:else}
			{#if form?.error}<div class="alert alert-danger">{form.error}</div>{/if}
			{#if !pedindoAlteracao}
				<div class="d-flex justify-content-center gap-2">
					<form method="POST" action="?/responder">
						<input type="hidden" name="status" value="aprovado" />
						<button class="btn btn-success btn-lg" type="submit">✓ Aprovar</button>
					</form>
					<button class="btn btn-warning btn-lg" onclick={() => (pedindoAlteracao = true)}>
						Pedir alteração
					</button>
				</div>
			{:else}
				<form method="POST" action="?/responder" class="card card-body">
					<input type="hidden" name="status" value="alteracao_solicitada" />
					<div class="mb-3">
						<label class="form-label" for="comentario">O que precisa mudar?</label>
						<textarea id="comentario" class="form-control" name="comentario" rows="4" required></textarea>
					</div>
					<div class="d-flex gap-2">
						<button class="btn btn-warning" type="submit">Enviar solicitação</button>
						<button class="btn btn-light" type="button" onclick={() => (pedindoAlteracao = false)}>Voltar</button>
					</div>
				</form>
			{/if}
		{/if}
	</div>
</section>
