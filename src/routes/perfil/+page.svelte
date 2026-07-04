<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Card, Button, Input, Select } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import { FUNCAO, funcaoLabel } from '$lib/equipe';
	import { CORES_TEMA, COR_PADRAO, normalizaHex, escurece } from '$lib/tema';

	let { data } = $props();

	const colab = $derived(data.colab as Record<string, any> | null);

	// Iniciais do avatar (a partir do nome ou, na falta, do email).
	const iniciais = $derived.by(() => {
		const base = (colab?.nome || data.email || '?').trim();
		const p = base.split(/\s+/).filter(Boolean);
		const ini = p.length >= 2 ? p[0][0] + p[1][0] : base.slice(0, 2);
		return ini.toUpperCase();
	});

	// Métricas da agência (cards do topo).
	const stats = $derived([
		{ label: 'Tarefas atribuídas', value: data.metricas.tarefas, icon: 'check' },
		{ label: 'Projetos ativos', value: data.metricas.projetos, icon: 'folder' },
		{ label: 'Clientes ativos', value: data.metricas.clientes, icon: 'contact' }
	]);

	// --- Dados pessoais (form) — $state p/ os inputs não resetarem durante o save ---
	let nome = $state((colab?.nome as string) ?? '');
	let telefone = $state((colab?.telefone as string) ?? '');
	let local = $state((colab?.local as string) ?? '');
	let funcao = $state((colab?.funcao as string) ?? 'social_media');
	let salvando = $state(false);

	// --- Personalização: cor de destaque do sistema (só para este login) ---
	let corAtual = $state(normalizaHex(colab?.cor_tema) ?? COR_PADRAO);
	let salvandoCor = $state(false);

	function aplicarTema(hex: string) {
		const root = document.documentElement;
		root.style.setProperty('--color-brand', hex);
		root.style.setProperty('--ds-primary', hex);
		root.style.setProperty('--ds-primary-600', escurece(hex));
	}

	async function salvarCor(hex: string) {
		const cor = normalizaHex(hex);
		if (!cor || salvandoCor) return;
		corAtual = cor;
		aplicarTema(cor); // aplica no sistema inteiro na hora (sem reload)
		salvandoCor = true;
		const { error } = await data.supabase
			.from('colaboradores')
			.update({ cor_tema: cor })
			.eq('email', data.email);
		salvandoCor = false;
		if (error) toast.error('Não foi possível salvar a cor.');
		else toast.success('Cor do tema atualizada.');
	}

	// --- Preferências: idioma ---
	const IDIOMAS = [
		{ value: 'pt-BR', label: 'Português (Brasil)' },
		{ value: 'en-US', label: 'English (US)' },
		{ value: 'es-ES', label: 'Español' }
	];
	let idioma = $state((colab?.idioma as string) ?? 'pt-BR');
	async function salvarIdioma(valor: string) {
		idioma = valor;
		const { error } = await data.supabase
			.from('colaboradores')
			.update({ idioma: valor })
			.eq('email', data.email);
		if (error) toast.error('Não foi possível salvar o idioma.');
		else toast.success('Idioma atualizado.');
	}
</script>

