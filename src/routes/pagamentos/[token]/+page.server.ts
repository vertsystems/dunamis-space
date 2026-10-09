// Painel público do financeiro do cliente: os pagamentos do mês e as NFs e
// recibos para baixar, sem login. Quem abre não tem sessão — a leitura passa
// pela função security definer pagsup_publico (migration 0069), que só
// devolve os pagamentos do cliente dono do token.
import { error } from '@sveltejs/kit';
import type { PainelPublico } from '$lib/pagsup/documentos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals: { supabase }, setHeaders }) => {
	const mes = url.searchParams.get('mes');
	const { data, error: e } = await supabase.rpc('pagsup_publico', {
		p_token: params.token,
		p_mes: mes && /^\d{4}-\d{2}$/.test(mes) ? mes : null
	});
	// Token malformado também cai aqui (o banco recusa o uuid): mesma resposta
	// do link desligado, sem dizer qual dos dois foi.
	if (e || !data) error(404, 'Este link não existe ou foi desligado.');

	// Os números mudam a cada NF anexada; e não é página para buscador.
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	return { painel: data as PainelPublico };
};
