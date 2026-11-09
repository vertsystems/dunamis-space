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
// Ausente = sem sinal há mais de AUSENTE_APOS segundos (dspace fechado, Mac
// dormindo, sem internet) ou despedida há mais de SAIDA_CONFIRMA segundos
// (recarregar a página não conta como sair). Os segundos são contados no
// relógio do servidor.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Ponto } from './iso';
import { LARGURA, ALTURA } from './mapa';
import { lerAparencia, type Aparencia } from './aparencia';
import { relogio } from './relogio';
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

export type Situacao = 'online' | 'ausente';

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
		situacao: semSinal > AUSENTE_APOS || (saiuHa !== null && saiuHa >= SAIDA_CONFIRMA) ? 'ausente' : 'online'
	};
}

const arredonda = (n: number) => Math.round(n * 1000) / 1000;

type Posicao = { x: number; y: number; dirX: number; dirY: number; mov: number };

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
		this.pendente = { ...onde, mov: this.mov };
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

	/** Comecei a andar: o destino já vale para os outros (eles fazem o caminho). */
	andar(destino: Ponto, dirX: number, dirY: number) {
		this.mov = Math.max(Date.now(), this.mov + 1);
		this.pendente = { x: destino.x, y: destino.y, dirX, dirY, mov: this.mov };
		void this.enviar();
	}

	/** Parei aqui (o mesmo movimento: só acerta o ponto e a direção). */
	parou(x: number, y: number, dirX: number, dirY: number) {
		this.pendente = { x, y, dirX, dirY, mov: this.mov };
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
			p_mov: p.mov
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

/**
 * O sinal de vida do dspace inteiro (chamado no layout, para quem tem o
 * módulo DGathe). Devolve a função que para.
 */
export function manterSinal(supabase: SupabaseClient, conexao: { url: string; chave: string }): () => void {
	const aba = Math.random().toString(36).slice(2, 10);
	let token: string | null = null;
	let parado = false;

	const pulsar = async () => {
		if (parado) return;
		marcarAba(aba, true);
		const { data } = await supabase.auth.getSession();
		token = data.session?.access_token ?? null;
		if (token && !parado) await supabase.rpc('dgathe_pulso');
	};

	void pulsar();
	// Um segundo sinal logo depois: se a despedida da página anterior (recarregar)
	// chegou ao servidor depois do primeiro, este a desfaz
	const extra = setTimeout(() => void pulsar(), 4_000);
	const pararRelogio = relogio(PULSO, () => void pulsar());

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
	document.addEventListener('visibilitychange', voltou);
	window.addEventListener('pagehide', saiu);
	window.addEventListener('pageshow', voltouDoCache);

	return () => {
		parado = true;
		clearTimeout(extra);
		pararRelogio();
		document.removeEventListener('visibilitychange', voltou);
		window.removeEventListener('pagehide', saiu);
		window.removeEventListener('pageshow', voltouDoCache);
		marcarAba(aba, false);
	};
}
