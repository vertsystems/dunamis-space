<script lang="ts">
	import { conteudoTipoLabel } from '$lib/conteudo';

	let { data, form } = $props();
	const a = $derived(data.aprovacao);
	// Já respondida no banco, ou acabou de responder agora.
	const respondida = $derived(!!a.data_resposta || !!form?.done);
	const statusFinal = $derived(form?.status ?? a.status);
	let pedindoAlteracao = $state(false);

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
	}
</script>

<section class="hero is-fullheight" style="background-color: var(--ds-light);">
	<div class="hero-body is-justify-content-center">
		<div style="width:100%; max-width:540px;">
			<h1 class="title is-4 has-text-centered">
				Dunamis<span style="color: var(--ds-red);">.</span>Space
			</h1>
			<p class="subtitle is-6 has-text-centered has-text-grey">
				Aprovação de conteúdo{a.cliente_nome ? ` — ${a.cliente_nome}` : ''}
			</p>

			<div class="box">
				{#if a.arte_url}
					<img src={a.arte_url} alt="Arte do conteúdo" style="width:100%; border-radius:8px; margin-bottom:1rem;" />
				{/if}
				<p class="mb-2">
					<span class="tag is-light">{conteudoTipoLabel(a.tipo)}</span>
					{#if a.data_publicacao}<span class="ml-2 has-text-grey">📅 {fmt(a.data_publicacao)}</span>{/if}
				</p>
				{#if a.titulo}<h2 class="title is-5">{a.titulo}</h2>{/if}
				{#if a.legenda}<p style="white-space:pre-wrap;">{a.legenda}</p>{/if}
			</div>

			{#if respondida}
				{#if statusFinal === 'aprovado'}
					<div class="notification is-success has-text-centered">
						<strong>Conteúdo aprovado ✓</strong><br />Obrigado! A agência foi avisada.
					</div>
				{:else}
					<div class="notification is-warning has-text-centered">
						<strong>Alteração solicitada</strong><br />Seu comentário foi enviado para a agência.
					</div>
				{/if}
				{#if a.comentario_cliente}
					<div class="box"><strong>Seu comentário:</strong><p>{a.comentario_cliente}</p></div>
				{/if}
			{:else}
				{#if form?.error}<div class="notification is-danger is-light">{form.error}</div>{/if}
				{#if !pedindoAlteracao}
					<div class="buttons is-centered">
						<form method="POST" action="?/responder">
							<input type="hidden" name="status" value="aprovado" />
							<button class="button is-success is-medium" type="submit">✓ Aprovar</button>
						</form>
						<button class="button is-warning is-medium" onclick={() => (pedindoAlteracao = true)}>
							Pedir alteração
						</button>
					</div>
				{:else}
					<form method="POST" action="?/responder" class="box">
						<input type="hidden" name="status" value="alteracao_solicitada" />
						<div class="field">
							<label class="label" for="comentario">O que precisa mudar?</label>
							<div class="control">
								<textarea id="comentario" class="textarea" name="comentario" rows="4" required></textarea>
							</div>
						</div>
						<div class="buttons">
							<button class="button is-warning" type="submit">Enviar solicitação</button>
							<button class="button is-light" type="button" onclick={() => (pedindoAlteracao = false)}>Voltar</button>
						</div>
					</form>
				{/if}
			{/if}
		</div>
	</div>
</section>
