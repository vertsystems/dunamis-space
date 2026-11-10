// O que a tela de um faz quando chega a leitura de outra pessoa (presenca.ts).
//
// Cada leitura vira um ALVO: um assento ou um lugar no chão (online: onde
// está, ou para onde está indo, com o carimbo do movimento `mov`). Quem anda
// grava só o destino; a tela de cada um calcula o caminho e anima, com
// alguns segundos de atraso (o Bruno aceitou: melhor atrasado e certo).
//
// Quem não está mexendo senta (pedidos do Bruno, 09/11/2026):
//   - ausente (15 min sem mexer): no lugar que o próprio navegador escolheu
//   - offline (saiu): nos sofás da recepção
//   - e, a cada TROCA_DE_AMBIENTE (3 h) parado, muda para um lugar sorteado
//     em qualquer sala, "para dar um ar de vida". CEO fica sempre na Diretoria
//     (desde 10/11/2026, Bruno e Aline na sala de cada um, que fica fora do sorteio)
//   - ninguém senta onde outra pessoa (ou, na próxima fase, um agente) já está
// Todas as telas recebem a mesma lista e fazem a mesma conta: o sorteio usa o
// id da pessoa, desde quando ela está parada e a rodada, nos segundos do
// servidor. Cada pessoa tem a sua ordem de lugares e fica com o primeiro
// livre, então alguém chegando não embaralha o lugar dos outros.
//
// Mudou o alvo: anda até ele (levantando antes, se estava sentado). O mesmo
// alvo de novo, ou um lugar com carimbo mais velho, não mexe em nada: era o
// defeito de 09/11/2026 (o boneco andava, voltava ao começo e pulava de novo).

import { assentos, assentoPorId, embaralhar, hashTexto, lugaresDeQuemSaiu, lugaresDoCeo, salaComDono, salaDoCeo, type Assento } from './assentos';
import type { Pessoa } from './presenca';

/** De quanto em quanto tempo (s) quem está parado muda de ambiente. */
export const TROCA_DE_AMBIENTE = 3 * 60 * 60;

export type Alvo = { chave: string; mov: number; assento: Assento | null; x: number; y: number };

/** Em que rodada de 3 h a pessoa está (0 = acabou de parar). */
export const rodada = (p: Pick<Pessoa, 'paradoHa'>) => Math.floor(Math.max(0, p.paradoHa) / TROCA_DE_AMBIENTE);

/** A semente do sorteio de uma pessoa numa rodada (igual em todas as telas). */
const semente = (p: Pessoa, n: number) => (hashTexto(p.id) ^ Math.floor(p.paradoDesde ?? 0) ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;

/**
 * O alvo de cada pessoa da lista. `agentes` são os assentos já ocupados por
 * agentes (próxima fase): ninguém senta neles.
 */
export function alvos(lista: Pessoa[], opcoes: { agentes?: Iterable<string> } = {}): Map<string, Alvo> {
	const usados = new Set<string>(opcoes.agentes ?? []);
	const lugar = new Map<string, Assento>();
	const parados = lista.filter((p) => p.situacao !== 'online').sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	const pegar = (p: Pessoa, candidatos: Assento[]) => {
		const a = candidatos.find((x) => !usados.has(x.id));
		if (!a) return false;
		lugar.set(p.id, a);
		usados.add(a.id);
		return true;
	};

	// 1) Ausente na primeira rodada: o lugar que escolheu (CEO: o da sala dele, sempre)
	for (const p of parados) {
		if (p.situacao !== 'inativo' || (rodada(p) > 0 && !p.ceo)) continue;
		const a = assentoPorId(p.assento);
		if (a && (!p.ceo || a.sala === salaDoCeo(p.id))) pegar(p, [a]);
	}
	// 2) CEO parado (ausente, ou offline depois da primeira rodada): a sala dele, ou a Diretoria
	for (const p of parados) {
		if (lugar.has(p.id) || !p.ceo || (p.situacao === 'offline' && rodada(p) === 0)) continue;
		pegar(p, lugaresDoCeo(p.id));
	}
	// 3) Offline na primeira rodada: sofás da recepção (e em pé, se lotar)
	const recepcao = lugaresDeQuemSaiu();
	const sofas = recepcao.filter((a) => a.sentado);
	const emPe = recepcao.filter((a) => !a.sentado);
	for (const p of parados) {
		if (lugar.has(p.id) || p.situacao !== 'offline' || rodada(p) > 0) continue;
		pegar(p, [...embaralhar(sofas, semente(p, 0)), ...emPe]);
	}
	// 4) Os outros: um lugar sorteado em qualquer sala (menos as que são de alguém), que muda a cada rodada
	const todos = assentos().filter((a) => a.sentado && !salaComDono(a.sala));
	for (const p of parados) {
		if (lugar.has(p.id)) continue;
		pegar(p, embaralhar(todos, semente(p, rodada(p))));
	}

	const r = new Map<string, Alvo>();
	for (const p of lista) {
		const assento = lugar.get(p.id) ?? null;
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
