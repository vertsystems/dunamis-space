// Quem mais está no DGathe, em tempo real (Supabase Realtime).
//
// Nada é gravado em tabela. Cada navegador entra no canal privado
// 'dgathe:escritorio' e usa duas coisas dele:
//   - presence: "quem sou e onde estou parado". Quem chega recebe o estado de
//     todos de uma vez, e quem fecha a aba some sozinho.
//   - broadcast 'rota': quando alguém anda, manda o trajeto inteiro UMA vez, e
//     os outros animam a caminhada localmente. Não há posição a cada quadro.
//
// O canal é privado: só entra quem tem o módulo 'dgathe' (regras na migration
// 0096). Se a conexão falhar, o jogo segue sozinho e o estado vira 'offline'.
//
// Sinal de vida: a saída normal chega em ~2 s (o servidor percebe a conexão
// caindo), mas um navegador pode congelar a aba sem fechar a conexão, e aí a
// pessoa ficaria como fantasma. Por isso cada um renova a presença a cada
// PULSO, e quem passa de VALIDADE sem renovar some da tela dos outros. O tempo
// é o do relógio de quem recebe, então relógio errado de outra máquina não conta.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Ponto } from './iso';
import { LARGURA, ALTURA } from './mapa';
import { lerAparencia, type Aparencia } from './aparencia';

export const CANAL = 'dgathe:escritorio';

export type Pessoa = {
	id: string;
	nome: string;
	cargo: string;
	foto: string | null;
	cor: string | null;
	x: number;
	y: number;
	dirX: number;
	dirY: number;
	/** Como o bonequinho é montado (vem do Meu Perfil). */
	aparencia: Aparencia;
};

export type EstadoConexao = 'conectando' | 'online' | 'offline';

export type OuvintesOnline = {
	/** Todos os outros que estão no escritório agora (sem mim). */
	pessoas(lista: Pessoa[]): void;
	/** Alguém começou a andar por este trajeto. */
	rota(id: string, pontos: Ponto[]): void;
	estado(e: EstadoConexao): void;
};

const MAX_PONTOS = 120;
/** De quanto em quanto tempo cada um diz "ainda estou aqui". */
export const PULSO = 30_000;
/** De quanto em quanto tempo a vigia confere conexão, canal e a minha presença. */
export const VIGIA = 15_000;
/** Sem sinal por este tempo, a pessoa some (folga para o navegador atrasar o pulso de aba em segundo plano). */
export const VALIDADE = 150_000;

const numero = (v: unknown, min: number, max: number): number | null =>
	typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Confere o que veio de outro navegador antes de virar bonequinho na tela. */
export function lerPessoa(bruto: unknown): Pessoa | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const p = bruto as Record<string, unknown>;
	const id = texto(p.id, 64);
	const nome = texto(p.nome, 80);
	const x = numero(p.x, 0, LARGURA);
	const y = numero(p.y, 0, ALTURA);
	if (!id || !nome || x === null || y === null) return null;
	const foto = texto(p.foto, 500);
	const cor = typeof p.cor === 'string' && /^#[0-9a-f]{6}$/i.test(p.cor) ? p.cor : null;
	return {
		id,
		nome,
		cargo: texto(p.cargo, 20) ?? 'Equipe',
		// https:// ou caminho do próprio dspace; "//outro.site" fica de fora.
		foto: foto && /^(https:\/\/|\/(?!\/))/.test(foto) ? foto : null,
		cor,
		x,
		y,
		dirX: numero(p.dirX, -1, 1) ?? 1,
		dirY: numero(p.dirY, -1, 1) ?? 1,
		aparencia: lerAparencia(p.aparencia, cor)
	};
}

export function lerRota(bruto: unknown): { id: string; pontos: Ponto[] } | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const r = bruto as Record<string, unknown>;
	const id = texto(r.id, 64);
	if (!id || !Array.isArray(r.pontos) || r.pontos.length < 2 || r.pontos.length > MAX_PONTOS) return null;
	const pontos: Ponto[] = [];
	for (const p of r.pontos) {
		if (!p || typeof p !== 'object') return null;
		const x = numero((p as Ponto).x, 0, LARGURA);
		const y = numero((p as Ponto).y, 0, ALTURA);
		if (x === null || y === null) return null;
		pontos.push({ x, y });
	}
	return { id, pontos };
}

