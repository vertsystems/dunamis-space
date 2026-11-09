// Quem está no DGathe, guardado no banco (migration 0098).
//
// Pedido do Bruno (09/11/2026), depois de a presença em tempo real falhar
// (gente sumindo, piscando, voltando ao começo do caminho): pode ter uns
// segundos de atraso, mas tem de ser certo. Entrou no dspace = está no
// escritório, em qualquer tela ou aba; saiu ou ficou ausente = sentado na
// recepção. Por isso:
//
//   - manterSinal(): roda no layout do dspace inteiro (não só no DGathe) e diz
//     "estou aqui" a cada PULSO, de um Web Worker (aba em segundo plano não
//     atrasa). Ao fechar a última aba do dspace, ou ao sair do sistema, se
//     despede (dgathe_saiu).
//   - Presenca: no DGathe, lê todo mundo a cada LEITURA e grava para onde eu
//     estou indo logo no primeiro passo (os outros calculam o caminho e animam
//     sozinhos, com alguns segundos de atraso, que o Bruno aceitou).
//
// Três situações:
//   - online: mexendo no dspace
//   - inativo: logado, mas OCIOSO_APOS (15 min) sem mexer em nenhuma aba do
//     dspace. O próprio navegador escolhe onde sentar (assentos.ts: CEO na
//     Diretoria; os outros na recepção, na copa ou numa sala sorteada) e grava
//     o lugar; ao mexer de novo, levanta
//   - offline: sem sinal há mais de AUSENTE_APOS segundos (dspace fechado, Mac
//     dormindo, sem internet) ou despedida há mais de SAIDA_CONFIRMA segundos
//     (recarregar a página não conta como sair); senta nos sofás da recepção
// Os segundos são contados no relógio do servidor.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Ponto } from './iso';
import { LARGURA, ALTURA } from './mapa';
import { lerAparencia, type Aparencia } from './aparencia';
import { relogio } from './relogio';
import { assentoPorId, escolherAssento, hashTexto } from './assentos';
import { alvos } from './movimento';
import { funcaoSigla } from '$lib/equipe';

/** "Estou aqui", de qualquer tela do dspace. */
export const PULSO = 30_000;
/** O DGathe lê quem está, com a aba na frente. */
export const LEITURA = 3_000;
/** E com a aba do DGathe escondida (ninguém está olhando). */
export const LEITURA_ESCONDIDA = 20_000;
/** Sem sinal por mais que isto (s), a pessoa vai para a recepção. */
export const AUSENTE_APOS = 75;
/** Despedida só vale depois disto (s): recarregar a página não é sair. */
export const SAIDA_CONFIRMA = 5;
/** Sem mexer em nenhuma aba do dspace por este tempo, vai sentar em algum lugar. */
export const OCIOSO_APOS = 15 * 60_000;

export type Situacao = 'online' | 'inativo' | 'offline';

export type Pessoa = {
	id: string;
	nome: string;
	cargo: string;
	foto: string | null;
	cor: string | null;
	/** Onde está, ou para onde está indo. */
	x: number;
	y: number;
	dirX: number;
	dirY: number;
	/** Carimbo do movimento (relógio de quem anda): o mais novo vence. */
	mov: number;
	aparencia: Aparencia;
	situacao: Situacao;
	/** Onde sentou (catálogo de assentos.ts), quando está inativo. */
	assento: string | null;
	/** CEO fica sempre na Diretoria quando não está mexendo. */
	ceo: boolean;
	/** Desde quando está offline ou inativo (s desde 1970, relógio do servidor; null = online). */
	paradoDesde: number | null;
	/** Há quantos segundos (relógio do servidor). */
	paradoHa: number;
};

export type EstadoConexao = 'conectando' | 'online' | 'offline';

const numero = (v: unknown, min = -Infinity, max = Infinity): number | null =>
	typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Uma linha de dgathe_quem(), conferida. */
