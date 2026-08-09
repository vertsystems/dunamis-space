// Espelho de ponto de uma pessoa no mês: o dia a dia completo, com as batidas
// editáveis por quem tem 'editar' no módulo. É a tela que se imprime/exporta
// quando alguém questiona o fechamento.
import { error, fail } from '@sveltejs/kit';
import { hojeISO } from '$lib/datas';
import { temNivel } from '$lib/permissoes';
import { sel, selUm } from '$lib/server/query';
import { exigirPermissao } from '$lib/server/permissao';
import {
	CAMPOS,
	instanteSP,
	intervaloDoMes,
	jornadaDe,
	mesAtual,
	resumoPeriodo,
	type Campo,
	type Registro
} from '$lib/ponto';
import type { Actions, PageServerLoad } from './$types';

const COLS_PONTO = 'id, colaborador_id, data, entrada, almoco_saida, almoco_volta, saida, observacao';

export const load: PageServerLoad = async ({ params, url, locals: { supabase, permissoes } }) => {
	if (!temNivel(permissoes, 'ponto', 'ver')) throw error(403, 'Sem permissão para ver o ponto.');

	const mesParam = url.searchParams.get('mes');
	const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? (mesParam as string) : mesAtual();
	const { inicio, fim } = intervaloDoMes(mes);
	const hoje = hojeISO();

	const colaborador = await selUm<{
		id: string;
		nome: string;
		email: string;
		funcao: string | null;
		funcoes: string[] | null;
		jornada_minutos: number | null;
		jornada_dias: number[] | null;
	}>(
		supabase
			.from('colaboradores')
			.select('id, nome, email, funcao, funcoes, jornada_minutos, jornada_dias')
			.eq('id', params.id)
			.maybeSingle(),
		'ponto/espelho: colaborador'
	);
	if (!colaborador) throw error(404, 'Colaborador não encontrado');

	const [registros, ajustes] = await Promise.all([
		sel<Registro>(
			supabase
				.from('ponto_registros')
				.select(COLS_PONTO)
				.eq('colaborador_id', params.id)
				.gte('data', inicio)
				.lte('data', fim)
				.order('data', { ascending: true }),
			'ponto/espelho: registros do mês'
		),
		sel(
			supabase
				.from('ponto_ajustes')
				.select('id, data, motivo, status, resposta, created_at')
				.eq('colaborador_id', params.id)
				.gte('data', inicio)
				.lte('data', fim),
			'ponto/espelho: ajustes do mês'
		)
	]);

	const jornada = jornadaDe(colaborador);

	return {
		colaborador,
		jornada,
		mes,
		hoje,
		registros,
		ajustes,
		resumo: resumoPeriodo(registros, jornada, inicio, fim, hoje),
		podeEditar: temNivel(permissoes, 'ponto', 'editar')
	};
};

export const actions: Actions = {
	/**
	 * Grava as quatro batidas de um dia à mão (correção da gestão). Horas vazias
	 * apagam a batida — é assim que se desfaz um registro lançado errado.
	 */
	salvarDia: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'ponto', 'editar');
		const { supabase } = locals;

		const fd = await request.formData();
		const data = String(fd.get('data') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return fail(400, { error: 'Dia inválido.' });

		const batidas = Object.fromEntries(
			CAMPOS.map((c) => [c, instanteSP(data, String(fd.get(c) ?? ''))])
		) as Record<Campo, string | null>;
		const observacao = String(fd.get('observacao') ?? '').trim() || null;

		const { data: quemEdita } = await supabase.rpc('colaborador_atual');
		const patch = {
			...batidas,
			observacao,
			editado_por: (quemEdita as string | null) ?? null,
			editado_em: new Date().toISOString()
		};

		const existente = await selUm<{ id: string }>(
			supabase
				.from('ponto_registros')
				.select('id')
				.eq('colaborador_id', params.id)
				.eq('data', data)
				.maybeSingle(),
			'ponto/espelho: registro do dia'
		);

		const { error: e } = existente
			? await supabase.from('ponto_registros').update(patch).eq('id', existente.id)
			: await supabase
					.from('ponto_registros')
					.insert({ colaborador_id: params.id, data, ...patch });
		if (e) return fail(500, { error: e.message });
		return { ok: true };
	},

	/** Jornada esperada da pessoa (minutos/dia e dias da semana). */
	salvarJornada: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'ponto', 'editar');
		const { supabase } = locals;

		const fd = await request.formData();
		const minutos = Number(fd.get('jornada_minutos'));
		if (!Number.isInteger(minutos) || minutos < 0 || minutos > 1440)
			return fail(400, { error: 'Jornada inválida.' });
		const dias = fd
			.getAll('jornada_dias')
			.map(Number)
			.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

		const { error: e } = await supabase
			.from('colaboradores')
			.update({ jornada_minutos: minutos, jornada_dias: dias })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { ok: true };
	}
};
