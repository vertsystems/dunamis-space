// As equipes de agentes do DGathe (departamento de Desenvolvimento & IA, pedido
// do Bruno em 10/11/2026): o líder delega subtarefas aos especialistas, a ponte
// devolve o retorno deles e toda sexta cria o fechamento semanal. Aqui ficam as
// decisões e os textos, sem banco nem processo, para dar para testar no vitest.
// Quem usa: ponte/ponte.mjs (fim da rodada, retorno, fechamento) e
// ponte/equipe.mjs (a linha de comando que o líder roda dentro da sessão).
// Contrato: docs/dgathe/contrato-equipes.md, seções 2 a 5.
//
// Roda direto no Node da ponte (sem build): só TypeScript que o Node sabe
// apagar (nada de enum, namespace ou propriedade no construtor) e nenhum
// import, nem de outro .ts (import com extensão .ts quebra o svelte-check).
//
// Datas: Brasília fixo em UTC−3. O Brasil não tem horário de verão desde 2019,
// então sexta 17h de Brasília é sempre sexta 20h UTC.

export type StatusTarefa = 'fila' | 'trabalhando' | 'esperando' | 'aguardando' | 'concluida' | 'falhou' | 'cancelada';

export const LIMITE_ABERTAS = 12;
export const LIMITE_RODADAS = 6;
/** O banco aceita pedido de 1 a 20.000 caracteres (dgathe_tarefas.pedido). */
export const LIMITE_PEDIDO = 20000;
export const AUTOR_DA_EQUIPE = 'Equipe';
/**
 * A equipe dos diretores (pedido do Bruno em 11/11/2026): Estratégico, Tático e
 * Operacional, logo abaixo dos CEOs. Não tem líder: cada diretor passa trabalho
 * aos gerentes das outras equipes, que redistribuem para a equipe deles.
 */
export const EQUIPE_DIRETORIA = 'diretoria';
/**
 * Ainda vai rodar ou está rodando. "aguardando" entra desde a diretoria: o
 * gerente que recebeu de um diretor e espera a própria equipe ainda não
 * terminou, e o diretor não pode receber o retorno antes dele.
 */
export const STATUS_ABERTOS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando', 'aguardando'];
export const STATUS_TERMINADOS: StatusTarefa[] = ['concluida', 'falhou', 'cancelada'];

/** Para o líder ler. */
export const NOME_PARA_O_LIDER: Record<StatusTarefa, string> = {
	fila: 'Na fila',
	trabalhando: 'Trabalhando',
	esperando: 'Esperando resposta do CEO',
	aguardando: 'Esperando a equipe',
	concluida: 'Concluída',
	falhou: 'Parou com erro',
	cancelada: 'Parada'
};

/** Como o líder chama a linha de comando (a ponte põe o caminho em DGATHE_EQUIPE). */
const COMANDO = 'node "$DGATHE_EQUIPE"';

/** O retorno da equipe inteiro cabe com folga nos 40.000 caracteres de dgathe_mensagens.conteudo. */
const LIMITE_RETORNO = 38000;
/** Cada entrega no retorno: o resto o líder lê com `estado <id>`. */
const LIMITE_POR_ENTREGA = 8000;
const LIMITE_ITENS_DO_FECHAMENTO = 60;

/**
 * Equipes fora do fechamento semanal automático de sexta (decisão do Bruno em
 * 11/11/2026): o Financeiro fecha a semana só quando um CEO pede, para não abrir
 * sessão sem pedido. O `node ponte/ponte.mjs --fechamento <agente>` continua
 * valendo para elas.
 */
export const EQUIPES_SEM_FECHAMENTO: readonly string[] = ['financeiro'];

/** Se o líder desta equipe recebe o fechamento semanal automático. */
export function temFechamentoAutomatico(equipe: string | null | undefined): boolean {
	return !!equipe && !EQUIPES_SEM_FECHAMENTO.includes(equipe);
}
const LIMITE_SUBS_POR_ITEM = 40;

// ------------------------------------------------------------ pequenas contas

function nomeDoStatus(s: string): string {
	return (NOME_PARA_O_LIDER as Record<string, string>)[s] ?? s;
}

function aberta(s: { status: string }): boolean {
	return (STATUS_ABERTOS as string[]).includes(s.status);
}

/** Quantidade de caracteres como o Postgres conta (pontos de código, não unidades UTF-16). */
function tamanho(texto: string): number {
	return Array.from(texto).length;
}

