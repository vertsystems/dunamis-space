-- ============================================================
-- Pag's Up — Histórico de pagamentos (base da Planilha Mensal)
--
-- Até aqui o cronograma da semana era APAGADO ao finalizar, então não sobrava
-- nada para prestar contas no fim do mês. Agora cada item finalizado vira uma
-- linha aqui, e a Planilha Mensal soma o mês inteiro, de todas as lojas.
--
-- Os dados do prestador ficam CONGELADOS na linha (nome, serviço, região). Um
-- pagamento é registro contábil: se o cadastro do prestador for corrigido ou
-- excluído meses depois, a prestação de contas do mês passado não pode mudar.
-- Por isso prestador_id é apenas referência (on delete set null).
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0046_pagsup_pagamentos.sql
-- ============================================================

create table if not exists public.pagsup_pagamentos (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.pagsup_clientes (id) on delete cascade,
	prestador_id uuid references public.pagsup_prestadores (id) on delete set null,
	prestador_nome text not null,
	servico text not null,
	regiao text,
	valor numeric(12, 2) not null default 0,
	data_pagamento date not null,
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- A tela sempre filtra por mês; o índice por data cobre isso e o por cliente
-- cobre o agrupamento por loja.
create index if not exists idx_pagsup_pagamentos_data on public.pagsup_pagamentos (data_pagamento desc);
create index if not exists idx_pagsup_pagamentos_cliente on public.pagsup_pagamentos (cliente_id, data_pagamento desc);

drop trigger if exists set_pagsup_pagamentos_updated_at on public.pagsup_pagamentos;
create trigger set_pagsup_pagamentos_updated_at
	before update on public.pagsup_pagamentos
	for each row execute function public.set_updated_at();

-- RLS: single-tenant (qualquer autenticado), igual às outras tabelas pagsup_*.
alter table public.pagsup_pagamentos enable row level security;
drop policy if exists "auth_all" on public.pagsup_pagamentos;
create policy "auth_all" on public.pagsup_pagamentos
	for all to authenticated using (true) with check (true);
