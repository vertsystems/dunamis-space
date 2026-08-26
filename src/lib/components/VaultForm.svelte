<script lang="ts">
	// Formulário de um acesso do cofre do cliente (criar/editar em modal, padrão
	// do sistema). Submete nativamente para as actions vault_* de /cadastro/[id].
	import { Input, Select, FormShell, RichText } from '$lib/components/ui';
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

	let vendo = $state(false);
	const v = (k: string) => (item?.[k as keyof typeof item] as string | null) ?? '';

	// Categoria: lista fechada + o valor que já estava gravado, caso tenha sido
	// escrito à mão antes desta tela virar <select> (senão salvar aqui o apagaria).
	const categoriaAtual = $derived(v('categoria'));
	const categorias = $derived(
		categoriaAtual && !VAULT_CATEGORIAS.includes(categoriaAtual)
			? [categoriaAtual, ...VAULT_CATEGORIAS]
			: VAULT_CATEGORIAS
	);

	// O editor é contenteditable: o HTML viaja num campo escondido para a action
	// receber `observacoes` como qualquer outro campo do formulário.
	let observacoes = $state(((item?.observacoes as string | null) ?? '') as string);
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} footerClass="mt-5">
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
		<Select
			label="Categoria"
			name="categoria"
			value={categoriaAtual}
			wrapperClass="md:col-span-5"
		>
			<option value="">— sem categoria —</option>
			{#each categorias as c (c)}<option value={c}>{c}</option>{/each}
		</Select>

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

		<div class="md:col-span-12">
			<span class="mb-1.5 block text-sm font-medium text-navy">Observações</span>
			<RichText
				value={(item?.observacoes as string | null) ?? ''}
				placeholder="2FA, e-mail de recuperação, links de painel, qual perfil usar…"
				minHeight={220}
				alturaColapsada={420}
				onSave={(html) => (observacoes = html)}
			/>
			<input type="hidden" name="observacoes" value={observacoes} />
		</div>

		<ResponsavelPicker
			{colaboradores}
			name="responsavel_id"
			label="Quem cuida deste acesso"
			value={(item?.responsavel_id as string | null) ?? null}
			wrapperClass="md:col-span-12"
		/>
	</div>
</FormShell>
