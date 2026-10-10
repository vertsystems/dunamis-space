<script lang="ts">
	// O código do DMetric (o mesmo para qualquer site) e os sites que ele já
	// reconheceu. Não há cadastro: o site aparece sozinho na primeira visita,
	// com o domínio como nome, e aqui se renomeia, pausa ou exclui.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, Card } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import { haQuanto, numero, snippet, type DMetricSite } from '$lib/dmetric/painel';
	import { Check, Copy, Database, Globe, Pause, Pencil, Play, Trash2, X } from '@lucide/svelte';

	let {
		sites,
		historico,
		podeEditar,
		podeExcluir
	}: {
		sites: DMetricSite[];
		historico: { usuarios: number; paises: number; rotulo: string };
		podeEditar: boolean;
		podeExcluir: boolean;
	} = $props();

	const codigo = snippet(page.url.origin);
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
		'h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
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
			{#each sites as s (s.id)}
				<Card padding="sm">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="min-w-0 flex-1">
							{#if renomeando === s.id}
								<form
									method="POST"
									action="?/renomearSite"
									class="flex max-w-md items-center gap-1.5"
									use:enhance={() =>
										async ({ result, update }) => {
											if (result.type === 'failure') toast.error((result.data?.erro as string) ?? 'Não foi possível renomear.');
											else renomeando = null;
											await update();
										}}
								>
									<input type="hidden" name="id" value={s.id} />
									<!-- svelte-ignore a11y_autofocus -->
									<input name="nome" value={s.nome} aria-label="Nome do site" required autofocus class={fieldCls} />
									<button type="submit" title="Salvar" class="rounded-[var(--radius-sm)] p-1.5 text-brand-green hover:bg-brand-green/10"><Check size={16} /></button>
									<button type="button" title="Cancelar" onclick={() => (renomeando = null)} class="rounded-[var(--radius-sm)] p-1.5 text-grey hover:bg-bg"><X size={16} /></button>
								</form>
							{:else}
								<div class="flex items-center gap-1.5">
									<h3 class="truncate text-base font-bold text-navy">{s.nome}</h3>
									{#if podeEditar}
										<button
											type="button"
											onclick={() => (renomeando = s.id)}
											title="Renomear"
											aria-label="Renomear {s.nome}"
											class="rounded-[var(--radius-sm)] p-1 text-grey transition-colors hover:bg-bg hover:text-navy"
										><Pencil size={13} /></button>
									{/if}
								</div>
							{/if}
							<p class="text-xs text-slate">
								{s.dominio ?? 'qualquer domínio'}{#if s.automatico}<span class="text-grey">{' · reconhecido pelo código'}</span>{/if}
							</p>
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

					{#if podeEditar || podeExcluir}
						<div class="mt-2 flex flex-wrap items-center justify-end gap-2">
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
									<span class="text-xs text-slate">
										Apaga o site e os números. Se o código continuar nele, ele volta na próxima visita — para bloquear, pause.
									</span>
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
			<h3 class="mb-2 text-sm font-semibold text-navy">O que ele conta</h3>
			<ul class="list-disc space-y-1 pl-4 text-xs text-slate">
				<li>Visitas, páginas vistas e tempo na página</li>
				<li>País e cidade, aparelho, navegador e sistema</li>
				<li>De onde chegaram (Instagram, Google, WhatsApp…) e a campanha (utm_campaign)</li>
				<li>Cliques em WhatsApp, telefone, e-mail, mapa e links para outros sites</li>
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
