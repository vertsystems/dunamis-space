import { error, fail, redirect } from '@sveltejs/kit';
import { campanhaFromForm } from '$lib/campanhas';
import { parseMes, fmtMes, mesAnterior, mesSeguinte } from '$lib/calendario';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals: { supabase } }) => {
	const [{ data: campanha, error: e }, { data: clientes }] = await Promise.all([
		supabase.from('campanhas').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome')
	]);
	if (e || !campanha) throw error(404, 'Campanha não encontrada');

	// Calendário de conteúdos: só quando a campanha tem início e fim definidos.
	// Mês exibido: ?cal=AAAA-MM (navegação) ou, por padrão, o mês de início.
	let calendario = null;
	if (campanha.data_inicio && campanha.data_fim) {
		const base = parseMes(url.searchParams.get('cal')) ?? {
			ano: Number(campanha.data_inicio.slice(0, 4)),
			mes: Number(campanha.data_inicio.slice(5, 7)) - 1
		};
		const { ano, mes } = base;

		// Intervalo do mês com folga de ±1 dia (segurança de fuso, igual ao módulo Conteúdo).
		const DIA = 86_400_000;
		const gte = new Date(Date.UTC(ano, mes, 1) - DIA).toISOString();
		const lt = new Date(Date.UTC(ano, mes + 1, 1) + DIA).toISOString();

		const { data: conteudos } = await supabase
			.from('conteudos')
			.select('id, titulo, tipo, status, data_publicacao')
			.eq('cliente_id', campanha.cliente_id)
			.not('data_publicacao', 'is', null)
			.gte('data_publicacao', gte)
			.lt('data_publicacao', lt)
			.order('data_publicacao', { ascending: true });

		calendario = {
			ano,
			mes,
			atual: fmtMes(ano, mes),
			prev: mesAnterior(ano, mes),
			next: mesSeguinte(ano, mes),
			inicioMes: fmtMes(Number(campanha.data_inicio.slice(0, 4)), Number(campanha.data_inicio.slice(5, 7)) - 1),
			conteudos: conteudos ?? []
		};
	}

	return {
		campanha,
		clientes: clientes ?? [],
		calendario
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = campanhaFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('campanhas').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('campanhas').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/campanhas');
	}
};
