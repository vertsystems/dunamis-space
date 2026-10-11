// DMetric — painel de acessos dos sites (ver supabase/migrations/0072_dmetric.sql).
import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import {
	RECENTES,
	intervalo,
	lerPeriodo,
	resumirHistorico,
	type DMetricSite,
	type LinhaHistorico,
	type NumerosSite,
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
	// Última hora e 24 horas saem da lista de acessos recentes (0077), não dos
	// contadores do dia.
	const recente = RECENTES[periodo];
	const desde = recente ? new Date(Date.now() - recente.horas * 3_600_000).toISOString() : null;

	const [sites, historico, painel, porSite] = await Promise.all([
		supabase.from('dmetric_sites').select('*').order('nome'),
		supabase
			.from('dmetric_historico')
			.select('propriedade, inicio, fim, pais, pais_nome, usuarios')
			.order('usuarios', { ascending: false }),
		recente
			? supabase.rpc('dmetric_painel_recente', { p_site: site, p_desde: desde, p_passo: recente.passo })
			: supabase.rpc('dmetric_painel', { p_site: site, p_de: de, p_ate: ate }),
		// A lista de sites mostra todos, mesmo com um site escolhido no filtro.
		recente
			? supabase.rpc('dmetric_por_site_recente', { p_desde: desde })
			: supabase.rpc('dmetric_por_site', { p_de: de, p_ate: ate })
	]);

	// Sem a migration 0072 a tela avisa em vez de quebrar.
	const pendente = !!sites.error && /dmetric_|does not exist|schema cache|relation/i.test(sites.error.message);
	if (painel.error) console.error('[dmetric] painel', painel.error.message);
	if (porSite.error) console.error('[dmetric] por site', porSite.error.message);

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
		resumoHistorico: resumirHistorico((historico.data ?? []) as LinhaHistorico[]),
		painel: (painel.data as PainelDados | null) ?? VAZIO,
		porSite: (porSite.data ?? []) as NumerosSite[]
	};
};

export const actions: Actions = {
	// Não há "criar site": com o código único o site aparece sozinho na
	// primeira visita, com o domínio como nome. Aqui só se dá um nome melhor.
	renomearSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const nome = String(fd.get('nome') ?? '').trim().slice(0, 80);
		if (!UUID.test(id)) return fail(400, { erro: 'Site inválido.' });
		if (!nome) return fail(400, { erro: 'Dê um nome ao site.' });
		const { error } = await locals.supabase.from('dmetric_sites').update({ nome }).eq('id', id);
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
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
