// Auto-save reutilizável para formulários de EDIÇÃO.
// Aplica-se a um <form> que já tem `action` apontando para a action de update.
// Ao editar um campo, envia o form ao endpoint (respeitando os `required` via
// checkValidity) sem depender do botão Salvar nem do enhance do form — assim não
// dispara efeitos como fechar o drawer. Reporta o estado via `onStatus`.
//
// Uso:
//   <form method="POST" action="?/x_atualizar" use:autosave={{ enabled: editando, onStatus }}>

import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type AutosaveParams = {
	/** Liga o auto-save (normalmente só na edição de um registro existente). */
	enabled: boolean;
	/** Debounce em ms ao digitar (padrão 700). */
	delay?: number;
	/** Recebe o estado atual (idle | saving | saved | error). */
	onStatus?: (status: AutosaveStatus) => void;
	/** Se true, recarrega os dados da página após salvar (padrão false, p/ não perder foco). */
	refresh?: boolean;
};

export function autosave(node: HTMLFormElement, params: AutosaveParams) {
	let p = params;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let resetTimer: ReturnType<typeof setTimeout> | null = null;
	let inFlight = false;
	let pending = false;

	const status = (s: AutosaveStatus) => p.onStatus?.(s);

	async function salvar() {
		if (!p.enabled) return;
		// Respeita campos obrigatórios: não salva enquanto inválido.
		if (!node.checkValidity()) return;
		if (inFlight) {
			pending = true;
			return;
		}
		inFlight = true;
		if (resetTimer) clearTimeout(resetTimer);
		status('saving');
		try {
			const res = await fetch(node.action, {
				method: 'POST',
				body: new FormData(node),
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				status('saved');
				resetTimer = setTimeout(() => status('idle'), 1600);
				if (p.refresh) await invalidateAll();
			} else {
				status('error');
			}
		} catch {
			status('error');
		} finally {
			inFlight = false;
			if (pending) {
				pending = false;
				agendar(0);
			}
		}
	}

	function agendar(ms: number) {
		if (timer) clearTimeout(timer);
		timer = setTimeout(salvar, ms);
	}

	function onInput() {
		if (p.enabled) agendar(p.delay ?? 700);
	}
	function onChange() {
		if (p.enabled) agendar(150); // selects/checkboxes salvam quase na hora
	}

	node.addEventListener('input', onInput);
	node.addEventListener('change', onChange);

	return {
		update(next: AutosaveParams) {
			p = next;
		},
		destroy() {
			if (timer) clearTimeout(timer);
			if (resetTimer) clearTimeout(resetTimer);
			node.removeEventListener('input', onInput);
			node.removeEventListener('change', onChange);
		}
	};
}
