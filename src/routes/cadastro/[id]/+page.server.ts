import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import { parseMes, fmtMes, mesAnterior, mesSeguinte, celulasMes } from '$lib/calendario';
import { um } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';

/** Erro de coluna inexistente → migration 0006 ainda não aplicada. */
const PENDENTE_RX = /does not exist|column|schema cache|relation/i;

/** Mês atual no fuso de negócio (SP) — o runtime pode ser UTC (Vercel). */
function mesAtualSP(): { ano: number; mes: number } {
	const s = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Sao_Paulo',
		year: 'numeric',
		month: '2-digit'
	}).format(new Date());
	const [a, m] = s.split('-').map(Number);
	return { ano: a, mes: m - 1 };
}

export const load: PageServerLoad = async ({ params, url, locals: { supabase } }) => {
	const [{ data: cliente, error: e }, { data: colaboradores }] = await Promise.all([
		supabase.from('clientes').select('*, responsavel:colaboradores(nome)').eq('id', params.id).single(),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	// Calendário de posts do cliente. Mês exibido: ?cal=AAAA-MM ou o mês atual.
	const hoje = mesAtualSP();
	const base = parseMes(url.searchParams.get('cal')) ?? hoje;
	const { ano, mes } = base;
	const cels = celulasMes(ano, mes);
	const primeira = cels[0];
	const ultima = cels[cels.length - 1];
	const DIA = 86_400_000;
	const gte = new Date(
		Date.UTC(primeira.getFullYear(), primeira.getMonth(), primeira.getDate()) - DIA
	).toISOString();
	const lt = new Date(
		Date.UTC(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() + 1) + DIA
	).toISOString();

	const { data: conteudos } = await supabase
		.from('conteudos')
		.select('id, titulo, tipo, status, data_publicacao')
		.eq('cliente_id', params.id)
		.not('data_publicacao', 'is', null)
		.gte('data_publicacao', gte)
		.lt('data_publicacao', lt)
		.order('data_publicacao', { ascending: true });

	return {
		cliente: {
			...cliente,
			responsavel_nome: um<{ nome: string }>(cliente.responsavel)?.nome ?? null
		},
		colaboradores: colaboradores ?? [],
		calendario: {
			ano,
			mes,
			atual: fmtMes(ano, mes),
			prev: mesAnterior(ano, mes),
			next: mesSeguinte(ano, mes),
			inicioMes: fmtMes(hoje.ano, hoje.mes),
			conteudos: conteudos ?? []
		}
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = clienteFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase
			.from('clientes')
			.update({ ...values, updated_at: new Date().toISOString() })
			.eq('id', params.id);
		if (e) {
			const msg = PENDENTE_RX.test(e.message)
				? 'Módulo ainda não ativado. Aplique a migration 0006_administrativo.sql no Supabase.'
				: e.message;
			return fail(500, { error: msg, values });
		}
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('clientes').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/cadastro');
	}
};
