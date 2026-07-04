// DTools — ferramentas internas da Dunamis integradas ao sistema.
//
// Como adicionar uma ferramenta:
//   1. Crie a rota em `src/routes/dtools/<slug>/+page.svelte`
//   2. Adicione uma entrada no array DTOOLS_FERRAMENTAS abaixo
// A sidebar do departamento DTools e a página inicial (/dtools) são geradas
// automaticamente a partir desta lista.

export type Ferramenta = {
	href: string; // ex.: '/dtools/pagsup'
	label: string;
	icon: string; // nome de ícone do <Icon> (mapa Lucide em Icon.svelte)
	descricao?: string;
};

export const DTOOLS_FERRAMENTAS: Ferramenta[] = [
	{
		href: '/dtools/pagsup',
		label: "Pag's Up",
		icon: 'pagsup',
		descricao: 'Gestão de pagamentos de marketing: cronograma, prestadores e negociações.'
	}
];
