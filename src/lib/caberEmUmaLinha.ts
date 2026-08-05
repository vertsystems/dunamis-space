import type { Action } from 'svelte/action';

interface Opcoes {
	/** Menor fonte aceitável, em px. Abaixo disso o texto é truncado. */
	min?: number;
	/** Fonte natural do elemento, em px. */
	max?: number;
}

/**
 * Encolhe a fonte até o texto caber em uma linha, em vez de quebrar em duas.
 *
 * Existe porque as categorias de serviço vêm dos dados, não de uma lista fixa:
 * "Carros e Veículos de Som" quebrava o chip em duas linhas e desalinhava a
 * tabela inteira, e qualquer nome novo pode ser mais longo ainda. Medir é mais
 * confiável que estimar a fonte pelo número de caracteres — a largura depende da
 * coluna, da fonte e do zoom.
 *
 * O elemento precisa poder ser limitado pelo pai (max-width) e esconder o
 * excesso (overflow-hidden), senão ele cresce e nunca "estoura" para medir.
 *
 * Uso: <span use:caberEmUmaLinha={{ max: 11, min: 8 }}>…</span>
 */
export const caberEmUmaLinha: Action<HTMLElement, Opcoes | undefined> = (node, opcoes) => {
	let { min = 8, max = 11 } = opcoes ?? {};

	function ajustar() {
		node.style.fontSize = `${max}px`;
		// Sem largura ainda (elemento oculto ou fora do fluxo): nada a medir.
		if (!node.clientWidth) return;
		let tamanho = max;
		while (tamanho > min && node.scrollWidth > node.clientWidth) {
			tamanho -= 0.5;
			node.style.fontSize = `${tamanho}px`;
		}
	}

	ajustar();

	// A coluna muda de largura ao redimensionar a janela e ao abrir/fechar a
	// barra lateral; sem observar, o texto ficaria pequeno para sempre.
	//
	// Observa o PAI, não o próprio nó: mudar a fonte muda o tamanho do nó, e
	// observá-lo realimentaria o próprio ajuste.
	const ro = new ResizeObserver(ajustar);
	if (node.parentElement) ro.observe(node.parentElement);

	// Trocar a categoria na edição inline muda o texto sem mudar a largura da
	// coluna — o ResizeObserver não veria.
	const mo = new MutationObserver(ajustar);
	mo.observe(node, { childList: true, characterData: true, subtree: true });

	return {
		update(novas) {
			({ min = 8, max = 11 } = novas ?? {});
			ajustar();
		},
		destroy() {
			ro.disconnect();
			mo.disconnect();
		}
	};
};
