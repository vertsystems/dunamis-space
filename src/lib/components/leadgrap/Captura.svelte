<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { Card, Button, Badge, Input } from '$lib/components/ui';
	import { Search, Plus, MapPin, X, Loader2 } from '@lucide/svelte';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import { toast } from '$lib/toast.svelte';
	import { CATEGORY_GROUPS, ALL_NICHES, TEMP_TONE, TEMP_LABEL } from '$lib/leadgrap/categorias';
	import type { BadgeTone } from '$lib/components/ui';

	let busca = $state('');
	let selecionados = new SvelteSet<string>(); // termos de busca (query)
	let custom = $state('');
	let localizacao = $state('');
	let geolocalizando = $state(false);
	let maxResults = $state(30);
	let enrich = $state(true);
	let iniciando = $state(false);

	const predefinidas = new Set(ALL_NICHES.map((n) => n.query));

	const gruposFiltrados = $derived.by(() => {
		const q = busca
			.trim()
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');
		if (!q) return CATEGORY_GROUPS;
		return CATEGORY_GROUPS.map((g) => ({
			...g,
			niches: g.niches.filter((n) =>
				n.label
					.toLowerCase()
					.normalize('NFD')
					.replace(/\p{Diacritic}/gu, '')
					.includes(q)
			)
		})).filter((g) => g.niches.length > 0);
	});

	const custosPersonalizados = $derived([...selecionados].filter((s) => !predefinidas.has(s)));

	function toggle(query: string) {
		if (selecionados.has(query)) selecionados.delete(query);
		else selecionados.add(query);
	}
	function addCustom() {
		const v = custom.trim();
		if (v.length >= 2) {
			selecionados.add(v);
			custom = '';
		}
	}

	async function usarMinhaLocalizacao() {
		if (!navigator.geolocation) {
			toast.error('Geolocalização indisponível neste navegador.');
			return;
		}
		geolocalizando = true;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const { latitude, longitude } = pos.coords;
					const r = await fetch(`/dtools/leadgrap/geocode?lat=${latitude}&lng=${longitude}`);
					const data = await r.json();
					if (data.label) localizacao = data.label;
					else toast.error('Não foi possível identificar o local.');
				} catch {
					toast.error('Falha ao buscar o local.');
				} finally {
					geolocalizando = false;
				}
			},
			() => {
				geolocalizando = false;
				toast.error('Permissão de localização negada.');
			}
		);
	}

	async function iniciar() {
		if (selecionados.size === 0) {
			toast.error('Selecione ao menos um nicho.');
			return;
		}
		const loc = localizacao.trim();
		const queries = [...selecionados].map((n) => (loc ? `${n} em ${loc}` : n));
		iniciando = true;
		await leadgrap.startCapture(queries, { maxResults, enrich });
		iniciando = false;
		selecionados.clear();
	}

	// Polling do progresso enquanto houver jobs ativos.
	const temAtivos = $derived(leadgrap.scrapeJobs.some((j) => j.status === 'queued' || j.status === 'running'));
	$effect(() => {
		if (!temAtivos) return;
		const t = setInterval(() => leadgrap.reloadJobs(), 2500);
		return () => clearInterval(t);
	});

	const jobsRecentes = $derived(leadgrap.scrapeJobs.slice(0, 8));

	function progresso(j: { status: string; found: number; saved: number }): number {
		if (j.status === 'done') return 100;
		if (j.found > 0) return Math.min(100, Math.round((j.saved / j.found) * 100));
		return 0;
	}
	function rotulo(j: { status: string; found: number; saved: number }): string {
		if (j.status === 'queued') return 'Na fila…';
		if (j.status === 'running') return j.found > 0 ? `Salvando ${j.saved}/${j.found}` : 'Buscando no Google Maps…';
		if (j.status === 'done') return `${j.saved} leads salvos`;
		if (j.status === 'cancelled') return `Cancelado · ${j.saved} leads`;
		return 'Erro na captura';
	}
	const STATUS_TONE: Record<string, BadgeTone> = {
		queued: 'neutral',
		running: 'info',
		done: 'success',
		cancelled: 'neutral',
		error: 'danger'
	};
</script>