export function lerLinha(bruto: unknown): Pessoa | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const r = bruto as Record<string, unknown>;
	const id = texto(r.id, 64);
	const nome = texto(r.nome, 80);
	const x = numero(r.x, 0, LARGURA);
	const y = numero(r.y, 0, ALTURA);
	if (!id || !nome || x === null || y === null) return null;
	const foto = texto(r.foto, 500);
	const cor = typeof r.cor === 'string' && /^#[0-9a-f]{6}$/i.test(r.cor) ? r.cor : null;
	const semSinal = numero(r.sem_sinal, 0) ?? Infinity;
	const saiuHa = numero(r.saiu_ha, 0);
	const situacao: Situacao =
		semSinal > AUSENTE_APOS || (saiuHa !== null && saiuHa >= SAIDA_CONFIRMA) ? 'offline' : r.inativo === true ? 'inativo' : 'online';
	// Desde quando está parado, nos segundos do servidor (iguais para todas as telas)
	const agora = numero(r.agora, 0);
	const paradoDesde =
		situacao === 'offline'
			? (numero(r.saiu, 0) ?? numero(r.visto, 0))
			: situacao === 'inativo'
				? (numero(r.inativo_desde, 0) ?? agora)
				: null;
	return {
		id,
		nome,
		cargo: funcaoSigla(typeof r.funcao === 'string' ? r.funcao : null) ?? 'Equipe',
		// https:// ou caminho do próprio dspace; "//outro.site" fica de fora.
		foto: foto && /^(https:\/\/|\/(?!\/))/.test(foto) ? foto : null,
		cor,
		x,
		y,
		dirX: numero(r.dir_x, -1, 1) ?? 1,
		dirY: numero(r.dir_y, -1, 1) ?? 1,
		mov: numero(r.mov, 0) ?? 0,
		aparencia: lerAparencia(r.aparencia, cor),
		situacao,
		assento: typeof r.assento === 'string' && /^[a-z0-9:.-]{1,60}$/.test(r.assento) ? r.assento : null,
		ceo: r.ceo === true,
		paradoDesde,
		paradoHa: paradoDesde === null || agora === null ? 0 : Math.max(0, agora - paradoDesde)
	};
}

const arredonda = (n: number) => Math.round(n * 1000) / 1000;

type Posicao = { x: number; y: number; dirX: number; dirY: number; mov: number; assento: string | null };

/** O DGathe aberto: lê quem está e grava para onde eu vou. */
export class Presenca {
	private parado = false;
	private lendo = false;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private falhas = 0;
	private mov = Date.now();
	/** A última posição que ainda não chegou ao banco (tenta de novo a cada leitura). */
	private pendente: Posicao | null = null;

	constructor(
		private readonly supabase: SupabaseClient,
		private readonly euId: string,
		private readonly ouvintes: {
			/** Todos os outros que já entraram no escritório (online ou ausentes). */
			pessoas(lista: Pessoa[]): void;
			estado(e: EstadoConexao): void;
		}
	) {}

	/** Abre com o boneco onde ele aparece aqui: esse lugar passa a valer para os outros. */
	iniciar(onde: { x: number; y: number; dirX: number; dirY: number }) {
		this.ouvintes.estado('conectando');
		this.mov = Math.max(Date.now(), this.mov + 1);
		this.pendente = { ...onde, mov: this.mov, assento: null };
		if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.voltou);
		void this.ler();
	}

	private voltou = () => {
		if (!document.hidden) void this.ler();
	};

	private agendar() {
		clearTimeout(this.timer);
		if (this.parado) return;
		const escondida = typeof document !== 'undefined' && document.hidden;
		this.timer = setTimeout(() => void this.ler(), escondida ? LEITURA_ESCONDIDA : LEITURA);
	}

	/** Lê quem está (e antes manda a minha posição, se alguma ficou para trás). */
	async ler() {
		if (this.parado || this.lendo) return;
		this.lendo = true;
		try {
			if (this.pendente) await this.enviar();
			const { data, error } = await this.supabase.rpc('dgathe_quem');
			if (this.parado) return;
			if (error || !Array.isArray(data)) throw error ?? new Error('resposta inesperada');
			this.falhas = 0;
			const lista: Pessoa[] = [];
			for (const linha of data) {
				const p = lerLinha(linha);
				if (p && p.id !== this.euId) lista.push(p);
			}
			this.ouvintes.pessoas(lista);
			this.ouvintes.estado('online');
		} catch (e) {
			// Uma falha solta (rede piscou) não muda nada na tela; duas seguidas, o ponto fica cinza
			this.falhas++;
			if (this.falhas >= 2) {
				this.ouvintes.estado('offline');
				console.warn('[DGathe] sem leitura de quem está:', e);
			}
		} finally {
			this.lendo = false;
			this.agendar();
		}
	}

	/** Comecei a andar: o destino já vale para os outros (eles fazem o caminho). `assento` = vou sentar lá. */
	andar(destino: Ponto, dirX: number, dirY: number, assento: string | null = null) {
		this.mov = Math.max(Date.now(), this.mov + 1);
		this.pendente = { x: destino.x, y: destino.y, dirX, dirY, mov: this.mov, assento };
		void this.enviar();
	}

	/** Parei aqui (o mesmo movimento: só acerta o ponto e a direção). */
	parou(x: number, y: number, dirX: number, dirY: number, assento: string | null = null) {
		this.pendente = { x, y, dirX, dirY, mov: this.mov, assento };
		void this.enviar();
	}

	private async enviar() {
		const p = this.pendente;
		if (!p || this.parado) return;
		const { error } = await this.supabase.rpc('dgathe_pulso', {
			p_x: arredonda(p.x),
			p_y: arredonda(p.y),
			p_dir_x: arredonda(p.dirX),
			p_dir_y: arredonda(p.dirY),
			p_mov: p.mov,
			p_assento: p.assento
		});
		if (!error && this.pendente === p) this.pendente = null;
	}

	parar() {
		this.parado = true;
		clearTimeout(this.timer);
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.voltou);
	}
}

