import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUSENTE_APOS, LEITURA, OCIOSO_APOS, PULSO, Presenca, SAIDA_CONFIRMA, lerLinha, manterSinal, marcarAba, type EstadoConexao, type Pessoa } from './presenca';
import { assentoPorId } from './assentos';

const LINHA = {
	id: 'davi',
	nome: 'Davi Penha',
	funcao: 'social_media',
	foto: '/avatares/d.png',
	cor: '#3b6ef6',
	aparencia: null,
	x: 26.5,
	y: 20.5,
	dir_x: 0,
	dir_y: 1,
	mov: 1_700_000_000_000,
	sem_sinal: 3,
	saiu_ha: null,
	inativo: false,
	assento: null
};

/** Um Supabase de mentira, só com o rpc que o DGathe usa. */
function supabaseFalso() {
	const chamadas: { nome: string; args?: Record<string, unknown> }[] = [];
	let linhas: unknown[] = [LINHA];
	let falhar = false;
	const supabase = {
		rpc: async (nome: string, args?: Record<string, unknown>) => {
			chamadas.push({ nome, args });
			if (falhar) return { data: null, error: { message: 'rede caiu' } };
			return { data: nome === 'dgathe_quem' ? linhas : null, error: null };
		}
	} as unknown as SupabaseClient;
	return {
		supabase,
		chamadas,
		definir: (l: unknown[]) => (linhas = l),
		falhar: (f: boolean) => (falhar = f)
	};
}

