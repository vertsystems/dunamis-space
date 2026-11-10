// O consumo do plano do Claude (a conta do Mac da ponte), para o medidor do DGathe.
//
// Pedido do Bruno (10/11/2026): um ícone no topo do jogo para ver, em tempo
// real, como está o limite: a janela de 5 horas, quanto falta para zerar, o
// semanal e o do Fable.
//
// De onde vem: o próprio Claude Code responde ao pedido `get_usage` do
// protocolo de controle (o mesmo da ponte), sem chamar o modelo, então não
// gasta nada do limite. A ponte pergunta a cada minuto e grava no banco.
//
// Roda também direto no Node da ponte (sem build): sem import e só TypeScript
// que o Node sabe apagar.

export type Janela = { pct: number; zera: string | null };
export type JanelaDoModelo = Janela & { nome: string };

export type UsoDoPlano = {
	/** 'max', 'pro', 'team'… ou null (chave de API, sem plano). */
	plano: string | null;
	/** A janela de 5 horas. */
	sessao: Janela | null;
	/** A semana, todos os modelos. */
	semanal: Janela | null;
	/** A semana de cada modelo que tem limite próprio (ex.: Fable). */
	modelos: JanelaDoModelo[];
};

function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function data(v: unknown): string | null {
	if (typeof v === 'number' && Number.isFinite(v)) return new Date(v * 1000).toISOString();
	if (typeof v !== 'string' || !v) return null;
	const t = Date.parse(v);
	return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function janela(v: unknown): Janela | null {
	if (!v || typeof v !== 'object') return null;
	const o = v as Record<string, unknown>;
	const pct = num(o.utilization) ?? num(o.percent);
	return pct === null ? null : { pct: Math.max(0, Math.min(100, pct)), zera: data(o.resets_at) };
}

/**
 * Lê a resposta do get_usage (o objeto `response` do control_response).
 * Devolve null quando a conta não tem limite de plano (chave de API).
 */
export function lerUso(resposta: unknown): UsoDoPlano | null {
	if (!resposta || typeof resposta !== 'object') return null;
	const r = resposta as Record<string, unknown>;
	if (r.rate_limits_available === false) return null;
	const rl = r.rate_limits && typeof r.rate_limits === 'object' ? (r.rate_limits as Record<string, unknown>) : null;
	if (!rl) return null;
	const modelos: JanelaDoModelo[] = [];
	// Preferência: model_scoped (já filtrado pelo Claude Code); senão, limits[] semanais por modelo
	if (Array.isArray(rl.model_scoped)) {
		for (const m of rl.model_scoped as Record<string, unknown>[]) {
			const nome = typeof m?.display_name === 'string' ? m.display_name : null;
			const pct = num(m?.utilization);
			if (nome && pct !== null) modelos.push({ nome, pct: Math.max(0, Math.min(100, pct)), zera: data(m.resets_at) });
		}
	}
	if (!modelos.length && Array.isArray(rl.limits)) {
		for (const l of rl.limits as Record<string, unknown>[]) {
			if (l?.kind !== 'weekly_scoped') continue;
			const escopo = l.scope as { model?: { display_name?: unknown } } | null;
			const nome = typeof escopo?.model?.display_name === 'string' ? escopo.model.display_name : null;
			const pct = num(l.percent);
			if (nome && pct !== null) modelos.push({ nome, pct: Math.max(0, Math.min(100, pct)), zera: data(l.resets_at) });
		}
	}
	return {
		plano: typeof r.subscription_type === 'string' ? r.subscription_type : null,
		sessao: janela(rl.five_hour),
		semanal: janela(rl.seven_day),
		modelos
	};
}

/** Quanto falta para zerar, curto: "2 h 05 min", "34 min", "3 dias". */
export function faltaPara(zera: string | null, agoraMs: number): string {
	if (!zera) return '';
	const s = Math.max(0, Math.round((Date.parse(zera) - agoraMs) / 1000));
	const m = Math.floor(s / 60);
	if (m < 1) return 'menos de 1 min';
	if (m < 60) return `${m} min`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} h ${String(m % 60).padStart(2, '0')} min`;
	const d = Math.floor(h / 24);
	const hr = h % 24;
	return hr ? `${d} dia${d > 1 ? 's' : ''} e ${hr} h` : `${d} dia${d > 1 ? 's' : ''}`;
}

/** Cor do medidor: verde até 60%, amarelo até 85%, vermelho acima. */
export function nivelDoUso(pct: number): 'ok' | 'atencao' | 'critico' {
	return pct >= 85 ? 'critico' : pct >= 60 ? 'atencao' : 'ok';
}
