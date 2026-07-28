-- ============================================================================
-- 0042 — Remove as tabelas de Tarefas e Campanhas (módulos aposentados)
-- ----------------------------------------------------------------------------
-- Os módulos saíram do app: o trabalho passou a ser centrado no Calendário
-- Editorial. Esta migration limpa o schema.
--
-- Conferido no banco ANTES de escrever:
--   · as 5 tabelas estavam com 0 linhas — nada de dado se perde;
--   · as únicas FKs apontando para elas são INTERNAS ao grupo
--     (tarefa_checklist→tarefas, campanha_produtos/materiais→campanhas);
--   · nenhuma view e nenhuma função do schema as referencia;
--   · os 3 enums abaixo são usados exclusivamente por estas tabelas.
--
-- Sem CASCADE de propósito: se algum objeto que eu não previ ainda depender de
-- algo aqui, a migration falha em vez de derrubar esse objeto em silêncio. A
-- ordem é filho → pai justamente para não precisar de cascade.
-- As 20 policies, os 5 triggers e os índices dessas tabelas somem junto com
-- elas (pertencem à tabela).
-- ============================================================================

drop table if exists public.tarefa_checklist;
drop table if exists public.tarefas;

drop table if exists public.campanha_materiais;
drop table if exists public.campanha_produtos;
drop table if exists public.campanhas;

-- Enums que só existiam para essas tabelas.
drop type if exists public.tarefa_status;
drop type if exists public.prioridade;
drop type if exists public.material_tipo;

-- Permissões órfãs: `modulo` é text, então as linhas dos módulos removidos
-- ficariam para sempre no banco sem aparecer em lugar nenhum (a tela de
-- administração itera a lista de MODULOS do código).
delete from public.permissoes_cargo where modulo in ('tarefas', 'campanhas');
delete from public.permissoes_colaborador where modulo in ('tarefas', 'campanhas');
