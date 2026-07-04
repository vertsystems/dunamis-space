<script lang="ts">
	import { formatBRL } from '$lib/clientes';
	import { diasAte, formatDateBR } from '$lib/alertas';
	import { Card, Badge } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	const modulos = $derived([
		{
			href: '/cadastro',
			icon: 'file',
			label: 'Clientes ativos',
			value: String(data.clientesAtivos)
		},
		{
			href: '/ferramentas',
			icon: 'key',
			label: 'Ferramentas ativas',
			value: String(data.ferramentasAtivas),
			hint: formatBRL(data.custoMensalFerramentas) + '/mês'
		},
		{
			href: '/fornecedores',
			icon: 'building',
			label: 'Fornecedores ativos',
			value: String(data.fornecedoresAtivos)
		},
		{
			href: '/onboarding',
			icon: 'clipboard',
			label: 'Onboarding pendente',
			value: String(data.onboardingPendente),
			accent: data.onboardingPendente > 0 ? 'text-brand-amber' : undefined
		},
		{
			href: '/equipe',
			icon: 'users',
			label: 'Equipe ativa',
			value: String(data.equipeAtiva)
		},
		{
			href: '/base-conhecimento',
			icon: 'book',
			label: 'Artigos na base',
			value: String(data.artigosBase)
		}
	]);
</script>

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">Administrativo</h1>
	<p class="text-sm text-grey">Resumo dos módulos administrativos.</p>
</div>

<div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
	{#each modulos as m (m.href)}
		<a href={m.href} class="block">
			<Card class="h-full hover:shadow-md transition-shadow">
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="text-xs uppercase tracking-wide text-grey font-semibold">{m.label}</div>
						<div class="text-3xl font-bold mt-1 tabular-nums {m.accent ?? 'text-navy'}">{m.value}</div>
						{#if m.hint}<div class="text-xs text-grey mt-0.5">{m.hint}</div>{/if}
					</div>
					<span class="grid size-10 place-items-center rounded-[var(--radius)] bg-bg text-slate shrink-0">
						<Icon name={m.icon} size={20} />
					</span>
				</div>
			</Card>
		</a>
	{/each}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 items-start">
	<Card>
		<div class="flex items-center justify-between gap-2 mb-4">
			<h2 class="text-lg font-semibold text-navy flex items-center gap-2">
				<Icon name="key" size={17} /> Renovações próximas
			</h2>
			<a class="text-sm text-brand hover:underline" href="/ferramentas">Abrir Ferramentas</a>
		</div>

		{#if data.renovacoes.length}
			<ul class="divide-y divide-grey-200/60">
				{#each data.renovacoes as f (f.id)}
					{@const dias = diasAte(f.proxima_renovacao)}
					<li class="py-1.5 flex items-center justify-between gap-2 text-sm">
						<div>
							<span class="text-navy">{f.nome}</span>
							{#if f.categoria}<span class="text-xs text-grey"> · {f.categoria}</span>{/if}
							<span class="block text-xs text-grey">
								{formatDateBR(f.proxima_renovacao)}{dias !== null ? ` · em ${dias} ${dias === 1 ? 'dia' : 'dias'}` : ''}
							</span>
						</div>
						<span class="text-navy tabular-nums shrink-0">{formatBRL(f.custo_mensal)}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-grey">Nenhuma renovação nos próximos 30 dias.</p>
		{/if}
	</Card>

	<Card>
		<div class="flex items-center justify-between gap-2 mb-4">
			<h2 class="text-lg font-semibold text-navy flex items-center gap-2">
				<Icon name="clipboard" size={17} /> Onboarding pendente
			</h2>
			<a class="text-sm text-brand hover:underline" href="/onboarding">Abrir Onboarding</a>
		</div>

		{#if data.onboardingPendente > 0}
			<Badge tone="warning">{data.onboardingPendente} {data.onboardingPendente === 1 ? 'item pendente' : 'itens pendentes'}</Badge>
		{/if}

		{#if data.onboardingItensPendentes.length}
			<ul class="divide-y divide-grey-200/60 mt-3">
				{#each data.onboardingItensPendentes as i (i.id)}
					<li class="py-1.5 text-sm">
						<span class="text-navy">{i.texto}</span>
						{#if i.cliente_nome}<span class="block text-xs text-grey">{i.cliente_nome}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-grey">Nenhum item de onboarding pendente.</p>
		{/if}
	</Card>
</div>