/** Texto numa linha só, cortado em `max` caracteres (contando o "…"). */
function umaLinha(texto: string | null | undefined, max: number): string {
	const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
	return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function curto(id: string): string {
	return String(id ?? '').slice(0, 8);
}

function plural(n: number, um: string, varios: string): string {
	return `${n} ${n === 1 ? um : varios}`;
}

export function rodadaAtual(t: { rodada: number }): number {
	return Math.max(1, Math.trunc(Number(t?.rodada) || 0));
}

/** Rodadas de delegação usadas: os valores distintos de rodada_do_pai (rodada repetida conta uma vez). */
export function rodadasUsadas(subs: { rodada_do_pai: number }[]): number {
	return new Set(subs.map((s) => Number(s.rodada_do_pai)).filter((n) => Number.isFinite(n))).size;
}

export function contarAbertas(subs: { status: StatusTarefa }[]): number {
	return subs.filter(aberta).length;
}

/**
 * Igual à dgathe_titulo do banco: a primeira linha, espaços juntados, até 80
 * caracteres (79 + '…'); vazio → 'Tarefa'. Sem título, usa o pedido.
 */
export function normalizarTitulo(titulo: string | null | undefined, pedido: string): string {
	const fonte = titulo && titulo.trim() ? titulo : (pedido ?? '');
	// btrim() do Postgres tira só espaço, por isso o replace e não o trim()
	const linha = fonte.replace(/^ +| +$/g, '').split('\n')[0].replace(/\s+/g, ' ').trim();
	const letras = Array.from(linha);
	if (letras.length > 80) return letras.slice(0, 79).join('') + '…';
	return linha || 'Tarefa';
}

// ------------------------------------------------------------ delegação

export type AgenteDaEquipe = { id: string; nome: string; cargo: string; equipe: string | null; lider: boolean; ativo: boolean };
/** A tarefa de cima da tarefa de quem delega (quando ela é subtarefa), com a equipe de quem a recebeu. */
export type TarefaDeCima = { equipe: string | null; pai_id: string | null };

/** Diretor (equipe "diretoria"): delega aos gerentes das outras equipes. */
export function ehDiretor(a: { equipe: string | null } | null | undefined): boolean {
	return a?.equipe === EQUIPE_DIRETORIA;
}
export type TarefaDaEquipe = { id: string; agente_id: string; status: StatusTarefa; pai_id: string | null; rodada: number; cancelar: boolean };
export type CodigoRecusa = 'pedido' | 'tarefa' | 'parada' | 'lider' | 'profundidade' | 'destino' | 'si' | 'inativo' | 'equipe' | 'abertas' | 'rodadas';
export type Recusa = { codigo: CodigoRecusa; mensagem: string; saida: 2 | 3 };

function recusa(codigo: CodigoRecusa, mensagem: string, saida: 2 | 3 = 3): Recusa {
	return { codigo, mensagem, saida };
}

/** A verificação 0 da tabela 3.2, separada para o equipe.mjs recusar antes de abrir o banco. */
export function verificarPedido(pedido: string | null | undefined): Recusa | null {
	const n = tamanho(String(pedido ?? '').trim());
	if (n < 1 || n > LIMITE_PEDIDO)
		return recusa('pedido', 'O pedido precisa ter entre 1 e 20.000 caracteres (mande pelo stdin ou com --pedido).', 2);
	return null;
}

/**
 * As verificações da tabela 3.2 do contrato, na ordem: a primeira que falhar
 * responde. null = pode delegar. `tarefaId` (opcional) é o id pedido, para a
 * mensagem quando a tarefa não existe.
 */
export function verificarDelegacao(c: {
	tarefa: TarefaDaEquipe | null;
	eu: AgenteDaEquipe | null;
	destinoId: string;
	destino: AgenteDaEquipe | null;
	subtarefas: { status: StatusTarefa; rodada_do_pai: number }[];
	pedido: string;
	tarefaId?: string | null;
	/** A tarefa de cima, quando a tarefa de quem delega é uma subtarefa (o gerente que recebeu de um diretor). */
	acima?: TarefaDeCima | null;
}): Recusa | null {
	const semPedido = verificarPedido(c.pedido);
	if (semPedido) return semPedido;
	const { tarefa, eu, destino } = c;
	const diretor = ehDiretor(eu);
	if (!tarefa || !eu || tarefa.agente_id !== eu.id)
		return recusa('tarefa', `A tarefa ${curto(c.tarefaId ?? tarefa?.id ?? '')} não existe ou não é sua.`);
	if (tarefa.status !== 'trabalhando' && tarefa.status !== 'esperando')
		return recusa('parada', `Esta tarefa não está em andamento (${tarefa.status}): só dá para delegar de dentro de uma rodada.`);
	if (tarefa.cancelar) return recusa('parada', 'Esta tarefa está sendo parada.');
	if (!diretor && (!eu.lider || !eu.equipe))
		return recusa('lider', 'Só o líder da equipe delega. Se precisa de outro especialista, diga no texto final: o líder decide.');
	if (tarefa.pai_id) {
		// Dois níveis no máximo: diretor → gerente → equipe. O diretor só delega da
		// tarefa que recebeu dos CEOs; o gerente, de uma que veio direto de um diretor.
		const deDiretor = !diretor && ehDiretor(c.acima) && !c.acima?.pai_id;
		if (diretor) return recusa('profundidade', 'O diretor só delega da tarefa que recebeu dos CEOs. Diga no texto final o que falta.');
		if (!deDiretor)
			return recusa('profundidade', 'Esta tarefa já é uma subtarefa, e subtarefa não cria subtarefa. Diga no texto final o que falta.');
	}
	if (!destino)
		return recusa(
			'destino',
			`Não existe agente "${c.destinoId}". Veja ${diretor ? 'os gerentes' : 'quem é da equipe'} com: ${COMANDO} equipe`
		);
	if (destino.id === eu.id) return recusa('si', 'Você não delega para si mesmo: faça você ou escolha um especialista.');
	if (!destino.ativo) return recusa('inativo', `${destino.nome} está desativado e não recebe tarefas.`);
	if (diretor) {
		if (!destino.lider || !destino.equipe || ehDiretor(destino))
			return recusa(
				'equipe',
				`${destino.nome} não é gerente de equipe: o diretor passa o trabalho ao gerente, que distribui para a equipe dele. Veja os gerentes com: ${COMANDO} equipe`
			);
	} else if (destino.equipe !== eu.equipe) return recusa('equipe', `${destino.nome} não é da sua equipe (${eu.equipe}).`);
	if (contarAbertas(c.subtarefas) >= LIMITE_ABERTAS)
		return recusa('abertas', `Esta tarefa já tem ${LIMITE_ABERTAS} subtarefas abertas. Encerre a rodada e espere o retorno.`);
	const rodada = rodadaAtual(tarefa);
	const rodadaNova = !c.subtarefas.some((s) => Number(s.rodada_do_pai) === rodada);
	if (rodadaNova && rodadasUsadas(c.subtarefas) >= LIMITE_RODADAS)
		return recusa('rodadas', `Esta tarefa já usou as ${LIMITE_RODADAS} rodadas de delegação. Feche com o que tem e diga ao CEO o que falta.`);
	return null;
}

// ------------------------------------------------------------ linha de comando

export type Argumentos =
	| { comando: 'delegar'; alvo: string; titulo: string | null; pedido: string | null; tarefa: string | null; como: string | null }
	| { comando: 'estado'; alvo: string | null; tarefa: string | null; como: string | null }
	| { comando: 'equipe'; tarefa: string | null; como: string | null }
	| { comando: 'ajuda' };

const OPCOES = ['titulo', 'pedido', 'tarefa', 'como'];

/** argv sem 'node' e o script. Erro de uso → { erro } (o equipe.mjs sai com 2). */
export function lerArgumentos(argv: string[]): Argumentos | { erro: string } {
	const lista = (argv ?? []).map(String);
	if (!lista.length || lista.some((a) => a === '--help' || a === '-h')) return { comando: 'ajuda' };
	const [comando, ...resto] = lista;
	if (comando === 'ajuda' || comando === 'help') return { comando: 'ajuda' };
	if (comando !== 'delegar' && comando !== 'estado' && comando !== 'equipe')
		return { erro: `Comando desconhecido "${comando}". Os comandos são: delegar, estado, equipe e ajuda.` };

	const opcoes: Record<string, string> = {};
	const soltos: string[] = [];
	for (let i = 0; i < resto.length; i++) {
		const a = resto[i];
		if (!a.startsWith('--')) {
			soltos.push(a);
			continue;
		}
		const igual = a.indexOf('=');
		const nome = igual > 0 ? a.slice(2, igual) : a.slice(2);
		if (!OPCOES.includes(nome)) return { erro: `Opção desconhecida "${igual > 0 ? a.slice(0, igual) : a}". As opções são: --titulo, --pedido, --tarefa e --como.` };
		if (igual > 0) opcoes[nome] = a.slice(igual + 1);
		else {
			const valor = resto[i + 1];
			if (valor === undefined || valor.startsWith('--')) return { erro: `Falta o valor de --${nome}.` };
			opcoes[nome] = valor;
			i++;
		}
	}
	const tarefa = opcoes.tarefa ?? null;
	const como = opcoes.como ?? null;

	if (comando === 'delegar') {
		if (!soltos.length || !soltos[0].trim()) return { erro: `Falta o agente: ${COMANDO} delegar <id> --titulo "…"` };
		if (soltos.length > 1) return { erro: `Sobrou "${soltos[1]}": o pedido vai pelo stdin ou com --pedido "…".` };
		return { comando, alvo: soltos[0], titulo: opcoes.titulo ?? null, pedido: opcoes.pedido ?? null, tarefa, como };
	}
	if (opcoes.titulo !== undefined || opcoes.pedido !== undefined) return { erro: '--titulo e --pedido só valem no delegar.' };
	if (comando === 'estado') {
		if (soltos.length > 1) return { erro: `Sobrou "${soltos[1]}": o estado recebe no máximo um número ou id.` };
		return { comando, alvo: soltos[0] ?? null, tarefa, como };
	}
	if (soltos.length) return { erro: `O comando equipe não recebe "${soltos[0]}".` };
	return { comando, tarefa, como };
}

export function textoDeAjuda(): string {
	return [
		'Equipe do DGathe: o líder passa trabalho aos especialistas da equipe de dentro da tarefa dele; o diretor, aos gerentes das equipes.',
		'',
		`${COMANDO} delegar <id> --titulo "Título curto" <<'PEDIDO'`,
		'Objetivo, contexto, arquivos e pastas, critérios de aceitação e o que entregar.',
		'PEDIDO',
		'    Cria uma subtarefa para <id> nesta tarefa. O pedido vai pelo stdin (a linha PEDIDO fecha',
		'    o texto e começa na coluna 1) ou com --pedido "…". Sem --titulo, o título é a 1ª linha do pedido.',
		`${COMANDO} estado [<número>|<id>]`,
		'    As subtarefas desta tarefa. Com o número da lista (ou o começo do id), uma inteira.',
		`${COMANDO} equipe`,
		'    Quem é da equipe e o que cada um faz agora (para um diretor: os gerentes e os outros diretores).',
		`${COMANDO} ajuda`,
		'    Este texto.',
		'',
		`Regras: o líder delega só para agentes ativos da própria equipe; o diretor, só para os gerentes; ninguém para si. Subtarefa não cria subtarefa, a não ser a do gerente que recebeu de um diretor (dois níveis no máximo). Até ${LIMITE_ABERTAS} subtarefas abertas e ${LIMITE_RODADAS} rodadas de delegação por tarefa.`,
		'Depois de delegar, encerre a rodada com um texto curto: quando todas as subtarefas abertas terminarem, o retorno de cada uma chega nesta conversa.',
		'',
		'Fora de uma sessão (teste): --tarefa <uuid> no lugar de DGATHE_TAREFA e --como <agente> no lugar de DGATHE_AGENTE.',
		'Saídas: 0 deu certo · 1 erro inesperado · 2 uso errado · 3 recusado.'
	].join('\n');
}

// ------------------------------------------------------------ textos para o líder

export type SubtarefaResumo = {
	id: string;
	agente_id: string;
	agente_nome: string;
	agente_cargo: string;
	titulo: string;
	status: StatusTarefa;
	atividade: string | null;
	resultado: string | null;
	erro: string | null;
	pedidos: number;
	rodada_do_pai: number;
	relatada_em: string | Date | null;
};

export function textoDelegada(d: {
	destino: { nome: string; cargo: string };
	titulo: string;
	id: string;
	rodada: number;
	rodadasUsadas: number;
	abertas: number;
	espera: number;
}): string {
	const quando = d.espera > 0 ? `Começa em cerca de ${d.espera} s.` : 'Começa em instantes.';
	return [
		`Subtarefa criada para ${d.destino.nome} (${d.destino.cargo}): "${d.titulo}"`,
		`id ${curto(d.id)} · rodada ${d.rodada} · rodadas de delegação: ${d.rodadasUsadas} de ${LIMITE_RODADAS} · abertas nesta tarefa: ${d.abertas} de ${LIMITE_ABERTAS}`,
		`${quando} Quando todas as subtarefas abertas terminarem, o retorno de cada uma chega nesta conversa.`
	].join('\n');
}

function cabecalhoDaSubtarefa(n: number, s: SubtarefaResumo): string[] {
	const pedidos = Number(s.pedidos) || 0;
	const pend = pedidos > 0 && (s.status === 'trabalhando' || s.status === 'esperando') ? ` (${plural(pedidos, 'pedido', 'pedidos')})` : '';
	const entregue = s.relatada_em ? ' · já entregue no retorno' : '';
	return [
		`${n}. ${s.agente_id} · ${s.agente_nome} (${s.agente_cargo}) · ${nomeDoStatus(s.status)}${pend} · rodada ${s.rodada_do_pai}${entregue}`,
		`   ${s.titulo}`
	];
}

/** A terceira linha de cada subtarefa no `estado`: o que faz agora, o resultado resumido ou o erro. */
function situacaoCurta(s: SubtarefaResumo): string | null {
	if (aberta(s)) return s.atividade?.trim() ? `Agora: ${umaLinha(s.atividade, 160)}` : null;
	if (s.status === 'concluida') return s.resultado?.trim() ? `Resultado: ${umaLinha(s.resultado, 200)}` : '(terminou sem texto final)';
	if (s.erro?.trim()) return `Erro: ${umaLinha(s.erro, 200)}`;
	return s.status === 'cancelada' ? '(parada antes de terminar)' : null;
}

export function textoDoEstado(t: { id: string; rodada: number }, subs: SubtarefaResumo[]): string {
	if (!subs.length) return 'Esta tarefa ainda não tem subtarefas.';
	const linhas = [
		`Tarefa ${curto(t.id)} · rodada ${rodadaAtual(t)} · rodadas de delegação: ${rodadasUsadas(subs)} de ${LIMITE_RODADAS} · abertas: ${contarAbertas(subs)} de ${LIMITE_ABERTAS}`,
		''
	];
	subs.forEach((s, i) => {
		linhas.push(...cabecalhoDaSubtarefa(i + 1, s));
		const situacao = situacaoCurta(s);
		if (situacao) linhas.push(`   ${situacao}`);
	});
	linhas.push('', `Ver uma inteira: ${COMANDO} estado <número>`);
	return linhas.join('\n');
}

/**
 * chave = número da lista (1..n), prefixo do id com 4+ caracteres ou o id do
 * agente (a mais recente dele). Prefixo que bate com duas → null.
 */
export function acharSubtarefa<T extends SubtarefaResumo>(subs: T[], chave: string): T | null {
	const k = String(chave ?? '').trim().toLowerCase();
	if (!k) return null;
	if (/^\d+$/.test(k)) {
		const n = Number(k);
		if (n >= 1 && n <= subs.length) return subs[n - 1];
	}
	if (k.length >= 4) {
		const pelo = subs.filter((s) => s.id.toLowerCase().startsWith(k));
		if (pelo.length === 1) return pelo[0];
		if (pelo.length > 1) return null;
	}
	const doAgente = subs.filter((s) => s.agente_id === k);
	return doAgente.length ? doAgente[doAgente.length - 1] : null;
}

export function textoDaSubtarefa(n: number, s: SubtarefaResumo & { pedido: string }): string {
	const linhas = [...cabecalhoDaSubtarefa(n, s), `   id ${s.id}`];
	if (aberta(s) && s.atividade?.trim()) linhas.push(`   Agora: ${umaLinha(s.atividade, 160)}`);
	linhas.push('', 'Pedido:', String(s.pedido ?? '').trim(), '');
	if (aberta(s)) linhas.push('Resultado:', '(ainda não terminou)');
	else if (s.status === 'concluida') linhas.push('Resultado:', s.resultado?.trim() || '(terminou sem texto final)');
	else if (s.erro?.trim()) linhas.push('Erro:', s.erro.trim());
	else if (s.status === 'cancelada') linhas.push('Resultado:', '(parada antes de terminar)');
	else linhas.push('Erro:', '(sem detalhe)');
	return linhas.join('\n');
}

export type Membro = {
	id: string;
	nome: string;
	cargo: string;
	lider: boolean;
	agora: { status: StatusTarefa; titulo: string; atividade: string | null } | null;
	naFila: number;
};

/** O `equipe`: quem é da equipe e o que faz agora. `naFila` = tarefas na fila além da de `agora`. */
/** "livre", "trabalhando: …" etc., mais a fila, para as listas do `equipe`. */
function agoraDoMembro(m: Membro): string {
	const naFila = Number(m.naFila) || 0;
	let agora = 'livre';
	let fila = naFila ? ` · ${naFila} na fila` : '';
	if (m.agora) {
		const titulo = `"${umaLinha(m.agora.titulo, 80)}"`;
		if (m.agora.status === 'trabalhando')
			agora = `trabalhando: ${titulo}${m.agora.atividade?.trim() ? ` (${umaLinha(m.agora.atividade, 60)})` : ''}`;
		else if (m.agora.status === 'esperando') agora = `esperando resposta do CEO: ${titulo}`;
		else if (m.agora.status === 'aguardando') agora = `esperando a equipe: ${titulo}`;
		else {
			agora = `na fila: ${titulo}`;
			fila = naFila ? ` · mais ${naFila} na fila` : '';
		}
	}
	return `${agora}${fila}`;
}

export function textoDaEquipe(equipe: string, membros: Membro[], euId: string): string {
	const lider = membros.find((m) => m.lider);
	const linhas = [`Equipe ${equipe} · ${lider ? `líder: ${lider.nome} (${lider.id})` : 'sem líder ativo'}`];
	for (const m of membros) {
		const voce = m.id === euId ? ' (você)' : '';
		linhas.push(`- ${m.id} · ${m.nome}${voce} · ${m.cargo} · ${agoraDoMembro(m)}`);
	}
	if (!membros.length) linhas.push('(ninguém ativo nesta equipe)');
	linhas.push(`Para delegar: ${COMANDO} delegar <id> --titulo "…" <<'PEDIDO' … PEDIDO`);
	return linhas.join('\n');
}

/**
 * O `equipe` de um diretor: os gerentes (quem recebe o trabalho dele), com a
 * equipe e quantos ativos ela tem, e os outros diretores.
 */
export function textoDaDiretoria(gerentes: (Membro & { equipe: string; membros: number })[], diretores: Membro[], euId: string): string {
	const linhas = ['Diretoria · gerentes que recebem trabalho:'];
	for (const g of gerentes)
		linhas.push(`- ${g.id} · ${g.nome} · ${g.cargo} · equipe ${g.equipe} (${plural(g.membros, 'ativo', 'ativos')}) · ${agoraDoMembro(g)}`);
	if (!gerentes.length) linhas.push('(nenhum gerente ativo: faça você ou diga ao CEO o que precisa)');
	linhas.push('Diretores:');
	for (const d of diretores) linhas.push(`- ${d.id} · ${d.nome}${d.id === euId ? ' (você)' : ''} · ${d.cargo} · ${agoraDoMembro(d)}`);
	linhas.push(`Para delegar a um gerente: ${COMANDO} delegar <id> --titulo "…" <<'PEDIDO' … PEDIDO`);
	return linhas.join('\n');
}

// ------------------------------------------------------------ retorno da equipe

/**
 * A linha com que a ponte apresenta a mensagem de uma pessoa ao agente
 * (mensagemParaOAgente, em ponte.ts). O retorno passa sem esse cabeçalho, então
 * uma entrega (que pode ter lido instrução maliciosa num arquivo) conseguiria
 * imitar "Mensagem de Bruno Santana pelo DGathe:" e fingir uma aprovação do CEO.
 * Dentro da entrega a linha vira citação marcada.
 */
const LINHA_DE_MENSAGEM = /^([ \t>]*)(Mensagem de .* pelo DGathe:[ \t]*)$/gm;

export function semCabecalhoDeMensagem(texto: string): string {
	return texto.replace(LINHA_DE_MENSAGEM, '$1(citado na entrega) $2');
}

/**
 * O "Retorno da equipe" que a ponte grava na tarefa-pai (autor 'Equipe') quando
 * a última subtarefa aberta fecha. Cada entrega vai inteira até 8.000
 * caracteres; se o total passar de 38.000, as maiores são cortadas por igual.
 */
export function mensagemDaEquipe(subs: SubtarefaResumo[], rodada: number): string {
	const fim = '---\nRevise as entregas e as evidências. Mande corrigir com uma nova delegação ou feche com o Relatório de conclusão.';
	if (!subs.length)
		return `Retorno da equipe (rodada ${rodada}): nenhuma subtarefa nova terminou desde o último retorno. Todas as subtarefas desta tarefa estão fechadas.\n\n${fim}`;

	const topo = `Retorno da equipe (rodada ${rodada}): ${subs.length} ${subs.length === 1 ? 'subtarefa terminou' : 'subtarefas terminaram'}.`;
	const partes = subs.map((s) => {
		const cabeca = `## ${s.agente_nome} · ${s.agente_cargo} · ${nomeDoStatus(s.status)}\nTarefa: ${s.titulo}\n`;
		let rotulo = '';
		let corpo: string;
		if (s.status === 'concluida') corpo = s.resultado?.trim() || '(terminou sem texto final)';
		else if (s.erro?.trim()) {
			rotulo = 'Erro: ';
			corpo = s.erro.trim();
		} else if (s.status === 'cancelada') corpo = '(parada antes de terminar)';
		else if (s.status === 'falhou') {
			rotulo = 'Erro: ';
			corpo = '(sem detalhe)';
		} else corpo = s.resultado?.trim() || `(${nomeDoStatus(s.status).toLowerCase()})`;
		corpo = semCabecalhoDeMensagem(corpo);
		return { fixo: cabeca + rotulo, corpo, sufixo: `… (cortado: veja tudo com ${COMANDO} estado ${curto(s.id)})` };
	});

	// Quanto sobra para os corpos depois do que é fixo (topo, cabeçalhos, separadores, fim)
	const fixo = topo.length + 2 + partes.reduce((n, p) => n + p.fixo.length + 2, 0) + fim.length;
	const teto = tetoPorIgual(
		partes.map((p) => Math.min(p.corpo.length, LIMITE_POR_ENTREGA)),
		Math.max(0, LIMITE_RETORNO - fixo)
	);
	const blocos = partes.map((p) => {
		const limite = Math.min(LIMITE_POR_ENTREGA, teto);
		if (p.corpo.length <= limite) return p.fixo + p.corpo;
		const cabe = Math.max(0, limite - p.sufixo.length);
		return p.fixo + p.corpo.slice(0, cabe).trimEnd() + p.sufixo;
	});
	const texto = `${topo}\n\n${blocos.join('\n\n')}\n\n${fim}`;
	// Garantia final (só com centenas de subtarefas os cabeçalhos sozinhos passariam)
	return texto.length > LIMITE_RETORNO ? texto.slice(0, LIMITE_RETORNO - 1) + '…' : texto;
}

/** O maior teto t tal que a soma de min(tamanho, t) cabe no orçamento ("encher por igual"). */
function tetoPorIgual(tamanhos: number[], orcamento: number): number {
	const total = tamanhos.reduce((a, b) => a + b, 0);
	if (total <= orcamento) return Infinity;
	const ordem = [...tamanhos].sort((a, b) => a - b);
	let resta = orcamento;
	for (let i = 0; i < ordem.length; i++) {
		const porCabeca = Math.floor(resta / (ordem.length - i));
		if (ordem[i] > porCabeca) return porCabeca;
		resta -= ordem[i];
	}
	return Infinity;
}

// ------------------------------------------------------------ fim da rodada

/**
 * A decisão da seção 2.3 do contrato, quando a sessão de uma rodada fecha:
 * Parar vence tudo; mensagem que ainda não chegou ao agente devolve para a
 * fila; equipe com subtarefa aberta ou não relatada deixa a tarefa
 * `aguardando`; senão fica o que a base disse.
 */
export function fimDaRodada(o: {
	base: 'concluida' | 'falhou' | 'cancelada';
	atividade: string;
	mensagemPendente: boolean;
	pendenciaDeEquipe: boolean;
}): { status: 'concluida' | 'falhou' | 'cancelada' | 'fila' | 'aguardando'; atividade: string; terminada: boolean } {
	if (o.base === 'cancelada') return { status: 'cancelada', atividade: o.atividade, terminada: true };
	if (o.mensagemPendente) return { status: 'fila', atividade: 'Na fila para continuar', terminada: false };
	if (o.pendenciaDeEquipe) return { status: 'aguardando', atividade: 'Esperando a equipe', terminada: false };
	return { status: o.base, atividade: o.atividade, terminada: true };
}

// ------------------------------------------------------------ fechamento semanal

export type Periodo = { sexta: string; inicio: Date; fim: Date; rotulo: string };

const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;
/** Brasília = UTC−3 o ano inteiro (sem horário de verão desde 2019). */
const FUSO_MS = -3 * HORA_MS;
/** Sexta 17h a segunda 17h: se a ponte estava desligada na sexta, ainda cria até segunda. */
const JANELA_MS = 72 * HORA_MS;

/** O relógio de Brasília, para ler com os métodos UTC. */
function emBrasilia(d: Date): Date {
	return new Date(d.getTime() + FUSO_MS);
}

function doisDigitos(n: number): string {
	return String(n).padStart(2, '0');
}

/** 'dd/mm' (ou 'dd/mm/aaaa') no fuso de Brasília. */
export function dataCurta(d: Date | string, comAno = false): string {
	const b = emBrasilia(new Date(d));
	const base = `${doisDigitos(b.getUTCDate())}/${doisDigitos(b.getUTCMonth() + 1)}`;
	return comAno ? `${base}/${b.getUTCFullYear()}` : base;
}

/** '2026-11-13' → '13/11/2026'. */
export function dataDaSexta(sexta: string): string {
	const [a, m, d] = String(sexta).split('-');
	return `${d}/${m}/${a}`;
}

function montarPeriodo(fim: Date): Periodo {
	const inicio = new Date(fim.getTime() - 7 * DIA_MS);
	const b = emBrasilia(fim);
	const sexta = `${b.getUTCFullYear()}-${doisDigitos(b.getUTCMonth() + 1)}-${doisDigitos(b.getUTCDate())}`;
	const outroAno = emBrasilia(inicio).getUTCFullYear() !== b.getUTCFullYear();
	return { sexta, inicio, fim, rotulo: `${dataCurta(inicio, outroAno)} a ${dataCurta(fim, true)}` };
}

/** A sexta 17h (Brasília) mais recente que já passou, ou igual a agora. */
function ultimaSexta17(agora: Date): number {
	const b = emBrasilia(agora);
	const desdeSexta = (b.getUTCDay() - 5 + 7) % 7;
	let sexta = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() - desdeSexta, 17);
	if (sexta > b.getTime()) sexta -= 7 * DIA_MS;
	return sexta - FUSO_MS;
}