function montar() {
	const f = supabaseFalso();
	const recebido = { pessoas: [] as Pessoa[][], estados: [] as EstadoConexao[] };
	const p = new Presenca(f.supabase, 'bruno', {
		pessoas: (l) => recebido.pessoas.push(l),
		estado: (e) => recebido.estados.push(e)
	});
	return { f, p, recebido };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('a linha de quem está', () => {
	it('lê nome, cargo, lugar e carimbo', () => {
		expect(lerLinha(LINHA)).toMatchObject({ id: 'davi', nome: 'Davi Penha', cargo: 'SM', x: 26.5, y: 20.5, mov: 1_700_000_000_000, situacao: 'online' });
	});

	it('sem sinal há mais de 75 s: offline (vai para a recepção)', () => {
		expect(lerLinha({ ...LINHA, sem_sinal: AUSENTE_APOS - 1 })?.situacao).toBe('online');
		expect(lerLinha({ ...LINHA, sem_sinal: AUSENTE_APOS + 1 })?.situacao).toBe('offline');
	});

	it('se despediu: offline só depois de 5 s (recarregar a página não é sair)', () => {
		expect(lerLinha({ ...LINHA, saiu_ha: SAIDA_CONFIRMA - 1 })?.situacao).toBe('online');
		expect(lerLinha({ ...LINHA, saiu_ha: SAIDA_CONFIRMA + 1 })?.situacao).toBe('offline');
	});

	it('15 min sem mexer: inativo, com o assento; offline vence inativo', () => {
		expect(lerLinha({ ...LINHA, inativo: true, assento: 'copa:i120' })).toMatchObject({ situacao: 'inativo', assento: 'copa:i120' });
		expect(lerLinha({ ...LINHA, inativo: true, sem_sinal: AUSENTE_APOS + 1 })?.situacao).toBe('offline');
		expect(lerLinha({ ...LINHA, assento: 'x; drop' })?.assento).toBeNull();
	});

	it('descarta lixo e foto de outro site', () => {
		expect(lerLinha({ ...LINHA, x: 999 })).toBeNull();
		expect(lerLinha({ ...LINHA, id: '' })).toBeNull();
		expect(lerLinha({ ...LINHA, foto: '//outro.site/a.png' })?.foto).toBeNull();
		expect(lerLinha({ ...LINHA, cor: 'red; x' })?.cor).toBeNull();
	});
});

describe('Presenca (o DGathe aberto)', () => {
	it('ao abrir, grava onde o meu boneco está e lê todo mundo (sem mim)', async () => {
		const { f, p, recebido } = montar();
		f.definir([LINHA, { ...LINHA, id: 'bruno', nome: 'Bruno Santana' }]);
		p.iniciar({ x: 20.5, y: 22.2, dirX: 1, dirY: 1 });
		await vi.waitFor(() => expect(recebido.estados.at(-1)).toBe('online'));
		expect(f.chamadas[0]).toMatchObject({ nome: 'dgathe_pulso', args: { p_x: 20.5, p_y: 22.2 } });
		expect(f.chamadas[1].nome).toBe('dgathe_quem');
		expect(recebido.pessoas.at(-1)?.map((x) => x.id)).toEqual(['davi']);
		p.parar();
	});

	it('lê de novo a cada 3 segundos', async () => {
		vi.useFakeTimers();
		const { f, p } = montar();
		p.iniciar({ x: 20.5, y: 22.2, dirX: 1, dirY: 1 });
		await vi.advanceTimersByTimeAsync(0);
		const antes = f.chamadas.filter((c) => c.nome === 'dgathe_quem').length;
		await vi.advanceTimersByTimeAsync(LEITURA * 3);
		expect(f.chamadas.filter((c) => c.nome === 'dgathe_quem').length).toBe(antes + 3);
		p.parar();
		await vi.advanceTimersByTimeAsync(LEITURA * 3);
		expect(f.chamadas.filter((c) => c.nome === 'dgathe_quem').length).toBe(antes + 3);
	});

	it('o destino vai no primeiro passo, com carimbo novo; ao parar, o mesmo carimbo', async () => {
		const { f, p } = montar();
		p.iniciar({ x: 20.5, y: 22.2, dirX: 1, dirY: 1 });
		await vi.waitFor(() => expect(f.chamadas.length).toBeGreaterThan(1));
		const inicial = f.chamadas[0].args!.p_mov as number;
		p.andar({ x: 30, y: 10 }, 1, 0);
		const destino = f.chamadas.at(-1)!;
		expect(destino).toMatchObject({ nome: 'dgathe_pulso', args: { p_x: 30, p_y: 10, p_dir_x: 1, p_dir_y: 0, p_assento: null } });
		expect(destino.args!.p_mov as number).toBeGreaterThan(inicial);
		p.parou(30, 10, 1, 0);
		expect(f.chamadas.at(-1)!.args!.p_mov).toBe(destino.args!.p_mov);
		p.parar();
	});

	it('uma falha de rede solta não muda nada; duas seguidas, o ponto fica cinza; e volta sozinho', async () => {
		vi.useFakeTimers();
		const { f, p, recebido } = montar();
		p.iniciar({ x: 20.5, y: 22.2, dirX: 1, dirY: 1 });
		await vi.advanceTimersByTimeAsync(0);
		expect(recebido.estados.at(-1)).toBe('online');
		f.falhar(true);
		const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await vi.advanceTimersByTimeAsync(LEITURA);
		expect(recebido.estados.at(-1)).toBe('online');
		await vi.advanceTimersByTimeAsync(LEITURA);
		expect(recebido.estados.at(-1)).toBe('offline');
		f.falhar(false);
		await vi.advanceTimersByTimeAsync(LEITURA);
		expect(recebido.estados.at(-1)).toBe('online');
		aviso.mockRestore();
		p.parar();
	});

	it('posição que não chegou ao banco vai de novo na leitura seguinte', async () => {
		vi.useFakeTimers();
		const { f, p } = montar();
		p.iniciar({ x: 20.5, y: 22.2, dirX: 1, dirY: 1 });
		await vi.advanceTimersByTimeAsync(0);
		f.falhar(true);
		p.andar({ x: 30, y: 10 }, 1, 0);
		await vi.advanceTimersByTimeAsync(0);
		f.falhar(false);
		await vi.advanceTimersByTimeAsync(LEITURA);
		const pulsos = f.chamadas.filter((c) => c.nome === 'dgathe_pulso' && c.args?.p_x === 30);
		expect(pulsos.length).toBe(2);
		p.parar();
	});
});

describe('abas do dspace abertas neste navegador', () => {
	it('conta as outras abas vivas e esquece as velhas', () => {
		const guardado = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => guardado.get(k) ?? null,
			setItem: (k: string, v: string) => guardado.set(k, v)
		});
		const t = 1_000_000;
		expect(marcarAba('a', true, t)).toBe(0);
		expect(marcarAba('b', true, t + 1_000)).toBe(1);
		// 'a' fechou: sobra 'b'
		expect(marcarAba('a', false, t + 2_000)).toBe(1);
		// muito tempo depois, 'b' não deu mais sinal: não conta
		expect(marcarAba('c', true, t + 200_000)).toBe(0);
		vi.unstubAllGlobals();
	});
});

