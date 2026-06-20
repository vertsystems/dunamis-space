<script lang="ts">
	import { conteudoTipoLabel } from '$lib/conteudo';
	import { Card, Badge, Button, Textarea } from '$lib/components/ui';

	let { data, form } = $props();
	const a = $derived(data.aprovacao);
	const respondida = $derived(!!a.data_resposta || !!form?.done);
	const statusFinal = $derived(form?.status ?? a.status);
	let pedindoAlteracao = $state(false);

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
	}
</script>

<section class="min-h-screen flex items-center justify-center p-3 bg-bg">
	<div class="w-full max-w-135">
		<h1 class="text-2xl font-bold text-center text-navy mb-1">
			Dunamis<span class="text-brand">.</span>Space
		</h1>
		<p class="text-center text-grey mb-4">
			Aprovação de conteúdo{a.cliente_nome ? ` — ${a.cliente_nome}` : ''}
		</p>

		<Card>
			{#if a.arte_url}
				<img src={a.arte_url} alt="Arte do conteúdo" loading="lazy" decoding="async" class="w-full rounded-[var(--radius)] mb-4" />
			{/if}
			<p class="flex items-center gap-2 mb-2">
				<Badge tone="neutral">{conteudoTipoLabel(a.tipo)}</Badge>
				{#if a.data_publicacao}<span class="text-grey text-sm">📅 {fmt(a.data_publicacao)}</span>{/if}
			</p>
			{#if a.titulo}<h2 class="text-lg font-semibold text-navy">{a.titulo}</h2>{/if}
			{#if a.legenda}<p class="whitespace-pre-wrap text-slate">{a.legenda}</p>{/if}
		</Card>

		{#if respondida}
			{#if statusFinal === 'aprovado'}
				<div class="mt-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-center text-brand-green">
					<strong>Conteúdo aprovado ✓</strong><br />Obrigado! A agência foi avisada.
				</div>
			{:else}
				<div class="mt-4 rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-center text-brand-brown">
					<strong>Alteração solicitada</strong><br />Seu comentário foi enviado para a agência.
				</div>
			{/if}
			{#if a.comentario_cliente}
				<Card class="mt-4"><strong>Seu comentário:</strong><p class="mb-0 text-slate">{a.comentario_cliente}</p></Card>
			{/if}
		{:else}
			{#if form?.error}<div class="mt-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{form.error}</div>{/if}
			{#if !pedindoAlteracao}
				<div class="mt-4 flex justify-center gap-2">
					<form method="POST" action="?/responder">
						<input type="hidden" name="status" value="aprovado" />
						<Button variant="success" size="lg" type="submit">✓ Aprovar</Button>
					</form>
					<Button variant="secondary" size="lg" onclick={() => (pedindoAlteracao = true)}>Pedir alteração</Button>
				</div>
			{:else}
				<form method="POST" action="?/responder">
					<Card class="mt-4">
						<input type="hidden" name="status" value="alteracao_solicitada" />
						<Textarea label="O que precisa mudar?" name="comentario" rows={4} required wrapperClass="mb-3" />
						<div class="flex gap-2">
							<Button type="submit">Enviar solicitação</Button>
							<Button variant="secondary" onclick={() => (pedindoAlteracao = false)}>Voltar</Button>
						</div>
					</Card>
				</form>
			{/if}
		{/if}
	</div>
</section>
