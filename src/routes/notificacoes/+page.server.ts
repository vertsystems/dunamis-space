import { um } from '$lib/db';
import type { PageServerLoad } from './$types';
import { DIAS_CONTRATO_VENCENDO, DIAS_SEM_INTERACAO } from '$lib/alertas';

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
	const nowISO = new Date().toISOString();

	const limiteContrato = new Date();
	limiteContrato.setDate(limiteContrato.getDate() + DIAS_CONTRATO_VENCENDO);
	const limiteContratoStr = limiteContrato.toISOString().slice(0, 10);

	const cutoffInteracao = new Date();
	cutoffInteracao.setDate(cutoffInteracao.getDate() - DIAS_SEM_INTERACAO);
	const cutoffInteracaoStr = cutoffInteracao.toISOString();

	const [contratosRes, atrasadosRes, clientesRes, atividadesRes] = await Promise.all([
		supabase
			.from('contratos')
			.select('id, data_fim, cliente:clientes(nome)')
			.eq('status', 'ativo')
			.not('data_fim', 'is', null)
			.lte('data_fim', limiteContratoStr)
			.order('data_fim', { ascending: true }),
		// Tarefas foi aposentado — a notificação de atraso passa a ser de publicação.
		supabase
			.from('conteudos')
			.select('id, titulo, tipo, data_publicacao, cliente:clientes(nome)')
			.lt('data_publicacao', new Date().toISOString())
			.neq('status', 'publicado')
			.order('data_publicacao', { ascending: true })
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

	for (const c of atrasadosRes.data ?? []) {
		const cli = um<{ nome: string }>(c.cliente);
		const quando = c.data_publicacao
			? new Date(c.data_publicacao as string).toLocaleString('pt-BR', {
					dateStyle: 'short',
					timeStyle: 'short'
				})
			: '—';
		itens.push({
			id: `conteudo-${c.id}`,
			tipo: 'Publicação atrasada',
			tone: 'danger',
			icon: 'calendar',
			titulo: (c.titulo as string | null) || 'Sem título',
			detalhe: `${cli?.nome ?? 'Sem cliente'} · previsto para ${quando}`,
			href: `/conteudo/${c.id}`,
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
