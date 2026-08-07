<script lang="ts">
	// Fonte Inter auto-hospedada (sem depender do Google Fonts) — só os pesos usados.
	import '@fontsource/inter/400.css';
	import '@fontsource/inter/500.css';
	import '@fontsource/inter/600.css';
	import '@fontsource/inter/700.css';
	import '$lib/styles/app.scss';
	import '$lib/styles/design-system.css';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/dspace-logo.svg';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';
	import { podeAcessarRota, podeEditar, type Permissoes } from '$lib/permissoes';
	import { temaCss } from '$lib/tema';
	import Icon from '$lib/components/Icon.svelte';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import SosWidget from '$lib/components/SosWidget.svelte';
	import { Toaster } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';

	let { children, data } = $props();
	let { supabase, session } = $derived(data);

	// Perfil do usuário (nome/avatar no topo + cor de tema pessoal).
	const perfil = $derived(
		data.perfil as {
			nome?: string;
			avatar_url?: string;
			cor_tema?: string;
			funcao?: string;
			funcoes?: string[];
		} | null
	);
	// Cargo principal do usuário → bandeirinha no avatar.
	const cargoUsuario = $derived(
		perfil?.funcoes?.length ? perfil.funcoes[0] : (perfil?.funcao ?? null)
	);
	// CSS que sobrescreve a primária do sistema só para este login (SSR — sem flash).
	const temaStyle = $derived(temaCss(perfil?.cor_tema));

	// Chamados SOS em aberto → badge no item "Central SOS" da sidebar.
	const sosAbertos = $derived((data.sosAbertos as number) ?? 0);

	onMount(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});

	type Area = {
		href?: string;
		label: string;
		icon: string;
		soon?: boolean;
		subitens?: { href: string; label: string; letra?: string }[];
	};
	type Departamento = {
		id: string;
		label: string;
		icon: string; // nome do ícone (Icon.svelte)
		href?: string;
		base?: string;
		areas: Area[];
	};

	// Organyze e Pag's Up também moram na sidebar da Home, logo abaixo de Meu Dia:
	// são ferramentas do dia a dia de qualquer pessoa, e não um departamento à
	// parte. A fonte continua sendo DTOOLS_FERRAMENTAS — a ordem aqui é a do menu.
	const FERRAMENTAS_NA_HOME = ['/dtools/organyze', '/dtools/pagsup'];
	const areasFerramentas: Area[] = FERRAMENTAS_NA_HOME.flatMap((href) => {
		const f = DTOOLS_FERRAMENTAS.find((x) => x.href === href);
		return f ? [{ href: f.href, label: f.label, icon: f.icon, subitens: f.subitens }] : [];
	});

	const departamentos: Departamento[] = [
		{
			id: 'home',
			label: 'Home',
			icon: 'home',
			href: '/',
			areas: [
				{ href: '/', label: 'Visão Geral', icon: 'home' },
				{ href: '/meu-dia', label: 'Meu Dia', icon: 'calendar' },
				...areasFerramentas,
				{ href: '/desempenho', label: 'Desempenho', icon: 'chart' },
				{ href: '/atalhos', label: 'Atalhos', icon: 'zap' },
				{ href: '/notificacoes', label: 'Notificações', icon: 'bell' },
				{ href: '/perfil', label: 'Meu Perfil', icon: 'contact' }
			]
		},
		{
			id: 'administrativo',
			label: 'Administrativo',
			icon: 'admin',
			href: '/administrativo',
			base: '/administrativo',
			areas: [
				{ href: '/administrativo', label: 'Visão Geral', icon: 'admin' },
				{ href: '/cadastro', label: 'Clientes', icon: 'file' },
				{ href: '/fornecedores', label: 'Fornecedores', icon: 'building' },
				{ href: '/onboarding', label: 'Onboarding', icon: 'clipboard' },
				{ href: '/equipe', label: 'Equipe', icon: 'users' },
				{ href: '/administrativo/permissoes', label: 'Permissões', icon: 'shield' },
				{ href: '/ferramentas', label: 'Ferramentas & Contas', icon: 'key' },
				{ href: '/base-conhecimento', label: 'Base de Conhecimento', icon: 'book' },
				{ href: '/sos', label: 'Central SOS', icon: 'lifebuoy' }
			]
		},
		{
			id: 'comercial',
			label: 'Comercial',
			icon: 'comercial',
			href: '/comercial',
			base: '/comercial',
			areas: [
				{ href: '/comercial', label: 'Dashboard', icon: 'chart' },
				{ href: '/comercial/kanban', label: 'Kanban', icon: 'funnel' },
				{ href: '/comercial/contatos', label: 'Contatos', icon: 'contact' },
				{ href: '/comercial/metas', label: 'Metas', icon: 'target' },
				{ href: '/comercial/relatorios', label: 'Relatórios', icon: 'clipboard' }
			]
		},
		{
			id: 'marketing',
			label: 'Marketing',
			icon: 'marketing',
			// Tarefas, Conteúdo e Campanhas saíram do menu: dá para trabalhar tudo
			// pelo Calendário Editorial. As ROTAS continuam existindo e funcionando —
			// só o atalho na sidebar foi removido, então links vindos do dashboard,
			// de notificações e de outras telas seguem abrindo normalmente.
			areas: [{ href: '/calendario', label: 'Calendário Editorial', icon: 'calendar' }]
		}
		// O departamento DTools saiu do topo: as ferramentas moram na Home (ver
		// areasFerramentas acima). As rotas /dtools/* continuam existindo, inclusive
		// a visão geral em /dtools — só não há mais atalho para elas no menu.
	];

	function areaAtiva(href: string | undefined): boolean {
		if (!href) return false;
		const p = page.url.pathname;
		if (href === '/') return p === '/';
		return p === href || p.startsWith(href + '/');
	}

	// Menu filtrado por permissão: esconde áreas sem acesso (rotas pessoais sempre
	// visíveis) e departamentos que ficaram sem nenhuma área.
	const perms = $derived((data.permissoes ?? {}) as Permissoes);
	const departamentosVisiveis = $derived(
		departamentos
			.map((d) => ({ ...d, areas: d.areas.filter((a) => !a.href || podeAcessarRota(perms, a.href)) }))
			.filter((d) => d.areas.length > 0)
	);

	// Departamento ativo a partir da rota atual.
	const deptAtivo = $derived.by(() => {
		const p = page.url.pathname;
		const byArea = departamentosVisiveis.find((dep) => dep.areas.some((a) => areaAtiva(a.href)));
		if (byArea) return byArea.id;
		const byBase = departamentosVisiveis.find(
			(dep) => dep.base && (p === dep.base || p.startsWith(dep.base + '/'))
		);
		if (byBase) return byBase.id;
		return departamentosVisiveis[0]?.id ?? 'home';
	});

	const areas = $derived(departamentosVisiveis.find((d) => d.id === deptAtivo)?.areas ?? []);

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
		toast.success('Dados atualizados');
	}

	// Rotas "nuas" (sem o app shell): login e o portal público de aprovação.
	const isBare = $derived(
		page.url.pathname === '/login' ||
			page.url.pathname.startsWith('/redefinir-senha') ||
			page.url.pathname.startsWith('/aprovar')
	);

	async function signOut() {
		await supabase.auth.signOut();
		// Navega para /login e re-roda todos os loads (limpa conteúdo protegido da tela).
		await goto('/login', { invalidateAll: true });
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if temaStyle}
		<!-- eslint-disable-next-line svelte/no-at-html-tags — temaStyle é hex validado -->
		{@html `<style>${temaStyle}</style>`}
	{/if}
