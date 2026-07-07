import { error } from '@sveltejs/kit';
import { temNivel, type Nivel } from '$lib/permissoes';

/**
 * Guarda de ação no servidor: lança 403 se o usuário não tiver o nível mínimo
 * no módulo. Use no topo das actions de mutação (criar/editar → 'editar';
 * excluir → 'excluir'). O RLS já bloqueia no banco; isto dá um erro claro antes.
 */
export function exigirPermissao(
	locals: App.Locals,
	modulo: string,
	nivel: Nivel = 'editar'
): void {
	if (!temNivel(locals.permissoes, modulo, nivel)) {
		error(403, 'Você não tem permissão para esta ação.');
	}
}
