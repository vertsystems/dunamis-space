<script lang="ts">
	// O escritório do DGathe: o canvas do jogo e o que fica por cima dele (barra
	// de recursos, painel do que está selecionado, minimapa, ajuda e avisos).
	// Quem desenha e controla o mapa é o motor em $lib/dgathe/jogo.ts.
	import { onMount, untrack } from 'svelte';
	import { updated } from '$app/state';
	import { fade } from 'svelte/transition';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { Jogo, type Selecao, type OutroResumo } from '$lib/dgathe/jogo';
	import { Presenca, type EstadoConexao } from '$lib/dgathe/presenca';
	import { assentoPorId, salaDoDono } from '$lib/dgathe/assentos';
	import { lerAparencia, type Aparencia } from '$lib/dgathe/aparencia';
	import { SALA_POR_ID, SETORES } from '$lib/dgathe/mapa';
	import { Agentes, COR_DO_ESTADO, lugaresDosAgentes, NOME_DO_ESTADO, PREFIXO_AGENTE, type Agente, type LeituraAgentes } from '$lib/dgathe/agentes';
	import PainelAgente from './PainelAgente.svelte';
	import Consumo from './Consumo.svelte';
	import MapaBandoletes from './MapaBandoletes.svelte';
	import { NOME_DA_ATIVIDADE, type Destino } from '$lib/dgathe/rotina';
	import {
		Crown,
		Presentation,
		Wallet,
		Handshake,
		Cpu,
		Megaphone,
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
		MapPin,
		Users,
		Bot,
		Hammer,
		X,
		ChevronDown,
		ChevronUp,
		Navigation,
		MousePointerClick,
		Hand,
		Briefcase,
		SquareDashed,
		Network
	} from '@lucide/svelte';

	let {
		nome,
		cargo,
		foto = null,
		cor = null,
		aparencia = null,
		id = null,
		supabase = null
	}: {
		nome: string;
		cargo: string;
		foto?: string | null;
		cor?: string | null;
		/** Meu bonequinho, como ficou salvo no Meu Perfil. Sem ele, o padrão na cor de tema. */
		aparencia?: Aparencia | null;
		/** Quem sou (id do colaborador). Sem id ou sem supabase, o jogo fica só local. */
		id?: string | null;
		supabase?: SupabaseClient | null;
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
		'sala-bruno': Briefcase,
		'sala-aline': Briefcase,
		'sala-1': SquareDashed,
		'sala-2': SquareDashed,
		'sala-3': SquareDashed,
		diretoria: Crown,
		reuniao: Presentation,
		financeiro: Wallet,
		comercial: Handshake,
		dev: Cpu,
		marketing: Megaphone,
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
	let presenca: Presenca | null = null;
	let agentes: Agentes | null = null;
	/** Os agentes e a ponte do Mac (agentes.ts), lidos a cada 3 s. */
	let leitura = $state<LeituraAgentes | null>(null);
	/** O que cada agente está fazendo agora pela rotina (posto, pausa, reunião). */
	let momentos = $state<Map<string, Destino>>(new Map());
	/** Avisos do banco (migration 0104): conta cada um, para o painel do agente reler na hora. */
	let sinal = $state(0);
	let aoVivo = $state(false);
	function textoDoMomento(id: string): string | null {
		const m = momentos.get(id);
		if (!m) return null;
		if (m.motivo === 'reuniao') return 'Em reunião de alinhamento';
		if (m.motivo === 'pausa' && m.atividade) return `Na pausa: ${NOME_DA_ATIVIDADE[m.atividade]}`;
		return 'No posto, esperando a próxima tarefa';
	}
	async function chamarReuniao(sala: string, ids: string[]) {
		if (!supabase) return;
		const { error } = await supabase.rpc('dgathe_chamar_reuniao', { p_sala: sala, p_agentes: ids, p_minutos: 15 });
		avisar(error ? 'Não deu para chamar a reunião agora' : 'Reunião chamada: os Bandoletes estão indo para a sala (15 min)');
		agentes?.agora();
	}
	async function encerrarReuniao(id: string) {
		if (!supabase) return;
		const { error } = await supabase.rpc('dgathe_encerrar_reuniao', { p_id: id });
		avisar(error ? 'Não deu para encerrar a reunião agora' : 'Reunião encerrada: cada um volta para o seu posto');
		agentes?.agora();
	}

	let selecao = $state<Selecao>({ tipo: 'avatar' });
	/**
	 * A tarefa para abrir no painel do agente, quando ele foi aberto de outro
	 * painel (a subtarefa na lista do líder, a tarefa-pai no especialista). Vale
	 * enquanto aquele agente continuar selecionado.
	 */
	let tarefaPedida = $state<{ agente: string; tarefa: string | null } | null>(null);
	let local = $state<string | null>(null);
	let andando = $state(false);
	let destino = $state<string | null>(null);
	let aviso = $state<string | null>(null);
	let ajuda = $state(false);
	/** O mapa dos Bandoletes (MapaBandoletes.svelte): o fluxo de quem está trabalhando em quê. */
	let mapaAberto = $state(false);
	let cheia = $state(false);
	let falhou = $state(false);
	/** Painel recolhido: só o cabeçalho, para sobrar mapa (no celular, principalmente). */
	let recolhido = $state(false);
	/**
	 * Quem mais já entrou no escritório: online, ausente (15 min sem mexer,
	 * sentado em algum lugar) ou offline (saiu; sentado na recepção).
	 */
	let outros = $state<OutroResumo[]>([]);
	/** Gente de verdade; os agentes andam na mesma lista do jogo, com `agente` preenchido. */
	const pessoas = $derived(outros.filter((o) => !o.agente));
	const presentes = $derived(pessoas.filter((o) => o.situacao === 'online'));
	const ausentes = $derived(pessoas.filter((o) => o.situacao === 'inativo'));
	const offline = $derived(pessoas.filter((o) => o.situacao === 'offline'));
	const listaDeAgentes = $derived(leitura?.agentes ?? []);
	// "Em andamento" conta também o líder esperando a equipe: o projeto dele está aberto
	const trabalhando = $derived(listaDeAgentes.filter((a) => a.estado === 'trabalhando' || a.estado === 'esperando' || a.estado === 'aguardando'));
	const emAndamento = (a: Agente) => (a.estado === 'aguardando' ? `${a.nome}: ${NOME_DO_ESTADO.aguardando}` : `${a.nome}: ${a.tarefa?.titulo ?? ''}`);
	const precisam = $derived(listaDeAgentes.filter((a) => a.estado === 'esperando'));
	const tituloAgentes = $derived.by(() => {
		if (!listaDeAgentes.length) return 'Nenhum Bandolete ainda';
		const ponte = leitura?.ponte.ligada ? 'Ponte do Mac ligada' : 'Ponte do Mac desligada: as tarefas esperam na fila';
		return `${listaDeAgentes.map((a) => `${a.nome}: ${NOME_DO_ESTADO[a.estado]}`).join(' · ')}. ${ponte}`;
	});
	const nomeDaSala = (id: string | null) => (id ? (SALA_POR_ID.get(id)?.nome ?? id) : 'lado de fora');
	let conexao = $state<EstadoConexao | 'sozinho'>('sozinho');

	// Tela de boas-vindas: fica pelo menos MINIMO_BOAS_VINDAS e, se a conexão
	// ainda estiver terminando, espera mais um pouco (até MAXIMO_BOAS_VINDAS),
	// para o escritório já aparecer com quem está online. O Bruno pediu uns 6 s
	// (09/11/2026).
	const MINIMO_BOAS_VINDAS = 6000;
	const MAXIMO_BOAS_VINDAS = 8000;
	const CHAVE_RECARGA = 'dgathe:recarregou';
	let minimoPassou = $state(false);
	// Voltou de uma atualização automática (versão nova): sem boas-vindas de novo
	let esgotou = $state(jaRecarregou());
	const boasVindas = $derived(!esgotou && !(minimoPassou && conexao !== 'conectando'));

	const salaSelecionada = $derived(selecao.tipo === 'sala' ? (SALA_POR_ID.get(selecao.id) ?? null) : null);
	const pessoaSelecionada = $derived.by(() => {
		const s = selecao;
		return s.tipo === 'pessoa' ? (outros.find((o) => o.id === s.id) ?? null) : null;
	});
	const agenteSelecionado = $derived.by(() => {
		const s = selecao;
		if (s.tipo !== 'pessoa' || !s.id.startsWith(PREFIXO_AGENTE)) return null;
		const id = s.id.slice(PREFIXO_AGENTE.length);
		return listaDeAgentes.find((a) => a.id === id) ?? null;
	});
	const tituloPessoas = $derived.by(() => {
		const nomes = [`${nome} (você)`, ...presentes.map((o) => o.nome)].join(', ');
		if (conexao === 'conectando') return `Conectando… ${nomes}`;
		if (conexao === 'offline') return 'Sem conexão agora: a lista volta sozinha quando a internet voltar';
		const parados = ausentes.length ? `. Ausentes: ${ausentes.map((o) => o.nome).join(', ')}` : '';
		const fora = offline.length ? `. Offline, na recepção: ${offline.map((o) => o.nome).join(', ')}` : '';
		return `Online: ${nomes}${parados}${fora}`;
	});
	const nomeLocal = $derived(local ? (SALA_POR_ID.get(local)?.nome ?? 'Lado de fora') : 'Lado de fora');
	const iniciais = $derived(iniciaisDe(nome));
	const status = $derived.by(() => {
		if (andando) return destino ? `Indo para ${SALA_POR_ID.get(destino)?.nome ?? 'o destino'}` : 'Andando';
		return local ? `Em ${nomeLocal}` : 'Do lado de fora';
	});

	/** Lê e apaga a marca deixada pela atualização automática. */
	function jaRecarregou() {
		try {
			const v = sessionStorage.getItem(CHAVE_RECARGA);
			sessionStorage.removeItem(CHAVE_RECARGA);
			return v === '1';
		} catch {
			return false;
		}
	}

	// Versão nova do dspace no ar (o SvelteKit confere a cada 30 s): o DGathe fica
	// aberto o dia inteiro, então ele mesmo recarrega, mas só quando ninguém está
	// escrevendo (tarefa, mensagem, motivo de negar). Escrevendo, espera e tenta de
	// novo. Quem está no escritório nem vê a pessoa sair: a despedida só conta
	// depois de 5 s, e a recarga leva 1 a 2 s.
	$effect(() => {
		if (!updated.current) return;
		let timer: ReturnType<typeof setTimeout>;
		const tentar = () => {
			const campos = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.dg textarea, .dg input')];
			const escrevendo = campos.some((c) => c.value.trim() !== '') || campos.some((c) => c === document.activeElement);
			if (escrevendo) {
				timer = setTimeout(tentar, 5000);
				return;
			}
			avisar('Versão nova do DGathe: atualizando…', 3000);
			try {
				sessionStorage.setItem(CHAVE_RECARGA, '1');
			} catch {
				// Sem armazenamento: só mostra as boas-vindas de novo.
			}
			timer = setTimeout(() => location.reload(), 1200);
		};
		tentar();
		return () => clearTimeout(timer);
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
		const tempoMinimo = setTimeout(() => (minimoPassou = true), MINIMO_BOAS_VINDAS);
		const tempoMaximo = setTimeout(() => (esgotou = true), MAXIMO_BOAS_VINDAS);
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
						// Selecionou outra coisa: a tarefa pedida não vale mais (clicar de novo
						// no agente, pelo mapa, volta a seguir a tarefa atual dele)
						if (tarefaPedida && !(s.tipo === 'pessoa' && s.id === PREFIXO_AGENTE + tarefaPedida.agente)) tarefaPedida = null;
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
					// O destino vale para os outros desde o primeiro passo (eles fazem o caminho)
					rota: (pontos, assento) => {
						const fim = pontos[pontos.length - 1];
						const antes = pontos[pontos.length - 2] ?? fim;
						const d = Math.hypot(fim.x - antes.x, fim.y - antes.y) || 1;
						presenca?.andar(fim, (fim.x - antes.x) / d, (fim.y - antes.y) / d, assento ?? null);
					},
					parou: (x, y, dx, dy, assento) => presenca?.parou(x, y, dx, dy, assento ?? null),
					outros: (lista) => {
						if (jaSincronizou) {
							const antes = new Map(outros.map((o) => [o.id, o.situacao]));
							for (const o of lista) {
								if (o.agente) continue;
								const era = antes.get(o.id);
								const n = primeiroNome(o.nome);
								if (era === o.situacao) continue;
								if (o.situacao === 'online') avisar(era === 'inativo' ? `${n} voltou` : `${n} chegou ao escritório`);
								else if (o.situacao === 'inativo') avisar(`${n} está ausente (15 min sem mexer)`);
								else if (era) avisar(`${n} saiu e foi para a recepção`);
							}
						}
						jaSincronizou = true;
						outros = lista;
					}
				},
				{ nome: nome.split(/\s+/)[0] || nome, cargo, aparencia: minhaAparencia, id }
			);
		} catch {
			falhou = true;
		}
		// Quem está: lido do banco a cada 3 s (o sinal de vida sai do layout do
		// dspace inteiro, então mudar de tela não tira ninguém do escritório)
		if (jogo && supabase && id) {
			const jg = jogo;
			presenca = new Presenca(supabase, id, {
				pessoas: (lista) => jg.definirPessoas(lista),
				estado: (e) => (conexao = e)
			});
			presenca.iniciar(jg.posicao());
			// Os agentes: na cadeira deles quando trabalham, na copa quando estão livres
			let estados: Map<string, string> | null = null;
			agentes = new Agentes(supabase, {
				leitura: (l) => {
					// Com a hora do servidor, vale a rotina: posto, 20% de pausas e reunião.
					// Onde tem gente sentada, a pausa dos agentes desvia
					const { lugar, reservados, momento, postos } = lugaresDosAgentes(l.agentes, l.agora, jg.assentosDePessoas());
					momentos = momento;
					const nomes = new Map(l.agentes.map((a) => [a.id, a.nome]));
					jg.definirAgentes(
						l.agentes.flatMap((a) => {
							const onde = lugar.get(a.id);
							// O momento (posto, pausa, reunião) vai para o crachá e o texto do mouse.
							// Esperando aprovação: vai até quem passou a tarefa e levanta a mão
							const chamar = a.estado === 'esperando' ? (a.tarefa?.aprovador ?? null) : null;
							return onde ? [{ agente: a, lugar: onde, momento: momento.get(a.id) ?? null, chamar }] : [];
						}),
						reservados,
						new Map([...postos].map(([agente, assento]) => [assento.id, nomes.get(agente) ?? agente]))
					);
					if (estados) {
						for (const a of l.agentes) {
							const era = estados.get(a.id);
							if (!era || era === a.estado) continue;
							if (a.estado === 'esperando') avisar(`${a.nome} precisa de você`, 4000);
							else if (a.estado === 'aguardando' && (era === 'trabalhando' || era === 'esperando')) avisar(`${a.nome} distribuiu o trabalho e espera a equipe`, 3500);
							else if (a.estado === 'trabalhando' && era === 'aguardando') avisar(`${a.nome} voltou a trabalhar: ${a.tarefa?.titulo ?? 'tarefa'}`, 3500);
							else if (a.estado === 'trabalhando' && era !== 'esperando') avisar(`${a.nome} começou: ${a.tarefa?.titulo ?? 'tarefa nova'}`, 3500);
							else if (a.estado === 'livre' && (era === 'trabalhando' || era === 'esperando' || era === 'aguardando')) avisar(`${a.nome} terminou a tarefa`, 3500);
						}
					}
					estados = new Map(l.agentes.map((a) => [a.id, a.estado]));
					leitura = l;
				},
				mudou: () => sinal++,
				aoVivo: (v) => (aoVivo = v)
			});
			agentes.iniciar();
		}
		// 15 min sem mexer (a vigia é do layout, presenca.ts): com o DGathe aberto
		// nesta aba, é o meu boneco que anda até o lugar e grava, e levanta ao voltar
		const aoFicarInativo = (e: Event) => {
			// Sentou por escolha (clicou no lugar): fica onde está. Quem tem sala
			// própria (Bruno, Aline) só fica se o lugar for na sala dele
			const meu = jogo?.sentadoPorEscolha();
			const sala = salaDoDono(id);
			if (meu && (!sala || meu.sala === sala)) {
				e.preventDefault();
				return;
			}
			const a = assentoPorId((e as CustomEvent<{ assento: string | null }>).detail?.assento);
			if (jogo && a && jogo.sentarEm(a)) e.preventDefault();
		};
		const aoVoltar = (e: Event) => {
			if (!jogo) return;
			// Voltou a mexer: quem sentou por escolha continua sentado
			if (!jogo.sentadoPorEscolha()) jogo.levantar();
			e.preventDefault();
		};
		window.addEventListener('dgathe:inativo', aoFicarInativo);
		window.addEventListener('dgathe:ativo', aoVoltar);
		try {
			if (!localStorage.getItem(CHAVE_AJUDA)) ajuda = true;
		} catch {
			ajuda = true;
		}
		const mudouTelaCheia = () => (cheia = document.fullscreenElement === raiz);
		document.addEventListener('fullscreenchange', mudouTelaCheia);
		tela.focus({ preventScroll: true });
		return () => {
			document.removeEventListener('fullscreenchange', mudouTelaCheia);
			window.removeEventListener('dgathe:inativo', aoFicarInativo);
			window.removeEventListener('dgathe:ativo', aoVoltar);
			clearTimeout(timerAviso);
			clearTimeout(tempoMinimo);
			clearTimeout(tempoMaximo);
			presenca?.parar();
			agentes?.parar();
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

	/** Abre o painel do agente; com `tarefa`, já naquela tarefa (veio de outro painel). */
	function verAgente(id: string, tarefa: string | null = null) {
		tarefaPedida = { agente: id, tarefa };
		jogo?.selecionar({ tipo: 'pessoa', id: PREFIXO_AGENTE + id });
		recolhido = false;
	}
</script>

<div class="dg" bind:this={raiz} class:cheia>
	<canvas
		bind:this={tela}
		class="dg-tela"
		tabindex="0"
		aria-label="Mapa do escritório da Dunamis. Botão direito anda, botão esquerdo seleciona, clique numa cadeira para sentar."
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
				<Users size={14} /><b>{1 + presentes.length}</b><em>online</em>
			{#if ausentes.length || offline.length}<small class="dg-ausentes">{[ausentes.length ? `${ausentes.length} ausente${ausentes.length > 1 ? 's' : ''}` : '', offline.length ? `${offline.length} offline` : ''].filter(Boolean).join(' · ')}</small>{/if}
				{#if conexao !== 'sozinho'}<i class="dg-sinal {conexao}" aria-hidden="true"></i>{/if}
			</span>
			<span title={tituloAgentes}>
				<Bot size={14} /><b>{listaDeAgentes.length}</b><em>Bandoletes</em>
				{#if leitura && listaDeAgentes.length}<i class="dg-sinal {leitura.ponte.ligada ? 'online' : 'offline'}" aria-hidden="true"></i>{/if}
			</span>
			<span title={trabalhando.length ? trabalhando.map(emAndamento).join(' · ') : 'Nenhuma tarefa em andamento'}><Hammer size={14} /><b>{trabalhando.length}</b><em>em andamento</em></span>
		</div>
		<div class="dg-acoes">
			{#if supabase}<Consumo {supabase} />{/if}
			{#if supabase && leitura && leitura.pode !== 'nenhum'}
				<button
					type="button"
					class="dg-mapa-btn"
					class:precisa={precisam.length > 0}
					onclick={() => (mapaAberto = !mapaAberto)}
					aria-expanded={mapaAberto}
					title={trabalhando.length ? `Mapa dos Bandoletes: ${trabalhando.length} em andamento` : 'Mapa dos Bandoletes'}
					aria-label="Mapa dos Bandoletes"
				>
					<Network size={16} />
					{#if trabalhando.length}<i aria-hidden="true">{trabalhando.length}</i>{/if}
				</button>
			{/if}
			<span class="dg-local" title="Onde você está"><Navigation size={13} />{nomeLocal}</span>
			<button type="button" onclick={() => (jogo?.centralizar(), tela.focus())} title="Voltar a câmera para você (Espaço)" aria-label="Centralizar no avatar"><Crosshair size={16} /></button>
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

	<!-- Agente esperando resposta: chama atenção logo abaixo da barra, em qualquer tela -->
	{#if precisam.length && !(agenteSelecionado && precisam.some((a) => a.id === agenteSelecionado.id))}
		<button type="button" class="dg-precisa" onclick={() => verAgente(precisam[0].id)} title="Ver o pedido">
			<Hand size={14} />{precisam.length === 1 ? `${precisam[0].nome} precisa de você` : `${precisam.length} Bandoletes precisam de você`}
		</button>
	{/if}

	<!-- Painel do que está selecionado -->
	<section class="dg-painel" class:largo={!!agenteSelecionado} aria-live="polite">
		{#if agenteSelecionado && leitura && supabase}
			<PainelAgente
				agente={agenteSelecionado}
				ponte={leitura.ponte}
				pode={leitura.pode}
				{supabase}
				aoFechar={() => jogo?.selecionar({ tipo: 'avatar' })}
				aoIrAte={() => irAte(PREFIXO_AGENTE + agenteSelecionado.id)}
				aoMudar={() => agentes?.agora()}
				aoAvisar={(t) => avisar(t)}
				aoVerAgente={verAgente}
				tarefaInicial={tarefaPedida?.agente === agenteSelecionado.id ? tarefaPedida.tarefa : null}
				agentes={listaDeAgentes}
				momento={textoDoMomento(agenteSelecionado.id)}
				{sinal}
				{aoVivo}
			/>
		{:else if salaSelecionada}
			{@const Ico = iconeDa(salaSelecionada.id)}
			{@const aqui = local === salaSelecionada.id}
			{@const gente = pessoas.filter((o) => o.sala === salaSelecionada.id)}
			{@const daSala = listaDeAgentes.filter((a) => a.sala === salaSelecionada.id)}
			{@const reunioesAqui = (leitura?.reunioes ?? []).filter((r) => r.sala === salaSelecionada.id)}
			{@const equipes = [...new Set(listaDeAgentes.map((a) => a.equipe).filter((e): e is string => !!e))]}
			{@const naSala = outros.filter((o) => o.agente && o.sala === salaSelecionada.id && o.agente.sala !== salaSelecionada.id)}
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
						<button type="button" class="dg-pessoa dg-pessoa-btn" class:ausente={o.situacao !== 'online'} onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })}>
							<span style="--cor: {o.situacao !== 'online' ? '#9aa6ba' : (o.cor ?? '#9aa6ba')}"></span>{o.nome} · {o.situacao === 'inativo' ? 'ausente' : o.situacao === 'offline' ? 'offline' : o.cargo}
						</button>
					{/each}
					{#each naSala as o (o.id)}
						<button type="button" class="dg-pessoa dg-pessoa-btn" onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })}>
							<span style="--cor: {o.agente ? COR_DO_ESTADO[o.agente.estado] : COR_DO_ESTADO.livre}"></span>{o.nome} · Bandolete, {o.agente ? NOME_DO_ESTADO[o.agente.estado] : ''}
						</button>
					{/each}
					{#if !aqui && !gente.length && !naSala.length}<p class="dg-vazio">Ninguém por aqui</p>{/if}
				</div>
				<div>
					<h4>Bandoletes do setor</h4>
					{#each daSala as a (a.id)}
						<button type="button" class="dg-pessoa dg-pessoa-btn" onclick={() => verAgente(a.id)} title="{a.cargo}{a.lider ? ' · líder da equipe' : ''}{a.tarefa?.titulo ? ` · ${a.tarefa.titulo}` : ''}">
							<span style="--cor: {COR_DO_ESTADO[a.estado]}"></span>{a.nome} · {a.estado === 'trabalhando' || a.estado === 'esperando' ? (a.tarefa?.titulo ?? NOME_DO_ESTADO[a.estado]) : NOME_DO_ESTADO[a.estado]}{#if a.lider}<em class="dg-lider">líder</em>{/if}
						</button>
					{/each}
					{#if !daSala.length}<p class="dg-vazio">{salaSelecionada.id === 'copa' ? 'É aqui que os Bandoletes passam as pausas' : 'Nenhum Bandolete neste setor ainda'}</p>{/if}
				</div>
			</div>
			{#if reunioesAqui.length || (leitura?.pode === 'editar' && (salaSelecionada.id === 'reuniao' || !!salaSelecionada.dono))}
				<div class="dg-reuniao">
					<h4>Reunião de alinhamento</h4>
					{#each reunioesAqui as r (r.id)}
						<p>
							<strong>{r.titulo}</strong>
							<small>{r.participantes.map((id) => listaDeAgentes.find((a) => a.id === id)?.nome ?? id).join(', ')} · até {new Date(r.ate * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
						</p>
						{#if leitura?.pode === 'editar'}<button type="button" class="dg-reuniao-btn" onclick={() => encerrarReuniao(r.id)}>Encerrar e voltar aos postos</button>{/if}
					{/each}
					{#if !reunioesAqui.length && leitura?.pode === 'editar'}
						<div class="dg-chips">
							{#each equipes as eq (eq)}
								{@const ids = listaDeAgentes.filter((a) => a.equipe === eq).map((a) => a.id)}
								<button type="button" class="dg-reuniao-btn" onclick={() => chamarReuniao(salaSelecionada.id, ids)}>{eq === 'diretoria' ? 'Chamar a diretoria' : `Chamar a equipe ${eq}`} ({ids.length})</button>
							{/each}
							<button type="button" class="dg-reuniao-btn" onclick={() => chamarReuniao(salaSelecionada.id, listaDeAgentes.map((a) => a.id))}>Chamar todos os Bandoletes</button>
						</div>
					{/if}
				</div>
			{/if}
			{#if salaSelecionada.especialidades.length}
				<div class="dg-esp">
					<h4>Especialidades {#if !daSala.length}<span>Bandoletes a criar</span>{/if}</h4>
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
				{#if p.situacao === 'offline'}{p.andando ? 'Indo para a recepção' : 'Sentado na recepção'}
				{:else if p.situacao === 'inativo'}{p.andando ? 'Indo sentar' : `Sentado em ${nomeDaSala(p.sala)}`}
				{:else}{p.andando ? 'Andando' : p.sala ? `Em ${nomeDaSala(p.sala)}` : 'Do lado de fora'}{/if}
			</p>
			{#if p.situacao === 'offline'}
				<p class="dg-online ausente"><span></span>Offline: fora do dspace agora</p>
			{:else if p.situacao === 'inativo'}
				<p class="dg-online ausente"><span></span>Ausente: 15 min sem mexer no dspace</p>
			{:else}
				<p class="dg-online"><span></span>Online agora</p>
			{/if}
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
			{#if presentes.length}
				<h4 class="dg-rotulo">Online agora</h4>
				<div class="dg-atalhos">
					{#each presentes as o (o.id)}
						<button type="button" onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })} title="Ver {o.nome}">
							<span style="--cor: {o.cor ?? '#9aa6ba'}"></span>{primeiroNome(o.nome)}
						</button>
					{/each}
				</div>
			{/if}
			{#if listaDeAgentes.length}
				<h4 class="dg-rotulo">Bandoletes</h4>
				<div class="dg-atalhos">
					{#each listaDeAgentes as a (a.id)}
						<button type="button" class="dg-agente" onclick={() => verAgente(a.id)} title="{a.nome}{a.lider ? ' (líder da equipe)' : ''}: {NOME_DO_ESTADO[a.estado]}{a.tarefa?.titulo ? ` · ${a.tarefa.titulo}` : ''}">
							<span style="--cor: {COR_DO_ESTADO[a.estado]}"></span>{a.nome}
						</button>
					{/each}
				</div>
			{/if}
			{#if ausentes.length}
				<h4 class="dg-rotulo">Ausentes (15 min sem mexer)</h4>
				<div class="dg-atalhos">
					{#each ausentes as o (o.id)}
						<button type="button" class="ausente" onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })} title="{o.nome}: sentado em {nomeDaSala(o.sala)}">
							<span style="--cor: #9aa6ba"></span>{primeiroNome(o.nome)}
						</button>
					{/each}
				</div>
			{/if}
			{#if offline.length}
				<h4 class="dg-rotulo">Offline (na recepção)</h4>
				<div class="dg-atalhos">
					{#each offline as o (o.id)}
						<button type="button" class="ausente" onclick={() => jogo?.selecionar({ tipo: 'pessoa', id: o.id })} title="{o.nome} está fora do dspace agora">
							<span style="--cor: #9aa6ba"></span>{primeiroNome(o.nome)}
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

	{#if mapaAberto && supabase && leitura}
		<MapaBandoletes
			{supabase}
			agentes={listaDeAgentes}
			ponteLigada={leitura.ponte.ligada}
			{sinal}
			aoVerAgente={verAgente}
			aoFechar={() => (mapaAberto = false)}
		/>
	{/if}

	{#if ajuda}
		<div class="dg-ajuda" role="dialog" aria-modal="true" aria-label="Controles do DGathe">
			<div class="dg-ajuda-caixa">
				<h3>Bem-vindo ao DGathe</h3>
				<p>O escritório da Dunamis em forma de jogo. Quem estiver logado no dspace aparece aqui com você (com alguns segundos de atraso); quem saiu fica sentado na recepção. Os Bandoletes, nossos agentes de IA (crachá roxo), trabalham sentados na mesa deles e passam as pausas pela copa: clique num deles para passar tarefa, acompanhar o que está fazendo e responder quando ele vier até você de mão levantada. O gerente de um setor distribui o trabalho para a equipe: enquanto ela trabalha, ele espera sentado na mesa dele, e o painel dele mostra quem está fazendo o quê. Na Diretoria ficam os três diretores (Estratégico, Tático e Operacional), que coordenam a operação e passam trabalho aos gerentes. O botão de rede no topo abre o mapa dos Bandoletes: cada pedido com quem recebeu, a equipe que ele chamou, o tempo e os tokens de cada um.</p>
				<ul>
					<li><kbd>Botão direito</kbd><span>anda até o ponto</span></li>
					<li><kbd>Botão esquerdo</kbd><span>seleciona sala, objeto ou pessoa</span></li>
					<li><kbd>Clique na cadeira</kbd><span>senta (no sofá e no pufe também); clique de novo para levantar</span></li>
					<li><kbd>Arrastar</kbd><span>move a câmera</span></li>
					<li><kbd>Roda do mouse</kbd><span>aproxima e afasta</span></li>
					<li><kbd>WASD</kbd><kbd>Setas</kbd><span>movem a câmera</span></li>
					<li><kbd>Espaço</kbd><span>volta a câmera para você</span></li>
					<li><kbd>Toque</kbd><span>no celular: toque no chão para andar</span></li>
				</ul>
				<button type="button" onclick={fecharAjuda}>Entrar no escritório</button>
			</div>
		</div>
	{/if}

	{#if boasVindas}
		<div class="dg-boasvindas" out:fade={{ duration: 450 }} role="status" aria-live="polite">
			<div class="dg-bv-caixa">
				<span class="dg-bv-selo">DG</span>
				<p class="dg-bv-pre">Bem-vindo ao escritório da</p>
				<h2 class="dg-bv-titulo">Dunamis Company</h2>
				<span class="dg-bv-barra" aria-hidden="true"><span></span></span>
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
	.dg-sinal.offline {
		background: #7f8aa0;
	}
	/* À direita, para não cobrir o recado curto (.dg-aviso), que fica no meio */
	.dg-precisa {
		position: absolute;
		top: 56px;
		right: 12px;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		background: #f5a524;
		color: #1c2534;
		font-size: 12.5px;
		font-weight: 800;
		white-space: nowrap;
		box-shadow: 0 10px 24px -10px rgba(245, 165, 36, 0.8);
		animation: dg-chama 1.6s ease-in-out infinite;
		z-index: 3;
	}
	@keyframes dg-chama {
		50% {
			box-shadow: 0 0 0 6px rgba(245, 165, 36, 0.25), 0 10px 24px -10px rgba(245, 165, 36, 0.8);
		}
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
	.dg-acoes .dg-mapa-btn {
		position: relative;
		color: #c4b5fd;
	}
	.dg-mapa-btn i {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 999px;
		background: #34d399;
		color: #062016;
		font-size: 10px;
		font-style: normal;
		font-weight: 800;
		line-height: 16px;
		text-align: center;
	}
	.dg-mapa-btn.precisa i {
		background: #f5a524;
		color: #2a1a02;
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
	.dg-reuniao {
		margin-top: 0.7rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--dg-borda);
	}
	.dg-reuniao h4 {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--dg-suave);
	}
	.dg-reuniao p {
		display: flex;
		flex-direction: column;
		margin: 0 0 0.35rem;
		font-size: 0.78rem;
	}
	.dg-reuniao small {
		color: var(--dg-suave);
	}
	.dg-reuniao-btn {
		padding: 0.3rem 0.6rem;
		border-radius: 8px;
		background: rgba(56, 189, 248, 0.16);
		color: #bae6fd;
		font-size: 0.74rem;
		font-weight: 600;
	}
	.dg-painel.largo {
		width: min(390px, calc(100% - 24px));
	}
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
	/* Quem lidera a equipe do setor (é com ele que se fala do projeto) */
	.dg-lider {
		margin-left: 0.35rem;
		padding: 0 0.35rem;
		border-radius: 999px;
		background: rgba(56, 189, 248, 0.18);
		color: #bae6fd;
		font-style: normal;
		font-size: 0.62rem;
		font-weight: 700;
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
	.dg-online.ausente {
		color: #b6bfce;
	}
	.dg-online.ausente span {
		background: #9aa6ba;
	}
	.dg-ausentes {
		margin-left: 0.15rem;
		font-size: 10.5px;
		font-weight: 600;
		color: #b6bfce;
		white-space: nowrap;
	}
	.dg-pessoa-btn.ausente,
	.dg-atalhos button.ausente {
		opacity: 0.72;
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

	/* Boas-vindas ao entrar */
	.dg-boasvindas {
		position: absolute;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		background:
			radial-gradient(circle at 50% 42%, rgba(255, 111, 0, 0.12), transparent 42%),
			repeating-linear-gradient(26.565deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 34px),
			repeating-linear-gradient(-26.565deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 34px),
			linear-gradient(180deg, #1c2e23, #111a14);
	}
	.dg-bv-caixa {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		animation: dg-bv-entra 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.dg-bv-selo {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		margin-bottom: 1rem;
		border-radius: 16px;
		background: linear-gradient(135deg, #ffb547, #ff6f00);
		color: #1c2534;
		font-weight: 900;
		font-size: 22px;
		letter-spacing: -0.03em;
		box-shadow: 0 12px 30px -10px rgba(255, 111, 0, 0.6);
	}
	.dg-bv-pre {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #ffd58a;
	}
	.dg-bv-titulo {
		margin: 0.2rem 0 1.1rem;
		font-size: clamp(26px, 4vw, 36px);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #ffffff;
	}
	.dg-bv-barra {
		position: relative;
		width: 160px;
		height: 3px;
		overflow: hidden;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
	}
	.dg-bv-barra span {
		position: absolute;
		inset: 0 auto 0 0;
		width: 40%;
		border-radius: inherit;
		background: linear-gradient(90deg, #ffb547, #ff6f00);
		animation: dg-bv-corre 1.1s ease-in-out infinite;
	}
	@keyframes dg-bv-entra {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
	}
	@keyframes dg-bv-corre {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dg-bv-caixa,
		.dg-bv-barra span {
			animation: none;
		}
		.dg-bv-barra span {
			width: 100%;
			opacity: 0.6;
		}
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
		/* No celular o minimapa sobe para o canto direito: o aviso vai para a esquerda */
		.dg-precisa {
			right: auto;
			left: 12px;
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
