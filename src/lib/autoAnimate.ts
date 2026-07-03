import autoAnimate from '@formkit/auto-animate';
import type { Action } from 'svelte/action';

/**
 * Anima automaticamente adições, remoções e reordenações dos filhos diretos do nó.
 * Uso: <div use:autoanimate> … </div> (ex.: colunas de kanban, listas, pipeline).
 */
export const autoanimate: Action = (node) => {
	autoAnimate(node);
};
