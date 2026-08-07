// Rota TEMPORÁRIA de diagnóstico de latência função ↔ banco.
//
// Existe para decidir com números (e não com palpite) se vale alinhar a região
// das funções da Vercel à região do Supabase. Mede do lado do servidor, então
// isola a rede função→banco da rede usuário→função.
//
// Não expõe nenhum dado: só tempos, contagem e a região da função. Ainda assim
// pede uma chave na query string para não ficar aberta, e DEVE ser removida
// assim que a medição terminar.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const CHAVE = 'dspace-diag-2026';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	if (url.searchParams.get('k') !== CHAVE) throw error(404, 'Not found');

	/** Uma ida e volta ao banco, o mais barata possível. */
	const ping = async () => {
		await supabase.from('clientes').select('id', { count: 'exact', head: true });
	};

	const cronometrar = async (fn: () => Promise<unknown>) => {
		const t0 = performance.now();
		await fn();
		return Math.round(performance.now() - t0);
	};

	// Aquece (conexão/TLS já estabelecidos) antes de medir.
	await ping();

	const uma = await cronometrar(ping);
	const cinco_paralelas = await cronometrar(() => Promise.all(Array.from({ length: 5 }, ping)));
	const cinco_sequenciais = await cronometrar(async () => {
		for (let i = 0; i < 5; i++) await ping();
	});

	return json({
		regiao_da_funcao: env.VERCEL_REGION ?? 'local',
		ms: { uma, cinco_paralelas, cinco_sequenciais },
		por_query_sequencial: Math.round(cinco_sequenciais / 5)
	});
};
