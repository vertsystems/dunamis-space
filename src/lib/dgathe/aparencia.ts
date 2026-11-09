// Como cada pessoa aparece no DGathe: o catálogo de opções do editor (Meu
// Perfil) e a leitura segura do que vem do banco ou de outro navegador.
//
// Guardado em colaboradores.dgathe_avatar (migration 0097) só com ids do
// catálogo e uma cor; o desenho de cada opção fica em avatar.ts.

export type Opcao = { id: string; nome: string };
export type OpcaoCor = Opcao & { cor: string };
export type OpcaoRoupa = Opcao & { grupo: 'Formal' | 'Casual' };

export const CORPOS: Opcao[] = [
	{ id: 'masculino', nome: 'Masculino' },
	{ id: 'feminino', nome: 'Feminino' }
];

export const PELES: OpcaoCor[] = [
	{ id: 'clara', nome: 'Clara', cor: '#f3d2b3' },
	{ id: 'media', nome: 'Média', cor: '#e0b089' },
	{ id: 'morena', nome: 'Morena', cor: '#c68a5e' },
	{ id: 'parda', nome: 'Parda', cor: '#9a6440' },
	{ id: 'negra', nome: 'Negra', cor: '#6b4428' }
];

export const CABELOS: Opcao[] = [
	{ id: 'curto', nome: 'Curto' },
	{ id: 'social', nome: 'Social (de lado)' },
	{ id: 'raspado', nome: 'Raspado' },
	{ id: 'cacheado', nome: 'Cacheado' },
	{ id: 'black', nome: 'Black power' },
	{ id: 'chanel', nome: 'Chanel' },
	{ id: 'longo', nome: 'Longo' },
	{ id: 'rabo', nome: 'Rabo de cavalo' },
	{ id: 'coque', nome: 'Coque' },
	{ id: 'careca', nome: 'Careca' }
];

export const CORES_CABELO: OpcaoCor[] = [
	{ id: 'preto', nome: 'Preto', cor: '#1f1a17' },
	{ id: 'castanho', nome: 'Castanho', cor: '#5a3825' },
	{ id: 'loiro', nome: 'Loiro', cor: '#d6ae5c' },
	{ id: 'ruivo', nome: 'Ruivo', cor: '#a4462a' },
	{ id: 'grisalho', nome: 'Grisalho', cor: '#a3a6ab' }
];

export const ROUPAS: OpcaoRoupa[] = [
	{ id: 'terno', nome: 'Terno e gravata', grupo: 'Formal' },
	{ id: 'blazer', nome: 'Blazer', grupo: 'Formal' },
	{ id: 'social', nome: 'Camisa social', grupo: 'Formal' },
	{ id: 'vestido', nome: 'Vestido', grupo: 'Formal' },
	{ id: 'camiseta', nome: 'Camiseta', grupo: 'Casual' },
	{ id: 'polo', nome: 'Polo', grupo: 'Casual' },
	{ id: 'xadrez', nome: 'Camisa xadrez', grupo: 'Casual' },
	{ id: 'jaqueta', nome: 'Jaqueta', grupo: 'Casual' },
	{ id: 'jeans', nome: 'Jaqueta jeans', grupo: 'Casual' },
	{ id: 'moletom', nome: 'Moletom', grupo: 'Casual' }
];

export const CORES_ROUPA: OpcaoCor[] = [
	{ id: 'marinho', nome: 'Azul-marinho', cor: '#1c2534' },
	{ id: 'grafite', nome: 'Grafite', cor: '#4a505b' },
	{ id: 'azul', nome: 'Azul', cor: '#3b6ef6' },
	{ id: 'laranja', nome: 'Laranja Dunamis', cor: '#e0662a' },
	{ id: 'verde', nome: 'Verde', cor: '#17915a' },
	{ id: 'roxo', nome: 'Roxo', cor: '#7c5cd6' },
	{ id: 'rosa', nome: 'Rosa', cor: '#e05a7a' },
	{ id: 'vinho', nome: 'Vinho', cor: '#7d2337' },
	{ id: 'bege', nome: 'Bege', cor: '#d8c3a0' },
	{ id: 'branco', nome: 'Branco', cor: '#f1efe9' }
];

export const SAPATOS: Opcao[] = [
	{ id: 'social', nome: 'Social preto' },
	{ id: 'marrom', nome: 'Social marrom' },
	{ id: 'tenis', nome: 'Tênis branco' },
	{ id: 'tenisPreto', nome: 'Tênis preto' },
	{ id: 'bota', nome: 'Bota' },
	{ id: 'salto', nome: 'Salto' }
];

export const OCULOS: Opcao[] = [
	{ id: 'nenhum', nome: 'Sem óculos' },
	{ id: 'grau', nome: 'De grau' },
	{ id: 'grosso', nome: 'Armação grossa' },
	{ id: 'sol', nome: 'Escuros' }
];

export type Aparencia = {
	corpo: string;
	pele: string;
	cabelo: string;
	corCabelo: string;
	roupa: string;
	/** Cor da peça de cima (#rrggbb). */
	corRoupa: string;
	sapato: string;
	oculos: string;
};

export const APARENCIA_PADRAO: Aparencia = {
	corpo: 'masculino',
	pele: 'media',
	cabelo: 'curto',
	corCabelo: 'preto',
	roupa: 'terno',
	corRoupa: '#1c2534',
	sapato: 'social',
	oculos: 'nenhum'
};

const HEX = /^#[0-9a-f]{6}$/i;
const tem = (lista: Opcao[], id: unknown): id is string => typeof id === 'string' && lista.some((o) => o.id === id);

/**
 * Lê uma aparência guardada ou recebida. Campo desconhecido ou fora do
 * catálogo cai no padrão; a cor de tema do perfil é a cor de roupa padrão
 * (era o que o avatar usava antes do editor existir).
 */
export function lerAparencia(bruto: unknown, corTema?: string | null): Aparencia {
	const base: Aparencia = { ...APARENCIA_PADRAO, corRoupa: corTema && HEX.test(corTema) ? corTema.toLowerCase() : APARENCIA_PADRAO.corRoupa };
	if (!bruto || typeof bruto !== 'object') return base;
	const a = bruto as Record<string, unknown>;
	return {
		corpo: tem(CORPOS, a.corpo) ? a.corpo : base.corpo,
		pele: tem(PELES, a.pele) ? a.pele : base.pele,
		cabelo: tem(CABELOS, a.cabelo) ? a.cabelo : base.cabelo,
		corCabelo: tem(CORES_CABELO, a.corCabelo) ? a.corCabelo : base.corCabelo,
		roupa: tem(ROUPAS, a.roupa) ? a.roupa : base.roupa,
		corRoupa: typeof a.corRoupa === 'string' && HEX.test(a.corRoupa) ? a.corRoupa.toLowerCase() : base.corRoupa,
		sapato: tem(SAPATOS, a.sapato) ? a.sapato : base.sapato,
		oculos: tem(OCULOS, a.oculos) ? a.oculos : base.oculos
	};
}

export function iguais(a: Aparencia, b: Aparencia): boolean {
	return (Object.keys(APARENCIA_PADRAO) as (keyof Aparencia)[]).every((k) => a[k] === b[k]);
}

export const corDe = (lista: OpcaoCor[], id: string) => lista.find((o) => o.id === id)?.cor ?? lista[0].cor;
