<script lang="ts">
	// O painel de um agente no DGathe: o que está fazendo, o que precisa de
	// resposta, a conversa da tarefa e a caixa para passar tarefa ou mandar
	// mensagem. Quem executa é a ponte do Mac (ponte/ponte.mjs); aqui só se lê
	// e grava pelo banco (funções da migration 0101).
	import { untrack } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { duracao, haQuanto, NOME_DO_STATUS, type Agente, type EstadoPonte, type Nivel, type StatusTarefa } from '$lib/dgathe/agentes';
	import { blocos } from '$lib/dgathe/texto';
	import { SALA_POR_ID } from '$lib/dgathe/mapa';
	import type { Icone } from '$lib/dgathe/passos';
	import {
		Bot,
		X,
		ChevronDown,
		ChevronUp,
		BookOpen,
		PenLine,
		SquareTerminal,
		Search,
		Globe,
		Sparkles,
		Users,
		ListChecks,
		MessageCircleQuestionMark,
		Palette,
		Mail,
		HardDrive,
		AudioLines,
		Brush,
		Wrench,
		Hand,
		CircleStop,
		Send,
		History,
		Unplug,
		TriangleAlert,
		LoaderCircle,
		Check
	} from '@lucide/svelte';

	let {
		agente,
		ponte,
		pode,
		supabase,
		aoFechar,
		aoIrAte,
		aoMudar,
		aoAvisar
	}: {
		agente: Agente;
		ponte: EstadoPonte;
		pode: Nivel;
		supabase: SupabaseClient;
		aoFechar: () => void;
		aoIrAte: () => void;
		/** Algo mudou no banco (tarefa nova, parou): o escritório relê os agentes já. */
		aoMudar: () => void;
		aoAvisar: (texto: string) => void;
	} = $props();

	type ResumoTarefa = {
		id: string;
		titulo: string;
		status: StatusTarefa;
		criada_por_nome: string;
		atividade: string | null;
		resumo: string | null;
		erro: string | null;
		passos: number;
		criada_ha: number;
		duracao: number;
	};
	type Tarefa = ResumoTarefa & { pedido: string; resultado: string | null; cancelar: boolean };
	type Mensagem = {
		id: number;
		tipo: 'pedido' | 'mensagem' | 'texto' | 'passo' | 'resultado' | 'aviso';
		conteudo: string;
		detalhe: Record<string, unknown> | null;
		autor_nome: string | null;
		entregue: boolean;
		ha: number;
	};
	type Questao = { question: string; header?: string; multiSelect?: boolean; options?: { label: string; description?: string }[] };
	type Pedido = {
		id: string;
		tipo: 'permissao' | 'pergunta';
		ferramenta: string;
		resumo: string;
		entrada: { questions?: Questao[] } | null;
		resposta: Record<string, unknown> | null;
		respondido_por_nome: string | null;
		cancelado: boolean;
		ha: number;
	};

	const ICONES: Record<Icone, typeof Bot> = {
		ler: BookOpen,
		escrever: PenLine,
		terminal: SquareTerminal,
		procurar: Search,
		web: Globe,
		skill: Sparkles,
		ajudante: Users,
		lista: ListChecks,
		pergunta: MessageCircleQuestionMark,
		figma: Palette,
		canva: Palette,
		email: Mail,
		drive: HardDrive,
		audio: AudioLines,
		adobe: Brush,
		ferramenta: Wrench
	};
	const iconeDo = (m: Mensagem) => ICONES[(m.detalhe?.icone as Icone) ?? 'ferramenta'] ?? Wrench;

	const ATIVOS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando'];
	const ativa = (s: StatusTarefa | undefined) => !!s && ATIVOS.includes(s);
	const editar = $derived(pode === 'editar');
	const detalhes = $derived(pode !== 'nenhum');

	let recolhido = $state(false);
	let historico = $state<ResumoTarefa[]>([]);
	let mostrarHistorico = $state(false);
	/** A tarefa aberta no painel; null = segue a atual do agente. */
	let escolhida = $state<string | null>(null);
	let tarefa = $state<Tarefa | null>(null);
	let mensagens = $state<Mensagem[]>([]);
	let pedidos = $state<Pedido[]>([]);
	let ultimaMensagem = 0;
	let carregada: string | null = null;

	let texto = $state('');
	let modo = $state<'nesta' | 'nova'>('nova');
	let enviando = $state(false);
	let rolagem: HTMLDivElement | undefined = $state();

	const aberta = $derived(escolhida ?? agente.tarefa?.id ?? historico[0]?.id ?? null);
	const abertos = $derived(pedidos.filter((p) => !p.resposta && !p.cancelado));
	const sala = $derived(SALA_POR_ID.get(agente.sala)?.nome ?? agente.sala);

	// Modo da caixa de texto: com tarefa aberta, fala nela; sem, passa tarefa nova
	let ultimaAberta: string | null = null;
	$effect(() => {
		const a = aberta;
		if (a !== ultimaAberta) {
			ultimaAberta = a;
			modo = a ? 'nesta' : 'nova';
		}
	});

	async function lerHistorico() {
		if (!detalhes) return;
		const { data, error } = await supabase.rpc('dgathe_tarefas_do_agente', { p_agente: agente.id, p_limite: 12 });
		if (!error && Array.isArray(data)) historico = data as ResumoTarefa[];
	}

	async function lerTarefa() {
		const id = aberta;
		if (!id || !detalhes) {
			tarefa = null;
			mensagens = [];
			pedidos = [];
			carregada = null;
			return;
		}
		if (carregada !== id) {
			carregada = id;
			ultimaMensagem = 0;
			mensagens = [];
			pedidos = [];
			tarefa = null;
		}
		const { data, error } = await supabase.rpc('dgathe_tarefa', { p_id: id, p_depois: ultimaMensagem });
		if (error || !data || carregada !== id) return;
		const r = data as { tarefa: Tarefa; mensagens: Mensagem[]; pedidos: Pedido[] };
		tarefa = r.tarefa;
		pedidos = r.pedidos ?? [];
		const novas = r.mensagens ?? [];
		if (novas.length) {
			const perto = !rolagem || rolagem.scrollHeight - rolagem.scrollTop - rolagem.clientHeight < 80;
			mensagens = [...mensagens, ...novas];
			ultimaMensagem = novas[novas.length - 1].id;
			if (perto) queueMicrotask(() => rolagem?.scrollTo({ top: rolagem.scrollHeight }));
		}
	}

	// Leitura da tarefa aberta: a cada 2 s enquanto trabalha, a cada 8 s depois
	$effect(() => {
		void aberta;
		let parado = false;
		let timer: ReturnType<typeof setTimeout>;
		const laco = async () => {
			await untrack(() => lerTarefa());
			if (!parado) timer = setTimeout(laco, ativa(untrack(() => tarefa?.status)) ? 2000 : 8000);
		};
		void laco();
		return () => {
			parado = true;
			clearTimeout(timer);
		};
	});

	// Histórico: ao abrir, a cada 10 s e quando o agente muda de tarefa ou de estado
	$effect(() => {
		void agente.id;
		void agente.tarefa?.id;
		void agente.estado;
		untrack(() => void lerHistorico());
		const timer = setInterval(() => void lerHistorico(), 10_000);
		return () => clearInterval(timer);
	});

	// Trocou de agente: volta a seguir a tarefa atual
	let agenteAnterior = '';
	$effect(() => {
		if (agente.id !== agenteAnterior) {
			agenteAnterior = agente.id;
			escolhida = null;
			mostrarHistorico = false;
		}
	});

	async function chamar(fn: string, args: Record<string, unknown>, ok: string) {
		const { data, error } = await supabase.rpc(fn, args);
		if (error) {
			aoAvisar(error.message.includes('permissão') ? error.message : 'Não deu para gravar agora. Tente de novo.');
			return null;
		}
		if (ok) aoAvisar(ok);
		aoMudar();
		return data ?? true;
	}

	async function enviar() {
		const t = texto.trim();
		if (!t || enviando || !editar) return;
		enviando = true;
		try {
			if (modo === 'nesta' && aberta) {
				const r = await chamar('dgathe_mandar_mensagem', { p_tarefa: aberta, p_texto: t }, ativa(tarefa?.status) ? 'Mensagem enviada' : `${agente.nome} vai continuar esta tarefa`);
				if (r) texto = '';
			} else {
				const id = await chamar('dgathe_passar_tarefa', { p_agente: agente.id, p_pedido: t }, `Tarefa passada para ${agente.nome}`);
				if (typeof id === 'string') {
					texto = '';
					escolhida = id;
				}
			}
			await lerTarefa();
		} finally {
			enviando = false;
		}
	}

	function teclou(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			void enviar();
		}
	}

	async function parar() {
		if (!aberta || !editar) return;
		await chamar('dgathe_parar', { p_tarefa: aberta }, 'Pedido de parar enviado');
		await lerTarefa();
	}

	// Respostas: permissão (liberar/negar com motivo) e perguntas (opções ou texto)
	let motivo = $state<Record<string, string>>({});
	let negando = $state<Record<string, boolean>>({});
	let escolhas = $state<Record<string, string[]>>({});
	let outra = $state<Record<string, string>>({});
	const chave = (p: Pedido, i: number) => `${p.id}:${i}`;

	function alternar(p: Pedido, i: number, q: Questao, label: string) {
		const k = chave(p, i);
		const atual = escolhas[k] ?? [];
		escolhas[k] = q.multiSelect ? (atual.includes(label) ? atual.filter((l) => l !== label) : [...atual, label]) : [label];
		outra[k] = '';
	}

	const pronta = (p: Pedido) =>
		(p.entrada?.questions ?? []).every((_, i) => (escolhas[chave(p, i)]?.length ?? 0) > 0 || !!outra[chave(p, i)]?.trim());

	async function responder(p: Pedido, resposta: Record<string, unknown>) {
		const ok = await chamar('dgathe_responder', { p_pedido: p.id, p_resposta: resposta }, '');
		if (ok !== null) aoAvisar(ok === false ? 'Esse pedido já tinha sido respondido' : 'Resposta enviada');
		await lerTarefa();
	}

	function responderPergunta(p: Pedido) {
		const respostas: Record<string, string | string[]> = {};
		(p.entrada?.questions ?? []).forEach((q, i) => {
			const k = chave(p, i);
			const livre = outra[k]?.trim();
			respostas[q.question] = livre ? livre : q.multiSelect ? (escolhas[k] ?? []) : (escolhas[k]?.[0] ?? '');
		});
		void responder(p, { respostas });
	}

	/** Passos seguidos viram um grupo só na conversa. */
	type Item = { tipo: 'msg'; m: Mensagem } | { tipo: 'passos'; lista: Mensagem[] };
	const itens = $derived.by(() => {
		const r: Item[] = [];
		for (const m of mensagens) {
			const ultimo = r[r.length - 1];
			if (m.tipo === 'passo' && ultimo?.tipo === 'passos') ultimo.lista.push(m);
			else if (m.tipo === 'passo') r.push({ tipo: 'passos', lista: [m] });
			else r.push({ tipo: 'msg', m });
		}
		return r;
	});

	const primeiroNome = (n: string | null) => (n ?? '').split(/\s+/)[0] || 'Alguém';
	const estadoTexto = $derived.by(() => {
		const t = agente.tarefa;
		if (agente.estado === 'esperando') return 'Precisa de você';
		if (agente.estado === 'trabalhando') return t?.atividade || 'Trabalhando';
		if (agente.estado === 'fila') return ponte.ligada ? 'Tarefa na fila, já vai começar' : 'Tarefa na fila: a ponte do Mac está desligada';
		return 'Livre, na copa';
	});
