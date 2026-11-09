// Onde as pessoas sentam no DGathe, e para onde vai quem não está mexendo.
//
// Pedidos do Bruno (09/11/2026):
//   - saiu do dspace (ou sem sinal): sentado nos sofás da recepção
//   - 15 min sem mexer: vai sentar na recepção, na copa ou numa sala sorteada;
//     quem é CEO vai sempre para a Diretoria (primeiro a cadeira do CEO)
//
// Os assentos saem dos próprios móveis do mapa: cada cadeira (virada para
// onde está a `frente` dela), dois lugares por sofá e os pufes. Para cada um:
//   - sx, sy: onde o boneco sentado é desenhado (a beira do assento, os pés no chão)
//   - ox, oy: o ponto que decide quem fica na frente de quem no desenho. De
//     frente para a câmera, fica do lado de fora do móvel (o boneco cobre o
//     encosto); de costas, fica do lado de dentro (o encosto cobre as costas)
//   - x, y: o chão livre ao lado, por onde a pessoa chega antes de sentar

import { ITENS, INICIO, SALA_POR_ID, LARGURA, ALTURA, celulaLivre, paredeEntre, zonaDaCelula, type Item } from './mapa';
import { aEstrela, type Grade } from './caminho';

export type Assento = {
	id: string;
	sala: string;
	/** De que é o lugar (o nome do móvel serve para achar a cadeira do CEO). */
	movel: 'cadeira' | 'sofa' | 'pufe' | 'em-pe';
	nome: string;
	/** Chão livre por onde se chega. */
	x: number;
	y: number;
	/** Onde o boneco sentado é desenhado. */
	sx: number;
	sy: number;
	/** Ponto da ordem de desenho (com caixa pequena, SENTADO_MEIA). */
	ox: number;
	oy: number;
	dirX: number;
	dirY: number;
	/** false = lugar em pé (recepção cheia). */
	sentado: boolean;
};

/** Meia largura da caixa de quem está sentado, na ordem de desenho. */
export const SENTADO_MEIA = 0.1;
/** Distância do ponto de ordem até a beira do móvel. */
const AFASTA = 0.11;

const GRADE: Grade = { largura: LARGURA, altura: ALTURA, livre: celulaLivre, parede: paredeEntre };
const INI = { x: Math.floor(INICIO.x), y: Math.floor(INICIO.y) };

type Base = Omit<Assento, 'x' | 'y'>;

/**
 * Um lugar na beira do móvel, virado para `frente`, na posição `ao` ao longo
 * dela. De frente para a câmera (x, y), o ponto de ordem fica fora do móvel;
 * de costas (-x, -y), do lado de dentro, para o encosto cobrir as costas.
 */
function lugar(it: Item, frente: string, ao: number, id: string): Base | null {
	if (!it.sala || (it.tipo !== 'cadeira' && it.tipo !== 'sofa' && it.tipo !== 'pufe')) return null;
	const { x, y, w, d } = it;
	const base = { id, sala: it.sala, movel: it.tipo, nome: it.nome, sentado: true };
	// De costas, o boneco fica para dentro do assento (no pufe, mais: senta no meio dele)
	const dentro = it.tipo === 'pufe' ? 0.2 : 0.12;
	switch (frente) {
		case 'x':
			return { ...base, sx: x + w + 0.03, sy: ao, ox: x + w + AFASTA, oy: ao, dirX: 1, dirY: 0 };
		case '-x':
			return { ...base, sx: x + dentro, sy: ao, ox: x - AFASTA, oy: ao, dirX: -1, dirY: 0 };
		case 'y':
			return { ...base, sx: ao, sy: y + d + 0.03, ox: ao, oy: y + d + AFASTA, dirX: 0, dirY: 1 };
		case '-y':
			return { ...base, sx: ao, sy: y + dentro, ox: ao, oy: y - AFASTA, dirX: 0, dirY: -1 };
	}
	return null;
}

function gerar(): Base[] {
	const lista: Base[] = [];
	for (const it of ITENS) {
		if (!it.sala) continue;
		const meioX = it.x + it.w / 2;
		const meioY = it.y + it.d / 2;
		if (it.tipo === 'cadeira' && it.frente) {
			const ao = it.frente === 'x' || it.frente === '-x' ? meioY : meioX;
			const l = lugar(it, it.frente, ao, `${it.sala}:${it.id}`);
			if (l) lista.push(l);
		} else if (it.tipo === 'sofa' && it.frente) {
			const ao = it.frente === 'x' || it.frente === '-x' ? [it.y + it.d * 0.27, it.y + it.d * 0.73] : [it.x + it.w * 0.27, it.x + it.w * 0.73];
			ao.forEach((a, i) => {
				const l = lugar(it, it.frente!, a, `${it.sala}:${it.id}:${i}`);
				if (l) lista.push(l);
			});
		} else if (it.tipo === 'pufe') {
			const frente = it.frente ?? 'x';
			const l = lugar(it, frente, frente === 'x' || frente === '-x' ? meioY : meioX, `${it.sala}:${it.id}`);
			if (l) lista.push(l);
		}
	}
	// Em pé, perto da porta da recepção, para quando os sofás lotarem
	for (const [x, y] of [[19.4, 23.4], [21.6, 23.4], [20.5, 23.75]]) {
		lista.push({ id: `recepcao:em-pe:${x}`, sala: 'recepcao', movel: 'em-pe', nome: 'Em pé', sx: x, sy: y, ox: x, oy: y, dirX: 0.7, dirY: 0.7, sentado: false });
	}
	return lista;
}

