// Notificações flutuantes (toasts) — somem sozinhas após alguns segundos.
// Uso: import { toast } from '$lib/toast.svelte'; toast.success('Salvo!');

export type ToastTone = 'success' | 'error' | 'info';
export type ToastAction = { label: string; run: () => void };
export type Toast = { id: number; message: string; tone: ToastTone; action?: ToastAction };

let seq = 0;
const items = $state<Toast[]>([]);

/** Lista reativa de toasts ativos (lida pelo <Toaster />). */
export function getToasts(): Toast[] {
	return items;
}

export function dismiss(id: number) {
	const i = items.findIndex((t) => t.id === id);
	if (i !== -1) items.splice(i, 1);
}

function push(message: string, tone: ToastTone, ms: number, action?: ToastAction) {
	const id = ++seq;
	items.push({ id, message, tone, action });
	if (ms > 0) setTimeout(() => dismiss(id), ms);
	return id;
}

export const toast = {
	success: (message: string, ms = 3000) => push(message, 'success', ms),
	error: (message: string, ms = 5000) => push(message, 'error', ms),
	info: (message: string, ms = 3000) => push(message, 'info', ms),
	/** Toast com botão de ação (ex.: "Desfazer"). Fica mais tempo por padrão. */
	action: (message: string, label: string, run: () => void, tone: ToastTone = 'info', ms = 6000) =>
		push(message, tone, ms, { label, run })
};