const arredonda = (n: number) => Math.round(n * 1000) / 1000;

/**
 * A saída do canal em andamento (o app tem um cliente Supabase só). Quem entra
 * espera por ela: o Supabase devolve o canal velho quando o nome ainda está
 * aberto, e canal velho não se inscreve de novo (era o que deixava alguém
 * invisível ao voltar do Meu Perfil para o DGathe).
 */
let saindo: Promise<unknown> = Promise.resolve();
const ESPERA_SAIDA = 3_000;

/** Tira o canal; se o servidor não confirmar a saída, tira à força deste navegador. */
async function tirarCanal(supabase: SupabaseClient, canal: RealtimeChannel) {
	const resposta = await supabase.removeChannel(canal).catch(() => 'error');
	if (resposta !== 'ok') esquecerCanal(supabase, canal);
}

function esquecerCanal(supabase: SupabaseClient, canal: RealtimeChannel) {
	try {
		canal.teardown();
	} catch {
		// já estava desmontado
	}
	(supabase.realtime as unknown as { _remove?: (c: RealtimeChannel) => void })._remove?.(canal);
}

export class Online {
	private canal: RealtimeChannel | null = null;
	private conectado = false;
	private fechado = false;
	private readonly eu: Pessoa & { pulso: number };
	private readonly sinais = new Map<string, { ref: string; quando: number }>();
	private relogio: ReturnType<typeof setInterval> | null = null;
	private retentativa: ReturnType<typeof setTimeout> | undefined;
	private vigia: ReturnType<typeof setInterval> | null = null;
	private falhas = 0;

	private readonly topico: string;
	private readonly privado: boolean;
	private readonly agora: () => number;

	constructor(
		private readonly supabase: SupabaseClient,
		eu: Pessoa,
		private readonly ouvintes: OuvintesOnline,
		/** Só para teste local sem login: um canal público, com outro nome. */
		opcoes: { canalDeTeste?: string; agora?: () => number } = {}
	) {
		this.eu = { ...eu, pulso: 0 };
		this.agora = opcoes.agora ?? Date.now;
		this.topico = opcoes.canalDeTeste ?? CANAL;
		this.privado = !opcoes.canalDeTeste;
	}

