import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CANAL, Online, PULSO, VALIDADE, VIGIA, lerPessoa, lerRota, type EstadoConexao, type Pessoa } from './online';
import type { Ponto } from './iso';
import { APARENCIA_PADRAO, lerAparencia } from './aparencia';

/**
 * Um Supabase de mentira, só com o pedaço do Realtime que o DGathe usa. Imita
 * duas manias do de verdade: channel() com um nome que ainda está aberto
 * devolve o canal velho, e canal já inscrito não aceita ouvinte de presença.
 */
function supabaseFalso(respostaTrack: 'ok' | 'error' = 'ok', respostaSaida: 'ok' | 'timed out' = 'ok') {
	type Canal = ReturnType<typeof novoCanal>;
	let estado: Record<string, unknown[]> = {};
	const enviados: { type: string; event: string; payload: unknown }[] = [];
	const rastreados: unknown[] = [];
	const abertos: { nome: string; opcoes: { config: { private: boolean; presence: { key: string } } } }[] = [];
	let vivos: Canal[] = [];
	let atual: Canal | null = null;

	function novoCanal(nome: string) {
		const ouvintes: Record<string, (m: { payload?: unknown }) => void> = {};
		let aoInscrever: ((status: string, erro?: Error) => void) | null = null;
		const canal = {
			topic: `realtime:${nome}`,
			state: 'closed' as string,
			ouvintes,
			inscrever: (s: string, erro?: Error) => aoInscrever?.(s, erro),
			on(tipo: string, filtro: { event: string }, f: (m: { payload?: unknown }) => void) {
				if (aoInscrever && tipo === 'presence') throw new Error('cannot add `presence` callbacks after `subscribe()`.');
				ouvintes[`${tipo}:${filtro.event}`] = f;
				return canal;
			},
			subscribe(f: (status: string, erro?: Error) => void) {
				if (canal.state === 'closed') {
					aoInscrever = f;
					canal.state = 'joining';
				}
				return canal;
			},
			track: async (p: unknown) => {
				rastreados.push(JSON.parse(JSON.stringify(p)));
				// O servidor aceitou: passa a me listar (como o Realtime faz no sync)
				if (respostaTrack === 'ok') estado = { ...estado, [(p as { id: string }).id]: [p] };
				return respostaTrack;
			},
			untrack: async () => 'ok',
			send: async (m: { type: string; event: string; payload: unknown }) => {
				enviados.push(m);
				return 'ok';
			},
			presenceState: () => estado,
			teardown: () => undefined
		};
		return canal;
	}

	const supabase = {
		realtime: {
			setAuth: async () => {},
			isConnected: () => true,
			_remove: (c: Canal) => (vivos = vivos.filter((v) => v !== c))
		},
		getChannels: () => vivos,
		channel: (nome: string, opcoes: (typeof abertos)[number]['opcoes']) => {
			abertos.push({ nome, opcoes });
			const velho = vivos.find((c) => c.topic === `realtime:${nome}`);
			if (velho) return velho;
			atual = novoCanal(nome);
			vivos.push(atual);
			return atual;
		},
		removeChannel: async (c: Canal) => {
			c.state = 'leaving';
			await new Promise((r) => setTimeout(r, 20)); // a resposta do servidor demora
			if (respostaSaida === 'ok') {
				c.state = 'closed';
				vivos = vivos.filter((v) => v !== c);
			}
			return respostaSaida;
		}
	} as unknown as SupabaseClient;
	return {
		supabase,
		abertos,
		enviados,
		rastreados,
		vivos: () => vivos,
		status: (s: string, erro?: Error) => {
			if (!atual) return;
			atual.state = s === 'SUBSCRIBED' ? 'joined' : 'errored';
			atual.inscrever(s, erro);
		},
		cair: () => atual && (atual.state = 'errored'),
		sincronizar: (e: Record<string, unknown[]>) => {
			estado = e;
			atual?.ouvintes['presence:sync']?.({});
		},
		rota: (payload: unknown) => atual?.ouvintes['broadcast:rota']?.({ payload })
	};
}