/** A sexta 17h (Brasília) mais recente ≤ agora, se faz menos de 72 h; senão null. inicio = fim − 7 dias. */
export function periodoDoFechamento(agora: Date): Periodo | null {
	const t = agora.getTime();
	if (!Number.isFinite(t)) return null;
	const fim = ultimaSexta17(agora);
	return t - fim < JANELA_MS ? montarPeriodo(new Date(fim)) : null;
}

/** A próxima sexta 17h (Brasília) depois de agora: para o --conferir dizer quando sai o próximo. */
export function proximoFechamento(agora: Date): Date {
	return new Date(ultimaSexta17(agora) + 7 * DIA_MS);
}

/** Para o --fechamento manual. Lança erro se não for 'AAAA-MM-DD' de uma sexta-feira. */
export function periodoDaSexta(sexta: string): Periodo {
	const erro = () => new Error('--sexta precisa ser uma sexta-feira no formato AAAA-MM-DD.');
	const m = String(sexta ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) throw erro();
	const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const meioDia = new Date(Date.UTC(a, mes - 1, d, 12));
	if (meioDia.getUTCFullYear() !== a || meioDia.getUTCMonth() !== mes - 1 || meioDia.getUTCDate() !== d) throw erro();
	if (meioDia.getUTCDay() !== 5) throw erro();
	return montarPeriodo(new Date(Date.UTC(a, mes - 1, d, 17) - FUSO_MS));
}

