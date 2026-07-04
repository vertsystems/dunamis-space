import type { Provider, Negotiation, Client } from './types';

// Dados-semente (seed). Persistência real virá depois; por ora o app hidrata
// destes valores na primeira carga e mantém o estado em localStorage.

export const INITIAL_CLIENTS: Client[] = [
	{ id: 'mari', name: 'Lojas Mari' },
	{ id: 'dunamis', name: 'Dunamis Company' },
	{ id: 'rede_bazzar', name: 'Rede Bazzar' },
	{ id: 'duda_utilidades', name: 'Duda Utilidades' }
];

export const INITIAL_NEGOTIATIONS: Negotiation[] = [
	{ id: '2', clientId: 'mari', company: 'Rádio Guarujá FM', service: 'Rádio Região (Litoral SP)', supplier: 'Guarujá FM (Osvaldo)', contractValue: 8820, pix: 'Boleto', region: 'Baixada Santista / Guarujá SP', dueDate: '00' },
	{ id: '3', clientId: 'mari', company: 'Dunamis Company', service: 'Ag. de Marketing', supplier: 'Dunamis Company (Bruno & Aline)', contractValue: 16000, pix: 'pix@dunamiscompany.com.br', region: 'Sorocaba SP', dueDate: '1' },
	{ id: '4', clientId: 'mari', company: 'Radio Verde Vale FM', service: 'Radio de Região (Vale do Ribeira)', supplier: 'Radio Verde Vale FM (Cascata)', contractValue: 2500, pix: '13 99636 9438', region: 'Vale do Ribeira / Registro SP', dueDate: '1' },
	{ id: '5', clientId: 'mari', company: 'Radio Regional FM 91.5', service: 'Radio de Região (Vale do Ribeira)', supplier: 'Radio Regional 91.5 FM (Sergio)', contractValue: 1800, pix: '48.673.743/0001-59', region: 'Vale do Ribeira / Registro SP', dueDate: '1' },
	{ id: '6', clientId: 'mari', company: 'Radio Interna Lojas Mari RadioSRV', service: 'Rádio Indoor / Rádio Interna Loja (Todas as Lojas)', supplier: 'RadioSRV (Jean)', contractValue: 838.8, pix: 'Boleto', region: 'SP', dueDate: '10' },
	{ id: '7', clientId: 'mari', company: 'Rádio Space FM', service: 'Rádio de Região (Ibiuna)', supplier: 'Rádio Space FM (Elaine)', contractValue: 1000, pix: '27888330000111', region: 'Ibiuna SP', dueDate: '10' },
	{ id: '8', clientId: 'mari', company: 'Jacupiranga Band FM 101,1', service: 'Rádio de Região (Jacupiranga/Vale do Ribeira)', supplier: 'Band Jacupiranga FM 101,1 (Mero)', contractValue: 640, pix: '03843579000142', region: 'Vale do Ribeira / Registro SP', dueDate: '15' },
	{ id: '9', clientId: 'mari', company: 'Clebes Oliveira (Bob Orla)', service: 'Influenciador Digital Personagem Bob Orla', supplier: 'Clebes Oliveira (Bob Orla)', contractValue: 1200, pix: '30341543802', region: 'Vale do Ribeira / Registro SP', dueDate: '25' }
];

