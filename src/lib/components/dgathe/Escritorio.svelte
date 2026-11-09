<script lang="ts">
	// O escritório do DGathe: o canvas do jogo e o que fica por cima dele (barra
	// de recursos, painel do que está selecionado, minimapa, ajuda e avisos).
	// Quem desenha e controla o mapa é o motor em $lib/dgathe/jogo.ts.
	import { onMount, untrack } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { Jogo, type Selecao, type OutroResumo } from '$lib/dgathe/jogo';
	import { Online, type EstadoConexao } from '$lib/dgathe/online';
	import { lerAparencia, type Aparencia } from '$lib/dgathe/aparencia';
	import { SALA_POR_ID, SETORES } from '$lib/dgathe/mapa';
	import {
		Crown,
		Presentation,
		Wallet,
		Handshake,
		Cpu,
		Megaphone,
		Clapperboard,
		DoorOpen,
		Palette,
		TrendingUp,
		Coffee,
		Footprints,
		Maximize2,
		Minimize2,
		Crosshair,
		CircleQuestionMark,
		Plus,
		Minus,
		Tags,
		MapPin,
		Users,
		Bot,
		Hammer,
		X,
		ChevronDown,
		ChevronUp,
		Navigation,
		MousePointerClick
	} from '@lucide/svelte';

	let {
		nome,
		cargo,
		foto = null,
		cor = null,
		aparencia = null,
		id = null,
		supabase = null,
		canalDeTeste = undefined
	}: {
		nome: string;
		cargo: string;
		foto?: string | null;
		cor?: string | null;
		/** Meu bonequinho, como ficou salvo no Meu Perfil. Sem ele, o padrão na cor de tema. */
		aparencia?: Aparencia | null;
		/** Quem sou no tempo real (id do colaborador). Sem id ou sem supabase, o jogo fica só local. */
		id?: string | null;
		supabase?: SupabaseClient | null;
		/** Canal público de teste (só na prévia local, sem login). Em produção fica vazio. */
		canalDeTeste?: string;
	} = $props();

	const primeiroNome = (n: string) => n.split(/\s+/)[0] || n;
	const iniciaisDe = (n: string) =>
		n
			.split(/\s+/)
			.map((p) => p[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();

	const ICONES = {
		diretoria: Crown,
		reuniao: Presentation,
		financeiro: Wallet,
		comercial: Handshake,
		dev: Cpu,
		conteudo: Megaphone,
		estudio: Clapperboard,
		recepcao: DoorOpen,
		design: Palette,
		trafego: TrendingUp,
		copa: Coffee,
		corredor: Footprints
	} as const;
	const iconeDa = (id: string) => ICONES[id as keyof typeof ICONES] ?? MapPin;

	let raiz: HTMLDivElement;
	let tela: HTMLCanvasElement;
	let mini: HTMLCanvasElement;
	let jogo: Jogo | null = null;
	let online: Online | null = null;

	let selecao = $state<Selecao>({ tipo: 'avatar' });
	let local = $state<string | null>(null);
	let andando = $state(false);
	let destino = $state<string | null>(null);
	let aviso = $state<string | null>(null);
	let ajuda = $state(false);
	let nomes = $state(true);
	let cheia = $state(false);
	let falhou = $state(false);
	/** Painel recolhido: só o cabeçalho, para sobrar mapa (no celular, principalmente). */
	let recolhido = $state(false);
	/** Quem mais está no escritório agora. */
	let outros = $state<OutroResumo[]>([]);
	let conexao = $state<EstadoConexao | 'sozinho'>('sozinho');

	const salaSelecionada = $derived(selecao.tipo === 'sala' ? (SALA_POR_ID.get(selecao.id) ?? null) : null);
	const pessoaSelecionada = $derived.by(() => {
		const s = selecao;
		return s.tipo === 'pessoa' ? (outros.find((o) => o.id === s.id) ?? null) : null;
	});
	const tituloPessoas = $derived.by(() => {
		const nomes = [`${nome} (você)`, ...outros.map((o) => o.nome)].join(', ');
		if (conexao === 'conectando') return `Conectando… ${nomes}`;
		if (conexao === 'offline') return 'Sem conexão em tempo real: só você aparece aqui agora';
		return `No escritório: ${nomes}`;
	});
	const nomeLocal = $derived(local ? (SALA_POR_ID.get(local)?.nome ?? 'Lado de fora') : 'Lado de fora');
	const iniciais = $derived(iniciaisDe(nome));
	const status = $derived.by(() => {
		if (andando) return destino ? `Indo para ${SALA_POR_ID.get(destino)?.nome ?? 'o destino'}` : 'Andando';
		return local ? `Em ${nomeLocal}` : 'Do lado de fora';
	});

	let timerAviso: ReturnType<typeof setTimeout> | undefined;
	function avisar(texto: string, ms = 2400) {
		aviso = texto;
		clearTimeout(timerAviso);
		timerAviso = setTimeout(() => (aviso = null), ms);
	}

	const CHAVE_AJUDA = 'dgathe:ajuda-vista';
	// Lida uma vez, na montagem: trocar de aparência é no Meu Perfil, e o DGathe
	// abre de novo com ela.
	const minhaAparencia = untrack(() => aparencia ?? lerAparencia(null, cor));

	onMount(() => {
		let primeiraSala = true;
		let jaSincronizou = false;
		try {
			jogo = new Jogo(
				tela,
				mini,
				{
					selecao: (s) => {
						selecao = s;
						if (s.tipo === 'sala') recolhido = false;
					},
					local: (id) => {
						local = id;
						if (primeiraSala) {
							primeiraSala = false;
							return;
						}
						if (id && id !== 'corredor') avisar(`Você entrou em ${SALA_POR_ID.get(id)?.nome ?? id}`);
					},
					movimento: (anda, para) => {
						andando = anda;
						destino = para;
					},
					aviso: (t) => avisar(t),
					rota: (pontos) => online?.andar(pontos),
					parou: (x, y, dx, dy) => online?.parou(x, y, dx, dy),
					outros: (lista) => {
						if (jaSincronizou) {
							const antes = new Set(outros.map((o) => o.id));
							const depois = new Set(lista.map((o) => o.id));
							for (const o of lista) if (!antes.has(o.id)) avisar(`${primeiroNome(o.nome)} entrou no escritório`);
							for (const o of outros) if (!depois.has(o.id)) avisar(`${primeiroNome(o.nome)} saiu do escritório`);
						}
						jaSincronizou = true;
						outros = lista;
					}
				},
				{ nome: nome.split(/\s+/)[0] || nome, cargo, aparencia: minhaAparencia }
			);
		} catch {
			falhou = true;
		}
		const conectar = () => {
			if (!jogo || !supabase || !id || online) return;
			const jg = jogo;
			online = new Online(
				supabase,
				{ id, nome, cargo, foto, cor, aparencia: minhaAparencia, ...jg.posicao() },
				{
					pessoas: (lista) => jg.definirPessoas(lista),
					rota: (quem, pontos) => jg.rotaDe(quem, pontos),
					estado: (e) => (conexao = e)
				},
				{ canalDeTeste }
			);
			void online.entrar();
		};
		conectar();
		try {
			if (!localStorage.getItem(CHAVE_AJUDA)) ajuda = true;
		} catch {
			ajuda = true;
		}
		const mudouTelaCheia = () => (cheia = document.fullscreenElement === raiz);
		document.addEventListener('fullscreenchange', mudouTelaCheia);
		// Fechar a aba não desmonta o componente: sem isto os outros só veriam a
		// saída quando o servidor desistisse da conexão. Se o navegador só congelou
		// a aba (voltar/avançar), ao restaurar ela entra de novo.
		const fechouAba = () => {
			online?.sair();
			online = null;
		};
		const voltouAba = (e: PageTransitionEvent) => {
			if (e.persisted) conectar();
		};
		// beforeunload chega antes, com a página inteira; pagehide cobre o celular,
		// onde o beforeunload às vezes nem dispara.
		window.addEventListener('beforeunload', fechouAba);
		window.addEventListener('pagehide', fechouAba);
		window.addEventListener('pageshow', voltouAba);
		tela.focus({ preventScroll: true });
		return () => {
			document.removeEventListener('fullscreenchange', mudouTelaCheia);
			window.removeEventListener('beforeunload', fechouAba);
			window.removeEventListener('pagehide', fechouAba);
			window.removeEventListener('pageshow', voltouAba);
			clearTimeout(timerAviso);
			online?.sair();
			jogo?.destruir();
		};
	});

	function fecharAjuda() {
		ajuda = false;
		try {
			localStorage.setItem(CHAVE_AJUDA, '1');
		} catch {
			// Sem armazenamento: a ajuda só volta a aparecer na próxima visita.
		}
		tela.focus({ preventScroll: true });
	}

	async function alternarTelaCheia() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await raiz.requestFullscreen();
		} catch {
			avisar('O navegador não liberou a tela cheia');
		}
		tela.focus({ preventScroll: true });
	}

	function irPara(sala: string) {
		jogo?.irPara(sala);
		tela.focus({ preventScroll: true });
	}

	function irAte(pessoa: string) {
		jogo?.irAte(pessoa);
		tela.focus({ preventScroll: true });
	}
