<script lang="ts">
	import { Badge, Card, Input, Select, EmptyState } from '$lib/components/ui';
	import { Globe } from '@lucide/svelte';
	import WhatsappIcon from '$lib/components/icons/WhatsappIcon.svelte';
	import InstagramIcon from '$lib/components/icons/InstagramIcon.svelte';
	import { formatBRL, type Contato } from '$lib/crm';

	let {
		contatos = [],
		onOpen
	}: {
		contatos?: Contato[];
		onOpen: (id: string) => void;
	} = $props();

	// Acesso rápido: normaliza os campos em URLs abríveis.
	function instaUrl(v: string | null): string | null {
		if (!v) return null;
		const s = v.trim();
		if (!s) return null;
		return /^https?:\/\//i.test(s) ? s : `https://instagram.com/${s.replace(/^@/, '')}`;
	}
	function siteUrl(v: string | null): string | null {
		if (!v) return null;
		const s = v.trim();
		if (!s) return null;
		return /^https?:\/\//i.test(s) ? s : `https://${s}`;
	}
	function whatsUrl(tel: string | null): string | null {
		if (!tel) return null;
		const d = tel.replace(/\D/g, '');
		if (d.length < 8) return null;
		return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}`;
	}

	let busca = $state('');
	let origemFiltro = $state('');

	const origens = $derived([...new Set(contatos.map((c) => c.origem).filter(Boolean))] as string[]);

	const filtrados = $derived.by(() => {
		const q = busca.trim().toLowerCase();
		return contatos.filter((c) => {
			if (origemFiltro && c.origem !== origemFiltro) return false;
			if (q) {
				const alvo = `${c.nome} ${c.empresa ?? ''} ${c.email ?? ''}`.toLowerCase();
				if (!alvo.includes(q)) return false;
			}
			return true;
		});
	});
</script>

<div class="flex flex-wrap items-end gap-2 mb-3">
	<Input
		type="search"
		placeholder="Buscar contato"
		aria-label="Buscar contato"
		bind:value={busca}
		wrapperClass="w-64"
	/>
	<Select bind:value={origemFiltro} wrapperClass="w-44" aria-label="Origem">
		<option value="">Todas as origens</option>
		{#each origens as o (o)}
			<option value={o}>{o}</option>
		{/each}
	</Select>
	<span class="text-sm text-grey ml-auto">{filtrados.length} contato(s)</span>
</div>

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th scope="col" class="px-4 py-3 font-semibold">Contato</th>
					<th scope="col" class="px-4 py-3 font-semibold">Acesso</th>
					<th scope="col" class="px-4 py-3 font-semibold">Empresa</th>
					<th scope="col" class="px-4 py-3 font-semibold">Origem</th>
					<th scope="col" class="px-4 py-3 font-semibold">Responsável</th>
					<th scope="col" class="px-4 py-3 font-semibold text-right">Negócios</th>
					<th scope="col" class="px-4 py-3 font-semibold text-right">Valor total</th>
					<th scope="col" class="px-4 py-3 font-semibold">Tags</th>
				</tr>
			</thead>
			<tbody>
				{#each filtrados as c (c.id)}
					{@const iu = instaUrl(c.instagram)}
					{@const wu = whatsUrl(c.whatsapp ?? c.telefone)}
					{@const su = siteUrl(c.site)}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => onOpen(c.id)}
					>
						<td class="px-4 py-3">
							<!-- Botão na 1ª célula: dá acesso por teclado à linha (a linha inteira
							     segue clicável no mouse). stopPropagation evita abrir duas vezes. -->
							<button
								type="button"
								class="block rounded-[var(--radius-sm)] text-left font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
								onclick={(e) => {
									e.stopPropagation();
									onOpen(c.id);
								}}
							>
								{c.nome}
							</button>
							{#if c.email}<div class="text-xs text-grey truncate">{c.email}</div>{/if}
						</td>
						<td class="px-4 py-3">
							<div class="flex items-center gap-0.5">
								{#if su}
									<a href={su} target="_blank" rel="noopener" title="Abrir site" aria-label="Abrir site" class="grid size-8 place-items-center rounded-md text-grey transition-colors hover:bg-surface hover:text-brand" onclick={(e) => e.stopPropagation()}>
										<Globe size={17} strokeWidth={2.25} />
									</a>
								{/if}
								{#if iu}
									<a href={iu} target="_blank" rel="noopener" title="Abrir Instagram" aria-label="Abrir Instagram" class="grid size-8 place-items-center rounded-md transition-transform hover:scale-110 hover:bg-surface" onclick={(e) => e.stopPropagation()}>
										<InstagramIcon size={18} />
									</a>
								{/if}
								{#if wu}
									<a href={wu} target="_blank" rel="noopener" title="Abrir WhatsApp" aria-label="Abrir WhatsApp" class="grid size-8 place-items-center rounded-md text-[#25D366] transition-transform hover:scale-110 hover:bg-surface" onclick={(e) => e.stopPropagation()}>
										<WhatsappIcon size={18} />
									</a>
								{/if}
								{#if !su && !iu && !wu}<span class="text-grey">—</span>{/if}
							</div>
						</td>
						<td class="px-4 py-3 text-slate">{c.empresa ?? '—'}</td>
						<td class="px-4 py-3">
							{#if c.origem}<Badge tone="neutral">{c.origem}</Badge>{:else}<span class="text-grey">—</span>{/if}
						</td>
						<td class="px-4 py-3 text-slate whitespace-nowrap">{c.responsavel_nome ?? '—'}</td>
						<td class="px-4 py-3 text-right tabular-nums text-slate">{c.negocios_qtd}</td>
						<td class="px-4 py-3 text-right tabular-nums text-navy">{formatBRL(c.valor_total)}</td>
						<td class="px-4 py-3">
							<div class="flex flex-wrap gap-1">
								{#each c.tags.slice(0, 3) as t (t)}
									<span class="rounded-full bg-bg text-slate text-[0.68rem] px-1.5 py-0.5">{t}</span>
								{/each}
							</div>
						</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="px-2"><EmptyState icon="contact" title="Nenhum contato" description="Cadastre leads e contatos no CRM." /></td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
