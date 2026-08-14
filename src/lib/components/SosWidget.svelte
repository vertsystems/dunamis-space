<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import {
		SOS_ACEITA,
		SOS_MAX_H,
		SOS_MAX_IMAGENS,
		SOS_MAX_W,
		enviarImagensSos,
		removerImagensSos,
		validarEntrada
	} from '$lib/sosImagem';

	let {
		supabase,
		autorNome = null,
		autorEmail = null
	}: {
		supabase: SupabaseClient;
		autorNome?: string | null;
		autorEmail?: string | null;
	} = $props();

	let aberto = $state(false);
	let titulo = $state('');
	let descricao = $state('');
	let enviando = $state(false);
	let root = $state<HTMLElement | null>(null);

	// --- Prints do problema ---
	// Os arquivos ficam guardados aqui e só sobem junto com o chamado: quem
	// desiste no meio não deixa imagem órfã no Storage.
	type Anexo = { file: File; previa: string };
	let anexos = $state<Anexo[]>([]);
	let arquivoInput = $state<HTMLInputElement | null>(null);
	const podeAnexarMais = $derived(anexos.length < SOS_MAX_IMAGENS);

	function escolherArquivo(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const escolhidos = [...(input.files ?? [])];
		// Zera o input para que reescolher o MESMO arquivo dispare o change de novo.
		input.value = '';
		if (!escolhidos.length) return;

		const vagas = SOS_MAX_IMAGENS - anexos.length;
		if (escolhidos.length > vagas) {
			toast.error(
				vagas === 0
					? `Já são ${SOS_MAX_IMAGENS} imagens — remova uma para trocar.`
					: `Cabem mais ${vagas} ${vagas === 1 ? 'imagem' : 'imagens'} neste chamado.`
			);
		}

		for (const file of escolhidos.slice(0, vagas)) {
			const problema = validarEntrada(file);
			if (problema) {
				toast.error(`${file.name}: ${problema}`);
				continue;
			}
			anexos = [...anexos, { file, previa: URL.createObjectURL(file) }];
		}
	}

	function tirarImagem(previa: string) {
		URL.revokeObjectURL(previa);
		anexos = anexos.filter((a) => a.previa !== previa);
	}

	function limparAnexos() {
		for (const a of anexos) URL.revokeObjectURL(a.previa);
		anexos = [];
	}

	function limpar() {
		titulo = '';
		descricao = '';
		limparAnexos();
	}

	async function enviar(e: SubmitEvent) {
		e.preventDefault();
		const t = titulo.trim();
		if (!t) {
			toast.error('Descreva qual foi o problema.');
			return;
		}
		enviando = true;

		// As imagens sobem primeiro: sem URL, não adianta gravar o chamado.
		let imagens: string[] = [];
		if (anexos.length) {
			const r = await enviarImagensSos(
				supabase,
				anexos.map((a) => a.file)
			);
			if ('erro' in r) {
				enviando = false;
				toast.error(r.erro);
				return;
			}
			imagens = r.urls;
		}

		const { error } = await supabase.from('sos_chamados').insert({
			titulo: t,
			descricao: descricao.trim() || null,
			autor_nome: autorNome,
			autor_email: autorEmail,
			rota: page.url.pathname,
			imagens,
			// Espelho do primeiro print, para a tela funcionar mesmo que a migration
			// 0060 ainda não tenha rodado no banco.
			imagem_url: imagens[0] ?? null
		});
		if (error) {
			// Sem chamado, as imagens já enviadas não têm dono: tirar do Storage
			// agora evita o arquivo órfão que ninguém mais consegue achar.
			await removerImagensSos(supabase, imagens);
			enviando = false;
			toast.error('Não foi possível enviar. Tente novamente.');
			return;
		}
		enviando = false;
		limpar();
		aberto = false;
		toast.success('Chamado SOS enviado. A equipe foi avisada.');
		await invalidateAll(); // atualiza o badge de abertos na sidebar
	}

	function onWindowClick(e: MouseEvent) {
		if (aberto && root && !root.contains(e.target as Node)) aberto = false;
	}
</script>

<svelte:window
	onclick={onWindowClick}
	onkeydown={aberto ? (e) => e.key === 'Escape' && (aberto = false) : undefined}
/>

