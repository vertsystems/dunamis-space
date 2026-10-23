// DMetric — prepara as mensagens do relatório do mês (uma por link de cliente que
// recebe relatório). Usado pelo cron do dia 1º (/api/dmetric/relatorios) e pelo
// botão "Preparar" da aba Relatórios. Os números vêm de dmetric_relatorios_dados e
// as mensagens são gravadas por dmetric_relatorios_criar (0094), as duas com o
// segredo do DMetric; a mensagem que já existe para o link e o mês fica como está.
import type { SupabaseClient } from '@supabase/supabase-js';
import { nomeDoBotao, resumoDosBotoes, slugDoPageLinks } from '$lib/dmetric/botoes';
import { somarDias } from '$lib/dmetric/painel';
import { linkDoPortal, mensagemDoRelatorio, type DadosDoRelatorio } from '$lib/dmetric/portal';
import { inicioDoDia } from '$lib/dmetric/recorte';
import { botoesDaPagina } from '$lib/server/pagelinks';

/** O mês anterior ao de um dia ("2026-11-01" → "2026-10"). */
export const mesAnterior = (hoje: string) => somarDias(`${hoje.slice(0, 7)}-01`, -1).slice(0, 7);

export async function prepararRelatorios(
	supabase: SupabaseClient,
	segredo: string,
	mes: string,
	origem: string
): Promise<{ clientes: number; novas: number; erro?: string }> {
	const { data, error } = await supabase.rpc('dmetric_relatorios_dados', { p_segredo: segredo, p_mes: `${mes}-01` });
	if (error || !data) return { clientes: 0, novas: 0, erro: error?.message ?? 'sem resposta' };
	const itens = data as DadosDoRelatorio[];
	// O mês inteiro, em Brasília, para os cliques dos botões do PageLinks.
	const desde = inicioDoDia(`${mes}-01`);
	const ate = inicioDoDia(somarDias(`${mes}-01`, 40).slice(0, 7) + '-01');
	const mensagens = await Promise.all(
		itens.map(async (d) => {
			const slug = slugDoPageLinks(d.site);
			const campeao = slug ? resumoDosBotoes((await botoesDaPagina(slug, desde, ate))?.botoes ?? []).campeao : null;
			// Link livre abre direto no mês do relatório; travado, mostra o período dele.
			const link = linkDoPortal(origem, d.token, d.periodo === 'livre' ? mes : null);
			return {
				portal_id: d.portal_id,
				mes: `${mes}-01`,
				mensagem: mensagemDoRelatorio(d, mes, link, campeao ? { nome: nomeDoBotao(campeao), cliques: campeao.cliques } : null)
			};
		})
	);
	if (!mensagens.length) return { clientes: 0, novas: 0 };
	const { data: novas, error: e2 } = await supabase.rpc('dmetric_relatorios_criar', { p_segredo: segredo, p_itens: mensagens });
	if (e2) return { clientes: itens.length, novas: 0, erro: e2.message };
	return { clientes: itens.length, novas: (novas as number) ?? 0 };
}
