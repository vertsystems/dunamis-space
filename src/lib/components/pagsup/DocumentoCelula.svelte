<script lang="ts">
	// A NF ou o recibo de um pagamento, na linha da Planilha Mensal. Controle
	// interno: a planilha .xlsx do mês não leva esta coluna.
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { env } from '$env/dynamic/public';
	import {
		DOC_GENERO,
		DOC_ROTULO,
		MESES_DE_RETENCAO,
		formatarBytes,
		statusDoc,
		urlDoDocumento
	} from '$lib/pagsup/documentos';
	import type { Payment } from '$lib/pagsup/types';
	import { Paperclip, FileText, ArrowLeftRight, Upload, X } from '@lucide/svelte';

	let { p }: { p: Payment } = $props();

	let input = $state<HTMLInputElement>();

	const status = $derived(statusDoc(p));
	const etapa = $derived(pagsup.enviandoDoc[p.id]);
	const url = $derived(
		p.doc?.arquivo
			? urlDoDocumento(env.PUBLIC_SUPABASE_URL ?? '', p.doc.arquivo)
			: ''
	);
	const outroTipo = $derived(p.doc?.tipo === 'nf' ? 'Recibo' : 'NF');

	function escolher(e: Event & { currentTarget: HTMLInputElement }) {
		const arquivo = e.currentTarget.files?.[0];
		// Limpa já: escolher o mesmo arquivo de novo (depois de um erro) não
		// dispararia o change.
		e.currentTarget.value = '';
		if (arquivo) pagsup.anexarDocumento(p.id, arquivo);
	}

	function fmtData(iso: string | null | undefined): string {
		return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
	}

	const acaoCls =
		'grid size-5 place-items-center rounded-[var(--radius-sm)] text-grey opacity-0 transition-all hover:bg-bg hover:text-navy focus-visible:opacity-100 group-hover:opacity-100';
</script>

<!-- Os cliques aqui não abrem a edição da linha (a linha inteira é clicável). -->
<div
	class="flex items-center gap-0.5"
	role="presentation"
	onclick={(e) => e.stopPropagation()}
	onkeydown={(e) => e.stopPropagation()}
>
	<input bind:this={input} type="file" accept="application/pdf,.pdf" class="hidden" onchange={escolher} />

	{#if etapa}
		<span class="inline-flex items-center gap-1.5 text-[10px] font-medium text-grey" aria-live="polite">
			<span class="size-3 shrink-0 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
			{etapa}
		</span>
	{:else if status === 'anexado' && p.doc}
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			title="Abrir {p.doc.nome || 'o PDF'} · {formatarBytes(p.doc.bytes)}"
			class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-brand-green/12 px-1.5 py-0.5 text-[10px] font-bold text-brand-green transition-colors hover:bg-brand-green/20"
		>
			<FileText size={11} />{DOC_ROTULO[p.doc.tipo]}
		</a>
		<button
			type="button"
			onclick={() => pagsup.trocarTipoDocumento(p.id)}
			title="Marcar como {outroTipo}"
			aria-label="Marcar o documento de {p.providerName} como {outroTipo}"
			class={acaoCls}
		><ArrowLeftRight size={11} /></button>
		<button
			type="button"
			onclick={() => input?.click()}
			title="Trocar o PDF"
			aria-label="Trocar o PDF de {p.providerName}"
			class={acaoCls}
		><Upload size={11} /></button>
		<button
			type="button"
			onclick={() => pagsup.removerDocumento(p.id)}
			title="Remover o PDF"
			aria-label="Remover o PDF de {p.providerName}"
			class="{acaoCls} hover:!bg-brand-danger/10 hover:!text-brand-danger"
		><X size={11} /></button>
	{:else if status === 'arquivado' && p.doc}
		<!-- O PDF saiu pela faxina, mas o pagamento teve documento: não é pendência. -->
		<span
			title="PDF apagado em {fmtData(p.doc.apagadoEm)}: os documentos ficam {MESES_DE_RETENCAO} meses no sistema"
			class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-bg px-1.5 py-0.5 text-[10px] font-semibold text-grey"
		>
			<FileText size={11} />{DOC_ROTULO[p.doc.tipo]} apagad{DOC_GENERO[p.doc.tipo]}
		</span>
		<button
			type="button"
			onclick={() => input?.click()}
			title="Anexar de novo"
			aria-label="Anexar de novo o PDF de {p.providerName}"
			class={acaoCls}
		><Upload size={11} /></button>
	{:else}
		<button
			type="button"
			onclick={() => input?.click()}
			title="Anexar a NF ou o recibo (PDF). Também dá para arrastar o arquivo até a linha."
			aria-label="Anexar NF ou recibo de {p.providerName}"
			class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-brand-amber/70 px-1.5 py-0.5 text-[10px] font-semibold text-brand-brown transition-colors hover:border-brand-amber hover:bg-brand-amber/10"
		>
			<Paperclip size={11} />Anexar
		</button>
	{/if}
</div>
