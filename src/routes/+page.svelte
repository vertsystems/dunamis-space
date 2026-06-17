<script lang="ts">
	import { formatBRL } from '$lib/clientes';

	let { data } = $props();

	const stats = $derived([
		{ label: 'Receita recorrente (MRR)', value: formatBRL(data.recorrente) },
		{ label: 'Lucro estimado', value: 'R$ 0' },
		{ label: 'Clientes ativos', value: String(data.ativos) },
		{ label: 'Tarefas atrasadas', value: '0' }
	]);
</script>

<div class="columns is-multiline">
	{#each stats as s (s.label)}
		<div class="column is-3">
			<div class="stat-card">
				<div class="stat-label">{s.label}</div>
				<div class="stat-value">{s.value}</div>
			</div>
		</div>
	{/each}
</div>

<div class="box mt-4">
	<h2 class="title is-5">Bem-vindo ao Dunamis Space</h2>
	<p class="content">
		Fundação pronta: SvelteKit + Bulma + Supabase. Os módulos do blueprint (Clientes, Financeiro,
		Projetos, Tarefas, Conteúdo, Contratos, Equipe) entram a partir daqui. Conecte o banco rodando as
		migrations em <code>supabase/migrations</code> e comece pelo módulo de Clientes.
	</p>
</div>
