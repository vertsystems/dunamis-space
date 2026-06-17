<script lang="ts">
	const stats = [
		{ label: 'Faturamento do mês', value: 'R$ 0' },
		{ label: 'Lucro estimado', value: 'R$ 0' },
		{ label: 'Clientes ativos', value: '0' },
		{ label: 'Tarefas atrasadas', value: '0' }
	];
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
