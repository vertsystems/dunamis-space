<script lang="ts">
	// Base Refs — biblioteca de referências de design, no padrão visual do
	// Dunamis Space (fundo gelo, cards brancos, azul primário, Inter). A
	// estrutura veio do filestools.vercel.app: nichos numerados, trilho lateral
	// que acompanha a rolagem e busca que filtra tudo. Os dados moram em
	// $lib/baseRefs.ts; aqui é só apresentação e interação.
	import { onMount } from 'svelte';
	import { NICHOS, TOTAL_REFS, chaveDeBusca, semAcento } from '$lib/baseRefs';
	import { Card, EmptyState } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';

	// Índice de busca calculado uma vez: cada link já com a chave normalizada.
	const indice = NICHOS.map((nicho) => ({
		nicho,
		itens: nicho.ferramentas.map((f) => ({ f, chave: chaveDeBusca(f, nicho) }))
	}));

	let busca = $state('');
	const q = $derived(semAcento(busca.trim()));
	const resultado = $derived(
		indice.map(({ nicho, itens }) => ({
			nicho,
			itens: itens.filter((i) => !q || i.chave.includes(q))
		}))
	);
	const achou = $derived(resultado.reduce((n, r) => n + r.itens.length, 0));
	const vazio = $derived(!!q && achou === 0);
	const contagem = (id: string) => resultado.find((r) => r.nicho.id === id)?.itens.length ?? 0;

	// Nicho em foco (destaque no trilho e na faixa de chips).
	let ativo = $state(NICHOS[0].id);
	// Barra de progresso de leitura (0–100).
	let progresso = $state(0);

	let raiz: HTMLDivElement;
	let campo: HTMLInputElement;
	let rolo: HTMLDivElement;

	const pad = (n: number) => String(n).padStart(2, '0');

	/**
	 * Rola até o nicho. A barra de topo do app é fixa, então o scroll-margin-top
	 * das seções (ver CSS) é quem garante que o título não fique escondido.
	 */
	function irPara(e: MouseEvent, id: string) {
		e.preventDefault();
		const alvo = raiz.querySelector<HTMLElement>(`#refs-${id}`);
		if (!alvo) return;
		const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
		alvo.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
		history.replaceState(history.state, '', `#${id}`);
	}

	function limpar() {
		busca = '';
		campo.blur();
	}

	onMount(() => {
		const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

		/* entrada: cada bloco aparece quando entra na tela (uma vez só) */
		const alvos = raiz.querySelectorAll('[data-revela]');
		let revela: IntersectionObserver | undefined;
		if (reduz || !('IntersectionObserver' in window)) {
			alvos.forEach((el) => el.classList.add('visivel'));
		} else {
			revela = new IntersectionObserver(
				(entradas) => {
					entradas.forEach((x) => {
						if (x.isIntersecting) {
							x.target.classList.add('visivel');
							revela?.unobserve(x.target);
						}
					});
				},
				{ rootMargin: '0px 0px -10% 0px', threshold: 0.06 }
			);
			alvos.forEach((el) => revela!.observe(el));
		}

		/* progresso */
		function pinta() {
			const h = document.documentElement.scrollHeight - window.innerHeight;
			progresso = h > 0 ? (window.scrollY / h) * 100 : 0;
		}
		addEventListener('scroll', pinta, { passive: true });
		pinta();

		/* nicho em foco: o primeiro bloco que cruza a faixa logo abaixo da barra */
		const espia = new IntersectionObserver(
			(entradas) => {
				entradas.forEach((x) => {
					if (!x.isIntersecting) return;
					const id = (x.target as HTMLElement).dataset.bloco!;
					if (id === ativo) return;
					ativo = id;
					// Na faixa (telas estreitas), traz o chip ativo para dentro da área visível.
					const chip = rolo?.querySelector<HTMLElement>(`[data-chip="${id}"]`);
					if (chip && rolo) {
						const f = rolo.getBoundingClientRect();
						const r = chip.getBoundingClientRect();
						if (r.left < f.left || r.right > f.right) {
							rolo.scrollTo({
								left: rolo.scrollLeft + (r.left - f.left) - 16,
								behavior: reduz ? 'auto' : 'smooth'
							});
						}
					}
				});
			},
			{ rootMargin: '-160px 0px -68% 0px' }
		);
		raiz.querySelectorAll('[data-bloco]').forEach((s) => espia.observe(s));

		/* atalhos: "/" foca a busca, Esc limpa */
		function tecla(e: KeyboardEvent) {
			const el = document.activeElement as HTMLElement | null;
			const digitando =
				el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
			if (e.key === '/' && !digitando) {
				e.preventDefault();
				campo.focus();
			}
			if (e.key === 'Escape' && el === campo) limpar();
		}
		addEventListener('keydown', tecla);

		return () => {
			revela?.disconnect();
			espia.disconnect();
			removeEventListener('scroll', pinta);
			removeEventListener('keydown', tecla);
		};
	});
