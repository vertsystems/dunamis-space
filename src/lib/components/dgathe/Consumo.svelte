<script lang="ts">
	// O medidor do consumo do Claude no topo do DGathe (pedido do Bruno em
	// 10/11/2026): janela de 5 h, quanto falta para zerar, a semana e os limites
	// por modelo (Fable). Quem lê o consumo é a ponte do Mac, a cada minuto
	// (ponte/uso.mjs); aqui só se lê o banco (dgathe_uso, só ceo/admin).
	import { onMount } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { Gauge } from '@lucide/svelte';
	import { faltaPara, nivelDoUso, type JanelaDoModelo, type UsoDoPlano } from '$lib/dgathe/uso';

	let { supabase }: { supabase: SupabaseClient } = $props();

	type Leitura = UsoDoPlano & { lidoHa: number };
	let uso = $state<Leitura | null>(null);
	let aberto = $state(false);
	let agora = $state(Date.now());
	let raiz: HTMLDivElement | undefined = $state();

	const PLANOS: Record<string, string> = { max: 'Max', pro: 'Pro', team: 'Team', enterprise: 'Enterprise' };

	async function ler() {
		const { data, error } = await supabase.rpc('dgathe_uso');
		if (error || !data || typeof data !== 'object') return;
		const d = data as Record<string, unknown>;
		const janela = (pct: unknown, zera: unknown) => (typeof pct === 'number' ? { pct, zera: typeof zera === 'string' ? zera : null } : null);
		uso = {
			plano: typeof d.plano === 'string' ? d.plano : null,
			sessao: janela(d.sessao_pct, d.sessao_zera),
			semanal: janela(d.semanal_pct, d.semanal_zera),
			modelos: Array.isArray(d.modelos) ? (d.modelos as JanelaDoModelo[]).filter((m) => typeof m?.nome === 'string' && typeof m?.pct === 'number') : [],
			lidoHa: typeof d.lido_ha === 'number' ? d.lido_ha : 0
		};
	}

	onMount(() => {
		void ler();
		const leitura = setInterval(() => void ler(), 30_000);
		const relogio = setInterval(() => (agora = Date.now()), 15_000);
		const fora = (e: PointerEvent) => {
			if (aberto && raiz && !raiz.contains(e.target as Node)) aberto = false;
		};
		document.addEventListener('pointerdown', fora);
		return () => {
			clearInterval(leitura);
			clearInterval(relogio);
			document.removeEventListener('pointerdown', fora);
		};
	});

	/** A janela que mais aperta decide a cor do botão. */
	const pior = $derived(Math.max(uso?.sessao?.pct ?? 0, uso?.semanal?.pct ?? 0, ...(uso?.modelos.map((m) => m.pct) ?? [0])));
	const velho = $derived((uso?.lidoHa ?? 0) > 300);
	const linhas = $derived.by(() => {
		if (!uso) return [];
		const r: { rotulo: string; pct: number; zera: string | null }[] = [];
		if (uso.sessao) r.push({ rotulo: 'Janela de 5 horas', ...uso.sessao });
		if (uso.semanal) r.push({ rotulo: 'Semana, todos os modelos', ...uso.semanal });
		for (const m of uso.modelos) r.push({ rotulo: `Semana, ${m.nome}`, pct: m.pct, zera: m.zera });
		return r;
	});
	const quando = (zera: string | null) =>
		zera ? new Date(zera).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '') : '';
</script>

{#if uso}
	<div class="cs" bind:this={raiz}>
		<button
			type="button"
			class="cs-botao {nivelDoUso(pior)}"
			class:velho
			onclick={() => (aberto = !aberto)}
			aria-expanded={aberto}
			title="Consumo do Claude: janela de 5 h {uso.sessao?.pct ?? '?'}%, semana {uso.semanal?.pct ?? '?'}%"
		>
			<Gauge size={14} /><b>{uso.sessao?.pct ?? '–'}%</b><em>Claude</em>
		</button>
		{#if aberto}
			<div class="cs-caixa" role="dialog" aria-label="Consumo do Claude">
				<header>
					<strong>Consumo do Claude</strong>
					<small>Plano {PLANOS[uso.plano ?? ''] ?? uso.plano ?? '?'}</small>
				</header>
				{#each linhas as l (l.rotulo)}
					<div class="cs-linha">
						<div class="cs-topo"><span>{l.rotulo}</span><b class={nivelDoUso(l.pct)}>{Math.round(l.pct)}%</b></div>
						<div class="cs-barra"><i class={nivelDoUso(l.pct)} style="width: {Math.min(100, l.pct)}%"></i></div>
						{#if l.zera}<small>Zera em {faltaPara(l.zera, agora)} · {quando(l.zera)}</small>{/if}
					</div>
				{/each}
				<p class="cs-rodape" class:velho>
					{velho ? `Sem leitura nova há ${Math.round((uso.lidoHa ?? 0) / 60)} min: a ponte do Mac está desligada?` : 'Lido pela ponte do Mac a cada minuto, sem gastar do limite.'}
				</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.cs {
		position: relative;
		flex-shrink: 0;
	}
	.cs-botao {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.22rem 0.55rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--dg-borda);
		font-size: 12px;
		white-space: nowrap;
		color: var(--dg-suave);
	}
	.cs-botao b {
		font-variant-numeric: tabular-nums;
		color: #6ee7b7;
	}
	.cs-botao.atencao b {
		color: #fcd34d;
	}
	.cs-botao.critico {
		border-color: rgba(239, 68, 68, 0.6);
	}
	.cs-botao.critico b {
		color: #fca5a5;
	}
	.cs-botao.velho {
		opacity: 0.6;
	}
	.cs-botao em {
		font-style: normal;
	}
	.cs-caixa {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 5;
		width: 280px;
		padding: 0.8rem;
		border-radius: 14px;
		background: rgba(12, 18, 31, 0.96);
		border: 1px solid var(--dg-borda);
		box-shadow: 0 16px 34px -14px rgba(0, 0, 0, 0.7);
		color: var(--dg-texto);
		user-select: text;
		-webkit-user-select: text;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.55rem;
	}
	header strong {
		font-size: 0.85rem;
	}
	header small {
		color: var(--dg-suave);
		font-size: 0.7rem;
	}
	.cs-linha + .cs-linha {
		margin-top: 0.6rem;
	}
	.cs-topo {
		display: flex;
		justify-content: space-between;
		font-size: 0.76rem;
	}
	.cs-topo b {
		font-variant-numeric: tabular-nums;
	}
	b.ok {
		color: #6ee7b7;
	}
	b.atencao {
		color: #fcd34d;
	}
	b.critico {
		color: #fca5a5;
	}
	.cs-barra {
		height: 6px;
		margin: 0.3rem 0 0.2rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.cs-barra i {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: #34d399;
	}
	.cs-barra i.atencao {
		background: #f5a524;
	}
	.cs-barra i.critico {
		background: #ef4444;
	}
	.cs-linha small {
		color: var(--dg-suave);
		font-size: 0.68rem;
	}
	.cs-rodape {
		margin: 0.7rem 0 0;
		font-size: 0.66rem;
		color: var(--dg-suave);
		line-height: 1.4;
	}
	.cs-rodape.velho {
		color: #fcd34d;
	}
	button:focus-visible {
		outline: 2px solid #c4b5fd;
		outline-offset: 2px;
	}
</style>
