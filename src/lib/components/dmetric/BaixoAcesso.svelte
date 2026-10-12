<script lang="ts">
	// Alerta: páginas ativas com menos de 20 visitas nos últimos 30 dias. Sinal de
	// que o link não está sendo divulgado, saiu da bio ou o código caiu do site.
	import { Card } from '$lib/components/ui';
	import {
		LIMITE_BAIXO_ACESSO,
		enderecoDoSite,
		haQuanto,
		nomeDoSite,
		numero,
		type PaginaBaixoAcesso
	} from '$lib/dmetric/painel';
	import { TriangleAlert } from '@lucide/svelte';

	let { paginas }: { paginas: PaginaBaixoAcesso[] } = $props();
</script>

<Card padding="none" class="overflow-hidden border-brand-amber/50">
	<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-brand-amber/30 bg-brand-amber/10 px-5 py-3">
		<h2 class="flex items-center gap-2 text-base font-bold text-navy">
			<TriangleAlert size={17} class="shrink-0 text-brand-brown" />
			Páginas com baixo acesso
			<span class="rounded-full bg-brand-amber/25 px-2 py-0.5 text-[11px] font-bold text-brand-brown">{paginas.length}</span>
		</h2>
		<p class="text-[11px] text-brand-brown">menos de {LIMITE_BAIXO_ACESSO} visitas nos últimos 30 dias</p>
	</div>
	<ul class="divide-y divide-grey-200/70">
		{#each paginas as p (p.site.id)}
			{@const nome = nomeDoSite(p.site)}
			{@const endereco = enderecoDoSite(p.site)}
			<li class="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
				<div class="min-w-0 flex-1">
					<p class="truncate text-xs font-semibold text-navy">{nome}</p>
					{#if endereco !== nome}<p class="truncate text-[11px] text-grey">{endereco}</p>{/if}
				</div>
				<!-- Quanto falta para os 20: a barra enche até o limite. -->
				<div class="hidden w-28 sm:block" aria-hidden="true">
					<div class="h-1.5 rounded-full bg-grey-200/70">
						<div class="h-1.5 rounded-full bg-brand-amber" style="width: {Math.max(3, (p.visitas / LIMITE_BAIXO_ACESSO) * 100)}%"></div>
					</div>
				</div>
				<div class="w-40 text-right">
					<p class="text-xs font-bold tabular-nums text-navy-900">
						{numero(p.visitas)} {p.visitas === 1 ? 'visita' : 'visitas'}
					</p>
					<p class="text-[11px] text-grey">
						{#if p.diasNoAr < 30}no ar há {p.diasNoAr} {p.diasNoAr === 1 ? 'dia' : 'dias'}{:else if p.site.ultima_visita}última visita {haQuanto(p.site.ultima_visita)}{:else}nenhuma visita ainda{/if}
					</p>
				</div>
			</li>
		{/each}
	</ul>
</Card>