export type LinhaDoFechamento = {
	id: string;
	pai_id: string | null;
	agente_id: string;
	agente_nome: string;
	titulo: string;
	status: StatusTarefa;
	criada_por_nome: string;
	criada_em: string | Date;
	terminada_em: string | Date | null;
	resumo: string | null;
	erro: string | null;
};

function terminou(l: { status: string }): boolean {
	return (STATUS_TERMINADOS as string[]).includes(l.status);
}

/**
 * Título e pedido da tarefa de fechamento semanal (seção 5.3). Agrupa por
 * tarefa principal com as subtarefas embaixo; subtarefa cuja principal não
 * veio aparece como item próprio. `liderId` (opcional) separa o que foi pedido
 * ao líder do que o CEO passou direto a um especialista. Nunca passa de 20.000.
 */
export function pedidoDoFechamento(
	p: Periodo,
	equipe: string,
	linhas: LinhaDoFechamento[],
	liderId?: string | null
): { titulo: string; pedido: string } {
	const titulo = `Fechamento semanal · ${p.rotulo}`;
	const outroAno = emBrasilia(p.inicio).getUTCFullYear() !== emBrasilia(p.fim).getUTCFullYear();
	const abertura = `Fechamento semanal da equipe ${equipe}: de sexta ${dataCurta(p.inicio, outroAno)} às 17h a sexta ${dataCurta(p.fim, true)} às 17h (horário de Brasília).`;

	if (!linhas.length) {
		const pedido = [
			abertura,
			'',
			'O que o DGathe registrou na semana:',
			'(nenhuma tarefa da equipe registrada nesta semana)',
			'Responda em até 5 linhas dizendo que a semana não teve projetos no DGathe e o que está planejado, sem salvar arquivo.'
		].join('\n');
		return { titulo, pedido };
	}

	const principais = new Set(linhas.filter((l) => !l.pai_id).map((l) => l.id));
	const filhas = new Map<string, LinhaDoFechamento[]>();
	const itens: { linha: LinhaDoFechamento; subs: LinhaDoFechamento[] }[] = [];
	for (const l of linhas) {
		if (l.pai_id && principais.has(l.pai_id)) {
			const lista = filhas.get(l.pai_id) ?? [];
			lista.push(l);
			filhas.set(l.pai_id, lista);
		}
	}
	for (const l of linhas) {
		if (!l.pai_id || !principais.has(l.pai_id)) itens.push({ linha: l, subs: filhas.get(l.id) ?? [] });
	}

	const cabeca = [
		abertura,
		'',
		'Monte o "Fechamento semanal" do manual do departamento (p. 17) e entregue como texto final desta tarefa, com estes campos, nesta ordem: Período, Concluídos, Entregas, Responsáveis, Em andamento, Impedimentos, Próxima semana, Decisões.',
		'- Use o que está abaixo e os relatórios de conclusão salvos na semana. Separe o que foi feito, o que foi testado e o que é estimativa. Não invente progresso.',
		'- Não repita os relatórios individuais inteiros: resuma e aponte o arquivo.',
		`- Salve uma cópia onde as suas instruções mandam, com o nome ${p.sexta}-fechamento-semanal.md.`,
		'- Não delegue nesta tarefa: o que precisa está aqui e nos relatórios.',
		'',
		`O que o DGathe registrou na semana (${plural(itens.length, 'tarefa', 'tarefas')}):`,
		'',
		'' // a lista começa depois de uma linha em branco
	].join('\n');

	const blocos: string[] = [];
	let total = cabeca.length;
	// Reserva para a linha "… e mais N tarefas"
	const reserva = 60;
	let usados = 0;
	for (const it of itens) {
		if (usados >= LIMITE_ITENS_DO_FECHAMENTO) break;
		const bloco = textoDoItem(usados + 1, it.linha, it.subs, liderId ?? null);
		if (total + bloco.length + 1 > LIMITE_PEDIDO - reserva) break;
		blocos.push(bloco);
		total += bloco.length + 1;
		usados++;
	}
	const resto = itens.length - usados;
	if (resto > 0) blocos.push(`… e mais ${plural(resto, 'tarefa', 'tarefas')}`);
	const pedido = cabeca + blocos.join('\n');
	return { titulo, pedido: pedido.length > LIMITE_PEDIDO ? pedido.slice(0, LIMITE_PEDIDO - 1) + '…' : pedido };
}

