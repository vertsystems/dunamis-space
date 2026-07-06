<script lang="ts">
	// Editor de texto leve (estilo Notion enxuto): negrito, itálico, sublinhado,
	// tachado e lista. Baseado em contenteditable + execCommand (sem dependências).
	// Salva o HTML via onSave no blur e após aplicar formatação.
	import { Bold, Italic, Underline, Strikethrough, List } from '@lucide/svelte';

	let {
		value = '',
		placeholder = 'Escreva uma descrição…',
		onSave
	}: { value?: string; placeholder?: string; onSave: (html: string) => void } = $props();

	let el = $state<HTMLDivElement | null>(null);

	function init(node: HTMLDivElement) {
		node.innerHTML = value || '';
	}

	function comando(cmd: string) {
		el?.focus();
		document.execCommand(cmd, false);
		if (el) onSave(el.innerHTML);
	}

	function salvar() {
		if (el) onSave(el.innerHTML);
	}

	// Cola sempre como texto puro (mantém o conteúdo enxuto e evita HTML externo).
	function onPaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text);
	}

	const BOTOES = [
		{ cmd: 'bold', icon: Bold, label: 'Negrito' },
		{ cmd: 'italic', icon: Italic, label: 'Itálico' },
		{ cmd: 'underline', icon: Underline, label: 'Sublinhado' },
		{ cmd: 'strikeThrough', icon: Strikethrough, label: 'Tachado' },
		{ cmd: 'insertUnorderedList', icon: List, label: 'Lista' }
	];
</script>

<div class="rounded-[var(--radius)] border border-grey-200 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
	<div class="flex items-center gap-0.5 border-b border-grey-200 px-1.5 py-1">
		{#each BOTOES as b (b.cmd)}
			{@const Ico = b.icon}
			<button
				type="button"
				title={b.label}
				aria-label={b.label}
				class="grid size-7 place-items-center rounded-md text-slate transition-colors hover:bg-bg hover:text-navy"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => comando(b.cmd)}
			>
				<Ico size={15} />
			</button>
		{/each}
	</div>
	<div
		bind:this={el}
		use:init
		contenteditable="true"
		role="textbox"
		tabindex="0"
		aria-multiline="true"
		data-placeholder={placeholder}
		class="organyze-rt min-h-[90px] px-3.5 py-2.5 text-sm text-navy-900 outline-none"
		oninput={salvar}
		onblur={salvar}
		onpaste={onPaste}
	></div>
</div>

<style>
	.organyze-rt:empty::before {
		content: attr(data-placeholder);
		color: var(--color-grey);
		pointer-events: none;
	}
	.organyze-rt :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
		margin: 0.25rem 0;
	}
	.organyze-rt :global(a) {
		color: var(--color-brand);
		text-decoration: underline;
	}
</style>
