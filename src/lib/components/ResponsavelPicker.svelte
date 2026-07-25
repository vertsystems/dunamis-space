<script lang="ts">
	// Seletor de responsável em "tiles": foto (bolinha) + nome + bandeirinha do cargo.
	// Single (radio, name padrão responsavel_id) ou múltiplo (checkbox). Submete
	// nativamente via <input> — sem estado JS. Passe colaboradores com
	// avatar_url/funcao/funcoes para as fotos e bandeirinhas aparecerem.
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import { iniciais } from '$lib/crm';
	import { funcoesDe } from '$lib/equipe';

	type Colab = {
		id: string;
		nome: string;
		avatar_url?: string | null;
		funcao?: string | null;
		funcoes?: string[] | null;
	};

	let {
		colaboradores = [],
		name = 'responsavel_id',
		value = null,
		values = null,
		multiple = false,
		label = 'Responsável',
		wrapperClass = ''
	}: {
		colaboradores?: Colab[];
		name?: string;
		/** Seleção única (id) — usado quando multiple=false. */
		value?: string | null;
		/** Seleção múltipla (ids) — usado quando multiple=true. */
		values?: string[] | null;
		multiple?: boolean;
		label?: string;
		wrapperClass?: string;
	} = $props();

	const selecionados = $derived(
		multiple
			? values?.length
				? values
				: value
					? [value]
					: []
			: value
				? [value]
				: values?.length
					? [values[0]]
					: []
	);

	// Cor determinística do avatar (fallback sem foto), igual ao resto do app.
	const CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function cor(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return CORES[h % CORES.length];
	}

	const tile =
		'inline-flex items-center gap-1.5 rounded-full border border-grey-200 bg-bg px-2.5 py-1 text-sm font-medium text-slate transition-colors hover:bg-grey-200/60 peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-navy peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30';
</script>

<!-- fieldset/legend: agrupa os radios/checkboxes, então o leitor de tela anuncia
     "Responsável" antes de cada opção (antes o rótulo era um <span> solto). -->
<fieldset class="min-w-0 {wrapperClass}">
	{#if label}<legend class="mb-1.5 block text-sm font-medium text-navy">{label}</legend>{/if}
	<div class="flex flex-wrap gap-1.5">
		{#if !multiple}
			<label class="cursor-pointer">
				<input type="radio" {name} value="" checked={selecionados.length === 0} class="peer sr-only" />
				<span class={tile}>—</span>
			</label>
		{/if}
		{#each colaboradores as col (col.id)}
			<label class="cursor-pointer">
				<input
					type={multiple ? 'checkbox' : 'radio'}
					{name}
					value={col.id}
					checked={selecionados.includes(col.id)}
					class="peer sr-only"
				/>
				<span class={tile}>
					{#if col.avatar_url}
						<!-- alt="" — o nome já vem no <span> ao lado; com alt={col.nome} era lido duas vezes. -->
						<img src={col.avatar_url} alt="" class="size-5 shrink-0 rounded-full object-cover" />
					{:else}
						<span
							class="grid size-5 shrink-0 place-items-center rounded-full text-[0.55rem] font-semibold text-white {cor(col.nome)}"
							>{iniciais(col.nome)}</span
						>
					{/if}
					<span>{col.nome}</span>
					{#each funcoesDe(col) as f (f)}<CargoBadge funcao={f} />{/each}
				</span>
			</label>
		{/each}
		{#if !colaboradores.length}
			<span class="text-sm text-grey">Nenhum colaborador ativo.</span>
		{/if}
	</div>
</fieldset>