function textoDoItem(n: number, l: LinhaDoFechamento, subs: LinhaDoFechamento[], liderId: string | null): string {
	const quem = l.criada_por_nome?.trim() || 'alguém da equipe';
	const quando = dataCurta(l.criada_em);
	const origem = l.pai_id
		? `pedida por ${quem} em ${quando} (subtarefa de um projeto de outra semana)`
		: `${liderId && l.agente_id !== liderId ? 'direto de' : 'pedida por'} ${quem} em ${quando}`;
	const fim = l.terminada_em && terminou(l) ? ` · terminou em ${dataCurta(l.terminada_em)}` : '';
	const linhas = [`${n}. [${nomeDoStatus(l.status)}] ${umaLinha(l.titulo, 80)} · ${l.agente_nome} · ${origem}${fim}`];
	if (l.status === 'concluida' && l.resumo?.trim()) linhas.push(`   Resumo: ${umaLinha(l.resumo, 200)}`);
	else if ((l.status === 'falhou' || l.status === 'cancelada') && l.erro?.trim()) linhas.push(`   Erro: ${umaLinha(l.erro, 200)}`);
	for (const s of subs.slice(0, LIMITE_SUBS_POR_ITEM)) {
		let linha = `   - [${nomeDoStatus(s.status)}] ${s.agente_nome}: ${umaLinha(s.titulo, 80)}`;
		if ((s.status === 'falhou' || s.status === 'cancelada') && s.erro?.trim()) linha += ` (erro: ${umaLinha(s.erro, 200)})`;
		else if (s.status === 'concluida' && s.resumo?.trim()) linha += ` · ${umaLinha(s.resumo, 200)}`;
		linhas.push(linha);
	}
	if (subs.length > LIMITE_SUBS_POR_ITEM) linhas.push(`   - … e mais ${plural(subs.length - LIMITE_SUBS_POR_ITEM, 'subtarefa', 'subtarefas')}`);
	return linhas.join('\n');
}
