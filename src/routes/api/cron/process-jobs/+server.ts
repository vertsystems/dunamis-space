import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { processPending } from '$lib/server/jobs';
import type { RequestHandler } from './$types';

// Processa a fila de jobs. Acionado por:
//  - Vercel Cron (GET, manda Authorization: Bearer $CRON_SECRET automaticamente)
//  - enqueue() logo após criar um job (POST, best-effort imediato)
const handler: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
		throw error(401, 'Não autorizado');
	}
	const result = await processPending(20);
	return json(result);
};

export const GET = handler;
export const POST = handler;
