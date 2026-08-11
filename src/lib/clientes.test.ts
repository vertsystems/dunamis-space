import { describe, expect, it } from 'vitest';
import { clienteFromForm, enderecoResumo, enderecosFromForm } from './clientes';

/** Monta o FormData como o navegador manda: um par por campo, na ordem da tela. */
function fd(linhas: { apelido?: string; rua?: string; cidade?: string; uf?: string; cep?: string }[]) {
	const f = new FormData();
	for (const l of linhas) {
		f.append('end_apelido', l.apelido ?? '');
		f.append('end_logradouro', l.rua ?? '');
		f.append('end_cidade', l.cidade ?? '');
		f.append('end_uf', l.uf ?? '');
		f.append('end_cep', l.cep ?? '');
	}
	return f;
}

describe('enderecosFromForm', () => {
	it('junta os campos paralelos pelo índice do bloco', () => {
		const lista = enderecosFromForm(
			fd([
				{ apelido: 'Matriz', rua: 'Rua A, 10', cidade: 'Sorocaba', uf: 'SP', cep: '18000-000' },
				{ apelido: 'Loja Centro', rua: 'Rua B, 20', cidade: 'Piedade', uf: 'SP', cep: '18170-000' }
			])
		);
		expect(lista).toEqual([
			{ apelido: 'Matriz', endereco: 'Rua A, 10', cidade: 'Sorocaba', estado: 'SP', cep: '18000-000' },
			{ apelido: 'Loja Centro', endereco: 'Rua B, 20', cidade: 'Piedade', estado: 'SP', cep: '18170-000' }
		]);
	});

	it('descarta o bloco em branco que o formulário sempre mostra', () => {
		expect(enderecosFromForm(fd([{}]))).toEqual([]);
		expect(enderecosFromForm(fd([{ apelido: '  ' }]))).toEqual([]);
		expect(enderecosFromForm(new FormData())).toEqual([]);
	});

	it('mantém o bloco parcial: cidade sem rua ainda é informação', () => {
		expect(enderecosFromForm(fd([{ cidade: 'Guarujá', uf: 'SP' }]))).toEqual([
			{ apelido: '', endereco: '', cidade: 'Guarujá', estado: 'SP', cep: '' }
		]);
	});

	it('remover um bloco do meio não embaralha os outros', () => {
		// O que chega ao servidor depois de remover a linha 2 de três.
		const lista = enderecosFromForm(fd([{ apelido: 'A', cidade: 'X' }, { apelido: 'C', cidade: 'Z' }]));
		expect(lista.map((e) => [e.apelido, e.cidade])).toEqual([
			['A', 'X'],
			['C', 'Z']
		]);
	});
});

describe('clienteFromForm: espelho do primeiro endereço', () => {
	it('copia o primeiro da lista para as colunas antigas', () => {
		const f = fd([
			{ apelido: 'Matriz', rua: 'Rua A', cidade: 'Sorocaba', uf: 'SP', cep: '18000-000' },
			{ apelido: 'Filial', rua: 'Rua B', cidade: 'Piedade', uf: 'SP' }
		]);
		f.append('nome', 'Cliente Teste');
		const v = clienteFromForm(f);
		expect(v.enderecos).toHaveLength(2);
		expect(v.endereco).toBe('Rua A');
		expect(v.cidade).toBe('Sorocaba');
		expect(v.estado).toBe('SP');
		expect(v.cep).toBe('18000-000');
	});

	it('sem endereço nenhum, as colunas antigas ficam null (não string vazia)', () => {
		const f = fd([{}]);
		f.append('nome', 'Cliente Teste');
		const v = clienteFromForm(f);
		expect(v.enderecos).toEqual([]);
		expect(v.endereco).toBeNull();
		expect(v.cidade).toBeNull();
		expect(v.estado).toBeNull();
		expect(v.cep).toBeNull();
	});

	it('campo em branco no primeiro bloco não vira string vazia na coluna', () => {
		const f = fd([{ apelido: 'Matriz', cidade: 'Sorocaba', uf: 'SP' }]);
		f.append('nome', 'Cliente Teste');
		const v = clienteFromForm(f);
		expect(v.endereco).toBeNull();
		expect(v.cep).toBeNull();
		expect(v.cidade).toBe('Sorocaba');
	});

	it('cliente novo nasce ativo', () => {
		const f = new FormData();
		f.append('nome', 'Cliente Teste');
		expect(clienteFromForm(f).status).toBe('ativo');
	});
});

describe('enderecoResumo', () => {
	it('junta o que existe e ignora o que está vazio', () => {
		expect(
			enderecoResumo({ apelido: 'Matriz', endereco: 'Rua A', cidade: 'Sorocaba', estado: 'SP', cep: '18000-000' })
		).toBe('Rua A · Sorocaba/SP · 18000-000');
		expect(enderecoResumo({ apelido: '', endereco: '', cidade: 'Sorocaba', estado: '', cep: '' })).toBe(
			'Sorocaba'
		);
	});
});
