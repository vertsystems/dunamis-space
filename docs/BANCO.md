# Banco do Dunamis Space

> O banco local é o de produção: Supabase `rboenllphxqecjroolzo`. Este arquivo junta o que se
> aprendeu mexendo nele. A regra curta está no `CLAUDE.md` da pasta.

## Acesso

- O acesso que existe é a senha de superusuário em `~/.config/dunamisspace/backup.env`, fora do
  Drive. Ela entra só por `source`: nunca mostre, copie ou imprima o arquivo. Os comandos ficam no
  histórico da sessão, e o repositório é público
- Migration que só acrescenta e consulta: sem perguntar (o Bruno, em 09/11/2026). Apagar ou alterar
  dado que já existe, restaurar backup e mudar retenção: perguntar antes, dizendo quantos registros
  e como desfazer

## Consultar e ensaiar numa transação desfeita

Tudo roda dentro de uma transação que é sempre desfeita no fim. A partir de `dunamiscompany/`:

```bash
cd dunamisspace && set -a && source ~/.config/dunamisspace/backup.env && set +a && node --input-type=module -e '
import pg from "pg";
const [quem, ...sqls] = process.argv.slice(1);
const c = new pg.Client({ host: "db.rboenllphxqecjroolzo.supabase.co", port: 5432, user: "postgres", password: process.env.PGPASSWORD, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query("begin");
  if (quem !== "-") {
    const { rows: [u] } = await c.query("select auth_user_id from public.colaboradores where email = $1", [quem]);
    if (!u) throw new Error("não achei " + quem + " em colaboradores");
    await c.query("select set_config($1, $2, true)", ["request.jwt.claims", JSON.stringify({ sub: u.auth_user_id, email: quem, role: "authenticated" })]);
    await c.query("set local role authenticated");
  }
  for (const sql of sqls) {
    await c.query("savepoint s");
    try { const r = await c.query(sql); console.log("OK", JSON.stringify(r.rows).slice(0, 3000)); await c.query("release savepoint s"); }
    catch (e) { console.log("ERRO", e.message); await c.query("rollback to savepoint s"); }
  }
} finally { await c.query("rollback").catch(() => {}); await c.end(); }
' <email ou -> "<sql 1>" "<sql 2>"
```

- O primeiro argumento é `-` (superusuário) ou o e-mail de uma pessoa de `colaboradores`: aí roda
  como ela logada, com o RLS dela
- Cada SQL é um argumento e tem o próprio savepoint: o erro de um não derruba os outros
- **Testar permissão:** rode o mesmo SQL como duas pessoas de cargos diferentes
  (`select nome, email, funcao from public.colaboradores where ativo order by nome`) e compare o
  que cada uma lê e grava. Em relatório, cite a pessoa pelo cargo, não pelo e-mail
- **Teste ponta a ponta que precisa gravar:** troque o `rollback` do `finally` por `commit`, só com
  dado de prefixo `zz-teste`, e apague no fim, provando com um `select count(*)` que deu 0
- Tabela grande (`dmetric_*`) sempre com `limit` ou agregação. `explain analyze` executa a
  consulta: use em leitura ou dentro desse trecho, que desfaz tudo

## Migration

- Arquivo `supabase/migrations/NNNN_<nome>.sql`, com o próximo número
  (`ls supabase/migrations | tail -1`)
- Modelo: a migration mais nova com o bloco "Para desfazer"
  (`grep -l "Para desfazer" supabase/migrations/*.sql | tail -1`). Cabeçalho com o porquê, bloco
  "Para desfazer" e reaplicável (`if not exists`, `create or replace`, `drop … if exists` antes de
  recriar)
- Conferir, de `dunamiscompany/`: `node scripts/verificar.js migracao dunamisspace/supabase/migrations`.
  As antigas já acusam avisos: olhe as linhas do seu arquivo
- Aplicar: `set -a && source ~/.config/dunamisspace/backup.env && set +a && node scripts/run_migration.mjs supabase/migrations/<arquivo>`.
  Depois, do mesmo jeito, `npm run tipos`
- RLS nova sempre com `(select public.tem_permissao('<modulo>', '<nivel>'))`. Módulos e níveis em
  `src/lib/permissoes.ts`
- Mudança que o código de outra pessoa usa: combine antes o nome das colunas

## Ensaio de carga

Inserir e desfazer milhares de linhas incha a tabela mesmo com rollback: em 23/10/2026 o banco foi
de 19 MB para 306 MB e as medições saíram até 10 vezes mais lentas.

- Uma rodada só
- `select pg_total_relation_size('public.<tabela>')` antes e depois
- `vacuum (full, analyze) public.<tabela>` logo em seguida

## Backup e restauração

- launchd `com.vertsystems.dunamisspace-backup`, dias 10 e 25 ao meio-dia, com `scripts/backup.mjs`;
  os dumps vão para `backups/`, que nunca entra no git (trazem as senhas do cofre). Detalhe em
  [BACKUP.md](BACKUP.md)
- Conferir: `backups/ultimo-backup.txt`, `~/Library/Logs/dunamisspace-backup.log` e
  `launchctl print gui/$(id -u)/com.vertsystems.dunamisspace-backup | grep -E "state|runs"`
- Restaurar é `scripts/restore.mjs`: perguntar antes
