<script lang="ts">
	// Os sites que o DMetric conta: cadastro, o código para colar e o status.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, Card } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import { haQuanto, numero, snippet, type DMetricSite } from '$lib/dmetric/painel';
	import { Copy, Globe, Pause, Play, Plus, Trash2, Database } from '@lucide/svelte';

	let {
		sites,
		historico,
		podeEditar,
		podeExcluir
	}: {
		sites: DMetricSite[];
		historico: { usuarios: number; paises: number };
		podeEditar: boolean;
		podeExcluir: boolean;
	} = $props();

	const origem = page.url.origin;
	let enviando = $state(false);
	let confirmando = $state<string | null>(null);
	let recemCriado = $state<string | null>(null);

	async function copiar(texto: string) {
		try {
			await navigator.clipboard.writeText(texto);
			toast.success('Código copiado');
		} catch {
			toast.error('Não deu para copiar. Selecione o código e copie à mão.');
		}
	}

	const fieldCls =
		'h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
	<div class="space-y-5 lg:col-span-2">
		{#if podeEditar}
			<Card>
				<h3 class="mb-3 text-sm font-semibold text-navy">Novo site</h3>
				<form
					method="POST"
					action="?/criarSite"
					class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]"
					use:enhance={() => {
						enviando = true;
						return async ({ result, update, formElement }) => {
							enviando = false;
							if (result.type === 'success') {
								recemCriado = (result.data?.criado as string) ?? null;
								formElement.reset();
								toast.success('Site adicionado. Agora é colar o código nele.');
							} else if (result.type === 'failure') {
								toast.error((result.data?.erro as string) ?? 'Não foi possível adicionar.');
							}
							await update({ reset: false });
						};
					}}
				>
					<div>
						<label for="dm-nome" class="mb-1 block text-xs font-medium text-slate">Nome</label>
						<input id="dm-nome" name="nome" required placeholder="Ex.: Site Lojas Mari" class={fieldCls} />
					</div>
					<div>
						<label for="dm-dominio" class="mb-1 block text-xs font-medium text-slate">Domínio</label>
						<input id="dm-dominio" name="dominio" placeholder="lojasmari.com.br" class={fieldCls} />
					</div>
					<div class="flex items-end">
						<Button type="submit" loading={enviando} block><Plus size={16} /> Adicionar</Button>
					</div>
				</form>
				<p class="mt-2 text-xs text-grey">
					O domínio trava a contagem nele (e nos subdomínios): o código copiado para outro site não soma aqui. Deixe em
					branco só para testar.
				</p>
			</Card>
		{/if}

		{#if sites.length === 0}
			<Card class="border-dashed py-10 text-center">
				<span class="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-bg text-grey"><Globe size={26} /></span>
				<p class="text-sm font-medium text-navy">Nenhum site no DMetric ainda</p>
				<p class="mx-auto mt-1 max-w-sm text-xs text-grey">
					Cadastre um site acima e cole o código dele no &lt;head&gt; das páginas. As visitas aparecem no painel em
					segundos.
				</p>
			</Card>
		{:else}
			{#each sites as s (s.id)}
				{@const codigo = snippet(origem, s.chave)}
				<Card class={recemCriado === s.id ? 'ring-2 ring-brand/30' : ''}>
					<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="truncate text-base font-bold text-navy">{s.nome}</h3>
							<p class="text-xs text-slate">{s.dominio ?? 'qualquer domínio (teste)'}</p>
						</div>
						{#if !s.ativo}
							<span class="rounded-full bg-grey-200 px-2.5 py-1 text-[11px] font-semibold text-slate">Pausado</span>
						{:else if s.ultima_visita}
							<span class="inline-flex items-center gap-1.5 rounded-full bg-brand-green/12 px-2.5 py-1 text-[11px] font-semibold text-[#107d4a]">
								<span class="size-1.5 rounded-full bg-brand-green"></span> Recebendo · {haQuanto(s.ultima_visita)}
							</span>
						{:else}
							<span class="rounded-full bg-brand-amber/15 px-2.5 py-1 text-[11px] font-semibold text-brand-brown">
								Aguardando a primeira visita
							</span>
						{/if}
					</div>

					<div class="flex items-stretch gap-2">
						<code
							class="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-bg/60 px-3 py-2.5 font-mono text-[11px] text-navy-900"
							>{codigo}</code
						>
						<Button variant="secondary" onclick={() => copiar(codigo)}><Copy size={15} /> Copiar</Button>
					</div>

					{#if podeEditar || podeExcluir}
						<div class="mt-3 flex flex-wrap items-center justify-end gap-2">
							{#if podeEditar}
								<form method="POST" action="?/alternarSite" use:enhance>
									<input type="hidden" name="id" value={s.id} />
									<input type="hidden" name="ativo" value={String(!s.ativo)} />
									<Button size="sm" variant="ghost" type="submit">
										{#if s.ativo}<Pause size={14} /> Pausar contagem{:else}<Play size={14} /> Retomar contagem{/if}
									</Button>
								</form>
							{/if}
							{#if podeExcluir}
								{#if confirmando === s.id}
									<span class="text-xs text-slate">Apaga o site e todos os números dele.</span>
									<form method="POST" action="?/excluirSite" use:enhance={() => async ({ update }) => { confirmando = null; await update(); }}>
										<input type="hidden" name="id" value={s.id} />
										<Button size="sm" variant="danger" type="submit">Excluir</Button>
									</form>
									<Button size="sm" variant="ghost" onclick={() => (confirmando = null)}>Cancelar</Button>
								{:else}
									<Button size="sm" variant="ghost" onclick={() => (confirmando = s.id)}><Trash2 size={14} /> Excluir</Button>
								{/if}
							{/if}
						</div>
					{/if}
				</Card>
			{/each}
		{/if}
	</div>

	<div class="space-y-5">
		<Card>
			<h3 class="mb-2 text-sm font-semibold text-navy">Como instalar</h3>
			<ol class="list-decimal space-y-1.5 pl-4 text-xs text-slate">
				<li>Copie o código do site.</li>
				<li>
					Cole antes do <code class="font-mono">&lt;/head&gt;</code>, em todas as páginas. No WordPress, um plugin de
					"header/footer"; em Wix, Hostinger e afins, a área de "código personalizado".
				</li>
				<li>Abra o site uma vez: o status aqui vira "Recebendo".</li>
			</ol>
			<p class="mt-3 text-xs text-grey">
				Sem cookie e sem guardar IP: o visitante é contado uma vez por dia. Robôs e pré-visualizações de link não
				contam. Para testar em <code class="font-mono">localhost</code>, acrescente
				<code class="font-mono">data-local</code> ao código.
			</p>
		</Card>

		<Card>
			<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
				<Database size={15} class="text-grey" /> Histórico importado
			</h3>
			<p class="text-xs text-slate">
				Google Analytics · DNMS-HUB · 2025: <b class="font-semibold text-navy">{numero(historico.usuarios)}</b> usuários de
				{historico.paises} países. Entra no painel em "Todos os sites · Desde o começo".
			</p>
		</Card>
	</div>
</div>
