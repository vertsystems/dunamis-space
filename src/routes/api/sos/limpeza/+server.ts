// Faxina dos prints do SOS — chamada pelo cron da Vercel a cada 15 dias
// (agendamento em vercel.json). Ver a regra em $lib/sosLimpeza.
//
// Por que precisa da service role key: apagar no Storage exige um papel com
// permissão de escrita, e o cron não tem sessão de usuário. A anon key aqui só
// conseguiria ler.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { SOS_BUCKET, imagensDe, nomeDoObjeto } from '$lib/sosImagem';
import { DIAS_DE_GRACA, imagensRestantes, objetosAApagar } from '$lib/sosLimpeza';
import type { RequestHandler } from './$types';

/** Quantos objetos pedir por página ao Storage. */
const PAGINA = 1000;

/**
 * Só a Vercel (ou quem tiver o segredo) roda a faxina.
 *
 * O cron da Vercel manda `Authorization: Bearer $CRON_SECRET` sozinho quando a
 * variável existe no projeto. Sem CRON_SECRET configurado a rota fica fechada:
 * melhor não rodar do que ficar aberta para qualquer um apagar imagem.
 */
function autorizado(request: Request): boolean {
	const segredo = env.CRON_SECRET;
	if (!segredo) return false;
	return request.headers.get('authorization') === `Bearer ${segredo}`;
}

export const GET: RequestHandler = async ({ request }) => {
	if (!autorizado(request)) error(401, 'Não autorizado.');

	const url = envPublic.PUBLIC_SUPABASE_URL;
	const chave = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !chave) {
		error(500, 'Falta SUPABASE_SERVICE_ROLE_KEY para a faxina do SOS.');
	}

	// Cliente de serviço: sem sessão, sem persistir nada.
	const supabase = createClient(url, chave, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	// 1. Lista o bucket inteiro (paginado — o list() tem teto por chamada).
	const objetos: { name: string; created_at: string }[] = [];
	for (let pagina = 0; ; pagina++) {
		const { data, error: e } = await supabase.storage
			.from(SOS_BUCKET)
			.list('', { limit: PAGINA, offset: pagina * PAGINA });
		if (e) error(500, `Falha ao listar o bucket: ${e.message}`);
		const lote = data ?? [];
		// created_at vem como string | null na tipagem do Storage; sem data o
		// objeto não é apagado (ver objetosAApagar), então '' já basta.
		objetos.push(...lote.map((o) => ({ name: o.name, created_at: o.created_at ?? '' })));
		if (lote.length < PAGINA) break;
	}

	const alvos = objetosAApagar(objetos, new Date());
	if (!alvos.length) {
		return json({ ok: true, apagadas: 0, mantidas: objetos.length, diasDeGraca: DIAS_DE_GRACA });
	}

	// 2. Apaga os arquivos.
	const { error: eRemove } = await supabase.storage.from(SOS_BUCKET).remove(alvos);
	if (eRemove) error(500, `Falha ao apagar as imagens: ${eRemove.message}`);

	// 3. Tira as URLs mortas dos chamados. Sem isto a tela tentaria mostrar
	//    imagem que não existe mais (quadrado quebrado no lugar do print).
	const apagadas = new Set(alvos);
	//    Sem filtro no banco de propósito: montar um `or` que entenda coluna de
	//    array no PostgREST é fácil de errar, e a tabela de chamados é pequena —
	//    filtrar aqui é mais barato que uma query torta.
	const { data: chamados, error: eSel } = await supabase
		.from('sos_chamados')
		.select('id, imagens, imagem_url');
	if (eSel) error(500, `Falha ao ler os chamados: ${eSel.message}`);

	let limpos = 0;
	for (const c of chamados ?? []) {
		const restantes = imagensRestantes(imagensDe(c), apagadas, nomeDoObjeto);
		if (!restantes) continue;
		await supabase
			.from('sos_chamados')
			.update({ imagens: restantes, imagem_url: restantes[0] ?? null })
			.eq('id', c.id);
		limpos++;
	}

	return json({
		ok: true,
		apagadas: alvos.length,
		mantidas: objetos.length - alvos.length,
		chamadosAtualizados: limpos,
		diasDeGraca: DIAS_DE_GRACA
	});
};
