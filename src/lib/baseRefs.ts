// Base Refs — biblioteca de referências e ferramentas de design, organizada
// por problema (nicho), não por ordem alfabética. Cópia fiel de
// https://filestools.vercel.app/ — 14 nichos, 105 links.
//
// Como adicionar um link: inclua um objeto em `ferramentas` do nicho certo.
// O logo mora em static/base-refs/logos/<arquivo>.png (22×22 é o bastante);
// sem logo, informe `letra` e a inicial aparece no lugar.

export type Ferramenta = {
	nome: string;
	/** Domínio curto exibido ao lado do nome. */
	host: string;
	href: string;
	/** Uma linha sobre o que resolve — vira o tooltip e entra na busca. */
	desc: string;
	/** Nome do arquivo em static/base-refs/logos/. */
	logo?: string;
	/** Inicial mostrada quando não há logo. */
	letra?: string;
};

export type Nicho = {
	id: string;
	titulo: string;
	desc: string;
	/** Miolo do SVG (viewBox 0 0 24 24, traço 1.5) — o wrapper fica no componente. */
	icone: string;
	ferramentas: Ferramenta[];
};

export const NICHOS: Nicho[] = [
	{
		id: '3d-e-mockups',
		titulo: '3D e mockups',
		desc: 'Coloca a tela, a marca ou a embalagem numa cena que parece real.',
		icone: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
		ferramentas: [
			{
				nome: 'Ultramock',
				host: 'ultramock.io',
				href: 'https://www.ultramock.io/',
				desc: 'Crie mockups de produto com acabamento profissional para apresentações, portfólios e lançamentos.',
				logo: 'ultramock-io.png'
			},
			{
				nome: 'Thumb by Craftwork',
				host: 'thumb.craftwork.design',
				href: 'https://thumb.craftwork.design/',
				desc: 'Monte thumbnails e composições com fundos, sombras, molduras e exportação rápida.',
				logo: 'thumb-craftwork-design.png'
			},
			{
				nome: 'Formia',
				host: 'formia.so',
				href: 'https://formia.so/3d3a3eff-0092-42ff-8738-39bc0d814b16',
				desc: 'Transforme logos 2D em ativos e animações 3D para experiências de marca.',
				logo: 'formia-so.png'
			},
			{
				nome: 'Shots',
				host: 'shots.so',
				href: 'https://shots.so/',
				desc: 'Crie mockups, imagens e vídeos animados rapidamente para apresentações, sites e redes sociais.',
				logo: 'shots-so.png'
			},
			{
				nome: 'Mockuuups Studio',
				host: 'mockuuups.studio',
				href: 'https://mockuuups.studio/',
				desc: 'Aplique telas em milhares de cenas fotográficas e dispositivos, inclusive diretamente no Figma.',
				logo: 'mockuuups-studio.png'
			},
			{
				nome: 'Rotato',
				host: 'rotato.app',
				href: 'https://rotato.app/',
				desc: 'Produza mockups e animações 3D de dispositivos com controle de câmera, reflexos e materiais.',
				logo: 'rotato-app.png'
			},
			{
				nome: 'Hello Mockup',
				host: 'hellomocku.com',
				href: 'https://www.hellomocku.com/',
				desc: 'Mockups gratuitos de dispositivos, papelaria e embalagem para montar apresentação rápida.',
				logo: 'hellomocku-com.png'
			}
		]
	},
	{
		id: 'repositorios-de-sites-criados-com-ia',
		titulo: 'Repositórios de sites criados com IA',
		desc: 'Sites e seções feitos com IA, com o prompt aberto pra reaproveitar.',
		icone:
			'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14l1.4 2.6L12 18l-2.6 1.4M15 13l.9 1.7 1.7.9-1.7.9-.9 1.7-.9-1.7-1.7-.9 1.7-.9.9-1.7z"/>',
		ferramentas: [
			{
				nome: 'MotionSites AI',
				host: 'motionsites.ai',
				href: 'https://motionsites.ai/',
				desc: 'Referências premium de sites com motion e prompts prontos para gerar direções visuais com IA.',
				logo: 'motionsites-ai.png'
			},
			{
				nome: 'Figma Make & Sites Gallery',
				host: 'figma.com',
				href: 'https://www.figma.com/gallery/',
				desc: 'Projetos da comunidade feitos com Figma Make e Sites, com prompts e arquivos para explorar.',
				logo: 'figma-com.png'
			},
			{
				nome: 'Replit Gallery',
				host: 'replit.com',
				href: 'https://replit.com/gallery',
				desc: 'Galeria de sites e aplicações publicados pela comunidade, útil para observar soluções criadas e remixáveis.',
				logo: 'replit-com.png'
			},
			{
				nome: 'Jiro · Free Components',
				host: 'jiro.build',
				href: 'https://jiro.build/components/free',
				desc: 'Biblioteca de componentes e seções com prompts prontos para reproduzir layouts em Bolt, Lovable, v0, Replit e outros builders.',
				logo: 'jiro-build.png'
			},
			{
				nome: '5S Design Library',
				host: '5sdesign.art',
				href: 'https://www.5sdesign.art/library',
				desc: 'Biblioteca visual de seções e componentes para explorar referências e acelerar a criação de interfaces com IA.',
				logo: '5sdesign-art.png'
			},
			{
				nome: 'GetLayers',
				host: 'getlayers.ai',
				href: 'https://www.getlayers.ai/',
				desc: 'Biblioteca AI-native de templates, cenas 3D, seções e backgrounds com prompts prontos para criar sites menos genéricos.',
				logo: 'getlayers-ai.png'
			},
			{
				nome: 'Motion Prompts',
				host: 'motionprompts.dev',
				href: 'https://motionprompts.dev/',
				desc: 'Biblioteca gratuita de animações GSAP e WebGL com demos e prompts validados para Claude Code, Cursor e outros agentes.',
				logo: 'motionprompts-dev.png'
			}
		]
	},
	{
		id: 'sites-de-inspiracao',
		titulo: 'Sites de inspiração',
		desc: 'Repertório de layout, hierarquia e copy pra sair do briefing sem travar.',
		icone:
			'<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
		ferramentas: [
			{
				nome: 'Design do Brasil',
				host: 'designdobrasil.co',
				href: 'https://designdobrasil.co/',
				desc: 'Curadoria brasileira de sites e portfólios com direção visual relevante.',
				logo: 'designdobrasil-co.png'
			},
			{
				nome: 'Lapa Ninja',
				host: 'lapa.ninja',
				href: 'https://www.lapa.ninja/',
				desc: 'Galeria extensa de landing pages e seções para pesquisar estrutura, composição e padrões de conversão.',
				logo: 'lapa-ninja.png'
			},
			{
				nome: 'Unsection',
				host: 'unsection.com',
				href: 'https://www.unsection.com/',
				desc: 'Biblioteca de seções reais: hero, CTA, preços, recursos, depoimentos e muito mais.',
				logo: 'unsection-com.png'
			},
			{
				nome: 'Land-book · Hero',
				host: 'land-book.com',
				href: 'https://land-book.com/sections/hero',
				desc: 'Coleção de hero sections para estudar mensagem, hierarquia e impacto inicial.',
				logo: 'land-book-com.png'
			},
			{
				nome: 'Landingfolio',
				host: 'landingfolio.com',
				href: 'https://www.landingfolio.com/',
				desc: 'Landing pages e blocos filtráveis por seção, indústria e estilo, com templates.',
				logo: 'landingfolio-com.png'
			},
			{
				nome: 'One Page Love',
				host: 'onepagelove.com',
				href: 'https://onepagelove.com/',
				desc: 'Curadoria de sites de página única, ótima para estrutura enxuta e narrativa direta.',
				logo: 'onepagelove-com.png'
			},
			{
				nome: 'landing.love',
				host: 'landing.love',
				href: 'https://www.landing.love/',
				desc: 'Vitrine de sites com animação, para estudar ritmo, transição e scroll.',
				logo: 'landing-love.png'
			},
			{
				nome: 'Bento Grids',
				host: 'bentogrids.com',
				href: 'https://bentogrids.com/',
				desc: 'Coleção de layouts em bento, para resolver grade de features sem cair no óbvio.',
				logo: 'bentogrids-com.png'
			},
			{
				nome: 'Pinterest',
				host: 'pinterest.com',
				href: 'https://www.pinterest.com/',
				desc: 'Board visual pra garimpar direção de arte, fotografia e composição fora da bolha de UI.',
				logo: 'pinterest-com.png'
			},
			{
				nome: 'SaaSpo',
				host: 'saaspo.com',
				href: 'https://www.saaspo.com/',
				desc: 'Landing pages SaaS organizadas por página, seção e elemento visual.',
				logo: 'saaspo-com.png'
			},
			{
				nome: 'SaaSFrame',
				host: 'saasframe.io',
				href: 'https://www.saasframe.io/saas',
				desc: 'Telas e fluxos de produtos SaaS filtráveis por indústria, página e padrão.',
				logo: 'saasframe-io.png'
			},
			{
				nome: 'The App Fuel',
				host: 'theappfuel.com',
				href: 'https://theappfuel.com/',
				desc: 'Referências de campanhas, criativos e estratégias usadas por aplicativos em crescimento.',
				logo: 'theappfuel-com.png'
			},
			{
				nome: 'Dark Design',
				host: 'dark.design',
				href: 'https://www.dark.design/',
				desc: 'Galeria especializada em interfaces escuras, contraste e atmosfera.',
				logo: 'dark-design.png'
			},
			{
				nome: 'Minimal Gallery',
				host: 'minimal.gallery',
				href: 'https://minimal.gallery/',
				desc: 'Curadoria de sites minimalistas com foco em tipografia, espaço e precisão.',
				logo: 'minimal-gallery.png'
			},
			{
				nome: 'Godly',
				host: 'godly.website',
				href: 'https://godly.website/',
				desc: 'Sites modernos e experimentais com execução visual marcante.',
				logo: 'godly-website.png'
			},
			{
				nome: 'Awwwards',
				host: 'awwwards.com',
				href: 'https://www.awwwards.com/',
				desc: 'Premiações, sites do dia e tendências para acompanhar a fronteira do web design.',
				logo: 'awwwards-com.png'
			},
			{
				nome: 'A/B Test Design',
				host: 'abtest.design',
				href: 'https://abtest.design/',
				desc: 'Resultados de testes A/B em onboarding, checkout, monetização e retenção.',
				logo: 'abtest-design.png'
			},
			{
				nome: 'MaxiBestOf',
				host: 'maxibestof.one',
				href: 'https://maxibestof.one/',
				desc: 'Feed de sites atualizado todo dia útil, com filtro por setor, tipografia e seção.',
				logo: 'maxibestof-one.png'
			},
			{
				nome: 'Dead Simple Sites',
				host: 'deadsimplesites.com',
				href: 'https://deadsimplesites.com/',
				desc: 'Sites que resolvem com pouquíssimo elemento, pra quando o projeto pede silêncio.',
				logo: 'deadsimplesites-com.png'
			},
			{
				nome: 'Hex · Inspo Sites',
				host: 'hex.inc',
				href: 'https://www.hex.inc/inspo-sites',
				desc: 'Lista enxuta das galerias que valem a visita, útil quando as suas de sempre secaram.',
				logo: 'hex-inc.png'
			},
			{
				nome: 'Curated Design',
				host: 'curated.design',
				href: 'https://www.curated.design/',
				desc: 'Curadoria por categoria e por estilo, boa pra fechar direção antes de abrir o Figma.',
				logo: 'curated-design.png'
			},
			{
				nome: 'CSS Design Awards',
				host: 'cssdesignawards.com',
				href: 'https://www.cssdesignawards.com/',
				desc: 'Premiação diária de sites, com nota separada de design, usabilidade e criatividade.',
				logo: 'cssdesignawards-com.png'
			}
		]
	},
	{
		id: 'referencia-por-bloco',
		titulo: 'Referência por bloco',
		desc: 'Quando o problema não é a página inteira, é aquela seção que não fecha.',
		icone:
			'<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="9.5" width="12" height="5" rx="1.2"/>',
		ferramentas: [
			{
				nome: 'Supahero',
				host: 'supahero.io',
				href: 'https://www.supahero.io/',
				desc: 'Só heros, filtráveis por estilo e tipo de negócio, pra resolver a primeira dobra.',
				logo: 'supahero-io.png'
			},
			{
				nome: 'Footer.design',
				host: 'footer.design',
				href: 'https://footer.design/',
				desc: 'Biblioteca dedicada a rodapé, o bloco que todo mundo deixa por último e entrega mal.',
				logo: 'footer-design.png'
			},
			{
				nome: 'CTA Gallery',
				host: 'cta.gallery',
				href: 'https://cta.gallery/',
				desc: 'Chamadas para ação de sites reais, boas pra comparar verbo, tamanho e contraste.',
				logo: 'cta-gallery.png'
			},
			{
				nome: 'Navbar Gallery',
				host: 'navbar.gallery',
				href: 'https://www.navbar.gallery/',
				desc: 'Menus e navegação de topo, com o comportamento no mobile junto.',
				logo: 'navbar-gallery.png'
			},
			{
				nome: 'SaaS Landing Page',
				host: 'saaslandingpage.com',
				href: 'https://saaslandingpage.com/',
				desc: 'Páginas de SaaS abertas por seção, com o que cada bloco está tentando provar.',
				logo: 'saaslandingpage-com.png'
			},
			{
				nome: 'Pure Landing',
				host: 'purelanding.page',
				href: 'https://purelanding.page/',
				desc: 'Landing pages limpas separadas por seção, pra copiar estrutura sem copiar estilo.',
				logo: 'purelanding-page.png'
			}
		]
	},
	{
		id: 'referencias-de-produto-e-fluxos',
		titulo: 'Referências de produto e fluxos',
		desc: 'Telas e jornadas de produtos reais, do onboarding ao checkout.',
		icone:
			'<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v5a3 3 0 003 3H14"/>',
		ferramentas: [
			{
				nome: 'Mobbin',
				host: 'mobbin.com',
				href: 'https://mobbin.com/',
				desc: 'Pesquise telas, elementos e jornadas de produtos reais em mobile e web, com integração MCP.',
				logo: 'mobbin-com.png'
			},
			{
				nome: 'Refero',
				host: 'refero.design',
				href: 'https://refero.design/',
				desc: 'Biblioteca de telas e fluxos de produtos reais para pesquisa de UI, UX e padrões específicos.',
				logo: 'refero-design.png'
			},
			{
				nome: 'Page Flows',
				host: 'pageflows.com',
				href: 'https://pageflows.com/',
				desc: 'Vídeos e sequências completas de onboarding, checkout, assinatura e outros fluxos de produto.',
				logo: 'pageflows-com.png'
			}
		]
	},
	{
		id: 'packs-de-icones',
		titulo: 'Packs de ícones',
		desc: 'Famílias consistentes, do traço minimalista ao ícone 3D.',
		icone:
			'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="3.5"/><rect x="3" y="14" width="7" height="7" rx="3.5"/><path d="M17.5 13.6l3.4 6.4h-6.8l3.4-6.4z"/>',
		ferramentas: [
			{
				nome: 'Thiings',
				host: 'thiings.co',
				href: 'https://www.thiings.co/things',
				desc: 'Biblioteca com milhares de ícones 3D gerados por IA, pronta para explorar e baixar.',
				logo: 'thiings-co.png'
			},
			{
				nome: 'Myicons',
				host: 'myicons.co',
				href: 'https://myicons.co/',
				desc: 'Pack premium de ícones lineares minimalistas com plugin para Figma e web app.',
				logo: 'myicons-co.png'
			},
			{
				nome: 'Phosphor Icons',
				host: 'phosphoricons.com',
				href: 'https://phosphoricons.com/',
				desc: 'Família versátil com diferentes pesos e ótima cobertura para produtos digitais.',
				logo: 'phosphoricons-com.png'
			},
			{
				nome: 'Hugeicons',
				host: 'hugeicons.com',
				href: 'https://hugeicons.com/',
				desc: 'Coleção extensa com múltiplos estilos, integrações para código e plugin para Figma.',
				logo: 'hugeicons-com.png'
			},
			{
				nome: 'Lucide',
				host: 'lucide.dev',
				href: 'https://lucide.dev/',
				desc: 'Ícones open source, leves, consistentes e fáceis de personalizar.',
				logo: 'lucide-dev.png'
			},
			{
				nome: 'Tabler Icons',
				host: 'tabler.io',
				href: 'https://tabler.io/icons',
				desc: 'Mais de seis mil ícones SVG gratuitos, consistentes e prontos para Figma ou código.',
				logo: 'tabler-io.png'
			},
			{
				nome: 'Heroicons',
				host: 'heroicons.com',
				href: 'https://heroicons.com/',
				desc: 'Ícones SVG da equipe do Tailwind, com bibliotecas oficiais para React e Vue.',
				logo: 'heroicons-com.png'
			},
			{
				nome: 'Iconify',
				host: 'iconify.design',
				href: 'https://iconify.design/',
				desc: 'Pesquise centenas de milhares de ícones open source de diferentes famílias em um único lugar.',
				logo: 'iconify-design.png'
			}
		]
	},
	{
		id: 'componentes-para-ui-com-ia',
		titulo: 'Componentes para UI com IA',
		desc: 'Blocos prontos em React e Tailwind pro agente montar a interface.',
		icone: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
		ferramentas: [
			{
				nome: '21st.dev',
				host: '21st.dev',
				href: 'http://21st.dev/',
				desc: 'Grande registro de componentes, blocos e estilos para React e Tailwind, prontos para copiar e adaptar.',
				logo: '21st-dev.png'
			},
			{
				nome: 'Magic UI',
				host: 'magicui.design',
				href: 'https://magicui.design/',
				desc: 'Biblioteca open source de componentes e efeitos animados para landing pages e produtos digitais.',
				logo: 'magicui-design.png'
			},
			{
				nome: 'Aceternity UI',
				host: 'ui.aceternity.com',
				href: 'https://ui.aceternity.com/',
				desc: 'Componentes visuais em React e Tailwind com backgrounds, cards, motion e efeitos de alto impacto.',
				logo: 'ui-aceternity-com.png'
			},
			{
				nome: 'React Bits',
				host: 'reactbits.dev',
				href: 'https://reactbits.dev/',
				desc: 'Coleção de componentes animados e efeitos React com visual menos convencional e código reutilizável.',
				logo: 'reactbits-dev.png'
			}
		]
	},
	{
		id: 'animacoes-e-efeitos',
		titulo: 'Animações e efeitos',
		desc: 'Microinteração, hover e motion com o código pronto pra copiar.',
		icone: '<path d="M2 12h3.2l2.4-6 3.2 12 2.8-9 2 5H22"/>',
		ferramentas: [
			{
				nome: 'Effect.app · ASCII',
				host: 'effect.app',
				href: 'http://effect.app/',
				desc: 'Transforme imagens e vídeos em composições ASCII com controles e exportação.',
				logo: 'effect-app.png'
			},
			{
				nome: 'Laser Design Buttons',
				host: 'laser-design-buttons.webflow.io',
				href: 'https://laser-design-buttons.webflow.io/',
				desc: 'Botões clonáveis com hover em CSS, Webflow e GSAP.',
				logo: 'laser-design-buttons-webflow-io.png'
			},
			{
				nome: '60fps',
				host: '60fps.design',
				href: 'https://60fps.design/',
				desc: 'Biblioteca de animações e microinterações observadas em produtos reais.',
				logo: '60fps-design.png'
			},
			{
				nome: 'Animista',
				host: 'animista.net',
				href: 'https://animista.net/',
				desc: 'Explore, ajuste e copie animações CSS para entradas, saídas, atenção e elementos de interface.',
				logo: 'animista-net.png'
			},
			{
				nome: 'OriginKit',
				host: 'originkit.dev',
				href: 'https://www.originkit.dev/',
				desc: 'Componentes animados gratuitos para criar interfaces modernas com maior impacto.',
				logo: 'originkit-dev.png'
			},
			{
				nome: 'Design Spells',
				host: 'designspells.com',
				href: 'https://designspells.com/',
				desc: 'Catálogo de microinterações reais de produtos, com o detalhe explicado.',
				logo: 'designspells-com.png'
			},
			{
				nome: 'SVG Artista',
				host: 'svgartista.net',
				href: 'https://svgartista.net/',
				desc: 'Anime o traço de qualquer SVG e copie o CSS pronto.',
				logo: 'svgartista-net.png'
			}
		]
	},
	{
		id: 'shaders-gradients-e-backgrounds',
		titulo: 'Shaders, gradients e backgrounds',
		desc: 'Fundo que carrega a página sozinho: shader, gradient, grão e ruído.',
		icone:
			'<circle cx="12" cy="12" r="9"/><path d="M3.6 15.2c4-1.2 6-4.4 8.4-8.4M6.6 19.4c4.8-2 8-6 10.4-11.6"/>',
		ferramentas: [
			{
				nome: 'Unicorn Studio',
				host: 'unicorn.studio',
				href: 'https://www.unicorn.studio/edit/0QmWxb7hBelNyPQd5LES?template=true',
				desc: 'Crie motion, shaders e experiências interativas em WebGL sem escrever GLSL.',
				logo: 'unicorn-studio.png'
			},
			{
				nome: 'ShaderGradient',
				host: 'shadergradient.co',
				href: 'https://shadergradient.co/',
				desc: 'Gradients animados em WebGL com integração para web, Figma, Framer e React.',
				logo: 'shadergradient-co.png'
			},
			{
				nome: 'Mesh Gradient',
				host: 'meshgradient.com',
				href: 'https://meshgradient.com/',
				desc: 'Editor simples para criar mesh gradients deformáveis usando WebGL shaders.',
				letra: 'M'
			},
			{
				nome: 'Grainient',
				host: 'grainient.supply',
				href: 'https://grainient.supply/',
				desc: 'Gradients suaves ou granulados, backgrounds animados, arte gerada por IA e ferramenta de shaders.',
				logo: 'grainient-supply.png'
			},
			{
				nome: 'Haikei',
				host: 'haikei.app',
				href: 'https://haikei.app/',
				desc: 'Gere blobs, waves, grids, gradients e outros assets SVG customizáveis para interfaces.',
				logo: 'haikei-app.png'
			},
			{
				nome: 'Background Supply',
				host: 'background.supply',
				href: 'https://www.background.supply/',
				desc: 'Coleções de fundos texturizados prontos, com prompts para gerar variações.',
				logo: 'background-supply.png'
			}
		]
	},
	{
		id: 'skills-essenciais-para-ui',
		titulo: 'Skills essenciais para UI',
		desc: 'Skills que ensinam o agente a ter direção visual, não só a codar.',
		icone: '<path d="M13.5 2.5L4 13.8h6.6L10.5 21.5 20 10.2h-6.6l.1-7.7z"/>',
		ferramentas: [
			{
				nome: 'Frontend Design · Anthropic',
				host: 'github.com',
				href: 'https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md',
				desc: 'Ajuda agentes a definir uma direção visual clara e criar interfaces menos genéricas.',
				logo: 'github-com.png'
			},
			{
				nome: 'Frontend Skill · OpenAI',
				host: 'github.com',
				href: 'https://github.com/openai/skills/blob/main/skills/.curated/frontend-skill/SKILL.md',
				desc: 'Skill de direção de arte, hierarquia, motion e composição para experiências digitais.',
				logo: 'github-com.png'
			},
			{
				nome: 'Product Design Audit · OpenAI',
				host: 'github.com',
				href: 'https://github.com/openai/role-specific-plugins/blob/main/plugins/product-design/skills/audit/SKILL.md',
				desc: 'Estrutura auditorias de fluxos com evidências, riscos de acessibilidade e recomendações acionáveis.',
				logo: 'github-com.png'
			},
			{
				nome: 'Design System Rules · OpenAI',
				host: 'github.com',
				href: 'https://github.com/openai/skills/blob/main/skills/.curated/figma-create-design-system-rules/SKILL.md',
				desc: 'Gera regras de design system ligadas ao código, tokens, acessibilidade e convenções do projeto.',
				logo: 'github-com.png'
			},
			{
				nome: 'GSAP Skills · Examples',
				host: 'github.com',
				href: 'https://github.com/greensock/gsap-skills/tree/main/examples',
				desc: 'Exemplos oficiais para animações com JavaScript, React, Vue, timelines e ScrollTrigger.',
				logo: 'github-com.png'
			},
			{
				nome: 'Remotion · Agent Skills',
				host: 'github.com',
				href: 'https://github.com/remotion-dev/remotion/tree/main/packages/skills/skills',
				desc: 'Boas práticas para agentes criarem vídeos e motion programático com Remotion.',
				logo: 'github-com.png'
			},
			{
				nome: 'Skills.sh · Design & UI',
				host: 'skills.sh',
				href: 'http://skills.sh/',
				desc: 'Diretório para descobrir skills de design, UI, revisão visual e design systems para diferentes agentes.',
				logo: 'skills-sh.png'
			},
			{
				nome: 'Web Design Guidelines · Vercel',
				host: 'github.com',
				href: 'https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines',
				desc: 'Audita interfaces contra regras de spacing, tipografia, interação, acessibilidade e UX da Vercel.',
				logo: 'github-com.png'
			},
			{
				nome: 'Figma Implement Design · OpenAI',
				host: 'github.com',
				href: 'https://github.com/openai/skills/tree/main/skills/.curated/figma-implement-design',
				desc: 'Workflow oficial para transformar designs do Figma em código com fidelidade visual e uso de tokens.',
				logo: 'github-com.png'
			},
			{
				nome: 'Figma Generate Design · OpenAI',
				host: 'github.com',
				href: 'https://github.com/openai/plugins/tree/main/plugins/figma/skills/figma-generate-design',
				desc: 'Workflow oficial para criar e atualizar telas no Figma reutilizando componentes, variáveis e estilos.',
				logo: 'github-com.png'
			},
			{
				nome: 'Claude Code Templates',
				host: 'aitmpl.com',
				href: 'https://www.aitmpl.com/',
				desc: 'Agentes, comandos, skills e MCPs prontos para instalar no Claude Code.',
				logo: 'aitmpl-com.png'
			},
			{
				nome: 'Motion Design · LottieFiles',
				host: 'github.com',
				href: 'https://github.com/LottieFiles/motion-design-skill',
				desc: 'Skill que dá timing, easing e coreografia ao agente, em vez de animação genérica.',
				logo: 'github-com.png'
			},
			{
				nome: 'img2threejs',
				host: 'github.com',
				href: 'https://github.com/img2threejs/img2threejs',
				desc: 'Skill que vira imagem de referência em modelo Three.js procedural, feito em código.',
				logo: 'github-com.png'
			}
		]
	},
	{
		id: 'design-system-ia',
		titulo: 'Design System + IA',
		desc: 'Sistemas, tokens e regras que o agente consegue ler e respeitar.',
		icone:
			'<circle cx="7" cy="7" r="3.6"/><circle cx="17" cy="17" r="3.6"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.4"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.4"/>',
		ferramentas: [
			{
				nome: 'Design Systems Repo for the AI Era',
				host: 'designsystemsrepo.ai',
				href: 'https://designsystemsrepo.ai/',
				desc: 'Curadoria dedicada a design systems preparados para IA, automação e agentes.',
				logo: 'designsystemsrepo-ai.png'
			},
			{
				nome: 'State of AI in Design Systems',
				host: 'github.com',
				href: 'https://github.com/kaelig/state-of-ai-in-design-systems',
				desc: 'Pesquisa de campo sobre MCP, agent skills, llms.txt e repositórios de sistemas AI-friendly.',
				logo: 'github-com.png'
			},
			{
				nome: 'Design Systems Surf',
				host: 'designsystems.surf',
				href: 'https://designsystems.surf/design-systems',
				desc: 'Diretório de sistemas reais com atalhos para Figma, repositórios e Storybooks.',
				logo: 'designsystems-surf.png'
			},
			{
				nome: 'UI Guideline · Components',
				host: 'uiguideline.com',
				href: 'https://www.uiguideline.com/components',
				desc: 'Boas práticas de componentes sintetizadas a partir de grandes design systems.',
				logo: 'uiguideline-com.png'
			},
			{
				nome: 'The Component Gallery',
				host: 'component.gallery',
				href: 'https://component.gallery/',
				desc: 'Comparação de componentes em design systems reais, com exemplos e implementação.',
				logo: 'component-gallery.png'
			}
		]
	},
	{
		id: 'resources-para-ui-designers',
		titulo: 'Resources para UI Designers',
		desc: 'Kits, fontes, plugins e templates pra não começar do zero.',
		icone: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',
		ferramentas: [
			{
				nome: 'Figma Community',
				host: 'figma.com',
				href: 'https://www.figma.com/community',
				desc: 'UI kits, wireframes, templates, plugins, widgets e arquivos compartilhados pela comunidade.',
				logo: 'figma-com.png'
			},
			{
				nome: 'TOOOLS.design',
				host: 'toools.design',
				href: 'http://toools.design/',
				desc: 'Diretório amplo e atualizado de recursos para UI, UX, produto, motion e design visual.',
				logo: 'toools-design.png'
			},
			{
				nome: 'Craftwork',
				host: 'craftwork.design',
				href: 'https://craftwork.design/',
				desc: 'UI kits, ilustrações, mockups, fontes, templates e assets de alta qualidade.',
				logo: 'craftwork-design.png'
			},
			{
				nome: 'UI Resources',
				host: 'ui-resources.com',
				href: 'https://ui-resources.com/',
				desc: 'Biblioteca de recursos gratuitos com kits, plugins, texturas, efeitos e tutoriais.',
				logo: 'ui-resources-com.png'
			},
			{
				nome: 'Design Principles',
				host: 'principles.design',
				href: 'https://principles.design/',
				desc: 'Coleção aberta de princípios usados por equipes para orientar decisões de produto.',
				logo: 'principles-design.png'
			},
			{
				nome: 'Framer University',
				host: 'framer.university',
				href: 'https://framer.university/resources',
				desc: 'Componentes, templates e efeitos gratuitos para Framer.',
				logo: 'framer-university.png'
			}
		]
	},
	{
		id: 'ferramentas-para-designers',
		titulo: 'Ferramentas para designers',
		desc: 'Cor, contraste, conversão e mapa: o utilitário do dia a dia.',
		icone:
			'<path d="M14.5 3.5a5 5 0 00-6.6 6.2L3 14.6V21h6.4l4.9-4.9a5 5 0 006.2-6.6L17 12.5 11.5 7l3.5-3.5z"/>',
		ferramentas: [
			{
				nome: 'Color Bridge',
				host: 'figma.com',
				href: 'https://www.figma.com/community/plugin/1533130671388354336/color-bridge-color-palette-contrast-generator',
				desc: 'Plugin do Figma para gerar paletas e avaliar contraste durante o trabalho.',
				logo: 'figma-com.png'
			},
			{
				nome: 'OKLCH.fyi',
				host: 'oklch.fyi',
				href: 'http://oklch.fyi/',
				desc: 'Crie paletas perceptualmente consistentes no espaço de cor OKLCH.',
				logo: 'oklch-fyi.png'
			},
			{
				nome: 'Radix Colors',
				host: 'radix-ui.com',
				href: 'https://www.radix-ui.com/colors/custom',
				desc: 'Monte escalas claras e escuras em 12 etapas para superfícies, bordas e texto.',
				logo: 'radix-ui-com.png'
			},
			{
				nome: 'UI Colors',
				host: 'uicolors.app',
				href: 'https://uicolors.app/tailwind-colors/lime',
				desc: 'Explore e gere escalas de cor no padrão do Tailwind.',
				logo: 'uicolors-app.png'
			},
			{
				nome: 'MapCN',
				host: 'mapcn.dev',
				href: 'https://www.mapcn.dev/',
				desc: 'Crie mapas personalizados com acabamento visual para produtos digitais.',
				logo: 'mapcn-dev.png'
			},
			{
				nome: 'FreeConvert · WebM',
				host: 'freeconvert.com',
				href: 'https://www.freeconvert.com/pt/webm-converter/download',
				desc: 'Converta arquivos WebM para outros formatos de vídeo e mídia.',
				logo: 'freeconvert-com.png'
			},
			{
				nome: 'Figcomponents',
				host: 'figcomponents.com',
				href: 'https://www.figcomponents.com/',
				desc: 'Componentes Figma selecionados para copiar, adaptar e acelerar interfaces.',
				logo: 'figcomponents-com.png'
			}
		]
	},
	{
		id: 'ferramentas-de-ia',
		titulo: 'Ferramentas de IA',
		desc: 'Gerar página, vetor, imagem e vídeo sem sair do fluxo de trabalho.',
		icone:
			'<path d="M12 2.5l2.3 5.2 5.2 2.3-5.2 2.3L12 17.5l-2.3-5.2L4.5 10l5.2-2.3L12 2.5z"/><path d="M18.6 16.4l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2z"/>',
		ferramentas: [
			{
				nome: 'v0',
				host: 'v0.dev',
				href: 'https://v0.dev/chat',
				desc: 'Gere, edite e publique aplicações web a partir de instruções em linguagem natural.',
				logo: 'v0-dev.png'
			},
			{
				nome: 'Higgsfield',
				host: 'higgsfield.ai',
				href: 'https://higgsfield.ai/',
				desc: 'Gere imagens e vídeos cinematográficos com IA: câmera, personagens consistentes e criativos prontos para campanha.',
				logo: 'higgsfield-ai.png'
			},
			{
				nome: 'Recraft',
				host: 'recraft.ai',
				href: 'https://www.recraft.ai/',
				desc: 'Gere vetores, ilustrações, ícones, imagens e ativos de marca com controle de estilo.',
				logo: 'recraft-ai.png'
			},
			{
				nome: 'Figma Make',
				host: 'figma.com',
				href: 'https://www.figma.com/make/',
				desc: 'Transforme prompts e contexto de design em protótipos funcionais dentro do ecossistema Figma.',
				logo: 'figma-com.png'
			}
		]
	}
];

/** Total de links em todos os nichos. */
export const TOTAL_REFS = NICHOS.reduce((n, nicho) => n + nicho.ferramentas.length, 0);

/**
 * Texto de busca de um link: nome, host, descrição e nicho, sem acentos e em
 * minúsculas — o mesmo tratamento que a página aplica ao que a pessoa digita.
 */
export function semAcento(texto: string): string {
	return texto
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

export function chaveDeBusca(f: Ferramenta, nicho: Nicho): string {
	return semAcento(`${f.nome} ${f.host} ${f.desc} ${nicho.titulo}`);
}
