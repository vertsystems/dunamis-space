// Resumo do Pag's Up por cliente, para o bloco da Visão Geral.
//
// Só contas, sem banco: o servidor traz as linhas cruas e a agregação acontece
// aqui, onde dá para testar. Agrupar em JS em vez de uma query por cliente
// mantém o dashboard em três consultas, não em três vezes o número de clientes.
import type { PagsupResumoCliente } from './types';

export type ClienteBase = { id: string; nome: string };
export type LinhaValor = { cliente_id: string | null; valor: number | string | null };
export type LinhaCronograma = { cliente_id: string | null };

/** Soma por cliente, ignorando linha sem dono. */
function somarPorCliente(linhas: LinhaValor[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const l of linhas) {
		if (!l.cliente_id) continue;
		m.set(l.cliente_id, (m.get(l.cliente_id) ?? 0) + Number(l.valor ?? 0));
	}
	return m;
}

function contarPorCliente(linhas: LinhaCronograma[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const l of linhas) {
		if (!l.cliente_id) continue;
		m.set(l.cliente_id, (m.get(l.cliente_id) ?? 0) + 1);
	}
	return m;
}

/**
 * Um resumo por cliente, na ordem em que o dashboard mostra.
 *
 * Ordem por movimento (pago no mês, depois a pagar), com o nome desempatando:
 * quem tem número aparece primeiro e os zerados completam as vagas. Ordenar só
 * por nome esconderia o cliente ativo atrás de três parados quando a base
 * crescer.
 *
 * Cliente sem nenhum lançamento entra zerado em vez de sumir — o quadro é de
 * quem existe, não só de quem movimentou.
 */
export function resumoPorCliente(
	clientes: ClienteBase[],
	pagamentosDoMes: LinhaValor[],
	cronogramaDoMes: LinhaCronograma[],
	cronograma7Dias: LinhaValor[],
	limite = 4
): PagsupResumoCliente[] {
	const pago = somarPorCliente(pagamentosDoMes);
	const aPagar = somarPorCliente(cronograma7Dias);
	const servicos = contarPorCliente(cronogramaDoMes);

	return clientes
		.map((c) => ({
			clienteId: c.id,
			nome: c.nome,
			pagoMes: pago.get(c.id) ?? 0,
			aPagar7: aPagar.get(c.id) ?? 0,
			servicosMes: servicos.get(c.id) ?? 0
		}))
		.sort(
			(a, b) =>
				b.pagoMes - a.pagoMes ||
				b.aPagar7 - a.aPagar7 ||
				b.servicosMes - a.servicosMes ||
				a.nome.localeCompare(b.nome, 'pt-BR')
		)
		.slice(0, limite);
}
