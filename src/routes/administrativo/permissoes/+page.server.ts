import { error, fail } from '@sveltejs/kit';
import { MODULO_IDS, NIVEIS, temNivel, type Nivel } from '$lib/permissoes';
import type { Actions, PageServerLoad } from './$types';

const NIVEIS_VALIDOS = new Set<string>(NIVEIS);

function exigirAdmin(permissoes: App.Locals['permissoes']) {
	if (!temNivel(permissoes, 'permissoes', 'editar')) throw error(403, 'Sem permissão.');
}

export const load: PageServerLoad = async ({ locals: { supabase, permissoes } }) => {
	exigirAdmin(permissoes);

	const [cargos, excecoes, colabs] = await Promise.all([
		supabase.from('permissoes_cargo').select('funcao, modulo, nivel'),
		supabase.from('permissoes_colaborador').select('colaborador_id, modulo, nivel'),
		supabase
			.from('colaboradores')
			.select('id, nome, email, funcoes, funcao, super_admin, ativo')
			.order('nome')
	]);

	return {
		permissoesCargo: cargos.data ?? [],
		permissoesColaborador: excecoes.data ?? [],
		colaboradores: colabs.data ?? [],
		loadError: cargos.error?.message ?? excecoes.error?.message ?? colabs.error?.message ?? null
	};
};

function validaModuloNivel(modulo: string, nivel: string): nivel is Nivel {
	return MODULO_IDS.includes(modulo) && NIVEIS_VALIDOS.has(nivel);
}

export const actions: Actions = {
	// Define o nível de um cargo em um módulo (matriz cargos × módulos).
	salvar_cargo: async ({ request, locals: { supabase, permissoes } }) => {
		exigirAdmin(permissoes);
		const fd = await request.formData();
		const funcao = String(fd.get('funcao') ?? '');
		const modulo = String(fd.get('modulo') ?? '');
		const nivel = String(fd.get('nivel') ?? '');
		if (!funcao || !validaModuloNivel(modulo, nivel)) return fail(400, { error: 'Dados inválidos.' });

		const { error: e } = await supabase
			.from('permissoes_cargo')
			.upsert({ funcao, modulo, nivel }, { onConflict: 'funcao,modulo' });
		if (e) return fail(500, { error: e.message });
		return { ok: true };
	},

	// Exceção por colaborador. nivel='herdar' remove o override (volta ao cargo).
	salvar_excecao: async ({ request, locals: { supabase, permissoes } }) => {
		exigirAdmin(permissoes);
		const fd = await request.formData();
		const colaborador_id = String(fd.get('colaborador_id') ?? '');
		const modulo = String(fd.get('modulo') ?? '');
		const nivel = String(fd.get('nivel') ?? '');
		if (!colaborador_id || !MODULO_IDS.includes(modulo)) return fail(400, { error: 'Dados inválidos.' });

		if (nivel === 'herdar') {
			const { error: e } = await supabase
				.from('permissoes_colaborador')
				.delete()
				.eq('colaborador_id', colaborador_id)
				.eq('modulo', modulo);
			if (e) return fail(500, { error: e.message });
			return { ok: true };
		}

		if (!NIVEIS_VALIDOS.has(nivel)) return fail(400, { error: 'Nível inválido.' });
		const { error: e } = await supabase
			.from('permissoes_colaborador')
			.upsert({ colaborador_id, modulo, nivel }, { onConflict: 'colaborador_id,modulo' });
		if (e) return fail(500, { error: e.message });
		return { ok: true };
	},

	// Liga/desliga super-admin de um colaborador (acesso total, edita permissões).
	toggle_super: async ({ request, locals: { supabase, permissoes } }) => {
		exigirAdmin(permissoes);
		const fd = await request.formData();
		const colaborador_id = String(fd.get('colaborador_id') ?? '');
		const super_admin = String(fd.get('super_admin') ?? '') === 'true';
		if (!colaborador_id) return fail(400, { error: 'Dados inválidos.' });

		const { error: e } = await supabase
			.from('colaboradores')
			.update({ super_admin })
			.eq('id', colaborador_id);
		if (e) return fail(500, { error: e.message });
		return { ok: true };
	}
};
