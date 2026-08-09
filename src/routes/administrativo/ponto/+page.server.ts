// Acompanhamento do ponto (CEO/Admin): quem está trabalhando agora, o
// fechamento do mês por pessoa e a fila de pedidos de ajuste.
//
// Quem entra aqui precisa do módulo 'ponto'. Bater o próprio ponto NÃO passa
// por esta tela — isso é o Meu Dia, livre para qualquer autenticado.
import { error, fail } from '@sveltejs/kit';
import { hojeISO } from '$lib/datas';
import { temNivel } from '$lib/permissoes';
import { sel, selUm } from '$lib/server/query';
import { exigirPermissao } from '$lib/server/permissao';
import {
	CAMPOS,
	intervaloDoMes,
	jornadaDe,
	mesAtual,
	resumoPeriodo,
	type Registro
} from '$lib/ponto';
import type { Actions, PageServerLoad } from './$types';

const COLS_PONTO = 'id, colaborador_id, data, entrada, almoco_saida, almoco_volta, saida, observacao';
const COLS_COLAB = 'id, nome, email, funcao, funcoes, avatar_url, jornada_minutos, jornada_dias';

export type ColabPonto = {
	id: string;
	nome: string;
	funcao: string | null;
	funcoes: string[] | null;
	avatar_url: string | null;
	jornada_minutos: number | null;
	jornada_dias: number[] | null;
};

export const load: PageServerLoad = async ({ url, locals: { supabase, permissoes } }) => {
	if (!temNivel(permissoes, 'ponto', 'ver')) throw error(403, 'Sem permissão para ver o ponto.');

	const hoje = hojeISO();
	const mesParam = url.searchParams.get('mes');
	const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? (mesParam as string) : mesAtual();
	const { inicio, fim } = intervaloDoMes(mes);

	const [colaboradores, registrosMes, registrosHoje, ajustes] = await Promise.all([
		sel<ColabPonto>(
			supabase.from('colaboradores').select(COLS_COLAB).eq('ativo', true).order('nome'),
			'ponto: colaboradores ativos'
		),
		sel<Registro & { colaborador_id: string }>(
			supabase
				.from('ponto_registros')
				.select(COLS_PONTO)
				.gte('data', inicio)
				.lte('data', fim)
				.order('data', { ascending: true }),
			`ponto: registros de ${mes}`
		),
		sel<Registro & { colaborador_id: string }>(
			supabase.from('ponto_registros').select(COLS_PONTO).eq('data', hoje),
			'ponto: registros de hoje'
		),
		sel(
			supabase
				.from('ponto_ajustes')
				.select(
					'id, colaborador_id, data, entrada, almoco_saida, almoco_volta, saida, motivo, status, resposta, decidido_em, created_at'
				)
				.order('created_at', { ascending: false })
				.limit(80),
			'ponto: pedidos de ajuste'
		)
	]);

	// O fechamento do mês é conta de servidor: a tela só desenha o resultado.
	const porColab = new Map<string, (Registro & { colaborador_id: string })[]>();
	for (const r of registrosMes) {
		const lista = porColab.get(r.colaborador_id) ?? [];
		lista.push(r);
		porColab.set(r.colaborador_id, lista);
	}

	const resumos = colaboradores.map((c) => {
		const jornada = jornadaDe(c);
		return {
			colaborador_id: c.id,
			jornada,
			...resumoPeriodo(porColab.get(c.id) ?? [], jornada, inicio, fim, hoje)
		};
	});

	const hojePorColab = Object.fromEntries(registrosHoje.map((r) => [r.colaborador_id, r]));

	// Para julgar um pedido de ajuste é preciso ver o que está gravado hoje no
	// dia pedido — que pode ser de outro mês que não o selecionado. Segunda onda
	// curta, e só quando há fila.
	const pendentes = (ajustes as { status: string; data: string }[]).filter(
		(a) => a.status === 'pendente'
	);
	const registrosDosPedidos = pendentes.length
		? await sel<Registro & { colaborador_id: string }>(
				supabase
					.from('ponto_registros')
					.select(COLS_PONTO)
					.in('data', [...new Set(pendentes.map((a) => a.data))]),
				'ponto: registros dos dias com pedido'
			)
		: [];

	return {
		registrosDosPedidos,
		hoje,
		mes,
		colaboradores,
		registrosHoje: hojePorColab,
		registrosMes,
		resumos,
		ajustes,
		podeEditar: temNivel(permissoes, 'ponto', 'editar')
	};
};

export const actions: Actions = {
	/**
	 * Aprova ou recusa um pedido de ajuste. Aprovar grava as quatro batidas
	 * pedidas no dia (criando o registro se ele nem existia — o caso de quem
	 * esqueceu de bater o dia inteiro) e deixa marcado quem aprovou.
	 */
	decidirAjuste: async ({ request, locals }) => {
		exigirPermissao(locals, 'ponto', 'editar');
		const { supabase } = locals;

		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const decisao = String(fd.get('decisao') ?? '');
		const resposta = String(fd.get('resposta') ?? '').trim() || null;
		if (!id || !['aprovado', 'recusado'].includes(decisao))
			return fail(400, { error: 'Decisão inválida.' });

		const ajuste = await selUm<{
			id: string;
			colaborador_id: string;
			data: string;
			entrada: string | null;
			almoco_saida: string | null;
			almoco_volta: string | null;
			saida: string | null;
			status: string;
		}>(
			supabase
				.from('ponto_ajustes')
				.select('id, colaborador_id, data, entrada, almoco_saida, almoco_volta, saida, status')
				.eq('id', id)
				.maybeSingle(),
			'ponto/decidirAjuste: pedido'
		);
		if (!ajuste) return fail(404, { error: 'Pedido não encontrado.' });
		if (ajuste.status !== 'pendente') return fail(409, { error: 'Este pedido já foi decidido.' });

		// Quem está decidindo — mesma resolução que a RLS usa (auth.uid → colaborador).
		const { data: quemDecideId } = await supabase.rpc('colaborador_atual');
		const quemDecide = (quemDecideId as string | null) ?? null;

		if (decisao === 'aprovado') {
			const batidas = Object.fromEntries(CAMPOS.map((c) => [c, ajuste[c]]));
			const existente = await selUm<{ id: string }>(
				supabase
					.from('ponto_registros')
					.select('id')
					.eq('colaborador_id', ajuste.colaborador_id)
					.eq('data', ajuste.data)
					.maybeSingle(),
				'ponto/decidirAjuste: registro do dia'
			);
			const patch = {
				...batidas,
				observacao: 'Ajuste aprovado pela gestão',
				editado_por: quemDecide,
				editado_em: new Date().toISOString()
			};
			const { error: e } = existente
				? await supabase.from('ponto_registros').update(patch).eq('id', existente.id)
				: await supabase
						.from('ponto_registros')
						.insert({ colaborador_id: ajuste.colaborador_id, data: ajuste.data, ...patch });
			if (e) return fail(500, { error: e.message });
		}

		const { error: e } = await supabase
			.from('ponto_ajustes')
			.update({
				status: decisao,
				resposta,
				decidido_por: quemDecide,
				decidido_em: new Date().toISOString()
			})
			.eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { ok: true };
	}
};
