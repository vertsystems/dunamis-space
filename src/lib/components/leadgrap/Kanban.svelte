<script lang="ts">
	import { Badge } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import LeadDetailModal from './LeadDetailModal.svelte';
	import {
		STAGES,
		STAGE_COLOR,
		TIER_TONE,
		leadScore,
		formatCurrency,
		followupInfo,
		iniciais,
		type LeadDTO,
		type LeadStage
	} from '$lib/leadgrap/types';

	let dragId = $state<string | null>(null);
	let dragOver = $state<LeadStage | null>(null);
	let editing = $state<LeadDTO | null>(null);

	function porEstagio(stage: LeadStage): LeadDTO[] {
		return leadgrap.leads.filter((l) => l.stage === stage);
	}
	function totalValor(stage: LeadStage): number {
		return porEstagio(stage).reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
	}

	function onDrop(stage: LeadStage) {
		dragOver = null;
		const id = dragId;
		dragId = null;
		if (id) leadgrap.setStage(id, stage);
	}
</script>

<div class="flex gap-4 overflow-x-auto pb-4">
	{#each STAGES as s (s.value)}
		{@const leads = porEstagio(s.value)}
		{@const valor = totalValor(s.value)}
		<div
			class="flex w-72 shrink-0 flex-col rounded-[var(--radius-xl)] border bg-bg/40 p-3 transition-colors"
			class:border-brand={dragOver === s.value}
			class:bg-brand-50={dragOver === s.value}
			class:border-grey-200={dragOver !== s.value}
			role="list"
			ondragover={(e) => {
				e.preventDefault();
				dragOver = s.value;
			}}
			ondragleave={() => dragOver === s.value && (dragOver = null)}
			ondrop={() => onDrop(s.value)}
		>
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="size-2.5 rounded-full" style="background: {STAGE_COLOR[s.value]}"></span>
					<span class="text-sm font-semibold text-navy">{s.label}</span>
				</div>
				<span class="rounded-full bg-surface px-2 py-0.5 text-xs text-grey">{leads.length}</span>
			</div>
			{#if valor > 0}
				<p class="mb-2 text-xs font-medium text-grey">{formatCurrency(valor)}</p>
			{/if}

			<div class="flex min-h-[60px] flex-col gap-2">
				{#each leads as l (l.id)}
					{@const sc = leadScore(l)}
					<div
						class="cursor-grab rounded-xl border border-grey-200 bg-surface p-3 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:cursor-grabbing"
						class:opacity-40={dragId === l.id}
						role="button"
						draggable="true"
						ondragstart={() => (dragId = l.id)}
						ondragend={() => (dragId = null)}
						onclick={() => (editing = l)}
						onkeydown={(e) => e.key === 'Enter' && (editing = l)}
						tabindex="0"
					>
						<div class="flex items-start justify-between gap-2">
							<span class="truncate text-sm font-medium text-navy">{l.name}</span>
							<div class="flex shrink-0 items-center gap-1">
								{#if l.assignedToName}
									<span class="grid size-5 place-items-center rounded-full bg-brand/15 text-[9px] font-semibold text-brand" title={l.assignedToName}>{iniciais(l.assignedToName)}</span>
								{/if}
								<Badge tone={TIER_TONE[sc.tier] as BadgeTone}>{sc.tier === 'quente' ? '🔥' : sc.score}</Badge>
							</div>
						</div>
						<div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-grey">
							{#if l.category}<span>{l.category}</span>{/if}
							<span class={l.hasWebsite ? 'text-success' : 'text-brand-danger'}>{l.hasWebsite ? 'tem site' : 'sem site'}</span>
							{#if l.phone}<span>{l.phone}</span>{/if}
						</div>
						{#if l.estimatedValue != null || l.nextContactAt}
							<div class="mt-2 flex items-center justify-between text-xs">
								<span class="font-medium text-navy">{l.estimatedValue != null ? formatCurrency(l.estimatedValue) : ''}</span>
								{#if l.nextContactAt}
									{@const f = followupInfo(l.nextContactAt)}
									<Badge tone={f.tone as BadgeTone}>⏰ {f.label}</Badge>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

{#if editing}
	<LeadDetailModal lead={editing} onClose={() => (editing = null)} onSaved={(l) => (editing = l)} />
{/if}
