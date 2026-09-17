<script lang="ts">
	// Base Refs — cópia fiel de https://filestools.vercel.app/ dentro do app:
	// mesma capa, mesmo trilho de nichos, mesma busca e as mesmas 105 referências.
	// Os dados moram em $lib/baseRefs.ts; aqui é só apresentação e interação.
	//
	// Fontes do site original, auto-hospedadas (o app não depende do Google
	// Fonts). Só os pesos usados no CSS abaixo entram no bundle.
	import '@fontsource/bebas-neue/400.css';
	import '@fontsource/hanken-grotesk/400.css';
	import '@fontsource/hanken-grotesk/500.css';
	import '@fontsource/hanken-grotesk/600.css';
	import '@fontsource/hanken-grotesk/700.css';
	import '@fontsource/jetbrains-mono/600.css';
	import '@fontsource/cormorant-garamond/600-italic.css';
	import { onMount } from 'svelte';
	import { NICHOS, TOTAL_REFS, chaveDeBusca, semAcento } from '$lib/baseRefs';

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
								left: rolo.scrollLeft + (r.left - f.left) - 20,
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
			const digitando = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
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
	<title>Base Refs · {TOTAL_REFS} ferramentas em {NICHOS.length} nichos | Dunamis Space</title>
</svelte:head>

<div class="progresso" style:width="{progresso}%" aria-hidden="true"></div>

