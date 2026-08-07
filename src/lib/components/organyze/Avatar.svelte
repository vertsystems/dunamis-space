<script lang="ts">
	// Foto do colaborador — ou as iniciais numa cor estável, quando não há foto.
	// Este par apareceu cinco vezes no Organyze (seleção de perfil, cabeçalho,
	// responsáveis do card, dono da tarefa e lista do modal), sempre com o mesmo
	// fallback escrito de novo.
	import { corAvatar, iniciais } from '$lib/organyze/ui';

	let {
		id,
		nome,
		avatarUrl = null,
		/** Classe de tamanho do Tailwind (size-5, size-11, size-20…). */
		size = 'size-10',
		/** Tamanho do texto das iniciais. */
		textClass = 'text-sm',
		class: extra = '',
		title
	}: {
		id: string;
		nome: string;
		avatarUrl?: string | null;
		size?: string;
		textClass?: string;
		class?: string;
		title?: string;
	} = $props();
</script>

{#if avatarUrl}
	<img src={avatarUrl} alt={nome} title={title ?? nome} class="{size} rounded-full object-cover {extra}" />
{:else}
	<span
		title={title ?? nome}
		class="{size} {textClass} grid place-items-center rounded-full font-semibold text-white {extra}"
		style="background: {corAvatar(id)}"
	>
		{iniciais(nome)}
	</span>
{/if}
