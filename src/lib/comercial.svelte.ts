/**
 * Estado compartilhado do módulo Comercial.
 *
 * O CRM era uma tela só, e o estado (negócios, atividades, metas + os updates
 * otimistas) vivia dentro dela. Agora são cinco telas — Dashboard, Kanban,
 * Contatos, Metas e Relatórios — que precisam do MESMO estado: arrastar um card
 * no Kanban tem de mudar o KPI do Dashboard sem esperar o servidor.
 *
 * É uma classe posta no contexto pelo `+layout.svelte`, não um singleton de
 * módulo: no SSR um singleton seria compartilhado entre requisições, e os dados
 * de um usuário apareceriam para outro.
 */
import { getContext, setContext } from 'svelte';
import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { toast } from '$lib/toast.svelte';
import type {
	Atividade,
	Colaborador,
	Contato,
	Meta,
	MesRef,
	Negocio,
	Pipeline,
	Stage
} from '$lib/crm';

/** O que o `load` do layout entrega (ver `$lib/server/crm.ts`). */
export type DadosComercial = {
	crmPendente: boolean;
	loadError: string | null;
	pipelines: Pipeline[];
	stages: Stage[];
	pipelineAtivoId: string | null;
	negocios: Negocio[];
	contatos: Contato[];
	atividades: Atividade[];
	colaboradores: Colaborador[];
	clientes: { id: string; nome: string }[];
	metas: Meta[];
	metasPendente: boolean;
	mesRef: MesRef;
};

/** Todas as actions do módulo moram na rota raiz — as telas postam para cá. */
export const ACTIONS = '/comercial';

/**
 * Rollback PONTUAL: restaura só o registro que falhou, pelo id. Guardar o array
 * inteiro e devolvê-lo no catch fazia a ação que falhava desfazer junto a que já
 * tinha dado certo, e a tela ficava divergindo do banco até um F5.
 */
function reverter<T extends { id: string }>(lista: T[], original: T | undefined): T[] {
	if (!original) return lista;
	return lista.map((x) => (x.id === original.id ? original : x));
}

async function postar(action: string, fd: FormData) {
	const res = await fetch(action, {
		method: 'POST',
		body: fd,
		headers: { 'x-sveltekit-action': 'true' }
	});
	return deserialize(await res.text());
}

export class Comercial {
	/** Dados crus do load — trocados a cada `invalidateAll`. */
	dados = $state<DadosComercial>() as DadosComercial;

	// Cópias reativas: é nelas que os updates otimistas acontecem.
	negocios = $state<Negocio[]>([]);
	atividades = $state<Atividade[]>([]);
	metas = $state<Meta[]>([]);

	/** Funil selecionado (troca client-side; tudo já vem carregado). */
	pipelineAtivo = $state<string | null>(null);

	// --- Janelas abertas (o drawer e os modais vivem no layout) ---
	drawerAberto = $state(false);
	drawerTipo = $state<'negocio' | 'contato'>('negocio');
	drawerId = $state<string | null>(null);
	novoNegocio = $state(false);
	novoNegocioStage = $state<string | null>(null);
	novoContato = $state(false);
	// Perder um negócio pede o motivo antes — é o dado que alimenta o relatório
	// de motivos de perda, e ninguém volta depois para preencher.
	perdaAberta = $state(false);
	perdaId = $state<string | null>(null);
	perdaMotivo = $state('');

	constructor(dados: DadosComercial) {
		this.sincronizar(dados);
		this.pipelineAtivo = dados.pipelineAtivoId;
	}

	/** Reaplica o que veio do servidor por cima do estado local. */
	sincronizar(dados: DadosComercial) {
		this.dados = dados;
		this.negocios = dados.negocios.map((n) => ({ ...n }));
		this.atividades = dados.atividades.map((a) => ({ ...a }));
		this.metas = dados.metas ?? [];
		// Só volta ao padrão se a seleção sumiu (1º load ou funil removido) —
		// senão a escolha do usuário seria desfeita a cada recarga.
		if (!this.pipelineAtivo || !dados.pipelines.some((p) => p.id === this.pipelineAtivo)) {
			this.pipelineAtivo = dados.pipelineAtivoId;
		}
	}

	get stagesDoPipeline(): Stage[] {
		return this.dados.stages.filter((s) => s.pipeline_id === this.pipelineAtivo);
	}

	get contatosLite() {
		return this.dados.contatos.map((c) => ({ id: c.id, nome: c.nome, empresa: c.empresa }));
	}

	// --- Abrir janelas ---
	abrirNegocio(id: string) {
		this.drawerTipo = 'negocio';
		this.drawerId = id;
		this.drawerAberto = true;
	}
	abrirContato(id: string) {
		this.drawerTipo = 'contato';
		this.drawerId = id;
		this.drawerAberto = true;
	}
	abrirNovoNegocio(stageId: string | null = null) {
		this.novoNegocioStage = stageId;
		this.novoNegocio = true;
	}
	abrirPerda(id: string) {
		this.perdaId = id;
		this.perdaMotivo = '';
		this.perdaAberta = true;
	}
	async confirmarPerda() {
		const id = this.perdaId;
		this.perdaAberta = false;
		this.perdaId = null;
		if (id) await this.mudarStatus(id, 'perdido', this.perdaMotivo.trim() || null);
	}

