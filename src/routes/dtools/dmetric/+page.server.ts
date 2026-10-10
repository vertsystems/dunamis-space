// DMetric — painel de acessos dos sites (ver supabase/migrations/0072_dmetric.sql).
import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import {
	intervalo,
	lerPeriodo,
	limparDominio,
	type DMetricSite,
	type LinhaHistorico,
	type PainelDados
} from '$lib/dmetric/painel';
import type { Actions, PageServerLoad } from './$types';

const VAZIO: PainelDados = { visitas: 0, visualizacoes: 0, por_dia: [], dimensoes: {} };
const UUID = /^[0-9a-f-]{36}$/i;

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const periodo = lerPeriodo(url.searchParams.get('periodo'));
	const siteParam = url.searchParams.get('site');
	const site = siteParam && UUID.test(siteParam) ? siteParam : null;
	const hoje = diaEmBrasilia();
	const { de, ate } = intervalo(periodo, hoje);

	const [sites, historico, painel] = await Promise.all([
		supabase.from('dmetric_sites').select('*').order('nome'),
		supabase
			.from('dmetric_historico')
			.select('propriedade, inicio, fim, pais, pais_nome, usuarios')
			.order('usuarios', { ascending: false }),
		supabase.rpc('dmetric_painel', { p_site: site, p_de: de, p_ate: ate })
	]);

	// Sem a migration 0072 a tela avisa em vez de quebrar.
	const pendente = !!sites.error && /dmetric_|does not exist|schema cache|relation/i.test(sites.error.message);
	if (painel.error) console.error('[dmetric] painel', painel.error.message);

	return {
		pendente,
		periodo,
		site,
		hoje,
		de,
		ate,
		sites: (sites.data ?? []) as DMetricSite[],
		// O histórico é da propriedade inteira do GA, não de um site: só entra
		// na visão de todos os sites e no período "desde o começo".
		historico: !site && periodo === 'tudo' ? ((historico.data ?? []) as LinhaHistorico[]) : [],
		resumoHistorico: {
			usuarios: ((historico.data ?? []) as LinhaHistorico[]).reduce((s, h) => s + h.usuarios, 0),
			paises: ((historico.data ?? []) as LinhaHistorico[]).filter((h) => h.pais).length
		},
		painel: (painel.data as PainelDados | null) ?? VAZIO
	};
};

export const actions: Actions = {
	criarSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const nome = String(fd.get('nome') ?? '').trim();
		const dominio = limparDominio(String(fd.get('dominio') ?? ''));
		if (!nome) return fail(400, { erro: 'Dê um nome ao site.', nome, dominio });
		if (dominio && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) {
			return fail(400, { erro: 'Domínio inválido. Use só o endereço, ex.: lojasmari.com.br', nome, dominio });
		}
		const { data, error } = await locals.supabase
			.from('dmetric_sites')
			.insert({ nome, dominio: dominio || null })
			.select('id')
			.single();
		if (error) return fail(500, { erro: error.message, nome, dominio });
		return { criado: data.id as string };
	},

	alternarSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const ativo = fd.get('ativo') === 'true';
		if (!UUID.test(id)) return fail(400, { erro: 'Site inválido.' });
		const { error } = await locals.supabase.from('dmetric_sites').update({ ativo }).eq('id', id);
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
	},

	excluirSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'excluir');
		const id = String((await request.formData()).get('id') ?? '');
		if (!UUID.test(id)) return fail(400, { erro: 'Site inválido.' });
		// Os contadores do site saem junto (on delete cascade).
		const { error } = await locals.supabase.from('dmetric_sites').delete().eq('id', id);
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
	}
};
