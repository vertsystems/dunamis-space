<script lang="ts">
	// O mapa dos Bandoletes (pedido do Bruno em 10/11/2026), aberto pelo botão
	// do topo do DGathe: cada pedido como uma árvore, quem recebeu à esquerda e a
	// equipe que ele chamou à direita, ligados por linhas, como o mapa de agentes
	// do Claude Code; o gerente que recebeu de um diretor leva a equipe dele
	// embaixo (dois níveis, 11/11/2026). Clique num cartão abre o painel daquele
	// Bandolete já na tarefa. As contas ficam em $lib/dgathe/fluxo.ts; os dados, em dgathe_mapa
	// (migration 0109).
	import { onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { Hand, Network, X } from '@lucide/svelte';
	import type { Agente } from '$lib/dgathe/agentes';
	import {
		COR_DO_NO,
		NOME_DO_NO,
		duracaoAgora,
		duracaoCurta,
		estadoDoNo,
		lerFluxo,
		montarProjetos,
		nomeDoModelo,
		resumoDoMapa,
		tokensCurtos,
		type EstadoDoNo,
		type NoDoFluxo,
		type Projeto
	} from '$lib/dgathe/fluxo';

	let {
		supabase,
		agentes,
		ponteLigada,
		sinal,
		aoVerAgente,
		aoFechar
	}: {
		supabase: SupabaseClient;
		/** Os Bandoletes da leitura do jogo: o rodapé mostra quem está livre. */
		agentes: Agente[];
		ponteLigada: boolean;
		/** Aviso do banco (migration 0104): mudou alguma tarefa, relê. */
		sinal: number;
		aoVerAgente: (id: string, tarefa: string | null) => void;
		aoFechar: () => void;
	} = $props();

	/** As que terminaram há até tantas horas também aparecem, mais apagadas. */
	const HORAS = 12;
	/** Entre uma leitura e outra, no mínimo (o banco avisa a cada passo de cada Bandolete). */
	const FOLGA_MS = 1500;

	let nos = $state<NoDoFluxo[] | null>(null);
	let falhou = $state(false);
	let lidoEm = $state(Date.now());
	let agora = $state(Date.now());
	let caixa: HTMLDivElement | undefined = $state();

	let lendo = false;
	let deNovo = false;
	let ultima = 0;
	let espera: ReturnType<typeof setTimeout> | null = null;

	async function ler() {
		if (lendo) {
			deNovo = true;
			return;
		}
		lendo = true;
		ultima = Date.now();
		try {
			const { data, error } = await supabase.rpc('dgathe_mapa', { p_horas: HORAS });
			const r = error ? null : lerFluxo(data);
			if (r) {
				nos = r;
				lidoEm = Date.now();
				falhou = false;
			} else falhou = true;
		} catch {
			falhou = true;
		} finally {
			lendo = false;
			if (deNovo) {
				deNovo = false;
				pedirLeitura();
			}
		}
	}

	/** Junta os avisos que chegam em rajada numa leitura só. */
	function pedirLeitura() {
		if (espera) return;
		espera = setTimeout(
			() => {
				espera = null;
				void ler();
			},
			Math.max(0, FOLGA_MS - (Date.now() - ultima))
		);
	}

	$effect(() => {
		void sinal;
		untrack(pedirLeitura);
	});

	onMount(() => {
		void ler();
		// Reserva, se o aviso em tempo real cair
		const reserva = setInterval(pedirLeitura, 6000);
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		const tecla = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			e.stopPropagation();
			aoFechar();
		};
		window.addEventListener('keydown', tecla, true);
		caixa?.focus();
		return () => {
			clearInterval(reserva);
			clearInterval(relogio);
			if (espera) clearTimeout(espera);
			window.removeEventListener('keydown', tecla, true);
		};
	});

	const projetos = $derived(nos ? montarProjetos(nos) : { abertos: [], terminados: [] });
	const decorrido = $derived(Math.max(0, (agora - lidoEm) / 1000));
	const livres = $derived(agentes.filter((a) => a.estado === 'livre'));
	const semPonte = $derived(!ponteLigada && !!nos?.some((n) => n.status === 'fila'));

	const primeiroNome = (n: string) => n.split(/\s+/)[0] || n;
	const ABERTOS = ['fila', 'trabalhando', 'esperando', 'aguardando'];

	function deQuem(p: Projeto): string {
		const quem = p.raiz.criadaPor.trim();
		if (quem === 'DGathe') return 'Automático (fechamento da semana)';
		return quem ? `Pedido de ${primeiroNome(quem)}` : 'Pedido';
	}
	function quando(p: Projeto): string {
		if (!p.aberto && p.raiz.terminadaHa !== null) return `terminou há ${duracaoCurta(p.raiz.terminadaHa + decorrido)}`;
		return `há ${duracaoCurta(p.raiz.criadaHa + decorrido)}`;
	}

	function meta(no: NoDoFluxo, raiz: boolean): string {
		const partes: string[] = [];
		const modelo = raiz ? nomeDoModelo(no.modelo) : null;
		if (modelo) partes.push(modelo);
		partes.push(no.status === 'fila' ? 'na fila' : duracaoCurta(duracaoAgora(no, decorrido)));
		if (no.tokens) partes.push(`${tokensCurtos(no.tokens)} tokens${raiz ? ' em contexto' : ''}`);
		else if (no.passos) partes.push(`${no.passos} passo${no.passos > 1 ? 's' : ''}`);
		return partes.join(' · ');
	}

	/** A terceira linha: o que está fazendo agora (ou o erro). Terminado sem erro não tem. */
	function linha(no: NoDoFluxo, e: EstadoDoNo, equipe: NoDoFluxo[] = []): string | null {
		if (e === 'precisa') return no.atividade && no.atividade !== 'Esperando a sua resposta' ? no.atividade : 'Esperando a sua resposta';
		if (e === 'trabalhando') return no.atividade ?? 'Trabalhando';
		if (e === 'aguardando') {
			const abertas = equipe.filter((n) => ABERTOS.includes(n.status)).length;
			return abertas ? `Esperando a equipe: ${abertas} aberta${abertas > 1 ? 's' : ''}` : 'A equipe terminou: já vai revisar';
		}
		if (e === 'fila') return ponteLigada ? 'Começa em instantes' : 'Esperando a ponte do Mac ligar';
		if (e === 'falhou') return no.erro ?? 'Parou com erro';
		return null;
	}

	function dica(no: NoDoFluxo, e: EstadoDoNo): string {
		const partes = [`${no.agenteNome}${no.agenteCargo ? `, ${no.agenteCargo}` : ''}`, NOME_DO_NO[e]];
		if (no.passos) partes.push(`${no.passos} passo${no.passos > 1 ? 's' : ''}`);
		const fim = no.erro ?? no.resumo;
		return `${partes.join(' · ')}${fim ? `\n\n${fim}` : ''}`;
	}

	function abrir(no: NoDoFluxo) {
		aoVerAgente(no.agenteId, no.id);
		aoFechar();
	}
