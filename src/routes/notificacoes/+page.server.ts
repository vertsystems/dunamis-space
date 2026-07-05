import type { PageServerLoad } from './$types';
import { DIAS_CONTRATO_VENCENDO, DIAS_SEM_INTERACAO } from '$lib/alertas';

function um<T>(v: T | T[] | null | undefined): T | null {
	return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export type Notificacao = {
	id: string;
	tipo: string;
	tone: 'danger' | 'warning' | 'info' | 'neutral';
	icon: string;
	titulo: string;
	detalhe: string;
	href: string;
	peso: number; // ordenação (maior = mais urgente)
};

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const hoje = new Date().toISOString().slice(0, 10);
	const nowISO = new Date().toISOString();

	const limiteContrato = new Date();
	limiteContrato.setDate(limiteContrato.getDate() + DIAS_CONTRATO_VENCENDO);
	const limiteContratoStr = limiteContrato.toISOString().slice(0, 10);

	const cutoffInteracao = new Date();
	cutoffInteracao.setDate(cutoffInteracao.getDate() - DIAS_SEM_INTERACAO);
	const cutoffInteracaoStr = cutoffInteracao.toISOString();

	const [contratosRes, tarefasRes, clientesRes, atividadesRes] = await Promise.all([
		supabase
			.from('contratos')
			.select('id, data_fim, cliente:clientes(nome)')
			.eq('status', 'ativo')
			.not('data_fim', 'is', null)
			.lte('data_fim', limiteContratoStr)
			.order('data_fim', { ascending: true }),
		supabase
			.from('tarefas')
			.select('id, titulo, prazo, projeto:projetos(id, nome)')
			.lt('prazo', hoje)
			.neq('status', 'concluido')
			.order('prazo', { ascending: true })
			.limit(30),
		supabase
			.from('clientes')
			.select('id, nome, cliente_interacoes(data)')
			.eq('status', 'ativo')
			.order('data', { referencedTable: 'cliente_interacoes', ascending: false })
			.limit(1, { referencedTable: 'cliente_interacoes' }),
		supabase
			.from('crm_atividades')
			.select('id, titulo, data_hora, negocio:crm_negocios(titulo), contato:crm_contatos(nome)')
			.eq('concluida', false)
			.lt('data_hora', nowISO)
			.order('data_hora', { ascending: true })
			.limit(30)
	]);

	const itens: Notificacao[] = [];

	for (const c of contratosRes.data ?? []) {
		const nome = um<{ nome: string }>(c.cliente)?.nome ?? 'Contrato';
		itens.push({
			id: `contrato-${c.id}`,
			tipo: 'Contrato vencendo',
			tone: 'danger',
			icon: 'file',
			titulo: nome,
			detalhe: c.data_fim
				? `Vence em ${new Date((c.data_fim as string) + 'T00:00:00').toLocaleDateString('pt-BR')}`
				: 'Vencendo',
			href: `/contratos/${c.id}`,
			peso: 100
		});
	}

	for (const t of tarefasRes.data ?? []) {
		const proj = um<{ id: string; nome: string }>(t.projeto);
		itens.push({
			id: `tarefa-${t.id}`,
			tipo: 'Tarefa atrasada',
			tone: 'danger',
			icon: 'check',
			titulo: t.titulo as string,
			detalhe: `${proj?.nome ?? 'Sem projeto'} · prazo ${t.prazo ? new Date((t.prazo as string) + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}`,
			href: `/tarefas?projeto=${proj?.id ?? ''}`,
			peso: 90
		});
	}

	if (!atividadesRes.error) {
		for (const a of atividadesRes.data ?? []) {
			itens.push({
				id: `atividade-${a.id}`,
				tipo: 'Atividade atrasada (CRM)',
				tone: 'danger',
				icon: 'funnel',
				titulo: (a.titulo as string | null) || 'Atividade',
				detalhe:
					(um<{ titulo: string }>(a.negocio)?.titulo ?? um<{ nome: string }>(a.contato)?.nome ?? '—') +
					(a.data_hora
						? ` · ${new Date(a.data_hora as string).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
						: ''),
				href: '/crm',
				peso: 80
			});
		}
	}

	for (const c of clientesRes.data ?? []) {
		const ultima = um<{ data: string }>(c.cliente_interacoes)?.data ?? null;
		if (ultima !== null && ultima >= cutoffInteracaoStr) continue;
		itens.push({
			id: `cliente-${c.id}`,
			tipo: 'Cliente sem interação',
			tone: 'warning',
			icon: 'contact',
			titulo: c.nome as string,
			detalhe: ultima
				? `Última interação em ${new Date(ultima).toLocaleDateString('pt-BR')}`
				: 'Nenhuma interação registrada',
			href: `/clientes/${c.id}`,
			peso: 50
		});
	}

	itens.sort((a, b) => b.peso - a.peso);

	return { notificacoes: itens };
};