<div class="space-y-4">
	<Card>
		<p class="text-sm text-grey">
			A captura roda no app <strong class="text-navy">LeadGrap local</strong> (Google Maps) e grava os
			leads direto aqui. Escolha os nichos, defina a região e inicie — os resultados aparecem em
			<strong class="text-navy">Leads</strong> conforme forem salvos.
		</p>
	</Card>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
		<!-- Nichos -->
		<Card>
			<div class="mb-3 flex items-center gap-2">
				<h3 class="text-sm font-semibold text-navy">Nichos</h3>
				<Badge tone="brand">{selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'}</Badge>
			</div>
			<div class="relative mb-3">
				<Search size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
				<input
					class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface pl-9 pr-3 text-sm text-navy-900 outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					placeholder="Buscar nicho…"
					bind:value={busca}
				/>
			</div>

			{#if custosPersonalizados.length}
				<div class="mb-3">
					<p class="mb-1.5 text-xs font-medium text-grey">Personalizados</p>
					<div class="flex flex-wrap gap-1.5">
						{#each custosPersonalizados as c (c)}
							<button class="inline-flex items-center gap-1 rounded-full border border-brand bg-brand px-2.5 py-1 text-xs font-semibold text-white" onclick={() => toggle(c)}>
								{c} <X size={12} />
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="max-h-[420px] space-y-4 overflow-y-auto pr-1">
				{#each gruposFiltrados as g (g.key)}
					<div>
						<div class="mb-1.5 flex items-center gap-2">
							<span class="text-xs font-semibold text-navy">{g.label}</span>
							<Badge tone={TEMP_TONE[g.temperature] as BadgeTone}>{TEMP_LABEL[g.temperature]}</Badge>
						</div>
						<div class="flex flex-wrap gap-1.5">
							{#each g.niches as n (n.key)}
								{@const sel = selecionados.has(n.query)}
								<button
									class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
									class:border-brand={sel}
									class:bg-brand={sel}
									class:text-white={sel}
									class:border-grey-200={!sel}
									class:text-slate={!sel}
									onclick={() => toggle(n.query)}
								>
									{n.label}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-3 flex gap-2 border-t border-grey-200 pt-3">
				<input
					class="h-9 flex-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 outline-none focus-visible:border-brand"
					placeholder="Nicho personalizado…"
					bind:value={custom}
					onkeydown={(e) => e.key === 'Enter' && addCustom()}
				/>
				<Button variant="secondary" size="sm" onclick={addCustom}><Plus size={15} /></Button>
			</div>
		</Card>

		<!-- Opções -->
		<Card>
			<h3 class="mb-3 text-sm font-semibold text-navy">Região &amp; opções</h3>
			<div class="space-y-4">
				<div>
					<Input label="Localização (cidade/bairro)" bind:value={localizacao} placeholder="Ex.: Goiânia, GO" />
					<button class="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" onclick={usarMinhaLocalizacao} disabled={geolocalizando}>
						{#if geolocalizando}<Loader2 size={13} class="animate-spin" />{:else}<MapPin size={13} />{/if}
						Usar minha localização
					</button>
				</div>

				<div>
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="font-medium text-navy">Máx. por nicho</span>
						<span class="text-grey">{maxResults}</span>
					</div>
					<input type="range" min="10" max="100" step="5" bind:value={maxResults} class="w-full accent-[var(--color-brand)]" />
				</div>

				<label class="flex items-start gap-2">
					<input type="checkbox" bind:checked={enrich} class="mt-0.5 size-4 accent-[var(--color-brand)]" />
					<span class="text-sm text-navy">E-mail e redes sociais
						<span class="block text-xs text-grey">Visita o site do lead — mais lento, porém mais completo.</span>
					</span>
				</label>

				<Button class="w-full" disabled={iniciando || selecionados.size === 0} onclick={iniciar}>
					{iniciando ? 'Enviando…' : 'Iniciar captura'}
				</Button>
			</div>
		</Card>
	</div>

	<!-- Progresso -->
	{#if jobsRecentes.length}
		<Card>
			<h3 class="mb-3 text-sm font-semibold text-navy">Capturas em andamento / recentes</h3>
			<div class="space-y-3">
				{#each jobsRecentes as j (j.id)}
					<div>
						<div class="mb-1 flex items-center justify-between gap-2 text-sm">
							<span class="min-w-0 truncate text-navy">“{j.query}”</span>
							<div class="flex shrink-0 items-center gap-2">
								<span class="text-xs text-grey">{rotulo(j)}</span>
								<Badge tone={STATUS_TONE[j.status] ?? 'neutral'}>{j.status}</Badge>
								{#if j.status === 'queued' || j.status === 'running'}
									<button class="text-xs text-grey hover:text-brand-danger" onclick={() => leadgrap.cancelJob(j.id)}>cancelar</button>
								{/if}
							</div>
						</div>
						<div class="h-1.5 overflow-hidden rounded-full bg-bg">
							<div
								class="h-full rounded-full transition-all duration-500"
								class:bg-brand={j.status === 'running' || j.status === 'queued'}
								class:bg-success={j.status === 'done'}
								class:bg-brand-danger={j.status === 'error'}
								class:animate-pulse={j.status === 'queued'}
								style="width: {j.status === 'queued' ? 100 : progresso(j)}%"
							></div>
						</div>
						{#if j.error}<p class="mt-1 text-xs text-brand-danger">{j.error}</p>{/if}
					</div>
				{/each}
			</div>
		</Card>
	{/if}
</div>
