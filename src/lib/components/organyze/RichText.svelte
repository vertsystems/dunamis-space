<script lang="ts">
	// Editor de texto leve (estilo Notion enxuto): negrito, itálico, sublinhado,
	// tachado, lista, cor de texto e cor de fundo (marca-texto). Baseado em
	// contenteditable + execCommand (sem dependências). Salva o HTML via onSave.
	import { Bold, Italic, Underline, Strikethrough, List, Baseline, Highlighter } from '@lucide/svelte';

	let {
		value = '',
		placeholder = 'Escreva uma descrição…',
		onSave
	}: { value?: string; placeholder?: string; onSave: (html: string) => void } = $props();

	let el = $state<HTMLDivElement | null>(null);
	// Qual paleta está aberta (cor de texto ou de fundo) — null = nenhuma.
	let paleta = $state<'texto' | 'fundo' | null>(null);

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

	/** Aplica cor de texto (foreColor) ou de fundo (hiliteColor/backColor) à seleção. */
	function aplicarCor(tipo: 'texto' | 'fundo', cor: string) {
		el?.focus();
		if (tipo === 'texto') {
			document.execCommand('foreColor', false, cor);
		} else {
			// hiliteColor é o padrão; backColor é o fallback de alguns navegadores.
			const ok = document.execCommand('hiliteColor', false, cor);
			if (!ok) document.execCommand('backColor', false, cor);
		}
		if (el) onSave(el.innerHTML);
		paleta = null;
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

	// Cores de texto: primeira é o padrão (reseta para a cor base).
	const CORES_TEXTO = [
		{ cor: '#101828', label: 'Padrão' },
		{ cor: '#667085', label: 'Cinza' },
		{ cor: '#94a3b8', label: 'Cinza claro' },
		{ cor: '#f04438', label: 'Vermelho' },
		{ cor: '#f97316', label: 'Laranja' },
		{ cor: '#f5a524', label: 'Âmbar' },
		{ cor: '#eab308', label: 'Amarelo' },
		{ cor: '#84cc16', label: 'Lima' },
		{ cor: '#17b26a', label: 'Verde' },
		{ cor: '#14b8a6', label: 'Teal' },
		{ cor: '#06b6d4', label: 'Ciano' },
		{ cor: '#0ea5e9', label: 'Azul-céu' },
		{ cor: '#3b6ef6', label: 'Azul' },
		{ cor: '#6366f1', label: 'Índigo' },
		{ cor: '#8b5cf6', label: 'Roxo' },
		{ cor: '#d946ef', label: 'Fúcsia' },
		{ cor: '#ec4899', label: 'Rosa' },
		{ cor: '#f43f5e', label: 'Rosa-forte' },
		{ cor: '#a16207', label: 'Marrom' },
		{ cor: '#ffffff', label: 'Branco' }
	];
	// Cores de fundo (marca-texto): primeira remove o realce.
	const CORES_FUNDO = [
		{ cor: 'transparent', label: 'Nenhum' },
		{ cor: '#e5e7eb', label: 'Cinza' },
		{ cor: '#fecaca', label: 'Vermelho' },
		{ cor: '#fed7aa', label: 'Laranja' },
		{ cor: '#fde68a', label: 'Âmbar' },
		{ cor: '#fef08a', label: 'Amarelo' },
		{ cor: '#d9f99d', label: 'Lima' },
		{ cor: '#bbf7d0', label: 'Verde' },
		{ cor: '#99f6e4', label: 'Teal' },
		{ cor: '#a5f3fc', label: 'Ciano' },
		{ cor: '#bae6fd', label: 'Azul-céu' },
		{ cor: '#bfdbfe', label: 'Azul' },
		{ cor: '#c7d2fe', label: 'Índigo' },
		{ cor: '#ddd6fe', label: 'Roxo' },
		{ cor: '#f5d0fe', label: 'Fúcsia' },
		{ cor: '#fbcfe8', label: 'Rosa' },
		{ cor: '#fecdd3', label: 'Rosa-claro' },
		{ cor: '#e7e5e4', label: 'Pedra' },
		{ cor: '#fef3c7', label: 'Creme' },
		{ cor: '#f0abfc', label: 'Lavanda' }
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

		<span class="mx-1 h-4 w-px bg-grey-200"></span>

		<!-- Cor de texto -->
		<div class="relative">
			<button
				type="button"
				title="Cor do texto"
				aria-label="Cor do texto"
				class="grid size-7 place-items-center rounded-md text-slate transition-colors hover:bg-bg hover:text-navy"
				class:bg-bg={paleta === 'texto'}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => (paleta = paleta === 'texto' ? null : 'texto')}
			>
				<Baseline size={15} />
			</button>
			{#if paleta === 'texto'}
				<div
					class="absolute left-0 top-8 z-20 grid w-max grid-cols-10 gap-1.5 rounded-[var(--radius)] border border-grey-200 bg-surface p-2 shadow-lg"
				>
					{#each CORES_TEXTO as c (c.cor)}
						<button
							type="button"
							title={c.label}
							aria-label={c.label}
							class="size-5 rounded-full border border-grey-200 transition-transform hover:scale-125"
							style="background: {c.cor}"
							onmousedown={(e) => e.preventDefault()}
							onclick={() => aplicarCor('texto', c.cor)}
						></button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Cor de fundo (marca-texto) -->
		<div class="relative">
			<button
				type="button"
				title="Cor de fundo"
				aria-label="Cor de fundo"
				class="grid size-7 place-items-center rounded-md text-slate transition-colors hover:bg-bg hover:text-navy"
				class:bg-bg={paleta === 'fundo'}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => (paleta = paleta === 'fundo' ? null : 'fundo')}
			>
				<Highlighter size={15} />
			</button>
			{#if paleta === 'fundo'}
				<div
					class="absolute right-0 top-8 z-20 grid w-max grid-cols-10 gap-1.5 rounded-[var(--radius)] border border-grey-200 bg-surface p-2 shadow-lg"
				>
					{#each CORES_FUNDO as c (c.cor)}
						<button
							type="button"
							title={c.label}
							aria-label={c.label}
							class="grid size-5 place-items-center rounded-full border border-grey-200 transition-transform hover:scale-125"
							class:bg-surface={c.cor === 'transparent'}
							style={c.cor === 'transparent' ? '' : `background: ${c.cor}`}
							onmousedown={(e) => e.preventDefault()}
							onclick={() => aplicarCor('fundo', c.cor)}
						>
							{#if c.cor === 'transparent'}<span class="text-[9px] text-grey">✕</span>{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
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
