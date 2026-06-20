<script lang="ts">
	// Comportamento apenas (sem markup): assina o Realtime da tabela `jobs` e
	// dispara um toast quando um job termina (done) ou falha (failed).
	import { page } from '$app/state';
	import { toast } from '$lib/toast.svelte';
	import { jobLabel } from '$lib/jobs';

	const supabase = $derived(page.data.supabase);

	$effect(() => {
		if (!supabase) return;
		const channel = supabase
			.channel('jobs-watch')
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'jobs' },
				(payload: { new: { tipo: string; status: string; erro: string | null } }) => {
					const j = payload.new;
					if (j.status === 'done') toast.success(`${jobLabel(j.tipo)}: concluído`);
					else if (j.status === 'failed')
						toast.error(`${jobLabel(j.tipo)}: falhou${j.erro ? ` — ${j.erro}` : ''}`);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	});
</script>