	// --- Ações otimistas ---

	/** Move o card de etapa e renumera a coluna de destino. */
	async mover(id: string, stageId: string, orderedIds: string[]) {
		// Guarda só os registros tocados por ESTA operação (o arrastado + os que
		// mudaram de ordem), não o array inteiro.
		const tocados = new Set([id, ...orderedIds]);
		const originais = this.negocios.filter((n) => tocados.has(n.id)).map((n) => ({ ...n }));
		const ordemMap = new Map(orderedIds.map((nid, i) => [nid, i]));
		this.negocios = this.negocios.map((n) => {
			if (n.id === id) return { ...n, stage_id: stageId, ordem: ordemMap.get(n.id) ?? n.ordem };
			if (ordemMap.has(n.id)) return { ...n, ordem: ordemMap.get(n.id)! };
			return n;
		});
		const fd = new FormData();
		fd.set('id', id);
		fd.set('stage_id', stageId);
		fd.set('ids', orderedIds.join(','));
		try {
			const r = await postar(`${ACTIONS}?/negocio_mover`, fd);
			if (r.type !== 'success') throw new Error();
		} catch {
			for (const o of originais) this.negocios = reverter(this.negocios, o);
			toast.error('Não foi possível mover o negócio.');
		}
	}

	async mudarStatus(id: string, status: 'ganho' | 'perdido', motivo: string | null = null) {
		const original = this.negocios.find((n) => n.id === id);
		const agora = new Date().toISOString();
		// Espelha o patch do servidor (ganho_em/perdido_em) para KPI e ranking do mês
		// refletirem imediatamente no update otimista.
		this.negocios = this.negocios.map((n) =>
			n.id === id
				? {
						...n,
						status,
						motivo_perda: status === 'perdido' ? motivo : null,
						ganho_em: status === 'ganho' ? agora : null,
						perdido_em: status === 'perdido' ? agora : null
					}
				: n
		);
		const fd = new FormData();
		fd.set('id', id);
		fd.set('status', status);
		if (status === 'perdido' && motivo) fd.set('motivo_perda', motivo);
		try {
			const r = await postar(`${ACTIONS}?/negocio_status`, fd);
			if (r.type !== 'success') throw new Error();
			toast.success(status === 'ganho' ? 'Negócio ganho! 🎉' : 'Negócio marcado como perdido.');
			await invalidateAll();
		} catch {
			this.negocios = reverter(this.negocios, original && { ...original });
			toast.error('Não foi possível atualizar o negócio.');
		}
	}

	/** Define/atualiza a meta do mês de um vendedor. */
	async definirMeta(colaboradorId: string, valor: number) {
		// Metas não têm `id`; a chave natural é o colaborador.
		const original = this.metas.find((m) => m.colaborador_id === colaboradorId);
		const existia = !!original;
		this.metas = existia
			? this.metas.map((m) => (m.colaborador_id === colaboradorId ? { ...m, valor_meta: valor } : m))
			: [...this.metas, { colaborador_id: colaboradorId, valor_meta: valor }];
		const fd = new FormData();
		fd.set('colaborador_id', colaboradorId);
		fd.set('valor_meta', String(valor));
		try {
			const r = await postar(`${ACTIONS}?/meta_definir`, fd);
			if (r.type !== 'success') throw new Error();
			toast.success('Meta atualizada.');
		} catch {
			this.metas = existia
				? this.metas.map((m) => (m.colaborador_id === colaboradorId ? original! : m))
				: this.metas.filter((m) => m.colaborador_id !== colaboradorId);
			toast.error('Não foi possível salvar a meta.');
		}
	}

	async concluirAtividade(id: string, concluida: boolean) {
		const original = this.atividades.find((a) => a.id === id);
		this.atividades = this.atividades.map((a) =>
			a.id === id
				? { ...a, concluida, concluida_em: concluida ? new Date().toISOString() : null }
				: a
		);
		const fd = new FormData();
		fd.set('id', id);
		fd.set('concluida', String(concluida));
		try {
			const r = await postar(`${ACTIONS}?/atividade_concluir`, fd);
			if (r.type !== 'success') throw new Error();
			// Recalcula prox_atividade no servidor -> follow-ups e KPI de atrasadas atualizam.
			await invalidateAll();
		} catch {
			this.atividades = reverter(this.atividades, original && { ...original });
			toast.error('Não foi possível atualizar a atividade.');
		}
	}
}

const CHAVE = Symbol('comercial');

/** Chamado uma vez no `+layout.svelte` do módulo. */
export function criarComercial(dados: DadosComercial): Comercial {
	const loja = new Comercial(dados);
	setContext(CHAVE, loja);
	return loja;
}

/** Usado por qualquer tela dentro de /comercial. */
export function usarComercial(): Comercial {
	return getContext<Comercial>(CHAVE);
}
