// LeadGrap — nichos de prospecção usados na tela de Captura.
// Dados puros (portados do app original). Ordenados do mais "quente"
// (maior intenção/ticket) ao mais "frio".

export type Temperature = 'quente' | 'morno' | 'frio';

export type Niche = {
	key: string;
	label: string;
	/** Termo usado na busca do Google Maps. */
	query: string;
};

export type CategoryGroup = {
	key: string;
	label: string;
	temperature: Temperature;
	niches: Niche[];
};

function niche(label: string, query?: string): Niche {
	const key = label
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]+/g, '-');
	return { key, label, query: query ?? label };
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
	{
		key: 'saude-bem-estar',
		label: 'Saúde & Bem-estar',
		temperature: 'quente',
		niches: [
			niche('Dentista'),
			niche('Clínica odontológica'),
			niche('Ortodontia'),
			niche('Clínica médica'),
			niche('Clínica de estética'),
			niche('Cirurgia plástica'),
			niche('Dermatologista'),
			niche('Cardiologista'),
			niche('Ortopedia'),
			niche('Ginecologista'),
			niche('Pediatria'),
			niche('Psicólogo'),
			niche('Psiquiatria'),
			niche('Nutricionista'),
			niche('Fisioterapeuta'),
			niche('Academia'),
			niche('Pilates'),
			niche('Studio de yoga'),
			niche('Crossfit'),
			niche('Personal trainer'),
			niche('Spa'),
			niche('Clínica de depilação'),
			niche('Esmalteria'),
			niche('Podologia'),
			niche('Estúdio de tatuagem'),
			niche('Clínica de micropigmentação'),
			niche('Laboratório de análises'),
			niche('Farmácia')
		]
	},
	{
		key: 'beleza-estetica',
		label: 'Beleza & Estética',
		temperature: 'quente',
		niches: [
			niche('Salão de beleza'),
			niche('Barbearia'),
			niche('Cabeleireiro'),
			niche('Instituto de beleza'),
			niche('Manicure'),
			niche('Design de sobrancelhas'),
			niche('Limpeza de pele')
		]
	},
	{
		key: 'alimentacao',
		label: 'Alimentação',
		temperature: 'quente',
		niches: [
			niche('Restaurante'),
			niche('Pizzaria'),
			niche('Hamburgueria'),
			niche('Padaria'),
			niche('Confeitaria'),
			niche('Cafeteria'),
			niche('Bar'),
			niche('Açougue'),
			niche('Delivery de comida', 'delivery')
		]
	},
	{
		key: 'pet-veterinaria',
		label: 'Pet & Veterinária',
		temperature: 'morno',
		niches: [
			niche('Pet shop'),
			niche('Veterinária'),
			niche('Clínica veterinária'),
			niche('Pet grooming'),
			niche('Hotel para pets'),
			niche('Adestramento')
		]
	},
	{
		key: 'automotivo',
		label: 'Automotivo',
		temperature: 'morno',
		niches: [
			niche('Oficina mecânica'),
			niche('Lava a jato'),
			niche('Borracharia'),
			niche('Auto elétrica'),
			niche('Funilaria e pintura'),
			niche('Concessionária')
		]
	},
	{
		key: 'comercio-varejo',
		label: 'Comércio & Varejo',
		temperature: 'morno',
		niches: [
			niche('Loja de roupas'),
			niche('Loja de calçados'),
			niche('Ótica'),
			niche('Joalheria'),
			niche('Papelaria'),
			niche('Loja de eletrônicos'),
			niche('Mercado')
		]
	},
	{
		key: 'servicos-profissionais',
		label: 'Serviços profissionais',
		temperature: 'frio',
		niches: [
			niche('Advocacia'),
			niche('Contabilidade'),
			niche('Imobiliária'),
			niche('Corretor de imóveis'),
			niche('Arquitetura'),
			niche('Engenharia')
		]
	},
	{
		key: 'educacao',
		label: 'Educação',
		temperature: 'frio',
		niches: [
			niche('Escola'),
			niche('Curso de idiomas'),
			niche('Autoescola'),
			niche('Escola de música')
		]
	},
	{
		key: 'casa-construcao',
		label: 'Casa & Construção',
		temperature: 'frio',
		niches: [
			niche('Material de construção'),
			niche('Marcenaria'),
			niche('Serralheria'),
			niche('Móveis planejados'),
			niche('Loja de colchões', 'colchões')
		]
	}
];

export const ALL_NICHES: Niche[] = CATEGORY_GROUPS.flatMap((g) => g.niches);

export const TEMP_TONE: Record<Temperature, string> = {
	quente: 'danger',
	morno: 'warning',
	frio: 'info'
};

export const TEMP_LABEL: Record<Temperature, string> = {
	quente: '🔥 Quente',
	morno: 'Morno',
	frio: 'Frio'
};
