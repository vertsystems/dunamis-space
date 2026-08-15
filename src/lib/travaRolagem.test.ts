// Sem jsdom: a trava só toca em `document.body.style.overflow`, então um
// documento de mentira com esse caminho já exercita tudo — e o teste continua
// rodando no ambiente `node`, como o resto da suíte.
import { beforeEach, describe, expect, it } from 'vitest';

const corpo = { style: { overflow: '' } };
(globalThis as { document?: unknown }).document = { body: corpo };

const { _resetTravaRolagem, _travasAbertas, travarRolagem } = await import('./travaRolagem');

const overflow = () => corpo.style.overflow;

beforeEach(() => {
	_resetTravaRolagem();
	corpo.style.overflow = '';
});

describe('travaRolagem', () => {
	it('trava ao abrir e solta ao fechar', () => {
		const soltar = travarRolagem();
		expect(overflow()).toBe('hidden');
		soltar();
		expect(overflow()).toBe('');
	});

	it('a troca de um modal por outro não solta a rolagem no meio', () => {
		// O caso do calendário: clicar num post dentro da agenda do dia fecha a
		// agenda e abre a edição no mesmo tick, e o modal de edição roda primeiro
		// por vir antes na árvore.
		const soltarAgenda = travarRolagem();
		const soltarEdicao = travarRolagem(); // edição abre com a agenda ainda no ar
		soltarAgenda(); // agenda se fecha
		expect(overflow(), 'com a edição aberta o fundo não pode rolar').toBe('hidden');

		soltarEdicao();
		expect(overflow(), 'fechou tudo: a página volta a rolar').toBe('');
	});

	it('a ordem em que os modais fecham não importa', () => {
		const a = travarRolagem();
		const b = travarRolagem();
		b();
		expect(overflow()).toBe('hidden');
		a();
		expect(overflow()).toBe('');
	});

	it('soltar duas vezes não destrava a página com outro modal aberto', () => {
		const a = travarRolagem();
		const b = travarRolagem();
		a();
		a(); // repetido (efeito re-executado, componente remontado…)
		a();
		expect(_travasAbertas()).toBe(1);
		expect(overflow(), 'b ainda está aberto').toBe('hidden');
		b();
		expect(overflow()).toBe('');
	});

	it('devolve o overflow que a página já tinha, não um valor chutado', () => {
		corpo.style.overflow = 'auto';
		const soltar = travarRolagem();
		expect(overflow()).toBe('hidden');
		soltar();
		expect(overflow()).toBe('auto');
	});

	it('abrir e fechar muitas vezes não deixa resíduo', () => {
		for (let i = 0; i < 20; i++) travarRolagem()();
		expect(_travasAbertas()).toBe(0);
		expect(overflow()).toBe('');
	});

	it('três modais encadeados terminam com a página rolando', () => {
		const a = travarRolagem();
		const b = travarRolagem();
		a();
		const c = travarRolagem();
		b();
		expect(overflow()).toBe('hidden');
		c();
		expect(_travasAbertas()).toBe(0);
		expect(overflow()).toBe('');
	});
});
