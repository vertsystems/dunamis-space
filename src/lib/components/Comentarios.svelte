<script lang="ts">
	import { page } from '$app/state';
	import { Card, Button, Textarea } from '$lib/components/ui';

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

<Card class="mt-6">
	<h2 class="text-base font-semibold text-navy mb-3">Comentários</h2>

	{#each comentarios as c (c.id)}
		<div class="mb-3 pl-3 border-l-2 border-grey-200">
			<div class="flex justify-between">
				<strong class="text-navy">{c.colaborador?.nome ?? 'Equipe'}</strong>
				<small class="text-grey">{fmt(c.created_at)}</small>
			</div>
			<p class="mb-0 whitespace-pre-wrap text-slate">{c.texto}</p>
		</div>
	{:else}
		<p class="text-grey mb-3">Nenhum comentário ainda.</p>
	{/each}

	<form onsubmit={enviar}>
		<Textarea rows={2} placeholder="Escreva um comentário…" bind:value={texto} wrapperClass="mb-2" />
		<Button size="sm" type="submit" loading={saving}>Comentar</Button>
	</form>
</Card>
