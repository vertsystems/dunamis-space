<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Card, Badge } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import { FUNCAO } from '$lib/equipe';
	import { MODULOS, NIVEIS, rank, type Nivel } from '$lib/permissoes';
	import { toast } from '$lib/toast.svelte';

	let { data } = $props();

	// Módulos de negócio (o módulo "permissoes" é controlado pelo switch super-admin).
	const modulos = MODULOS.filter((m) => m.id !== 'permissoes');
	const GRUPOS: { id: string; label: string }[] = [
		{ id: 'administrativo', label: 'Administrativo' },
		{ id: 'comercial', label: 'Comercial' },
		{ id: 'marketing', label: 'Marketing' },
		{ id: 'dtools', label: 'DTools' }
	];

	const NIVEL_LABEL: Record<Nivel, string> = {
		nenhum: 'Sem acesso',
		ver: 'Ver',
		editar: 'Editar',
		excluir: 'Acesso Total'
	};

	// ---- Estado reativo (derivado do banco) ----
	// $derived assinável (Svelte >= 5.25): dá para atribuir livremente E volta a
	// acompanhar `data` quando o load recarrega. Com $state puro, esta tela ficava
	// com a grade obsoleta depois de salvar ou quando outro admin editava junto —
	// numa tela que controla acesso.
	// cargoNivel[funcao][modulo] = Nivel
	let cargoNivel = $derived<Record<string, Record<string, Nivel>>>(montarCargo());
	function montarCargo() {
		const m: Record<string, Record<string, Nivel>> = {};
		for (const f of FUNCAO) m[f.value] = {};
		for (const r of data.permissoesCargo) {
			(m[r.funcao] ??= {})[r.modulo] = r.nivel as Nivel;
		}
		return m;
	}
	function nivelCargo(funcao: string, modulo: string): Nivel {
		return cargoNivel[funcao]?.[modulo] ?? 'nenhum';
	}

	// excecao[colabId][modulo] = Nivel (ausente = herda do cargo)
	let excecao = $derived<Record<string, Record<string, Nivel>>>(montarExcecao());
	function montarExcecao() {
		const m: Record<string, Record<string, Nivel>> = {};
		for (const r of data.permissoesColaborador) {
			(m[r.colaborador_id] ??= {})[r.modulo] = r.nivel as Nivel;
		}
		return m;
	}

	let superAdmin = $derived<Record<string, boolean>>(
		Object.fromEntries(data.colaboradores.map((c) => [c.id, !!c.super_admin]))
	);

	let aba = $state<'cargos' | 'pessoas'>('cargos');
	let pessoaId = $derived<string>(data.colaboradores[0]?.id ?? '');
	const pessoa = $derived(data.colaboradores.find((c) => c.id === pessoaId) ?? null);

	function funcoesDe(c: { funcoes?: string[] | null; funcao?: string | null }): string[] {
		return c.funcoes?.length ? c.funcoes : c.funcao ? [c.funcao] : [];
	}
	// Nível herdado do(s) cargo(s) do colaborador para um módulo (o maior).
	function nivelHerdado(c: { funcoes?: string[] | null; funcao?: string | null }, modulo: string): Nivel {
		let melhor: Nivel = 'nenhum';
		for (const f of funcoesDe(c)) {
			const n = nivelCargo(f, modulo);
			if (rank(n) > rank(melhor)) melhor = n;
		}
		return melhor;
	}

	async function postAction(action: string, fields: Record<string, string>): Promise<boolean> {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) fd.set(k, v);
		const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'success') return true;
		const msg = result.type === 'failure' ? (result.data?.error as string) : 'Erro ao salvar';
		toast.error(msg ?? 'Erro ao salvar');
		return false;
	}

	// As três funções abaixo REATRIBUEM o mapa em vez de mutar por dentro.
	// `montarCargo()` devolve um objeto comum, não um proxy de $state: mutar
	// `cargoNivel[f][m]` não avisava ninguém, e a cor do select só mudava no
	// recarregamento seguinte — o rótulo mudava (é o próprio <select>) e a cor não.
	function comNivel<T>(mapa: Record<string, Record<string, T>>, chave: string, modulo: string, valor: T) {
		return { ...mapa, [chave]: { ...(mapa[chave] ?? {}), [modulo]: valor } };
	}
	function semNivel<T>(mapa: Record<string, Record<string, T>>, chave: string, modulo: string) {
		const interno = { ...(mapa[chave] ?? {}) };
		delete interno[modulo];
		return { ...mapa, [chave]: interno };
	}

	async function mudarCargo(funcao: string, modulo: string, nivel: Nivel) {
		const anterior = nivelCargo(funcao, modulo);
		cargoNivel = comNivel(cargoNivel, funcao, modulo, nivel); // otimista
		const ok = await postAction('salvar_cargo', { funcao, modulo, nivel });
		if (ok) toast.success('Permissão do cargo salva');
		else cargoNivel = comNivel(cargoNivel, funcao, modulo, anterior);
	}

	async function mudarExcecao(colaborador_id: string, modulo: string, valor: string) {
		const antes = excecao[colaborador_id]?.[modulo];
		excecao =
			valor === 'herdar'
				? semNivel(excecao, colaborador_id, modulo)
				: comNivel(excecao, colaborador_id, modulo, valor as Nivel);
		const ok = await postAction('salvar_excecao', { colaborador_id, modulo, nivel: valor });
		if (ok) toast.success('Exceção salva');
		else {
			excecao =
				antes === undefined
					? semNivel(excecao, colaborador_id, modulo)
					: comNivel(excecao, colaborador_id, modulo, antes);
		}
	}

	async function mudarSuper(colaborador_id: string, valor: boolean) {
		superAdmin = { ...superAdmin, [colaborador_id]: valor }; // otimista
		const ok = await postAction('toggle_super', {
			colaborador_id,
			super_admin: String(valor)
		});
		if (ok) {
			toast.success(valor ? 'Super-admin ativado' : 'Super-admin desativado');
			invalidateAll();
		} else superAdmin = { ...superAdmin, [colaborador_id]: !valor };
	}

	function ehSuperPorCargo(c: { funcoes?: string[] | null; funcao?: string | null }): boolean {
		return funcoesDe(c).some((f) => f === 'ceo' || f === 'admin');
	}
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Permissões</h1>
	<p class="text-sm text-grey">
		Controle o que cada cargo e cada pessoa acessa. Níveis: <b>Ver</b> (abre e lê),
		<b>Editar</b> (cria/edita) e <b>Acesso Total</b> (edita e exclui).
	</p>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

