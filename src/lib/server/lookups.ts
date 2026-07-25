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

/** Colaboradores ativos — o "responsável" de quase todo formulário. */
export function colaboradoresAtivos(supabase: Supa) {
	return supabase
		.from('colaboradores')
		.select('id, nome, avatar_url, funcao, funcoes')
		.eq('ativo', true)
		.order('nome');
}

/** Todos os clientes (id + nome), para seletores. */
export function clientesLite(supabase: Supa) {
	return supabase.from('clientes').select('id, nome').order('nome');
}

/** Só os clientes com status ativo. */
export function clientesAtivos(supabase: Supa) {
	return supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome');
}

/** Projetos (id + nome), para seletores. */
export function projetosLite(supabase: Supa) {
	return supabase.from('projetos').select('id, nome').order('nome');
}
