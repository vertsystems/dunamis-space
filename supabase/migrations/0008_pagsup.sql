-- ============================================================
-- Dunamis Space — DTools / Pag's Up
-- Persistência da ferramenta de gestão de pagamentos de marketing.
-- Tabelas isoladas (pagsup_*), independentes do cadastro de clientes da agência.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0008_pagsup.sql
-- ============================================================

-- ---------- Clientes do Pag's Up ----------
create table if not exists public.pagsup_clientes (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ---------- Prestadores (carro de som, locução, influenciadores, gráficas...) ----------
create table if not exists public.pagsup_prestadores (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.pagsup_clientes (id) on delete cascade,
	nome text not null,
	servico text not null,
	regiao text,
	valor_padrao numeric(12, 2) not null default 0,
	cpf text,
	pix text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists pagsup_prestadores_cliente_idx on public.pagsup_prestadores (cliente_id);

-- ---------- Cronograma da semana (prestadores escalados p/ pagamento) ----------
create table if not exists public.pagsup_cronograma (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.pagsup_clientes (id) on delete cascade,
	prestador_id uuid not null references public.pagsup_prestadores (id) on delete cascade,
	data date,
	valor numeric(12, 2), -- null = "A definir"
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists pagsup_cronograma_cliente_idx on public.pagsup_cronograma (cliente_id);

-- ---------- Negociações mensais fixas (rádios, agências, serviços) ----------
create table if not exists public.pagsup_negociacoes (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.pagsup_clientes (id) on delete cascade,
	empresa text not null,
	servico text,
	fornecedor text,
	valor_contrato numeric(12, 2) not null default 0,
	pix text,
	regiao text,
	ddv text, -- dia de vencimento (texto livre, ex.: "10", "00")
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists pagsup_negociacoes_cliente_idx on public.pagsup_negociacoes (cliente_id);

-- ---------- Negociações escaladas no pagamento do mês ----------
create table if not exists public.pagsup_negociacoes_agendadas (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.pagsup_clientes (id) on delete cascade,
	negociacao_id uuid not null references public.pagsup_negociacoes (id) on delete cascade,
	data date,
	valor numeric(12, 2), -- null = "A definir"
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists pagsup_neg_agendadas_cliente_idx on public.pagsup_negociacoes_agendadas (cliente_id);

-- ============================================================
-- Triggers de updated_at + RLS (autenticados têm acesso total)
-- ============================================================
do $$
declare t text;
begin
	foreach t in array array[
		'pagsup_clientes', 'pagsup_prestadores', 'pagsup_cronograma',
		'pagsup_negociacoes', 'pagsup_negociacoes_agendadas'
	]
	loop
		execute format('drop trigger if exists trg_%1$s_updated on public.%1$I;', t);
		execute format(
			'create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();',
			t
		);
		execute format('alter table public.%I enable row level security;', t);
		execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
		execute format(
			'create policy %I on public.%I for all to authenticated using (true) with check (true);',
			t || '_authenticated_all', t
		);
	end loop;
end $$;

-- ============================================================
-- Seed inicial (só na primeira aplicação — se não houver clientes ainda).
-- Migra os dados-semente das Lojas Mari que viviam no localStorage.
-- ============================================================
do $$
declare
	mari uuid;
begin
	if not exists (select 1 from public.pagsup_clientes) then
		insert into public.pagsup_clientes (nome) values ('Lojas Mari') returning id into mari;
		insert into public.pagsup_clientes (nome) values ('Dunamis Company');
		insert into public.pagsup_clientes (nome) values ('Rede Bazzar');
		insert into public.pagsup_clientes (nome) values ('Duda Utilidades');

		insert into public.pagsup_prestadores (cliente_id, nome, servico, regiao, cpf, pix, valor_padrao) values
			(mari, 'Ailton Ribeiro', 'Carro de Som', 'Registro', '30502941000194', '27000742895', 150),
			(mari, 'Elaine Cristina', 'Carro de Som', 'Ibiuna', '27888330000111', '27888330000111', 150),
			(mari, 'Edmilson Antunes', 'Carro de Som', 'Juquiá', '09789180888', '13998018402', 150),
			(mari, 'Paulo Sérgio', 'Locução Loja', 'Ibiuna', '10110157818', '15997188144', 200),
			(mari, 'Talita Aguiar', 'Locução Loja', 'Registro', '31123265801', '31123265801', 200),
			(mari, 'Claudio Porto', 'Locução Loja', 'Salto de Pirapora', '43998357000113', '15991274627', 200),
			(mari, 'Solange Matias', 'Carro de Som', 'Guarujá', '02847098836', '13991651145', 0),
			(mari, 'Irineu Aparecido (Neca)', 'Carro de Som', 'Pilar do Sul', '59471081000150', 'necapilar@gmail.com', 0),
			(mari, 'Rita Santos', 'Carro de Som', 'Angatuba', '44257274000136', '26319723840', 0),
			(mari, 'Susana Wesley', 'Carro de Som', 'Piedade', '73143871768', '77035143734', 0),
			(mari, 'Marcos Saraiva', 'Carro de Som', 'Capela do Alto', '26904160000159', '2690416000159', 0),
			(mari, 'Lindomar da Silva (Latyno)', 'Locução Loja', 'Guarujá (ADH)', '19934502895', '19934502895', 0),
			(mari, 'Gustavo Antônio', 'Locução Loja', 'Ibiuna', '44254573820', '15998333755', 0),
			(mari, 'Valdair Gonçalves (Formiga)', 'Locução Loja', 'Registro', '33754449826', '33754449826', 0),
			(mari, 'Aliene Shox', 'Carro de Som', 'Salto de Pirapora', '51501253000180', 'rsomfilm@hotmail.com', 0),
			(mari, 'Fernando Santos', 'Locução Loja', 'Guarujá (ADH)', '22393165860', '13974065472', 0),
			(mari, 'Ruth Foés', 'Influenciadores', 'Salto de Pirapora', '66663268000111', '66663268000111', 0),
			(mari, 'Anna Karolinny', 'Influenciadores', 'Piedade', '47661816890', 'akssannakaroliny@gmail.com', 0),
			(mari, 'Thayna Cristiny', 'Influenciadores', 'Registro', '43777507806', '13997602824', 0),
			(mari, 'Eduarda Pareja', 'Influenciadores', 'Angatuba', '34918901875', 'atelieartbeauty@gmail.com', 0),
			(mari, 'Ana Julia Quevedo', 'Influenciadores', 'Capela do Alto', '50184097894', '15997404089', 0),
			(mari, 'Clebes Oliveira', 'Influenciadores', 'Registro', '30341543802', '30341543802', 0),
			(mari, 'Gráfica SIMS - J.M Suprimentos', 'Gráficas', 'Guarujá', '50093339000158', '50093339000158', 0),
			(mari, 'AL SOM Instalação e Comunicação - Gráfica JK', 'Gráficas', 'Piedade', '00705469000126', '00705469000126', 0),
			(mari, 'Rodscreen Propaganda', 'Gráficas', 'Pilar do Sul', '06252320000115', '06252320000115', 0),
			(mari, 'Nascente de Batatais Gráfica Editora', 'Gráficas', 'Batatais', '18658590000100', '18658590000100', 0),
			(mari, 'Dunamis Company LTDA.', 'Serviços', 'Sorocaba', '52632995000107', 'pix@dunamiscompany.com.br', 0);

		insert into public.pagsup_negociacoes (cliente_id, empresa, servico, fornecedor, valor_contrato, pix, regiao, ddv) values
			(mari, 'Rádio Guarujá FM', 'Rádio Região (Litoral SP)', 'Guarujá FM (Osvaldo)', 8820, 'Boleto', 'Baixada Santista / Guarujá SP', '00'),
			(mari, 'Dunamis Company', 'Ag. de Marketing', 'Dunamis Company (Bruno & Aline)', 16000, 'pix@dunamiscompany.com.br', 'Sorocaba SP', '1'),
			(mari, 'Radio Verde Vale FM', 'Radio de Região (Vale do Ribeira)', 'Radio Verde Vale FM (Cascata)', 2500, '13 99636 9438', 'Vale do Ribeira / Registro SP', '1'),
			(mari, 'Radio Regional FM 91.5', 'Radio de Região (Vale do Ribeira)', 'Radio Regional 91.5 FM (Sergio)', 1800, '48.673.743/0001-59', 'Vale do Ribeira / Registro SP', '1'),
			(mari, 'Radio Interna Lojas Mari RadioSRV', 'Rádio Indoor / Rádio Interna Loja (Todas as Lojas)', 'RadioSRV (Jean)', 838.80, 'Boleto', 'SP', '10'),
			(mari, 'Rádio Space FM', 'Rádio de Região (Ibiuna)', 'Rádio Space FM (Elaine)', 1000, '27888330000111', 'Ibiuna SP', '10'),
			(mari, 'Jacupiranga Band FM 101,1', 'Rádio de Região (Jacupiranga/Vale do Ribeira)', 'Band Jacupiranga FM 101,1 (Mero)', 640, '03843579000142', 'Vale do Ribeira / Registro SP', '15'),
			(mari, 'Clebes Oliveira (Bob Orla)', 'Influenciador Digital Personagem Bob Orla', 'Clebes Oliveira (Bob Orla)', 1200, '30341543802', 'Vale do Ribeira / Registro SP', '25');
	end if;
end $$;
