import type { Action } from 'svelte/action';

/**
 * Faz um <textarea> ter exatamente a altura do seu conteúdo.
 *
 * Existe porque um <input> nunca quebra linha: a subtarefa "20 a 23 dobradinha
 * da mari organizar" aparecia como "20 a 23 dobradinha da mari organiz", e só
 * dava para ler o resto clicando e navegando com as setas. Um textarea comum
 * resolveria pela metade — ou fica alto demais para as subtarefas curtas, ou
 * ganha barra de rolagem nas longas.
 *
 * Passe o valor como parâmetro (`use:alturaAutomatica={s.titulo}`) para que a
 * altura seja recalculada quando o texto mudar por fora (recarga, edição em
 * outra aba), não só quando o usuário digita.
 *
 * Uso: <textarea rows="1" class="resize-none overflow-hidden" use:alturaAutomatica={valor} />
 */
export const alturaAutomatica: Action<HTMLTextAreaElement, string | undefined> = (node) => {
	function ajustar() {
		node.style.height = 'auto';
		// Elemento ainda sem layout (dentro de um modal que acabou de abrir):
		// medir agora daria 0 e o campo colapsaria. Deixa o `rows` valer.
		if (!node.scrollHeight) return;
		node.style.height = `${node.scrollHeight}px`;
	}

	// Depois do primeiro layout — antes disso o modal pode nem estar na tela.
	const frame = requestAnimationFrame(ajustar);
	node.addEventListener('input', ajustar);

	return {
		update() {
			ajustar();
		},
		destroy() {
			cancelAnimationFrame(frame);
			node.removeEventListener('input', ajustar);
		}
	};
};