export const INITIAL_PROVIDERS: Provider[] = [
	{ id: '1', clientId: 'mari', service: 'Carro de Som', name: 'Ailton Ribeiro', region: 'Registro', cpf: '30502941000194', pix: '27000742895', defaultPrice: 150 },
	{ id: '2', clientId: 'mari', service: 'Carro de Som', name: 'Elaine Cristina', region: 'Ibiuna', cpf: '27888330000111', pix: '27888330000111', defaultPrice: 150 },
	{ id: '3', clientId: 'mari', service: 'Carro de Som', name: 'Edmilson Antunes', region: 'Juquiá', cpf: '09789180888', pix: '13998018402', defaultPrice: 150 },
	{ id: '4', clientId: 'mari', service: 'Locução Loja', name: 'Paulo Sérgio', region: 'Ibiuna', cpf: '10110157818', pix: '15997188144', defaultPrice: 200 },
	{ id: '5', clientId: 'mari', service: 'Locução Loja', name: 'Talita Aguiar', region: 'Registro', cpf: '31123265801', pix: '31123265801', defaultPrice: 200 },
	{ id: '6', clientId: 'mari', service: 'Locução Loja', name: 'Claudio Porto', region: 'Salto de Pirapora', cpf: '43998357000113', pix: '15991274627', defaultPrice: 200 },
	{ id: '7', clientId: 'mari', service: 'Carro de Som', name: 'Solange Matias', region: 'Guarujá', cpf: '02847098836', pix: '13991651145', defaultPrice: 0 },
	{ id: '8', clientId: 'mari', service: 'Carro de Som', name: 'Irineu Aparecido (Neca)', region: 'Pilar do Sul', cpf: '59471081000150', pix: 'necapilar@gmail.com', defaultPrice: 0 },
	{ id: '9', clientId: 'mari', service: 'Carro de Som', name: 'Rita Santos', region: 'Angatuba', cpf: '44257274000136', pix: '26319723840', defaultPrice: 0 },
	{ id: '10', clientId: 'mari', service: 'Carro de Som', name: 'Susana Wesley', region: 'Piedade', cpf: '73143871768', pix: '77035143734', defaultPrice: 0 },
	{ id: '11', clientId: 'mari', service: 'Carro de Som', name: 'Marcos Saraiva', region: 'Capela do Alto', cpf: '26904160000159', pix: '2690416000159', defaultPrice: 0 },
	{ id: '13', clientId: 'mari', service: 'Locução Loja', name: 'Lindomar da Silva (Latyno)', region: 'Guarujá (ADH)', cpf: '19934502895', pix: '19934502895', defaultPrice: 0 },
	{ id: '14', clientId: 'mari', service: 'Locução Loja', name: 'Gustavo Antônio', region: 'Ibiuna', cpf: '44254573820', pix: '15998333755', defaultPrice: 0 },
	{ id: '15', clientId: 'mari', service: 'Locução Loja', name: 'Valdair Gonçalves (Formiga)', region: 'Registro', cpf: '33754449826', pix: '33754449826', defaultPrice: 0 },
	{ id: '16', clientId: 'mari', service: 'Carro de Som', name: 'Aliene Shox', region: 'Salto de Pirapora', cpf: '51501253000180', pix: 'rsomfilm@hotmail.com', defaultPrice: 0 },
	{ id: '17', clientId: 'mari', service: 'Locução Loja', name: 'Fernando Santos', region: 'Guarujá (ADH)', cpf: '22393165860', pix: '13974065472', defaultPrice: 0 },
	{ id: '18', clientId: 'mari', service: 'Influenciadores', name: 'Ruth Foés', region: 'Salto de Pirapora', cpf: '66663268000111', pix: '66663268000111', defaultPrice: 0 },
	{ id: '19', clientId: 'mari', service: 'Influenciadores', name: 'Anna Karolinny', region: 'Piedade', cpf: '47661816890', pix: 'akssannakaroliny@gmail.com', defaultPrice: 0 },
	{ id: '20', clientId: 'mari', service: 'Influenciadores', name: 'Thayna Cristiny', region: 'Registro', cpf: '43777507806', pix: '13997602824', defaultPrice: 0 },
	{ id: '21', clientId: 'mari', service: 'Influenciadores', name: 'Eduarda Pareja', region: 'Angatuba', cpf: '34918901875', pix: 'atelieartbeauty@gmail.com', defaultPrice: 0 },
	{ id: '22', clientId: 'mari', service: 'Influenciadores', name: 'Ana Julia Quevedo', region: 'Capela do Alto', cpf: '50184097894', pix: '15997404089', defaultPrice: 0 },
	{ id: '23', clientId: 'mari', service: 'Influenciadores', name: 'Clebes Oliveira', region: 'Registro', cpf: '30341543802', pix: '30341543802', defaultPrice: 0 },
	{ id: '24', clientId: 'mari', service: 'Gráficas', name: 'Gráfica SIMS - J.M Suprimentos', region: 'Guarujá', pix: '50093339000158', cpf: '50093339000158', defaultPrice: 0 },
	{ id: '25', clientId: 'mari', service: 'Gráficas', name: 'AL SOM Instalação e Comunicação - Gráfica JK', region: 'Piedade', pix: '00705469000126', cpf: '00705469000126', defaultPrice: 0 },
	{ id: '26', clientId: 'mari', service: 'Gráficas', name: 'Rodscreen Propaganda', region: 'Pilar do Sul', pix: '06252320000115', cpf: '06252320000115', defaultPrice: 0 },
	{ id: '27', clientId: 'mari', service: 'Gráficas', name: 'Nascente de Batatais Gráfica Editora', region: 'Batatais', pix: '18658590000100', cpf: '18658590000100', defaultPrice: 0 },
	{ id: '28', clientId: 'mari', service: 'Serviços', name: 'Dunamis Company LTDA.', region: 'Sorocaba', pix: 'pix@dunamiscompany.com.br', cpf: '52632995000107', defaultPrice: 0 }
];
