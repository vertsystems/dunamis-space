import type { PageServerLoad } from './$types';

const MES_RE = /^\d{4}-\d{2}$/;

/** PostgREST tipa relações to-one como array; extrai o objeto único. */
function um<T>(v: T | T[] | null | undefined): T | null {
	if (Array.isArray(v)) return v[0] ?? null;
	return v ?? null;
}

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const mesParam = url.searchParams.get('mes');

	let ano: number;
	let mes: number; // 0-11
	if (mesParam && MES_RE.test(mesParam)) {
		ano = Number(mesParam.slice(0, 4));
		mes = Number(mesParam.slice(5, 7)) - 1;
	} else {
		const now = new Date();
		ano = now.getFullYear();
		mes = now.getMonth();
	}

	// Intervalo do mês com folga de ±1 dia (segurança de fuso horário).
	const DIA = 86_400_000;
	const inicioMs = Date.UTC(ano, mes, 1);
	const fimMs = Date.UTC(ano, mes + 1, 1);
	const gte = new Date(inicioMs - DIA).toISOString();
	const lt = new Date(fimMs + DIA).toISOString();

	const { data, error } = await supabase
		.from('conteudos')
		.select('id, titulo, tipo, status, data_publicacao, cliente:clientes(nome)')
		.gte('data_publicacao', gte)
		.lt('data_publicacao', lt)
		.order('data_publicacao', { ascending: true });

	// Conteúdos sem data agendada (aparecem numa lista à parte).
	const { data: semDataRaw } = await supabase
		.from('conteudos')
		.select('id, titulo, tipo, status, cliente:clientes(nome)')
		.is('data_publicacao', null)
		.order('created_at', { ascending: false })
		.limit(50);

	const conteudos = (data ?? []).map((c) => ({
		id: c.id as string,
		titulo: c.titulo as string | null,
		tipo: c.tipo as string,
		status: c.status as string,
		data_publicacao: c.data_publicacao as string | null,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	const semData = (semDataRaw ?? []).map((c) => ({
		id: c.id as string,
		titulo: c.titulo as string | null,
		tipo: c.tipo as string,
		status: c.status as string,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	const fmtMes = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, '0')}`;
	const prev = mes === 0 ? fmtMes(ano - 1, 11) : fmtMes(ano, mes - 1);
	const next = mes === 11 ? fmtMes(ano + 1, 0) : fmtMes(ano, mes + 1);

	return {
		conteudos,
		semData,
		ano,
		mes,
		prev,
		next,
		loadError: error?.message ?? null
	};
};
