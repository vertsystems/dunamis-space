import { fail } from '@sveltejs/kit';
import { FUNCAO } from '$lib/equipe';
import type { Actions, PageServerLoad } from './$types';

const FUNCOES = FUNCAO.map((f) => f.value) as string[];

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	const email = user?.email ?? '';

	// Garante uma linha de colaborador para o login atual (cria a mínima se faltar,
	// e vincula o auth_user_id quando ainda não estiver ligado).
	let { data: colab } = await supabase
		.from('colaboradores')
		.select('*')
		.eq('email', email)
		.maybeSingle();

	if (!colab && email) {
		const nome = email.split('@')[0] || 'Usuário';
		const { data: novo } = await supabase
			.from('colaboradores')
			.insert({ nome, email, funcao: 'social_media', auth_user_id: user?.id ?? null })
			.select('*')
			.single();
		colab = novo;
	} else if (colab && !colab.auth_user_id && user?.id) {
		await supabase.from('colaboradores').update({ auth_user_id: user.id }).eq('id', colab.id);
	}

	// Métricas da agência ligadas a este colaborador.
	let metricas = { tarefas: 0, projetos: 0, clientes: 0 };
	if (colab?.id) {
		const [t, p, c] = await Promise.all([
			supabase
				.from('tarefas')
				.select('id', { count: 'exact', head: true })
				.eq('responsavel_id', colab.id)
				.neq('status', 'concluido'),
			supabase
				.from('projetos')
				.select('id', { count: 'exact', head: true })
				.eq('responsavel_id', colab.id)
				.neq('status', 'finalizado'),
			supabase
				.from('clientes')
				.select('id', { count: 'exact', head: true })
				.eq('responsavel_id', colab.id)
				.eq('status', 'ativo')
		]);
		metricas = { tarefas: t.count ?? 0, projetos: p.count ?? 0, clientes: c.count ?? 0 };
	}

	return { colab, metricas, email };
};

export const actions: Actions = {
	// Dados pessoais (nome, telefone, localização, cargo). Email é o login → só leitura.
	salvar: async ({ request, locals: { supabase, user } }) => {
		const email = user?.email;
		if (!email) return fail(401, { error: 'Sessão expirada. Entre novamente.' });

		const fd = await request.formData();
		const nome = ((fd.get('nome') as string) ?? '').trim();
		if (!nome) return fail(400, { error: 'O nome é obrigatório.' });

		const telefone = ((fd.get('telefone') as string) ?? '').trim() || null;
		const local = ((fd.get('local') as string) ?? '').trim() || null;
		let funcao = ((fd.get('funcao') as string) ?? '').trim();
		if (!FUNCOES.includes(funcao)) funcao = 'social_media';

		const { error } = await supabase
			.from('colaboradores')
			.update({ nome, telefone, local, funcao })
			.eq('email', email);
		if (error) return fail(500, { error: error.message });

		return { success: true };
	}
};
