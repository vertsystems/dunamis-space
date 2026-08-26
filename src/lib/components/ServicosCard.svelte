<script lang="ts">
	// Serviços & Ferramentas do cliente — o que ele contrata por fora (Rádio
	// Indoor, PDV, telefonia) e os logins de cada loja dentro de cada serviço.
	//
	// Duas permissões governam esta seção: a ficha do serviço é do módulo
	// 'servicos' (quem não tem nem recebe os dados) e os logins de dentro são do
	// módulo 'vault', o mesmo do cofre — por isso `servicos.podeVerAcessos`.
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import { Button, Card, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import ServicoForm from '$lib/components/ServicoForm.svelte';
	import ServicoAcessoForm from '$lib/components/ServicoAcessoForm.svelte';
	import {
		ChevronRight,
		Copy,
		Eye,
		EyeOff,
		Headset,
		Info,
		Pencil,
		Plus,
		Trash2,
		ExternalLink
	} from '@lucide/svelte';
	import { urlAbsoluta, urlCurta } from '$lib/vault';
	import type { ServicoAcesso, ServicoItem, ServicosData } from '$lib/servicos';
	import { formatBRL } from '$lib/clientes';
	import { VALOR_MASCARA } from '$lib/valores';
	import { toast } from '$lib/toast.svelte';

	let {
		servicos,
		colaboradores = [],
		podeValores = false,
		form = null
	}: {
		servicos: ServicosData;
		colaboradores?: {
			id: string;
			nome: string;
			avatar_url?: string | null;
			funcao?: string | null;
			funcoes?: string[] | null;
		}[];
		podeValores?: boolean;
		form?: Record<string, unknown> | null;
	} = $props();

	const perms = $derived(page.data.permissoes);
	const podeMexer = $derived(podeEditar(perms, 'servicos'));
	const podeApagar = $derived(podeExcluir(perms, 'servicos'));
	// Mexer nos logins é permissão do cofre, não do serviço.
	const podeMexerAcesso = $derived(servicos.podeVerAcessos && podeEditar(perms, 'vault'));
	const podeApagarAcesso = $derived(servicos.podeVerAcessos && podeExcluir(perms, 'vault'));

	// Serviços expandidos e senhas reveladas nesta sessão de tela. Fecha a página, some.
	let abertos = $state<Record<string, boolean>>({});
	let reveladas = $state<Record<string, boolean>>({});

	let criando = $state(false);
	let editando = $state<ServicoItem | null>(null);
	let excluindo = $state<ServicoItem | null>(null);
	let apagando = $state(false);

	// Login: o modal precisa saber a qual serviço pertence.
	let novoAcessoEm = $state<ServicoItem | null>(null);
	let editandoAcesso = $state<{ servico: ServicoItem; acesso: ServicoAcesso } | null>(null);
	let excluindoAcesso = $state<{ servico: ServicoItem; acesso: ServicoAcesso } | null>(null);
	let apagandoAcesso = $state(false);

	function nomeResp(id: string | null): string | null {
		if (!id) return null;
		return colaboradores.find((c) => c.id === id)?.nome ?? null;
	}

	async function copiar(texto: string | null, rotulo: string) {
		if (!texto) return;
		try {
			await navigator.clipboard.writeText(texto);
			toast.success(`${rotulo} copiado`);
		} catch {
			toast.error('Não foi possível copiar. Copie manualmente.');
		}
	}

	function alternar(id: string) {
		abertos = { ...abertos, [id]: !abertos[id] };
	}

	function aposSalvarServico() {
		criando = false;
		editando = null;
		toast.success('Serviço salvo');
		invalidateAll();
	}
	function aposSalvarAcesso(servicoId: string) {
		novoAcessoEm = null;
		editandoAcesso = null;
		// Login novo aparece na hora: o serviço fica aberto depois de salvar.
		abertos = { ...abertos, [servicoId]: true };
		toast.success('Login salvo');
		invalidateAll();
	}
</script>

<Card class="mt-4">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 text-sm font-semibold text-navy">
			<Icon name="dtools" size={17} /> Serviços & Ferramentas
			<span class="text-sm font-normal text-grey">({servicos.itens.length})</span>
		</h2>
		{#if podeMexer && !servicos.pendente}
			<Button size="sm" variant="secondary" onclick={() => (criando = true)}>
				<Icon name="plus" size={15} /> Adicionar serviço
			</Button>
		{/if}
	</div>

	{#if servicos.pendente}
		<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
			Esta seção ainda não existe no banco. Rode a migration
			<code>0061_cliente_servicos.sql</code> no Supabase para liberá-la.
		</div>
	{:else if servicos.erro}
		<div role="alert" class="text-sm text-brand-danger">{servicos.erro}</div>
	{:else if !servicos.itens.length}
		<p class="text-sm text-grey">
			Nenhum serviço cadastrado. Aqui ficam as ferramentas que o cliente contrata por fora — cada
			uma com seu endereço, fornecedor e os logins de cada loja.
		</p>
	{:else}
		<!-- Uma linha por serviço; os logins abrem embaixo. Mesma densidade do
		     cofre: cabeçalho único, rótulos fora das linhas, ações à vista. -->
		<div class="overflow-hidden rounded-[var(--radius)] border border-grey-200">
			<div
				class="hidden border-b border-grey-200 bg-bg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey sm:grid sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,0.7fr)_auto]"
			>
				<span>Serviço</span>
				<span>Fornecedor</span>
				<span>Custo/mês</span>
				<span class="sr-only">Ações</span>
			</div>

			<ul class="divide-y divide-grey-200/70">
				{#each servicos.itens as s (s.id)}
					{@const resp = nomeResp(s.responsavel_id)}
					{@const link = urlAbsoluta(s.url)}
					{@const nota = [resp ? `Responsável: ${resp}` : null, s.observacoes]
						.filter(Boolean)
						.join('\n')}
					{@const aberto = !!abertos[s.id]}
					<li class="transition-colors hover:bg-bg/40">
						<div
							class="grid items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,0.7fr)_auto]"
						>
							<!-- Serviço: nome, categoria, link, nota e a chave para abrir os logins -->
							<div class="flex min-w-0 items-center gap-1.5">
								{#if servicos.podeVerAcessos}
									<button
										class="grid size-5 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-bg hover:text-navy"
										aria-expanded={aberto}
										aria-label={aberto ? 'Fechar logins' : 'Ver logins'}
										title={aberto ? 'Fechar logins' : 'Ver logins'}
										onclick={() => alternar(s.id)}
									>
										<!-- `grid`: transform não pega em elemento inline. -->
										<span class="grid transition-transform" class:rotate-90={aberto}>
											<ChevronRight size={14} />
										</span>
									</button>
								{:else}
									<span class="size-5 shrink-0"></span>
								{/if}
								<span class="truncate text-sm font-semibold text-navy" title={s.nome}>{s.nome}</span>
								{#if s.categoria}
									<span
										class="shrink-0 rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-medium text-slate"
									>
										{s.categoria}
									</span>
								{/if}
								{#if link}
									<a
										href={link}
										target="_blank"
										rel="noopener"
										class="shrink-0 text-grey transition-colors hover:text-brand"
										title={urlCurta(s.url)}
										aria-label="Abrir {urlCurta(s.url)}"
									>
										<ExternalLink size={13} />
									</a>
								{/if}
								{#if nota}
									<span class="shrink-0 text-grey" title={nota}>
										<Info size={13} />
										<span class="sr-only">{nota}</span>
									</span>
								{/if}
								{#if servicos.podeVerAcessos}
									<button
										class="shrink-0 whitespace-nowrap text-[11px] text-grey transition-colors hover:text-brand"
										onclick={() => alternar(s.id)}
									>
										{s.acessos.length}
										{s.acessos.length === 1 ? 'login' : 'logins'}
									</button>
								{/if}
							</div>

							<!-- Fornecedor + contato do suporte -->
							<div class="flex min-w-0 items-center gap-1">
								<span class="w-16 shrink-0 text-[11px] text-grey sm:hidden">Fornecedor</span>
								<span class="min-w-0 flex-1 truncate text-sm text-slate" title={s.fornecedor ?? ''}>
									{s.fornecedor || '—'}
								</span>
								{#if s.suporte_contato}
									<span class="shrink-0 text-grey" title="Suporte: {s.suporte_contato}">
										<Headset size={13} />
										<span class="sr-only">Suporte: {s.suporte_contato}</span>
									</span>
									<button
										class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-bg hover:text-navy"
										aria-label="Copiar contato do suporte"
										title="Copiar contato do suporte"
										onclick={() => copiar(s.suporte_contato, 'Contato')}
									>
										<Copy size={13} />
									</button>
								{/if}
							</div>

							<!-- Custo mensal (sigiloso: módulo 'valores') -->
							<div class="flex min-w-0 items-center gap-1">
								<span class="w-16 shrink-0 text-[11px] text-grey sm:hidden">Custo/mês</span>
								<span class="truncate text-sm text-slate">
									{#if !podeValores}
										{VALOR_MASCARA}
									{:else if s.custo_mensal != null}
										{formatBRL(s.custo_mensal)}
									{:else}
										—
									{/if}
								</span>
							</div>

							<!-- Ações: sempre à vista, discretas -->
							<div class="flex shrink-0 items-center gap-0.5 justify-self-end">
								{#if podeMexerAcesso}
									<button
										class="grid size-6 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-bg hover:text-navy"
										aria-label="Adicionar login"
										title="Adicionar login"
										onclick={() => (novoAcessoEm = s)}
									>
										<Plus size={13} />
									</button>
								{/if}
								{#if podeMexer}
									<button
										class="grid size-6 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-bg hover:text-navy"
										aria-label="Editar serviço"
										title="Editar"
										onclick={() => (editando = s)}
									>
										<Pencil size={13} />
									</button>
								{/if}
								{#if podeApagar}
									<button
										class="grid size-6 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
										aria-label="Excluir serviço"
										title="Excluir"
										onclick={() => (excluindo = s)}
									>
										<Trash2 size={13} />
									</button>
								{/if}
							</div>
						</div>

						<!-- Logins deste serviço -->
						{#if aberto && servicos.podeVerAcessos}
							<div class="border-t border-grey-200/70 bg-bg/40 px-3 py-2 sm:pl-10">
								{#if s.acessos.length}
									<div
										class="hidden pb-1 text-[10px] font-semibold uppercase tracking-wide text-grey sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
									>
										<span>Unidade</span>
										<span>Login</span>
										<span>Senha</span>
										<span class="sr-only">Ações</span>
									</div>
									<ul class="divide-y divide-grey-200/50">
										{#each s.acessos as a (a.id)}
											{@const linkA = urlAbsoluta(a.url)}
											<li
												class="grid items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
											>
												<div class="flex min-w-0 items-center gap-1.5">
													<span class="truncate text-sm text-navy" title={a.rotulo}>{a.rotulo}</span>
													{#if linkA}
														<a
															href={linkA}
															target="_blank"
															rel="noopener"
															class="shrink-0 text-grey transition-colors hover:text-brand"
															title={urlCurta(a.url)}
															aria-label="Abrir {urlCurta(a.url)}"
														>
															<ExternalLink size={12} />
														</a>
													{/if}
													{#if a.observacoes}
														<span class="shrink-0 text-grey" title={a.observacoes}>
															<Info size={12} />
															<span class="sr-only">{a.observacoes}</span>
														</span>
													{/if}
												</div>

												<div class="flex min-w-0 items-center gap-1">
													<span class="w-12 shrink-0 text-[11px] text-grey sm:hidden">Login</span>
													<span class="min-w-0 flex-1 truncate text-sm text-slate" title={a.login ?? ''}>
														{a.login || '—'}
													</span>
													{#if a.login}
														<button
															class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-surface hover:text-navy"
															aria-label="Copiar login"
															title="Copiar login"
															onclick={() => copiar(a.login, 'Login')}
														>
															<Copy size={13} />
														</button>
													{/if}
												</div>

												<div class="flex min-w-0 items-center gap-1">
													<span class="w-12 shrink-0 text-[11px] text-grey sm:hidden">Senha</span>
													<span class="min-w-0 flex-1 truncate font-mono text-sm text-slate">
														{#if !a.senha}
															—
														{:else if reveladas[a.id]}
															{a.senha}
														{:else}
															••••••••
														{/if}
													</span>
													{#if a.senha}
														<button
															class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-surface hover:text-navy"
															aria-label={reveladas[a.id] ? 'Ocultar senha' : 'Mostrar senha'}
															title={reveladas[a.id] ? 'Ocultar' : 'Mostrar'}
															onclick={() => (reveladas = { ...reveladas, [a.id]: !reveladas[a.id] })}
														>
															{#if reveladas[a.id]}<EyeOff size={13} />{:else}<Eye size={13} />{/if}
														</button>
														<button
															class="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-surface hover:text-navy"
															aria-label="Copiar senha"
															title="Copiar senha"
															onclick={() => copiar(a.senha, 'Senha')}
														>
															<Copy size={13} />
														</button>
													{/if}
												</div>

												<div class="flex shrink-0 items-center gap-0.5 justify-self-end">
													{#if podeMexerAcesso}
														<button
															class="grid size-6 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-surface hover:text-navy"
															aria-label="Editar login"
															title="Editar"
															onclick={() => (editandoAcesso = { servico: s, acesso: a })}
														>
															<Pencil size={13} />
														</button>
													{/if}
													{#if podeApagarAcesso}
														<button
															class="grid size-6 place-items-center rounded-[var(--radius-sm)] text-grey/70 transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
															aria-label="Excluir login"
															title="Excluir"
															onclick={() => (excluindoAcesso = { servico: s, acesso: a })}
														>
															<Trash2 size={13} />
														</button>
													{/if}
												</div>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="text-sm text-grey">Nenhum login cadastrado neste serviço.</p>
								{/if}

								{#if podeMexerAcesso}
									<button
										class="mt-2 flex items-center gap-1 text-[13px] text-grey transition-colors hover:text-brand"
										onclick={() => (novoAcessoEm = s)}
									>
										<Plus size={13} /> Adicionar login
									</button>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</Card>

<!-- ---------- Serviço ---------- -->
<Modal open={criando} title="Novo serviço" size="lg" onClose={() => (criando = false)}>
	<ServicoForm
		action="?/servico_criar"
		submitLabel="Adicionar"
		{colaboradores}
		{podeValores}
		item={(form?.values as Record<string, unknown>) ?? null}
		error={(form?.servicoError as string | null) ?? null}
		onCancel={() => (criando = false)}
		onDone={aposSalvarServico}
	/>
</Modal>

<Modal open={!!editando} title="Editar serviço" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ServicoForm
			action="?/servico_atualizar"
			submitLabel="Salvar alterações"
			{colaboradores}
			{podeValores}
			item={editando}
			error={(form?.servicoError as string | null) ?? null}
			onCancel={() => (editando = null)}
			onDone={aposSalvarServico}
		/>
	{/if}
</Modal>

<Modal open={!!excluindo} title="Excluir serviço" onClose={() => (excluindo = null)}>
	{#if excluindo}
		<p class="mb-4 text-sm text-slate">
			Excluir <strong class="text-navy">{excluindo.nome}</strong> deste cliente?
			{#if excluindo.acessos.length}
				Os {excluindo.acessos.length} logins guardados nele somem junto.
			{/if}
			Não dá para desfazer.
		</p>
		<form
			method="POST"
			action="?/servico_excluir"
			use:enhance={() => {
				apagando = true;
				return async ({ result, update }) => {
					apagando = false;
					if (result.type === 'success') {
						excluindo = null;
						toast.success('Serviço excluído');
						invalidateAll();
						return;
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={excluindo.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" variant="secondary" onclick={() => (excluindo = null)}>
					Cancelar
				</Button>
				<Button type="submit" variant="danger" loading={apagando}>Sim, excluir</Button>
			</div>
		</form>
	{/if}
</Modal>

<!-- ---------- Login de um serviço ---------- -->
<Modal open={!!novoAcessoEm} title="Novo login" size="lg" onClose={() => (novoAcessoEm = null)}>
	{#if novoAcessoEm}
		<ServicoAcessoForm
			action="?/servico_acesso_criar"
			submitLabel="Adicionar"
			servicoId={novoAcessoEm.id}
			servicoNome={novoAcessoEm.nome}
			item={(form?.values as Record<string, unknown>) ?? null}
			error={(form?.acessoError as string | null) ?? null}
			onCancel={() => (novoAcessoEm = null)}
			onDone={() => aposSalvarAcesso(novoAcessoEm!.id)}
		/>
	{/if}
</Modal>

<Modal
	open={!!editandoAcesso}
	title="Editar login"
	size="lg"
	onClose={() => (editandoAcesso = null)}
>
	{#if editandoAcesso}
		<ServicoAcessoForm
			action="?/servico_acesso_atualizar"
			submitLabel="Salvar alterações"
			servicoId={editandoAcesso.servico.id}
			servicoNome={editandoAcesso.servico.nome}
			item={editandoAcesso.acesso}
			error={(form?.acessoError as string | null) ?? null}
			onCancel={() => (editandoAcesso = null)}
			onDone={() => aposSalvarAcesso(editandoAcesso!.servico.id)}
		/>
	{/if}
</Modal>

<Modal open={!!excluindoAcesso} title="Excluir login" onClose={() => (excluindoAcesso = null)}>
	{#if excluindoAcesso}
		<p class="mb-4 text-sm text-slate">
			Excluir o login <strong class="text-navy">{excluindoAcesso.acesso.rotulo}</strong> de
			{excluindoAcesso.servico.nome}? A senha guardada some junto.
		</p>
		<form
			method="POST"
			action="?/servico_acesso_excluir"
			use:enhance={() => {
				apagandoAcesso = true;
				return async ({ result, update }) => {
					apagandoAcesso = false;
					if (result.type === 'success') {
						excluindoAcesso = null;
						toast.success('Login excluído');
						invalidateAll();
						return;
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={excluindoAcesso.acesso.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" variant="secondary" onclick={() => (excluindoAcesso = null)}>
					Cancelar
				</Button>
				<Button type="submit" variant="danger" loading={apagandoAcesso}>Sim, excluir</Button>
			</div>
		</form>
	{/if}
</Modal>
