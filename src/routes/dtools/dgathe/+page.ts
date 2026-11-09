import type { PageLoad } from './$types';

// O DGathe é um jogo em canvas: não há o que renderizar no servidor.
export const ssr = false;

// A aparência do avatar (Meu Perfil) vem à parte, e não no perfil do layout,
// que roda em toda página. Se a consulta falhar, o boneco sai no padrão e o
// jogo abre do mesmo jeito.
export const load: PageLoad = async ({ parent }) => {
	const { supabase, perfil } = await parent();
	const id = (perfil as { id?: string } | null)?.id;
	if (!id) return { aparenciaSalva: null };
	const { data, error } = await supabase.from('colaboradores').select('dgathe_avatar').eq('id', id).maybeSingle();
	return { aparenciaSalva: error ? null : (data?.dgathe_avatar ?? null) };
};
