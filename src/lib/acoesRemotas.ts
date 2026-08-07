// Chamar uma action do SvelteKit sem <form> — o caso do calendário, em que
// arrastar um card, excluir pelo ícone ou trocar o status por um clique
// precisam falar com o servidor sem sair da tela.
//
// Por que existe: o trio `fetch` + `deserialize` + toast estava escrito três
// vezes no CalendarioConteudos, e uma delas esquecia o try/catch — sem ele, uma
// queda de rede deixava a tela travada em "processando" até recarregar.
import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { toast } from '$lib/toast.svelte';

/**
 * Envia `campos` para `action` (ex.: `/calendario?/excluir`).
 * No sucesso avisa e recarrega os dados; na falha mostra a mensagem do servidor.
 * Devolve true se deu certo — quem chama decide o que mais fazer.
 */
export async function chamarAction(
	action: string,
	campos: Record<string, string>,
	msg: { ok: string; erro: string }
): Promise<boolean> {
	const fd = new FormData();
	for (const [k, v] of Object.entries(campos)) fd.set(k, v);
	try {
		const resp = await fetch(action, { method: 'POST', body: fd });
		const result = deserialize(await resp.text());
		if (result.type === 'success') {
			toast.success(msg.ok);
			await invalidateAll();
			return true;
		}
		if (result.type === 'failure') {
			toast.error((result.data?.error as string) ?? msg.erro);
			return false;
		}
		// redirect/error: a action não deveria devolver isso aqui.
		toast.error(msg.erro);
		return false;
	} catch {
		toast.error('Falha de conexão. Tente novamente.');
		return false;
	}
}
