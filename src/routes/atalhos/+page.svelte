<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	type Atalho = { href: string; label: string; desc: string; icon: string };

	const criar: Atalho[] = [
		{ href: '/clientes/novo', label: 'Novo cliente', desc: 'Cadastrar cliente / lead', icon: 'contact' },
		{ href: '/crm', label: 'Novo negócio', desc: 'Abrir o CRM e criar oportunidade', icon: 'funnel' },
		{ href: '/conteudo/novo', label: 'Novo conteúdo', desc: 'Criar post no calendário', icon: 'edit' },
		{ href: '/financeiro/novo', label: 'Nova transação', desc: 'Registrar receita ou despesa', icon: 'dollar' },
		{ href: '/contratos/novo', label: 'Novo contrato', desc: 'Cadastrar contrato', icon: 'file' }
	];

	const acessar: Atalho[] = [
		{ href: '/crm', label: 'CRM Master', desc: 'Pipeline de vendas', icon: 'funnel' },
		{ href: '/cadastro', label: 'Clientes', desc: 'Base de clientes', icon: 'contact' },
		{ href: '/calendario', label: 'Calendário Editorial', desc: 'Conteúdo, backlog e aprovações', icon: 'calendar' },
		{ href: '/financeiro', label: 'Financeiro', desc: 'Receitas e despesas', icon: 'dollar' },
		{ href: '/equipe', label: 'Equipe', desc: 'Colaboradores', icon: 'users' },
		{ href: '/base-conhecimento', label: 'Base de Conhecimento', desc: 'Wiki interna', icon: 'book' }
	];
</script>

{#snippet grade(itens: Atalho[])}
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
		<!-- Chave pelo índice: a lista é fixa, e chavear por href+label derrubava a
		     página inteira quando dois atalhos coincidiam (o Svelte trata chave
		     repetida como erro de runtime, e a hidratação caía na tela de erro). -->
		{#each itens as a, i (i)}
			<a
				href={a.href}
				class="group flex items-center gap-3 bg-surface border border-grey-200 rounded-[var(--radius-lg)] p-4 hover:border-brand hover:shadow-sm transition-colors"
			>
				<span
					class="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-bg text-slate group-hover:bg-brand/10 group-hover:text-brand transition-colors"
				>
					<Icon name={a.icon} size={20} />
				</span>
				<span class="min-w-0">
					<span class="block font-semibold text-navy">{a.label}</span>
					<span class="block text-xs text-grey truncate">{a.desc}</span>
				</span>
			</a>
		{/each}
	</div>
{/snippet}

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Atalhos</h1>
	<p class="text-sm text-grey">Acesso rápido ao que você mais usa.</p>
</div>

<h2 class="text-xs uppercase tracking-wide font-semibold text-grey mb-2">Criar</h2>
{@render grade(criar)}

<h2 class="text-xs uppercase tracking-wide font-semibold text-grey mb-2 mt-6">Acessar</h2>
{@render grade(acessar)}