</svelte:head>

<Toaster />

{#if isBare}
	{@render children()}
{:else}
	<div class="app">
		<!-- Sem isto são ~15 tabulações até o conteúdo a cada troca de página. -->
		<a
			href="#conteudo"
			class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius)] focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
		>
			Pular para o conteúdo
		</a>
		<header class="app-topbar">
			<div class="topbar-inner">
				<a class="brand" href="/">
					<img class="brand-logo" src={logo} alt="Dunamis Space" />
				</a>

				<nav class="departments">
					{#each departamentosVisiveis as d (d.id)}
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
						<a
							class="avatar"
							href="/perfil"
							title={perfil?.nome ?? session.user.email}
							aria-label="Meu perfil"
						>
							<span class="avatar-img">
								{#if perfil?.avatar_url}
									<img src={perfil.avatar_url} alt="" />
								{:else}
									{initials}
								{/if}
							</span>
							{#if cargoUsuario}
								<span class="avatar-cargo"><CargoBadge funcao={cargoUsuario} /></span>
							{/if}
						</a>
						<button class="icon-btn" onclick={signOut} title="Sair" aria-label="Sair">
							<Icon name="logout" size={14} />
						</button>
					{/if}
				</div>
			</div>
		</header>

		<div class="app-body">
			{#if areas.length}
				<aside class="app-sidebar">
					<div class="sidebar-title">
						{departamentosVisiveis.find((d) => d.id === deptAtivo)?.label}
					</div>
					<nav>
						{#each areas as a (a.label)}
							{#if a.soon || !a.href}
								<span class="area-soon" title="Em breve">
									<Icon name={a.icon} size={17} />
									<span class="area-label">{a.label}</span>
									<span class="soon-pill">em breve</span>
								</span>
							{:else}
								<a href={a.href} class:is-active={areaAtiva(a.href)} title={a.label}>
									<Icon name={a.icon} size={17} />
									<span class="area-label">{a.label}</span>
									{#if a.href === '/sos' && sosAbertos > 0}
										<span class="area-badge">{sosAbertos}</span>
									{/if}
								</a>
							{/if}
							{#if a.subitens?.length && areaAtiva(a.href)}
								<div class="area-subs">
									{#each a.subitens as sub (sub.href)}
										<a
											href={sub.href}
											class="area-sub"
											class:is-active={page.url.pathname === sub.href}
											title={sub.label}
										>
											{#if sub.letra}<span class="area-sub-ico">{sub.letra}</span>{/if}
											<span class="area-label">{sub.label}</span>
										</a>
									{/each}
								</div>
							{/if}
						{/each}
					</nav>
				</aside>
			{/if}
			<main id="conteudo" tabindex="-1" class="app-content" class:is-full={!areas.length}>
				{@render children()}
			</main>
		</div>
	</div>

	<!-- O insert em sos_chamados exige `sos:editar` na RLS. Sem esta guarda, quem
	     não tem o módulo via o botão flutuante e recebia "Não foi possível enviar",
	     que sugere falha temporária. Hoje o seed libera sos a todos, então nada
	     muda na prática — isto é para quando a matriz real for definida. -->
	{#if podeEditar(perms, 'sos')}
		<SosWidget
			{supabase}
			autorNome={perfil?.nome ?? null}
			autorEmail={session?.user?.email ?? null}
		/>
	{/if}
{/if}
