// O que updateTarefa realmente manda ao banco.
//
// Existe por causa de um bug real: `data` não estava na lista de campos
// copiados, então reagendar a tarefa mudava a tela e não gravava nada — e o
// TypeScript não pega, porque sobra de propriedade em objeto não-literal passa.
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateTarefa } from './db';

/** Supabase de mentira: guarda o row do .update() e diz que deu certo. */
function fakeSupabase() {
	const capturado: { tabela?: string; row?: Record<string, unknown>; id?: unknown } = {};
	const client = {
		from(tabela: string) {
			capturado.tabela = tabela;
			return {
				update(row: Record<string, unknown>) {
					capturado.row = row;
					return {
						eq(_coluna: string, id: unknown) {
							capturado.id = id;
							return Promise.resolve({ error: null });
						}
					};
				}
			};
		}
	} as unknown as SupabaseClient;
	return { client, capturado };
}

describe('updateTarefa', () => {
	it('grava o novo dia ao reagendar', async () => {
		const { client, capturado } = fakeSupabase();
		await updateTarefa(client, 'tarefa-1', { data: '2026-08-20' });
		expect(capturado.tabela).toBe('organyze_tarefas');
		expect(capturado.id).toBe('tarefa-1');
		expect(capturado.row).toEqual({ data: '2026-08-20' });
	});

	it('grava a hora, inclusive quando ela é removida', async () => {
		const marcada = fakeSupabase();
		await updateTarefa(marcada.client, 'tarefa-1', { hora: '14:30' });
		expect(marcada.capturado.row).toEqual({ hora: '14:30' });

		const removida = fakeSupabase();
		await updateTarefa(removida.client, 'tarefa-1', { hora: null });
		// null precisa chegar ao banco; se o campo sumisse, a coluna ficaria intacta.
		expect(removida.capturado.row).toEqual({ hora: null });
	});

	it('só manda o que mudou', async () => {
		const { client, capturado } = fakeSupabase();
		await updateTarefa(client, 'tarefa-1', { titulo: 'Novo título' });
		expect(capturado.row).toEqual({ titulo: 'Novo título' });
	});

	it('status arrasta o `concluida` junto, que é lido pelo código antigo', async () => {
		const { client, capturado } = fakeSupabase();
		await updateTarefa(client, 'tarefa-1', { status: 'concluida' });
		expect(capturado.row).toEqual({ status: 'concluida', concluida: true });
	});
});
