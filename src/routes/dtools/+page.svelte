<script lang="ts">
	import { enhance } from '$app/forms';
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';
	import { Card, Button } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';

	let enfileirando = $state(false);
</script>

<Card>
	<h1 class="text-lg font-semibold text-navy">DTools — Ferramentas Dunamis</h1>
	<p class="text-slate mb-4">Central de ferramentas internas da Dunamis integradas ao sistema.</p>

	{#if DTOOLS_FERRAMENTAS.length}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			{#each DTOOLS_FERRAMENTAS as f (f.href)}
				<a
					class="flex items-center gap-3.5 p-4 rounded-[var(--radius-lg)] border border-grey-200 bg-surface text-navy no-underline h-full transition-shadow hover:border-brand hover:shadow-md"
					href={f.href}
				>
					<span class="text-2xl leading-none">{f.icon}</span>
					<div>
						<strong>{f.label}</strong>
						{#if f.descricao}<p class="text-sm text-grey mb-0">{f.descricao}</p>{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-[var(--radius)] bg-bg px-4 py-3 text-sm text-slate">
			<strong>Nenhuma ferramenta configurada ainda.</strong>
			<p class="mt-1 mb-0">
				Este é o espaço reservado para as ferramentas da Dunamis. Conforme forem definidas, elas
				aparecerão aqui e no menu lateral de DTools.
			</p>
		</div>
	{/if}
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-navy mb-1">Tarefas em segundo plano</h2>
	<p class="text-sm text-slate mb-3">
		Dispara um job de teste. Ele roda fora da tela e, ao concluir, aparece um toast
		(via Supabase Realtime) — sem travar a navegação.
	</p>
	<form
		method="POST"
		action="?/testJob"
		use:enhance={() => {
			enfileirando = true;
			return async ({ result, update }) => {
				enfileirando = false;
				if (result.type === 'success') toast.info('Tarefa enfileirada — você será avisado ao concluir.');
				else if (result.type === 'failure')
					toast.error(String(result.data?.error ?? 'Não foi possível enfileirar.'));
				await update();
			};
		}}
	>
		<Button type="submit" loading={enfileirando}>Enfileirar tarefa de teste</Button>
	</form>
</Card>
