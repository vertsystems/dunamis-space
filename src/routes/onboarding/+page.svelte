<script lang="ts">
	import { Button, Card, Badge, Input, Select } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import { enhance, deserialize } from '$app/forms';
	import { statusLabel } from '$lib/clientes';

	let { data } = $props();

	// Estado local dos itens, clonado de data + re-sync a cada navegação/invalidação.
	let itens = $state(data.itens.map((x) => ({ ...x })));
	$effect(() => {
		itens = data.itens.map((x) => ({ ...x }));
	});

	let selecionado = $state('');
	let novoTexto = $state('');
	let iniciando = $state(false);
	let adicionando = $state(false);

	const errOf = (d: unknown) => (d as { error?: string } | undefined)?.error;

	// Resumo por cliente (total / concluídos) para marcar o Select.
	const resumo = $derived.by(() => {
		const m = new Map<string, { total: number; done: number }>();
		for (const i of itens) {
			const r = m.get(i.cliente_id) ?? { total: 0, done: 0 };
			r.total++;
			if (i.concluido) r.done++;
			m.set(i.cliente_id, r);
		}
		return m;
	});

	const clienteSel = $derived(data.clientes.find((c) => c.id === selecionado) ?? null);
	const itensSel = $derived(
		itens.filter((i) => i.cliente_id === selecionado).sort((a, b) => a.ordem - b.ordem)
	);
	const total = $derived(itensSel.length);
	const done = $derived(itensSel.filter((i) => i.concluido).length);
	const pct = $derived(total ? Math.round((done / total) * 100) : 0);

	async function postar(action: string, fd: FormData) {
		const res = await fetch(action, {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': 'true' }
		});
		return deserialize(await res.text());
	}

	// Toggle OTIMISTA: muta o estado local e desfaz se o servidor OU a rede falhar.
	async function toggle(item: (typeof itens)[number]) {
		const novo = !item.concluido;
		item.concluido = novo;
		const fd = new FormData();
		fd.set('id', item.id);
		fd.set('concluido', String(novo));
		try {
			const r = await postar('?/item_toggle', fd);
			if (r.type !== 'success') {
				item.concluido = !novo;
				toast.error((r.type === 'failure' ? errOf(r.data) : null) ?? 'Não foi possível atualizar.');
			}
		} catch {
			item.concluido = !novo;
			toast.error('Não foi possível atualizar. Verifique sua conexão.');
		}
	}

	const iniciarEnhance = () => {
		iniciando = true;
		return async ({ result, update }: any) => {
			await update();
			iniciando = false;
			if (result.type === 'success') toast.success('Onboarding iniciado.');
			else if (result.type === 'failure')
				toast.error(errOf(result.data) ?? 'Erro ao iniciar onboarding.');
		};
	};

	const addEnhance = () => {
		adicionando = true;
		return async ({ result, update }: any) => {
			await update({ reset: false });
			adicionando = false;
			if (result.type === 'success') {
				novoTexto = '';
				toast.success('Item adicionado.');
			} else if (result.type === 'failure') toast.error(errOf(result.data) ?? 'Erro ao adicionar.');
		};
	};

	const excluirEnhance = () => {
		return async ({ result, update }: any) => {
			await update();
			if (result.type === 'failure') toast.error(errOf(result.data) ?? 'Erro ao excluir.');
			else if (result.type === 'success') toast.success('Item removido.');
		};
	};
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy">Onboarding</h1>
		<p class="text-sm text-grey">Checklist de entrada de novos clientes</p>
	</div>
</div>

{#if data.pendente}
	<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Módulo ainda não ativado. Aplique a migration
		<code class="font-mono">supabase/migrations/0006_administrativo.sql</code> no SQL Editor do Supabase.
	</div>
{:else}
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			Erro ao carregar: {data.loadError}
		</div>
	{/if}

	<Card class="mb-4">
		<Select label="Cliente" bind:value={selecionado} wrapperClass="max-w-md">
			<option value="">— Selecione um cliente —</option>
			{#each data.clientes as c (c.id)}
				{@const r = resumo.get(c.id)}
				<option value={c.id}>{c.nome}{r ? ` — ${r.done}/${r.total}` : ''}</option>
			{/each}
		</Select>
	</Card>

	{#if !clienteSel}
		<Card>
			<p class="text-sm text-grey">Selecione um cliente para ver ou iniciar o onboarding.</p>
		</Card>
	{:else if total === 0}
		<Card>
			<div class="flex flex-col items-start gap-3">
				<div>
					<h2 class="text-base font-semibold text-navy">{clienteSel.nome}</h2>
					<p class="text-sm text-grey">
						Este cliente ainda não tem checklist. Inicie o onboarding com os itens padrão.
					</p>
				</div>
				<form method="POST" action="?/iniciar" use:enhance={iniciarEnhance}>
					<input type="hidden" name="cliente_id" value={selecionado} />
					<Button type="submit" loading={iniciando}>Iniciar onboarding</Button>
				</form>
			</div>
		</Card>
	{:else}
		<Card padding="lg">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<h2 class="text-base font-semibold text-navy">{clienteSel.nome}</h2>
					<Badge tone="neutral">{statusLabel(clienteSel.status)}</Badge>
				</div>
				<span class="text-sm text-slate tabular-nums">{done}/{total} concluídos · {pct}%</span>
			</div>

			<div class="mb-5 h-2 w-full overflow-hidden rounded-[var(--radius-sm)] bg-bg">
				<div
					class="h-full rounded-[var(--radius-sm)] bg-brand-green transition-all"
					style="width: {pct}%"
				></div>
			</div>

			<ul class="flex flex-col gap-1">
				{#each itensSel as item (item.id)}
					<li class="flex items-center gap-3 rounded-[var(--radius)] px-2 py-2 hover:bg-bg">
						<button
							type="button"
							onclick={() => toggle(item)}
							aria-label={item.concluido ? 'Desmarcar' : 'Concluir'}
							class="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-colors {item.concluido
								? 'border-brand-green bg-brand-green text-white'
								: 'border-grey-200 text-transparent hover:border-brand-green'}"
						>
							<Icon name="check" size={14} />
						</button>
						<span class="flex-1 text-sm {item.concluido ? 'text-grey line-through' : 'text-navy'}">
							{item.texto}
						</span>
						<form method="POST" action="?/item_excluir" use:enhance={excluirEnhance}>
							<input type="hidden" name="id" value={item.id} />
							<Button variant="ghost" size="sm" type="submit" aria-label="Excluir item">
								<Icon name="trash" size={16} />
							</Button>
						</form>
					</li>
				{/each}
			</ul>

			<form
				method="POST"
				action="?/item_add"
				use:enhance={addEnhance}
				class="mt-4 flex items-end gap-2 border-t border-grey-200 pt-4"
			>
				<input type="hidden" name="cliente_id" value={selecionado} />
				<Input
					name="texto"
					placeholder="Adicionar item ao checklist..."
					bind:value={novoTexto}
					wrapperClass="flex-1"
					required
				/>
				<Button type="submit" loading={adicionando}>+ Adicionar</Button>
			</form>
		</Card>
	{/if}
{/if}
