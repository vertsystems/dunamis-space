<script lang="ts">
	// Pergunta que aparece ao soltar um post noutro dia. Sem ela, arrastar seria
	// sempre mover — e duplicar um post recorrente daria trabalho à toa.
	import { Button, Modal } from '$lib/components/ui';
	import { diaLongo } from '$lib/calendario';
	import { conteudoTipoLabel } from '$lib/conteudo';

	let {
		alvo,
		processando = false,
		onEscolher,
		onCancelar
	}: {
		alvo: { c: Record<string, any>; novaData: string; novaISO: string } | null;
		processando?: boolean;
		onEscolher: (acao: 'mover' | 'copiar') => void;
		onCancelar: () => void;
	} = $props();
</script>

<Modal
	open={!!alvo}
	title="Mover ou copiar?"
	size="sm"
	onClose={() => !processando && onCancelar()}
>
	{#if alvo}
		<p class="text-sm text-grey">
			<span class="font-medium text-navy">{alvo.c.titulo ?? conteudoTipoLabel(alvo.c.tipo)}</span>
			para <span class="font-medium text-navy">{diaLongo(alvo.novaData)}</span> às {alvo.c.hora}.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<Button variant="primary" loading={processando} onclick={() => onEscolher('mover')}>Mover</Button>
			<Button variant="secondary" loading={processando} onclick={() => onEscolher('copiar')}>
				Copiar
			</Button>
			<Button variant="ghost" onclick={onCancelar}>Cancelar</Button>
		</div>
	{/if}
</Modal>