<div class="refs" class:vazio bind:this={raiz}>
	<header class="capa">
		<div class="capa__brilho" aria-hidden="true"></div>
		<img class="capa__crest" src="/base-refs/crest.png" alt="" width="420" height="420" aria-hidden="true" />
		<div class="marca" aria-label="Dunamis">
			<span class="marca__z">D</span><span class="marca__risco"></span><span class="marca__nome">DUNAMIS</span>
		</div>
		<p class="capa__rotulo sobe">BASE REFS</p>
		<h1 class="sobe d1">
			Você não precisa de mais uma ferramenta.<br class="q" />
			<em>Precisa achar a certa em 10 segundos.</em>
		</h1>
		<p class="capa__linha sobe d2">
			Organizado por problema, não por ordem alfabética:<br class="q" /> escolhe o nicho no menu ou
			digita o que precisa resolver.
		</p>
		<div class="busca sobe d3">
			<label class="sr-only" for="refs-busca">Buscar ferramenta</label>
			<input
				id="refs-busca"
				type="search"
				autocomplete="off"
				spellcheck="false"
				placeholder="Buscar por nome, site ou o que resolve"
				bind:value={busca}
				bind:this={campo}
			/>
			<svg class="busca__lupa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
				<circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
			</svg>
			<span class="busca__atalho"><kbd>/</kbd> buscar</span>
		</div>
		<p class="busca__saldo" aria-live="polite">
			{#if q}
				{#if achou === 0}
					Nenhum resultado para <b>{q}</b>
				{:else}
					<b>{achou}</b> de {TOTAL_REFS} recursos
				{/if}
			{/if}
		</p>
	</header>

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
					<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<!-- eslint-disable-next-line svelte/no-at-html-tags — SVG estático de $lib/baseRefs -->
						{@html n.icone}
					</svg>
					<span>{n.titulo}</span><i>{c}</i>
				</a>
			{/each}
		</div>
	</nav>

	<div class="corpo">
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
					<svg class="rail__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
				<section class="bloco" id="refs-{nicho.id}" data-bloco={nicho.id} hidden={itens.length === 0}>
					<header class="bloco__topo" data-revela>
						<div class="bloco__marca">
							<svg class="bloco__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<!-- eslint-disable-next-line svelte/no-at-html-tags — SVG estático de $lib/baseRefs -->
								{@html nicho.icone}
							</svg>
							<p class="bloco__num">{pad(i + 1)}<em>/{NICHOS.length}</em></p>
						</div>
						<h2 class="bloco__titulo">{nicho.titulo}</h2>
						<p class="bloco__desc">{nicho.desc}</p>
						<p class="bloco__cont"><b>{itens.length}</b> recursos</p>
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
									<img class="tag__logo" src="/base-refs/logos/{f.logo}" alt="" width="22" height="22" loading="lazy" decoding="async" />
								{:else}
									<span class="tag__logo tag__logo--letra" aria-hidden="true">{f.letra ?? f.nome[0]}</span>
								{/if}
								<span class="tag__nome">{f.nome}</span>
								<span class="tag__host">{f.host}</span>
								<svg class="tag__seta" viewBox="0 0 14 14" aria-hidden="true">
									<path d="M3 11L11 3M5 3h6v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
								</svg>
							</a>
						{/each}
					</div>
				</section>
			{/each}
			<p class="vazio-msg">
				Nada com esse nome por aqui. Tenta o <b>site</b>, uma palavra do <b>problema</b> ou o nome do
				<b>nicho</b>.
			</p>
		</main>
	</div>
</div>

<style>
	/* Paleta e ritmo do site original. Tudo escopado ao painel .refs — nada
	   vaza para o resto do app (cores, fontes, seleção). */
	.refs {
		--bg: oklch(0.155 0.012 68);
		--card: oklch(0.205 0.014 71);
		--card2: oklch(0.235 0.016 72);
		--gold: oklch(0.79 0.1 80);
		--gold-light: oklch(0.88 0.09 86);
		--gold-dim: oklch(0.6 0.1 68);
		--gold-pale: oklch(0.82 0.05 82);
		--white: oklch(0.945 0.014 82);
		--gray: oklch(0.74 0.022 78);
		--gray2: oklch(0.575 0.02 74);
		--line: oklch(0.82 0.04 78 / 0.16);
		--raio: 10px;
		--curva: cubic-bezier(0.22, 1, 0.36, 1);
		/* Recuo interno proporcional à LARGURA DO PAINEL (cqw), não da janela:
		   dentro do app a coluna de conteúdo é bem mais estreita que 100vw. */
		--margem: clamp(20px, 5cqw, 64px);
		--rail: 280px;
		/* Altura da barra fixa do app + folga: onde o trilho gruda e até onde a
		   rolagem por âncora precisa parar para o título não ficar por baixo. */
		--topo: calc(var(--ds-topbar-space) + 8px);

		container: refs / inline-size;
		background: var(--bg);
		color: var(--white);
		font-family: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
		font-size: 16px;
		line-height: 1.55;
		-webkit-font-smoothing: antialiased;
		text-wrap: pretty;
		border-radius: 22px;
		/* clip (e não hidden): corta os cantos sem virar contêiner de rolagem,
		   senão o position: sticky do trilho deixa de funcionar. */
		overflow: clip;
		box-shadow: 0 14px 34px -10px rgba(16, 24, 40, 0.24);
	}
	.refs ::selection {
		background: var(--gold);
		color: var(--bg);
	}
	.refs a {
		color: inherit;
	}
	.ico {
		width: 20px;
		height: 20px;
		flex: none;
	}
	h1,
	h2 {
		font-family: 'Bebas Neue', Impact, sans-serif;
		font-weight: 400;
	}

	.progresso {
		position: fixed;
		top: 0;
		left: 0;
		height: 2px;
		background: oklch(0.79 0.1 80);
		width: 0;
		z-index: 60; /* acima da barra de topo do app (30) */
		transition: width 0.12s linear;
	}

	/* marca */
	.marca {
		position: absolute;
		top: 34px;
		right: var(--margem);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.marca__z {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-weight: 600;
		font-size: 28px;
		color: var(--gold);
		line-height: 1;
	}
	.marca__risco {
		width: 1px;
		height: 22px;
		background: var(--gold-dim);
	}
	.marca__nome {
		font-family: 'Bebas Neue', Impact, sans-serif;
		font-size: 18px;
		letter-spacing: 0.16em;
		color: var(--gold-pale);
	}

	/* capa */
	.capa {
		position: relative;
		padding: 96px var(--margem) 56px;
		overflow: hidden;
	}
	.capa__brilho {
		position: absolute;
		top: -260px;
		left: -10%;
		width: 680px;
		height: 680px;
		background: radial-gradient(circle, rgba(201, 160, 88, 0.14), rgba(201, 160, 88, 0) 62%);
		pointer-events: none;
		animation: respira 14s ease-in-out infinite;
	}
	.capa__crest {
		position: absolute;
		right: -40px;
		top: 60px;
		width: 420px;
		height: auto;
		opacity: 0.028;
		pointer-events: none;
	}
	@keyframes respira {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.9;
		}
		50% {
			transform: scale(1.14);
			opacity: 0.55;
		}
	}
	.capa__rotulo {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-weight: 600;
		font-size: 11px;
		letter-spacing: 0.18em;
		color: var(--gold);
	}
	.capa__rotulo::before {
		content: '';
		width: 26px;
		height: 1px;
		background: var(--gold-dim);
	}
	.capa h1 {
		font-size: clamp(27px, 3.4cqw, 43px);
		line-height: 1.03;
		letter-spacing: -0.015em;
		margin: 14px 0 0;
		max-width: 1160px;
		color: var(--white);
	}
	.capa h1 em {
		font-style: normal;
		color: var(--gold);
	}
	.capa__linha {
		font-size: 18px;
		color: var(--gray);
		max-width: 680px;
		margin-top: 22px;
	}
	br.q {
		display: none;
	}
	@container refs (min-width: 900px) {
		br.q {
			display: initial;
		}
	}

	/* busca */
	.busca {
		position: relative;
		margin-top: 34px;
		max-width: 560px;
	}
	.busca input {
		width: 100%;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 999px;
		color: var(--white);
		font: 500 16px 'Hanken Grotesk', sans-serif;
		padding: 16px 108px 16px 50px;
		transition:
			border-color 0.3s var(--curva),
			background 0.3s var(--curva);
	}
	.busca input::placeholder {
		color: var(--gray);
	}
	.busca input:focus {
		outline: none;
		border-color: var(--gold);
		background: var(--card2);
	}
	.busca input::-webkit-search-cancel-button {
		display: none;
	}
	.busca__lupa {
		position: absolute;
		left: 18px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--gray2);
		width: 18px;
		height: 18px;
	}
	.busca input:focus ~ .busca__lupa {
		color: var(--gold);
	}
	.busca__atalho {
		position: absolute;
		right: 16px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--gray2);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.busca__atalho kbd {
		font: inherit;
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 2px 8px;
		background: var(--bg);
	}
	.busca__saldo {
		margin-top: 12px;
		font-size: 14px;
		color: var(--gray);
		font-weight: 500;
		min-height: 20px;
	}
	.busca__saldo b {
		color: var(--gold);
	}

	/* faixa (chips) — só quando o trilho não cabe */
	.faixa {
		position: sticky;
		top: var(--ds-topbar-full);
		z-index: 20;
		display: none;
		background: rgba(11, 10, 8, 0.9);
		backdrop-filter: blur(14px);
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		padding: 12px var(--margem);
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
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 8px 14px;
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		color: var(--white);
		transition:
			border-color 0.3s var(--curva),
			background 0.3s var(--curva),
			color 0.3s var(--curva);
	}
	.chip .ico {
		width: 16px;
		height: 16px;
		color: var(--gold-dim);
	}
	.chip i {
		font-style: normal;
		font-size: 12px;
		color: var(--gray2);
	}
	.chip[data-ativo] {
		background: var(--gold);
		border-color: var(--gold);
		color: var(--bg);
	}
	.chip[data-ativo] .ico,
	.chip[data-ativo] i {
		color: rgba(11, 10, 8, 0.65);
	}

	/* corpo */
	.corpo {
		display: grid;
		grid-template-columns: var(--rail) minmax(0, 1fr);
		gap: 56px;
		padding: 0 var(--margem) 96px;
	}
	.rail {
		position: sticky;
		top: var(--topo);
		align-self: start;
		max-height: calc(100vh - var(--topo) - 32px);
		overflow-y: auto;
		scrollbar-width: none;
	}
	.rail::-webkit-scrollbar {
		display: none;
	}
	.rail__titulo {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-weight: 600;
		font-size: 10.5px;
		letter-spacing: 0.16em;
		color: var(--gray2);
		padding: 0 14px 12px;
	}
	.rail__item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 8px;
		text-decoration: none;
		color: var(--gray);
		font-size: 14px;
		font-weight: 500;
		transition:
			color 0.25s var(--curva),
			background 0.25s var(--curva);
	}
	.rail__ico {
		width: 18px;
		height: 18px;
		flex: none;
		opacity: 0.6;
		transition:
			opacity 0.25s var(--curva),
			transform 0.3s var(--curva);
	}
	.rail__nome {
		flex: 1;
		min-width: 0;
		line-height: 1.3;
	}
	.rail__n {
		font-size: 12px;
		font-weight: 700;
		color: var(--gray2);
		align-self: center;
	}
	.rail__item:hover {
		color: var(--white);
		background: var(--card);
	}
	.rail__item:hover .rail__ico {
		opacity: 1;
		transform: translateX(2px);
	}
	.rail__item[data-ativo] {
		color: var(--gold-light);
		background: var(--card);
	}
	.rail__item[data-ativo] .rail__ico {
		opacity: 1;
	}
	.rail__item[data-ativo] .rail__n {
		color: var(--gold);
	}
	.rail__item[data-ativo]::before {
		content: '';
		position: absolute;
		left: 0;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background: var(--gold);
		border-radius: 2px;
	}
	.rail__item[data-fora],
	.chip[data-fora] {
		opacity: 0.26;
		pointer-events: none;
	}

	/* blocos */
	.miolo {
		min-width: 0;
	}
	.bloco {
		padding: 64px 0;
		border-bottom: 1px solid var(--line);
		scroll-margin-top: var(--topo);
	}
	.bloco:first-child {
		padding-top: 40px;
	}
	.bloco:last-of-type {
		border-bottom: 0;
		padding-bottom: 40px;
	}
	.bloco[hidden] {
		display: none;
	}
	.bloco__marca {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--gold);
	}
	.bloco__ico {
		width: 20px;
		height: 20px;
	}
	.bloco__num {
		font-family: 'Bebas Neue', Impact, sans-serif;
		font-size: 16px;
		letter-spacing: 0.16em;
	}
	.bloco__num em {
		font-style: normal;
		color: var(--gray2);
		margin-left: 4px;
	}
	.bloco__titulo {
		font-size: clamp(30px, 3.8cqw, 44px);
		line-height: 1;
		letter-spacing: 0.01em;
		margin: 14px 0 12px;
		text-wrap: balance;
		color: var(--white);
	}
	.bloco__desc {
		font-size: 16px;
		color: var(--gray);
		max-width: 620px;
	}
	.bloco__cont {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--gray2);
		margin-top: 16px;
	}
	.bloco__cont b {
		color: var(--gold-pale);
	}

	/* tags */
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 26px;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--raio);
		padding: 10px 14px;
		text-decoration: none;
		transition:
			border-color 0.3s var(--curva),
			background 0.3s var(--curva),
			transform 0.3s var(--curva),
			color 0.3s var(--curva);
	}
	.tag[hidden] {
		display: none;
	}
	.tag__logo {
		width: 22px;
		height: 22px;
		border-radius: 5px;
		flex: none;
		object-fit: contain;
		background: #fff;
		padding: 2px;
	}
	.tag__logo--letra {
		display: grid;
		place-items: center;
		background: var(--card2);
		color: var(--gold-dim);
		font-size: 12px;
		font-weight: 700;
		padding: 0;
	}
	.tag__nome {
		font-size: 14px;
		font-weight: 700;
	}
	.tag__host {
		font-size: 12px;
		color: var(--gray);
		transition: color 0.3s var(--curva);
	}
	.tag__seta {
		width: 12px;
		height: 12px;
		opacity: 0;
		transform: translate(-4px, 4px);
		transition:
			opacity 0.3s var(--curva),
			transform 0.3s var(--curva);
	}
	.tag:hover {
		border-color: var(--gold);
		background: var(--gold);
		color: var(--bg);
		transform: translateY(-3px);
	}
	.tag:hover .tag__host {
		color: rgba(11, 10, 8, 0.6);
	}
	.tag:hover .tag__logo--letra {
		background: rgba(11, 10, 8, 0.14);
		color: var(--bg);
	}
	.tag:hover .tag__seta {
		opacity: 1;
		transform: translate(0, 0);
	}
	.tag:focus-visible,
	.chip:focus-visible,
	.rail__item:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 3px;
	}

	.vazio-msg {
		padding: 80px 0;
		color: var(--gray);
		font-size: 16px;
		display: none;
	}
	.vazio-msg b {
		color: var(--gold-pale);
	}
	.refs.vazio .vazio-msg {
		display: block;
	}

	/* entrada */
	[data-revela] > * {
		opacity: 0;
		transform: translateY(16px);
	}
	[data-revela]:global(.visivel) > * {
		opacity: 1;
		transform: none;
		transition:
			opacity 0.7s var(--curva),
			transform 0.7s var(--curva);
	}
	.bloco__topo > *:nth-child(1) {
		transition-delay: 0.02s;
	}
	.bloco__topo > *:nth-child(2) {
		transition-delay: 0.08s;
	}
	.bloco__topo > *:nth-child(3) {
		transition-delay: 0.14s;
	}
	.bloco__topo > *:nth-child(4) {
		transition-delay: 0.2s;
	}
	.tags:global(.visivel) > .tag {
		transition-delay: calc(var(--i) * 0.026s);
	}
	.sobe {
		opacity: 0;
		transform: translateY(20px);
		animation: sobe 0.9s var(--curva) forwards;
	}
	.d1 {
		animation-delay: 0.06s;
	}
	.d2 {
		animation-delay: 0.14s;
	}
	.d3 {
		animation-delay: 0.22s;
	}
	@keyframes sobe {
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.refs *,
		.refs *::before,
		.refs *::after {
			animation: none !important;
			transition: none !important;
		}
		[data-revela] > *,
		.sobe {
			opacity: 1 !important;
			transform: none !important;
		}
	}

	/* responsivo — pela largura do painel, que já desconta sidebar e recuos do app */
	@container refs (max-width: 1000px) {
		.refs {
			--rail: 232px;
		}
		.corpo {
			gap: 40px;
		}
	}
	@container refs (max-width: 760px) {
		.corpo {
			grid-template-columns: minmax(0, 1fr);
			padding-bottom: 72px;
		}
		.rail {
			display: none;
		}
		.faixa {
			display: block;
		}
		.capa {
			padding-top: 96px;
			padding-bottom: 40px;
		}
		.capa__crest {
			width: 300px;
			opacity: 0.03;
		}
		.bloco {
			padding: 52px 0;
		}
		.bloco:first-child {
			padding-top: 44px;
		}
	}
	@container refs (max-width: 520px) {
		.capa {
			padding-top: 88px;
		}
		.capa h1 {
			max-width: none;
		}
		.marca {
			top: 26px;
		}
		.marca__z {
			font-size: 24px;
		}
		.marca__nome {
			font-size: 16px;
		}
		.busca input {
			padding: 14px 18px 14px 46px;
			font-size: 16px;
		}
		.busca__atalho {
			display: none;
		}
		.tags {
			gap: 8px;
		}
		.tag {
			padding: 9px 12px;
		}
		.tag__host {
			display: none;
		}
	}
</style>
