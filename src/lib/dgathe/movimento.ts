// Como a tela de um junta as duas notícias que chegam de outra pessoa: o
// trajeto (broadcast 'rota', na hora em que ela começa a andar) e o lugar onde
// ela parou (presence, que também é reenviado a cada pulso e a cada conferência).
//
// O problema que isto resolve (09/11/2026): durante a caminhada, a presença
// ainda diz onde a pessoa estava ANTES de sair. Qualquer reenvio dela no meio do
// caminho fazia o boneco andar, voltar para o começo e pular de novo para o fim.
// Agora cada notícia traz `mov`, o carimbo do movimento no relógio de quem anda:
// presença com carimbo mais velho que a rota em curso é ignorada.

import type { Ponto } from './iso';

export type Movel = {
	x: number;
	y: number;
	dirX: number;
	dirY: number;
	andando: boolean;
	caminho: Ponto[];
	/** Onde parar quando a caminhada animada aqui terminar (veio da presença). */
	final: Ponto | null;
	/** Carimbo do movimento que está valendo. */
	mov: number;
};

/** Chegou a presença (onde a pessoa está parada, e de qual movimento). */
export function aplicarPresenca(o: Movel, p: { x: number; y: number; dirX: number; dirY: number; mov: number }) {
	if (p.mov < o.mov) return; // notícia velha: a caminhada mais nova já vale
	if (o.caminho.length && p.mov === o.mov) {
		// Parou no fim desta mesma caminhada: termina de animar e fica lá
		o.final = { x: p.x, y: p.y };
		return;
	}
	// Movimento mais novo do que o que está aqui (o trajeto se perdeu) ou parado: vai direto
	o.caminho = [];
	o.andando = false;
	o.final = null;
	o.x = p.x;
	o.y = p.y;
	o.dirX = p.dirX;
	o.dirY = p.dirY;
	o.mov = p.mov;
}

/** Chegou um trajeto. Devolve false se ele é mais velho que o que já vale. */
export function aplicarRota(o: Movel, pontos: Ponto[], mov: number): boolean {
	if (pontos.length < 2 || mov < o.mov) return false;
	const ini = pontos[0];
	if (Math.hypot(o.x - ini.x, o.y - ini.y) > 1.5) {
		o.x = ini.x;
		o.y = ini.y;
	}
	o.caminho = pontos.slice(1);
	o.final = null;
	o.andando = true;
	o.mov = mov;
	return true;
}
