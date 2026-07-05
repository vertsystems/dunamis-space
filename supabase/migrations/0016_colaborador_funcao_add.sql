-- Novos cargos de colaborador. ADD VALUE precisa ser committed antes de ser
-- usado (ver 0017), por isso isolado aqui. Idempotente.
-- 'admin' e 'social_media' já existem no enum.

alter type colaborador_funcao add value if not exists 'ceo';
alter type colaborador_funcao add value if not exists 'comercial';
alter type colaborador_funcao add value if not exists 'digital_creator';
alter type colaborador_funcao add value if not exists 'growth_manager';
