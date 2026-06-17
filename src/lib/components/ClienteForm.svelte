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
	{#if error}
		<div class="notification is-danger is-light">{error}</div>
	{/if}

	<div class="columns is-multiline">
		<div class="column is-8">
			<div class="field">
				<label class="label" for="nome">Nome *</label>
				<div class="control">
					<input id="nome" class="input" name="nome" required value={v('nome')} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="status">Status</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="status" name="status" value={cliente?.status ?? 'lead'}>
							{#each CLIENTE_STATUS as s (s.value)}
								<option value={s.value}>{s.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-6">
			<div class="field">
				<label class="label" for="razao_social">Razão social</label>
				<div class="control">
					<input id="razao_social" class="input" name="razao_social" value={v('razao_social')} />
				</div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="cnpj_cpf">CNPJ / CPF</label>
				<div class="control">
					<input id="cnpj_cpf" class="input" name="cnpj_cpf" value={v('cnpj_cpf')} />
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="contato_nome">Contato</label>
				<div class="control">
					<input id="contato_nome" class="input" name="contato_nome" value={v('contato_nome')} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="contato_email">E-mail do contato</label>
				<div class="control">
					<input
						id="contato_email"
						class="input"
						type="email"
						name="contato_email"
						value={v('contato_email')}
					/>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="contato_whatsapp">WhatsApp</label>
				<div class="control">
					<input
						id="contato_whatsapp"
						class="input"
						name="contato_whatsapp"
						value={v('contato_whatsapp')}
					/>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="responsavel_id">Responsável</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="responsavel_id" name="responsavel_id" value={cliente?.responsavel_id ?? ''}>
							<option value="">—</option>
							{#each colaboradores as col (col.id)}
								<option value={col.id}>{col.nome}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="segmento">Segmento</label>
				<div class="control">
					<input id="segmento" class="input" name="segmento" value={v('segmento')} />
				</div>
			</div>
		</div>
		<div class="column is-2">
			<div class="field">
				<label class="label" for="data_inicio">Início</label>
				<div class="control">
					<input id="data_inicio" class="input" type="date" name="data_inicio" value={v('data_inicio')} />
				</div>
			</div>
		</div>
		<div class="column is-2">
			<div class="field">
				<label class="label" for="mrr">MRR (R$)</label>
				<div class="control">
					<input id="mrr" class="input" type="number" step="0.01" name="mrr" value={v('mrr')} />
				</div>
			</div>
		</div>

		<div class="column is-12">
			<div class="field">
				<label class="label" for="observacoes">Observações</label>
				<div class="control">
					<textarea id="observacoes" class="textarea" name="observacoes" rows="3">{v('observacoes')}</textarea>
				</div>
			</div>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control">
			<button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button>
		</div>
		<div class="control">
			<a class="button is-light" href="/clientes">Cancelar</a>
		</div>
	</div>
</form>