</script>

<header class="pa-cab">
	<span class="pa-retrato" class:trabalhando={agente.estado === 'trabalhando'} class:esperando={agente.estado === 'esperando'}><Bot size={20} /></span>
	<span class="pa-tit">
		<strong>{agente.nome} <em>IA</em></strong>
		<small>{agente.cargo} · {sala}</small>
	</span>
	<button type="button" class="pa-icone" onclick={() => (recolhido = !recolhido)} aria-label={recolhido ? 'Abrir o painel' : 'Recolher o painel'} title={recolhido ? 'Abrir o painel' : 'Recolher o painel'}>
		{#if recolhido}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
	</button>
	<button type="button" class="pa-icone" onclick={aoFechar} aria-label="Fechar"><X size={16} /></button>
</header>

<p class="pa-estado {agente.estado}">
	<span></span>{estadoTexto}{#if agente.tarefa && agente.estado !== 'livre'}<i> · {duracao(agente.tarefa.desde)}</i>{/if}
</p>

{#if !recolhido}
	{#if !ponte.ligada}
		<p class="pa-alerta"><Unplug size={14} />A ponte do Mac está desligada{ponte.vistaHa !== null && Number.isFinite(ponte.vistaHa) ? ` (último sinal ${haQuanto(ponte.vistaHa)})` : ''}. As tarefas ficam na fila e começam quando ele voltar.</p>
	{/if}

	{#if !detalhes}
		<p class="pa-vazio">Você vê os agentes no mapa. Para acompanhar as tarefas, peça acesso ao módulo "DGathe: agentes" na tela de Permissões.</p>
	{:else}
		{#each abertos as p (p.id)}
			<div class="pa-pedido">
				<h4><Hand size={14} />{p.tipo === 'pergunta' ? `${agente.nome} tem uma pergunta` : `${agente.nome} pede licença`}<small>{haQuanto(p.ha)}</small></h4>
				{#if p.tipo === 'permissao'}
					<p>Quer usar <b>{p.ferramenta}</b>:</p>
					{#if p.resumo}<pre>{p.resumo}</pre>{/if}
					{#if editar}
						{#if negando[p.id]}
							<input type="text" placeholder="Motivo (opcional, o agente lê)" bind:value={motivo[p.id]} maxlength="500" />
							<div class="pa-botoes">
								<button type="button" class="nao" onclick={() => responder(p, { permitir: false, motivo: motivo[p.id] ?? '' })}>Negar</button>
								<button type="button" class="leve" onclick={() => (negando[p.id] = false)}>Voltar</button>
							</div>
						{:else}
							<div class="pa-botoes">
								<button type="button" class="sim" onclick={() => responder(p, { permitir: true })}><Check size={14} />Liberar</button>
								<button type="button" class="nao" onclick={() => (negando[p.id] = true)}>Negar</button>
							</div>
						{/if}
					{/if}
				{:else}
					{#each p.entrada?.questions ?? [] as q, i (i)}
						<div class="pa-questao">
							<p><b>{q.question}</b>{#if q.multiSelect}<small> (pode marcar mais de uma)</small>{/if}</p>
							{#if editar}
								<div class="pa-opcoes">
									{#each q.options ?? [] as o (o.label)}
										<button type="button" class:marcada={(escolhas[chave(p, i)] ?? []).includes(o.label)} onclick={() => alternar(p, i, q, o.label)} title={o.description ?? ''}>
											{o.label}{#if o.description}<small>{o.description}</small>{/if}
										</button>
									{/each}
								</div>
								<input type="text" placeholder="Ou escreva outra resposta" bind:value={outra[chave(p, i)]} maxlength="2000" />
							{:else}
								<ul class="pa-lista">{#each q.options ?? [] as o (o.label)}<li>{o.label}</li>{/each}</ul>
							{/if}
						</div>
					{/each}
					{#if editar}
						<div class="pa-botoes">
							<button type="button" class="sim" disabled={!pronta(p)} onclick={() => responderPergunta(p)}><Send size={14} />Responder</button>
							<button type="button" class="leve" onclick={() => responder(p, { respostas: {} })}>Pular</button>
						</div>
					{/if}
				{/if}
				{#if !editar}<p class="pa-vazio">Esperando quem pode responder pelos agentes.</p>{/if}
			</div>
		{/each}

		{#if tarefa}
			<div class="pa-tarefa">
				<div class="pa-tarefa-cab">
					<strong title={tarefa.titulo}>{tarefa.titulo}</strong>
					<span class="pa-chip {tarefa.status}">{NOME_DO_STATUS[tarefa.status]}</span>
				</div>
				<small>
					{primeiroNome(tarefa.criada_por_nome)} pediu {haQuanto(tarefa.criada_ha)}{#if tarefa.status !== 'fila'} · {duracao(tarefa.duracao)} de trabalho{/if}{#if tarefa.passos} · {tarefa.passos} passo{tarefa.passos > 1 ? 's' : ''}{/if}
				</small>
				{#if ativa(tarefa.status) && editar}
					<button type="button" class="pa-parar" disabled={tarefa.cancelar} onclick={parar}>
						<CircleStop size={14} />{tarefa.cancelar ? 'Parando…' : tarefa.status === 'fila' ? 'Tirar da fila' : 'Parar'}
					</button>
				{/if}
				{#if tarefa.erro}<p class="pa-erro"><TriangleAlert size={13} />{tarefa.erro}</p>{/if}
			</div>

			<div class="pa-conversa" bind:this={rolagem}>
				{#each itens as it, n (it.tipo === 'msg' ? `m${it.m.id}` : `p${it.lista[0].id}`)}
					{#if it.tipo === 'passos'}
						{@const ultimo = it.lista[it.lista.length - 1]}
						{@const Ico = iconeDo(ultimo)}
						{#if it.lista.length === 1}
							<p class="pa-passo"><Ico size={12} />{ultimo.conteudo}</p>
						{:else}
							<details class="pa-passos" open={n === itens.length - 1 && ativa(tarefa.status)}>
								<summary><Ico size={12} />{it.lista.length} passos · {ultimo.conteudo}</summary>
								{#each it.lista as m (m.id)}
									{@const I = iconeDo(m)}
									<p class="pa-passo"><I size={12} />{m.conteudo}</p>
								{/each}
							</details>
						{/if}
					{:else if it.m.tipo === 'pedido' || it.m.tipo === 'mensagem'}
						<div class="pa-pessoa">
							<small>{primeiroNome(it.m.autor_nome)}{#if it.m.tipo === 'mensagem' && !it.m.entregue} · esperando entregar{/if}</small>
							<p>{it.m.conteudo}</p>
						</div>
					{:else if it.m.tipo === 'texto'}
						<div class="pa-agente">
							{#each blocos(it.m.conteudo) as b, k (k)}
								{#if b.tipo === 'codigo'}<pre>{b.texto}</pre>
								{:else}
									<p class:titulo={b.tipo === 'titulo'} class:item={b.tipo === 'item'}>
										{#if b.tipo === 'item'}<span class="pa-marca">{b.numero ? `${b.numero}.` : '•'}</span>{/if}{#each b.partes as pt, j (j)}{#if pt.codigo}<code>{pt.t}</code>{:else if pt.negrito}<b>{pt.t}</b>{:else}{pt.t}{/if}{/each}
									</p>
								{/if}
							{/each}
						</div>
					{:else if it.m.tipo === 'resultado'}
						<p class="pa-aviso">Terminou a rodada{#if typeof it.m.detalhe?.duracao_ms === 'number'} em {duracao(Number(it.m.detalhe.duracao_ms) / 1000)}{/if}</p>
					{:else}
						<p class="pa-aviso">{it.m.conteudo} · {haQuanto(it.m.ha)}</p>
					{/if}
				{/each}
				{#if ativa(tarefa.status) && tarefa.status !== 'fila'}
					<p class="pa-digitando"><LoaderCircle size={12} />{tarefa.atividade ?? 'Trabalhando'}</p>
				{/if}
			</div>
		{:else if !aberta}
			<p class="pa-vazio">{agente.nome} ainda não recebeu nenhuma tarefa.</p>
		{/if}

		{#if editar}
			<div class="pa-caixa">
				{#if aberta && tarefa}
					<div class="pa-modos" role="radiogroup" aria-label="O que fazer com o texto">
						<button type="button" role="radio" aria-checked={modo === 'nesta'} class:ativo={modo === 'nesta'} onclick={() => (modo = 'nesta')}>
							{ativa(tarefa.status) ? 'Mensagem nesta tarefa' : 'Continuar esta tarefa'}
						</button>
						<button type="button" role="radio" aria-checked={modo === 'nova'} class:ativo={modo === 'nova'} onclick={() => (modo = 'nova')}>
							Tarefa nova{agente.estado !== 'livre' ? ' (fila)' : ''}
						</button>
					</div>
				{/if}
				<textarea
					rows="3"
					maxlength="20000"
					bind:value={texto}
					onkeydown={teclou}
					placeholder={modo === 'nesta' && aberta
						? ativa(tarefa?.status)
							? `Fale com ${agente.nome}: entra no meio do trabalho`
							: `O que ${agente.nome} deve fazer a seguir nesta tarefa?`
						: `O que ${agente.nome} deve fazer?`}
				></textarea>
				<button type="button" class="pa-enviar" disabled={!texto.trim() || enviando} onclick={enviar}>
					{#if enviando}<LoaderCircle size={14} class="gira" />{:else}<Send size={14} />{/if}
					{modo === 'nesta' && aberta ? 'Enviar' : 'Passar tarefa'}
					<kbd>⌘↵</kbd>
				</button>
			</div>
		{/if}

		{#if historico.length > (aberta ? 1 : 0) || escolhida}
			<button type="button" class="pa-hist-botao" onclick={() => (mostrarHistorico = !mostrarHistorico)}>
				<History size={13} />Tarefas anteriores ({historico.length}){#if mostrarHistorico}<ChevronUp size={13} />{:else}<ChevronDown size={13} />{/if}
			</button>
			{#if mostrarHistorico}
				<ul class="pa-historico">
					{#if escolhida && agente.tarefa?.id && escolhida !== agente.tarefa.id}
						<li><button type="button" onclick={() => (escolhida = null)}><b>Voltar para a tarefa atual</b></button></li>
					{/if}
					{#each historico as h (h.id)}
						<li>
							<button type="button" class:aberta={h.id === aberta} onclick={() => ((escolhida = h.id), (mostrarHistorico = false))}>
								<span class="pa-chip {h.status}">{NOME_DO_STATUS[h.status]}</span>
								<b>{h.titulo}</b>
								<small>{haQuanto(h.criada_ha)} · {primeiroNome(h.criada_por_nome)}</small>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}

	<button type="button" class="pa-ir" onclick={aoIrAte}>Ir até {agente.nome}</button>
{/if}

<style>
	.pa-cab {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.pa-retrato {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		border-radius: 12px;
		background: linear-gradient(135deg, #a78bfa, #6d28d9);
		color: #fff;
		box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.35);
	}
	.pa-retrato.trabalhando {
		box-shadow: 0 0 0 2px #34d399;
	}
	.pa-retrato.esperando {
		background: linear-gradient(135deg, #ffc163, #f5a524);
		color: #1c2534;
		box-shadow: 0 0 0 2px #f5a524;
		animation: pa-pulso 1.2s ease-in-out infinite;
	}
	@keyframes pa-pulso {
		50% {
			box-shadow: 0 0 0 6px rgba(245, 165, 36, 0.25);
		}
	}
	.pa-tit {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.pa-tit strong {
		font-size: 0.95rem;
		line-height: 1.2;
	}
	.pa-tit em {
		font-style: normal;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		padding: 0.05rem 0.3rem;
		border-radius: 5px;
		background: rgba(167, 139, 250, 0.22);
		color: #d8ccff;
		vertical-align: 0.12em;
	}
	.pa-tit small {
		color: var(--dg-suave);
		font-size: 0.72rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pa-icone {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		color: var(--dg-suave);
	}
	.pa-icone:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--dg-texto);
	}
	.pa-estado {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0.6rem 0 0;
		font-size: 0.8rem;
		color: #d6dcea;
	}
	.pa-estado span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #9aa6ba;
		flex-shrink: 0;
	}
	.pa-estado.trabalhando span {
		background: #34d399;
		box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
	}
	.pa-estado.esperando {
		color: #ffd58a;
		font-weight: 600;
	}
	.pa-estado.esperando span {
		background: #f5a524;
	}
	.pa-estado.fila span {
		background: #c4b5fd;
	}
	.pa-estado i {
		font-style: normal;
		color: var(--dg-suave);
	}
	.pa-alerta {
		display: flex;
		gap: 0.45rem;
		align-items: flex-start;
		margin: 0.6rem 0 0;
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		background: rgba(154, 166, 186, 0.12);
		color: #c8d0de;
		font-size: 0.74rem;
		line-height: 1.4;
	}
	.pa-alerta :global(svg) {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}
	.pa-vazio {
		margin: 0.6rem 0 0;
		color: var(--dg-suave);
		font-size: 0.76rem;
		line-height: 1.45;
	}

	/* Pedido de permissão ou pergunta */
	.pa-pedido {
		margin-top: 0.7rem;
		padding: 0.65rem 0.7rem;
		border-radius: 12px;
		background: rgba(245, 165, 36, 0.12);
		border: 1px solid rgba(245, 165, 36, 0.5);
	}
	.pa-pedido h4 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.4rem;
		font-size: 0.8rem;
		color: #ffd58a;
	}
	.pa-pedido h4 small {
		margin-left: auto;
		font-weight: 500;
		color: var(--dg-suave);
	}
	.pa-pedido p {
		margin: 0 0 0.35rem;
		font-size: 0.78rem;
		line-height: 1.4;
	}
	.pa-pedido pre,
	.pa-agente pre {
		margin: 0.3rem 0;
		padding: 0.45rem 0.55rem;
		max-height: 160px;
		overflow: auto;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.35);
		font-size: 0.7rem;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.pa-pedido input,
	.pa-caixa textarea {
		width: 100%;
		margin-top: 0.35rem;
		padding: 0.45rem 0.55rem;
		border-radius: 8px;
		border: 1px solid var(--dg-borda);
		background: rgba(0, 0, 0, 0.3);
		color: var(--dg-texto);
		font: inherit;
		font-size: 0.8rem;
	}
	.pa-pedido input:focus,
	.pa-caixa textarea:focus {
		outline: none;
		border-color: rgba(167, 139, 250, 0.7);
	}
	.pa-questao + .pa-questao {
		margin-top: 0.55rem;
	}
	.pa-questao small {
		color: var(--dg-suave);
		font-weight: 400;
	}
	.pa-opcoes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.pa-opcoes button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		max-width: 100%;
		padding: 0.35rem 0.6rem;
		border-radius: 9px;
		border: 1px solid var(--dg-borda);
		background: rgba(255, 255, 255, 0.06);
		color: var(--dg-texto);
		font-size: 0.78rem;
		font-weight: 600;
		text-align: left;
	}
	.pa-opcoes button small {
		font-weight: 400;
		font-size: 0.68rem;
		color: var(--dg-suave);
	}
	.pa-opcoes button.marcada {
		border-color: #f5a524;
		background: rgba(245, 165, 36, 0.22);
	}
	.pa-lista {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.76rem;
	}
	.pa-botoes {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}
	.pa-botoes button {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.75rem;
		border-radius: 9px;
		font-size: 0.78rem;
		font-weight: 700;
	}
	.pa-botoes .sim {
		background: #f5a524;
		color: #1c2534;
	}
	.pa-botoes .sim:disabled {
		opacity: 0.45;
	}
	.pa-botoes .nao {
		background: rgba(239, 68, 68, 0.18);
		color: #fecaca;
	}
	.pa-botoes .leve {
		color: var(--dg-suave);
	}

	/* Tarefa aberta */
	.pa-tarefa {
		margin-top: 0.75rem;
		padding-top: 0.65rem;
		border-top: 1px solid var(--dg-borda);
	}
	.pa-tarefa-cab {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.pa-tarefa-cab strong {
		flex: 1;
		min-width: 0;
		font-size: 0.84rem;
		line-height: 1.3;
	}
	.pa-tarefa > small {
		display: block;
		margin-top: 0.2rem;
		color: var(--dg-suave);
		font-size: 0.7rem;
	}
	.pa-chip {
		flex-shrink: 0;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		font-size: 0.64rem;
		font-weight: 700;
		background: rgba(154, 166, 186, 0.2);
		color: #d5dbe6;
	}
	.pa-chip.trabalhando {
		background: rgba(52, 211, 153, 0.18);
		color: #a7f3d0;
	}
	.pa-chip.esperando {
		background: rgba(245, 165, 36, 0.25);
		color: #ffd58a;
	}
	.pa-chip.fila {
		background: rgba(196, 181, 253, 0.2);
		color: #ddd6fe;
	}
	.pa-chip.concluida {
		background: rgba(59, 130, 246, 0.2);
		color: #bfdbfe;
	}
	.pa-chip.falhou {
		background: rgba(239, 68, 68, 0.2);
		color: #fecaca;
	}
	.pa-parar {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.45rem;
		padding: 0.3rem 0.6rem;
		border-radius: 8px;
		background: rgba(239, 68, 68, 0.16);
		color: #fecaca;
		font-size: 0.74rem;
		font-weight: 700;
	}
	.pa-parar:disabled {
		opacity: 0.6;
	}
	.pa-erro {
		display: flex;
		gap: 0.35rem;
		margin: 0.45rem 0 0;
		color: #fecaca;
		font-size: 0.72rem;
		line-height: 1.4;
	}
	.pa-erro :global(svg) {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	/* Conversa */
	.pa-conversa {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.6rem;
		max-height: min(30vh, 300px);
		overflow-y: auto;
		padding-right: 0.15rem;
	}
	.pa-pessoa {
		align-self: flex-end;
		max-width: 88%;
		padding: 0.4rem 0.6rem;
		border-radius: 12px 12px 4px 12px;
		background: rgba(245, 165, 36, 0.16);
	}
	.pa-pessoa small {
		display: block;
		font-size: 0.64rem;
		color: #ffd58a;
		font-weight: 700;
	}
	.pa-pessoa p {
		margin: 0.1rem 0 0;
		font-size: 0.78rem;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.pa-agente {
		align-self: flex-start;
		max-width: 96%;
		padding: 0.45rem 0.6rem;
		border-radius: 12px 12px 12px 4px;
		background: rgba(167, 139, 250, 0.14);
		font-size: 0.78rem;
		line-height: 1.45;
		word-break: break-word;
	}
	.pa-agente p {
		margin: 0.2rem 0;
	}
	.pa-agente p.titulo {
		font-weight: 800;
	}
	.pa-agente p.item {
		display: flex;
		gap: 0.35rem;
		margin: 0.1rem 0;
	}
	.pa-marca {
		flex-shrink: 0;
		color: #c4b5fd;
	}
	.pa-agente code {
		padding: 0 0.25rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.3);
		font-size: 0.72rem;
	}
	.pa-passo,
	.pa-passos summary {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0;
		font-size: 0.7rem;
		color: var(--dg-suave);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pa-passo :global(svg),
	.pa-passos summary :global(svg) {
		flex-shrink: 0;
		color: #c4b5fd;
	}
	.pa-passos summary {
		cursor: pointer;
		list-style: none;
	}
	.pa-passos summary::-webkit-details-marker {
		display: none;
	}
	.pa-passos[open] summary {
		color: #c8d0de;
	}
	.pa-passos .pa-passo {
		padding-left: 1rem;
	}
	.pa-aviso {
		align-self: center;
		margin: 0.1rem 0;
		font-size: 0.64rem;
		color: var(--dg-suave);
	}
	.pa-digitando {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.15rem 0 0;
		font-size: 0.72rem;
		color: #a7f3d0;
	}
	.pa-digitando :global(svg),
	:global(.gira) {
		animation: pa-gira 1s linear infinite;
	}
	@keyframes pa-gira {
		to {
			transform: rotate(360deg);
		}
	}

	/* Caixa de texto */
	.pa-caixa {
		margin-top: 0.7rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--dg-borda);
	}
	.pa-modos {
		display: flex;
		gap: 0.25rem;
		padding: 0.2rem;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.25);
	}
	.pa-modos button {
		flex: 1;
		padding: 0.3rem 0.4rem;
		border-radius: 8px;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--dg-suave);
	}
	.pa-modos button.ativo {
		background: rgba(167, 139, 250, 0.25);
		color: #efe9ff;
	}
	.pa-caixa textarea {
		resize: vertical;
		min-height: 64px;
		line-height: 1.4;
	}
	.pa-enviar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		margin-top: 0.4rem;
		padding: 0.5rem;
		border-radius: 10px;
		background: linear-gradient(135deg, #a78bfa, #7c3aed);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
	}
	.pa-enviar:disabled {
		opacity: 0.45;
	}
	.pa-enviar kbd {
		margin-left: 0.25rem;
		padding: 0 0.3rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.25);
		font-size: 0.62rem;
		font-family: inherit;
	}

	/* Histórico */
	.pa-hist-botao {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.65rem;
		font-size: 0.74rem;
		color: var(--dg-suave);
	}
	.pa-hist-botao:hover {
		color: var(--dg-texto);
	}
	.pa-historico {
		margin: 0.35rem 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.pa-historico button {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0 0.4rem;
		width: 100%;
		padding: 0.35rem 0.45rem;
		border-radius: 8px;
		text-align: left;
		font-size: 0.74rem;
		color: var(--dg-texto);
	}
	.pa-historico button:hover,
	.pa-historico button.aberta {
		background: rgba(255, 255, 255, 0.07);
	}
	.pa-historico b {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pa-historico small {
		grid-column: 2;
		color: var(--dg-suave);
		font-size: 0.66rem;
	}
	.pa-ir {
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.5rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--dg-texto);
	}
	.pa-ir:hover {
		background: rgba(255, 255, 255, 0.14);
	}
	button:focus-visible,
	textarea:focus-visible,
	input:focus-visible {
		outline: 2px solid #c4b5fd;
		outline-offset: 2px;
	}
</style>
