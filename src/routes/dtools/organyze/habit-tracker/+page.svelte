<script lang="ts">
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
	<title>Habit Tracker | Organyze</title>
</svelte:head>

<div class="max-w-4xl space-y-4">
	<div class="flex items-center gap-3">
		<span class="grid size-11 place-items-center rounded-[var(--radius-lg)] bg-brand text-white shadow-md">
			<Icon name="clipboard" size={22} />
		</span>
		<div>
			<h1 class="text-xl font-bold text-navy leading-tight">Habit Tracker</h1>
			<p class="text-xs text-grey">Acompanhe a constância dos seus hábitos.</p>
		</div>
	</div>

	<Card>
		<div class="flex flex-col items-center justify-center py-14 text-center">
			<span class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
				<Icon name="clock" size={22} />
			</span>
			<p class="text-sm font-medium text-navy">Em construção</p>
			<p class="mt-1 max-w-md text-sm text-grey">
				Em breve você poderá cadastrar hábitos, marcar cada dia e ver sua sequência (streak) ao
				longo do mês.
			</p>
		</div>
	</Card>
</div>