</script>

<div class="dg" bind:this={raiz} class:cheia>
	<canvas
		bind:this={tela}
		class="dg-tela"
		tabindex="0"
		aria-label="Mapa do escritório da Dunamis. Botão direito anda, botão esquerdo seleciona."
	></canvas>

	{#if falhou}
		<div class="dg-falha">Este navegador não conseguiu abrir o mapa. Tente pelo Chrome, Safari ou Edge atualizados.</div>
	{/if}

	<!-- Barra de recursos, no topo -->
	<header class="dg-topo">
		<div class="dg-marca">
			<span class="dg-selo">DG</span>
			<span class="dg-marca-txt"><strong>DGathe</strong><small>Escritório Dunamis</small></span>
		</div>
		<div class="dg-recursos">
			<span title="Setores do escritório"><MapPin size={14} /><b>{SETORES.length}</b><em>setores</em></span>
			<span title={tituloPessoas}>
				<Users size={14} /><b>{1 + outros.length}</b><em>{outros.length ? 'online' : 'pessoa'}</em>
				{#if conexao !== 'sozinho'}<i class="dg-sinal {conexao}" aria-hidden="true"></i>{/if}
			</span>
			<span title="Agentes trabalhando (próxima fase)"><Bot size={14} /><b>0</b><em>agentes</em></span>
			<span title="Tarefas em andamento (próxima fase)"><Hammer size={14} /><b>0</b><em>em andamento</em></span>
		</div>
		<div class="dg-acoes">
			<span class="dg-local" title="Onde você está"><Navigation size={13} />{nomeLocal}</span>
			<button type="button" onclick={() => (jogo?.centralizar(), tela.focus())} title="Voltar a câmera para você (Espaço)" aria-label="Centralizar no avatar"><Crosshair size={16} /></button>
			<button type="button" class:ativo={nomes} onclick={() => (nomes = jogo?.alternarNomes() ?? nomes)} title="Nomes das salas (N)" aria-label="Mostrar ou esconder nomes das salas"><Tags size={16} /></button>
			<button type="button" onclick={() => jogo?.zoomEm(1 / 1.2)} title="Afastar (-)" aria-label="Afastar"><Minus size={16} /></button>
			<button type="button" onclick={() => jogo?.zoomEm(1.2)} title="Aproximar (+)" aria-label="Aproximar"><Plus size={16} /></button>
			<button type="button" onclick={() => (ajuda = true)} title="Controles" aria-label="Ver os controles"><CircleQuestionMark size={16} /></button>
			<button type="button" onclick={alternarTelaCheia} title="Tela cheia" aria-label="Tela cheia">
				{#if cheia}<Minimize2 size={16} />{:else}<Maximize2 size={16} />{/if}
			</button>
		</div>
	</header>

	{#if aviso}
		<div class="dg-aviso" role="status">{aviso}</div>
	{/if}

	<!-- Painel do que está selecionado -->
	<section class="dg-painel" aria-live="polite">
		{#if salaSelecionada}
			{@const Ico = iconeDa(salaSelecionada.id)}
			{@const aqui = local === salaSelecionada.id}
			{@const gente = outros.filter((o) => o.sala === salaSelecionada.id)}
			<header class="dg-cab">
				<span class="dg-ico" style="--cor: {salaSelecionada.cor}"><Ico size={20} /></span>
				<span class="dg-tit">
					<strong>{salaSelecionada.nome}</strong>
					<small>{salaSelecionada.setor}</small>
				</span>
				<button type="button" class="dg-fechar" onclick={() => (recolhido = !recolhido)} aria-label={recolhido ? 'Abrir o painel' : 'Recolher o painel'} title={recolhido ? 'Abrir o painel' : 'Recolher o painel'}>
					{#if recolhido}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
				</button>
				<button type="button" class="dg-fechar" onclick={() => jogo?.selecionar({ tipo: 'avatar' })} aria-label="Fechar"><X size={16} /></button>
			</header>
			{#if !recolhido}
			<p class="dg-desc">{salaSelecionada.descricao}</p>
			{#if selecao.tipo === 'sala' && selecao.objeto}
				<p class="dg-objeto"><MousePointerClick size={13} />{selecao.objeto}</p>
			{/if}
			<div class="dg-blocos">
				<div>
					<h4>Na sala agora</h4>
					{#if aqui}<p class="dg-pessoa"><span style="--cor: #ffd58a"></span>{primeiroNome(nome)} (você)</p>{/if}
					{#each gente as o (o.id)}
						<button type="button" class="dg-pessoa dg-pessoa-btn" onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })}>
							<span style="--cor: {o.cor ?? '#9aa6ba'}"></span>{o.nome} · {o.cargo}
						</button>
					{/each}
					{#if !aqui && !gente.length}<p class="dg-vazio">Ninguém por aqui</p>{/if}
				</div>
				<div>
					<h4>Em andamento</h4>
					<p class="dg-vazio">Sem tarefas ainda</p>
				</div>
				<div>
					<h4>Concluído</h4>
					<p class="dg-vazio">As entregas dos agentes aparecem aqui</p>
				</div>
			</div>
			{#if salaSelecionada.especialidades.length}
				<div class="dg-esp">
					<h4>Agentes previstos <span>próxima fase</span></h4>
					<div class="dg-chips">
						{#each salaSelecionada.especialidades as e (e)}<span>{e}</span>{/each}
					</div>
				</div>
			{/if}
			<button type="button" class="dg-ir" disabled={aqui} onclick={() => irPara(salaSelecionada.id)}>
				{aqui ? 'Você está aqui' : 'Ir até a sala'}
			</button>
			{/if}
		{:else if pessoaSelecionada}
			{@const p = pessoaSelecionada}
			<header class="dg-cab">
				<span class="dg-retrato" style="border-color: {p.cor ?? '#9aa6ba'}">
					{#if p.foto}<img src={p.foto} alt="" />{:else}{iniciaisDe(p.nome)}{/if}
				</span>
				<span class="dg-tit">
					<strong>{p.nome}</strong>
					<small>{p.cargo}</small>
				</span>
				<button type="button" class="dg-fechar" onclick={() => jogo?.selecionar({ tipo: 'avatar' })} aria-label="Fechar"><X size={16} /></button>
			</header>
			<p class="dg-status" class:andando={p.andando}>
				{p.andando ? 'Andando' : p.sala ? `Em ${SALA_POR_ID.get(p.sala)?.nome ?? p.sala}` : 'Do lado de fora'}
			</p>
			<p class="dg-online"><span></span>Online agora</p>
			<button type="button" class="dg-ir" onclick={() => irAte(p.id)}>Ir até {primeiroNome(p.nome)}</button>
		{:else}
			<header class="dg-cab">
				<span class="dg-retrato">
					{#if foto}<img src={foto} alt="" />{:else}{iniciais}{/if}
				</span>
				<span class="dg-tit">
					<strong>{nome}</strong>
					<small><Crown size={11} />{cargo}</small>
				</span>
				<button type="button" class="dg-fechar" onclick={() => (recolhido = !recolhido)} aria-label={recolhido ? 'Abrir o painel' : 'Recolher o painel'} title={recolhido ? 'Abrir o painel' : 'Recolher o painel'}>
					{#if recolhido}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
				</button>
			</header>
			<p class="dg-status" class:andando>{status}</p>
			{#if !recolhido}
			{#if outros.length}
				<h4 class="dg-rotulo">Online agora</h4>
				<div class="dg-atalhos">
					{#each outros as o (o.id)}
						<button type="button" onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })} title="Ver {o.nome}">
							<span style="--cor: {o.cor ?? '#9aa6ba'}"></span>{primeiroNome(o.nome)}
						</button>
					{/each}
				</div>
			{/if}
			<h4 class="dg-rotulo">Ir para</h4>
			<div class="dg-atalhos">
				{#each SETORES as s (s.id)}
					<button type="button" onclick={() => irPara(s.id)} disabled={local === s.id} title={s.descricao}>
						<span style="--cor: {s.cor}"></span>{s.nome}
					</button>
				{/each}
			</div>
			{/if}
		{/if}
	</section>

	<!-- Minimapa -->
	<div class="dg-mini">
		<canvas bind:this={mini} aria-label="Minimapa: clique para levar a câmera, botão direito para andar"></canvas>
	</div>

	{#if ajuda}
		<div class="dg-ajuda" role="dialog" aria-modal="true" aria-label="Controles do DGathe">
			<div class="dg-ajuda-caixa">
				<h3>Bem-vindo ao DGathe</h3>
				<p>O escritório da Dunamis em forma de jogo. Quem estiver no DGathe aparece aqui junto com você, em tempo real; os agentes chegam na próxima fase.</p>
				<ul>
					<li><kbd>Botão direito</kbd><span>anda até o ponto</span></li>
					<li><kbd>Botão esquerdo</kbd><span>seleciona sala, objeto ou pessoa</span></li>
					<li><kbd>Arrastar</kbd><span>move a câmera</span></li>
					<li><kbd>Roda do mouse</kbd><span>aproxima e afasta</span></li>
					<li><kbd>WASD</kbd><kbd>Setas</kbd><span>movem a câmera</span></li>
					<li><kbd>Espaço</kbd><span>volta a câmera para você</span></li>
					<li><kbd>N</kbd><span>mostra ou esconde os nomes das salas</span></li>
					<li><kbd>Toque</kbd><span>no celular: toque no chão para andar</span></li>
				</ul>
				<button type="button" onclick={fecharAjuda}>Entrar no escritório</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.dg {
		--dg-painel: rgba(12, 18, 31, 0.86);
		--dg-borda: rgba(255, 255, 255, 0.09);
		--dg-texto: #eef2f8;
		--dg-suave: #9aa6ba;
		--dg-ouro: #f5a524;
		position: relative;
		/* Topo da sidebar (0.75rem) + legenda embaixo (~1.4rem) + respiro (1rem). */
		height: calc(100dvh - var(--ds-topbar-space, 72px) - 3.25rem);
		min-height: 520px;
		border-radius: 20px;
		overflow: hidden;
		background: #18261d;
		box-shadow: 0 18px 40px -16px rgba(16, 24, 40, 0.35);
		color: var(--dg-texto);
		user-select: none;
		-webkit-user-select: none;
	}
	.dg.cheia {
		height: 100vh;
		border-radius: 0;
	}
	.dg-tela {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		outline: none;
		touch-action: none;
	}
	.dg-falha {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 2rem;
		text-align: center;
	}

	/* Barra do topo */
	.dg-topo {
		position: absolute;
		inset: 0 0 auto 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		height: 46px;
		padding: 0 0.6rem 0 0.75rem;
		background: linear-gradient(180deg, rgba(10, 15, 26, 0.92), rgba(10, 15, 26, 0.78));
		border-bottom: 1px solid var(--dg-borda);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.dg-marca {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	.dg-selo {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: linear-gradient(135deg, #ffb547, #ff6f00);
		color: #1c2534;
		font-weight: 900;
		font-size: 12px;
		letter-spacing: -0.02em;
	}
	.dg-marca-txt {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}
	.dg-marca-txt strong {
		font-size: 14px;
	}
	.dg-marca-txt small {
		font-size: 10.5px;
		color: var(--dg-suave);
	}
	.dg-recursos {
		display: flex;
		gap: 0.35rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}
	.dg-recursos span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.22rem 0.55rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--dg-borda);
		font-size: 12px;
		white-space: nowrap;
		color: var(--dg-suave);
	}
	.dg-recursos b {
		color: var(--dg-ouro);
		font-variant-numeric: tabular-nums;
	}
	.dg-recursos em {
		font-style: normal;
	}
	.dg-sinal {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #7f8aa0;
	}
	.dg-sinal.online {
		background: #17b26a;
		box-shadow: 0 0 0 3px rgba(23, 178, 106, 0.2);
	}
	.dg-sinal.conectando {
		background: var(--dg-ouro);
		animation: dg-pisca 1s ease-in-out infinite alternate;
	}
	@keyframes dg-pisca {
		to {
			opacity: 0.3;
		}
	}
	.dg-acoes {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.dg-local {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-right: 0.35rem;
		font-size: 12px;
		font-weight: 600;
		color: #ffd58a;
		white-space: nowrap;
	}
	.dg-acoes button {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 9px;
		color: var(--dg-texto);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid transparent;
		transition: background 0.15s, border-color 0.15s;
	}
	.dg-acoes button:hover {
		background: rgba(255, 255, 255, 0.12);
	}
	.dg-acoes button.ativo {
		border-color: rgba(245, 165, 36, 0.5);
		color: #ffd58a;
	}
	.dg-acoes button:focus-visible,
	.dg-painel button:focus-visible,
	.dg-ajuda button:focus-visible {
		outline: 2px solid var(--dg-ouro);
		outline-offset: 2px;
	}

	/* Aviso */
	.dg-aviso {
		position: absolute;
		top: 58px;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.45rem 0.95rem;
		border-radius: 999px;
		background: rgba(245, 165, 36, 0.96);
		color: #1c2534;
		font-size: 13px;
		font-weight: 700;
		box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.5);
		animation: dg-entra 0.2s ease-out;
		pointer-events: none;
	}
	@keyframes dg-entra {
		from {
			opacity: 0;
			transform: translate(-50%, -6px);
		}
	}

	/* Painel de seleção */
	.dg-painel {
		position: absolute;
		left: 12px;
		bottom: 12px;
		width: min(340px, calc(100% - 24px));
		max-height: calc(100% - 70px);
		overflow-y: auto;
		padding: 0.85rem;
		border-radius: 16px;
		background: var(--dg-painel);
		border: 1px solid var(--dg-borda);
		box-shadow: 0 16px 34px -14px rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		user-select: text;
		-webkit-user-select: text;
	}
	.dg-cab {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.dg-ico {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border-radius: 11px;
		color: #fff;
		background: var(--cor);
		box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18);
	}
	.dg-retrato {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		border-radius: 12px;
		overflow: hidden;
		background: #1c2534;
		border: 2px solid var(--dg-ouro);
		font-weight: 800;
		color: #ffd58a;
	}
	.dg-retrato img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.dg-tit {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.dg-tit strong {
		font-size: 15px;
		line-height: 1.2;
	}
	.dg-tit small {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 12px;
		color: var(--dg-suave);
	}
	.dg-fechar {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		color: var(--dg-suave);
	}
	.dg-fechar:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--dg-texto);
	}
	.dg-desc {
		margin: 0.6rem 0 0;
		font-size: 13px;
		line-height: 1.45;
		color: #c9d1de;
	}
	.dg-objeto {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.55rem 0 0;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		background: rgba(245, 165, 36, 0.14);
		color: #ffd58a;
		font-size: 12px;
		font-weight: 600;
	}
	.dg-blocos {
		display: grid;
		gap: 0.4rem;
		margin-top: 0.7rem;
	}
	.dg-blocos > div {
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--dg-borda);
	}
	h4 {
		margin: 0;
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--dg-suave);
	}
	.dg-vazio {
		margin: 0.2rem 0 0;
		font-size: 12.5px;
		color: #7f8aa0;
	}
	.dg-pessoa {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.2rem 0 0;
		font-size: 13px;
		font-weight: 600;
	}
	.dg-pessoa span,
	.dg-atalhos span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--cor);
		flex-shrink: 0;
	}
	.dg-pessoa-btn {
		width: 100%;
		padding: 0.15rem 0.3rem;
		margin-left: -0.3rem;
		border-radius: 7px;
		text-align: left;
		color: var(--dg-texto);
	}
	.dg-pessoa-btn:hover {
		background: rgba(255, 255, 255, 0.07);
	}
	.dg-online {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.35rem 0 0;
		font-size: 12px;
		color: #7fdcb0;
	}
	.dg-online span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #17b26a;
	}
	.dg-esp {
		margin-top: 0.7rem;
	}
	.dg-esp h4 span {
		margin-left: 0.3rem;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: rgba(245, 165, 36, 0.16);
		color: #ffd58a;
		letter-spacing: 0.02em;
		text-transform: none;
	}
	.dg-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.4rem;
	}
	.dg-chips span {
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		border: 1px dashed rgba(255, 255, 255, 0.22);
		font-size: 12px;
		color: #c9d1de;
	}
	.dg-ir {
		width: 100%;
		margin-top: 0.8rem;
		padding: 0.55rem;
		border-radius: 10px;
		background: var(--dg-ouro);
		color: #1c2534;
		font-weight: 800;
		font-size: 13px;
	}
	.dg-ir:hover:not(:disabled) {
		background: #ffb547;
	}
	.dg-ir:disabled {
		background: rgba(255, 255, 255, 0.08);
		color: var(--dg-suave);
		cursor: default;
	}
	.dg-status {
		margin: 0.6rem 0 0;
		font-size: 13px;
		color: #c9d1de;
	}
	.dg-status.andando {
		color: #ffd58a;
	}
	.dg-rotulo {
		margin-top: 0.75rem;
	}
	.dg-atalhos {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.3rem;
		margin-top: 0.4rem;
	}
	.dg-atalhos button {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.5rem;
		border-radius: 9px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--dg-borda);
		font-size: 12px;
		text-align: left;
		color: var(--dg-texto);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dg-atalhos button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.11);
	}
	.dg-atalhos button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	/* Minimapa */
	.dg-mini {
		position: absolute;
		right: 12px;
		bottom: 12px;
		width: 250px;
		height: 140px;
		padding: 4px;
		border-radius: 16px;
		background: var(--dg-painel);
		border: 1px solid var(--dg-borda);
		box-shadow: 0 16px 34px -14px rgba(0, 0, 0, 0.6);
	}
	.dg-mini canvas {
		width: 100%;
		height: 100%;
		display: block;
		cursor: crosshair;
		touch-action: none;
	}

	/* Ajuda */
	.dg-ajuda {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(8, 12, 20, 0.55);
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
	}
	.dg-ajuda-caixa {
		width: min(440px, 100%);
		padding: 1.25rem;
		border-radius: 18px;
		background: #111a2b;
		border: 1px solid rgba(245, 165, 36, 0.35);
		box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.7);
	}
	.dg-ajuda h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 800;
		color: #ffd58a;
	}
	.dg-ajuda p {
		margin: 0.4rem 0 0.8rem;
		font-size: 13px;
		line-height: 1.5;
		color: #c9d1de;
	}
	.dg-ajuda ul {
		display: grid;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.dg-ajuda li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 13px;
	}
	.dg-ajuda li span {
		margin-left: 0.3rem;
		color: #c9d1de;
	}
	kbd {
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-bottom-width: 2px;
		font-family: inherit;
		font-size: 12px;
		font-weight: 700;
		white-space: nowrap;
	}
	.dg-ajuda button {
		width: 100%;
		margin-top: 1rem;
		padding: 0.6rem;
		border-radius: 10px;
		background: var(--dg-ouro);
		color: #1c2534;
		font-weight: 800;
	}

	@media (max-width: 900px) {
		.dg-recursos em,
		.dg-marca-txt small {
			display: none;
		}
	}
	@media (max-width: 700px) {
		.dg {
			min-height: 460px;
		}
		.dg-recursos,
		.dg-local {
			display: none;
		}
		.dg-topo {
			justify-content: space-between;
		}
		.dg-mini {
			width: 150px;
			height: 86px;
			top: 56px;
			bottom: auto;
		}
		.dg-painel {
			max-height: 46%;
		}
		.dg-atalhos {
			display: flex;
			overflow-x: auto;
			padding-bottom: 0.2rem;
			scrollbar-width: none;
		}
		.dg-atalhos button {
			flex: 0 0 auto;
		}
	}
</style>
