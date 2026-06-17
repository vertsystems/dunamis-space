<script lang="ts">
	import '$lib/styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/dspace-logo.svg';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';
	import Icon from '$lib/components/Icon.svelte';

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
		icon: string; // nome do ícone (Icon.svelte)
		href?: string;
		base?: string;
		areas: Area[];
	};

	const departamentos: Departamento[] = [
		{ id: 'home', label: 'Home', icon: 'home', href: '/', areas: [] },
		{
			id: 'administrativo',
			label: 'Administrativo',
			icon: 'admin',
			areas: [
				{ href: '/financeiro', label: 'Financeiro', icon: 'dollar' },
				{ href: '/equipe', label: 'Equipe', icon: 'users' },
				{ href: '/base-conhecimento', label: 'Base de Conhecimento', icon: 'book' }
			]
		},
		{
			id: 'comercial',
			label: 'Comercial',
			icon: 'comercial',
			areas: [
				{ href: '/clientes', label: 'Clientes (CRM)', icon: 'contact' },
				{ href: '/contratos', label: 'Contratos & Planos', icon: 'file' }
			]
		},
		{
			id: 'marketing',
			label: 'Marketing',
			icon: 'marketing',
			areas: [
				{ href: '/projetos', label: 'Projetos', icon: 'folder' },
				{ href: '/tarefas', label: 'Tarefas', icon: 'check' },
				{ href: '/conteudo', label: 'Conteúdo', icon: 'edit' },
				{ href: '/campanhas', label: 'Campanhas', icon: 'tag' }
			]
		},
		{
			id: 'dtools',
			label: 'DTools',
			icon: 'dtools',
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
		const byArea = departamentos.find((dep) => dep.areas.some((a) => areaAtiva(a.href)));
		if (byArea) return byArea.id;
		const byBase = departamentos.find(
			(dep) => dep.base && (p === dep.base || p.startsWith(dep.base + '/'))
		);
		if (byBase) return byBase.id;
		return 'home';
	});

	const areas = $derived(departamentos.find((d) => d.id === deptAtivo)?.areas ?? []);

	const deptHref = (d: Departamento) => d.href ?? d.areas[0]?.href ?? '/';

	// Badge de notificação por departamento (aprovações pendentes → Marketing).
	const badgeDe = (id: string) => (id === 'marketing' ? (data.aprovacoesPendentes ?? 0) : 0);

	// Iniciais do usuário para o avatar.
	const initials = $derived.by(() => {
		const email = session?.user?.email ?? '';
		const local = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
		return (local.slice(0, 2) || '?').toUpperCase();
	});

	let refreshing = $state(false);
	async function refresh() {
		refreshing = true;
		await invalidateAll();
		refreshing = false;
	}

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
			<a class="brand" href="/">
				<img class="brand-logo" src={logo} alt="Dunamis Space" />
			</a>

			<nav class="departments">
				{#each departamentos as d (d.id)}
					{@const badge = badgeDe(d.id)}
					<a href={deptHref(d)} class:is-active={deptAtivo === d.id} title={d.label}>
						<Icon name={d.icon} size={14} />
						<span class="dept-label">{d.label}</span>
						{#if badge}<span class="badge">{badge}</span>{/if}
					</a>
				{/each}
			</nav>

			<div class="actions">
				<button
					class="icon-btn"
					class:is-spinning={refreshing}
					onclick={refresh}
					title="Atualizar"
					aria-label="Atualizar"
				>
					<Icon name="refresh" size={14} />
				</button>
				{#if session}
					<span class="avatar" title={session.user.email}>{initials}</span>
					<button class="icon-btn" onclick={signOut} title="Sair" aria-label="Sair">
						<Icon name="logout" size={14} />
					</button>
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
								<Icon name={a.icon} size={17} />
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