</script>

<svelte:head>
	<title>Base Refs | Dunamis Space</title>
</svelte:head>

<div class="progresso" style:width="{progresso}%" aria-hidden="true"></div>

<div class="refs space-y-4" bind:this={raiz}>
	<!-- Identidade + busca numa linha só (mesmo hero do DTools, compacto) -->
	<Card>
		<div class="flex flex-wrap items-center gap-x-5 gap-y-3">
			<div class="flex items-center gap-3.5">
				<span
					class="grid size-12 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-brand text-white shadow-md"
				>
					<Icon name="refs" size={24} />
				</span>
				<div>
					<h1 class="text-2xl font-bold text-navy leading-none">Base Refs</h1>
					<p class="text-2xs font-semibold text-grey uppercase tracking-[0.14em] mt-1.5">
						{TOTAL_REFS} ferramentas em {NICHOS.length} nichos
					</p>
				</div>
			</div>

			<div class="busca ml-auto w-full min-w-[260px] flex-1 sm:max-w-md">
				<label class="sr-only" for="refs-busca">Buscar ferramenta</label>
				<span class="busca__lupa text-grey"><Icon name="search" size={16} /></span>
				<input
					id="refs-busca"
					type="search"
					autocomplete="off"
					spellcheck="false"
					placeholder="Buscar por nome, site ou o que resolve"
					class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface pl-10 pr-24 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					bind:value={busca}
					bind:this={campo}
				/>
				<span class="busca__atalho text-2xs font-semibold uppercase tracking-wider text-grey">
					<kbd class="rounded-[6px] border border-grey-200 bg-bg px-1.5 py-0.5 font-sans">/</kbd>
					buscar
				</span>
			</div>
		</div>
		{#if q}
			<p class="mt-3 text-sm text-grey" aria-live="polite">
				{#if achou === 0}
					Nenhum resultado para <b class="font-semibold text-navy">{q}</b>
				{:else}
					<b class="font-semibold text-brand">{achou}</b> de {TOTAL_REFS} recursos
				{/if}
			</p>
		{/if}
	</Card>

	<!-- Faixa de chips: substitui o trilho quando a coluna fica estreita -->
	<nav class="faixa" aria-label="Nichos">
		<div class="faixa__rolo" bind:this={rolo}>
			{#each NICHOS as n (n.id)}
				{@const c = contagem(n.id)}
				<a
					class="chip"
					href="#{n.id}"
					data-chip={n.id}
					data-ativo={ativo === n.id ? '' : undefined}
					data-fora={c === 0 ? '' : undefined}
					onclick={(e) => irPara(e, n.id)}
				>
					<svg
						class="chip__ico"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags — SVG estático de $lib/baseRefs -->
						{@html n.icone}
					</svg>
					<span>{n.titulo}</span><i>{c}</i>
				</a>
			{/each}
		</div>
	</nav>

	<Card padding="none" class="corpo">
		<nav class="rail" aria-label="Navegação por nicho">
			<p class="rail__titulo">{NICHOS.length} nichos</p>
			{#each NICHOS as n (n.id)}
				{@const c = contagem(n.id)}
				<a
					class="rail__item"
					href="#{n.id}"
					data-ativo={ativo === n.id ? '' : undefined}
					data-fora={c === 0 ? '' : undefined}
					onclick={(e) => irPara(e, n.id)}
				>
					<svg
						class="rail__ico"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags — SVG estático de $lib/baseRefs -->
						{@html n.icone}
					</svg>
					<span class="rail__nome">{n.titulo}</span>
					<span class="rail__n">{c}</span>
				</a>
			{/each}
		</nav>

		<main class="miolo">
			{#each resultado as { nicho, itens }, i (nicho.id)}
				<section
					class="bloco"
					id="refs-{nicho.id}"
					data-bloco={nicho.id}
					hidden={itens.length === 0}
				>
					<header class="bloco__topo" data-revela>
						<div class="flex items-center gap-3">
							<span
								class="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand/10 text-brand"
							>
								<svg
									class="size-[18px]"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags — SVG estático de $lib/baseRefs -->
									{@html nicho.icone}
								</svg>
							</span>
							<p class="text-2xs font-semibold uppercase tracking-[0.14em] text-grey tabular-nums">
								{pad(i + 1)} <span class="text-grey-200">/</span> {pad(NICHOS.length)}
							</p>
						</div>
						<h2 class="mt-3 text-xl font-bold text-navy leading-tight text-balance">
							{nicho.titulo}
						</h2>
						<p class="mt-1 max-w-xl text-sm text-slate">{nicho.desc}</p>
						<p class="mt-3 text-2xs font-semibold uppercase tracking-[0.14em] text-grey">
							<b class="text-navy">{itens.length}</b> recursos
						</p>
					</header>
					<div class="tags" data-revela>
						{#each nicho.ferramentas as f, j (f.href)}
							<a
								class="tag"
								href={f.href}
								target="_blank"
								rel="noopener noreferrer"
								title={f.desc}
								style:--i={j}
								hidden={!itens.some((x) => x.f === f)}
							>
								{#if f.logo}
									<img
										class="tag__logo"
										src="/base-refs/logos/{f.logo}"
										alt=""
										width="22"
										height="22"
										loading="lazy"
										decoding="async"
									/>
								{:else}
									<span class="tag__logo tag__logo--letra" aria-hidden="true">
										{f.letra ?? f.nome[0]}
									</span>
								{/if}
								<span class="tag__nome">{f.nome}</span>
								<span class="tag__host">{f.host}</span>
								<svg class="tag__seta" viewBox="0 0 14 14" aria-hidden="true">
									<path
										d="M3 11L11 3M5 3h6v6"
										fill="none"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
								</svg>
							</a>
						{/each}
					</div>
				</section>
			{/each}
			{#if vazio}
				<EmptyState
					icon="search"
					title="Nada com esse nome por aqui"
					description="Tente o site, uma palavra do problema ou o nome do nicho."
				/>
			{/if}
		</main>
	</Card>
</div>

<style>
	/* Tokens do design system (design-system.css). Só o que Tailwind não
	   expressa bem fica aqui: estados por data-attribute, sticky, entrada. */
	.refs {
		--curva: cubic-bezier(0.22, 1, 0.36, 1);
		--rail: 248px;
		/* Altura da barra fixa do app + folga: onde o trilho gruda e até onde a
		   rolagem por âncora precisa parar para o título não ficar por baixo. */
		--topo: calc(var(--ds-topbar-space) + 8px);
		container: refs / inline-size;
	}

	.progresso {
		position: fixed;
		top: 0;
		left: 0;
		height: 2px;
		background: var(--color-brand);
		width: 0;
		z-index: 60; /* acima da barra de topo do app (30) */
		transition: width 0.12s linear;
	}

	/* busca */
	.busca {
		position: relative;
	}
	.busca__lupa {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		display: grid;
		pointer-events: none;
		transition: color 0.2s var(--curva);
	}
	.busca:focus-within .busca__lupa {
		color: var(--color-brand);
	}
	.busca input::-webkit-search-cancel-button {
		display: none;
	}
	.busca__atalho {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 6px;
		pointer-events: none;
	}

	/* faixa (chips) — só quando o trilho não cabe */
	.faixa {
		position: sticky;
		top: var(--ds-topbar-full);
		z-index: 20;
		display: none;
		margin-inline: calc(-1 * var(--ds-content-gap)) calc(-1 * var(--ds-gutter-right));
		padding: 10px var(--ds-gutter-right) 10px var(--ds-content-gap);
		background: rgba(243, 246, 251, 0.88);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--color-grey-200);
	}
	.faixa__rolo {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.faixa__rolo::-webkit-scrollbar {
		display: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
		border: 1px solid var(--color-grey-200);
		background: var(--color-surface);
		border-radius: 999px;
		padding: 7px 12px;
		font-size: 0.8125rem;
		font-weight: 500;
		text-decoration: none;
		color: var(--color-navy);
		box-shadow: var(--shadow-xs);
		transition:
			border-color 0.25s var(--curva),
			background 0.25s var(--curva),
			color 0.25s var(--curva);
	}
	.chip__ico {
		width: 15px;
		height: 15px;
		flex: none;
		color: var(--color-grey);
	}
	.chip i {
		font-style: normal;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-grey);
	}
	.chip[data-ativo] {
		background: var(--color-brand);
		border-color: var(--color-brand);
		color: #fff;
		box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--color-brand) 50%, transparent);
	}
	.chip[data-ativo] .chip__ico,
	.chip[data-ativo] i {
		color: rgba(255, 255, 255, 0.8);
	}

	/* corpo: trilho + blocos dentro de um card só */
	.refs :global(.corpo) {
		display: grid;
		grid-template-columns: var(--rail) minmax(0, 1fr);
	}
	.rail {
		position: sticky;
		top: var(--topo);
		align-self: start;
		max-height: calc(100vh - var(--topo) - 32px);
		overflow-y: auto;
		scrollbar-width: none;
		padding: 0.9rem 0.6rem;
		border-right: 1px solid var(--color-grey-200);
	}
	.rail::-webkit-scrollbar {
		display: none;
	}
	/* Mesmo rótulo da sidebar do app (.sidebar-title). */
	.rail__titulo {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-grey);
		font-weight: 700;
		padding: 0.25rem 0.85rem 0.75rem;
	}
	/* Mesmo item da sidebar do app: hover gelo, ativo com tint azul. */
	.rail__item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0.55rem 0.85rem;
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--color-slate);
		font-size: 0.8125rem;
		font-weight: 500;
		line-height: 1.3;
		transition:
			color 0.2s var(--curva),
			background 0.2s var(--curva);
	}
	.rail__ico {
		width: 17px;
		height: 17px;
		flex: none;
		opacity: 0.75;
		transition:
			opacity 0.2s var(--curva),
			transform 0.25s var(--curva);
	}
	.rail__nome {
		flex: 1;
		min-width: 0;
	}
	.rail__n {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-grey);
		font-variant-numeric: tabular-nums;
	}
	.rail__item:hover {
		color: var(--color-navy);
		background: var(--color-bg);
	}
	.rail__item:hover .rail__ico {
		opacity: 1;
		transform: translateX(2px);
	}
	.rail__item[data-ativo] {
		color: var(--color-brand);
		font-weight: 600;
		background: color-mix(in srgb, var(--color-brand) 10%, transparent);
	}
	.rail__item[data-ativo] .rail__ico {
		opacity: 1;
	}
	.rail__item[data-ativo] .rail__n {
		color: var(--color-brand);
	}
	.rail__item[data-fora],
	.chip[data-fora] {
		opacity: 0.35;
		pointer-events: none;
	}

	/* blocos */
	.miolo {
		min-width: 0;
		padding: 0 1.5rem;
	}
	.bloco {
		padding: 2.5rem 0;
		border-bottom: 1px solid var(--color-grey-200);
		scroll-margin-top: var(--topo);
	}
	.bloco:first-child {
		padding-top: 1.75rem;
	}
	.bloco:last-of-type {
		border-bottom: 0;
	}
	.bloco[hidden] {
		display: none;
	}

	/* tags: cards brancos, azul no hover */
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 1.25rem;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		background: var(--color-surface);
		border: 1px solid var(--color-grey-200);
		border-radius: var(--radius);
		padding: 9px 13px;
		text-decoration: none;
		color: var(--color-navy);
		box-shadow: var(--shadow-xs);
		transition:
			border-color 0.25s var(--curva),
			box-shadow 0.25s var(--curva),
			transform 0.25s var(--curva),
			color 0.25s var(--curva);
	}
	.tag[hidden] {
		display: none;
	}
	.tag__logo {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		flex: none;
		object-fit: contain;
		background: #fff;
		border: 1px solid var(--color-grey-200);
		padding: 2px;
	}
	.tag__logo--letra {
		display: grid;
		place-items: center;
		background: var(--color-bg);
		color: var(--color-brand);
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 0;
	}
	.tag__nome {
		font-size: 0.8125rem;
		font-weight: 600;
	}
	.tag__host {
		font-size: 0.75rem;
		color: var(--color-grey);
	}
	.tag__seta {
		width: 12px;
		height: 12px;
		color: var(--color-brand);
		opacity: 0;
		transform: translate(-4px, 4px);
		transition:
			opacity 0.25s var(--curva),
			transform 0.25s var(--curva);
	}
	.tag:hover {
		border-color: var(--color-brand);
		color: var(--color-brand);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}
	.tag:hover .tag__seta {
		opacity: 1;
		transform: translate(0, 0);
	}
	.tag:focus-visible,
	.chip:focus-visible,
	.rail__item:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	/* entrada */
	[data-revela] > * {
		opacity: 0;
		transform: translateY(12px);
	}
	[data-revela]:global(.visivel) > * {
		opacity: 1;
		transform: none;
		transition:
			opacity 0.6s var(--curva),
			transform 0.6s var(--curva);
	}
	.bloco__topo > *:nth-child(2) {
		transition-delay: 0.06s;
	}
	.bloco__topo > *:nth-child(3) {
		transition-delay: 0.12s;
	}
	.bloco__topo > *:nth-child(4) {
		transition-delay: 0.18s;
	}
	.tags:global(.visivel) > .tag {
		transition-delay: calc(var(--i) * 0.022s);
	}

	@media (prefers-reduced-motion: reduce) {
		.refs *,
		.refs *::before,
		.refs *::after {
			animation: none !important;
			transition: none !important;
		}
		[data-revela] > * {
			opacity: 1 !important;
			transform: none !important;
		}
	}

	/* responsivo — pela largura do painel, que já desconta sidebar e recuos do app */
	@container refs (max-width: 1000px) {
		.refs {
			--rail: 216px;
		}
	}
	@container refs (max-width: 760px) {
		.refs :global(.corpo) {
			grid-template-columns: minmax(0, 1fr);
		}
		.rail {
			display: none;
		}
		.faixa {
			display: block;
		}
		.miolo {
			padding: 0 1rem;
		}
		.bloco {
			padding: 2rem 0;
		}
	}
	@container refs (max-width: 520px) {
		.busca__atalho {
			display: none;
		}
		/* Sem o atalho, o campo não precisa reservar espaço à direita. */
		.busca input {
			padding-right: 0.875rem;
		}
		.tags {
			gap: 8px;
		}
		.tag {
			padding: 8px 11px;
		}
		.tag__host {
			display: none;
		}
	}
</style>
