// A rotina dos agentes no escritório: onde cada um está a cada momento.
//
// Pedido do Bruno (10/11/2026): "80% do tempo deles nas salas trabalhando";
// nos outros 20%, fracionados em momentos aleatórios do dia, podem andar pelo
// escritório, jogar pingue-pongue, ficar na copa, passear pelos outros setores,
// "mas não ocupar as mesas de outros agentes". Chamados para uma reunião de
// alinhamento, vão até a sala e, no fim, voltam para os postos.
//
// Regras, nesta ordem:
//   1. Reunião: vai para a sala da reunião (uma cadeira de lá para cada um)
//   2. Com tarefa: no posto (a cadeira de trabalho dele), sempre
//   3. Na pausa: 12 min por hora (20%), às vezes em dois pedaços de 6 min, num
//      horário sorteado por agente e por hora. Faz uma atividade: copa, sofá,
//      passeio por outro setor ou pingue-pongue (só com parceiro em pausa junto)
//   4. Senão: no posto
// Tudo sai de contas sobre o id do agente e a hora: todas as telas mostram a
// mesma coisa sem combinar nada (uns segundos de diferença de relógio entre as
// telas só adiantam ou atrasam a saída para a pausa).

import { assentos, hashTexto, type Assento } from './assentos';
import { aEstrela, type Grade } from './caminho';
import { ALTURA, INICIO, ITENS, LARGURA, SALA_POR_ID, celulaLivre, paredeEntre, zonaDaCelula } from './mapa';

export const HORA = 60 * 60;
/** Pausa por hora: 12 min = 20% do tempo. */
export const PAUSA_POR_HORA = 12 * 60;

export type Atividade = 'copa' | 'sofa' | 'passeio' | 'pinguePongue';
const ATIVIDADES: Atividade[] = ['copa', 'sofa', 'passeio', 'pinguePongue'];

export const NOME_DA_ATIVIDADE: Record<Atividade, string> = {
	copa: 'na pausa do café',
	sofa: 'descansando',
	passeio: 'dando uma volta',
	pinguePongue: 'jogando pingue-pongue'
};

export type Pausa = { atividade: Atividade; inicio: number; fim: number; semente: number };

/** As pausas de um agente numa hora (número da hora desde 1970): somam sempre 12 min. */
export function pausasDaHora(id: string, hora: number): Pausa[] {
	const h = hashTexto(`${id}:pausa:${hora}`);
	const base = hora * HORA;
	const atividade = (k: number) => ATIVIDADES[(h >>> (6 + k * 5)) % ATIVIDADES.length];
	// Uma em cada três horas, a pausa vem em dois pedaços (um em cada meia hora)
	if ((h >>> 3) % 3 === 0) {
		const meia = HORA / 2;
		const pedaco = PAUSA_POR_HORA / 2;
		const a = base + (h % (meia - pedaco));
		const b = base + meia + (hashTexto(`${id}:pausa2:${hora}`) % (meia - pedaco));
		return [
			{ atividade: atividade(0), inicio: a, fim: a + pedaco, semente: h },
			{ atividade: atividade(1), inicio: b, fim: b + pedaco, semente: (h ^ 0x5bd1e995) >>> 0 }
		];
	}
	const inicio = base + (h % (HORA - PAUSA_POR_HORA));
	return [{ atividade: atividade(0), inicio, fim: inicio + PAUSA_POR_HORA, semente: h }];
}

/** A pausa em andamento agora (segundos desde 1970), ou null. */
export function pausaAgora(id: string, agoraS: number): Pausa | null {
	const hora = Math.floor(agoraS / HORA);
	return pausasDaHora(id, hora).find((p) => agoraS >= p.inicio && agoraS < p.fim) ?? null;
}

// ------------------------------------------------------------ lugares de pausa

const GRADE: Grade = { largura: LARGURA, altura: ALTURA, livre: celulaLivre, parede: paredeEntre };
const INI = { x: Math.floor(INICIO.x), y: Math.floor(INICIO.y) };

