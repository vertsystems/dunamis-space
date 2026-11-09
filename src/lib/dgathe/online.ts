// Quem mais está no DGathe, em tempo real (Supabase Realtime).
//
// Nada é gravado em tabela. Cada navegador entra no canal privado
// 'dgathe:escritorio' e usa três coisas dele:
//   - presence: "quem sou e onde estou parado". Quem chega recebe o estado de
//     todos de uma vez, e quem fecha a aba some sozinho.
//   - broadcast 'rota': quando alguém anda, manda o trajeto inteiro UMA vez, e
//     os outros animam a caminhada localmente. Não há posição a cada quadro.
//   - broadcast 'saiu': a despedida de quem fecha o DGathe, para sumir na hora.
//
// O canal é privado: só entra quem tem o módulo 'dgathe' (regras na migration
// 0096). Se a conexão falhar, o jogo segue sozinho e o estado vira 'offline'.
//
// O que já deu errado e o que segura cada coisa (09/11/2026):
//   - Boneco que andava, voltava ao começo e pulava para o fim: a presença diz
//     onde a pessoa estava antes de sair, e era reenviada no meio da caminhada.
//     Rota e presença levam `mov` (movimento.ts), e o velho perde do novo.
//   - Pessoa sumindo e voltando: a conexão de aba em segundo plano cai e volta.
//     Quem some SEM se despedir fica na tela por GRACA; quem se despede sai na
//     hora. O pulso e a vigia rodam num Web Worker, que o navegador não atrasa.
//   - Fantasma: aba congelada mantém a presença no servidor. Cada aba renova a
//     presença a cada PULSO, e a entrada que passa de VALIDADE sem renovar é
//     ignorada (contado no relógio de quem recebe). Com duas entradas da mesma
//     pessoa, vale a que está viva, e entre as vivas, o movimento mais novo.

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
	/** Carimbo do movimento que levou a este lugar (relógio de quem anda). */
	mov: number;
	/** Como o bonequinho é montado (vem do Meu Perfil). */
	aparencia: Aparencia;
};

export type EstadoConexao = 'conectando' | 'online' | 'offline';

export type OuvintesOnline = {
	/** Todos os outros que estão no escritório agora (sem mim). */
	pessoas(lista: Pessoa[]): void;
	/** Alguém começou a andar por este trajeto. */
	rota(id: string, pontos: Ponto[], mov: number): void;
	estado(e: EstadoConexao): void;
};

const MAX_PONTOS = 120;
/** De quanto em quanto tempo cada um diz "ainda estou aqui". */
export const PULSO = 30_000;
/** De quanto em quanto tempo a vigia confere conexão, canal e a minha presença. */
export const VIGIA = 15_000;
/** Entrada de presença sem renovar por este tempo é de aba congelada: some. */
export const VALIDADE = 150_000;
/** Quem some sem se despedir (a conexão caiu e está voltando) fica na tela por este tempo. */
export const GRACA = 10_000;

const numero = (v: unknown, min: number, max: number): number | null =>
	typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const carimbo = (v: unknown) => numero(v, 0, Number.MAX_SAFE_INTEGER) ?? 0;

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
		mov: carimbo(p.mov),
		aparencia: lerAparencia(p.aparencia, cor)
	};
}

export function lerRota(bruto: unknown): { id: string; pontos: Ponto[]; mov: number } | null {
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
	return { id, pontos, mov: carimbo(r.mov) };
}

const arredonda = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Relógio que não atrasa com a aba em segundo plano: o navegador segura o
 * setInterval da página (até uma vez por minuto, ou mais), mas não o de um Web
 * Worker. Sem Worker (testes, navegador velho), cai no setInterval.
 */
function relogio(ms: number, f: () => void): () => void {
	if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
		try {
			const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: 'text/javascript' }));
			const w = new Worker(url);
			let reserva: ReturnType<typeof setInterval> | undefined;
			w.onmessage = () => f();
			w.onerror = () => {
				w.terminate();
				reserva ??= setInterval(f, ms);
			};
			return () => {
				w.terminate();
				clearInterval(reserva);
				URL.revokeObjectURL(url);
			};
		} catch {
			// sem Worker: segue com o setInterval
		}
	}
	const id = setInterval(f, ms);
	return () => clearInterval(id);
}

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

type Entrada = { presence_ref?: string };

export class Online {
	private canal: RealtimeChannel | null = null;
	private conectado = false;
	private fechado = false;
	/** O que vai na minha presença: o lugar onde parei e o carimbo desse movimento. */
	private readonly eu: Pessoa & { pulso: number };
	/** Carimbo da caminhada que comecei por último (a presença só o recebe ao parar). */
	private movRota: number;

	/** Quando vi cada presence_ref pela primeira vez (relógio daqui). */
	private readonly vistos = new Map<string, number>();
	/** Quem está na minha tela agora, e desde quando sumiu do canal (graça). */
	private readonly naTela = new Map<string, Pessoa>();
	private readonly sumiuEm = new Map<string, number>();
	/** Quem se despediu, e quando: as entradas dele de antes disso não contam mais. */
	private readonly despedidas = new Map<string, number>();

	private pararPulso: (() => void) | null = null;
	private pararVigia: (() => void) | null = null;
	private retentativa: ReturnType<typeof setTimeout> | undefined;
	private graca: ReturnType<typeof setTimeout> | undefined;
	private falhas = 0;
	private reconectando = false;

	private readonly topico: string;
	private readonly privado: boolean;
	private readonly agora: () => number;

