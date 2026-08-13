import { describe, expect, it } from 'vitest';
import { CONTEUDO_STATUS, proximoPassoPublicacao } from './conteudo';

/** Clica na bolinha até o fim da linha, devolvendo o caminho percorrido. */
function caminho(inicial: string): string[] {
	const passos: string[] = [];
	let atual = inicial;
	for (let i = 0; i < 10; i++) {
		const proximo = proximoPassoPublicacao(atual);
		if (!proximo) break;
		passos.push(proximo.valor);
		atual = proximo.valor;
	}
	return passos;
}

describe('proximoPassoPublicacao', () => {
	it('vai um degrau por vez: programar → programado → publicado', () => {
		expect(caminho('ideia')).toEqual(['programar', 'programado', 'publicado']);
	});

	it('de "Programar" o próximo é Programado, não Publicado', () => {
		// Era o bug: a bolinha pulava o meio do caminho.
		expect(proximoPassoPublicacao('programar')?.valor).toBe('programado');
	});

	it('de "Programado" dá para chegar em Publicado', () => {
		// Era o outro lado do bug: em Programado a bolinha só oferecia VOLTAR.
		expect(proximoPassoPublicacao('programado')?.valor).toBe('publicado');
		expect(proximoPassoPublicacao('programado_parcial')?.valor).toBe('publicado');
	});

	it('os quatro "Programar ..." são o mesmo degrau e avançam para Programado', () => {
		for (const s of ['programar', 'programar_feed', 'programar_stories', 'programar_reels']) {
			expect(proximoPassoPublicacao(s)?.valor, s).toBe('programado');
		}
	});

	it('publicado é o fim: sem bolinha', () => {
		expect(proximoPassoPublicacao('publicado')).toBeNull();
	});

	it('qualquer status de produção começa mandando para Programar', () => {
		for (const s of ['ideia', 'escrever_conteudo', 'gravar_video', 'aprovar_conteudo']) {
			expect(proximoPassoPublicacao(s)?.valor, s).toBe('programar');
		}
	});

	it('nunca anda para trás, saindo de qualquer status do cadastro', () => {
		const ordem = ['programar', 'programado', 'publicado'];
		for (const { value } of CONTEUDO_STATUS) {
			const proximo = proximoPassoPublicacao(value);
			if (!proximo) continue;
			const de = ordem.indexOf(value);
			const para = ordem.indexOf(proximo.valor);
			// Status fora do trilho (de = -1) só pode entrar pelo começo.
			expect(para, `${value} → ${proximo.valor}`).toBeGreaterThan(de);
		}
	});

	it('cada passo traz rótulo e cor para a bolinha', () => {
		const p = proximoPassoPublicacao('programar');
		expect(p?.label).toBe('Programado');
		expect(p?.classe).toContain('border-');
	});
});