function emPe(id: string, sala: string, x: number, y: number, dirX = 0.7, dirY = 0.7): Assento {
	return { id, sala, movel: 'em-pe', nome: 'Em pé', x, y, sx: x, sy: y, ox: x, oy: y, dirX, dirY, sentado: false };
}

const cachePasseio = new Map<string, Assento[]>();
/**
 * Lugares em pé numa sala para quem passeia: chão livre, alcançável, longe
 * das cadeiras (não fica em cima de mesa nem na frente da cadeira de ninguém).
 */
export function pontosDePasseio(sala: string): Assento[] {
	const pronto = cachePasseio.get(sala);
	if (pronto) return pronto;
	const s = SALA_POR_ID.get(sala);
	const lista: Assento[] = [];
	if (s) {
		const chegadas = assentos().map((a) => ({ x: a.x, y: a.y }));
		const usados: { x: number; y: number }[] = [];
		for (let y = s.y0; y <= s.y1; y++) {
			for (let x = s.x0; x <= s.x1; x++) {
				if (!celulaLivre(x, y) || zonaDaCelula(x, y) !== sala) continue;
				const cx = x + 0.5;
				const cy = y + 0.5;
				if (chegadas.some((c) => Math.hypot(c.x - cx, c.y - cy) < 1.1)) continue;
				if (usados.some((u) => Math.abs(u.x - x) + Math.abs(u.y - y) < 2)) continue;
				if (!aEstrela(GRADE, INI, { x, y })) continue;
				usados.push({ x, y });
				lista.push(emPe(`${sala}:passeio:${x},${y}`, sala, cx, cy));
			}
		}
	}
	cachePasseio.set(sala, lista);
	return lista;
}

let cachePingue: Assento[] | null = null;
/**
 * Onde ficam os dois jogadores: nas pontas da mesa, de frente um para o outro.
 * Se uma ponta estiver tapada (na copa, um pufe encosta na ponta direita), os
 * dois jogam pelos lados compridos, frente a frente no meio da mesa.
 */
export function pontasDoPinguePongue(): Assento[] {
	if (cachePingue) return cachePingue;
	const mesa = ITENS.find((i) => i.tipo === 'pingPong');
	cachePingue = [];
	if (!mesa) return cachePingue;
	const sala = mesa.sala ?? 'copa';
	const livre = (x: number, y: number) => celulaLivre(Math.floor(x), Math.floor(y)) && !!aEstrela(GRADE, INI, { x: Math.floor(x), y: Math.floor(y) });
	const meioX = mesa.x + mesa.w / 2;
	const meioY = mesa.y + mesa.d / 2;
	// Logo depois da última casa que a mesa ocupa (a mesa tampa a casa inteira)
	const pontas = [
		emPe('pingue:oeste', sala, Math.floor(mesa.x) - 0.2, meioY, 1, 0),
		emPe('pingue:leste', sala, Math.ceil(mesa.x + mesa.w) + 0.2, meioY, -1, 0)
	];
	const lados = [
		emPe('pingue:norte', sala, meioX, Math.floor(mesa.y) - 0.2, 0, 1),
		emPe('pingue:sul', sala, meioX, Math.ceil(mesa.y + mesa.d) + 0.2, 0, -1)
	];
	for (const par of [pontas, lados]) {
		if (par.every((p) => livre(p.x, p.y))) {
			cachePingue = par;
			break;
		}
	}
	return cachePingue;
}

/** Salas por onde se passeia (os setores e as áreas comuns). */
const SALAS_DE_PASSEIO = ['recepcao', 'copa', 'reuniao', 'financeiro', 'comercial', 'dev', 'conteudo', 'estudio', 'design', 'trafego'];

// ------------------------------------------------------------ onde cada um fica

export type AgenteNaRotina = {
	id: string;
	/** Sala do posto dele. */
	sala: string;
	ordem: number;
	/** Tem tarefa (trabalhando, esperando resposta, aguardando a equipe ou começando): fica no posto. */
	ocupado: boolean;
	/** Sala da reunião em que está agora, se estiver numa. */
	reuniao: string | null;
};