	constructor(
		private readonly supabase: SupabaseClient,
		eu: Omit<Pessoa, 'mov'>,
		private readonly ouvintes: OuvintesOnline,
		/** Só para teste local sem login: um canal público, com outro nome. */
		opcoes: { canalDeTeste?: string; agora?: () => number } = {}
	) {
		this.movRota = Date.now();
		this.eu = { ...eu, mov: this.movRota, pulso: 0 };
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
		this.pararVigia ??= relogio(VIGIA, () => this.conferir());
		canal.on('presence', { event: 'sync' }, () => {
			if (this.canal === canal) this.publicarPresenca();
		});
		canal.on('broadcast', { event: 'rota' }, ({ payload }) => {
			const r = lerRota(payload);
			if (r && r.id !== this.eu.id) this.ouvintes.rota(r.id, r.pontos, r.mov);
		});
		canal.on('broadcast', { event: 'saiu' }, ({ payload }) => {
			const id = texto((payload as { id?: unknown } | undefined)?.id, 64);
			if (!id || id === this.eu.id) return;
			this.despedidas.set(id, this.agora());
			this.publicarPresenca();
		});
		canal.subscribe(async (status, erro) => {
			if (this.fechado || this.canal !== canal) return;
			if (status === 'SUBSCRIBED') {
				this.conectado = true;
				this.falhas = 0;
				await this.anunciar();
				this.pararPulso ??= relogio(PULSO, () => {
					this.eu.pulso++;
					if (this.conectado) void this.anunciar();
					this.publicarPresenca();
				});
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
		if (!this.canal || this.fechado) return;
		const estado = this.canal.presenceState();
		const agora = this.agora();
		const refs = new Set<string>();
		const presentes = new Map<string, Pessoa>();

		for (const [chave, entradas] of Object.entries(estado)) {
			if (chave === this.eu.id) continue;
			const tchau = this.despedidas.get(chave);
			for (const e of entradas as Entrada[]) {
				const ref = e.presence_ref ?? '';
				refs.add(ref);
				let desde = this.vistos.get(ref);
				if (desde === undefined) this.vistos.set(ref, (desde = agora));
				// Entrada que não se renova há VALIDADE: aba congelada
				if (agora - desde > VALIDADE) continue;
				// Aba que já se despediu (a presença dela ainda não saiu do servidor)
				if (tchau !== undefined && desde <= tchau) continue;
				const p = lerPessoa(e);
				if (!p || p.id !== chave) continue;
				// Duas abas vivas da mesma pessoa: vale o movimento mais novo
				const outra = presentes.get(chave);
				if (!outra || p.mov >= outra.mov) presentes.set(chave, p);
			}
		}
		for (const ref of [...this.vistos.keys()]) if (!refs.has(ref)) this.vistos.delete(ref);

		const lista = [...presentes.values()];
		let proxima = Infinity;
		for (const p of lista) {
			this.naTela.set(p.id, p);
			this.sumiuEm.delete(p.id);
		}
		for (const [id, p] of [...this.naTela]) {
			if (presentes.has(id)) continue;
			const desde = this.sumiuEm.get(id) ?? agora;
			const resta = GRACA - (agora - desde);
			if (!this.despedidas.has(id) && resta > 0) {
				// Sumiu sem se despedir: a conexão dela pode estar voltando
				this.sumiuEm.set(id, desde);
				lista.push(p);
				proxima = Math.min(proxima, resta);
			} else {
				this.naTela.delete(id);
				this.sumiuEm.delete(id);
			}
		}
		for (const id of [...this.despedidas.keys()]) if (!(id in estado)) this.despedidas.delete(id);

		clearTimeout(this.graca);
		if (proxima < Infinity) this.graca = setTimeout(() => this.publicarPresenca(), proxima + 50);
		this.ouvintes.pessoas(lista);
	}

	/** Avisa os outros do trajeto que comecei a fazer. */
	andar(pontos: Ponto[]) {
		if (pontos.length < 2) return;
		this.movRota = Math.max(Date.now(), this.movRota + 1);
		if (!this.conectado || !this.canal) return;
		const enviados = pontos.slice(0, MAX_PONTOS).map((p) => ({ x: arredonda(p.x), y: arredonda(p.y) }));
		void this.canal.send({ type: 'broadcast', event: 'rota', payload: { id: this.eu.id, pontos: enviados, mov: this.movRota } });
	}

	/** Atualiza onde estou parado (é o que quem chegar depois vai ver). */
	parou(x: number, y: number, dirX: number, dirY: number) {
		Object.assign(this.eu, { x: arredonda(x), y: arredonda(y), dirX: arredonda(dirX), dirY: arredonda(dirY), mov: this.movRota });
		this.eu.pulso++;
		if (this.conectado) void this.anunciar();
	}

	/**
	 * Sai do canal, com despedida (os outros me tiram da tela na hora). Chamar
	 * também quando a aba fecha, senão o servidor só percebe a saída bem depois.
	 */
	sair() {
		if (this.fechado) return;
		this.fechado = true;
		if (this.conectado && this.canal) void this.canal.send({ type: 'broadcast', event: 'saiu', payload: { id: this.eu.id } });
		this.conectado = false;
		this.pararPulso?.();
		this.pararPulso = null;
		this.pararVigia?.();
		this.pararVigia = null;
		clearTimeout(this.retentativa);
		clearTimeout(this.graca);
		if (!this.canal) return;
		const canal = this.canal;
		this.canal = null;
		saindo = tirarCanal(this.supabase, canal);
	}
}
