// DMetric — o portal do cliente: os números do site dele num link sem login.
// Quem abre não tem sessão: a leitura passa pela função security definer
// dmetric_portal_dados (0094), que confere o token, se o link está ligado e a
// senha, e só devolve os números do site dono do link.
//
// A senha é digitada uma vez: a função devolve uma prova (que muda se a senha
// mudar), guardada num cookie só deste link, por 30 dias.
import { error, fail, redirect } from '@sveltejs/kit';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import { slugDoPageLinks } from '$lib/dmetric/botoes';
import { somarDias } from '$lib/dmetric/painel';
import { periodoPedido, type PortalDados } from '$lib/dmetric/portal';
import { inicioDoDia } from '$lib/dmetric/recorte';
import { botoesDaPagina } from '$lib/server/pagelinks';
import type { Actions, PageServerLoad } from './$types';

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const NAO_EXISTE = 'Este link não existe ou foi desligado.';
/** Um cookie por link (o caminho também é só o dele). */
const cookieDo = (token: string) => `dm_portal_${token.slice(0, 12)}`;

export const load: PageServerLoad = async ({ params, url, cookies, locals: { supabase }, setHeaders }) => {
	if (!TOKEN.test(params.token)) error(404, NAO_EXISTE);
	// Os números mudam a cada visita; e não é página para buscador.
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	const hoje = diaEmBrasilia();
	const pedido = periodoPedido(url.searchParams, hoje);
	const { data, error: e } = await supabase.rpc('dmetric_portal_dados', {
		p_token: params.token,
		p_senha: null,
		p_prova: cookies.get(cookieDo(params.token)) ?? null,
		p_de: pedido?.de ?? null,
		p_ate: pedido?.ate ?? null
	});
	if (e) console.error('[dmetric] portal', e.message);
	const r = data as (PortalDados & { erro?: undefined }) | { erro: 'nao_existe' | 'senha' | 'travado' } | null;
	if (!r || r.erro === 'nao_existe') error(404, NAO_EXISTE);
	if (r.erro) return { senha: true as const, travado: r.erro === 'travado' };

	const slug = slugDoPageLinks(r.site);
	return {
		senha: false as const,
		dados: r,
		hoje,
		pedido: pedido?.id ?? null,
		// Página do PageLinks: os botões chegam depois (a página não espera).
		botoes: slug ? botoesDaPagina(slug, inicioDoDia(r.de), inicioDoDia(somarDias(r.ate, 1))) : null
	};
};

export const actions: Actions = {
	entrar: async ({ params, request, cookies, locals: { supabase } }) => {
		if (!TOKEN.test(params.token)) error(404, NAO_EXISTE);
		const senha = String((await request.formData()).get('senha') ?? '').slice(0, 200);
		if (!senha) return fail(400, { erro: 'Digite a senha.' });
		const { data } = await supabase.rpc('dmetric_portal_dados', {
			p_token: params.token,
			p_senha: senha,
			p_prova: null,
			p_de: null,
			p_ate: null
		});
		const r = data as { erro?: string; prova?: string | null } | null;
		if (!r || r.erro === 'nao_existe') error(404, NAO_EXISTE);
		if (r.erro === 'travado') return fail(429, { erro: 'Muitas tentativas. Espere 15 minutos e tente de novo.' });
		if (r.erro) return fail(400, { erro: 'Senha incorreta.' });
		if (r.prova)
			cookies.set(cookieDo(params.token), r.prova, {
				path: `/relatorio/${params.token}`,
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30
			});
		redirect(303, `/relatorio/${params.token}`);
	}
};
