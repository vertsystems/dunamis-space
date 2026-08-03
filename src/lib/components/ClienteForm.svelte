<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CLIENTE_STATUS } from '$lib/clientes';
	import { VALOR_MASCARA } from '$lib/valores';
	import { LOGO_MAX_PX, enviarLogo, validarLogo } from '$lib/logo';
	import { toast } from '$lib/toast.svelte';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';

	let {
		cliente = null,
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		cliente?: Record<string, any> | null;
		colaboradores?: { id: string; nome: string; avatar_url?: string | null; funcao?: string | null; funcoes?: string[] | null }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => cliente?.[k] ?? '';
	// Vem do +layout.server.ts, então vale em qualquer tela que abra este form.
	const podeValores = $derived(page.data.podeValores !== false);

	// --- Foto do cliente ---
	// A foto escolhida agora vence a do banco; `undefined` = ainda não mexeu.
	// Um $state puro travaria no valor inicial: reabrir o modal para OUTRO
	// cliente mostraria a foto do anterior.
	let escolhida = $state<string | null | undefined>(undefined);
	let idAtual = $state<string | null>((cliente?.id as string | null) ?? null);
	$effect(() => {
		const id = (cliente?.id as string | null) ?? null;
		if (id !== idAtual) {
			idAtual = id;
			escolhida = undefined;
		}
	});
	const logoUrl = $derived(
		escolhida !== undefined ? escolhida : ((cliente?.logo_url as string | null) ?? null)
	);
	let arquivoInput = $state<HTMLInputElement | null>(null);
	let enviandoLogo = $state(false);
	let erroLogo = $state<string | null>(null);

	async function escolherArquivo(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Zera o input para que reescolher o MESMO arquivo dispare o change de novo.
		input.value = '';
		if (!file) return;

		erroLogo = null;
		const problema = await validarLogo(file);
		if (problema) {
			erroLogo = problema;
			return;
		}

		enviandoLogo = true;
		const r = await enviarLogo(page.data.supabase, file);
		enviandoLogo = false;
		if ('erro' in r) {
			erroLogo = r.erro;
			return;
		}
		escolhida = r.url;
		toast.success('Foto enviada. Salve o cliente para confirmar.');
	}
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
		<div role="alert" class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			{error}
		</div>
	{/if}

	<div class="space-y-5">
		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Foto</h3>
			<!-- O upload acontece ao escolher o arquivo; o form só carrega a URL
			     resultante neste hidden. -->
			<input type="hidden" name="logo_url" value={logoUrl ?? ''} />
			<div class="flex flex-wrap items-center gap-4">
				{#if logoUrl}
					<img src={logoUrl} alt="Foto do cliente" class="size-16 shrink-0 rounded-full object-cover shadow-sm" />
				{:else}
					<span class="grid size-16 shrink-0 place-items-center rounded-full bg-bg text-grey">
						<Icon name="building" size={22} />
					</span>
				{/if}
				<div class="flex flex-col gap-1.5">
					<div class="flex flex-wrap items-center gap-2">
						<Button type="button" size="sm" variant="secondary" loading={enviandoLogo} onclick={() => arquivoInput?.click()}>
							{logoUrl ? 'Trocar foto' : 'Enviar foto'}
						</Button>
						{#if logoUrl}
							<Button type="button" size="sm" variant="ghost" onclick={() => (escolhida = null)}>Remover</Button>
						{/if}
					</div>
					<p class="text-xs text-grey">Só WEBP, no máximo {LOGO_MAX_PX}x{LOGO_MAX_PX}px.</p>
					{#if erroLogo}<p role="alert" class="text-xs text-brand-danger">{erroLogo}</p>{/if}
				</div>
				<input
					bind:this={arquivoInput}
					type="file"
					accept="image/webp"
					class="hidden"
					onchange={escolherArquivo}
				/>
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Geral</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Nome *" name="nome" required value={v('nome')} wrapperClass="md:col-span-8" />
				<Select label="Status" name="status" value={cliente?.status ?? 'lead'} wrapperClass="md:col-span-4">
					{#each CLIENTE_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
				</Select>
				<Input label="Razão social" name="razao_social" value={v('razao_social')} wrapperClass="md:col-span-6" />
				<Input label="CNPJ / CPF" name="cnpj_cpf" value={v('cnpj_cpf')} wrapperClass="md:col-span-6" />
				<Input label="Segmento" name="segmento" value={v('segmento')} wrapperClass="md:col-span-4" />
				<Input label="Cliente desde" type="date" name="data_inicio" value={v('data_inicio')} wrapperClass="md:col-span-4" />
				<ResponsavelPicker
					{colaboradores}
					name="responsaveis_ids"
					multiple
					values={cliente?.responsaveis_ids ?? null}
					value={cliente?.responsavel_id ?? null}
					wrapperClass="md:col-span-12"
				/>
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Contato</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Contato Diretor" name="contato_nome" value={v('contato_nome')} placeholder="Nome" wrapperClass="md:col-span-4" />
				<Input label="E-mail" type="email" name="contato_email" value={v('contato_email')} wrapperClass="md:col-span-4" />
				<Input label="WhatsApp" name="contato_whatsapp" value={v('contato_whatsapp')} wrapperClass="md:col-span-4" />

				<Input label="Contato financeiro" name="contato_financeiro" value={v('contato_financeiro')} placeholder="Nome" wrapperClass="md:col-span-4" />
				<Input label="E-mail financeiro" type="email" name="contato_financeiro_email" value={v('contato_financeiro_email')} wrapperClass="md:col-span-4" />
				<Input label="WhatsApp financeiro" name="contato_financeiro_whatsapp" value={v('contato_financeiro_whatsapp')} wrapperClass="md:col-span-4" />

				<Input label="Contato Operação" name="contato_operacao" value={v('contato_operacao')} placeholder="Nome" wrapperClass="md:col-span-4" />
				<Input label="E-mail operação" type="email" name="contato_operacao_email" value={v('contato_operacao_email')} wrapperClass="md:col-span-4" />
				<Input label="WhatsApp operação" name="contato_operacao_whatsapp" value={v('contato_operacao_whatsapp')} wrapperClass="md:col-span-4" />
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Endereço</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Endereço" name="endereco" value={v('endereco')} wrapperClass="md:col-span-5" />
				<Input label="Cidade" name="cidade" value={v('cidade')} wrapperClass="md:col-span-3" />
				<Input label="UF" name="estado" maxlength={2} placeholder="UF" value={v('estado')} wrapperClass="md:col-span-2" />
				<Input label="CEP" name="cep" value={v('cep')} wrapperClass="md:col-span-2" />
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Financeiro</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Plano" name="plano_ref" value={v('plano_ref')} wrapperClass="md:col-span-4" />
				{#if podeValores}
				<Input label="Valor mensal (R$)" type="number" step="0.01" name="mrr" value={v('mrr')} placeholder="0.00" wrapperClass="md:col-span-3" />
			{:else}
				<!-- Sem `name`: o campo não entra no FormData, e a action ainda ignora
				     o mrr de quem não pode vê-lo. Duas travas, de propósito. -->
				<Input
					label="Valor mensal (R$)"
					value={VALOR_MASCARA}
					disabled
					readonly
					title="Só CEO e Administrador veem os valores"
					wrapperClass="md:col-span-3"
				/>
			{/if}
				<Input label="Dia de venc." type="number" min="1" max="31" name="dia_vencimento" value={v('dia_vencimento')} wrapperClass="md:col-span-2" />
				<Input label="Forma de pagamento" name="forma_pagamento" value={v('forma_pagamento')} placeholder="Boleto, Pix, Cartão" wrapperClass="md:col-span-3" />
			</div>
		</section>

		<Textarea label="Observações" name="observacoes" rows={3} value={v('observacoes')} />
	</div>

	<div class="flex gap-2 mt-5">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => (onCancel ? onCancel() : goto('/cadastro'))}>Cancelar</Button>
	</div>
</form>
