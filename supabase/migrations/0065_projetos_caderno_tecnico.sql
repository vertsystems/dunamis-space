-- ============================================================
-- Projetos deixam de ser "job de cliente" e viram o caderno técnico do Bruno.
--
-- O que mudou no uso (07/09/2026): a área de Projetos passou a guardar os
-- projetos DELE — alguns para vender, outros de uso próprio — e o que importa
-- em cada um é onde as coisas moram: senhas, acessos, em que banco de dados
-- está, que serviço hospeda. Não há cliente dono, não há tipo de peça, não há
-- prazo nem valor a cobrar. Tudo isso saiu do formulário, e sai daqui também:
-- coluna que a tela não preenche vira campo fantasma, e campo fantasma mente
-- para quem lê o schema depois.
--
-- Seguro de rodar: a tabela está VAZIA (0 linhas em 07/09/2026) e nada aponta
-- para ela com dados — conteudos.projeto_id e projeto_vault.projeto_id existem,
-- mas sem nenhuma linha ligada. Ainda assim o mapeamento de status abaixo está
-- escrito por extenso, para o caso de rodar em um banco que já tenha projetos.
--
-- `projeto_tipo` (o TIPO) continua existindo: projeto_templates ainda o usa.
-- Só a coluna `projetos.tipo` some.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0065_projetos_caderno_tecnico.sql
-- ============================================================

-- ---------- 1. Status: dois estados, os que ele de fato acompanha ----------
-- Em construção → ainda sendo feito. Em produção → no ar, rodando.
do $$
begin
	if not exists (
		select 1 from pg_type t
		join pg_enum e on e.enumtypid = t.oid
		where t.typname = 'projeto_status' and e.enumlabel = 'em_construcao'
	) then
		-- O default sai antes: um default do tipo velho impede a troca do tipo.
		alter table public.projetos alter column status drop default;
		alter table public.projetos alter column status type text using status::text;

		drop type if exists projeto_status;
		create type projeto_status as enum ('em_construcao', 'em_producao');

		alter table public.projetos
			alter column status type projeto_status
			using (
				case status
					when 'finalizado' then 'em_producao'
					else 'em_construcao'
				end
			)::projeto_status;

		alter table public.projetos alter column status set default 'em_construcao';
	end if;
end $$;

-- ---------- 2. Colunas que saíram do formulário ----------
-- O índice de cliente vai junto com a coluna (o drop column já o leva, mas
-- deixar explícito ajuda quem lê o histórico).
drop index if exists idx_projetos_cliente;

alter table public.projetos drop column if exists cliente_id;
alter table public.projetos drop column if exists tipo;
alter table public.projetos drop column if exists valor;
alter table public.projetos drop column if exists data_inicio;
alter table public.projetos drop column if exists prazo;
alter table public.projetos drop column if exists recorrente;

comment on table public.projetos is
	'Projetos próprios: onde cada um está hospedado, em que banco, com que acessos. A descrição é texto formatado (HTML higienizado) e o cofre fica em projeto_vault.';
comment on column public.projetos.descricao is
	'Anotações técnicas em HTML higienizado (mesmo editor das observações do cofre).';
