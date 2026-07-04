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

// Roadmap — próximas ferramentas ("em breve") exibidas na Visão Geral do DTools.
// Edite livremente conforme o pipeline de integrações.
export type FerramentaRoadmap = { label: string; icon: string };

export const DTOOLS_ROADMAP: FerramentaRoadmap[] = [
	{ label: 'Encurtador de Links', icon: 'zap' },
	{ label: 'Gerador de UTM', icon: 'tag' },
	{ label: 'Calculadora de Orçamento', icon: 'dollar' }
];

// Contato para solicitação de novas ferramentas (ajuste para WhatsApp/e-mail da equipe).
export const DTOOLS_SOLICITAR_URL =
	'mailto:bruno.bsarts@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20nova%20ferramenta%20%E2%80%94%20DTools';
