<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatBRL } from '$lib/clientes';
	import { Button, Card, Input, EmptyState } from '$lib/components/ui';

	let { data } = $props();

	let q = $state(data.q);
	// Re-sincroniza o campo com a URL (ex.: back/forward do navegador).
	$effect(() => {
		q = data.q;
	});
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy">Cadastro de Clientes</h1>
		<p class="text-sm text-grey">Ficha cadastral e dados de referência dos clientes</p>
	</div>
	<form class="flex items-end gap-2" method="GET">
		<Input type="search" name="q" placeholder="Buscar por nome" bind:value={q} wrapperClass="w-56" />
		<Button variant="secondary" type="submit">Buscar</Button>
	</form>
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

	<Card padding="none" class="overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
						<th class="px-4 py-3 font-semibold">Nome</th>
						<th class="px-4 py-3 font-semibold">CNPJ/CPF</th>
						<th class="px-4 py-3 font-semibold">Cidade/UF</th>
						<th class="px-4 py-3 font-semibold">Plano</th>
						<th class="px-4 py-3 font-semibold text-right">Valor ref.</th>
						<th class="px-4 py-3 font-semibold text-right">Venc.</th>
					</tr>
				</thead>
				<tbody>
					{#each data.clientes as c (c.id)}
						<tr
							class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
							onclick={() => goto('/cadastro/' + c.id)}
						>
							<td class="px-4 py-3 font-medium text-navy">{c.nome}</td>
							<td class="px-4 py-3 text-slate">{c.cnpj_cpf ?? '—'}</td>
							<td class="px-4 py-3 text-slate">
								{c.cidade ?? '—'}{c.estado ? ` / ${c.estado}` : ''}
							</td>
							<td class="px-4 py-3 text-slate">{c.plano_ref ?? '—'}</td>
							<td class="px-4 py-3 text-right tabular-nums text-navy">{formatBRL(c.mrr)}</td>
							<td class="px-4 py-3 text-right tabular-nums text-slate">
								{c.dia_vencimento ?? '—'}
							</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="px-2"><EmptyState icon="file" title="Nenhum cliente encontrado" description="Os clientes cadastrados aparecem aqui." /></td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}
