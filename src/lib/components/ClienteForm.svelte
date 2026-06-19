<script lang="ts">
	import { enhance } from '$app/forms';
	import { CLIENTE_STATUS } from '$lib/clientes';

	let {
		cliente = null,
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		cliente?: Record<string, any> | null;
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);

	const v = (k: string) => cliente?.[k] ?? '';
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	{#if error}<div class="alert alert-danger">{error}</div>{/if}

	<div class="row g-3">
		<div class="col-md-8">
			<label class="form-label" for="nome">Nome *</label>
			<input id="nome" class="form-control" name="nome" required value={v('nome')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="status">Status</label>
			<select class="form-select" id="status" name="status" value={cliente?.status ?? 'lead'}>
				{#each CLIENTE_STATUS as s (s.value)}
					<option value={s.value}>{s.label}</option>
				{/each}
			</select>
		</div>

		<div class="col-md-6">
			<label class="form-label" for="razao_social">Razão social</label>
			<input id="razao_social" class="form-control" name="razao_social" value={v('razao_social')} />
		</div>
		<div class="col-md-6">
			<label class="form-label" for="cnpj_cpf">CNPJ / CPF</label>
			<input id="cnpj_cpf" class="form-control" name="cnpj_cpf" value={v('cnpj_cpf')} />
		</div>

		<div class="col-md-4">
			<label class="form-label" for="contato_nome">Contato</label>
			<input id="contato_nome" class="form-control" name="contato_nome" value={v('contato_nome')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="contato_email">E-mail do contato</label>
			<input id="contato_email" class="form-control" type="email" name="contato_email" value={v('contato_email')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="contato_whatsapp">WhatsApp</label>
			<input id="contato_whatsapp" class="form-control" name="contato_whatsapp" value={v('contato_whatsapp')} />
		</div>

		<div class="col-md-4">
			<label class="form-label" for="responsavel_id">Responsável</label>
			<select class="form-select" id="responsavel_id" name="responsavel_id" value={cliente?.responsavel_id ?? ''}>
				<option value="">—</option>
				{#each colaboradores as col (col.id)}
					<option value={col.id}>{col.nome}</option>
				{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="segmento">Segmento</label>
			<input id="segmento" class="form-control" name="segmento" value={v('segmento')} />
		</div>
		<div class="col-md-2">
			<label class="form-label" for="data_inicio">Início</label>
			<input id="data_inicio" class="form-control" type="date" name="data_inicio" value={v('data_inicio')} />
		</div>
		<div class="col-md-2">
			<label class="form-label" for="mrr">MRR (R$)</label>
			<input id="mrr" class="form-control" type="number" step="0.01" name="mrr" value={v('mrr')} />
		</div>

		<div class="col-12">
			<label class="form-label" for="observacoes">Observações</label>
			<textarea id="observacoes" class="form-control" name="observacoes" rows="3">{v('observacoes')}</textarea>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/clientes">Cancelar</a>
	</div>
</form>
