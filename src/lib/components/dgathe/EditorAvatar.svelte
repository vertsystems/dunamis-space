<script lang="ts">
	// Avatar do DGathe (fica no Meu Perfil): em vez de montar peça a peça,
	// escolher um personagem pronto (pedido do Bruno, 10/11/2026: "só escolhendo
	// o sexo e clicando na cabecinha que gosta, e cada uma já é um avatar
	// completo"). A grade mostra a cabecinha de cada personagem do catálogo
	// (personagens.ts), desenhada com o mesmo desenho do jogo; a prévia mostra o
	// corpo inteiro andando do jeito dele, com o nome e a personalidade.
	//
	// Quem montou o avatar no editor antigo continua com ele (e o vê aqui como
	// "Seu avatar de hoje") até escolher um personagem.
	import { onMount, untrack } from 'svelte';
	import { RotateCw, Footprints, Bot } from '@lucide/svelte';
	import { Button } from '$lib/components/ui';
	import { desenharBoneco, desenharCabecinha } from '$lib/dgathe/avatar';
	import { ANDARES, andarDe, iguais, type Aparencia } from '$lib/dgathe/aparencia';
	import { GRUPOS, NOME_DO_GRUPO, personagemDe, personagensDoSexo, type Sexo } from '$lib/dgathe/personagens';

	let {
		inicial,
		onsalvar,
		agentes = new Map()
	}: {
		inicial: Aparencia;
		/** Grava e devolve se deu certo. */
		onsalvar: (a: Aparencia) => Promise<boolean>;
		/** Personagem → nomes dos agentes que já são ele (marca na grade, para não repetir). */
		agentes?: ReadonlyMap<string, string[]>;
	} = $props();

	const copia = (x: Aparencia): Aparencia => ({ ...x, detalhes: [...x.detalhes] });

	let a = $state<Aparencia>(untrack(() => copia(inicial)));
	let salvo = $state<Aparencia>(untrack(() => copia(inicial)));
	let sexo = $state<Sexo>(untrack(() => (inicial.corpo === 'feminino' ? 'feminino' : 'masculino')));
	let salvando = $state(false);
	let costas = $state(false);
	let andando = $state(true);

	/** O avatar montado no editor antigo (ou o padrão): fica na grade até a pessoa trocar. */
	const antigo = untrack(() => (personagemDe(inicial.personagem) ? null : copia(inicial)));

	const mudou = $derived(!iguais(a, salvo));
	const escolhido = $derived(personagemDe(a.personagem));
	const usadoPor = $derived(escolhido ? (agentes.get(escolhido.id) ?? []) : []);
	const grupos = $derived(
		// Na ordem de GRUPOS (personagens.ts): gente, fantasia, heróis e bichos de roupa
		GRUPOS.map((g) => ({ id: g, nome: NOME_DO_GRUPO[g], lista: personagensDoSexo(sexo).filter((p) => p.grupo === g) }))
			.filter((g) => g.lista.length)
	);
	const nomeDoAndar = (id: string) => (ANDARES.find((o) => o.id === id)?.nome ?? 'Normal').toLowerCase();

	let tela: HTMLCanvasElement;

	onMount(() => {
		let raf = 0;
		let ultimo = performance.now();
		let t = 0;
		let fase = 0;
		const quadro = (agora: number) => {
			const dt = Math.min(0.05, (agora - ultimo) / 1000);
			ultimo = agora;
			t += dt;
			// A passada no ritmo do jeito de andar do personagem (o mesmo do jogo)
			if (andando) fase += dt * 10.5 * andarDe(a.andar).cadencia;
			desenhar(t, fase);
			raf = requestAnimationFrame(quadro);
		};
		raf = requestAnimationFrame(quadro);
		return () => cancelAnimationFrame(raf);
	});

	function desenhar(t: number, fase: number) {
		const ctx = tela?.getContext('2d');
		if (!ctx) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = tela.clientWidth;
		const h = tela.clientHeight;
		if (tela.width !== Math.round(w * dpr) || tela.height !== Math.round(h * dpr)) {
			tela.width = Math.round(w * dpr);
			tela.height = Math.round(h * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const fundo = ctx.createLinearGradient(0, 0, 0, h);
		fundo.addColorStop(0, '#22382a');
		fundo.addColorStop(1, '#16241b');
		ctx.fillStyle = fundo;
		ctx.fillRect(0, 0, w, h);
		// Um ladrilho do escritório embaixo do boneco
		const cx = w / 2;
		const cy = h * 0.84;
		ctx.beginPath();
		ctx.moveTo(cx, cy - 18);
		ctx.lineTo(cx + 46, cy + 5);
		ctx.lineTo(cx, cy + 28);
		ctx.lineTo(cx - 46, cy + 5);
		ctx.closePath();
		ctx.fillStyle = '#e6dfd2';
		ctx.fill();
		ctx.save();
		ctx.translate(cx, cy + 5);
		// Cabe o chapéu mais alto e quem flutua (~68 px) sem cortar
		const k = Math.min(2.25, (h * 0.74) / 68, (w * 0.86) / 34);
		ctx.scale(k, k);
		const d = costas ? -1 : 1;
		desenharBoneco(ctx, { dirX: d, dirY: d, andando, fase, t }, a);
		ctx.restore();
	}

	/** Desenha a cabecinha de um personagem no canvas da grade (uma vez só: não anima). */
	function cabecinha(c: HTMLCanvasElement, aparencia: Aparencia) {
		const pinta = (x: Aparencia) => {
			const ctx = c.getContext('2d');
			if (!ctx) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const lado = c.clientWidth || 48;
			c.width = c.height = Math.round(lado * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, lado, lado);
			desenharCabecinha(ctx, x, lado / 2, lado / 2, lado / 2);
		};
		pinta(aparencia);
		return { update: pinta };
	}

	function escolher(x: Aparencia) {
		a = copia(x);
		andando = true;
	}

	async function salvar() {
		if (!mudou || salvando) return;
		salvando = true;
		const c = copia(a);
		const ok = await onsalvar(c);
		salvando = false;
		if (ok) salvo = c;
	}

	const quadrado =
		'relative block size-12 overflow-hidden rounded-full bg-[#e9eef5] ring-offset-2 ring-offset-surface transition focus-visible:outline-none';
</script>

<div class="grid gap-4 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
	<!-- Prévia: o corpo inteiro, andando do jeito do personagem -->
	<div class="flex gap-3 sm:flex-col">
		<div class="relative w-32 shrink-0 sm:w-full">
			<canvas
				bind:this={tela}
				class="h-48 w-full rounded-xl ring-1 ring-grey-200"
				aria-label={escolhido ? `Prévia do personagem ${escolhido.nome}` : 'Prévia do seu avatar no DGathe'}
			></canvas>
			<div class="absolute right-1.5 bottom-1.5 flex gap-1">
				<button
					type="button"
					onclick={() => (costas = !costas)}
					aria-pressed={costas}
					title={costas ? 'Ver de frente' : 'Ver de costas'}
					aria-label={costas ? 'Ver de frente' : 'Ver de costas'}
					class="grid size-7 place-items-center rounded-lg bg-white/15 text-white/85 backdrop-blur-sm transition-colors hover:bg-white/25 hover:text-white"
				>
					<RotateCw size={14} />
				</button>
				<button
					type="button"
					onclick={() => (andando = !andando)}
					aria-pressed={andando}
					title={andando ? 'Parar' : 'Ver andando'}
					aria-label={andando ? 'Parar' : 'Ver andando'}
					class="grid size-7 place-items-center rounded-lg backdrop-blur-sm transition-colors {andando
						? 'bg-white/90 text-navy'
						: 'bg-white/15 text-white/85 hover:bg-white/25 hover:text-white'}"
				>
					<Footprints size={14} />
				</button>
			</div>
		</div>

		<div class="min-w-0" aria-live="polite">
			{#if escolhido}
				<p class="text-[11px] font-medium tracking-wide text-grey uppercase">{NOME_DO_GRUPO[escolhido.grupo]}</p>
				<h3 class="text-sm font-semibold text-navy">{escolhido.nome}</h3>
				<p class="mt-1 text-xs leading-snug text-slate">{escolhido.personalidade}</p>
				<p class="mt-1.5 flex items-center gap-1 text-xs text-grey">
					<Footprints size={12} class="shrink-0" /> Anda {nomeDoAndar(escolhido.andar)}
				</p>
				{#if usadoPor.length}
					<p class="mt-1.5 flex items-start gap-1 text-xs text-[#6d4bd8]">
						<Bot size={13} class="mt-px shrink-0" />
						<span>Também é o agente {usadoPor.join(', ')}.</span>
					</p>
				{/if}
			{:else}
				<p class="text-[11px] font-medium tracking-wide text-grey uppercase">Atual</p>
				<h3 class="text-sm font-semibold text-navy">Seu avatar de hoje</h3>
				<p class="mt-1 text-xs leading-snug text-slate">
					Montado peça a peça. Para trocar, escolha um personagem pronto.
				</p>
			{/if}
		</div>
	</div>

	<!-- Escolha: o sexo e a cabecinha -->
	<div class="min-w-0 space-y-3">
		<div class="grid grid-cols-2 gap-0.5 rounded-lg bg-bg p-0.5" role="group" aria-label="Sexo do personagem">
			{#each [{ id: 'masculino', nome: 'Masculino' }, { id: 'feminino', nome: 'Feminino' }] as s (s.id)}
				<button
					type="button"
					aria-pressed={sexo === s.id}
					onclick={() => (sexo = s.id as Sexo)}
					class="rounded-md py-1 text-xs font-medium transition-colors {sexo === s.id
						? 'bg-surface text-navy shadow-sm'
						: 'text-grey hover:text-navy'}">{s.nome}</button
				>
			{/each}
		</div>

		{#if antigo && antigo.corpo === sexo}
			<div>
				<p class="mb-1.5 text-xs font-medium text-navy">Atual</p>
				<button
					type="button"
					onclick={() => escolher(antigo)}
					aria-pressed={!escolhido}
					aria-label="Seu avatar de hoje"
					title="Seu avatar de hoje"
					class="{quadrado} {!escolhido ? 'ring-2 ring-brand' : 'ring-1 ring-grey-200 hover:ring-2 hover:ring-brand/40'}"
				>
					<canvas use:cabecinha={antigo} class="size-full"></canvas>
				</button>
			</div>
		{/if}

		{#each grupos as g (g.id)}
			<div>
				<p class="mb-1.5 text-xs font-medium text-navy">{g.nome}</p>
				<div class="flex flex-wrap gap-2">
					{#each g.lista as p (p.id)}
						{@const sel = a.personagem === p.id}
						{@const deAgente = agentes.get(p.id)}
						<button
							type="button"
							onclick={() => escolher(p.aparencia)}
							aria-pressed={sel}
							aria-label={p.nome + (deAgente?.length ? ` (agente ${deAgente.join(', ')})` : '')}
							title={p.nome + (deAgente?.length ? ` · agente ${deAgente.join(', ')}` : '')}
							class="{quadrado} {sel ? 'ring-2 ring-brand' : 'ring-1 ring-grey-200 hover:ring-2 hover:ring-brand/40'}"
						>
							<canvas use:cabecinha={p.aparencia} class="size-full"></canvas>
							{#if deAgente?.length}
								<span
									class="absolute right-0 bottom-0 grid size-4 place-items-center rounded-full bg-[#8b5cf6] text-white ring-2 ring-surface"
									aria-hidden="true"><Bot size={10} /></span
								>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4 flex items-center justify-between gap-3">
	<p class="text-xs {mudou ? 'text-brand-brown' : 'text-grey'}">
		{mudou ? 'Escolha ainda não salva' : 'É assim que você aparece no DGathe'}
	</p>
	<Button type="button" size="sm" loading={salvando} disabled={!mudou} onclick={salvar}>Salvar avatar</Button>
</div>
