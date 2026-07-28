import { fail } from '@sveltejs/kit';
import { carregarCalendario, UUID_RE } from '$lib/server/calendario';
import { CONTEUDO_STATUS } from '$lib/conteudo';
import { exigirPermissao } from '$lib/server/permissao';
import type { PageServerLoad, Actions } from './$types';

const STATUS_VALIDOS = new Set<string>(CONTEUDO_STATUS.map((s) => s.value));

export const load: PageServerLoad = async ({ url, locals: { supabase } }) =>
	carregarCalendario(supabase, url);

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Campos duplicáveis de um conteúdo (exclui id/timestamps). */
const COPIAVEIS =
	'cliente_id, projeto_id, responsavel_id, tipo, tipos, titulo, status, legenda, arte_url, redes, publicado_manual';

export const actions: Actions = {
	// Arrastar-e-soltar: mover o post para outra data (mantém a hora enviada).
	mover: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const dp = String(fd.get('data_publicacao') ?? '');
		if (!UUID_RE.test(id) || !ISO_RE.test(dp)) return fail(400, { error: 'Dados inválidos.' });
		const { error } = await supabase.from('conteudos').update({ data_publicacao: dp }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},
	// Arrastar-e-soltar: copiar o post para outra data (duplica na nova data).
	copiar: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const dp = String(fd.get('data_publicacao') ?? '');
		if (!UUID_RE.test(id) || !ISO_RE.test(dp)) return fail(400, { error: 'Dados inválidos.' });
		const { data: orig, error: e1 } = await supabase
			.from('conteudos')
			.select(COPIAVEIS)
			.eq('id', id)
			.single();
		if (e1 || !orig) return fail(404, { error: e1?.message ?? 'Conteúdo não encontrado.' });
		const { error } = await supabase.from('conteudos').insert({ ...orig, data_publicacao: dp });
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},
	// Alterar status rápido pelo card (ex.: bolinha "Programar").
	definirStatus: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const status = String(fd.get('status') ?? '');
		if (!UUID_RE.test(id) || !STATUS_VALIDOS.has(status)) return fail(400, { error: 'Dados inválidos.' });
		const { error } = await supabase.from('conteudos').update({ status }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},
	// Backlog → calendário: define a data de um conteúdo que ainda não tinha.
	// Veio de /conteudo/calendario, que foi absorvida pelo Calendário Editorial.
	agendar: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const dp = String(fd.get('data_publicacao') ?? '');
		if (!UUID_RE.test(id) || !ISO_RE.test(dp)) return fail(400, { error: 'Dados inválidos.' });
		const { error } = await supabase.from('conteudos').update({ data_publicacao: dp }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},
	// Tira a data de um conteúdo, devolvendo-o ao backlog.
	desagendar: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		if (!UUID_RE.test(id)) return fail(400, { error: 'ID inválido.' });
		const { error } = await supabase
			.from('conteudos')
			.update({ data_publicacao: null })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},
	// Excluir conteúdo (botão no modal de edição do calendário).
	excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'excluir');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		if (!UUID_RE.test(id)) return fail(400, { error: 'ID inválido.' });
		const { error } = await supabase.from('conteudos').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	}
};