	async entrar() {
		this.ouvintes.estado('conectando');
		if (this.privado) {
			try {
				// Canal privado: o Realtime precisa do token de quem está logado.
				await this.supabase.realtime.setAuth();
			} catch {
				// Sem sessão o canal privado recusa a entrada, e o estado vira 'offline'.
			}
		}
		if (this.fechado) return;
		// Espera a saída anterior (até 3 s) e tira o que sobrou com este nome
		await Promise.race([saindo, new Promise((r) => setTimeout(r, ESPERA_SAIDA))]);
		if (this.fechado) return;
		const nome = `realtime:${this.topico}`;
		for (const velho of this.supabase.getChannels().filter((c) => c.topic === nome)) esquecerCanal(this.supabase, velho);

		const canal = this.supabase.channel(this.topico, {
			config: { private: this.privado, presence: { key: this.eu.id }, broadcast: { self: false } }
		});
		this.canal = canal;
		if (!this.vigia) this.vigia = setInterval(() => this.conferir(), VIGIA);
		canal.on('presence', { event: 'sync' }, () => {
			if (this.canal === canal) this.publicarPresenca();
		});
		canal.on('broadcast', { event: 'rota' }, ({ payload }) => {
			const r = lerRota(payload);
			if (r && r.id !== this.eu.id) this.ouvintes.rota(r.id, r.pontos);
		});
		canal.subscribe(async (status, erro) => {
			if (this.fechado || this.canal !== canal) return;
			if (status === 'SUBSCRIBED') {
				this.conectado = true;
				await this.anunciar();
				if (!this.relogio) {
					this.relogio = setInterval(() => {
						this.eu.pulso++;
						if (this.conectado) void this.anunciar();
						this.publicarPresenca();
					}, PULSO);
				}
			} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
				this.conectado = false;
				this.ouvintes.estado('offline');
				if (erro) console.warn('[DGathe] sem tempo real:', erro.message);
			}
		});
	}

	/**
	 * Diz "estou aqui". Só fica verde quando o servidor aceita; se recusar, o
	 * ponto fica cinza (em vez de verde enganando) e tenta de novo em 5 s.
	 */
	private async anunciar() {
		if (!this.canal) return;
		const resposta = await this.canal.track(this.eu);
		if (this.fechado) return;
		clearTimeout(this.retentativa);
		if (resposta === 'ok') {
			this.ouvintes.estado('online');
			return;
		}
		console.warn('[DGathe] presença não aceita:', resposta);
		this.ouvintes.estado('offline');
		this.retentativa = setTimeout(() => {
			if (this.conectado) void this.anunciar();
		}, 5000);
	}

	/**
	 * A vigia: sem ninguém precisar recarregar a página, confere se a conexão e
	 * o canal continuam de pé (duas falhas seguidas refazem tudo, com o login
	 * renovado), se o servidor ainda me lista (senão anuncia de novo) e refaz a
	 * lista de quem está online. `agora` refaz na primeira falha (a aba acabou
	 * de voltar para a frente e a pessoa está olhando).
	 */
	conferir(agora = false) {
		// Sem canal = ainda entrando ou já refazendo: nada a conferir
		if (this.fechado || !this.canal) return;
		const deLigado = this.supabase.realtime.isConnected() && this.canal.state === 'joined';
		if (!deLigado) {
			this.falhas++;
			if (agora || this.falhas >= 2) void this.reconectar();
			return;
		}
		this.falhas = 0;
		if (!this.canal.presenceState()[this.eu.id]) void this.anunciar();
		this.publicarPresenca();
	}

	private reconectando = false;

	private async reconectar() {
		if (this.reconectando) return;
		this.reconectando = true;
		this.falhas = 0;
		this.conectado = false;
		const velho = this.canal;
		this.canal = null;
		try {
			if (velho) await tirarCanal(this.supabase, velho);
			if (!this.fechado) await this.entrar();
		} finally {
			this.reconectando = false;
		}
	}

	private publicarPresenca() {
		if (!this.canal) return;
		const estado = this.canal.presenceState();
		const agora = this.agora();
		const lista: Pessoa[] = [];
		for (const [chave, entradas] of Object.entries(estado)) {
			if (chave === this.eu.id || !entradas.length) continue;
			// A mesma pessoa em duas abas: vale a entrada mais nova.
			const ultima = entradas[entradas.length - 1] as { presence_ref?: string };
			const ref = ultima.presence_ref ?? '';
			const sinal = this.sinais.get(chave);
			if (!sinal || sinal.ref !== ref) this.sinais.set(chave, { ref, quando: agora });
			else if (agora - sinal.quando > VALIDADE) continue;
			const p = lerPessoa(ultima);
			if (p) lista.push(p);
		}
		for (const chave of [...this.sinais.keys()]) if (!(chave in estado)) this.sinais.delete(chave);
		this.ouvintes.pessoas(lista);
	}

	/** Avisa os outros do trajeto que comecei a fazer. */
	andar(pontos: Ponto[]) {
		if (!this.conectado || !this.canal || pontos.length < 2) return;
		const enviados = pontos.slice(0, MAX_PONTOS).map((p) => ({ x: arredonda(p.x), y: arredonda(p.y) }));
		void this.canal.send({ type: 'broadcast', event: 'rota', payload: { id: this.eu.id, pontos: enviados } });
	}

	/** Atualiza onde estou parado (é o que quem chegar depois vai ver). */
	parou(x: number, y: number, dirX: number, dirY: number) {
		Object.assign(this.eu, { x: arredonda(x), y: arredonda(y), dirX: arredonda(dirX), dirY: arredonda(dirY) });
		this.eu.pulso++;
		if (this.conectado) void this.anunciar();
	}

	/**
	 * Sai do canal. Sair já tira a presença, e o aviso vai na hora: chamar também
	 * quando a aba fecha, senão o servidor só percebe a saída bem depois.
	 */
	sair() {
		this.fechado = true;
		this.conectado = false;
		if (this.relogio) clearInterval(this.relogio);
		this.relogio = null;
		clearTimeout(this.retentativa);
		if (this.vigia) clearInterval(this.vigia);
		this.vigia = null;
		if (!this.canal) return;
		const canal = this.canal;
		this.canal = null;
		saindo = tirarCanal(this.supabase, canal);
	}
}
