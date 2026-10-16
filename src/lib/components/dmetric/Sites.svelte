<script lang="ts">
	// O código do DMetric (o mesmo para qualquer site) e os sites que ele já
	// reconheceu. Não há cadastro: o site aparece sozinho na primeira visita,
	// com o domínio como nome, e aqui se renomeia, pausa ou exclui.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, Card } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import { enderecoDoSite, haQuanto, nomeDoSite, numero, snippet, type DMetricSite } from '$lib/dmetric/painel';
	import { Check, Copy, Database, Globe, Merge, Pause, Pencil, Play, Split, Trash2, X } from '@lucide/svelte';

	let {
		sites,
		historico,
		podeEditar,
		podeExcluir
	}: {
		sites: DMetricSite[];
		historico: { usuarios: number; paises: number; rotulo: string; anos: string };
		podeEditar: boolean;
		podeExcluir: boolean;
	} = $props();

	const codigo = snippet(page.url.origin);

	// Os sites de um mesmo domínio ficam juntos: a raiz e depois as páginas.
	const ordenados = $derived(
		[...sites].sort(
			(a, b) => (a.dominio ?? '').localeCompare(b.dominio ?? '') || (a.caminho ?? '').localeCompare(b.caminho ?? '')
		)
	);
	let confirmando = $state<string | null>(null);
	let renomeando = $state<string | null>(null);

	async function copiar() {
		try {
			await navigator.clipboard.writeText(codigo);
			toast.success('Código copiado');
		} catch {
			toast.error('Não deu para copiar. Selecione o código e copie à mão.');
		}
	}

	const fieldCls =
		'h-8 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-2.5 text-sm text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
	// Ações da linha: pequenas, sem moldura, como um botão "fantasma".
	const acaoCls =
		'inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs font-medium text-slate transition-colors hover:bg-bg hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
	<div class="space-y-5 lg:col-span-2">
		<!-- O código: um só, para todos os sites -->
		<Card>
			<h3 class="text-sm font-semibold text-navy">Código do DMetric</h3>
			<p class="mb-3 mt-0.5 text-xs text-slate">
				O mesmo para qualquer site. Cole antes do <code class="font-mono">&lt;/head&gt;</code> e pronto: na primeira
				visita o site aparece aqui sozinho.
			</p>
			<div class="flex items-stretch gap-2">
				<code
					class="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-bg/60 px-3 py-2.5 font-mono text-xs text-navy-900"
					>{codigo}</code
				>
				<Button onclick={copiar}><Copy size={15} /> Copiar</Button>
			</div>
		</Card>

		{#if sites.length === 0}
			<Card class="border-dashed py-10 text-center">
				<span class="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-bg text-grey"><Globe size={26} /></span>
				<p class="text-sm font-medium text-navy">Nenhum site com o código ainda</p>
				<p class="mx-auto mt-1 max-w-sm text-xs text-grey">
					Cole o código acima em um site e abra uma página dele: ele aparece aqui em segundos.
				</p>
			</Card>
		{:else}
			<!-- Uma linha fina por site: nome e endereço à esquerda; estado e ações à direita. -->
			<Card padding="none" class="overflow-hidden">
				<div class="flex items-baseline justify-between gap-2 border-b border-grey-200 px-4 py-2.5">
					<h3 class="text-sm font-semibold text-navy">Sites</h3>
					<p class="text-[11px] text-grey">{sites.length} {sites.length === 1 ? 'site' : 'sites'} · os do mesmo domínio ficam juntos</p>
				</div>
				<ul class="divide-y divide-grey-200/70">
					{#each ordenados as s (s.id)}
						{@const nome = nomeDoSite(s)}
						{@const endereco = enderecoDoSite(s)}
						<!-- Colunas fixas (nome · estado · ações): tudo alinhado de uma linha para a outra.
						     No celular, o nome vai em cima e o estado e as ações embaixo. -->
						<li
							class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2 transition-colors hover:bg-bg/50 sm:grid-cols-[minmax(0,1fr)_10.5rem_auto]"
						>
							<div class="col-span-2 min-w-0 sm:col-span-1">
								{#if renomeando === s.id}
									<form
										method="POST"
										action="?/renomearSite"
										class="flex max-w-md items-center gap-1"
										use:enhance={() =>
											async ({ result, update }) => {
												if (result.type === 'failure') toast.error((result.data?.erro as string) ?? 'Não foi possível renomear.');
												else renomeando = null;
												await update();
											}}
									>
										<input type="hidden" name="id" value={s.id} />
										<!-- svelte-ignore a11y_autofocus -->
										<input
											name="nome"
											value={s.nome_manual ? s.nome : ''}
											placeholder={s.titulo || endereco}
											aria-label="Nome do site (vazio = o título da página)"
											autofocus
											class={fieldCls}
										/>
										<button type="submit" title="Salvar" class="rounded-[var(--radius-sm)] p-1 text-brand-green hover:bg-brand-green/10"><Check size={15} /></button>
										<button type="button" title="Cancelar" onclick={() => (renomeando = null)} class="rounded-[var(--radius-sm)] p-1 text-grey hover:bg-bg"><X size={15} /></button>
									</form>
								{:else}
									<!-- O nome e, logo embaixo, o endereço pequeno: toda linha com a mesma altura. -->
									<div class="min-w-0">
										<span class="flex min-w-0 max-w-full items-center gap-1 leading-tight">
											<span class="truncate text-sm font-semibold text-navy" title={nome}>{nome}</span>
											{#if podeEditar}
												<button
													type="button"
													onclick={() => (renomeando = s.id)}
													title="Renomear (em branco, volta a usar o título da página)"
													aria-label="Renomear {nome}"
													class="shrink-0 rounded-[var(--radius-sm)] p-0.5 text-grey transition-colors hover:bg-bg hover:text-navy"
												><Pencil size={12} /></button>
											{/if}
										</span>
										<span class="block min-w-0 truncate text-[11px] leading-tight text-slate">
											{endereco || 'qualquer domínio'}{#if s.juntar_paginas}<span class="text-grey">{' · todas as páginas do domínio'}</span>{/if}
										</span>
									</div>
								{/if}
							</div>

							<div class="justify-self-start">
								{#if !s.ativo}
									<span class="rounded-full bg-grey-200 px-2 py-0.5 text-[10.5px] font-semibold text-slate">Pausado</span>
								{:else if s.ultima_visita}
									<span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-green/12 px-2 py-0.5 text-[10.5px] font-semibold text-[#107d4a]">
										<span class="size-1.5 rounded-full bg-brand-green"></span> Recebendo · {haQuanto(s.ultima_visita)}
									</span>
								{:else}
									<span class="whitespace-nowrap rounded-full bg-brand-amber/15 px-2 py-0.5 text-[10.5px] font-semibold text-brand-brown">
										Aguardando a primeira visita
									</span>
								{/if}
							</div>

							{#if podeEditar || podeExcluir}
								<div class="flex items-center gap-0.5 justify-self-end">
									{#if podeEditar && s.dominio && (s.caminho || s.juntar_paginas)}
										{@const legenda = s.juntar_paginas
											? `Separar páginas: cada página de ${s.dominio} volta a ser um site (nas próximas visitas)`
											: `Juntar páginas: as próximas visitas de qualquer página de ${s.dominio} contam num site só`}
										<!-- Página de um domínio → juntar; raiz que junta → separar. -->
										<form method="POST" action="?/juntarPaginas" use:enhance class="mr-1">
											<input type="hidden" name="dominio" value={s.dominio} />
											<input type="hidden" name="juntar" value={String(!s.juntar_paginas)} />
											<!-- Só o ícone; a explicação aparece ao passar o mouse (ou focar). -->
											<button
												type="submit"
												aria-label={legenda}
												class="group relative grid size-7 place-items-center rounded-[var(--radius-sm)] bg-[#fce16c]/45 text-[#846047] transition-colors hover:bg-[#fce16c]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fce16c]"
											>
												{#if s.juntar_paginas}<Split size={14} />{:else}<Merge size={14} />{/if}
												<span
													role="tooltip"
													class="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-max max-w-64 rounded-[var(--radius-sm)] bg-navy-900 px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
												>
													{legenda}
												</span>
											</button>
										</form>
									{:else if podeEditar}
										<!-- Sem o ícone de juntar, o espaço dele fica: os botões não andam. -->
										<span class="mr-1 size-7" aria-hidden="true"></span>
									{/if}
									{#if podeEditar}
										<form method="POST" action="?/alternarSite" use:enhance>
											<input type="hidden" name="id" value={s.id} />
											<input type="hidden" name="ativo" value={String(!s.ativo)} />
											<button type="submit" class="{acaoCls} min-w-[8.5rem]">
												{#if s.ativo}<Pause size={13} /> Pausar contagem{:else}<Play size={13} /> Retomar contagem{/if}
											</button>
										</form>
									{/if}
									{#if podeExcluir && confirmando !== s.id}
										<button type="button" class={acaoCls} onclick={() => (confirmando = s.id)}><Trash2 size={13} /> Excluir</button>
									{/if}
								</div>
							{/if}

							<!-- Excluir pede confirmação numa linha curta, embaixo do próprio site. -->
							{#if podeExcluir && confirmando === s.id}
								<div class="col-span-full flex flex-wrap items-center justify-end gap-2 rounded-[var(--radius)] bg-brand-danger/5 px-3 py-1.5">
									<span class="mr-auto text-[11px] text-slate">
										Apaga o site e os números. Se o código continuar nele, ele volta na próxima visita — para bloquear, pause.
									</span>
									<form method="POST" action="?/excluirSite" use:enhance={() => async ({ update }) => { confirmando = null; await update(); }}>
										<input type="hidden" name="id" value={s.id} />
										<Button size="sm" variant="danger" type="submit">Excluir</Button>
									</form>
									<Button size="sm" variant="ghost" onclick={() => (confirmando = null)}>Cancelar</Button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</Card>
		{/if}
	</div>

	<div class="space-y-5">
		<Card>
			<h3 class="mb-2 text-sm font-semibold text-navy">O que ele conta</h3>
			<ul class="list-disc space-y-1 pl-4 text-xs text-slate">
				<li>Visitas, páginas vistas e tempo na página</li>
				<li>País e cidade, aparelho, navegador e sistema</li>
				<li>De onde chegaram (Instagram, Google, WhatsApp…) e a campanha (utm_campaign)</li>
				<li>Cliques em WhatsApp, telefone, e-mail, mapa e links para outros sites</li>
				<li>A saúde da página: velocidade no aparelho de quem visita, erros e links quebrados (404)</li>
			</ul>
			<p class="mt-3 text-xs text-grey">
				Para contar um botão específico, acrescente <code class="font-mono">data-dm="Nome"</code> nele. Sem cookie e sem
				guardar IP; robôs não contam. Para testar em <code class="font-mono">localhost</code>, acrescente
				<code class="font-mono">data-local</code> ao código.
			</p>
		</Card>

		<Card>
			<h3 class="mb-2 text-sm font-semibold text-navy">Onde colar</h3>
			<ul class="list-disc space-y-1 pl-4 text-xs text-slate">
				<li>Site próprio: antes do <code class="font-mono">&lt;/head&gt;</code>, no layout comum a todas as páginas.</li>
				<li>WordPress: plugin de "header e footer" (ex.: WPCode), em "Header".</li>
				<li>Wix, Hostinger, Webflow e afins: "Código personalizado", em todas as páginas, no head.</li>
			</ul>
		</Card>

		{#if historico.usuarios}
			<Card>
				<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
					<Database size={15} class="text-grey" /> Histórico importado
				</h3>
				<p class="text-xs text-slate">
					Google Analytics · DNMS-HUB · {historico.rotulo}: <b class="font-semibold text-navy">{numero(historico.usuarios)}</b>
					usuários de {historico.paises} países. Entra no painel em "Todos os sites · Desde o começo".
				</p>
			</Card>
		{/if}
	</div>
</div>