<div class="mb-4 inline-flex rounded-[var(--radius)] border border-grey-200 p-0.5">
	<button
		class="rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium"
		class:bg-brand={aba === 'cargos'}
		class:text-white={aba === 'cargos'}
		class:text-grey={aba !== 'cargos'}
		onclick={() => (aba = 'cargos')}>Por cargo</button
	>
	<button
		class="rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium"
		class:bg-brand={aba === 'pessoas'}
		class:text-white={aba === 'pessoas'}
		class:text-grey={aba !== 'pessoas'}
		onclick={() => (aba = 'pessoas')}>Por pessoa (exceções)</button
	>
</div>

{#if aba === 'cargos'}
	<Card padding="none" class="overflow-x-auto">
		<table class="perm-matriz w-full min-w-[860px] text-sm">
			<thead>
				<tr class="border-b border-grey-200 bg-bg">
					<th scope="col" class="sticky left-0 z-10 bg-bg px-4 py-3 text-left font-semibold text-navy">Módulo</th>
					{#each FUNCAO as f (f.value)}
						<th scope="col" class="px-3 py-3 text-center font-medium">
							<div class="flex flex-col items-center gap-1">
								<CargoBadge funcao={f.value} />
								<span class="whitespace-nowrap text-[11px] text-grey">{f.label}</span>
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each GRUPOS as g (g.id)}
					{@const mods = modulos.filter((m) => m.grupo === g.id)}
					{#if mods.length}
						<tr class="bg-bg/60">
							<td colspan={FUNCAO.length + 1} class="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey">{g.label}</td>
						</tr>
						{#each mods as m (m.id)}
							<tr class="border-b border-grey-200/60 last:border-0 hover:bg-bg/40">
								<td class="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-navy">{m.label}</td>
								{#each FUNCAO as f (f.value)}
									{@const nivel = nivelCargo(f.value, m.id)}
									<td class="px-2 py-1.5 text-center">
										<select
											class="nivel-sel"
											data-n={nivel}
											value={nivel}
											aria-label="{m.label} — {f.label}"
											onchange={(e) => mudarCargo(f.value, m.id, e.currentTarget.value as Nivel)}
										>
											{#each NIVEIS as n (n)}
												<option value={n}>{NIVEL_LABEL[n]}</option>
											{/each}
										</select>
									</td>
								{/each}
							</tr>
						{/each}
					{/if}
				{/each}
			</tbody>
		</table>
	</Card>
{:else}
	<Card class="mb-4">
		<div class="flex flex-wrap items-center gap-3">
			<label class="text-sm font-medium text-navy" for="pessoa">Colaborador</label>
			<select id="pessoa" class="nivel-sel !w-auto min-w-[220px]" bind:value={pessoaId}>
				{#each data.colaboradores as c (c.id)}
					<option value={c.id}>{c.nome}{c.ativo ? '' : ' (inativo)'}</option>
				{/each}
			</select>
			{#if pessoa}
				<span class="inline-flex flex-wrap items-center gap-1">
					{#each funcoesDe(pessoa) as f (f)}<CargoBadge funcao={f} />{/each}
				</span>
			{/if}
		</div>

		{#if pessoa}
			<div class="mt-4 flex items-center gap-3 rounded-[var(--radius)] bg-bg px-4 py-3">
				<div class="flex-1">
					<div class="text-sm font-medium text-navy">Super-admin</div>
					<div class="text-xs text-grey">Acesso total a tudo, incluindo esta tela de permissões.</div>
				</div>
				{#if ehSuperPorCargo(pessoa)}
					<Badge tone="warning">Sempre (cargo CEO/ADM)</Badge>
				{:else}
					<label class="inline-flex cursor-pointer items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={superAdmin[pessoa.id]}
							onchange={(e) => mudarSuper(pessoa!.id, e.currentTarget.checked)}
						/>
						{superAdmin[pessoa.id] ? 'Ativado' : 'Desativado'}
					</label>
				{/if}
			</div>
		{/if}
	</Card>

	{#if pessoa}
		{@const superAtivo = ehSuperPorCargo(pessoa) || superAdmin[pessoa.id]}
		<Card padding="none" class="overflow-x-auto">
			<table class="w-full min-w-[560px] text-sm">
				<thead>
					<tr class="border-b border-grey-200 bg-bg">
						<th scope="col" class="px-4 py-3 text-left font-semibold text-navy">Módulo</th>
						<th scope="col" class="px-4 py-3 text-left font-medium text-grey">Herdado do cargo</th>
						<th scope="col" class="px-4 py-3 text-left font-medium text-navy">Exceção</th>
					</tr>
				</thead>
				<tbody>
					{#each GRUPOS as g (g.id)}
						{@const mods = modulos.filter((m) => m.grupo === g.id)}
						{#if mods.length}
							<tr class="bg-bg/60"><td colspan="3" class="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey">{g.label}</td></tr>
							{#each mods as m (m.id)}
								{@const herd = nivelHerdado(pessoa, m.id)}
								{@const exc = excecao[pessoa.id]?.[m.id]}
								<tr class="border-b border-grey-200/60 last:border-0">
									<td class="px-4 py-2 font-medium text-navy">{m.label}</td>
									<td class="px-4 py-2 text-grey">{NIVEL_LABEL[herd]}</td>
									<td class="px-4 py-2">
										{#if superAtivo}
											<span class="text-xs text-grey">— (super-admin tem tudo)</span>
										{:else}
											<select
												class="nivel-sel !w-auto min-w-[150px]"
												data-n={exc ?? 'herdar'}
												value={exc ?? 'herdar'}
												aria-label="{m.label} — exceção para {pessoa.nome}"
												onchange={(e) => mudarExcecao(pessoa!.id, m.id, e.currentTarget.value)}
											>
												<option value="herdar">Herdar ({NIVEL_LABEL[herd]})</option>
												<option value="nenhum">Bloquear</option>
												<option value="ver">Ver</option>
												<option value="editar">Editar</option>
												<option value="excluir">Acesso Total</option>
											</select>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					{/each}
				</tbody>
			</table>
		</Card>
	{/if}
{/if}

<style>
	/* A matriz já cabe na coluna do app (1600px), então esta tela não estoura mais
	   para a direita: a margem direita é igual à esquerda, como no resto do app. Se
	   um dia a matriz voltar a não caber, ela rola dentro do próprio Card
	   (overflow-x-auto) — não na página. */
	.nivel-sel {
		width: 100%;
		min-width: 108px;
		border: 1px solid var(--color-grey-200);
		border-radius: 8px;
		padding: 4px 8px;
		font-size: 12px;
		font-weight: 600;
		background: #fff;
		color: var(--color-navy);
		cursor: pointer;
		/* A cor troca junto com o data-n, na hora do clique. */
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}
	/* Uma cor por nível, com fundo saturado o bastante para ler a matriz inteira
	   de relance e texto escuro do mesmo matiz. Todos os pares texto/fundo foram
	   medidos: ficam acima de 4.5:1 (AA), que é o exigido — 12px em negrito NÃO
	   conta como "texto grande" para a WCAG. */
	.nivel-sel[data-n='nenhum'] { background: #eef2f6; border-color: #cbd5e1; color: #475569; }
	.nivel-sel[data-n='ver'] { background: #dbeafe; border-color: #60a5fa; color: #1d4ed8; }
	.nivel-sel[data-n='editar'] { background: #d1fae5; border-color: #34d399; color: #047857; }
	.nivel-sel[data-n='excluir'] { background: #fee2e2; border-color: #f87171; color: #b91c1c; }
	.nivel-sel[data-n='herdar'] { background: #fff; border-color: var(--color-grey-200); color: #64748b; }
</style>
