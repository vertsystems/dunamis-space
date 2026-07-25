// Cálculo de datas com fuso fixo de São Paulo.
//
// Por que existe: `new Date().toISOString().slice(0, 10)` formata em UTC. No
// navegador isso já erra depois das 21h (BRT = UTC-3) e no servidor da Vercel
// erra SEMPRE, porque lá o relógio é UTC. Os sintomas eram reais: transação
// lançada à noite caía no dia seguinte, e a meta do CRM definida no fim do mês
// era gravada no mês seguinte e sumia da tela.
//
// Toda conta de "hoje"/"mês atual" deve passar por aqui — não usar `toISOString`
// nem `getMonth()` direto sobre `new Date()`.

const FUSO = 'America/Sao_Paulo';

/** Data de hoje em São Paulo, no formato YYYY-MM-DD. */
export function hojeISO(agora: Date = new Date()): string {
	// 'en-CA' formata como YYYY-MM-DD, que é o que o Postgres espera.
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: FUSO,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(agora);
}

/** Ano e mês correntes em São Paulo (mes 1-12). */
export function mesRefSP(agora: Date = new Date()): { ano: number; mes: number } {
	const [ano, mes] = hojeISO(agora).split('-');
	return { ano: Number(ano), mes: Number(mes) };
}

/** Primeiro e último dia do mês corrente em São Paulo (YYYY-MM-DD). */
export function intervaloMesSP(agora: Date = new Date()): { inicio: string; fim: string } {
	const { ano, mes } = mesRefSP(agora);
	const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
	const mm = String(mes).padStart(2, '0');
	return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimo).padStart(2, '0')}` };
}
