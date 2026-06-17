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
				{ href: '/financeiro', label: 'Financeiro', icon: '$' },
				{ href: '/equipe', label: 'Equipe', icon: '◍' },
				{ href: '/base-conhecimento', label: 'Base de Conhecimento', icon: '❏' }
			]
		},
		{
			id: 'comercial',
			label: 'Comercial',
			icon: 'comercial',
			areas: [
				{ href: '/clientes', label: 'Clientes (CRM)', icon: '◔' },
				{ href: '/contratos', label: 'Contratos & Planos', icon: '▤' }
			]
		},
		{
			id: 'marketing',
			label: 'Marketing',
			icon: 'marketing',
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

	// Abrir/fechar a barra lateral no mobile
	let navOpen = $state(false);

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
	<div class="app" class:nav-open={navOpen}>
		<!-- Botão de menu (mobile) -->
		<button class="nav-toggle" onclick={() => (navOpen = !navOpen)} aria-label="Menu">
			<Icon name={navOpen ? 'close' : 'menu'} size={20} />
		</button>
		<div
			class="nav-overlay"
			onclick={() => (navOpen = false)}
			role="presentation"
		></div>

		<!-- Menu vertical à esquerda (departamentos) -->
		<aside class="app-nav">
			<a class="nav-brand" href="/" onclick={() => (navOpen = false)}>
				<img class="brand-logo" src={logo} alt="Dunamis Space" />
			</a>

			<nav class="nav-depts">
				{#each departamentos as d (d.id)}
					{@const badge = badgeDe(d.id)}
					{@const ativo = deptAtivo === d.id}
					<a
						class="dept"
						class:is-active={ativo}
						href={deptHref(d)}
						onclick={() => (navOpen = false)}
					>
						<Icon name={d.icon} size={17} />
						<span class="dept-label">{d.label}</span>
						{#if badge}<span class="badge">{badge}</span>{/if}
					</a>

					{#if ativo && areas.length}
						<div class="dept-areas">
							{#each areas as a (a.href)}
								<a
									class="area"
									class:is-active={areaAtiva(a.href)}
									href={a.href}
									onclick={() => (navOpen = false)}
								>
									<span class="ico">{a.icon}</span>
									<span class="area-label">{a.label}</span>
								</a>
							{/each}
						</div>
					{:else if ativo && d.id === 'dtools'}
						<div class="dept-areas">
							<span class="areas-empty">Nenhuma ferramenta ainda.</span>
						</div>
					{/if}
				{/each}
			</nav>

			<div class="nav-footer">
				<button
					class="icon-btn"
					class:is-spinning={refreshing}
					onclick={refresh}
					title="Atualizar"
					aria-label="Atualizar"
				>
					<Icon name="refresh" size={16} />
				</button>
				{#if session}
					<span class="avatar" title={session.user.email}>{initials}</span>
					<button class="icon-btn" onclick={signOut} title="Sair" aria-label="Sair">
						<Icon name="logout" size={16} />
					</button>
				{/if}
			</div>
		</aside>

		<main class="app-content">
			{@render children()}
		</main>
	</div>
{/if}
