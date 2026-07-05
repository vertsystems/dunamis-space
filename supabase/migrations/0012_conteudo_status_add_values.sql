-- Novos status de conteúdo (fluxo A fazer / Em andamento / Concluídos).
-- ADD VALUE precisa estar committed antes de ser usado em DML/funções (ver 0013),
-- por isso a criação dos valores fica isolada neste arquivo. Idempotente.

alter type conteudo_status add value if not exists 'escrever_conteudo';
alter type conteudo_status add value if not exists 'ideia';
alter type conteudo_status add value if not exists 'aguardando_material';
alter type conteudo_status add value if not exists 'pausar_material';
alter type conteudo_status add value if not exists 'editar_video';
alter type conteudo_status add value if not exists 'gravar_video';
alter type conteudo_status add value if not exists 'criar_design';
alter type conteudo_status add value if not exists 'aprovar_roteiro';
alter type conteudo_status add value if not exists 'aprovar_conteudo';
alter type conteudo_status add value if not exists 'programado_parcial';
alter type conteudo_status add value if not exists 'programar';
alter type conteudo_status add value if not exists 'programar_feed';
alter type conteudo_status add value if not exists 'programar_stories';
alter type conteudo_status add value if not exists 'programar_reels';
-- 'programado' e 'publicado' já existem no enum e permanecem.
