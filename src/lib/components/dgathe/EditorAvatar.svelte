<script lang="ts">
	// Editor do avatar do DGathe (fica no Meu Perfil): as opções à esquerda, a
	// prévia viva à direita, e o botão de salvar. O desenho é o mesmo do jogo
	// (desenharBoneco), só que maior.
	import { onMount, untrack } from 'svelte';
	import { RotateCw, Footprints, Check } from '@lucide/svelte';
	import { Button } from '$lib/components/ui';
	import { desenharBoneco } from '$lib/dgathe/avatar';
	import {
		CORPOS,
		PELES,
		CABELOS,
		CORES_CABELO,
		ROUPAS,
		CORES_ROUPA,
		SAPATOS,
		OCULOS,
		iguais,
		type Aparencia
	} from '$lib/dgathe/aparencia';

	let {
		inicial,
		onsalvar
	}: {
		inicial: Aparencia;
		/** Grava e devolve se deu certo. */
		onsalvar: (a: Aparencia) => Promise<boolean>;
	} = $props();

	let a = $state<Aparencia>(untrack(() => ({ ...inicial })));
	let salvo = $state<Aparencia>(untrack(() => ({ ...inicial })));
	let salvando = $state(false);
	let costas = $state(false);
	let andando = $state(false);
	const mudou = $derived(!iguais(a, salvo));

	let tela: HTMLCanvasElement;

	onMount(() => {
		let raf = 0;
		const inicio = performance.now();
		const quadro = (agora: number) => {
			desenhar((agora - inicio) / 1000);
			raf = requestAnimationFrame(quadro);
		};
		raf = requestAnimationFrame(quadro);
		return () => cancelAnimationFrame(raf);
	});

	function desenhar(t: number) {
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
		const cy = h * 0.86;
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
		const k = Math.min(2.25, (h * 0.78) / 56);
		ctx.scale(k, k);
		const d = costas ? -1 : 1;
		desenharBoneco(ctx, { dirX: d, dirY: d, andando, fase: t * 10.5, t }, a);
		ctx.restore();
	}

	async function salvar() {
		if (!mudou || salvando) return;
		salvando = true;
		const copia = { ...a };
		const ok = await onsalvar(copia);
		salvando = false;
		if (ok) salvo = copia;
	}

	const gruposRoupa = ['Formal', 'Casual'] as const;
	const campo =
		'h-8 w-full rounded-lg border border-grey-200 bg-surface px-2 text-sm text-navy shadow-xs focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none';
	const rotulo = 'mb-1 block text-xs font-medium text-navy';
</script>