/** O chão livre da mesma sala, mais perto do assento, que dá para alcançar. */
function chegada(a: Base): { x: number; y: number } | null {
	if (!a.sentado) return { x: a.sx, y: a.sy };
	const candidatas: { x: number; y: number; d: number }[] = [];
	const cx = Math.floor(a.ox);
	const cy = Math.floor(a.oy);
	for (let y = cy - 2; y <= cy + 2; y++) {
		for (let x = cx - 2; x <= cx + 2; x++) {
			if (!celulaLivre(x, y) || zonaDaCelula(x, y) !== a.sala) continue;
			candidatas.push({ x, y, d: Math.hypot(x + 0.5 - a.ox, y + 0.5 - a.oy) });
		}
	}
	candidatas.sort((p, q) => p.d - q.d);
	for (const c of candidatas.slice(0, 6)) {
		if (aEstrela(GRADE, INI, c)) return { x: c.x + 0.5, y: c.y + 0.5 };
	}
	return null;
}

let cache: Assento[] | null = null;

/** Todos os assentos do escritório (calculados uma vez). */
export function assentos(): Assento[] {
	if (cache) return cache;
	cache = [];
	for (const b of gerar()) {
		const c = chegada(b);
		if (c) cache.push({ ...b, ...c });
	}
	return cache;
}

export function assentoPorId(id: string | null | undefined): Assento | null {
	return id ? (assentos().find((a) => a.id === id) ?? null) : null;
}

/** Os lugares de quem saiu do dspace: sofás da recepção e, cheios, em pé perto da porta. */
export function lugaresDeQuemSaiu(): Assento[] {
	return assentos().filter((a) => a.sala === 'recepcao' && (a.movel === 'sofa' || a.movel === 'em-pe'));
}

/** Salas que entram no sorteio de quem não é CEO (além da recepção e da copa). */
const SALAS_DO_SORTEIO = ['reuniao', 'financeiro', 'comercial', 'dev', 'conteudo', 'design', 'trafego', 'estudio'];

/** Número estável a partir de um texto (semente de sorteio). */
export function hashTexto(t: string) {
	let h = 5381;
	for (let i = 0; i < t.length; i++) h = (Math.imul(h, 33) + t.charCodeAt(i)) >>> 0;
	return h;
}

/** Cópia embaralhada, sempre igual para a mesma semente (em qualquer tela). */
export function embaralhar<T>(lista: T[], semente: number): T[] {
	const r = sorteador(semente);
	const copia = [...lista];
	for (let i = copia.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copia[i], copia[j]] = [copia[j], copia[i]];
	}
	return copia;
}

/** Os lugares da Diretoria na ordem do CEO: a cadeira dele, o sofá, as cadeiras de visita. */
export function lugaresDoCeo(): Assento[] {
	const ordem = (a: Assento) => (a.nome === 'Cadeira do CEO' ? 0 : a.movel === 'sofa' ? 1 : 2);
	return assentos()
		.filter((a) => a.sala === 'diretoria' && a.sentado)
		.sort((a, b) => ordem(a) - ordem(b));
}

/** Gerador simples a partir de uma semente (o mesmo sorteio em toda aba). */
function sorteador(semente: number) {
	// Mistura a semente (sementes vizinhas davam o mesmo primeiro sorteio)
	let s = Math.imul((Math.floor(semente) ^ 0x9e3779b9) >>> 0, 0x85ebca6b) >>> 0;
	s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0;
	s = (s ^ (s >>> 16)) >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) / 4294967296;
	};
}

/**
 * Para onde vai quem ficou 15 min sem mexer. CEO: Diretoria (primeiro a
 * cadeira do CEO, depois o sofá, depois as cadeiras de visita). Os outros:
 * recepção, copa ou uma sala sorteada, num lugar livre.
 */
export function escolherAssento(opcoes: { ceo: boolean; ocupados: Set<string>; semente: number }): Assento | null {
	const livres = (sala: string) => assentos().filter((a) => a.sala === sala && a.sentado && !opcoes.ocupados.has(a.id));
	if (opcoes.ceo) {
		const diretoria = lugaresDoCeo().filter((a) => !opcoes.ocupados.has(a.id));
		if (diretoria.length) return diretoria[0];
	}
	const r = sorteador(opcoes.semente);
	const salas = SALAS_DO_SORTEIO.filter((s) => SALA_POR_ID.has(s));
	const sala = salas[Math.floor(r() * salas.length)];
	const opcoesDeSala = ['recepcao', 'copa', sala];
	const primeira = Math.floor(r() * 3);
	for (let i = 0; i < 3; i++) {
		const lista = livres(opcoesDeSala[(primeira + i) % 3]);
		if (lista.length) return lista[Math.floor(r() * lista.length)];
	}
	return null;
}
