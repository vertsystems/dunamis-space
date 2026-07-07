import { error, fail, redirect } from '@sveltejs/kit';
import { campanhaFromForm } from '$lib/campanhas';
import { redesFromForm } from '$lib/conteudo';
import { parseMes, fmtMes, mesAnterior, mesSeguinte, celulasMes } from '$lib/calendario';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals: { supabase } }) => {
	const [{ data: campanha, error: e }, { data: clientes }, { data: colaboradores }] = await Promise.all([
		supabase.from('campanhas').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').eq('ativo', true).order('nome')
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

		// Intervalo cobrindo TODO o grid exibido — incluindo os dias que "vazam" do
		// mês anterior/seguinte para fechar as semanas — com folga de ±1 dia p/ fuso.
		// (Sem isso, agendar num dia de virada de mês inseria mas o post não aparecia.)
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
		colaboradores: colaboradores ?? [],
		calendario
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'campanhas', 'editar');
		const { supabase } = locals;
		const values = campanhaFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('campanhas').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	// Agendamento rápido de conteúdo pelo calendário (modal). O cliente vem da
	// campanha (não confiamos no formulário); data_publicacao chega como ISO UTC.
	agendar: async ({ request, params, locals }) => {
		// Agendar cria um registro em `conteudos` → guarda pelo módulo 'conteudo'.
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const str = (k: string) => {
			const v = fd.get(k);
			return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
		};

		const { data: camp } = await supabase
			.from('campanhas')
			.select('cliente_id')
			.eq('id', params.id)
			.single();
		if (!camp?.cliente_id) return fail(400, { agendarError: 'Campanha sem cliente vinculado.' });

		const dataPublicacao = str('data_publicacao');
		if (!dataPublicacao) return fail(400, { agendarError: 'Escolha um horário para o post.' });

		const { error: e } = await supabase.from('conteudos').insert({
			cliente_id: camp.cliente_id,
			titulo: str('titulo'),
			tipo: str('tipo') ?? 'feed',
			status: str('status') ?? 'programado',
			responsavel_id: str('responsavel_id'),
			redes: redesFromForm(fd),
			data_publicacao: dataPublicacao,
			publicado_manual: false
		});
		if (e) return fail(500, { agendarError: e.message });
		return { agendado: true };
	},
	delete: async ({ params, locals }) => {
		exigirPermissao(locals, 'campanhas', 'excluir');
		const { supabase } = locals;
		const { error: e } = await supabase.from('campanhas').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/campanhas');
	}
};
