// Faxina das NFs e recibos do Pag's Up — chamada pelo cron da Vercel todo dia
// (agendamento em vercel.json). Apaga do Storage os PDFs enviados há mais de
// 3 meses; o pagamento continua dizendo que teve documento (doc_tipo) e quando
// o PDF saiu (doc_apagado_em). A regra está em $lib/pagsup/documentos.
//
// Mesmo esquema da faxina do SOS (/api/sos/limpeza): service role key porque o
// cron não tem sessão, e CRON_SECRET para só a Vercel poder chamar.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import {
	DOCS_BUCKET,
	MESES_DE_RETENCAO,
	planoDeLimpeza,
	type DocGuardado,
	type ObjetoStorage
} from '$lib/pagsup/documentos';
import type { RequestHandler } from './$types';

/** Itens por página ao listar o bucket e por lote ao atualizar o banco. */
const PAGINA = 1000;
const LOTE = 100;

function autorizado(request: Request): boolean {
	const segredo = env.CRON_SECRET;
	if (!segredo) return false;
	return request.headers.get('authorization') === `Bearer ${segredo}`;
}

export const GET: RequestHandler = async ({ request }) => {
	if (!autorizado(request)) error(401, 'Não autorizado.');

	const url = envPublic.PUBLIC_SUPABASE_URL;
	const chave = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !chave) error(500, 'Falta SUPABASE_SERVICE_ROLE_KEY para a faxina das NFs.');

	const supabase = createClient(url, chave, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	// 1. Pagamentos que ainda guardam PDF (todos: a regra precisa saber também
	//    quais estão dentro do prazo, para nunca apagar um arquivo em uso).
	const guardados: DocGuardado[] = [];
	for (let de = 0; ; de += PAGINA) {
		const { data, error: e } = await supabase
			.from('pagsup_pagamentos')
			.select('id, doc_arquivo, doc_enviado_em')
			.not('doc_arquivo', 'is', null)
			.order('id')
			.range(de, de + PAGINA - 1);
		if (e) error(500, `Falha ao ler os pagamentos: ${e.message}`);
		const lote = data ?? [];
		guardados.push(
			...lote.map((p) => ({ id: p.id, arquivo: p.doc_arquivo as string, enviadoEm: p.doc_enviado_em ?? '' }))
		);
		if (lote.length < PAGINA) break;
	}

	// 2. O bucket inteiro, para achar os órfãos (ver planoDeLimpeza).
	const objetos: ObjetoStorage[] = [];
	for (let pagina = 0; ; pagina++) {
		const { data, error: e } = await supabase.storage
			.from(DOCS_BUCKET)
			.list('', { limit: PAGINA, offset: pagina * PAGINA });
		if (e) error(500, `Falha ao listar o bucket: ${e.message}`);
		const lote = data ?? [];
		objetos.push(...lote.map((o) => ({ name: o.name, created_at: o.created_at ?? '' })));
		if (lote.length < PAGINA) break;
	}

	const { remover, expirar } = planoDeLimpeza(guardados, objetos, new Date());

	// 3. Apaga os arquivos (em lotes: o remove() do Storage tem teto por chamada).
	for (let i = 0; i < remover.length; i += LOTE) {
		const { error: e } = await supabase.storage.from(DOCS_BUCKET).remove(remover.slice(i, i + LOTE));
		if (e) error(500, `Falha ao apagar os PDFs: ${e.message}`);
	}

	// 4. Só depois marca os pagamentos. Na ordem inversa, uma falha no meio
	//    deixaria pagamento dizendo "apagado" com o arquivo ainda no bucket — e
	//    a faxina nunca mais o acharia.
	const agora = new Date().toISOString();
	for (let i = 0; i < expirar.length; i += LOTE) {
		const { error: e } = await supabase
			.from('pagsup_pagamentos')
			.update({ doc_arquivo: null, doc_apagado_em: agora })
			.in('id', expirar.slice(i, i + LOTE));
		if (e) error(500, `Falha ao marcar os pagamentos: ${e.message}`);
	}

	return json({
		ok: true,
		pdfsApagados: remover.length,
		pagamentosMarcados: expirar.length,
		pdfsGuardados: guardados.length - expirar.length,
		mesesDeRetencao: MESES_DE_RETENCAO
	});
};
