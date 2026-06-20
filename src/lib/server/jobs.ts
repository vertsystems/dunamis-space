/**
 * Fila de jobs em segundo plano (server-side).
 *
 * - `enqueue()` insere um job `pending` e dispara o worker imediatamente
 *   (best-effort, não bloqueia a resposta). O Vercel Cron processa de novo
 *   periodicamente como rede de segurança / retries.
 * - `processPending()` é chamado pelo endpoint `/api/cron/process-jobs`.
 *
 * Para adicionar um tipo de job: registre um handler em `handlers` e um rótulo
 * em `$lib/jobs` (JOB_LABELS).
 */
import { getAdmin } from './supabaseAdmin';

export type JobHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<string, JobHandler> = {
	// Handler de exemplo — simula trabalho pesado e devolve um resultado.
	demo: async (payload) => {
		await new Promise((r) => setTimeout(r, 1500));
		return { ok: true, echo: payload ?? null, concluido_em: new Date().toISOString() };
	}
	// relatorio_financeiro: async (payload) => { ... },
	// sync_anuncios: async (payload) => { ... },
	// envio_email: async (payload) => { ... }
};

type EnqueueOpts = { criadoPor?: string | null; origin?: string; secret?: string };

/** Enfileira um job e dispara o worker imediatamente (best-effort). Retorna o id. */
export async function enqueue(
	tipo: string,
	payload: Record<string, unknown> = {},
	opts: EnqueueOpts = {}
): Promise<string> {
	const admin = getAdmin();
	if (!admin) throw new Error('Fila indisponível: defina SUPABASE_SERVICE_ROLE_KEY.');

	const { data, error } = await admin
		.from('jobs')
		.insert({ tipo, payload, criado_por: opts.criadoPor ?? null })
		.select('id')
		.single();
	if (error) throw error;

	// Processamento imediato (não aguardado) — no plano Hobby o cron é só diário.
	if (opts.origin) {
		const headers: Record<string, string> = {};
		if (opts.secret) headers.authorization = `Bearer ${opts.secret}`;
		fetch(`${opts.origin}/api/cron/process-jobs`, { method: 'POST', headers }).catch(() => {});
	}

	return data.id as string;
}

/** Processa até `limit` jobs pendentes. Cada falha é isolada (não derruba o lote). */
export async function processPending(limit = 20) {
	const admin = getAdmin();
	if (!admin) return { processed: 0, skipped: 'SUPABASE_SERVICE_ROLE_KEY ausente' };

	const { data: pend } = await admin
		.from('jobs')
		.select('id, tipo, payload, tentativas')
		.eq('status', 'pending')
		.order('created_at', { ascending: true })
		.limit(limit);

	const list = pend ?? [];
	if (!list.length) return { processed: 0 };

	// Marca o lote como running para evitar reprocessamento concorrente.
	await admin
		.from('jobs')
		.update({ status: 'running', updated_at: new Date().toISOString() })
		.in(
			'id',
			list.map((j) => j.id)
		);

	let ok = 0;
	let fail = 0;
	for (const job of list) {
		try {
			const handler = handlers[job.tipo];
			if (!handler) throw new Error(`Tipo de job desconhecido: ${job.tipo}`);
			const resultado = await handler((job.payload as Record<string, unknown>) ?? {});
			await admin
				.from('jobs')
				.update({
					status: 'done',
					resultado: (resultado ?? {}) as never,
					erro: null,
					tentativas: (job.tentativas ?? 0) + 1,
					updated_at: new Date().toISOString()
				})
				.eq('id', job.id);
			ok++;
		} catch (e) {
			await admin
				.from('jobs')
				.update({
					status: 'failed',
					erro: e instanceof Error ? e.message : String(e),
					tentativas: (job.tentativas ?? 0) + 1,
					updated_at: new Date().toISOString()
				})
				.eq('id', job.id);
			fail++;
		}
	}

	return { processed: list.length, ok, fail };
}
