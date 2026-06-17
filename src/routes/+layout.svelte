<script lang="ts">
	import '$lib/styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let { supabase, session } = $derived(data);

	onMount(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});

	const nav = [
		{ href: '/', label: 'Dashboard', icon: '▦' },
		{ href: '/clientes', label: 'Clientes', icon: '◔' },
		{ href: '/contratos', label: 'Contratos & Planos', icon: '▤' },
		{ href: '/financeiro', label: 'Financeiro', icon: '$' },
		{ href: '/projetos', label: 'Projetos', icon: '▣' },
		{ href: '/tarefas', label: 'Tarefas', icon: '☑' },
		{ href: '/conteudo', label: 'Conteúdo', icon: '✎' },
		{ href: '/campanhas', label: 'Campanhas', icon: '◎' },
		{ href: '/base-conhecimento', label: 'Base de Conhecimento', icon: '❏' },
		{ href: '/equipe', label: 'Equipe', icon: '◍' }
	];

	// Rotas "nuas" (sem o app shell): login e o portal público de aprovação.
	const isBare = $derived(
		page.url.pathname === '/login' || page.url.pathname.startsWith('/aprovar')
	);

	async function signOut() {
		await supabase.auth.signOut();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

{#if isBare}
	{@render children()}
{:else}
	<div class="app-shell">
		<aside class="app-sidebar">
			<div class="brand">Dunamis<span>.</span>Space</div>
			<nav>
				{#each nav as item (item.href)}
					<a href={item.href} class:is-active={page.url.pathname === item.href}>
						<span>{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</nav>
		</aside>
		<div class="app-main">
			<header class="app-topbar">
				<strong>{nav.find((n) => n.href === page.url.pathname)?.label ?? 'Dunamis Space'}</strong>
				<div>
					{#if session}
						<span class="mr-3 has-text-grey">{session.user.email}</span>
						<button class="button is-small is-light" onclick={signOut}>Sair</button>
					{/if}
				</div>
			</header>
			<main class="app-content">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
