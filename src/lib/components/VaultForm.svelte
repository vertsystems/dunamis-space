<script lang="ts">
	// Formulário de um acesso do cofre do cliente (criar/editar em modal, padrão
	// do sistema). Submete nativamente para as actions vault_* de /cadastro/[id].
	import { enhance } from '$app/forms';
	import { Button, Input, Textarea } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';
	import { Eye, EyeOff } from '@lucide/svelte';
	import { VAULT_CATEGORIAS } from '$lib/vault';
	import type { VaultItem } from '$lib/vault';

	let {
		item = null,
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		item?: VaultItem | Record<string, unknown> | null;
		colaboradores?: {
			id: string;
			nome: string;
			avatar_url?: string | null;
			funcao?: string | null;
			funcoes?: string[] | null;
		}[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		onCancel?: () => void;
		onDone?: () => void;
	} = $props();

	let saving = $state(false);
	let vendo = $state(false);
	const v = (k: string) => (item?.[k as keyof typeof item] as string | null) ?? '';
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
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
		<div
			role="alert"
			class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger"
		>
			{error}
		</div>
	{/if}

	{#if item?.id}
		<input type="hidden" name="id" value={item.id as string} />
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
		<Input
			label="Nome do acesso *"
			name="titulo"
			required
			placeholder="Instagram, Meta Business, Google Ads…"
			value={v('titulo')}
			wrapperClass="md:col-span-7"
		/>
		<Input
			label="Categoria"
			name="categoria"
			list="vault-categorias"
			value={v('categoria')}
			wrapperClass="md:col-span-5"
		/>
		<datalist id="vault-categorias">
			{#each VAULT_CATEGORIAS as c (c)}<option value={c}></option>{/each}
		</datalist>

		<Input
			label="Endereço (URL)"
			name="url"
			placeholder="business.facebook.com"
			value={v('url')}
			wrapperClass="md:col-span-12"
		/>

		<Input
			label="Login / usuário"
			name="login"
			value={v('login')}
			wrapperClass="md:col-span-6"
		/>

		<!-- Campo de senha com olho: digitar às cegas é o jeito mais fácil de
		     guardar a senha errada no cofre. -->
		<div class="md:col-span-6">
			<label for="vault-senha" class="mb-1.5 block text-sm font-medium text-navy">Senha</label>
			<div class="relative">
				<input
					id="vault-senha"
					name="senha"
					type={vendo ? 'text' : 'password'}
					autocomplete="off"
					value={v('senha')}
					class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 pr-10 text-sm text-navy-900 shadow-xs transition-colors placeholder:text-grey/90 hover:border-grey focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
				/>
				<button
					type="button"
					class="absolute right-1 top-1 grid size-8 place-items-center rounded-[var(--radius-sm)] text-grey transition-colors hover:bg-bg hover:text-navy"
					aria-label={vendo ? 'Ocultar senha' : 'Mostrar senha'}
					onclick={() => (vendo = !vendo)}
				>
					{#if vendo}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
				</button>
			</div>
		</div>

		<Textarea
			label="Observações"
			name="observacoes"
			rows={3}
			placeholder="2FA, e-mail de recuperação, qual perfil usar…"
			value={v('observacoes')}
			wrapperClass="md:col-span-12"
		/>

		<ResponsavelPicker
			{colaboradores}
			name="responsavel_id"
			label="Quem cuida deste acesso"
			value={(item?.responsavel_id as string | null) ?? null}
			wrapperClass="md:col-span-12"
		/>
	</div>

	<div class="mt-5 flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={() => onCancel?.()}>Cancelar</Button>
		<Button type="submit" loading={saving}>{submitLabel}</Button>
	</div>
</form>