<div class="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
	<div class="space-y-3">
		<fieldset>
			<legend class={rotulo}>Personagem</legend>
			<div class="grid grid-cols-2 gap-0.5 rounded-lg bg-bg p-0.5">
				{#each CORPOS as c (c.id)}
					<button
						type="button"
						aria-pressed={a.corpo === c.id}
						onclick={() => (a.corpo = c.id)}
						class="rounded-md py-1 text-xs font-medium transition-colors {a.corpo === c.id
							? 'bg-surface text-navy shadow-sm'
							: 'text-grey hover:text-navy'}">{c.nome}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend class={rotulo}>Tom de pele</legend>
			<div class="flex flex-wrap gap-1.5">
				{#each PELES as p (p.id)}
					<button
						type="button"
						title={p.nome}
						aria-label={`Pele ${p.nome}`}
						aria-pressed={a.pele === p.id}
						onclick={() => (a.pele = p.id)}
						class="grid size-6 place-items-center rounded-full ring-offset-1 transition {a.pele === p.id
							? 'ring-2 ring-brand'
							: 'ring-1 ring-grey-200 hover:ring-brand/50'}"
						style="background-color: {p.cor};"
					></button>
				{/each}
			</div>
		</fieldset>

		<div>
			<label for="av-cabelo" class={rotulo}>Cabelo</label>
			<select id="av-cabelo" class={campo} bind:value={a.cabelo}>
				{#each CABELOS as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>

		<fieldset>
			<legend class={rotulo}>Cor do cabelo</legend>
			<div class="flex flex-wrap gap-1.5">
				{#each CORES_CABELO as c (c.id)}
					<button
						type="button"
						title={c.nome}
						aria-label={`Cabelo ${c.nome}`}
						aria-pressed={a.corCabelo === c.id}
						onclick={() => (a.corCabelo = c.id)}
						class="grid size-6 place-items-center rounded-full ring-offset-1 transition {a.corCabelo === c.id
							? 'ring-2 ring-brand'
							: 'ring-1 ring-grey-200 hover:ring-brand/50'}"
						style="background-color: {c.cor};"
					></button>
				{/each}
			</div>
		</fieldset>

		<div>
			<label for="av-roupa" class={rotulo}>Roupa</label>
			<select id="av-roupa" class={campo} bind:value={a.roupa}>
				{#each gruposRoupa as g (g)}
					<optgroup label={g === 'Formal' ? 'Formais' : 'Casuais'}>
						{#each ROUPAS.filter((r) => r.grupo === g) as r (r.id)}<option value={r.id}>{r.nome}</option>{/each}
					</optgroup>
				{/each}
			</select>
		</div>

		<fieldset>
			<legend class={rotulo}>Cor da roupa</legend>
			<div class="flex flex-wrap gap-1.5">
				{#each CORES_ROUPA as c (c.id)}
					<button
						type="button"
						title={c.nome}
						aria-label={`Roupa ${c.nome}`}
						aria-pressed={a.corRoupa === c.cor}
						onclick={() => (a.corRoupa = c.cor)}
						class="grid size-5 place-items-center rounded-md ring-offset-1 transition {a.corRoupa === c.cor
							? 'ring-2 ring-brand'
							: 'ring-1 ring-grey-200 hover:ring-brand/50'}"
						style="background-color: {c.cor};"
					>
						{#if a.corRoupa === c.cor}<Check size={11} class={c.id === 'branco' || c.id === 'bege' ? 'text-navy' : 'text-white'} />{/if}
					</button>
				{/each}
			</div>
		</fieldset>

		<div class="space-y-3">
			<div>
				<label for="av-sapato" class={rotulo}>Sapatos</label>
				<select id="av-sapato" class={campo} bind:value={a.sapato}>
					{#each SAPATOS as s (s.id)}<option value={s.id}>{s.nome}</option>{/each}
				</select>
			</div>
			<div>
				<label for="av-oculos" class={rotulo}>Óculos</label>
				<select id="av-oculos" class={campo} bind:value={a.oculos}>
					{#each OCULOS as o (o.id)}<option value={o.id}>{o.nome}</option>{/each}
				</select>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<canvas
			bind:this={tela}
			class="h-44 w-full rounded-xl ring-1 ring-grey-200"
			aria-label="Prévia do seu avatar no DGathe"
		></canvas>
		<div class="grid grid-cols-2 gap-1">
			<button
				type="button"
				onclick={() => (costas = !costas)}
				aria-pressed={costas}
				title={costas ? 'Ver de frente' : 'Ver de costas'}
				class="grid h-7 place-items-center rounded-lg text-grey ring-1 ring-grey-200 transition-colors hover:bg-bg hover:text-navy {costas
					? 'bg-bg text-navy'
					: ''}"
			>
				<RotateCw size={14} />
			</button>
			<button
				type="button"
				onclick={() => (andando = !andando)}
				aria-pressed={andando}
				title={andando ? 'Parar' : 'Ver andando'}
				class="grid h-7 place-items-center rounded-lg text-grey ring-1 ring-grey-200 transition-colors hover:bg-bg hover:text-navy {andando
					? 'bg-bg text-navy'
					: ''}"
			>
				<Footprints size={14} />
			</button>
		</div>
	</div>
</div>

<div class="mt-4 flex items-center justify-between gap-3">
	<p class="text-xs {mudou ? 'text-brand-brown' : 'text-grey'}">
		{mudou ? 'Alterações ainda não salvas' : 'É assim que você aparece no DGathe'}
	</p>
	<Button type="button" size="sm" loading={salvando} disabled={!mudou} onclick={salvar}>Salvar avatar</Button>
</div>