describe('a vigia dos 15 minutos sem mexer (layout)', () => {
	function ambiente() {
		const guardado = new Map<string, string>();
		const janela = new EventTarget();
		const doc = Object.assign(new EventTarget(), { hidden: false });
		vi.stubGlobal('window', janela);
		vi.stubGlobal('document', doc);
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => guardado.get(k) ?? null,
			setItem: (k: string, v: string) => guardado.set(k, v),
			removeItem: (k: string) => guardado.delete(k)
		});
		vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
		const chamadas: { nome: string; args?: Record<string, unknown> }[] = [];
		const supabase = {
			auth: { getSession: async () => ({ data: { session: { access_token: 'tk' } } }) },
			rpc: async (nome: string, args?: Record<string, unknown>) => {
				chamadas.push({ nome, args });
				return { data: nome === 'dgathe_quem' ? [] : null, error: null };
			}
		} as unknown as SupabaseClient;
		return { janela, chamadas, supabase };
	}

	afterEach(() => vi.unstubAllGlobals());

	it('sem o DGathe aberto: o layout grava o lugar (CEO na cadeira do CEO) e, ao mexer, levanta', async () => {
		vi.useFakeTimers();
		const { janela, chamadas, supabase } = ambiente();
		const parar = manterSinal(supabase, { url: 'https://x', chave: 'k' }, { id: 'bruno', ceo: true });
		await vi.advanceTimersByTimeAsync(0);
		expect(chamadas[0]).toMatchObject({ nome: 'dgathe_pulso', args: { p_inativo: false } });
		await vi.advanceTimersByTimeAsync(OCIOSO_APOS + PULSO);
		const sentou = chamadas.find((c) => c.args?.p_inativo === true)!;
		const a = assentoPorId(sentou.args!.p_assento as string)!;
		expect(a.sala).toBe('diretoria');
		expect(a.nome).toBe('Cadeira do CEO');
		expect(sentou.args).toMatchObject({ p_x: a.x, p_y: a.y });
		const antes = chamadas.length;
		janela.dispatchEvent(new Event('pointerdown'));
		await vi.advanceTimersByTimeAsync(0);
		const levantou = chamadas.slice(antes).find((c) => c.args?.p_inativo === false)!;
		expect(levantou.args).toMatchObject({ p_x: a.x, p_y: a.y });
		expect(levantou.args!.p_assento).toBeUndefined();
		parar();
	});

	it('com o DGathe aberto nesta aba: ele cuida do boneco, e o layout só marca inativo', async () => {
		vi.useFakeTimers();
		const { janela, chamadas, supabase } = ambiente();
		const recebidos: string[] = [];
		janela.addEventListener('dgathe:inativo', (e) => {
			recebidos.push((e as CustomEvent).detail.assento);
			e.preventDefault();
		});
		const parar = manterSinal(supabase, { url: 'https://x', chave: 'k' }, { id: 'davi', ceo: false });
		await vi.advanceTimersByTimeAsync(OCIOSO_APOS + PULSO);
		expect(recebidos).toHaveLength(1);
		const a = assentoPorId(recebidos[0])!;
		expect(a.sala).not.toBe('diretoria');
		const marcou = chamadas.find((c) => c.args?.p_inativo === true)!;
		expect(marcou.args).toEqual({ p_inativo: true });
		parar();
	});

	it('mexendo sempre, nunca fica inativo', async () => {
		vi.useFakeTimers();
		const { janela, chamadas, supabase } = ambiente();
		const parar = manterSinal(supabase, { url: 'https://x', chave: 'k' }, { id: 'davi', ceo: false });
		for (let i = 0; i < 40; i++) {
			await vi.advanceTimersByTimeAsync(60_000);
			janela.dispatchEvent(new Event('keydown'));
		}
		expect(chamadas.some((c) => c.args?.p_inativo === true)).toBe(false);
		parar();
	});
});