</script>

{#snippet cartao(no: NoDoFluxo, raiz: boolean, equipe: NoDoFluxo[])}
	{@const e = estadoDoNo(no)}
	{@const texto = linha(no, e, equipe)}
	<button type="button" class="fx-no" class:raiz class:fim={!ABERTOS.includes(no.status)} style="--cor: {COR_DO_NO[e]}" onclick={() => abrir(no)} title={dica(no, e)}>
		<span class="fx-ponto" class:pulsa={e === 'trabalhando'} aria-hidden="true"></span>
		<span class="fx-sr">{NOME_DO_NO[e]}:</span>
		<span class="fx-txt">
			<strong><b>{no.agenteNome}</b>: {no.titulo}</strong>
			<small>{meta(no, raiz)}</small>
			{#if texto}
				<em class={e}>{#if e === 'precisa'}<Hand size={11} />{/if}{texto}</em>
			{/if}
		</span>
	</button>
{/snippet}

{#snippet arvore(p: Projeto)}
	<li class="fx-projeto" class:terminado={!p.aberto}>
		<p class="fx-quem">{deQuem(p)} · {quando(p)}</p>
		<div class="fx-galhos" class:sozinho={!p.equipe.length}>
			<div class="fx-raiz">{@render cartao(p.raiz, true, p.equipe.map((r) => r.no))}</div>
			{#if p.equipe.length}
				<ul class="fx-equipe">
					{#each p.equipe as r (r.no.id)}
						<li class="fx-ramo">
							{@render cartao(r.no, false, r.equipe)}
							{#if r.equipe.length}
								<ul class="fx-sub">
									{#each r.equipe as n (n.id)}
										<li class="fx-folha">{@render cartao(n, false, [])}</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</li>
{/snippet}

<div class="fx-fundo" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && aoFechar()} transition:fade={{ duration: 120 }}>
	<div class="fx-caixa" role="dialog" aria-modal="true" aria-labelledby="fx-titulo" tabindex="-1" bind:this={caixa}>
		<header>
			<span class="fx-ico" aria-hidden="true"><Network size={16} /></span>
			<span class="fx-cab">
				<h3 id="fx-titulo">Mapa dos Bandoletes</h3>
				<small>
					{#if nos}{resumoDoMapa(projetos.abertos)}{#if projetos.abertos.length || projetos.terminados.length}{' · clique num Bandolete para ver os detalhes'}{/if}{:else if falhou}Não deu para ler agora; tentando de novo…{:else}Lendo…{/if}
				</small>
			</span>
			<button type="button" class="fx-fechar" onclick={aoFechar} aria-label="Fechar o mapa"><X size={16} /></button>
		</header>

		{#if semPonte}
			<p class="fx-alerta">A ponte do Mac está desligada: as tarefas ficam na fila até ela voltar.</p>
		{/if}

		{#if nos}
			{#if projetos.abertos.length}
				<ul class="fx-lista">
					{#each projetos.abertos as p (p.raiz.id)}{@render arvore(p)}{/each}
				</ul>
			{:else}
				<p class="fx-vazio">Ninguém trabalhando agora. Clique num Bandolete no escritório para passar uma tarefa; o fluxo aparece aqui enquanto ele e a equipe trabalham.</p>
			{/if}

			{#if projetos.terminados.length}
				<h4>Terminados nas últimas {HORAS} horas</h4>
				<ul class="fx-lista">
					{#each projetos.terminados as p (p.raiz.id)}{@render arvore(p)}{/each}
				</ul>
			{/if}
		{/if}

		{#if livres.length}
			<footer>
				<span>Livres agora</span>
				{#each livres as a (a.id)}
					<button type="button" onclick={() => (aoVerAgente(a.id, null), aoFechar())} title="{a.nome}, {a.cargo}">{a.nome}</button>
				{/each}
			</footer>
		{/if}
	</div>
</div>

<style>
	.fx-fundo {
		position: absolute;
		inset: 0;
		z-index: 7;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: 64px 12px 12px;
		background: rgba(5, 9, 16, 0.5);
	}
	.fx-caixa {
		--linha: rgba(255, 255, 255, 0.22);
		width: min(760px, 100%);
		max-height: 100%;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
		padding: 1rem 1.1rem 1.1rem;
		border-radius: 14px;
		background: rgba(14, 19, 30, 0.97);
		border: 1px solid rgba(139, 92, 246, 0.45);
		box-shadow: 0 24px 48px -18px rgba(0, 0, 0, 0.75);
		color: var(--dg-texto, #eef2f8);
		user-select: text;
		-webkit-user-select: text;
		outline: none;
	}
	header {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		margin-bottom: 0.9rem;
	}
	.fx-ico {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border-radius: 9px;
		background: rgba(139, 92, 246, 0.18);
		color: #c4b5fd;
	}
	.fx-cab {
		flex: 1;
		min-width: 0;
	}
	h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.fx-cab small {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.78rem;
		color: var(--dg-suave, #9aa6ba);
	}
	.fx-fechar {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border-radius: 8px;
		color: var(--dg-suave, #9aa6ba);
	}
	.fx-fechar:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--dg-texto, #eef2f8);
	}
	.fx-alerta {
		margin: 0 0 0.8rem;
		padding: 0.5rem 0.7rem;
		border-radius: 9px;
		background: rgba(245, 165, 36, 0.14);
		color: #fcd34d;
		font-size: 0.78rem;
	}
	.fx-vazio {
		margin: 0.2rem 0 0.4rem;
		padding: 1.1rem;
		border-radius: 10px;
		border: 1px dashed rgba(255, 255, 255, 0.14);
		color: var(--dg-suave, #9aa6ba);
		font-size: 0.82rem;
		line-height: 1.5;
		text-align: center;
	}
	h4 {
		margin: 1.1rem 0 0.5rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--dg-suave, #9aa6ba);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.fx-projeto + .fx-projeto {
		margin-top: 0.9rem;
		padding-top: 0.9rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.fx-projeto.terminado {
		opacity: 0.72;
	}
	.fx-quem {
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		color: var(--dg-suave, #9aa6ba);
	}

	/*
	 * A árvore: quem recebeu à esquerda, a equipe à direita, ligados por linhas
	 * na altura do título de cada cartão (--meio). Alinhar pelo título, e não pelo
	 * meio do cartão, deixa as linhas certas quando um gerente leva a equipe dele
	 * embaixo (o cartão dele fica no alto de um bloco mais comprido)
	 */
	.fx-galhos {
		--meio: 19px;
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr);
		align-items: start;
	}
	.fx-galhos.sozinho {
		grid-template-columns: minmax(0, 420px);
	}
	.fx-equipe {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-left: 36px;
	}
	/* Do líder até a espinha */
	.fx-equipe::before {
		content: '';
		position: absolute;
		left: 0;
		top: var(--meio);
		width: 18px;
		border-top: 1px solid var(--linha);
	}
	.fx-ramo,
	.fx-folha {
		position: relative;
	}
	/* Da espinha até cada um da equipe */
	.fx-ramo::before {
		content: '';
		position: absolute;
		left: -18px;
		top: var(--meio);
		width: 18px;
		border-top: 1px solid var(--linha);
	}
	/* A espinha, um pedaço por ramo (cobre o espaço de 8px entre eles) */
	.fx-ramo::after {
		content: '';
		position: absolute;
		left: -18px;
		top: -4px;
		bottom: -4px;
		border-left: 1px solid var(--linha);
	}
	.fx-ramo:first-child::after {
		top: var(--meio);
	}
	.fx-ramo:last-child::after {
		bottom: auto;
		height: calc(var(--meio) + 4px);
	}
	.fx-ramo:first-child:last-child::after {
		display: none;
	}
	/* O segundo nível: a equipe do gerente, embaixo dele, com a espinha saindo do cartão */
	.fx-sub {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 6px;
		padding-left: 24px;
	}
	.fx-folha::before {
		content: '';
		position: absolute;
		left: -13px;
		top: var(--meio);
		width: 13px;
		border-top: 1px solid var(--linha);
	}
	.fx-folha::after {
		content: '';
		position: absolute;
		left: -13px;
		top: -3px;
		bottom: -3px;
		border-left: 1px solid var(--linha);
	}
	.fx-folha:first-child::after {
		top: -6px;
	}
	.fx-folha:last-child::after {
		bottom: auto;
		height: calc(var(--meio) + 3px);
	}
	.fx-folha:first-child:last-child::after {
		height: calc(var(--meio) + 6px);
	}
	.fx-sub .fx-no {
		padding: 0.45rem 0.6rem;
	}

	/* O cartão */
	.fx-no {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		width: 100%;
		padding: 0.55rem 0.7rem;
		border-radius: 7px;
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.13);
		color: inherit;
		text-align: left;
		transition: background 0.15s, border-color 0.15s;
	}
	.fx-no:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: var(--cor);
	}
	.fx-no:focus-visible,
	.fx-fechar:focus-visible,
	footer button:focus-visible {
		outline: 2px solid #c4b5fd;
		outline-offset: 2px;
	}
	.fx-ponto {
		position: relative;
		width: 8px;
		height: 8px;
		margin-top: 0.36rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--cor);
	}
	.fx-ponto.pulsa::after {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 50%;
		border: 1.5px solid var(--cor);
		animation: fx-pulso 1.6s ease-out infinite;
	}
	@keyframes fx-pulso {
		from {
			transform: scale(0.6);
			opacity: 0.9;
		}
		to {
			transform: scale(1.7);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fx-ponto.pulsa::after {
			animation: none;
			opacity: 0.5;
		}
	}
	.fx-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.fx-txt {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		min-width: 0;
	}
	.fx-txt strong {
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fx-txt strong b {
		font-weight: 800;
	}
	.fx-txt small {
		font-size: 0.74rem;
		color: var(--dg-suave, #9aa6ba);
		font-variant-numeric: tabular-nums;
	}
	.fx-txt em {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-style: normal;
		font-size: 0.72rem;
		color: var(--cor);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fx-txt em.falhou {
		white-space: normal;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.fx-raiz .fx-no {
		padding: 0.65rem 0.8rem;
	}
	.fx-raiz .fx-txt strong {
		font-size: 0.9rem;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		font-size: 0.74rem;
	}
	footer span {
		margin-right: 0.2rem;
		color: var(--dg-suave, #9aa6ba);
	}
	footer button {
		padding: 0.18rem 0.55rem;
		border-radius: 999px;
		background: rgba(139, 92, 246, 0.14);
		color: #ddd6fe;
		font-size: 0.74rem;
		font-weight: 600;
	}
	footer button:hover {
		background: rgba(139, 92, 246, 0.28);
	}

	/* Celular: a equipe desce para baixo do líder, a espinha sai dele */
	@media (max-width: 600px) {
		.fx-fundo {
			padding-top: 56px;
		}
		.fx-galhos,
		.fx-galhos.sozinho {
			grid-template-columns: minmax(0, 1fr);
		}
		.fx-equipe {
			margin-top: 8px;
			padding-left: 26px;
		}
		.fx-equipe::before {
			display: none;
		}
		.fx-ramo::before {
			left: -14px;
			width: 14px;
		}
		.fx-ramo::after {
			left: -14px;
		}
		.fx-ramo:first-child::after {
			top: -8px;
		}
		.fx-ramo:first-child:last-child::after {
			display: block;
			top: -8px;
			height: calc(var(--meio) + 8px);
		}
	}
</style>
