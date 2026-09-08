<script lang="ts">
	import { untrack } from 'svelte';
	import { FUNCAO } from '$lib/equipe';
	import { DIAS } from '$lib/rotina';
	import { JORNADA_PADRAO } from '$lib/ponto';
	import { Input, Checkbox, FormShell } from '$lib/components/ui';

	let {
		colaborador = null,
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		colaborador?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	const v = (k: string) => colaborador?.[k] ?? '';

	// Jornada: o banco guarda minutos, a conversa é em horas por dia.
	const jornadaHoras = untrack(
		() => Math.round(((colaborador?.jornada_minutos ?? JORNADA_PADRAO.minutos) / 60) * 100) / 100
	);
	const jornadaDias: number[] = untrack(() =>
		colaborador?.jornada_dias?.length ? colaborador.jornada_dias : JORNADA_PADRAO.dias
	);
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} cancelHref="/equipe">
	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Input label="Nome *" name="nome" required value={v('nome')} wrapperClass="md:col-span-6" />
		<Input label="E-mail *" type="email" name="email" required value={v('email')} wrapperClass="md:col-span-6" />

		<Input label="Custo por hora (R$)" type="number" step="0.01" name="custo_hora" value={v('custo_hora')} wrapperClass="md:col-span-6" />

		<div class="md:col-span-12">
			<span class="block text-sm font-medium text-navy mb-1.5">Funções</span>
			<div class="flex flex-wrap gap-1.5">
				{#each FUNCAO as f (f.value)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="funcoes"
							value={f.value}
							checked={(colaborador?.funcoes ?? (colaborador?.funcao ? [colaborador.funcao] : [])).includes(f.value)}
							class="peer sr-only"
						/>
						<span
							class="inline-flex rounded-full bg-bg px-3.5 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-grey-200/70 peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"
							>{f.label}</span
						>
					</label>
				{/each}
			</div>
		</div>

		<!-- Jornada: base do saldo de horas e das faltas no módulo de Ponto. -->
		<input type="hidden" name="jornada_form" value="1" />
		<Input
			label="Jornada (horas por dia)"
			type="number"
			step="0.5"
			min="0"
			max="24"
			name="jornada_horas"
			value={jornadaHoras}
			wrapperClass="md:col-span-6"
		/>

		<div class="md:col-span-6">
			<span class="mb-1.5 block text-sm font-medium text-navy">Dias de trabalho</span>
			<div class="flex flex-wrap gap-1.5">
				{#each DIAS as d (d.idx)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="jornada_dias"
							value={d.idx}
							checked={jornadaDias.includes(d.idx)}
							class="peer sr-only"
						/>
						<span
							class="inline-flex rounded-full bg-bg px-3 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-grey-200/70 peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"
							>{d.curto}</span
						>
					</label>
				{/each}
			</div>
		</div>

		<div class="md:col-span-12">
			<Checkbox label="Ativo" name="ativo" checked={colaborador ? !!colaborador.ativo : true} />
		</div>
	</div>
</FormShell>
