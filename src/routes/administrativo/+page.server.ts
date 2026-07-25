import { um } from '$lib/db';
import { sel } from '$lib/server/query';
import type { PageServerLoad } from './$types';

async function carregarKpis(supabase: Parameters<PageServerLoad>[0]['locals']['supabase']) {
	const [clientesRes, ferramentasRes, fornecedoresRes, onboardingRes, equipeRes, artigosRes] =
		await Promise.all([
			supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
			supabase.from('adm_ferramentas').select('custo_mensal').eq('ativo', true),
			supabase.from('adm_fornecedores').select('id', { count: 'exact', head: true }).eq('ativo', true),
			supabase
				.from('adm_onboarding_itens')
				.select('id', { count: 'exact', head: true })
				.eq('concluido', false),
			supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('ativo', true),
			supabase.from('kb_artigos').select('id', { count: 'exact', head: true })
		]);

	const custoMensalFerramentas = (ferramentasRes.data ?? []).reduce(
		(soma, f) => soma + Number(f.custo_mensal ?? 0),
		0
	);

	return {
		clientesAtivos: clientesRes.count ?? 0,
		ferramentasAtivas: ferramentasRes.data?.length ?? 0,
		custoMensalFerramentas,
		fornecedoresAtivos: fornecedoresRes.count ?? 0,
		onboardingPendente: onboardingRes.count ?? 0,
		equipeAtiva: equipeRes.count ?? 0,
		artigosBase: artigosRes.count ?? 0
	};
}

/** Ferramentas com renovação nos próximos 30 dias. */
async function carregarRenovacoes(supabase: Parameters<PageServerLoad>[0]['locals']['supabase']) {
	const hoje = new Date().toISOString().slice(0, 10);
	const em30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

	return sel(
		supabase
			.from('adm_ferramentas')
			.select('id, nome, categoria, custo_mensal, proxima_renovacao')
			.eq('ativo', true)
			.not('proxima_renovacao', 'is', null)
			.lte('proxima_renovacao', em30)
			.gte('proxima_renovacao', hoje)
			.order('proxima_renovacao', { ascending: true })
			.limit(8),
		'administrativo: renovações de ferramentas'
	);
}

/** Itens de onboarding pendentes, agrupados por cliente. */
async function carregarOnboardingPendente(supabase: Parameters<PageServerLoad>[0]['locals']['supabase']) {
	const data = await sel(
		supabase
			.from('adm_onboarding_itens')
			.select('id, texto, cliente:clientes(id, nome)')
			.eq('concluido', false)
			.order('created_at', { ascending: true })
			.limit(8),
		'administrativo: itens de onboarding pendentes'
	);

	return data.map((i) => ({
		id: i.id as string,
		texto: i.texto as string,
		cliente_id: um<{ id: string; nome: string }>(i.cliente)?.id ?? null,
		cliente_nome: um<{ id: string; nome: string }>(i.cliente)?.nome ?? null
	}));
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [kpis, renovacoes, onboardingItensPendentes] = await Promise.all([
		carregarKpis(supabase),
		carregarRenovacoes(supabase),
		carregarOnboardingPendente(supabase)
	]);

	return { ...kpis, renovacoes, onboardingItensPendentes };
};
