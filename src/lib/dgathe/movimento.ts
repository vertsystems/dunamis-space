// O que a tela de um faz quando chega a leitura de outra pessoa (presenca.ts).
//
// Cada leitura traz onde a pessoa está, ou para onde está indo, com o carimbo
// do movimento (`mov`), e se ela está online ou ausente. Quem anda grava só o
// destino; a tela de cada um calcula o caminho e anima, com alguns segundos de
// atraso (o Bruno aceitou: melhor atrasado e certo).
//
// Ausente vai andando até o assento na recepção e senta. Quando volta, levanta
// e vai até o lugar onde estava. Notícia com carimbo velho não faz ninguém
// voltar atrás (era o defeito de 09/11/2026: o boneco andava, voltava ao
// começo e pulava para o fim).

import type { Situacao } from './presenca';

export type Acao = 'nada' | 'ao-assento' | 'ao-lugar';

export type EstadoOutro = {
	mov: number;
	situacao: Situacao;
	sentado: boolean;
	/** Para onde está andando agora (null = parado). */
	indo: 'assento' | 'lugar' | null;
};

export function decidir(o: EstadoOutro, p: { situacao: Situacao; mov: number }): Acao {
	if (p.situacao === 'ausente') return o.sentado || o.indo === 'assento' ? 'nada' : 'ao-assento';
	// Voltou: levanta (ou desiste de ir sentar) e vai para onde estava
	if (o.sentado || o.indo === 'assento' || o.situacao === 'ausente') return 'ao-lugar';
	// Online e andando: só um movimento mais novo muda o destino
	return p.mov > o.mov ? 'ao-lugar' : 'nada';
}
