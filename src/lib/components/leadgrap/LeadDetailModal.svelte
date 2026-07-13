<script lang="ts">
	import { Modal, Button, Input, Textarea, Select, Badge } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import { MessageCircle, Star, Globe, MapPin, ExternalLink } from '@lucide/svelte';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import ContactDialog from './ContactDialog.svelte';
	import {
		leadScore,
		whatsappLink,
		toDateInput,
		TIER_TONE,
		type ActivityDTO,
		type LeadDTO
	} from '$lib/leadgrap/types';

	let {
		lead,
		onClose,
		onSaved
	}: { lead: LeadDTO; onClose: () => void; onSaved: (lead: LeadDTO) => void } = $props();

	// Campos editáveis — reinicializados quando o lead muda.
	let notes = $state('');
	let tags = $state('');
	let estimatedValue = $state('');
	let nextContactAt = $state('');
	let assignedToId = $state('');
	let atividades = $state<ActivityDTO[]>([]);
	let contatando = $state(false);
	let salvando = $state(false);

	let ultimoId = '';
	$effect(() => {
		if (lead.id === ultimoId) return;
		ultimoId = lead.id;
		notes = lead.notes ?? '';
		tags = lead.tags ?? '';
		estimatedValue = lead.estimatedValue != null ? String(lead.estimatedValue) : '';
		nextContactAt = toDateInput(lead.nextContactAt);
		assignedToId = lead.assignedToId ?? '';
		leadgrap.loadLeadActivities(lead.id).then((a) => (atividades = a));
	});

	const score = $derived(leadScore(lead));

	async function salvar() {
		salvando = true;
		const updated = await leadgrap.saveDetails(lead.id, {
			notes,
			tags: tags.trim() ? tags.trim() : null,
			estimatedValue: estimatedValue.trim() ? Number(estimatedValue) : null,
			nextContactAt: nextContactAt ? new Date(nextContactAt).toISOString() : null,
			assignedToId: assignedToId || null
		});
		salvando = false;
		if (updated) {
			onSaved(updated);
			leadgrap.loadLeadActivities(lead.id).then((a) => (atividades = a));
		}
	}
</script>

<Modal open title={lead.name} size="lg" onClose={onClose}>
	<div class="space-y-5">
		<!-- Cabeçalho: score + ações -->
		<div class="flex flex-wrap items-center justify-between gap-2">
			<Badge tone={TIER_TONE[score.tier] as BadgeTone}>
				{score.tier === 'quente' ? '🔥 ' : ''}{score.tier} · {score.score}
			</Badge>
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={() => (contatando = true)}>
					<MessageCircle size={15} /> Contatar
				</Button>
				{#if lead.phone}
					<a href={whatsappLink(lead.phone)} target="_blank" rel="noopener">
						<Button variant="success" size="sm">WhatsApp</Button>
					</a>
				{/if}
			</div>
		</div>

		<!-- Ficha (somente leitura) -->
		<dl class="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
			<div><dt class="text-grey">Categoria</dt><dd class="text-navy">{lead.category ?? '—'}</dd></div>
			<div>
				<dt class="text-grey">Nota</dt>
				<dd class="flex items-center gap-1 text-navy">
					{#if lead.rating != null}
						<Star size={13} class="text-warning" /> {lead.rating.toFixed(1)}
						<span class="text-grey">({lead.reviewCount ?? 0})</span>
					{:else}—{/if}
				</dd>
			</div>
			<div class="sm:col-span-2">
				<dt class="text-grey">Endereço</dt>
				<dd class="flex items-center gap-1 text-navy">
					{#if lead.address}<MapPin size={13} class="text-grey" /> {lead.address}{:else}—{/if}
				</dd>
			</div>
			<div>
				<dt class="text-grey">Telefone</dt>
				<dd class="text-navy">{lead.phone ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-grey">E-mail</dt>
				<dd class="truncate text-navy">
					{#if lead.email}<a class="text-brand hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>{:else}—{/if}
				</dd>
			</div>
			<div>
				<dt class="text-grey">Site</dt>
				<dd>
					{#if lead.website}
						<a class="inline-flex items-center gap-1 text-brand hover:underline" href={lead.website} target="_blank" rel="noopener">
							<Globe size={13} /> abrir
						</a>
					{:else}<span class="text-grey">não possui</span>{/if}
				</dd>
			</div>
			<div>
				<dt class="text-grey">Redes</dt>
				<dd class="flex items-center gap-3">
					{#if lead.instagram}<a href={lead.instagram} target="_blank" rel="noopener" class="text-brand hover:underline">Instagram</a>{/if}
					{#if lead.facebook}<a href={lead.facebook} target="_blank" rel="noopener" class="text-brand hover:underline">Facebook</a>{/if}
					{#if !lead.instagram && !lead.facebook}<span class="text-grey">—</span>{/if}
				</dd>
			</div>
			{#if lead.googleUrl}
				<div class="sm:col-span-2">
					<dt class="text-grey">Google</dt>
					<dd>
						<a class="inline-flex items-center gap-1 text-brand hover:underline" href={lead.googleUrl} target="_blank" rel="noopener">
							<ExternalLink size={13} /> Ver no Google Maps
						</a>
					</dd>
				</div>
			{/if}
			{#if score.reasons.length}
				<div class="sm:col-span-2">
					<dt class="text-grey">Score</dt>
					<dd class="text-navy">{score.reasons.join(' · ')}</dd>
				</div>
			{/if}
		</dl>

		<!-- Formulário editável -->
		<div class="grid grid-cols-1 gap-4 border-t border-grey-200 pt-4 sm:grid-cols-2">
			<Input label="Valor estimado (R$)" type="number" bind:value={estimatedValue} placeholder="0" />
			<Input label="Próximo contato" type="date" bind:value={nextContactAt} />
			<Select label="Responsável" bind:value={assignedToId} wrapperClass="sm:col-span-2">
				<option value="">Não atribuído</option>
				{#each leadgrap.colaboradores as c (c.id)}
					<option value={c.id}>{c.nome}</option>
				{/each}
			</Select>
			<Input label="Tags" bind:value={tags} placeholder="separadas por vírgula" wrapperClass="sm:col-span-2" />
			<Textarea label="Anotações" bind:value={notes} rows={3} wrapperClass="sm:col-span-2" placeholder="Notas internas…" />
		</div>

		<div class="flex justify-end">
			<Button size="sm" disabled={salvando} onclick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
		</div>

		<!-- Histórico -->
		{#if atividades.length}
			<div class="border-t border-grey-200 pt-4">
				<h4 class="mb-2 text-sm font-semibold text-navy">Histórico</h4>
				<ul class="space-y-2">
					{#each atividades as a (a.id)}
						<li class="flex gap-2 text-sm">
							<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand/60"></span>
							<div>
								<p class="text-navy">
									{#if a.userName}<span class="font-medium">{a.userName}:</span> {/if}{a.message}
								</p>
								<p class="text-xs text-grey">{new Date(a.createdAt).toLocaleString('pt-BR')}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</Modal>

{#if contatando}
	<ContactDialog
		{lead}
		onClose={() => (contatando = false)}
		onContacted={(l) => {
			onSaved(l);
			leadgrap.loadLeadActivities(lead.id).then((a) => (atividades = a));
		}}
	/>
{/if}
