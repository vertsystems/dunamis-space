-- Mais dois cargos: Financeiro (FIN) e Videomaker (VM). Idempotente.

alter type colaborador_funcao add value if not exists 'financeiro';
alter type colaborador_funcao add value if not exists 'videomaker';
