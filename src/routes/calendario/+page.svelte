<script lang="ts">
	import CalendarioConteudos from '$lib/components/CalendarioConteudos.svelte';
	let { data, form } = $props();
</script>

<CalendarioConteudos {data} {form} />
