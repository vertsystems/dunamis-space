import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// O CRM virou o módulo Comercial em /comercial (dashboard, kanban, contatos,
// metas, relatórios). Redirect permanente: link antigo em notificação, e-mail ou
// favorito continua chegando ao lugar certo.
export const load: PageServerLoad = () => redirect(308, '/comercial');