<div class="mx-auto max-w-4xl space-y-4">
	<!-- Cabeçalho / identidade -->
	<div
		class="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-navy-900 to-navy p-6 shadow-lg"
	>
		<div class="flex items-center gap-4">
			<div
				class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10 text-2xl font-bold text-white ring-1 ring-white/15"
			>
				{#if colab?.avatar_url}
					<img src={colab.avatar_url} alt="" class="h-full w-full object-cover" />
				{:else}
					{iniciais}
				{/if}
			</div>
			<div class="min-w-0">
				<h1 class="truncate text-xl font-bold text-white">{colab?.nome || 'Usuário'}</h1>
				<p class="text-sm text-white/70">{funcaoLabel(colab?.funcao ?? '')}</p>
				<p class="truncate text-sm text-white/50">{data.email}</p>
			</div>
		</div>
	</div>

	<!-- Métricas da agência -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		{#each stats as s (s.label)}
			<Card>
				<div class="flex items-center justify-between gap-3">
					<div>
						<div class="text-2xl font-bold text-navy">{s.value}</div>
						<div class="text-sm text-grey">{s.label}</div>
					</div>
					<div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
						<Icon name={s.icon} size={18} />
					</div>
				</div>
			</Card>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<!-- Informações Pessoais -->
		<Card class="lg:col-span-2" padding="lg">
			<div class="mb-4 flex items-center gap-2">
				<Icon name="contact" size={18} class="text-brand" />
				<h2 class="text-base font-semibold text-navy">Informações Pessoais</h2>
			</div>

			<form
				method="POST"
				action="?/salvar"
				use:enhance={() => {
					salvando = true;
					return async ({ result, update }) => {
						salvando = false;
						await update({ reset: false });
						if (result.type === 'success') {
							toast.success('Perfil atualizado.');
							await invalidateAll();
						} else if (result.type === 'failure') {
							toast.error((result.data as any)?.error ?? 'Não foi possível salvar.');
						}
					};
				}}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<Input
						label="Nome Completo"
						name="nome"
						bind:value={nome}
						required
						wrapperClass="sm:col-span-2"
					/>

					<div class="sm:col-span-2">
						<label for="email-ro" class="mb-1.5 block text-sm font-medium text-navy">Email</label>
						<input
							id="email-ro"
							value={data.email}
							disabled
							class="h-10 w-full cursor-not-allowed rounded-[var(--radius)] border border-grey-200 bg-bg px-3.5 text-sm text-slate shadow-xs"
						/>
						<p class="mt-1 text-xs text-grey">O email é o seu login e não pode ser alterado.</p>
					</div>

					<Input label="Telefone" name="telefone" bind:value={telefone} placeholder="(11) 99999-9999" />
					<Input label="Localização" name="local" bind:value={local} placeholder="Cidade, UF" />

					<Select label="Cargo" name="funcao" bind:value={funcao} wrapperClass="sm:col-span-2">
						{#each FUNCAO as f (f.value)}
							<option value={f.value}>{f.label}</option>
						{/each}
					</Select>
				</div>

				<div class="mt-5 flex justify-end">
					<Button type="submit" loading={salvando}>Salvar alterações</Button>
				</div>
			</form>
		</Card>

		<!-- Personalização + Preferências -->
		<div class="flex flex-col gap-4">
			<Card padding="lg">
				<div class="mb-1 flex items-center gap-2">
					<Icon name="palette" size={18} class="text-brand" />
					<h2 class="text-base font-semibold text-navy">Personalização</h2>
				</div>
				<p class="mb-4 text-sm text-grey">
					Cor de destaque do sistema. Vale só para o seu login.
				</p>

				<div class="grid grid-cols-6 gap-2.5">
					{#each CORES_TEMA as c (c.hex)}
						<button
							type="button"
							title={c.nome}
							aria-label={c.nome}
							aria-pressed={corAtual === c.hex}
							onclick={() => salvarCor(c.hex)}
							class="relative grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:outline-none"
							style="background-color: {c.hex};"
						>
							{#if corAtual === c.hex}
								<Icon name="check" size={14} />
							{/if}
						</button>
					{/each}
				</div>

				<div class="mt-4 flex items-center gap-3">
					<label
						class="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-grey-200"
						style="background-color: {corAtual};"
						title="Cor personalizada"
					>
						<input
							type="color"
							value={corAtual}
							oninput={(e) => {
								corAtual = e.currentTarget.value.toLowerCase();
								aplicarTema(corAtual);
							}}
							onchange={(e) => salvarCor(e.currentTarget.value)}
							class="absolute -inset-2 cursor-pointer opacity-0"
						/>
					</label>
					<div>
						<div class="text-sm font-medium text-navy">Personalizada</div>
						<div class="text-xs tracking-wide text-grey uppercase">{corAtual}</div>
					</div>
				</div>
			</Card>

			<Card padding="lg">
				<div class="mb-4 flex items-center gap-2">
					<Icon name="settings" size={18} class="text-brand" />
					<h2 class="text-base font-semibold text-navy">Preferências</h2>
				</div>
				<Select
					label="Idioma"
					name="idioma"
					value={idioma}
					onchange={(e) => salvarIdioma(e.currentTarget.value)}
				>
					{#each IDIOMAS as l (l.value)}
						<option value={l.value}>{l.label}</option>
					{/each}
				</Select>
			</Card>
		</div>
	</div>
</div>
