<script lang="ts">
	// Avatar de categoria — círculo com ícone escolhido por palavra-chave.
	import {
		Store,
		Utensils,
		Scale,
		HeartPulse,
		BedDouble,
		ShoppingBag,
		Sparkles,
		Wrench,
		PawPrint,
		GraduationCap,
		Car
	} from '@lucide/svelte';

	let { category = null, size = 28 }: { category?: string | null; size?: number } = $props();

	const Icone = $derived(pickIcon(category));

	function pickIcon(cat: string | null) {
		const c = (cat ?? '').toLowerCase();
		if (/rest|pizz|hamb|padar|confeit|caf|bar|açoug|acoug|deliver|aliment/.test(c)) return Utensils;
		if (/advoc|contab|jurid|escrit/.test(c)) return Scale;
		if (/clinic|clín|saud|saúd|dent|odont|médic|medic|fisio|psic|nutri|farm|estétic|estetic|depila|podolog/.test(c))
			return HeartPulse;
		if (/salão|salao|barbear|cabelo|beleza|sobrance|manicure|esmalt/.test(c)) return Sparkles;
		if (/móvel|movel|colch|marcen|serralh|constru/.test(c)) return BedDouble;
		if (/pet|veterin|animal/.test(c)) return PawPrint;
		if (/auto|mecân|mecan|oficina|lava|borrach|funilaria|carro|concess/.test(c)) return Car;
		if (/oficina|conserto|reparo/.test(c)) return Wrench;
		if (/escola|curso|idioma|educa|autoescola/.test(c)) return GraduationCap;
		if (/loja|ótic|otic|joal|papel|eletr|mercado|varej|calçad|calcad|roupa/.test(c)) return ShoppingBag;
		return Store;
	}
</script>

<span
	class="grid shrink-0 place-items-center rounded-full bg-bg text-slate"
	style="width: {size}px; height: {size}px"
>
	<Icone size={Math.round(size * 0.5)} />
</span>
