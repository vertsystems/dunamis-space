import { describe, expect, it } from 'vitest';
import {
	atividadeComecando,
	COR_DO_ESTADO,
	contarAbertas,
	duracao,
	estadoDe,
	haQuanto,
	lerAgentes,
	lerPai,
	lerSubtarefas,
	linhaDaSubtarefa,
	lugaresDosAgentes,
	NOME_DO_ESTADO,
	NOME_DO_STATUS,
	primeiraLinha,
	subtarefaComecando,
	textoAguardando,
	textoDoRetorno,
	type Agente,
	type EstadoAgente,
	type Subtarefa
} from './agentes';
import { alvos } from './movimento';
import { APARENCIA_PADRAO } from './aparencia';
import { blocos, pedacos } from './texto';
import type { Pessoa } from './presenca';

const agente = (id: string, extra: Partial<Agente> = {}): Agente => ({
	id,
	nome: id,
	cargo: 'Gerente',
	equipe: null,
	lider: false,
	sala: 'comercial',
	cadeira: 'Cadeira do gerente',
	aparencia: APARENCIA_PADRAO,
	ordem: 0,
	naFila: 0,
	pedidos: 0,
	tarefa: null,
	estado: 'livre',
	...extra
});

describe('lerAgentes', () => {
	it('lê o que o banco manda e calcula o estado', () => {
		const l = lerAgentes({
			pode: 'editar',
			ponte: { id: 'mac-bruno', visto_ha: 12, trabalhando: 1 },
			agentes: [
				{ id: 'assessor', nome: 'Assessor', cargo: 'Assessor do CEO', sala: 'sala-bruno', cadeira: 'Cadeira do assessor', ordem: 0, na_fila: 0, pedidos: 1, tarefa: { id: 't1', status: 'trabalhando', titulo: 'X', atividade: 'Lendo', desde: 30 } },
				{ id: 'sem-sala', nome: 'Y', sala: 'nao-existe' },
				{ id: 'livre', nome: 'Livre', sala: 'comercial', tarefa: null }
			]
		})!;
		expect(l.pode).toBe('editar');
		expect(l.ponte).toEqual({ ligada: true, vistaHa: 12, trabalhando: 1 });
		expect(l.agentes.map((a) => a.id)).toEqual(['assessor', 'livre']);
		// Pedido aberto vence o "trabalhando" da tarefa
		expect(l.agentes[0].estado).toBe('esperando');
		expect(l.agentes[1].estado).toBe('livre');
	});
	it('tarefa começando: trabalhando, com o que ele está fazendo', () => {
		const ag = (visto: number) =>
			lerAgentes({ ponte: { visto_ha: visto }, agentes: [{ id: 'x', nome: 'X', sala: 'comercial', tarefa: { id: 't', status: 'fila', titulo: 'T', atividade: null, desde: 2 } }] })!.agentes[0];
		expect(ag(5)).toMatchObject({ estado: 'trabalhando', tarefa: { atividade: 'Lendo o pedido' } });
		expect(ag(500)).toMatchObject({ estado: 'fila', tarefa: { atividade: null } });
	});
	it('ponte sem sinal recente está desligada; sem ponte nenhuma, também', () => {
		expect(lerAgentes({ ponte: { visto_ha: 400 }, agentes: [] })!.ponte.ligada).toBe(false);
		expect(lerAgentes({ ponte: null, agentes: [] })!.ponte).toEqual({ ligada: false, vistaHa: null, trabalhando: 0 });
		expect(lerAgentes({ agentes: [] })!.pode).toBe('nenhum');
		expect(lerAgentes(null)).toBeNull();
	});
	it('estado por status', () => {
		const t = (status: 'fila' | 'trabalhando' | 'esperando') => ({ id: null, status, titulo: null, atividade: null, desde: 0 });
		expect(estadoDe(null, 0)).toBe('livre');
		expect(estadoDe(t('fila'), 0)).toBe('fila');
		// Com a ponte ligada, a fila já aparece como trabalho (a espera de 15 s é só da ponte)
		expect(estadoDe(t('fila'), 0, true)).toBe('trabalhando');
		expect(estadoDe(t('trabalhando'), 0)).toBe('trabalhando');
		expect(estadoDe(t('esperando'), 0)).toBe('esperando');
	});
	it('aguardando: o líder esperando a equipe, com ou sem a ponte', () => {
		const t = { status: 'aguardando' as const };
		expect(estadoDe(t, 0)).toBe('aguardando');
		expect(estadoDe(t, 0, true)).toBe('aguardando');
		// Pedido aberto ainda vence (não acontece hoje: aguardando não tem sessão)
		expect(estadoDe(t, 1, true)).toBe('esperando');
		// Tarefa terminada não segura ninguém na mesa
		expect(estadoDe({ status: 'concluida' }, 0, true)).toBe('livre');
	});
	it('lê a equipe, o líder e a subtarefa (migration 0102)', () => {
		const l = lerAgentes({
			pode: 'editar',
			ponte: { visto_ha: 3 },
			agentes: [
				{ id: 'lewis', nome: 'Lewis', sala: 'dev', cadeira: 'Cadeira do gerente', equipe: 'dev', lider: true, ordem: 10,
					tarefa: { id: 'p1', status: 'aguardando', titulo: 'Agenda', atividade: 'Esperando a equipe', desde: 312.5, pai_id: null, subtarefas_abertas: 2 } },
				{ id: 'clovis', nome: 'Clovis', sala: 'dev', cadeira: 'Cadeira de Bandolete', equipe: 'dev', lider: false, ordem: 11,
					tarefa: { id: 's1', status: 'trabalhando', titulo: 'Requisitos', atividade: 'Escrevendo', desde: 95, pai_id: 'p1', subtarefas_abertas: 0 } },
				// Sem o módulo: equipe e líder vêm, o resto da tarefa vem nulo
				{ id: 'shakira', nome: 'Shakira', sala: 'dev', equipe: 'dev', lider: 'sim', ordem: 12,
					tarefa: { id: null, status: 'aguardando', titulo: null, atividade: null, desde: 4, pai_id: null, subtarefas_abertas: null } },
				// Banco de antes da 0102: sem os campos novos
				{ id: 'assessor', nome: 'Assessor', sala: 'sala-bruno', equipe: '  ', tarefa: { id: 't', status: 'trabalhando', titulo: 'X', atividade: null, desde: 1 } }
			]
		})!;
		const [lewis, clovis, shakira, assessor] = l.agentes;
		expect(lewis).toMatchObject({ equipe: 'dev', lider: true, estado: 'aguardando', tarefa: { paiId: null, subtarefasAbertas: 2, desde: 312.5 } });
		expect(clovis).toMatchObject({ equipe: 'dev', lider: false, estado: 'trabalhando', tarefa: { paiId: 'p1', subtarefasAbertas: 0 } });
		// Só true é líder
		expect(shakira).toMatchObject({ lider: false, estado: 'aguardando', tarefa: { id: null, paiId: null, subtarefasAbertas: null } });
		expect(assessor).toMatchObject({ equipe: null, lider: false, tarefa: { paiId: null, subtarefasAbertas: null } });
	});
	it('começando: o que ele lê primeiro depende de como a tarefa voltou para a fila', () => {
		const ag = (atividade: string | null) =>
			lerAgentes({ ponte: { visto_ha: 5 }, agentes: [{ id: 'x', nome: 'X', sala: 'dev', tarefa: { id: 't', status: 'fila', titulo: 'T', atividade, desde: 2 } }] })!.agentes[0];
		expect(ag(null)).toMatchObject({ estado: 'trabalhando', tarefa: { atividade: 'Lendo o pedido' } });
		expect(ag('Na fila para continuar').tarefa!.atividade).toBe('Lendo a sua mensagem');
		expect(ag('Na fila com o retorno da equipe').tarefa!.atividade).toBe('Lendo o retorno da equipe');
		expect(atividadeComecando('Cancelada antes de começar')).toBe('Lendo o pedido');
	});
	it('nomes e cores de todos os estados', () => {
		const estados: EstadoAgente[] = ['livre', 'fila', 'trabalhando', 'esperando', 'aguardando'];
		expect(estados.every((e) => NOME_DO_ESTADO[e] && /^#[0-9a-f]{6}$/.test(COR_DO_ESTADO[e]))).toBe(true);
		expect(NOME_DO_ESTADO.aguardando).toBe('esperando a equipe');
		expect(NOME_DO_STATUS.aguardando).toBe('Esperando a equipe');
		expect(COR_DO_ESTADO.aguardando).toBe('#38bdf8');
	});
});

describe('equipe na tela', () => {
	const sub = (extra: Partial<Subtarefa> = {}): Subtarefa => ({
		id: 's1', agente_id: 'clovis', agente_nome: 'Clovis', agente_cargo: 'Analista de Sistemas', titulo: 'Requisitos',
		status: 'trabalhando', atividade: 'Escrevendo requisitos.md', resumo: null, erro: null, passos: 3, pedidos: 0,
		rodada_do_pai: 1, relatada: false, criada_ha: 60, duracao: 50, ...extra
	});
	it('linha de estado do líder', () => {
		expect(textoAguardando(2)).toBe('Esperando a equipe: 2 subtarefas abertas');
		expect(textoAguardando(1)).toBe('Esperando a equipe: 1 subtarefa aberta');
		expect(textoAguardando(0)).toBe('A equipe terminou: já vai revisar');
		expect(textoAguardando(null)).toBe('Esperando a equipe');
	});
	it('lê subtarefas e a tarefa-pai, e ignora o que não reconhece', () => {
		const lista = lerSubtarefas([
			{ id: 's1', agente_id: 'clovis', agente_nome: 'Clovis', agente_cargo: 'Analista de Sistemas', titulo: 'Requisitos', status: 'concluida',
				atividade: 'Terminou', resumo: 'Escrevi tudo', erro: null, passos: 14, pedidos: 0, rodada_do_pai: 1, relatada: true, criada_ha: 880.2, duracao: 240.5 },
			{ id: 's2', agente_id: 'shakira', status: 'coisa-nova', pedidos: '1' },
			{ id: '', agente_id: 'x' },
			null
		]);
		expect(lista).toHaveLength(2);
		expect(lista[0]).toMatchObject({ status: 'concluida', relatada: true, rodada_do_pai: 1, resumo: 'Escrevi tudo' });
		expect(lista[1]).toMatchObject({ agente_nome: 'shakira', status: 'fila', pedidos: 1, rodada_do_pai: null, relatada: false, titulo: 'Tarefa' });
		expect(lerSubtarefas(undefined)).toEqual([]);
		expect(lerPai({ id: 'p1', titulo: 'Agenda', status: 'aguardando', agente_id: 'lewis', agente_nome: 'Lewis' })).toEqual({
			id: 'p1', titulo: 'Agenda', status: 'aguardando', agente_id: 'lewis', agente_nome: 'Lewis'
		});
		expect(lerPai(null)).toBeNull();
		expect(lerPai({ id: 'p1' })).toBeNull();
	});
	it('contar abertas', () => {
		expect(contarAbertas([sub(), sub({ status: 'fila' }), sub({ status: 'esperando' }), sub({ status: 'concluida' }), sub({ status: 'falhou' })])).toBe(3);
	});
	it('linha de baixo de cada subtarefa', () => {
		expect(linhaDaSubtarefa(sub())).toBe('Escrevendo requisitos.md');
		expect(linhaDaSubtarefa(sub({ status: 'esperando', atividade: null }))).toBe('Precisa de você');
		expect(linhaDaSubtarefa(sub({ status: 'fila', atividade: null }))).toBe('Na fila');
		expect(linhaDaSubtarefa(sub({ status: 'fila', atividade: null }), true)).toBe('Lendo o pedido');
		expect(linhaDaSubtarefa(sub({ status: 'concluida', resumo: '\n## Entrega: Clovis\n\nEscrevi **12 histórias**' }))).toBe('Entrega: Clovis');
		expect(linhaDaSubtarefa(sub({ status: 'concluida', resumo: null }))).toBe('(terminou sem texto final)');
		expect(linhaDaSubtarefa(sub({ status: 'falhou', erro: 'A ponte reiniciou' }))).toBe('A ponte reiniciou');
		expect(linhaDaSubtarefa(sub({ status: 'cancelada' }))).toBe('(parada antes de terminar)');
		expect(primeiraLinha('- `npm test` passou')).toBe('npm test passou');
		expect(primeiraLinha('  \n ')).toBeNull();
	});
	it('retorno da equipe: "Tarefa:" num parágrafo só e o separador some (fora de código)', () => {
		const t = textoDoRetorno('Retorno da equipe (rodada 1): 1 subtarefa terminou.\n\n## Clovis · Analista · Concluída\nTarefa: Requisitos\nEscrevi tudo.\n```\nTarefa: x\n---\n```\n\n---\nRevise as entregas.');
		expect(t).toBe('Retorno da equipe (rodada 1): 1 subtarefa terminou.\n\n## Clovis · Analista · Concluída\nTarefa: Requisitos\n\nEscrevi tudo.\n```\nTarefa: x\n---\n```\n\n\nRevise as entregas.');
		const b = blocos(textoDoRetorno('## Shakira · UX · Parou com erro\nTarefa: Wireframe\nErro: A ponte reiniciou.\n---\nRevise.'));
		expect(b.map((x) => x.tipo)).toEqual(['titulo', 'p', 'p', 'p']);
	});
	it('subtarefa começando: só se for a tarefa atual do especialista e a ponte estiver ligada', () => {
		const ag = [{ id: 'clovis', tarefa: { id: 's1' } as Agente['tarefa'] }, { id: 'steve', tarefa: { id: 'outra' } as Agente['tarefa'] }];
		expect(subtarefaComecando(sub({ status: 'fila' }), ag, true)).toBe(true);
		expect(subtarefaComecando(sub({ status: 'fila' }), ag, false)).toBe(false);
		expect(subtarefaComecando(sub({ status: 'fila', agente_id: 'steve' }), ag, true)).toBe(false);
		expect(subtarefaComecando(sub({ status: 'trabalhando' }), ag, true)).toBe(false);
	});
});

describe('lugaresDosAgentes', () => {
	it('trabalhando senta na cadeira dele; livre vai para a copa', () => {
		const { lugar, reservados } = lugaresDosAgentes([
			agente('design', { estado: 'trabalhando' }),
			agente('assessor', { sala: 'sala-bruno', cadeira: 'Cadeira do assessor', estado: 'esperando' }),
			agente('trafego', { sala: 'trafego' })
		]);
		expect(lugar.get('design')!.nome).toBe('Cadeira do gerente');
		expect(lugar.get('design')!.sala).toBe('comercial');
		expect(lugar.get('assessor')!.nome).toBe('Cadeira do assessor');
		expect(lugar.get('trafego')!.sala).toBe('copa');
		// A cadeira do Tráfego fica reservada mesmo com ele na copa
		expect([...reservados].some((id) => id.startsWith('trafego:'))).toBe(true);
	});
	it('copa lotada: o resto espera em pé, ninguém no mesmo lugar', () => {
		const lista = Array.from({ length: 9 }, (_, i) => agente(`a${i}`, { ordem: i }));
		const { lugar } = lugaresDosAgentes(lista);
		const ids = lista.map((a) => lugar.get(a.id)!.id);
		expect(new Set(ids).size).toBe(9);
		expect(lista.every((a) => lugar.get(a.id)!.sala === 'copa')).toBe(true);
		expect(lista.some((a) => !lugar.get(a.id)!.sentado)).toBe(true);
	});
	it('dois agentes na mesma sala não dividem a cadeira', () => {
		const { lugar } = lugaresDosAgentes([agente('x', { estado: 'trabalhando' }), agente('y', { estado: 'trabalhando' })]);
		expect(lugar.get('x')!.id).not.toBe(lugar.get('y')!.id);
		expect(lugar.get('y')!.sala).toBe('comercial');
	});
	it('aguardando: o líder espera a equipe sentado na mesa dele', () => {
		const { lugar } = lugaresDosAgentes([agente('lewis', { sala: 'dev', estado: 'aguardando' }), agente('clovis', { sala: 'dev', cadeira: 'Cadeira de Bandolete', ordem: 1 })]);
		expect(lugar.get('lewis')).toMatchObject({ sala: 'dev', nome: 'Cadeira do gerente', sentado: true });
		expect(lugar.get('clovis')!.sala).toBe('copa');
	});
	// Os 11 de agentes/dev/*.md (contrato-equipes.md, seção 6.1): garante que eles cabem no mapa
	const DEV = ['lewis', 'clovis', 'shakira', 'steve', 'aoki', 'bonjovi', 'lowe', 'jackie', 'smith', 'brad', 'blade'];
	const departamento = (estado: EstadoAgente) =>
		DEV.map((id, i) =>
			agente(id, { sala: 'dev', equipe: 'dev', lider: i === 0, cadeira: i === 0 ? 'Cadeira do gerente' : 'Cadeira de Bandolete', ordem: 10 + i, estado: i === 0 && estado === 'trabalhando' ? 'aguardando' : estado })
		);
	it('os 11 do dev trabalhando: cada um na sua cadeira da sala dev, Lewis na do gerente', () => {
		// Embaralhado: a cadeira sai da ordem, não da posição na lista
		const lista = [...departamento('trabalhando')].reverse();
		const { lugar, reservados } = lugaresDosAgentes(lista);
		const cadeiras = DEV.map((id) => lugar.get(id)!);
		expect(cadeiras.every((c) => c.sala === 'dev' && c.sentado && c.movel === 'cadeira')).toBe(true);
		expect(new Set(cadeiras.map((c) => c.id)).size).toBe(11);
		expect(lugar.get('lewis')!.nome).toBe('Cadeira do gerente');
		expect(DEV.slice(1).every((id) => lugar.get(id)!.nome === 'Cadeira de Bandolete')).toBe(true);
		expect(reservados.size).toBe(11);
		// A mesma lista em outra tela dá as mesmas cadeiras
		const outra = lugaresDosAgentes(departamento('trabalhando')).lugar;
		expect(DEV.every((id) => outra.get(id)!.id === lugar.get(id)!.id)).toBe(true);
	});
	// Os 8 de agentes/financeiro/*.md (11/11/2026): o Warren na mesa do gerente e os sete na baia
	const FINANCEIRO = ['warren', 'ada', 'benjamin', 'silvio', 'janet', 'peter', 'ray', 'luca'];
	it('os 8 do financeiro trabalhando ao mesmo tempo que o dev: cada um na sua cadeira da sala financeiro', () => {
		const financeiro = FINANCEIRO.map((id, i) =>
			agente(id, { sala: 'financeiro', equipe: 'financeiro', lider: i === 0, cadeira: i === 0 ? 'Cadeira do gerente' : 'Cadeira de Bandolete', ordem: 30 + i, estado: i === 0 ? 'aguardando' : 'trabalhando' })
		);
		const { lugar } = lugaresDosAgentes([...financeiro, ...departamento('trabalhando')]);
		const cadeiras = FINANCEIRO.map((id) => lugar.get(id)!);
		expect(cadeiras.every((c) => c.sala === 'financeiro' && c.sentado && c.movel === 'cadeira')).toBe(true);
		expect(new Set(cadeiras.map((c) => c.id)).size).toBe(8);
		expect(lugar.get('warren')!.nome).toBe('Cadeira do gerente');
		expect(FINANCEIRO.slice(1).every((id) => lugar.get(id)!.nome === 'Cadeira de Bandolete')).toBe(true);
		// O dev continua inteiro na sala dele
		expect(DEV.every((id) => lugar.get(id)!.sala === 'dev')).toBe(true);
	});
	// Os departamentos de 11/11/2026: Marketing & Criação (16), Tráfego & Performance (6) e Comercial (6)
	const NOVOS: Record<string, string[]> = {
		marketing: ['david', 'clayton', 'philip', 'paula', 'washington', 'massimo', 'saul', 'gary', 'rand', 'seth', 'sean', 'avinash', 'abilio', 'anitta', 'walt', 'deming'],
		trafego: ['neil', 'byron', 'sheryl', 'larry', 'susan', 'grace'],
		comercial: ['aaron', 'jeb', 'chris', 'ruth', 'marc', 'tony']
	};
	it('os 28 dos departamentos novos trabalhando: cada um numa cadeira da sala dele, o gerente na do gerente', () => {
		const lista = Object.entries(NOVOS).flatMap(([sala, ids], d) =>
			ids.map((id, i) =>
				agente(id, { sala, equipe: sala, lider: i === 0, cadeira: i === 0 ? 'Cadeira do gerente' : 'Cadeira de Bandolete', ordem: 40 + d * 20 + i, estado: i === 0 ? 'aguardando' : 'trabalhando' })
			)
		);
		const { lugar } = lugaresDosAgentes([...lista, ...departamento('trabalhando')]);
		for (const [sala, ids] of Object.entries(NOVOS)) {
			const cadeiras = ids.map((id) => lugar.get(id)!);
			expect(cadeiras.every((c) => c.sala === sala && c.sentado && c.movel === 'cadeira'), sala).toBe(true);
			expect(new Set(cadeiras.map((c) => c.id)).size, sala).toBe(ids.length);
			expect(lugar.get(ids[0])!.nome, sala).toBe('Cadeira do gerente');
		}
	});
	it('os 11 do dev e o assessor livres: todos na copa, cada um num lugar', () => {
		const lista = [agente('assessor', { sala: 'sala-bruno', cadeira: 'Cadeira do assessor' }), ...departamento('livre')];
		const { lugar, reservados } = lugaresDosAgentes(lista);
		const lugares = lista.map((a) => lugar.get(a.id)!);
		expect(lugares.every((l) => l.sala === 'copa')).toBe(true);
		expect(new Set(lugares.map((l) => l.id)).size).toBe(12);
		// As cadeiras de trabalho continuam reservadas (12) e os lugares da copa também (12)
		expect(reservados.size).toBe(24);
	});
	it('a pausa desvia de onde tem gente sentada, e o posto de cada um vem junto (10/11/2026)', () => {
		const lista = [agente('a0', { ordem: 0 }), agente('a1', { ordem: 1 })];
		const livre = lugaresDosAgentes(lista).lugar;
		const ocupado = livre.get('a0')!.id;
		const { lugar, postos } = lugaresDosAgentes(lista, null, [ocupado]);
		expect([...lugar.values()].some((l) => l.id === ocupado)).toBe(false);
		expect(postos.get('a0')!.nome).toBe('Cadeira do gerente');
	});
	it('lê quem aprova os pedidos da tarefa (migration 0106)', () => {
		const l = lerAgentes({
			agentes: [{ id: 'steve', nome: 'Steve', sala: 'dev', pedidos: 1, tarefa: { id: 's1', status: 'esperando', desde: 5, aprovador: 'b-1' } }, { id: 'brad', nome: 'Brad', sala: 'dev', tarefa: { id: 's2', status: 'trabalhando', desde: 5 } }]
		})!;
		expect(l.agentes.find((a) => a.id === 'steve')!.tarefa!.aprovador).toBe('b-1');
		expect(l.agentes.find((a) => a.id === 'steve')!.estado).toBe('esperando');
		expect(l.agentes.find((a) => a.id === 'brad')!.tarefa!.aprovador).toBeNull();
	});
	it('quem está parado não senta na cadeira de um agente', () => {
		const { reservados } = lugaresDosAgentes([agente('design')]);
		const p: Pessoa = {
			id: 'davi', nome: 'Davi', cargo: 'SM', foto: null, cor: null, x: 0, y: 0, dirX: 1, dirY: 1, mov: 0,
			aparencia: APARENCIA_PADRAO, situacao: 'inativo', assento: [...reservados][0], ceo: false, paradoDesde: 1, paradoHa: 10
		};
		const alvo = alvos([p], { agentes: reservados }).get('davi')!;
		expect(reservados.has(alvo.assento!.id)).toBe(false);
	});
});

describe('tempo', () => {
	it('há quanto e duração', () => {
		expect(haQuanto(10)).toBe('agora');
		expect(haQuanto(150)).toBe('há 3 min');
		expect(haQuanto(7200)).toBe('há 2 h');
		expect(duracao(42)).toBe('42 s');
		expect(duracao(185)).toBe('3 min');
		expect(duracao(4800)).toBe('1 h 20 min');
	});
});

describe('texto dos agentes', () => {
	it('negrito e código na frase', () => {
		expect(pedacos('Salvei **a proposta** em `propostas/x.md`.')).toEqual([
			{ t: 'Salvei ' },
			{ t: 'a proposta', negrito: true },
			{ t: ' em ' },
			{ t: 'propostas/x.md', codigo: true },
			{ t: '.' }
		]);
	});
	it('parágrafo, título, lista, código e tabela', () => {
		const b = blocos('# Feito\n\nLinha um\ncontinua.\n\n- item a\n2. item b\n\n```\nnpm test\n```\n| a | b |\n|---|---|\n| 1 | 2 |');
		expect(b.map((x) => x.tipo)).toEqual(['titulo', 'p', 'item', 'item', 'codigo', 'codigo']);
		expect(b[1]).toEqual({ tipo: 'p', partes: [{ t: 'Linha um continua.' }] });
		expect(b[3]).toMatchObject({ tipo: 'item', numero: '2' });
		expect(b[4]).toEqual({ tipo: 'codigo', texto: 'npm test' });
		expect(b[5]).toEqual({ tipo: 'codigo', texto: '| a | b |\n| 1 | 2 |' });
	});
	it('HTML do agente fica como texto', () => {
		expect(blocos('<script>alert(1)</script>')).toEqual([{ tipo: 'p', partes: [{ t: '<script>alert(1)</script>' }] }]);
	});
});
