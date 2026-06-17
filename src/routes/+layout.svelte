<script lang="ts">
	import '$lib/styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';

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

	type Area = { href: string; label: string; icon: string };
	type Departamento = {
		id: string;
		label: string;
		icon: string;
		href?: string;
		base?: string;
		areas: Area[];
	};

	const departamentos: Departamento[] = [
		{ id: 'home', label: 'Home', icon: '🏠', href: '/', areas: [] },
		{
			id: 'administrativo',
			label: 'Administrativo',
			icon: '📋',
			areas: [
				{ href: '/financeiro', label: 'Financeiro', icon: '$' },
				{ href: '/equipe', label: 'Equipe', icon: '◍' },
				{ href: '/base-conhecimento', label: 'Base de Conhecimento', icon: '❏' }
			]
		},
		{
			id: 'comercial',
			label: 'Comercial',
			icon: '💼',
			areas: [
				{ href: '/clientes', label: 'Clientes (CRM)', icon: '◔' },
				{ href: '/contratos', label: 'Contratos & Planos', icon: '▤' }
			]
		},
		{
			id: 'marketing',
			label: 'Marketing',
			icon: '📣',
			areas: [
				{ href: '/projetos', label: 'Projetos', icon: '▣' },
				{ href: '/tarefas', label: 'Tarefas', icon: '☑' },
				{ href: '/conteudo', label: 'Conteúdo', icon: '✎' },
				{ href: '/campanhas', label: 'Campanhas', icon: '◎' }
			]
		},
		{
			id: 'dtools',
			label: 'DTools',
			icon: '🧰',
			href: '/dtools',
			base: '/dtools',
			areas: DTOOLS_FERRAMENTAS.map((f) => ({ href: f.href, label: f.label, icon: f.icon }))
		}
	];

	function areaAtiva(href: string): boolean {
		const p = page.url.pathname;
		return p === href || p.startsWith(href + '/');
	}

	// Departamento ativo a partir da rota atual.
	const deptAtivo = $derived.by(() => {
		const p = page.url.pathname;
		// 1) departamentos com áreas correspondentes
		const byArea = departamentos.find((dep) => dep.areas.some((a) => areaAtiva(a.href)));
		if (byArea) return byArea.id;
		// 2) departamentos com base própria (ex.: DTools, mesmo sem ferramentas)
		const byBase = departamentos.find(
			(dep) => dep.base && (p === dep.base || p.startsWith(dep.base + '/'))
		);
		if (byBase) return byBase.id;
		return 'home';
	});

	const areas = $derived(departamentos.find((d) => d.id === deptAtivo)?.areas ?? []);

	const deptHref = (d: Departamento) => d.href ?? d.areas[0]?.href ?? '/';

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
	<div class="app">
		<header class="app-topbar">
			<a class="brand" href="/">Dunamis<span>.</span>Space</a>
			<nav class="departments">
				{#each departamentos as d (d.id)}
					<a href={deptHref(d)} class:is-active={deptAtivo === d.id} title={d.label}>
						<span class="dept-ico">{d.icon}</span>
						<span class="dept-label">{d.label}</span>
					</a>
				{/each}
			</nav>
			<div class="user">
				{#if session}
					<span class="user-email">{session.user.email}</span>
					<button class="button is-small is-light" onclick={signOut}>Sair</button>
				{/if}
			</div>
		</header>

		<div class="app-body">
			{#if deptAtivo !== 'home'}
				<aside class="app-sidebar">
					<div class="sidebar-title">
						{departamentos.find((d) => d.id === deptAtivo)?.label}
					</div>
					<nav>
						{#each areas as a (a.href)}
							<a href={a.href} class:is-active={areaAtiva(a.href)} title={a.label}>
								<span class="ico">{a.icon}</span>
								<span class="area-label">{a.label}</span>
							</a>
						{/each}
					</nav>
					{#if !areas.length}
						<p class="sidebar-empty">Nenhuma ferramenta ainda. Em breve.</p>
					{/if}
				</aside>
			{/if}
			<main class="app-content" class:is-full={deptAtivo === 'home'}>
				{@render children()}
			</main>
		</div>
	</div>
{/if}
