<script lang="ts">
	// Tela 1 do Organyze: "Quem é você?". O app é usado em tela compartilhada,
	// então antes de qualquer coisa se escolhe o perfil.
	import { organyze } from '$lib/organyze/store.svelte';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Avatar from './Avatar.svelte';

	let {
		subtitulo = 'Escolha seu perfil para ver as suas tarefas.',
		/** Metas carregam outra coisa ao escolher o perfil. */
		onEscolher = (id: string) => organyze.selecionarColaborador(id)
	}: { subtitulo?: string; onEscolher?: (id: string) => void } = $props();
</script>

<div class="flex flex-col items-start py-10">
	<div class="mb-10 text-left">
		<h1 class="text-3xl font-bold text-navy">Quem é você?</h1>
		<p class="mt-2 text-slate">{subtitulo}</p>
	</div>

	{#if organyze.colaboradores.length === 0}
		<p class="text-sm text-grey">Nenhum colaborador ativo encontrado.</p>
	{:else}
		<div class="flex flex-wrap items-start justify-start gap-x-6 gap-y-8">
			{#each organyze.colaboradores as c (c.id)}
				<button
					class="avatar-btn flex w-24 flex-col items-center gap-2.5"
					onclick={() => onEscolher(c.id)}
				>
					<span class="avatar-ring relative rounded-full">
						<Avatar id={c.id} nome={c.nome} avatarUrl={c.avatarUrl} size="size-20" textClass="text-2xl" />
						<span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
							<CargoBadge funcao={c.funcao} />
						</span>
					</span>
					<span class="line-clamp-1 text-sm font-semibold text-navy">{c.nome}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Hover no perfil: cresce 15% e volta ao sair. */
	.avatar-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
	}
	.avatar-ring {
		display: inline-block;
		transition: transform 0.18s ease;
		outline: 2px solid transparent;
		outline-offset: 2px;
		border-radius: 9999px;
	}
	.avatar-btn:hover .avatar-ring {
		transform: scale(1.15);
		outline-color: var(--color-brand);
	}
</style>
