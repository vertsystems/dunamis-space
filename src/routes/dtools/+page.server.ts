import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { enqueue } from '$lib/server/jobs';

export const actions: Actions = {
	// Enfileira um job de teste (valida fila + worker + Realtime + toast).
	testJob: async ({ url }) => {
		try {
			const id = await enqueue(
				'demo',
				{ origem: 'dtools', quando: new Date().toISOString() },
				{ origin: url.origin, secret: env.CRON_SECRET }
			);
			return { enqueued: id };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Falha ao enfileirar.' });
		}
	}
};
