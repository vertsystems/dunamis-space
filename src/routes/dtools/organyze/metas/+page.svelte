<script lang="ts">
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
	<title>Metas do Mês | Organyze</title>
</svelte:head>

<div class="max-w-4xl space-y-5">
	<!-- Cabeçalho -->
	<div class="flex items-center gap-3">
		<span class="grid size-11 place-items-center rounded-[var(--radius-lg)] bg-brand text-white shadow-md">
			<Icon name="chart" size={22} />
		</span>
		<div>
			<h1 class="text-xl font-bold text-navy leading-tight">Metas do Mês</h1>
			<p class="text-xs text-grey">Defina metas mensais e acompanhe seus hábitos.</p>
		</div>
	</div>

	<!-- Metas -->
	<Card>
		<div class="mb-1 flex items-center gap-2">
			<Icon name="chart" size={16} class="text-brand" />
			<h2 class="text-sm font-semibold text-navy">Metas</h2>
		</div>
		<div class="flex flex-col items-center justify-center py-10 text-center">
			<span class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
				<Icon name="clock" size={22} />
			</span>
			<p class="text-sm font-medium text-navy">Em construção</p>
			<p class="mt-1 max-w-md text-sm text-grey">
				Em breve você poderá definir metas mensais, acompanhar o progresso e marcar as concluídas.
			</p>
		</div>
	</Card>

	<!-- Habit Tracker (embutido) -->
	<Card>
		<div class="mb-1 flex items-center gap-2">
			<Icon name="clipboard" size={16} class="text-brand" />
			<h2 class="text-sm font-semibold text-navy">Habit Tracker</h2>
		</div>
		<p class="mb-1 text-xs text-grey">Acompanhe a constância dos seus hábitos ao longo do mês.</p>
		<div class="flex flex-col items-center justify-center py-10 text-center">
			<span class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
				<Icon name="check" size={22} />
			</span>
			<p class="text-sm font-medium text-navy">Em construção</p>
			<p class="mt-1 max-w-md text-sm text-grey">
				Em breve: cadastre hábitos, marque cada dia e veja sua sequência (streak) no mês.
			</p>
		</div>
	</Card>
</div>
