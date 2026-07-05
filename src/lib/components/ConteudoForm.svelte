<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { CONTEUDO_TIPO, CONTEUDO_STATUS_GRUPOS, CONTEUDO_STATUS_PADRAO, CONTEUDO_REDE } from '$lib/conteudo';
	import { Button, Input, Select, Textarea, Checkbox } from '$lib/components/ui';

	let {
		conteudo = null,
		clientes = [],
		projetos = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone,
		onDelete
	}: {
		conteudo?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		projetos?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
		/** Se fornecido, mostra o botão "Excluir conteúdo" (edição). */
		onDelete?: () => void;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => conteudo?.[k] ?? '';

	// Grade de horários selecionáveis (30 em 30 min) — publicar é "só selecionar".
	const HORAS = Array.from({ length: 48 }, (_, i) => {
		const h = Math.floor(i / 2);
		const m = i % 2 === 0 ? '00' : '30';
		return `${String(h).padStart(2, '0')}:${m}`;
	});

	// Renderiza o instante armazenado (UTC) como data/hora LOCAL, reativo a `conteudo`
	// (ex.: revalidação após erro). A recombinação p/ UTC acontece no cliente, dentro
	// do use:enhance (o fuso do servidor Vercel é UTC).
	const dataPubLocal = $derived.by(() => {
		if (!conteudo?.data_publicacao) return '';
		const d = new Date(conteudo.data_publicacao);
		if (isNaN(d.getTime())) return '';
		return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
	});
	const dataParte = $derived(dataPubLocal ? dataPubLocal.slice(0, 10) : '');
	const horaParte = $derived(dataPubLocal ? dataPubLocal.slice(11, 16) : '');
	// Garante que um horário fora da grade (ex.: 09:17 de um post antigo) apareça na lista.
	const horasOpcoes = $derived(
		horaParte && !HORAS.includes(horaParte) ? [...HORAS, horaParte].sort() : HORAS
	);
</script>

<form
	method="POST"
	{action}
	use:enhance={({ formData }) => {
		// Combina data + hora (local) em um instante UTC antes de enviar.
		const d = formData.get('_data');
		const h = formData.get('_hora');
		formData.delete('_data');
		formData.delete('_hora');
		if (typeof d === 'string' && d) {
			const hora = typeof h === 'string' && h ? h : '09:00';
			const dt = new Date(`${d}T${hora}`);
			formData.set('data_publicacao', isNaN(dt.getTime()) ? '' : dt.toISOString());
		} else {
			formData.set('data_publicacao', '');
		}
		saving = true;
		return async ({ result, update }) => {
			if (onDone && (result.type === 'success' || result.type === 'redirect')) {
				saving = false;
				onDone();
				return;
			}
			await update();
			saving = false;
		};
	}}
>
	{#if error}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{error}</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Select label="Cliente *" name="cliente_id" required value={conteudo?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="" disabled>Selecione um cliente</option>
			{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Select label="Status" name="status" value={conteudo?.status ?? CONTEUDO_STATUS_PADRAO} wrapperClass="md:col-span-6">
			{#each CONTEUDO_STATUS_GRUPOS as g (g.grupo)}
				<optgroup label={g.grupo}>
					{#each g.itens as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
				</optgroup>
			{/each}
		</Select>

		<Input label="Título" name="titulo" value={v('titulo')} wrapperClass="md:col-span-6" />
		<Input label="Data de publicação" type="date" name="_data" value={dataParte} wrapperClass="md:col-span-4" />
		<Select label="Horário" name="_hora" value={horaParte} wrapperClass="md:col-span-2">
			<option value="">--:--</option>
			{#each horasOpcoes as hora (hora)}<option value={hora}>{hora}</option>{/each}
		</Select>

		<div class="md:col-span-12">
			<span class="block text-sm font-medium text-navy mb-1.5">Tipo</span>
			<div class="flex flex-wrap gap-1.5">
				{#each CONTEUDO_TIPO as t (t.value)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="tipos"
							value={t.value}
							checked={(conteudo?.tipos ?? (conteudo?.tipo ? [conteudo.tipo] : ['feed'])).includes(t.value)}
							class="peer sr-only"
						/>
						<span
							class="inline-flex rounded-full bg-bg px-3.5 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-grey-200/70 peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"
							>{t.label}</span
						>
					</label>
				{/each}
			</div>
		</div>

		<div class="md:col-span-12">
			<span class="block text-sm font-medium text-navy mb-1.5">Redes sociais</span>
			<div class="flex flex-wrap gap-1.5">
				{#each CONTEUDO_REDE as r (r.value)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="redes"
							value={r.value}
							checked={(conteudo?.redes ?? []).includes(r.value)}
							class="peer sr-only"
						/>
						<span
							class="inline-flex rounded-full bg-bg px-3.5 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-grey-200/70 peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"
							>{r.label}</span
						>
					</label>
				{/each}
			</div>
		</div>

		<Select label="Projeto" name="projeto_id" value={conteudo?.projeto_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each projetos as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
		</Select>
		<Select label="Responsável" name="responsavel_id" value={conteudo?.responsavel_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Input label="URL da arte" name="arte_url" value={v('arte_url')} placeholder="link do Drive/imagem" wrapperClass="md:col-span-4" />

		<Textarea label="Legenda" name="legenda" rows={4} value={v('legenda')} wrapperClass="md:col-span-12" />

		<div class="md:col-span-12">
			<Checkbox label="Postado manualmente" name="publicado_manual" checked={!!conteudo?.publicado_manual} />
		</div>
	</div>

	<div class="flex items-center gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => (onCancel ? onCancel() : goto('/conteudo'))}>Cancelar</Button>
		{#if onDelete}
			<Button variant="danger" type="button" onclick={onDelete} class="ml-auto">Excluir conteúdo</Button>
		{/if}
	</div>
</form>