export type Destino = {
	lugar: Assento;
	motivo: 'posto' | 'pausa' | 'reuniao';
	atividade: Atividade | null;
};

function ordenados<T extends { id: string; ordem: number }>(lista: T[]): T[] {
	return [...lista].sort((a, b) => a.ordem - b.ordem || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Para onde vai cada agente agora. `postos` = a cadeira de trabalho de cada um
 * (agentes.ts); `ocupados` = assentos que já têm dono (os postos de todos os
 * agentes entram aqui): ninguém em pausa ou reunião senta neles.
 */
export function destinosDosAgentes(
	lista: AgenteNaRotina[],
	agoraS: number,
	postos: Map<string, Assento>,
	ocupados: Set<string>
): Map<string, Destino> {
	const r = new Map<string, Destino>();
	const usados = new Set(ocupados);
	const pegar = (candidatos: Assento[], semente: number): Assento | null => {
		const livres = candidatos.filter((c) => !usados.has(c.id));
		if (!livres.length) return null;
		const a = livres[(semente >>> 0) % livres.length];
		usados.add(a.id);
		return a;
	};
	const todos = ordenados(lista);

	// 1) Reunião: as cadeiras da sala, na ordem
	for (const a of todos) {
		if (!a.reuniao) continue;
		const cadeiras = assentos().filter((s) => s.sala === a.reuniao && s.sentado);
		const lugar = cadeiras.find((c) => !usados.has(c.id)) ?? pegar(pontosDePasseio(a.reuniao), hashTexto(a.id));
		if (!lugar) continue;
		usados.add(lugar.id);
		r.set(a.id, { lugar, motivo: 'reuniao', atividade: null });
	}

	// 2) Quem está em pausa (e sem tarefa nem reunião)
	const emPausa = todos
		.filter((a) => !r.has(a.id) && !a.ocupado && postos.has(a.id))
		.map((a) => ({ a, p: pausaAgora(a.id, agoraS) }))
		.filter((x): x is { a: AgenteNaRotina; p: Pausa } => !!x.p);

	// Pingue-pongue só em dupla: os dois primeiros que querem jogar
	const pontas = pontasDoPinguePongue().filter((p) => !usados.has(p.id));
	const querem = emPausa.filter((x) => x.p.atividade === 'pinguePongue');
	const jogam = pontas.length >= 2 && querem.length >= 2 ? querem.slice(0, 2) : [];
	jogam.forEach((x, i) => {
		usados.add(pontas[i].id);
		r.set(x.a.id, { lugar: pontas[i], motivo: 'pausa', atividade: 'pinguePongue' });
	});

	const sofas = assentos().filter((s) => s.movel === 'sofa' || s.movel === 'pufe');
	const naCopa = assentos().filter((s) => s.sala === 'copa' && s.sentado);
	for (const { a, p } of emPausa) {
		if (r.has(a.id)) continue;
		// Sem parceiro para o pingue-pongue: vai para a copa
		const atividade: Atividade = p.atividade === 'pinguePongue' ? 'copa' : p.atividade;
		let lugar: Assento | null = null;
		if (atividade === 'copa') lugar = pegar(naCopa, p.semente) ?? pegar(pontosDePasseio('copa'), p.semente);
		else if (atividade === 'sofa') lugar = pegar(sofas, p.semente);
		else {
			// Passeio por outro setor (nunca o próprio)
			const salas = SALAS_DE_PASSEIO.filter((s) => s !== a.sala && SALA_POR_ID.has(s));
			lugar = pegar(pontosDePasseio(salas[(p.semente >>> 0) % salas.length]), p.semente >>> 4);
		}
		if (!lugar) continue;
		r.set(a.id, { lugar, motivo: 'pausa', atividade });
	}

	// 3) Os outros: no posto
	for (const a of todos) {
		if (r.has(a.id)) continue;
		const posto = postos.get(a.id);
		if (posto) r.set(a.id, { lugar: posto, motivo: 'posto', atividade: null });
	}
	return r;
}
