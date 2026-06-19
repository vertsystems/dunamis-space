<script lang="ts">
	import { page } from '$app/state';

	let { entidadeTipo, entidadeId }: { entidadeTipo: string; entidadeId: string } = $props();

	let comentarios = $state<any[]>([]);
	let texto = $state('');
	let saving = $state(false);
	let meuId = $state<string | null>(null);

	const supabase = $derived(page.data.supabase);
	const user = $derived(page.data.user);

	async function carregar() {
		const { data } = await supabase
			.from('comentarios')
			.select('id, texto, created_at, colaborador:colaboradores(nome)')
			.eq('entidade_tipo', entidadeTipo)
			.eq('entidade_id', entidadeId)
			.order('created_at', { ascending: true });
		comentarios = data ?? [];
	}

	$effect(() => {
		if (entidadeId && supabase) carregar();
	});

	$effect(() => {
		if (user && supabase) {
			supabase
				.from('colaboradores')
				.select('id')
				.eq('auth_user_id', user.id)
				.maybeSingle()
				.then(({ data }: { data: { id: string } | null }) => (meuId = data?.id ?? null));
		}
	});

	async function enviar(e: Event) {
		e.preventDefault();
		if (!texto.trim()) return;
		saving = true;
		await supabase.from('comentarios').insert({
			entidade_tipo: entidadeTipo,
			entidade_id: entidadeId,
			colaborador_id: meuId,
			texto: texto.trim()
		});
		texto = '';
		saving = false;
		await carregar();
	}

	function fmt(d: string) {
		return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
	}
</script>

<div class="card card-body mb-4">
	<h2 class="h6">Comentários</h2>

	{#each comentarios as c (c.id)}
		<div class="mb-3 ps-3 border-start border-2">
			<div class="d-flex justify-content-between">
				<strong>{c.colaborador?.nome ?? 'Equipe'}</strong>
				<small class="text-muted">{fmt(c.created_at)}</small>
			</div>
			<p class="mb-0" style="white-space:pre-wrap;">{c.texto}</p>
		</div>
	{:else}
		<p class="text-muted mb-3">Nenhum comentário ainda.</p>
	{/each}

	<form onsubmit={enviar}>
		<div class="mb-2">
			<textarea class="form-control" rows="2" placeholder="Escreva um comentário…" bind:value={texto}></textarea>
		</div>
		<button class="btn btn-primary btn-sm" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}Comentar
		</button>
	</form>
</div>
