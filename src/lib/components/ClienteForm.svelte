<script lang="ts">
	import { page } from '$app/state';
	import { CLIENTE_STATUS, type ClienteEndereco } from '$lib/clientes';
	import { VALOR_MASCARA } from '$lib/valores';
	import { LOGO_MAX_PX, enviarLogo, validarLogo } from '$lib/logo';
	import { toast } from '$lib/toast.svelte';
	import { Button, Input, Select, Textarea, FormShell } from '$lib/components/ui';
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

	const v = (k: string) => cliente?.[k] ?? '';
	// Vem do +layout.server.ts, então vale em qualquer tela que abra este form.
	const podeValores = $derived(page.data.podeValores !== false);

	// --- Endereços ---
	// Cada bloco carrega uma chave própria: sem ela, remover o 2º de três faria
	// o Svelte reaproveitar os <input> pelo índice e o texto pularia de linha.
	type Linha = ClienteEndereco & { chave: number };
	let proximaChave = 0;
	const linhaVazia = (): Linha => ({
		chave: proximaChave++,
		apelido: '',
		endereco: '',
		cidade: '',
		estado: '',
		cep: ''
	});

	/** Lista inicial: a do banco; senão o endereço único antigo; senão um bloco em branco. */
	function enderecosIniciais(c: Record<string, any> | null): Linha[] {
		const salvos = Array.isArray(c?.enderecos) ? (c.enderecos as Partial<ClienteEndereco>[]) : [];
		if (salvos.length) {
			return salvos.map((e) => ({
				...linhaVazia(),
				apelido: e?.apelido ?? '',
				endereco: e?.endereco ?? '',
				cidade: e?.cidade ?? '',
				estado: e?.estado ?? '',
				cep: e?.cep ?? ''
			}));
		}
		// Cliente gravado antes da migration: as quatro colunas antigas viram a
		// primeira linha, para o endereço não sumir da tela.
		const antigo = { ...linhaVazia(), endereco: c?.endereco ?? '', cidade: c?.cidade ?? '', estado: c?.estado ?? '', cep: c?.cep ?? '' };
		return [antigo];
	}

	// Valor inicial de propósito (o svelte-check avisa): a partir daqui quem manda
	// é o que a pessoa digita. Trocar de cliente recarrega a lista no $effect
	// abaixo, junto com a foto.
	let enderecos = $state<Linha[]>(enderecosIniciais(cliente));

	function adicionarEndereco() {
		enderecos = [...enderecos, linhaVazia()];
	}
	// Sempre sobra um bloco em branco: o formulário sem nenhuma linha não teria
	// onde digitar. Bloco em branco não vira endereço no banco.
	function removerEndereco(chave: number) {
		const resto = enderecos.filter((e) => e.chave !== chave);
		enderecos = resto.length ? resto : [linhaVazia()];
	}

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
			// Mesmo motivo da foto: reabrir o modal para outro cliente não pode
			// mostrar os endereços do anterior.
			enderecos = enderecosIniciais(cliente);
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

<FormShell
	{action}
	{error}
	{submitLabel}
	{onCancel}
	{onDone}
	cancelHref="/cadastro"
	footerClass="mt-5"
>
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
				<Select label="Status" name="status" value={cliente?.status ?? 'ativo'} wrapperClass="md:col-span-4">
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
			<div class="mb-2 flex items-center justify-between gap-3">
				<h3 class="text-xs font-semibold uppercase tracking-wide text-grey">
					{enderecos.length > 1 ? 'Endereços' : 'Endereço'}
				</h3>
				<Button type="button" size="sm" variant="secondary" onclick={adicionarEndereco}>
					<Icon name="plus" size={14} /> Adicionar endereço
				</Button>
			</div>

			<div class="space-y-3">
				{#each enderecos as e, i (e.chave)}
					<div class="rounded-[var(--radius)] border border-grey-200 p-3">
						<div class="mb-2 flex items-center justify-between gap-3">
							<span class="text-xs font-medium text-grey">
								{e.apelido.trim() || `Endereço ${i + 1}`}
							</span>
							{#if enderecos.length > 1 || e.apelido || e.endereco || e.cidade || e.estado || e.cep}
								<button
									type="button"
									onclick={() => removerEndereco(e.chave)}
									title="Remover este endereço"
									aria-label="Remover {e.apelido.trim() || `endereço ${i + 1}`}"
									class="rounded-[var(--radius-sm)] p-1.5 text-grey transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
								>
									<Icon name="trash" size={15} />
								</button>
							{/if}
						</div>
						<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
							<Input label="Apelido" name="end_apelido" bind:value={e.apelido} placeholder="Matriz, Loja Centro…" wrapperClass="md:col-span-3" />
							<Input label="Endereço" name="end_logradouro" bind:value={e.endereco} wrapperClass="md:col-span-4" />
							<Input label="Cidade" name="end_cidade" bind:value={e.cidade} wrapperClass="md:col-span-2" />
							<Input label="UF" name="end_uf" maxlength={2} placeholder="UF" bind:value={e.estado} wrapperClass="md:col-span-1" />
							<Input label="CEP" name="end_cep" bind:value={e.cep} wrapperClass="md:col-span-2" />
						</div>
					</div>
				{/each}
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
</FormShell>
