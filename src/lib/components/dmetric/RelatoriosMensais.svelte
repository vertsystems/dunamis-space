<script lang="ts">
	// O relatório do mês pelo WhatsApp: todo dia 1º o DMetric prepara a mensagem de
	// cada cliente que recebe resumo (o link do cliente com "Resumo do mês" ligado).
	// Aqui alguém revisa o texto e manda — o botão abre a conversa no WhatsApp com a
	// mensagem pronta e marca como enviada. O app não manda nada sozinho.
	import { enhance } from '$app/forms';
	import { Card } from '$lib/components/ui';
	import { dataBr, nomeDoSite, rotuloMes, type DMetricSite } from '$lib/dmetric/painel';
	import { linkDaMensagem } from '$lib/dmetric/portal';
	import { emBrasilia } from '$lib/dmetric/recorte';
	import { toast } from '$lib/toast.svelte';
	import { CalendarClock, MessageCircle, RotateCcw, Send, X } from '@lucide/svelte';

	type Relatorio = {
		id: string;
		mes: string;
		mensagem: string;
		status: 'pendente' | 'enviado' | 'ignorado';
		enviado_em: string | null;
		portal: { id: string; contato: string | null; whatsapp: string | null; site_id: string } | null;
	};

	let {
		relatorios,
		recebem,
		sites,
		mesPadrao,
		podeEditar
	}: {
		relatorios: Relatorio[];
		/** Quantos links de cliente estão com o resumo do mês ligado (e com WhatsApp). */
		recebem: number;
		sites: DMetricSite[];
		/** O mês que o dia 1º prepara (o que acabou): "2026-10". */
		mesPadrao: string;
		podeEditar: boolean;
	} = $props();

	const porId = $derived(new Map(sites.map((s) => [s.id, s])));
	const meses = $derived([...new Set([mesPadrao, ...relatorios.map((r) => r.mes.slice(0, 7))])].sort().reverse());
	let mes = $state('');
	const mesAtivo = $derived(mes || mesPadrao);
	const doMes = $derived(relatorios.filter((r) => r.mes.slice(0, 7) === mesAtivo));
	const pendentes = $derived(doMes.filter((r) => r.status === 'pendente').length);
	// O texto de cada mensagem, como está na caixa (quem revisa pode mudar).
	let textos = $state<Record<string, string>>({});
	const texto = (r: Relatorio) => textos[r.id] ?? r.mensagem;
	let ocupado = $state<string | null>(null);

	function quando(iso: string): string {
		const b = emBrasilia(new Date(iso));
		const min = Math.floor(b.hora * 60);
		return `${dataBr(b.dia).slice(0, 5)} às ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
	}
	const whats = (w: string | null) => (w ? `(${w.slice(2, 4)}) ${w.slice(4, w.length - 4)}-${w.slice(-4)}` : 'sem WhatsApp');
	const PILULA = {
		pendente: 'bg-[#fff4e5] text-[#9a6b16]',
		enviado: 'bg-[#e7f6ee] text-[#107d4a]',
		ignorado: 'bg-bg text-grey'
	} as const;
	const ROTULO = { pendente: 'para revisar', enviado: 'enviado', ignorado: 'não vai' } as const;
</script>

<Card>
	<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="flex items-center gap-1.5 text-base font-bold text-navy"><MessageCircle size={17} /> Relatório do mês pelo WhatsApp</h2>
			<p class="mt-0.5 max-w-2xl text-[11px] leading-snug text-grey">
				Todo dia 1º o DMetric prepara o resumo do mês de cada cliente que recebe relatório, com o link do portal dele. Revise o texto e
				mande: o botão abre a conversa no WhatsApp com a mensagem pronta.
				{recebem ? `${recebem} ${recebem === 1 ? 'cliente recebe' : 'clientes recebem'}.` : ''}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<select
				aria-label="Mês do relatório"
				value={mesAtivo}
				onchange={(e) => (mes = e.currentTarget.value)}
				class="h-8 rounded-[var(--radius-sm)] border border-grey-200 bg-surface px-2 text-xs font-medium text-navy"
			>
				{#each meses as m (m)}<option value={m}>{rotuloMes(m)}</option>{/each}
			</select>
			{#if podeEditar}
				<form
					method="POST"
					action="?/prepararRelatorios"
					use:enhance={() => {
						ocupado = 'preparar';
						return async ({ result, update }) => {
							await update({ reset: false });
							ocupado = null;
							if (result.type === 'success') {
								const n = (result.data as { novas?: number } | undefined)?.novas ?? 0;
								toast.success(n ? `${n} ${n === 1 ? 'mensagem nova' : 'mensagens novas'}.` : 'Nenhuma mensagem nova: as do mês já estavam aqui.');
							} else toast.error('Não deu para preparar agora.');
						};
					}}
				>
					<input type="hidden" name="mes" value={mesAtivo} />
					<button type="submit" disabled={ocupado === 'preparar'} class="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-navy px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
						<CalendarClock size={14} /> {ocupado === 'preparar' ? 'Preparando…' : `Preparar ${rotuloMes(mesAtivo).replace(/ de \d{4}$/, '')}`}
					</button>
				</form>
			{/if}
		</div>
	</div>

	{#if !doMes.length}
		<p class="rounded-[var(--radius)] border border-dashed border-grey-200 px-4 py-6 text-center text-xs text-grey">
			{recebem
				? `Nada preparado para ${rotuloMes(mesAtivo)} ainda. O DMetric prepara no dia 1º — ou use o botão "Preparar". Cliente sem visita no mês fica sem mensagem.`
				: 'Nenhum cliente recebe o resumo do mês ainda. Ligue em "Compartilhar com o cliente", na página do site dele.'}
		</p>
	{:else}
		<p class="mb-3 text-xs text-slate">{pendentes ? `${pendentes} para revisar e mandar` : 'Tudo resolvido neste mês.'}</p>
		<ul class="space-y-3">
			{#each doMes as r (r.id)}
				{@const site = r.portal ? porId.get(r.portal.site_id) : undefined}
				{@const numero = r.portal?.whatsapp ?? null}
				<li class="rounded-[var(--radius)] border border-grey-200 p-3">
					<div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
						<span class="text-sm font-semibold text-navy">{site ? nomeDoSite(site) : 'Site removido'}</span>
						<span class="text-xs text-slate">{r.portal?.contato ?? ''} · {whats(numero)}</span>
						<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {PILULA[r.status]}">{ROTULO[r.status]}</span>
						{#if r.status === 'enviado' && r.enviado_em}<span class="text-[11px] text-grey">em {quando(r.enviado_em)}</span>{/if}
					</div>
					<textarea
						aria-label="Mensagem para {site ? nomeDoSite(site) : 'o cliente'}"
						rows={Math.min(18, texto(r).split('\n').length + 1)}
						readonly={r.status !== 'pendente' || !podeEditar}
						value={texto(r)}
						oninput={(e) => (textos[r.id] = e.currentTarget.value)}
						class="w-full resize-y rounded-[var(--radius-sm)] border border-grey-200 bg-surface p-2.5 font-[inherit] text-xs leading-relaxed text-navy-900 read-only:bg-bg/60 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
					></textarea>
					{#if podeEditar}
						<div class="mt-2 flex flex-wrap items-center gap-2">
							{#if r.status === 'pendente'}
								<form
									method="POST"
									action="?/enviarRelatorio"
									use:enhance={() => {
										// Abre a conversa já no clique (o navegador só deixa abrir janela nele).
										if (numero) window.open(linkDaMensagem(numero, texto(r)), '_blank', 'noopener');
										ocupado = r.id;
										return async ({ update }) => {
											await update({ reset: false });
											ocupado = null;
										};
									}}
								>
									<input type="hidden" name="id" value={r.id} />
									<input type="hidden" name="mensagem" value={texto(r)} />
									<button type="submit" disabled={!numero || ocupado === r.id} class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
										<Send size={13} /> Abrir no WhatsApp e marcar como enviado
									</button>
								</form>
								<form method="POST" action="?/statusRelatorio" use:enhance>
									<input type="hidden" name="id" value={r.id} />
									<input type="hidden" name="status" value="ignorado" />
									<button type="submit" class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium text-grey hover:text-navy">
										<X size={13} /> Este mês não vai
									</button>
								</form>
							{:else}
								{#if r.status === 'enviado' && numero}
									<a href={linkDaMensagem(numero, r.mensagem)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-grey-200 px-3 py-1.5 text-xs font-medium text-navy hover:border-grey">
										<MessageCircle size={13} /> Abrir de novo no WhatsApp
									</a>
								{/if}
								<form method="POST" action="?/statusRelatorio" use:enhance>
									<input type="hidden" name="id" value={r.id} />
									<input type="hidden" name="status" value="pendente" />
									<button type="submit" class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium text-grey hover:text-navy">
										<RotateCcw size={13} /> Voltar para revisar
									</button>
								</form>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Card>
