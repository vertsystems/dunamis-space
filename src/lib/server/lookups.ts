// Consultas de apoio repetidas nos `load` — as listas que alimentam os <Select>
// dos formulários.
//
// Por que existe: `colaboradores.select('id, nome, avatar_url, funcao, funcoes')
// .eq('ativo', true).order('nome')` aparecia LITERALMENTE em 8 loads e
// `clientes.select('id, nome').order('nome')` em 15. Trocar uma coluna (parar de
// trazer avatar_url, por exemplo) custava caçar todas as cópias, e o
// esquecimento de uma só aparece em runtime.
//
// Devolvem o QUERY BUILDER, não o resultado — assim continuam compondo com
// `Promise.all([...])`, com `sel()` e com o destructuring `{ data }` que os call
// sites já usam. Trocar a implementação aqui não obriga a mexer em nenhum deles.
type Supa = App.Locals['supabase'];

// App.Locals['supabase'] é um SupabaseClient SEM o generic do schema, então o
// PostgREST devolve linhas `unknown` e o `sel<T>()` inferia T = unknown — o que
// quebrava o type-check de quem passa a lista para uma prop tipada (ex.:
// ResponsavelPicker, CampanhaForm). O overrideTypes declara a forma real.
export type ColaboradorLite = {
	id: string;
	nome: string;
	avatar_url: string | null;
	funcao: string | null;
	funcoes: string[] | null;
};
export type NomeLite = { id: string; nome: string };

/** Colaboradores ativos — o "responsável" de quase todo formulário. */
export function colaboradoresAtivos(supabase: Supa) {
	return supabase
		.from('colaboradores')
		.select('id, nome, avatar_url, funcao, funcoes')
		.eq('ativo', true)
		.order('nome')
		.overrideTypes<ColaboradorLite[], { merge: false }>();
}

/** Todos os clientes (id + nome), para seletores. */
export function clientesLite(supabase: Supa) {
	return supabase
		.from('clientes')
		.select('id, nome')
		.order('nome')
		.overrideTypes<NomeLite[], { merge: false }>();
}

/** Só os clientes com status ativo. */
export function clientesAtivos(supabase: Supa) {
	return supabase
		.from('clientes')
		.select('id, nome')
		.eq('status', 'ativo')
		.order('nome')
		.overrideTypes<NomeLite[], { merge: false }>();
}

/** Projetos (id + nome), para seletores. */
export function projetosLite(supabase: Supa) {
	return supabase
		.from('projetos')
		.select('id, nome')
		.order('nome')
		.overrideTypes<NomeLite[], { merge: false }>();
}