const EU: Pessoa = { id: 'bruno', nome: 'Bruno Santana', cargo: 'CEO', foto: null, cor: '#1c2534', x: 20.5, y: 22.2, dirX: 1, dirY: 1, aparencia: APARENCIA_PADRAO };
const ALINE = { id: 'aline', nome: 'Aline Santana', cargo: 'CEO', foto: '/avatares/a.png', cor: '#e05a7a', x: 26.5, y: 20.5, dirX: 0, dirY: 1 };

async function montar(
	opcoes: { canalDeTeste?: string; agora?: () => number } = {},
	respostaTrack: 'ok' | 'error' = 'ok',
	respostaSaida: 'ok' | 'timed out' = 'ok'
) {
	const f = supabaseFalso(respostaTrack, respostaSaida);
	const recebido = { pessoas: [] as Pessoa[][], rotas: [] as { id: string; pontos: Ponto[] }[], estados: [] as EstadoConexao[] };
	const online = new Online(
		f.supabase,
		EU,
		{
			pessoas: (l) => recebido.pessoas.push(l),
			rota: (id, pontos) => recebido.rotas.push({ id, pontos }),
			estado: (e) => recebido.estados.push(e)
		},
		opcoes
	);
	await online.entrar();
	return { f, online, recebido };
}

/** Mais uma aba/visita da mesma pessoa no mesmo Supabase (o app tem um só cliente). */
async function outraVisita(f: ReturnType<typeof supabaseFalso>) {
	const estados: EstadoConexao[] = [];
	const online = new Online(f.supabase, EU, { pessoas: () => {}, rota: () => {}, estado: (e) => estados.push(e) });
	await online.entrar();
	return { online, estados };
}

afterEach(async () => {
	// Termina a saída do canal pendente, senão o teste seguinte espera por ela
	if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(5_000);
	vi.useRealTimers();
});