const CHAVE_ABAS = 'dgathe:abas';

/**
 * Anota esta aba no registro das abas do dspace abertas neste navegador e
 * devolve quantas outras estão vivas (deram sinal há pouco).
 */
export function marcarAba(aba: string, viva: boolean, agora = Date.now()): number {
	try {
		const abas = JSON.parse(localStorage.getItem(CHAVE_ABAS) || '{}') as Record<string, number>;
		for (const [k, quando] of Object.entries(abas)) if (typeof quando !== 'number' || agora - quando > 2 * PULSO + 10_000) delete abas[k];
		if (viva) abas[aba] = agora;
		else delete abas[aba];
		localStorage.setItem(CHAVE_ABAS, JSON.stringify(abas));
		return Object.keys(abas).filter((k) => k !== aba).length;
	} catch {
		return 0;
	}
}

const CHAVE_MEXEU = 'dgathe:mexeu';
const CHAVE_INATIVO = 'dgathe:inativo';
type Decisao = { desde: number; assento: string | null };

function lerDecisao(): Decisao | null {
	try {
		const d = JSON.parse(localStorage.getItem(CHAVE_INATIVO) || 'null') as Decisao | null;
		return d && typeof d.desde === 'number' ? d : null;
	} catch {
		return null;
	}
}

/**
 * O sinal de vida do dspace inteiro (chamado no layout, para quem tem o
 * módulo DGathe), e a vigia dos 15 min sem mexer. Devolve a função que para.
 *
 * Ficou inativo ou voltou: avisa a página com os eventos 'dgathe:inativo' e
 * 'dgathe:ativo' (detail.assento). Se o DGathe estiver aberto nesta aba, ele
 * chama preventDefault() e faz o próprio boneco andar (e gravar); senão, o
 * lugar é gravado daqui.
 */
