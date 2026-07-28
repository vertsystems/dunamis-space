import { um } from '$lib/db';
import { fail } from '@sveltejs/kit';
import { hojeSP } from '$lib/rotina';
import { funcaoLabel } from '$lib/equipe';
import { sel, selUm } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

/** Colaborador do usuário logado (por auth_user_id, com fallback por e-mail). */
async function meuColab(supabase: App.Locals['supabase'], user: { id: string; email?: string } | null) {
	if (!user) return null;
	let { data } = await supabase
		.from('colaboradores')
		.select('id, nome, funcao, funcoes')
		.eq('auth_user_id', user.id)
		.maybeSingle();
	if (!data && user.email) {
		({ data } = await supabase
			.from('colaboradores')
			.select('id, nome, funcao, funcoes')
			.eq('email', user.email)
			.maybeSingle());
	}
	return data ?? null;
}

/** Só CEO e Admin podem gerenciar a rotina (criar/editar/excluir) e trocar de cargo. */
function ehGestor(colab: { funcao?: string | null; funcoes?: string[] | null } | null): boolean {
	const fns = colab?.funcoes?.length ? colab.funcoes : colab?.funcao ? [colab.funcao] : [];
	return fns.includes('ceo') || fns.includes('admin');
}

export const load: PageServerLoad = async ({ locals: { supabase, user }, url }) => {
	// Esta página era a mais lenta do app: 8 round-trips estritamente sequenciais,
	// um deles um auth.getUser() que o hooks.server.ts já tinha resolvido de graça
	// em `locals.user`. Agora são 2 ondas.
	//
	// Onda 1 — o colaborador e os cargos com rotina não dependem um do outro.
	const [colab, cargosRaw] = await Promise.all([
		meuColab(supabase, user),
		sel(supabase.from('rotina_itens').select('cargo'), 'meu-dia: cargos com rotina')
	]);
	const meuId = (colab?.id as string | undefined) ?? null;
	const meusCargos: string[] = colab?.funcoes?.length
		? colab.funcoes
		: colab?.funcao
			? [colab.funcao]
			: [];

	const cargosComRotina = [...new Set(cargosRaw.map((r) => r.cargo as string))];
	// União: cargos do usuário + os que já têm rotina cadastrada (para o seletor).
	const cargosOpcoes = [...new Set([...meusCargos, ...cargosComRotina])]
		.map((c) => ({ value: c, label: funcaoLabel(c) }))
		.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

	const podeGerenciar = ehGestor(colab);
	const cargoParam = url.searchParams.get('cargo');
	// Padrão = cargo do próprio usuário. Só gestores (CEO/Admin) podem trocar de
	// cargo pelo seletor; os demais ficam sempre no próprio cargo.
	const cargoSel =
		(podeGerenciar && cargoParam && cargosOpcoes.some((c) => c.value === cargoParam) && cargoParam) ||
		meusCargos[0] ||
		cargosComRotina[0] ||
		'social_media';

	const { data: hoje } = { data: hojeSP() };

	// O módulo de Tarefas foi aposentado; o trabalho agora é centrado em conteúdo.
	// Aqui entram as próximas publicações sob responsabilidade da pessoa.
	let tq = supabase
		.from('conteudos')
		.select('id, titulo, tipo, status, data_publicacao, cliente:clientes(nome)')
		.not('data_publicacao', 'is', null)
		.neq('status', 'publicado')
		.order('data_publicacao', { ascending: true })
		.limit(60);
	if (meuId) tq = tq.eq('responsavel_id', meuId);

	let aq = supabase
		.from('crm_atividades')
		.select(
			'id, tipo, titulo, data_hora, negocio:crm_negocios(id, titulo), contato:crm_contatos(id, nome)'
		)
		.eq('concluida', false)
		.order('data_hora', { ascending: true, nullsFirst: false })
		.limit(60);
	if (meuId) aq = aq.eq('responsavel_id', meuId);

	// Onda 2 — as quatro dependem só de `cargoSel`/`meuId`, já resolvidos acima.
	const [rotinaItens, feitosRaw, publicacoesRaw, atividadesRes] = await Promise.all([
		sel(
			supabase
				.from('rotina_itens')
				.select('id, cargo, dia_semana, titulo, ordem')
				.eq('cargo', cargoSel)
				.order('dia_semana', { ascending: true })
				.order('ordem', { ascending: true }),
			`meu-dia: itens da rotina (cargo ${cargoSel})`
		),
		meuId
			? sel(
					supabase
						.from('rotina_conclusoes')
						.select('item_id')
						.eq('colaborador_id', meuId)
						.eq('data', hoje.data),
					'meu-dia: conclusões da rotina de hoje'
				)
			: Promise.resolve([] as { item_id: string }[]),
		sel(tq, 'meu-dia: próximas publicações'),
		aq
	]);
	const feitos = feitosRaw.map((c) => c.item_id as string);
	const { data: atividadesRaw, error: aErr } = atividadesRes;

	const publicacoes = publicacoesRaw.map((c) => ({
		id: c.id as string,
		titulo: (c.titulo as string | null) ?? null,
		tipo: c.tipo as string,
		status: c.status as string,
		data_publicacao: c.data_publicacao as string,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	const atividades = aErr
		? []
		: (atividadesRaw ?? []).map((a) => ({
				id: a.id as string,
				tipo: a.tipo as string,
				titulo: (a.titulo as string | null) ?? null,
				data_hora: (a.data_hora as string | null) ?? null,
				negocio_titulo: um<{ id: string; titulo: string }>(a.negocio)?.titulo ?? null,
				contato_nome: um<{ id: string; nome: string }>(a.contato)?.nome ?? null
			}));

	return {
		nome: (colab?.nome as string | undefined) ?? null,
		semColaborador: !meuId,
		publicacoes,
		atividades,
		rotina: {
			podeGerenciar,
			cargoSel,
			cargoLabel: funcaoLabel(cargoSel),
			cargos: cargosOpcoes,
			itens: rotinaItens as {
				id: string;
				cargo: string;
				dia_semana: number;
				titulo: string;
				ordem: number;
			}[],
			feitos,
			dia: hoje.dia,
			dataHoje: hoje.data
		}
	};
};

export const actions: Actions = {
	// Marca/desmarca um item da rotina como feito hoje (por pessoa/dia).
	toggleRotina: async ({ request, locals: { supabase, user } }) => {
		const colab = await meuColab(supabase, user);
		if (!colab) return fail(401, { error: 'Vincule seu login a um colaborador em Equipe.' });

		const fd = await request.formData();
		const itemId = (fd.get('item_id') as string) ?? '';
		if (!itemId) return fail(400, { error: 'Item inválido.' });
		const { data: hoje } = { data: hojeSP() };

		const existente = await selUm<{ id: string }>(
			supabase
				.from('rotina_conclusoes')
				.select('id')
				.eq('item_id', itemId)
				.eq('colaborador_id', colab.id)
				.eq('data', hoje.data)
				.maybeSingle(),
			'meu-dia/toggleRotina: conclusão existente'
		);

		const { error } = existente
			? await supabase.from('rotina_conclusoes').delete().eq('id', existente.id)
			: await supabase
					.from('rotina_conclusoes')
					.insert({ item_id: itemId, colaborador_id: colab.id, data: hoje.data });
		if (error) return fail(500, { error: error.message });
		return { ok: true, feito: !existente };
	},

	criarItem: async ({ request, locals: { supabase, user } }) => {
		if (!ehGestor(await meuColab(supabase, user)))
			return fail(403, { error: 'Apenas CEO e Admin podem editar a rotina.' });

		const fd = await request.formData();
		const cargo = ((fd.get('cargo') as string) ?? '').trim() || 'social_media';
		const dia = Number(fd.get('dia_semana'));
		const titulo = ((fd.get('titulo') as string) ?? '').trim();
		if (!titulo || !Number.isInteger(dia) || dia < 0 || dia > 6)
			return fail(400, { error: 'Dados inválidos.' });

		const ultimo = await selUm<{ ordem: number }>(
			supabase
				.from('rotina_itens')
				.select('ordem')
				.eq('cargo', cargo)
				.eq('dia_semana', dia)
				.order('ordem', { ascending: false })
				.limit(1)
				.maybeSingle(),
			'meu-dia/criarItem: última ordem da rotina'
		);
		const ordem = (ultimo?.ordem ?? -1) + 1;

		const { error } = await supabase
			.from('rotina_itens')
			.insert({ cargo, dia_semana: dia, titulo, ordem });
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},

	editarItem: async ({ request, locals: { supabase, user } }) => {
		if (!ehGestor(await meuColab(supabase, user)))
			return fail(403, { error: 'Apenas CEO e Admin podem editar a rotina.' });

		const fd = await request.formData();
		const id = (fd.get('id') as string) ?? '';
		const titulo = ((fd.get('titulo') as string) ?? '').trim();
		if (!id || !titulo) return fail(400, { error: 'Dados inválidos.' });
		const { error } = await supabase.from('rotina_itens').update({ titulo }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},

	excluirItem: async ({ request, locals: { supabase, user } }) => {
		if (!ehGestor(await meuColab(supabase, user)))
			return fail(403, { error: 'Apenas CEO e Admin podem editar a rotina.' });

		const fd = await request.formData();
		const id = (fd.get('id') as string) ?? '';
		if (!id) return fail(400, { error: 'Item inválido.' });
		const { error } = await supabase.from('rotina_itens').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	}
};
