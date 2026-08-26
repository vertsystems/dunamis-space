<script lang="ts">
	// Um login de dentro de um serviço: a loja/unidade e suas credenciais.
	// Vive sob a permissão do cofre ('vault'), não a do serviço.
	import { Input, Textarea, FormShell } from '$lib/components/ui';
	import { Eye, EyeOff } from '@lucide/svelte';
	import type { ServicoAcesso } from '$lib/servicos';

	let {
		item = null,
		servicoId,
		servicoNome = '',
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		item?: ServicoAcesso | Record<string, unknown> | null;
		servicoId: string;
		servicoNome?: string;
		error?: string | null;
		submitLabel?: string;
		action?: string;
		onCancel?: () => void;
		onDone?: () => void;
	} = $props();

	let vendo = $state(false);
	const v = (k: string) => (item?.[k as keyof typeof item] as string | null) ?? '';
	// `id` único por serviço: a tela pode ter vários formulários montados.
	const senhaId = $derived(`servico-acesso-senha-${servicoId}`);
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} footerClass="mt-5">
	{#if item?.id}
		<input type="hidden" name="id" value={item.id as string} />
	{/if}
	<input type="hidden" name="servico_id" value={servicoId} />

	{#if servicoNome}
		<p class="mb-4 text-sm text-grey">
			Login de <strong class="font-medium text-navy">{servicoNome}</strong>.
		</p>
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
		<Input
			label="Unidade / loja *"
			name="rotulo"
			required
			placeholder="Loja Centro, Matriz, Depósito…"
			value={v('rotulo')}
			wrapperClass="md:col-span-12"
		/>

		<Input label="Login / usuário" name="login" value={v('login')} wrapperClass="md:col-span-6" />

		<div class="md:col-span-6">
			<label for={senhaId} class="mb-1.5 block text-sm font-medium text-navy">Senha</label>
			<div class="relative">
				<input
					id={senhaId}
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

		<Input
			label="Endereço próprio (opcional)"
			name="url"
			placeholder="só se esta unidade entra por outro endereço"
			value={v('url')}
			wrapperClass="md:col-span-12"
		/>

		<Textarea
			label="Observações"
			name="observacoes"
			rows={2}
			placeholder="Código da loja, 2FA, quem usa…"
			value={v('observacoes')}
			wrapperClass="md:col-span-12"
		/>
	</div>
</FormShell>
