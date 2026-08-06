<script lang="ts">
	// Navegação entre as telas do Organyze no mesmo estilo do Pag's Up: pílulas no
	// topo da própria tela, no lugar do submenu que abria na sidebar. São rotas de
	// verdade (não estado local como lá), então os itens são links.
	import { page } from '$app/state';
	import { ListChecks, Target, Trash2 } from '@lucide/svelte';

	const NAV = [
		{ href: '/dtools/organyze', label: 'Tarefas', icon: ListChecks },
		{ href: '/dtools/organyze/metas', label: 'Metas do Mês', icon: Target },
		{ href: '/dtools/organyze/lixeira', label: 'Lixeira', icon: Trash2 }
	];
</script>

<nav class="inline-flex shrink-0 self-start rounded-full bg-bg p-0.5" aria-label="Telas do Organyze">
	{#each NAV as item (item.href)}
		{@const Ico = item.icon}
		{@const ativo = page.url.pathname === item.href}
		<a
			href={item.href}
			aria-current={ativo ? 'page' : undefined}
			class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium no-underline transition-colors {ativo
				? 'bg-surface text-navy shadow-sm'
				: 'text-grey hover:text-navy'}"
		>
			<Ico size={15} />
			<span class="hidden sm:inline">{item.label}</span>
		</a>
	{/each}
</nav>
