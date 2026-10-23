<script lang="ts">
	// Compartilhar com o cliente: o link do portal (/relatorio/<token>, sem login),
	// com senha opcional, período travado ou livre, liga e desliga, e o relatório
	// mensal pelo WhatsApp. Cada formulário é uma ação da página do site.
	import { enhance } from '$app/forms';
	import { Card } from '$lib/components/ui';
	import { haQuanto, numero } from '$lib/dmetric/painel';
	import { PERIODOS_PORTAL, linkDoPortal, type Portal } from '$lib/dmetric/portal';
	import { toast } from '$lib/toast.svelte';
	import { Check, Copy, ExternalLink, Link2, Lock, Share2, Trash2 } from '@lucide/svelte';

	let { portais, podeEditar, origem }: { portais: Portal[]; podeEditar: boolean; origem: string } = $props();

	let ocupado = $state<string | null>(null);
	let copiado = $state<string | null>(null);
	const aoEnviar = (id: string, msg?: string) => () => {
		ocupado = id;
		return async ({ result, update }: { result: { type: string }; update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			ocupado = null;
			if (result.type === 'success' && msg) toast.success(msg);
			else if (result.type === 'failure' || result.type === 'error') toast.error('Não deu para salvar. Tente de novo.');
		};
	};
	async function copiar(p: Portal) {
		try {
			await navigator.clipboard.writeText(linkDoPortal(origem, p.token));
			copiado = p.id;
			setTimeout(() => (copiado = null), 1800);
		} catch {
			toast.error('Copie o link à mão: o navegador bloqueou a cópia.');
		}
	}
	const formatarWhats = (w: string | null) => (w ? `(${w.slice(2, 4)}) ${w.slice(4, w.length - 4)}-${w.slice(-4)}` : '');
	const campo =
		'h-8 w-full rounded-[var(--radius-sm)] border border-grey-200 bg-surface px-2.5 text-xs text-navy-900 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<Card class="mb-5">
	<details open={portais.length > 0}>
		<summary class="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
			<span>
				<span class="flex items-center gap-1.5 text-base font-bold text-navy"><Share2 size={17} /> Compartilhar com o cliente</span>
				<span class="mt-0.5 block text-[11px] text-grey">
					Um link sem login, com a marca da Dunamis, para o cliente ver estes números. Pode ter senha, travar o período e mandar o resumo do mês pelo WhatsApp.
				</span>
			</span>
			<span class="shrink-0 rounded-full bg-bg px-2.5 py-1 text-[11px] font-semibold text-slate">
				{portais.length ? `${portais.length} ${portais.length === 1 ? 'link' : 'links'}` : 'nenhum link'}
			</span>
		</summary>

		<div class="mt-4 space-y-4">
			{#each portais as p (p.id)}
				{@const link = linkDoPortal(origem, p.token)}
				<div class="rounded-[var(--radius)] border border-grey-200 p-3 {p.ativo ? '' : 'bg-bg/60'}">
					<div class="flex flex-wrap items-center gap-2">
						<Link2 size={14} class="shrink-0 text-grey" />
						<code class="min-w-0 flex-1 truncate text-xs text-navy-900" title={link}>{link}</code>
						<button type="button" onclick={() => copiar(p)} class="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/20">
							{#if copiado === p.id}<Check size={12} /> Copiado{:else}<Copy size={12} /> Copiar{/if}
						</button>
						<a href={link} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-grey hover:text-navy">
							<ExternalLink size={12} /> Abrir
						</a>
					</div>
					<p class="mt-1 text-[11px] text-grey">
						{p.ativo ? 'Ligado' : 'Desligado — quem abrir vê "este link não existe"'}
						· {p.com_senha ? 'com senha' : 'sem senha'}
						· {numero(p.acessos)} {p.acessos === 1 ? 'acesso' : 'acessos'}{p.ultimo_acesso ? `, o último ${haQuanto(p.ultimo_acesso)}` : ''}
					</p>

					{#if podeEditar}
						<form method="POST" action="?/salvarPortal" use:enhance={aoEnviar(p.id, 'Link salvo.')} class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<input type="hidden" name="id" value={p.id} />
							<label class="text-[11px] font-medium text-slate">
								Período que o cliente vê
								<select name="periodo" value={p.periodo} class="{campo} mt-1">
									{#each PERIODOS_PORTAL as o (o.id)}<option value={o.id}>{o.rotulo}</option>{/each}
								</select>
							</label>
							<label class="text-[11px] font-medium text-slate">
								Nome de quem recebe (para a saudação)
								<input name="contato" value={p.contato ?? ''} maxlength="60" placeholder="Ex.: Mariana" class="{campo} mt-1" />
							</label>
							<label class="text-[11px] font-medium text-slate">
								WhatsApp do cliente
								<input name="whatsapp" value={formatarWhats(p.whatsapp)} inputmode="tel" placeholder="(13) 99999-9999" class="{campo} mt-1" />
							</label>
							<div class="flex flex-col justify-end gap-1.5 text-xs text-navy">
								<label class="inline-flex items-center gap-2">
									<input type="checkbox" name="relatorio_mensal" checked={p.relatorio_mensal} class="accent-[var(--color-brand)]" />
									Resumo do mês pelo WhatsApp, todo dia 1º
								</label>
								<label class="inline-flex items-center gap-2">
									<input type="checkbox" name="ativo" checked={p.ativo} class="accent-[var(--color-brand)]" />
									Link ligado
								</label>
							</div>
							<div class="sm:col-span-2">
								<button type="submit" disabled={ocupado === p.id} class="rounded-[var(--radius)] bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
									Salvar
								</button>
							</div>
						</form>

						<div class="mt-3 flex flex-wrap items-end gap-2 border-t border-grey-200 pt-3">
							<form method="POST" action="?/senhaPortal" use:enhance={aoEnviar(p.id + 's', 'Senha salva.')} class="flex flex-wrap items-end gap-2">
								<input type="hidden" name="id" value={p.id} />
								<label class="text-[11px] font-medium text-slate">
									<span class="flex items-center gap-1"><Lock size={11} /> {p.com_senha ? 'Trocar a senha' : 'Pôr senha'}</span>
									<input type="password" name="senha" autocomplete="new-password" minlength="4" maxlength="60" class="{campo} mt-1 w-44" />
								</label>
								<button type="submit" class="rounded-[var(--radius)] border border-grey-200 px-3 py-1.5 text-xs font-medium text-navy hover:border-grey">
									{p.com_senha ? 'Trocar' : 'Pôr senha'}
								</button>
							</form>
							{#if p.com_senha}
								<form method="POST" action="?/senhaPortal" use:enhance={aoEnviar(p.id + 't', 'Senha tirada.')}>
									<input type="hidden" name="id" value={p.id} />
									<input type="hidden" name="senha" value="" />
									<button type="submit" class="rounded-[var(--radius)] px-2 py-1.5 text-xs font-medium text-grey hover:text-navy">Tirar a senha</button>
								</form>
							{/if}
							<form
								method="POST"
								action="?/excluirPortal"
								class="ml-auto"
								use:enhance={({ cancel }) => {
									if (!confirm('Excluir este link? Quem tiver o endereço deixa de ver o relatório.')) return cancel();
									return aoEnviar(p.id + 'x', 'Link excluído.')();
								}}
							>
								<input type="hidden" name="id" value={p.id} />
								<button type="submit" class="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-1.5 text-xs font-medium text-[#b42318] hover:bg-[#fdecea]">
									<Trash2 size={13} /> Excluir
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}

			{#if podeEditar}
				<form method="POST" action="?/criarPortal" use:enhance={aoEnviar('novo', 'Link criado.')}>
					<button type="submit" disabled={ocupado === 'novo'} class="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-brand px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
						<Link2 size={14} /> {portais.length ? 'Criar outro link' : 'Criar o link do cliente'}
					</button>
				</form>
			{:else if !portais.length}
				<p class="text-xs text-grey">Ainda não há link para este cliente.</p>
			{/if}
		</div>
	</details>
</Card>
