// A tarefa agendada para outro dia não pode aparecer no quadro de hoje.
// Sem supabase, o store roda em memória: #persist sai fora quando não há
// cliente, então dá para exercitar criar/filtrar sem tocar no banco.
import { beforeEach, describe, expect, it } from 'vitest';
import { organyze } from './store.svelte';
import { horaOrdem, STATUS_ORDEM, type Tarefa } from './types';

const HOJE = '2026-08-10';

beforeEach(() => {
	organyze.colaboradorId = 'colab-1';
	organyze.dia = HOJE;
	organyze.tarefas = [];
});

describe('agendar tarefa para outro dia', () => {
	it('sem data escolhida, a tarefa cai no dia em foco', () => {
		organyze.addTarefa('Responder e-mails', null, 'empresa');
		expect(organyze.tarefasDia.map((t) => t.titulo)).toEqual(['Responder e-mails']);
	});

	it('com data escolhida, some do quadro de hoje', () => {
		organyze.addTarefa('Reunião do dia 20', '2026-08-20', 'empresa');
		expect(organyze.tarefasDia).toEqual([]);
		expect(organyze.tarefas).toHaveLength(1);
		expect(organyze.tarefas[0].data).toBe('2026-08-20');
	});

	it('aparece no quadro do dia agendado', () => {
		organyze.addTarefa('Reunião do dia 20', '2026-08-20', 'pessoal');
		organyze.dia = '2026-08-20';
		expect(organyze.tarefasDia.map((t) => t.titulo)).toEqual(['Reunião do dia 20']);
		expect(organyze.tarefasDia[0].categoria).toBe('pessoal');
	});

	it('agendar não preenche o prazo de entrega: são coisas diferentes', () => {
		organyze.addTarefa('Reunião do dia 20', '2026-08-20', 'empresa');
		expect(organyze.tarefas[0].prazo).toBeNull();
	});

	it('reagendar tira a tarefa do quadro atual', () => {
		const t = organyze.addTarefa('Ligar para o cliente', null, 'empresa');
		expect(organyze.tarefasDia).toHaveLength(1);
		organyze.setData(t!.id, '2026-08-12');
		expect(organyze.tarefasDia).toEqual([]);
		organyze.dia = '2026-08-12';
		expect(organyze.tarefasDia.map((t) => t.titulo)).toEqual(['Ligar para o cliente']);
	});

	it('data vazia não apaga o dia da tarefa', () => {
		const t = organyze.addTarefa('Ligar para o cliente', null, 'empresa');
		organyze.setData(t!.id, '');
		expect(organyze.tarefas[0].data).toBe(HOJE);
	});

	it('o contador do dia ignora as tarefas agendadas para outros dias', () => {
		organyze.addTarefa('Hoje 1', null, 'empresa');
		organyze.addTarefa('Hoje 2', null, 'empresa');
		organyze.addTarefa('Semana que vem', '2026-08-17', 'empresa');
		expect(organyze.total).toBe(2);
		expect(organyze.pendentes).toBe(2);
	});
});

describe('hora da tarefa', () => {
	it('guarda a hora escolhida junto com o dia', () => {
		organyze.addTarefa('Reunião', '2026-08-20', 'empresa', '14:30');
		expect(organyze.tarefas[0].data).toBe('2026-08-20');
		expect(organyze.tarefas[0].hora).toBe('14:30');
	});

	it('sem hora escolhida a tarefa fica sem horário (null, não string vazia)', () => {
		organyze.addTarefa('Tarefa solta', null, 'empresa');
		expect(organyze.tarefas[0].hora).toBeNull();
	});

	it('dá para marcar a hora sem mudar o dia, e tirar depois', () => {
		const t = organyze.addTarefa('Ligar para o cliente', null, 'empresa');
		organyze.setHora(t!.id, '09:00');
		expect(organyze.tarefas[0].hora).toBe('09:00');
		expect(organyze.tarefas[0].data).toBe(HOJE);
		organyze.setHora(t!.id, null);
		expect(organyze.tarefas[0].hora).toBeNull();
	});

	it('hora vazia vira null: o input devolve "" ao ser limpo', () => {
		const t = organyze.addTarefa('Ligar para o cliente', null, 'empresa', '10:00');
		organyze.setHora(t!.id, '');
		expect(organyze.tarefas[0].hora).toBeNull();
	});

	it('a tarefa com hora continua presa ao seu dia', () => {
		organyze.addTarefa('Reunião', '2026-08-20', 'empresa', '14:30');
		expect(organyze.tarefasDia).toEqual([]);
	});
});

describe('horaOrdem', () => {
	const comHora = (hora: string | null) => ({ hora }) as Tarefa;

	it('ordena pelo relógio', () => {
		expect(horaOrdem(comHora('09:00'))).toBeLessThan(horaOrdem(comHora('14:30')));
		expect(horaOrdem(comHora('09:05'))).toBeLessThan(horaOrdem(comHora('09:30')));
	});

	it('quem não marcou hora vai por último', () => {
		expect(horaOrdem(comHora('23:59'))).toBeLessThan(horaOrdem(comHora(null)));
	});

	it('meia-noite não é tratada como "sem hora"', () => {
		expect(horaOrdem(comHora('00:00'))).toBe(0);
		expect(horaOrdem(comHora('00:00'))).toBeLessThan(horaOrdem(comHora('00:01')));
	});
});

describe('ordem das seções do quadro', () => {
	it('em execução, depois não iniciado, e concluídas por último', () => {
		expect(STATUS_ORDEM).toEqual(['em_execucao', 'nao_iniciado', 'concluida']);
	});
});
