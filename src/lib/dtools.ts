// DTools — ferramentas internas da Dunamis integradas ao sistema.
//
// Como adicionar uma ferramenta:
//   1. Crie a rota em `src/routes/dtools/<slug>/+page.svelte`
//   2. Adicione uma entrada no array DTOOLS_FERRAMENTAS abaixo
// A sidebar do departamento DTools e a página inicial (/dtools) são geradas
// automaticamente a partir desta lista.

export type Ferramenta = {
	href: string; // ex.: '/dtools/encurtador'
	label: string;
	icon: string; // glyph ou emoji
	descricao?: string;
};

export const DTOOLS_FERRAMENTAS: Ferramenta[] = [
	// Exemplos de como ficará (descomente/edite quando criar a ferramenta):
	// { href: '/dtools/encurtador', label: 'Encurtador de Links', icon: '🔗', descricao: 'Gera links curtos da Dunamis.' },
	// { href: '/dtools/gerador-utm', label: 'Gerador de UTM', icon: '🏷️', descricao: 'Monta URLs com parâmetros de campanha.' }
];
