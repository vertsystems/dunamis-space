<script lang="ts">
	import { page } from '$app/state';
	import { VALOR_MASCARA } from '$lib/valores';
	import { Input, Textarea, Checkbox, FormShell } from '$lib/components/ui';

	let {
		plano = null,
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		plano?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	const v = (k: string) => plano?.[k] ?? '';
	// Vem do +layout.server.ts (módulo de permissão 'valores').
	const podeValores = $derived(page.data.podeValores !== false);
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} cancelHref="/contratos/planos">
	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Input label="Nome do plano *" name="nome" required value={v('nome')} placeholder="Starter, Gold, Premium…" wrapperClass="md:col-span-8" />
		{#if podeValores}
			<Input label="Valor mensal (R$)" type="number" step="0.01" name="valor_mensal" value={v('valor_mensal')} wrapperClass="md:col-span-4" />
		{:else}
			<!-- Sem `name`: não entra no FormData; a action também ignora o campo. -->
			<Input
				label="Valor mensal (R$)"
				value={VALOR_MASCARA}
				disabled
				readonly
				title="Só CEO e Administrador veem os valores"
				wrapperClass="md:col-span-4"
			/>
		{/if}

		<Input label="Limite de posts" type="number" name="limite_posts" value={v('limite_posts')} wrapperClass="md:col-span-4" />
		<Input label="Limite de stories" type="number" name="limite_stories" value={v('limite_stories')} wrapperClass="md:col-span-4" />
		<Input label="Limite de reels" type="number" name="limite_reels" value={v('limite_reels')} wrapperClass="md:col-span-4" />

		<Textarea label="Descrição" name="descricao" rows={2} value={v('descricao')} wrapperClass="md:col-span-12" />

		<div class="md:col-span-12">
			<Checkbox label="Plano ativo (disponível para novos contratos)" name="ativo" checked={plano ? !!plano.ativo : true} />
		</div>
	</div>
</FormShell>
