import { carregarCrm } from '$lib/server/crm';
import type { LayoutServerLoad } from './$types';

// Uma carga só para as cinco telas do módulo: navegar entre Dashboard, Kanban,
// Contatos, Metas e Relatórios não toca no banco de novo (o load do layout não
// depende da URL). Quem atualiza é o `invalidateAll` depois de cada ação.
export const load: LayoutServerLoad = ({ locals: { supabase } }) => carregarCrm(supabase);