<div bind:this={root} class="fixed right-5 bottom-5 z-40 flex flex-col items-end gap-3">
	{#if aberto}
		<div
			class="w-[min(92vw,22rem)] overflow-hidden rounded-[var(--radius-xl)] border border-grey-200 bg-surface shadow-2xl"
			role="dialog"
			aria-label="Relatar um problema"
			transition:scale={{ start: 0.95, opacity: 0, duration: 180, easing: cubicOut }}
		>
			<div class="flex items-center justify-between gap-3 border-b border-grey-200 px-4 py-3">
				<div class="flex items-center gap-2">
					<span
						class="grid size-7 place-items-center rounded-lg bg-brand-danger/12 text-brand-danger"
					>
						<Icon name="lifebuoy" size={16} />
					</span>
					<h2 class="text-sm font-semibold text-navy">Relatar um problema</h2>
				</div>
				<button
					type="button"
					onclick={() => (aberto = false)}
					class="grid size-7 place-items-center rounded-lg text-grey transition-colors hover:bg-bg hover:text-navy"
					aria-label="Fechar"
				>
					<Icon name="x" size={16} />
				</button>
			</div>

			<form class="space-y-3 p-4" onsubmit={enviar}>
				<div>
					<label for="sos-titulo" class="mb-1 block text-xs font-medium text-navy"
						>Qual o problema?</label
					>
					<input
						id="sos-titulo"
						bind:value={titulo}
						maxlength="120"
						required
						placeholder="Ex.: erro ao salvar cliente"
						class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
					/>
				</div>
				<div>
					<label for="sos-desc" class="mb-1 block text-xs font-medium text-navy"
						>Descrição breve</label
					>
					<textarea
						id="sos-desc"
						bind:value={descricao}
						rows="3"
						maxlength="800"
						placeholder="O que você estava fazendo, o que aconteceu…"
						class="w-full resize-none rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
					></textarea>
				</div>
				<div>
					<span class="mb-1 block text-xs font-medium text-navy">
						Prints do problema
						{#if anexos.length}
							<span class="font-normal text-grey">({anexos.length}/{SOS_MAX_IMAGENS})</span>
						{/if}
					</span>
					<!-- Escondido: o botão abaixo é que abre o seletor, para o campo
					     nativo (feio e sem tradução) não aparecer no widget. -->
					<input
						bind:this={arquivoInput}
						type="file"
						accept={SOS_ACEITA}
						multiple
						onchange={escolherArquivo}
						class="hidden"
					/>
					{#if anexos.length}
						<div class="mb-2 flex flex-wrap gap-2">
							{#each anexos as a (a.previa)}
								<div class="relative">
									<img
										src={a.previa}
										alt="Prévia de {a.file.name}"
										class="size-16 rounded-[var(--radius)] border border-grey-200 object-cover"
									/>
									<button
										type="button"
										onclick={() => tirarImagem(a.previa)}
										title="Remover esta imagem"
										aria-label="Remover {a.file.name}"
										class="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-grey-200 bg-surface text-grey shadow-sm transition-colors hover:bg-brand-danger hover:text-white"
									>
										<Icon name="x" size={12} />
									</button>
								</div>
							{/each}
						</div>
					{/if}
					{#if podeAnexarMais}
						<button
							type="button"
							onclick={() => arquivoInput?.click()}
							class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-grey-200 text-xs font-medium text-grey transition-colors hover:border-brand hover:text-brand"
						>
							<Icon name="camera" size={15} />
							{anexos.length ? 'Anexar mais uma' : 'Anexar imagem (JPG, PNG)'}
						</button>
					{/if}
					<p class="mt-1 text-[0.68rem] text-grey">
						Até {SOS_MAX_IMAGENS} imagens. Cada uma vira WEBP de até {SOS_MAX_W}x{SOS_MAX_H}px antes de
						subir.
					</p>
				</div>
				<button
					type="submit"
					disabled={enviando}
					class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-brand-danger text-sm font-semibold text-white shadow-[0_2px_10px_-2px_rgba(240,68,56,0.5)] transition hover:brightness-[1.07] active:scale-[0.99] disabled:opacity-60"
				>
					{#if enviando}
						Enviando…
					{:else}
						<Icon name="lifebuoy" size={15} /> Enviar chamado
					{/if}
				</button>
			</form>
		</div>
	{/if}

	<button
		type="button"
		onclick={(e) => {
			e.stopPropagation();
			aberto = !aberto;
		}}
		aria-expanded={aberto}
		title="SOS — relatar um problema"
		class="inline-flex h-12 items-center gap-2 rounded-full bg-grey-200 pr-5 pl-4 font-bold text-slate shadow-sm ring-1 ring-grey-200 transition-all hover:scale-105 hover:bg-grey-200/80 active:scale-95 focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 focus-visible:outline-none"
	>
		<Icon name={aberto ? 'x' : 'lifebuoy'} size={20} />
		<span class="text-sm tracking-wide">SOS</span>
	</button>
</div>
