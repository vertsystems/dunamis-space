import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export type SosChamado = {
	id: string;
	titulo: string;
	descricao: string | null;
	autor_nome: string | null;
	autor_email: string | null;
	rota: string | null;
	// 'em_andamento' saiu do fluxo; ainda pode chegar do banco enquanto a
	// migration 0043 não roda — a tela trata esses chamados como abertos.
	status: 'aberto' | 'resolvido' | 'em_andamento';
	created_at: string;
};

const STATUS = ['aberto', 'resolvido'];
const COLUNAS = 'id, titulo, descricao, autor_nome, autor_email, rota, status, created_at';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const statusParam = url.searchParams.get('status');
	const filtro = STATUS.includes(statusParam ?? '') ? statusParam : null;

	let query = supabase
		.from('sos_chamados')
		.select(COLUNAS)
		.order('created_at', { ascending: false });
	// "Aberto" é tudo que não foi resolvido — assim o filtro e a contagem também
	// alcançam os chamados legados em 'em_andamento'.
	if (filtro === 'resolvido') query = query.eq('status', 'resolvido');
	else if (filtro === 'aberto') query = query.neq('status', 'resolvido');

	const { data, error } = await query;

	// Degrada bem se a migration 0010 ainda não tiver rodado.
	const pendente =
		!!error && /sos_chamados|does not exist|schema cache|relation/i.test(error?.message ?? '');
	// Abertos primeiro, resolvidos no fim. O sort do JS é estável, então dentro de
	// cada grupo vale o created_at desc que veio do banco.
	const itens = pendente
		? []
		: ((data ?? []) as SosChamado[]).sort(
				(a, b) => Number(a.status === 'resolvido') - Number(b.status === 'resolvido')
			);

	let abertos = 0;
	if (!pendente) {
		const { count } = await supabase
			.from('sos_chamados')
			.select('id', { count: 'exact', head: true })
			.neq('status', 'resolvido');
		abertos = count ?? 0;
	}

	return {
		itens,
		abertos,
		filtro,
		pendente,
		loadError: pendente ? null : (error?.message ?? null)
	};
};

function idDe(fd: FormData): string | null {
	const v = fd.get('id');
	return typeof v === 'string' && v ? v : null;
}

export const actions: Actions = {
	status: async ({ request, locals }) => {
		exigirPermissao(locals, 'sos', 'editar');
		const fd = await request.formData();
		const id = idDe(fd);
		const status = (fd.get('status') as string) ?? '';
		if (!id || !STATUS.includes(status)) return fail(400, { error: 'Dados inválidos.' });
		const { error } = await locals.supabase.from('sos_chamados').update({ status }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},

	excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'sos', 'excluir');
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Chamado inválido.' });
		const { error } = await locals.supabase.from('sos_chamados').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
