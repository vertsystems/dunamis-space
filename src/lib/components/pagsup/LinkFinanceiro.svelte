<script lang="ts">
	// Link público da Planilha Mensal para o financeiro do cliente conferir os
	// pagamentos e baixar as NFs e recibos sem login (/pagamentos/<token>).
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { MESES_DE_RETENCAO } from '$lib/pagsup/documentos';
	import { Button, Card } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import { Copy, ExternalLink, Link2, X } from '@lucide/svelte';

	let { onfechar }: { onfechar: () => void } = $props();

	const cliente = $derived(pagsup.clients.find((c) => c.id === pagsup.selectedClientId));
	const url = $derived(
		cliente?.publicToken ? `${location.origin}/pagamentos/${cliente.publicToken}` : ''
	);

	let confirmandoDesligar = $state(false);

	async function copiar(texto = url) {
		try {
			await navigator.clipboard.writeText(texto);
			toast.success('Link copiado');
		} catch {
			toast.error('Não deu para copiar. Selecione o link e copie à mão.');
		}
	}

	function gerar() {
		if (!cliente) return;
		const token = pagsup.ligarLinkPublico(cliente.id);
		copiar(`${location.origin}/pagamentos/${token}`);
	}

	function desligar() {
		if (!cliente) return;
		pagsup.desligarLinkPublico(cliente.id);
		confirmandoDesligar = false;
		toast.success('Link desligado. Quem tinha o endereço não acessa mais.');
	}
</script>

<Card class="mb-6">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-sm font-semibold text-navy">
			<Link2 size={16} class="text-brand" /> Link do financeiro · {cliente?.name}
		</h3>
		<button onclick={onfechar} aria-label="Fechar" class="p-1 text-grey transition-colors hover:text-navy"><X size={20} /></button>
	</div>

	{#if !url}
		<p class="mb-4 max-w-2xl text-sm text-slate">
			Um endereço para o financeiro de <b class="font-medium text-navy">{cliente?.name}</b> conferir os pagamentos
			de cada mês e baixar as NFs e os recibos, sem precisar de login. Observações, CPF/CNPJ e Pix dos prestadores
			não aparecem.
		</p>
		<Button onclick={gerar}><Link2 size={16} /> Gerar link</Button>
	{:else}
		<div class="flex flex-col gap-2 sm:flex-row">
			<input
				readonly
				value={url}
				aria-label="Link do financeiro"
				onfocus={(e) => e.currentTarget.select()}
				class="h-10 min-w-0 flex-1 rounded-[var(--radius)] border border-grey-200 bg-bg/50 px-3.5 font-mono text-xs text-navy-900 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
			/>
			<div class="flex gap-2">
				<Button onclick={() => copiar()}><Copy size={16} /> Copiar</Button>
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-surface px-4 text-sm font-semibold text-navy shadow-xs transition-colors hover:border-grey hover:bg-bg"
				><ExternalLink size={16} /> Abrir</a>
			</div>
		</div>
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-grey">
			<p>
				Quem tiver o link vê os pagamentos de {cliente?.name} e baixa os PDFs dos últimos {MESES_DE_RETENCAO} meses.
			</p>
			{#if confirmandoDesligar}
				<span class="flex items-center gap-2">
					<span class="text-slate">O link atual para de funcionar.</span>
					<Button size="sm" variant="danger" onclick={desligar}>Desligar</Button>
					<Button size="sm" variant="ghost" onclick={() => (confirmandoDesligar = false)}>Cancelar</Button>
				</span>
			{:else}
				<button
					type="button"
					onclick={() => (confirmandoDesligar = true)}
					class="font-medium text-brand-danger hover:underline"
				>Desligar link</button>
			{/if}
		</div>
	{/if}
</Card>
