<script lang="ts" module>
	// Mapa nome → ícone Lucide. Só os ícones referenciados aqui entram no bundle
	// (tree-shaking), então continua leve. Mantém a API histórica <Icon name=".." size=.. />
	// para não tocar nos ~50 call sites do sistema.
	import {
		House,
		ClipboardList,
		Briefcase,
		Megaphone,
		Wrench,
		RefreshCw,
		LogOut,
		CircleDollarSign,
		Users,
		Book,
		UserRound,
		FileText,
		Folder,
		SquareCheckBig,
		Pencil,
		Tag,
		Funnel,
		Phone,
		Mail,
		Calendar,
		MessageSquare,
		Clock,
		Plus,
		X,
		Trash2,
		Building2,
		Search,
		ChartColumn,
		Bell,
		Zap,
		ChevronRight,
		Key,
		ClipboardCheck,
		type IconProps
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	export const ICONS: Record<string, Component<IconProps>> = {
		home: House,
		admin: ClipboardList,
		comercial: Briefcase,
		marketing: Megaphone,
		dtools: Wrench,
		refresh: RefreshCw,
		logout: LogOut,
		dollar: CircleDollarSign,
		users: Users,
		book: Book,
		contact: UserRound,
		file: FileText,
		folder: Folder,
		check: SquareCheckBig,
		edit: Pencil,
		tag: Tag,
		funnel: Funnel,
		phone: Phone,
		mail: Mail,
		calendar: Calendar,
		message: MessageSquare,
		clock: Clock,
		plus: Plus,
		x: X,
		trash: Trash2,
		building: Building2,
		search: Search,
		chart: ChartColumn,
		bell: Bell,
		zap: Zap,
		chevron: ChevronRight,
		key: Key,
		clipboard: ClipboardCheck
	};
</script>

<script lang="ts">
	// Ícones de linha (Lucide). stroke = currentColor (herda a cor do texto do pai),
	// stroke-width 2 e viewBox 24 — mesma estética dos ícones anteriores.
	let {
		name,
		size = 18,
		class: extra = ''
	}: { name: string; size?: number; class?: string } = $props();

	const Glyph = $derived(ICONS[name]);
</script>

{#if Glyph}
	<Glyph {size} class={extra} aria-hidden="true" />
{/if}
