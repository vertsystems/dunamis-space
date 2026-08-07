import { describe, it, expect } from 'vitest';
import { acessoFromForm, ferramentaFromForm, fornecedorFromForm } from './adm';
import { numBR } from './form';

/** Monta um FormData como o navegador manda (checkbox ausente = desmarcado). */
function fd(campos: Record<string, string>): FormData {
	const f = new FormData();
	for (const [k, v] of Object.entries(campos)) f.append(k, v);
	return f;
}

describe('numBR', () => {
	it('entende o separador de milhar brasileiro', () => {
		expect(numBR(fd({ v: '1.234,56' }), 'v')).toBe(1234.56);
		expect(numBR(fd({ v: '0,50' }), 'v')).toBe(0.5);
		expect(numBR(fd({ v: '90' }), 'v')).toBe(90);
	});

	it('vazio e lixo viram null — e não 0, que seria um custo falso', () => {
		expect(numBR(fd({ v: '' }), 'v')).toBeNull();
		expect(numBR(fd({}), 'v')).toBeNull();
		expect(numBR(fd({ v: 'grátis' }), 'v')).toBeNull();
	});
});

describe('fornecedorFromForm', () => {
	it('lê o formulário completo', () => {
		const v = fornecedorFromForm(
			fd({
				nome: '  Estúdio Vermelho  ',
				tipo: 'parceiro',
				custo_referencia: '2.500,00',
				avaliacao: '4',
				ativo: 'on',
				email: 'contato@estudio.com'
			})
		);
		expect(v.nome).toBe('Estúdio Vermelho');
		expect(v.tipo).toBe('parceiro');
		expect(v.custo_referencia).toBe(2500);
		expect(v.avaliacao).toBe(4);
		expect(v.ativo).toBe(true);
		expect(v.especialidade).toBeNull();
	});

	it('recusa tipo fora da lista (cai em freelancer)', () => {
		expect(fornecedorFromForm(fd({ nome: 'X', tipo: 'socio' })).tipo).toBe('freelancer');
		expect(fornecedorFromForm(fd({ nome: 'X' })).tipo).toBe('freelancer');
	});

	it('só aceita avaliação de 1 a 5', () => {
		expect(fornecedorFromForm(fd({ nome: 'X', avaliacao: '' })).avaliacao).toBeNull();
		expect(fornecedorFromForm(fd({ nome: 'X', avaliacao: '0' })).avaliacao).toBeNull();
		expect(fornecedorFromForm(fd({ nome: 'X', avaliacao: '9' })).avaliacao).toBeNull();
		expect(fornecedorFromForm(fd({ nome: 'X', avaliacao: '5' })).avaliacao).toBe(5);
	});

	it('checkbox ausente é falso — o navegador não manda o campo desmarcado', () => {
		expect(fornecedorFromForm(fd({ nome: 'X' })).ativo).toBe(false);
	});
});

describe('ferramentaFromForm', () => {
	it('custo sem valor vira 0 (a coluna é NOT NULL) e o ciclo tem padrão', () => {
		const v = ferramentaFromForm(fd({ nome: 'Figma' }));
		expect(v.custo_mensal).toBe(0);
		expect(v.ciclo).toBe('mensal');
		expect(v.ativo).toBe(false);
	});

	it('lê custo em reais com milhar', () => {
		expect(ferramentaFromForm(fd({ nome: 'Adobe', custo_mensal: '1.199,90' })).custo_mensal).toBe(
			1199.9
		);
	});
});

describe('acessoFromForm', () => {
	it('campos em branco viram null, não string vazia', () => {
		const v = acessoFromForm(fd({ plataforma: 'Meta', login: '   ' }));
		expect(v.plataforma).toBe('Meta');
		expect(v.login).toBeNull();
		expect(v.observacoes).toBeNull();
	});
});
