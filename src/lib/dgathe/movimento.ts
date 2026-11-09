// O que a tela de um faz quando chega a leitura de outra pessoa (presenca.ts).
//
// Cada leitura vira um ALVO: um assento (inativo, sentado onde escolheu;
// offline, num sofá da recepção) ou um lugar no chão (online: onde está, ou
// para onde está indo, com o carimbo do movimento `mov`). Quem anda grava só o
// destino; a tela de cada um calcula o caminho e anima, com alguns segundos
// de atraso (o Bruno aceitou: melhor atrasado e certo).
//
// Mudou o alvo: anda até ele (levantando antes, se estava sentado). O mesmo
// alvo de novo, ou um lugar com carimbo mais velho, não mexe em nada: era o
// defeito de 09/11/2026 (o boneco andava, voltava ao começo e pulava de novo).

import type { Assento } from './assentos';
import { assentoPorId, lugaresDeQuemSaiu } from './assentos';
import type { Pessoa } from './presenca';

export type Alvo = { chave: string; mov: number; assento: Assento | null; x: number; y: number };

/**
 * O alvo de cada pessoa da lista. Quem está offline ocupa os lugares da
 * recepção que nenhum inativo pegou, na ordem dos ids: a conta dá igual em
 * todas as telas, porque todas recebem a mesma lista.
 */
export function alvos(lista: Pessoa[]): Map<string, Alvo> {
	const usados = new Set(lista.filter((p) => p.situacao === 'inativo' && p.assento).map((p) => p.assento));
	const recepcao = lugaresDeQuemSaiu().filter((a) => !usados.has(a.id));
	const offline = lista
		.filter((p) => p.situacao === 'offline')
		.map((p) => p.id)
		.sort();
	const r = new Map<string, Alvo>();
	for (const p of lista) {
		let assento: Assento | null = null;
		if (p.situacao === 'offline' && recepcao.length) assento = recepcao[offline.indexOf(p.id) % recepcao.length];
		else if (p.situacao === 'inativo') assento = assentoPorId(p.assento);
		r.set(
			p.id,
			assento
				? { chave: `a:${assento.id}`, mov: p.mov, assento, x: assento.x, y: assento.y }
				: { chave: `l:${p.mov}`, mov: p.mov, assento: null, x: p.x, y: p.y }
		);
	}
	return r;
}

/** Anda até o alvo novo, ou fica como está. */
export function deveMover(atual: { chave: string; mov: number }, novo: Alvo): boolean {
	if (novo.chave === atual.chave) return false;
	// Dois lugares no chão: só o movimento mais novo vale
	if (!novo.assento && atual.chave.startsWith('l:') && novo.mov < atual.mov) return false;
	return true;
}
