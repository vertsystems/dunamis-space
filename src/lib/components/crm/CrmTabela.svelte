<script lang="ts">
	import { Badge, Card, Input, Select, toneClasses } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import {
		formatBRL,
		formatData,
		stageTone,
		negocioStatusTone,
		negocioStatusLabel,
		type Negocio,
		type Stage,
		type Colaborador
	} from '$lib/crm';

	let {
		negocios = [],
		stages = [],
		colaboradores = [],
		onOpen
	}: {
		negocios?: Negocio[];
		stages?: Stage[];
		colaboradores?: Colaborador[];
		onOpen: (id: string) => void;
	} = $props();

	const stageMap = $derived(new Map(stages.map((s) => [s.id, s])));

	let busca = $state('');
	let statusFiltro = $state('aberto');
	let respFiltro = $state('');
	let ordenarPor = $state<'created' | 'valor' | 'previsao' | 'titulo'>('created');
	let asc = $state(false);

	function ordenar(campo: typeof ordenarPor) {
		if (ordenarPor === campo) asc = !asc;
		else {
			ordenarPor = campo;
			asc = campo === 'titulo';
		}
	}

	const filtrados = $derived.by(() => {
		const q = busca.trim().toLowerCase();
		let lista = negocios.filter((n) => {
			if (statusFiltro !== 'todos' && n.status !== statusFiltro) return false;
			if (respFiltro && n.responsavel_id !== respFiltro) return false;
			if (q) {
				const alvo = `${n.titulo} ${n.contato_nome ?? ''} ${n.contato_empresa ?? ''}`.toLowerCase();
				if (!alvo.includes(q)) return false;
			}
			return true;
		});
		const dir = asc ? 1 : -1;
		lista = [...lista].sort((a, b) => {
			let r = 0;
			if (ordenarPor === 'valor') r = a.valor - b.valor;
			else if (ordenarPor === 'titulo') r = a.titulo.localeCompare(b.titulo, 'pt-BR');
			else if (ordenarPor === 'previsao')
				r = (a.previsao_fechamento ?? '').localeCompare(b.previsao_fechamento ?? '');
			else r = a.created_at.localeCompare(b.created_at);
			return r * dir;
		});
		return lista;
	});

	const seta = (campo: typeof ordenarPor) => (ordenarPor === campo ? (asc ? '↑' : '↓') : '');
</script>

<div class="flex flex-wrap items-end gap-2 mb-3">
	<Input
		type="search"
		placeholder="Buscar negócio ou contato"
		bind:value={busca}
		wrapperClass="w-64"
	/>
	<Select bind:value={statusFiltro} wrapperClass="w-36" aria-label="Status">
		<option value="aberto">Abertos</option>
		<option value="ganho">Ganhos</option>
		<option value="perdido">Perdidos</option>
		<option value="todos">Todos</option>
	</Select>
	<Select bind:value={respFiltro} wrapperClass="w-44" aria-label="Responsável">
		<option value="">Todos responsáveis</option>
		{#each colaboradores as col (col.id)}
			<option value={col.id}>{col.nome}</option>
		{/each}
	</Select>
	<span class="text-sm text-grey ml-auto">{filtrados.length} negócio(s)</span>
</div>

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">
						<button type="button" class="hover:text-navy" onclick={() => ordenar('titulo')}>
							Negócio {seta('titulo')}
						</button>
					</th>
					<th class="px-4 py-3 font-semibold">Contato</th>
					<th class="px-4 py-3 font-semibold">Etapa</th>
					<th class="px-4 py-3 font-semibold text-right">
						<button type="button" class="hover:text-navy" onclick={() => ordenar('valor')}>
							Valor {seta('valor')}
						</button>
					</th>
					<th class="px-4 py-3 font-semibold">Responsável</th>
					<th class="px-4 py-3 font-semibold whitespace-nowrap">
						<button type="button" class="hover:text-navy" onclick={() => ordenar('previsao')}>
							Previsão {seta('previsao')}
						</button>
					</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each filtrados as n (n.id)}
					{@const st = n.stage_id ? stageMap.get(n.stage_id) : null}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => onOpen(n.id)}
					>
						<td class="px-4 py-3">
							<span class="font-medium text-navy">{n.titulo}</span>
						</td>
						<td class="px-4 py-3 text-slate">
							{n.contato_nome ?? n.contato_empresa ?? '—'}
						</td>
						<td class="px-4 py-3">
							{#if st}
								<span class="inline-flex items-center gap-1.5 text-xs {toneClasses[stageTone(st.cor)]} rounded-full px-2 py-0.5 font-semibold">
									{st.nome}
								</span>
							{:else}
								<span class="text-grey">—</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-right tabular-nums text-navy">{formatBRL(n.valor)}</td>
						<td class="px-4 py-3 text-slate whitespace-nowrap">{n.responsavel_nome ?? '—'}</td>
						<td class="px-4 py-3 whitespace-nowrap text-slate">{formatData(n.previsao_fechamento)}</td>
						<td class="px-4 py-3">
							<Badge tone={negocioStatusTone(n.status)}>{negocioStatusLabel(n.status)}</Badge>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-12 text-center text-grey">
							<div class="flex flex-col items-center gap-2">
								<Icon name="funnel" size={28} />
								Nenhum negócio encontrado.
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
