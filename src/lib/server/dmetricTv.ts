// DMetric — os dados do modo TV. A página carrega com isto e depois chama a
// cada 15 segundos (/dtools/dmetric/tv/dados), sem recarregar.
import type { SupabaseClient } from '@supabase/supabase-js';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import { AGORA_VAZIO, type AgoraDados, type PainelDados } from '$lib/dmetric/painel';
import type { TvDados, UltimoAcesso } from '$lib/dmetric/tv';

export async function dadosDaTv(supabase: SupabaseClient, site: string | null): Promise<TvDados> {
	// Brasília não tem horário de verão desde 2019: a meia-noite é sempre -03:00.
	const meiaNoite = new Date(`${diaEmBrasilia()}T00:00:00-03:00`).toISOString();
	const [hoje, agora, ontem, ultimos] = await Promise.all([
		// O "hoje" sai da lista recente (0077): é ela que tem a hora de cada acesso.
		supabase.rpc('dmetric_painel_recente', { p_site: site, p_desde: meiaNoite, p_passo: '1 hour' }),
		supabase.rpc('dmetric_agora', { p_site: site }),
		supabase.rpc('dmetric_ontem_ate_agora', { p_site: site }),
		supabase.rpc('dmetric_ultimos', { p_site: site, p_limite: 8 })
	]);
	for (const [nome, r] of [['hoje', hoje], ['agora', agora], ['ontem', ontem], ['ultimos', ultimos]] as const)
		if (r.error) console.error(`[dmetric] tv ${nome}`, r.error.message);

	const p = hoje.data as PainelDados | null;
	const o = (ontem.data as { visitas: number; visualizacoes: number }[] | null)?.[0];
	return {
		em: new Date().toISOString(),
		hoje: {
			visitas: p?.visitas ?? 0,
			visualizacoes: p?.visualizacoes ?? 0,
			segundos: p?.segundos ?? 0,
			serie: p?.serie ?? [],
			paises: p?.dimensoes.pais ?? [],
			paginas: p?.dimensoes.pagina ?? []
		},
		ontem: { visitas: o?.visitas ?? 0, visualizacoes: o?.visualizacoes ?? 0 },
		agora: (agora.data as AgoraDados | null) ?? AGORA_VAZIO,
		ultimos: (ultimos.data as UltimoAcesso[] | null) ?? []
	};
}