export function manterSinal(
	supabase: SupabaseClient,
	conexao: { url: string; chave: string },
	quem: { id: string | null; ceo: boolean }
): () => void {
	const aba = Math.random().toString(36).slice(2, 10);
	let token: string | null = null;
	let parado = false;
	let inativo = false;
	let ultimoLocal = Date.now();
	let gravadoEm = 0;

	const ultimoMexer = () => {
		try {
			return Math.max(ultimoLocal, Number(localStorage.getItem(CHAVE_MEXEU)) || 0);
		} catch {
			return ultimoLocal;
		}
	};

	const pulsar = async (args?: Record<string, unknown>) => {
		if (parado) return;
		marcarAba(aba, true);
		const { data } = await supabase.auth.getSession();
		token = data.session?.access_token ?? null;
		if (token && !parado) await supabase.rpc('dgathe_pulso', args);
	};

	/** 15 min sem mexer: escolhe onde sentar (a mesma escolha em todas as abas) e vai. */
	const ficarInativo = async () => {
		if (inativo || parado) return;
		inativo = true;
		const desde = ultimoMexer();
		let decisao = lerDecisao();
		if (!decisao || decisao.desde !== desde) {
			// Lugar livre: não senta onde outra pessoa inativa já sentou
			const { data } = await supabase.rpc('dgathe_quem');
			const ocupados = new Set<string>();
			if (Array.isArray(data)) {
				const outros: Pessoa[] = [];
				for (const linha of data) {
					const p = lerLinha(linha);
					if (p && p.id !== quem.id) outros.push(p);
				}
				for (const alvo of alvos(outros).values()) if (alvo.assento) ocupados.add(alvo.assento.id);
			}
			const a = escolherAssento({ ceo: quem.ceo, ocupados, semente: hashTexto(quem.id ?? aba) ^ desde });
			decisao = { desde, assento: a?.id ?? null };
			try {
				localStorage.setItem(CHAVE_INATIVO, JSON.stringify(decisao));
			} catch {
				// sem armazenamento: cada aba decide por si
			}
		}
		if (!inativo || parado) return;
		const ev = new CustomEvent('dgathe:inativo', { detail: { assento: decisao.assento }, cancelable: true });
		const oDGatheCuida = !window.dispatchEvent(ev);
		const a = assentoPorId(decisao.assento);
		if (oDGatheCuida || !a) await pulsar({ p_inativo: true });
		else await pulsar({ p_x: a.x, p_y: a.y, p_dir_x: a.dirX, p_dir_y: a.dirY, p_mov: Date.now(), p_inativo: true, p_assento: a.id });
	};

	/** Mexeu de novo (aqui, ou noutra aba: `daqui` = false): levanta. */
	const voltar = async (daqui: boolean) => {
		if (!inativo || parado) return;
		inativo = false;
		const decisao = lerDecisao();
		if (daqui) {
			try {
				localStorage.removeItem(CHAVE_INATIVO);
			} catch {
				// sem armazenamento
			}
		}
		const ev = new CustomEvent('dgathe:ativo', { detail: { assento: decisao?.assento ?? null }, cancelable: true });
		const oDGatheCuida = !window.dispatchEvent(ev);
		if (!daqui) return; // quem mexeu foi outra aba, e ela já gravou
		const a = assentoPorId(decisao?.assento);
		if (oDGatheCuida || !a) await pulsar({ p_inativo: false });
		// Levanta e fica de pé ao lado do lugar
		else await pulsar({ p_x: a.x, p_y: a.y, p_dir_x: a.dirX, p_dir_y: a.dirY, p_mov: Date.now(), p_inativo: false });
	};

	const mexeu = () => {
		const agora = Date.now();
		ultimoLocal = agora;
		if (agora - gravadoEm > 10_000) {
			gravadoEm = agora;
			try {
				localStorage.setItem(CHAVE_MEXEU, String(agora));
			} catch {
				// sem armazenamento: vale só esta aba
			}
		}
		if (inativo) void voltar(true);
	};

	const conferirOcio = () => {
		const parada = Date.now() - ultimoMexer();
		if (!inativo && parada > OCIOSO_APOS) void ficarInativo();
		else if (inativo && parada < OCIOSO_APOS) void voltar(false);
	};

	// Abriu o dspace: está mexendo agora (e não está mais inativo, se estava)
	mexeu();
	void pulsar({ p_inativo: false });
	// Um segundo sinal logo depois: se a despedida da página anterior (recarregar)
	// chegou ao servidor depois do primeiro, este a desfaz
	const extra = setTimeout(() => void pulsar(), 4_000);
	const pararRelogio = relogio(PULSO, () => {
		void pulsar();
		conferirOcio();
	});

	const voltou = () => {
		if (!document.hidden) void pulsar();
	};
	const saiu = () => {
		// Ainda há outra aba do dspace aberta: continua no escritório
		if (marcarAba(aba, false) > 0 || !token) return;
		try {
			// keepalive: o pedido segue mesmo com a aba fechando
			void fetch(`${conexao.url}/rest/v1/rpc/dgathe_saiu`, {
				method: 'POST',
				keepalive: true,
				headers: { apikey: conexao.chave, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: '{}'
			});
		} catch {
			// sem despedida, a pessoa vai para a recepção pelo tempo sem sinal
		}
	};
	const voltouDoCache = (e: PageTransitionEvent) => {
		if (e.persisted) void pulsar();
	};
	// Outra aba decidiu (ficou inativo) ou desfez (alguém mexeu lá)
	const outraAba = (e: StorageEvent) => {
		if (e.key !== CHAVE_INATIVO) return;
		if (e.newValue && !inativo) void ficarInativo();
		else if (!e.newValue && inativo) void voltar(false);
	};
	const EVENTOS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
	for (const ev of EVENTOS) window.addEventListener(ev, mexeu, { passive: true });
	window.addEventListener('scroll', mexeu, { passive: true, capture: true });
	document.addEventListener('visibilitychange', voltou);
	window.addEventListener('pagehide', saiu);
	window.addEventListener('pageshow', voltouDoCache);
	window.addEventListener('storage', outraAba);

	return () => {
		parado = true;
		clearTimeout(extra);
		pararRelogio();
		for (const ev of EVENTOS) window.removeEventListener(ev, mexeu);
		window.removeEventListener('scroll', mexeu, { capture: true });
		document.removeEventListener('visibilitychange', voltou);
		window.removeEventListener('pagehide', saiu);
		window.removeEventListener('pageshow', voltouDoCache);
		window.removeEventListener('storage', outraAba);
		marcarAba(aba, false);
	};
}
