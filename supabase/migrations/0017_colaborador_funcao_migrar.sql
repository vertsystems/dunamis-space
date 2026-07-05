-- Migra cargos antigos (fora do novo conjunto) e promove o admin atual (dono)
-- a Diretor Executivo (CEO). Depende de 0016 (valores já committed). Idempotente.

update public.colaboradores set funcao = 'growth_manager' where funcao = 'gestor';
update public.colaboradores set funcao = 'digital_creator' where funcao = 'designer';
update public.colaboradores set funcao = 'growth_manager' where funcao = 'trafego';
update public.colaboradores set funcao = 'ceo' where funcao = 'admin';