describe('Online', () => {
	it('entra no canal privado do escritório, com a minha chave de presença', async () => {
		const { f } = await montar();
		expect(f.abertos).toHaveLength(1);
		expect(f.abertos[0].nome).toBe(CANAL);
		expect(f.abertos[0].opcoes.config.private).toBe(true);
		expect(f.abertos[0].opcoes.config.presence.key).toBe('bruno');
	});

	it('o canal de teste é público e tem outro nome', async () => {
		const { f } = await montar({ canalDeTeste: 'dgathe:teste' });
		expect(f.abertos[0].nome).toBe('dgathe:teste');
		expect(f.abertos[0].opcoes.config.private).toBe(false);
	});

	it('só manda trajeto depois de conectar, e já se anuncia ao conectar', async () => {
		const { f, online, recebido } = await montar();
		online.andar([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
		expect(f.enviados).toHaveLength(0);
		f.status('SUBSCRIBED');
		await new Promise((r) => setTimeout(r, 0));
		expect(recebido.estados).toEqual(['conectando', 'online']);
		expect(f.rastreados[0]).toMatchObject({ id: 'bruno', x: 20.5, y: 22.2 });
		online.andar([{ x: 1.123456, y: 1 }, { x: 2, y: 2.98765 }]);
		expect(f.enviados).toHaveLength(1);
		expect(f.enviados[0]).toMatchObject({ type: 'broadcast', event: 'rota' });
		expect(f.enviados[0].payload).toEqual({ id: 'bruno', pontos: [{ x: 1.123, y: 1 }, { x: 2, y: 2.988 }] });
	});

	it('ao parar, atualiza a presença com a posição nova', async () => {
		const { f, online } = await montar();
		f.status('SUBSCRIBED');
		await new Promise((r) => setTimeout(r, 0));
		online.parou(30.25, 18.5, -1, 0);
		expect(f.rastreados.at(-1)).toMatchObject({ x: 30.25, y: 18.5, dirX: -1, dirY: 0 });
	});

	it('a presença ignora a mim, pega a aba mais nova e descarta lixo', async () => {
		const { f, recebido } = await montar();
		f.sincronizar({
			bruno: [{ ...EU, presence_ref: '1' }],
			aline: [
				{ ...ALINE, x: 5, presence_ref: '2' },
				{ ...ALINE, presence_ref: '3' }
			],
			estranho: [{ id: 'estranho', nome: 'X', x: 999, y: 1, presence_ref: '4' }]
		});
		expect(recebido.pessoas.at(-1)).toEqual([{ ...ALINE, aparencia: lerAparencia(null, ALINE.cor) }]);
	});

	it('repassa o trajeto dos outros e ignora o meu e o malformado', async () => {
		const { f, recebido } = await montar();
		f.rota({ id: 'aline', pontos: [{ x: 26.5, y: 20.5 }, { x: 22, y: 14 }] });
		f.rota({ id: 'bruno', pontos: [{ x: 1, y: 1 }, { x: 2, y: 2 }] });
		f.rota({ id: 'aline', pontos: [{ x: 1, y: 1 }] });
		f.rota({ id: 'aline', pontos: 'nada' });
		expect(recebido.rotas).toEqual([{ id: 'aline', pontos: [{ x: 26.5, y: 20.5 }, { x: 22, y: 14 }] }]);
	});

	it('quem para de dar sinal some depois da validade, e volta quando dá sinal', async () => {
		let agora = 1_000;
		const { f, recebido } = await montar({ agora: () => agora });
		f.sincronizar({ aline: [{ ...ALINE, presence_ref: 'r1' }] });
		expect(recebido.pessoas.at(-1)).toHaveLength(1);
		agora += VALIDADE - 1;
		f.sincronizar({ aline: [{ ...ALINE, presence_ref: 'r1' }] });
		expect(recebido.pessoas.at(-1)).toHaveLength(1);
		agora += 2;
		f.sincronizar({ aline: [{ ...ALINE, presence_ref: 'r1' }] });
		expect(recebido.pessoas.at(-1)).toHaveLength(0);
		f.sincronizar({ aline: [{ ...ALINE, presence_ref: 'r2' }] });
		expect(recebido.pessoas.at(-1)).toHaveLength(1);
	});

	it('o pulso renova a minha presença a cada 30 segundos, e para ao sair', async () => {
		vi.useFakeTimers();
		const { f, online } = await montar();
		f.status('SUBSCRIBED');
		await vi.advanceTimersByTimeAsync(0);
		const antes = f.rastreados.length;
		await vi.advanceTimersByTimeAsync(PULSO);
		expect(f.rastreados.length).toBe(antes + 1);
		expect(f.rastreados.at(-1)).toMatchObject({ id: 'bruno', pulso: 1 });
		online.sair();
		await vi.advanceTimersByTimeAsync(PULSO * 3);
		expect(f.rastreados.length).toBe(antes + 1);
	});

	it('presença recusada pelo servidor deixa o ponto cinza (e não verde)', async () => {
		const { f, recebido, online } = await montar({}, 'error');
		f.status('SUBSCRIBED');
		await new Promise((r) => setTimeout(r, 0));
		expect(recebido.estados.at(-1)).toBe('offline');
		online.sair();
	});

	it('a vigia anuncia de novo quando o servidor perde a minha presença', async () => {
		vi.useFakeTimers();
		const { f, online } = await montar();
		f.status('SUBSCRIBED');
		await vi.advanceTimersByTimeAsync(0);
		const antes = f.rastreados.length;
		f.sincronizar({ aline: [{ ...ALINE, presence_ref: 'x' }] }); // o servidor não me lista
		await vi.advanceTimersByTimeAsync(VIGIA);
		expect(f.rastreados.length).toBeGreaterThan(antes);
		online.sair();
	});

	it('a vigia refaz a conexão quando o canal cai (duas conferências seguidas)', async () => {
		vi.useFakeTimers();
		const { f, online } = await montar();
		f.status('SUBSCRIBED');
		await vi.advanceTimersByTimeAsync(0);
		f.cair();
		await vi.advanceTimersByTimeAsync(VIGIA);
		expect(f.abertos).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(VIGIA);
		await vi.advanceTimersByTimeAsync(100); // a saída do canal velho
		expect(f.abertos).toHaveLength(2);
		expect(f.vivos()).toHaveLength(1);
		online.sair();
	});

	it('sair e voltar logo em seguida abre um canal novo (e não herda o que está saindo)', async () => {
		const { f, online } = await montar();
		f.status('SUBSCRIBED');
		await new Promise((r) => setTimeout(r, 0));
		online.sair(); // foi para o Meu Perfil
		const volta = await outraVisita(f); // e voltou para o DGathe na hora
		expect(f.vivos()).toHaveLength(1);
		f.status('SUBSCRIBED');
		await new Promise((r) => setTimeout(r, 0));
		expect(volta.estados.at(-1)).toBe('online');
		volta.online.sair();
	});

	it('canal velho que não confirmou a saída é tirado à força antes do novo', async () => {
		vi.useFakeTimers();
		const { f, online } = await montar({}, 'ok', 'timed out');
		f.status('SUBSCRIBED');
		await vi.advanceTimersByTimeAsync(0);
		online.sair();
		const visita = outraVisita(f);
		await vi.advanceTimersByTimeAsync(5_000);
		const volta = await visita;
		expect(f.vivos()).toHaveLength(1);
		f.status('SUBSCRIBED');
		await vi.advanceTimersByTimeAsync(0);
		expect(volta.estados.at(-1)).toBe('online');
		volta.online.sair();
	});

	it('se o canal falha, o estado vira offline', async () => {
		const { f, online, recebido } = await montar();
		f.status('CHANNEL_ERROR');
		expect(recebido.estados.at(-1)).toBe('offline');
		online.andar([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
		expect(f.enviados).toHaveLength(0);
	});
});

describe('o que vem de outro navegador', () => {
	it('foto só de https ou do próprio dspace', () => {
		expect(lerPessoa({ ...ALINE, foto: 'https://x.supabase.co/a.png' })?.foto).toBe('https://x.supabase.co/a.png');
		expect(lerPessoa({ ...ALINE, foto: '/avatares/a.png' })?.foto).toBe('/avatares/a.png');
		expect(lerPessoa({ ...ALINE, foto: '//outro.site/a.png' })?.foto).toBeNull();
		expect(lerPessoa({ ...ALINE, foto: 'javascript:alert(1)' })?.foto).toBeNull();
	});
	it('a aparência vem junto e é conferida', () => {
		const montada = { ...APARENCIA_PADRAO, corpo: 'feminino', cabelo: 'coque', corCabelo: 'ruivo', roupa: 'vestido', corRoupa: '#7d2337' };
		expect(lerPessoa({ ...ALINE, aparencia: montada })?.aparencia).toEqual(montada);
		expect(lerPessoa({ ...ALINE, aparencia: { cabelo: '<script>' } })?.aparencia.cabelo).toBe('curto');
	});
	it('posição fora do mapa, sem id ou cor estranha', () => {
		expect(lerPessoa({ ...ALINE, x: -1 })).toBeNull();
		expect(lerPessoa({ ...ALINE, id: '' })).toBeNull();
		expect(lerPessoa({ ...ALINE, cor: 'red; background:url(x)' })?.cor).toBeNull();
	});
	it('trajeto com ponto inválido ou grande demais', () => {
		expect(lerRota({ id: 'a', pontos: [{ x: 1, y: 1 }, { x: NaN, y: 1 }] })).toBeNull();
		expect(lerRota({ id: 'a', pontos: Array.from({ length: 500 }, () => ({ x: 1, y: 1 })) })).toBeNull();
	});
});
