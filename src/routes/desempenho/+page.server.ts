import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const agora = new Date();
	const trintaDias = new Date(agora.getTime() - 30 * 86_400_000).toISOString();
	const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();

	const [novosRes, concluidasRes, stagesRes, negociosRes] = await Promise.all([
		supabase.from('clientes').select('id', { count: 'exact', head: true }).gte('created_at', trintaDias),
		supabase
			.from('tarefas')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'concluido')
			.gte('updated_at', trintaDias),
		supabase.from('crm_stages').select('id, nome, ordem, cor, pipeline_id').order('ordem', { ascending: true }),
		supabase.from('crm_negocios').select('id, valor, status, stage_id, ganho_em, perdido_em')
	]);

	const crmPendente = !!stagesRes.error || !!negociosRes.error;

	let kpisCrm: {
		abertos: number;
		valorAberto: number;
		ganhosMes: number;
		valorGanhoMes: number;
		perdidosMes: number;
		taxaConversao: number;
	} | null = null;
	let funil: { nome: string; cor: string; count: number; valor: number }[] = [];

	if (!crmPendente) {
		const negocios = negociosRes.data ?? [];
		let abertos = 0,
			valorAberto = 0,
			ganhosMes = 0,
			valorGanhoMes = 0,
			perdidosMes = 0,
			ganhosTotal = 0,
			perdidosTotal = 0;
		const porStage = new Map<string, { count: number; valor: number }>();
		for (const n of negocios) {
			const valor = Number(n.valor ?? 0);
			if (n.status === 'aberto') {
				abertos++;
				valorAberto += valor;
				const s = (n.stage_id as string | null) ?? '';
				const cur = porStage.get(s) ?? { count: 0, valor: 0 };
				cur.count++;
				cur.valor += valor;
				porStage.set(s, cur);
			} else if (n.status === 'ganho') {
				ganhosTotal++;
				if (n.ganho_em && new Date(n.ganho_em as string).getTime() >= inicioMes) {
					ganhosMes++;
					valorGanhoMes += valor;
				}
			} else if (n.status === 'perdido') {
				perdidosTotal++;
				if (n.perdido_em && new Date(n.perdido_em as string).getTime() >= inicioMes) perdidosMes++;
			}
		}
		const fechados = ganhosTotal + perdidosTotal;
		kpisCrm = {
			abertos,
			valorAberto,
			ganhosMes,
			valorGanhoMes,
			perdidosMes,
			taxaConversao: fechados ? Math.round((ganhosTotal / fechados) * 100) : 0
		};
		funil = (stagesRes.data ?? []).map((s) => {
			const agg = porStage.get(s.id as string) ?? { count: 0, valor: 0 };
			return { nome: s.nome as string, cor: s.cor as string, count: agg.count, valor: agg.valor };
		});
	}

	return {
		novosClientes: novosRes.count ?? 0,
		tarefasConcluidas: concluidasRes.count ?? 0,
		crmPendente,
		kpisCrm,
		funil
	};
};
