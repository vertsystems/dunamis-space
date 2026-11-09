# Dunamis Space — sistema interno da Dunamis

> Mora em `dunamiscompany/dunamisspace/` desde 09/11/2026 (antes era pasta irmã,
> `VERT SYS/dunamisspace/`). Instruções aqui valem por cima das do `CLAUDE.md` da
> dunamiscompany: aquele é do Contex OS, feito para marca e conteúdo; esta pasta é código.

## O que é

O sistema online interno da Dunamis Company, no ar em [dspace.verts.me](https://dspace.verts.me):
clientes, contratos, financeiro, tarefas, conteúdo, Pag's Up, DMetric e os outros módulos do
[README.md](README.md). SvelteKit 2 (Svelte 5) + Supabase + Vercel.

## Onde cada coisa está ligada

| O quê | Onde |
|---|---|
| Código | Repositório próprio `vertsystems/dunamis-space` (remote `origin`). Fica fora do git da dunamiscompany pelo `.git/info/exclude` de lá |
| Hospedagem | Vercel, time `vert-projects`, projeto `dunamis-space` (ligado por `.vercel/project.json`). Cada push na `main` publica em produção |
| Variáveis | `.env` local só com o que o dev precisa. As de produção (incluindo `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `DMETRIC_SEGREDO`) ficam no painel da Vercel |
| Banco e arquivos | Supabase, ref `rboenllphxqecjroolzo`. A senha do Postgres fica fora do Drive, em `~/.config/dunamisspace/backup.env` |
| Migrations | `supabase/migrations/`. Aplicar com `PGPASSWORD=… node scripts/run_migration.mjs <arquivo>` ou pelo SQL Editor |
| Dependências | `~/Documents/repo claude/dspace/node_modules`, com um atalho aqui (o Drive não sincroniza ~30 mil arquivos) |
| Backup | launchd `com.vertsystems.dunamisspace-backup`, dias 10 e 25 ao meio-dia, grava em `backups/` ([docs/BACKUP.md](docs/BACKUP.md)) |

**Se esta pasta mudar de lugar de novo:** o `~/Library/LaunchAgents/com.vertsystems.dunamisspace-backup.plist`
guarda o caminho completo dela. Atualizar o plist e recarregar (`launchctl bootout` + `bootstrap`),
senão o backup para em silêncio. Foi o que aconteceu entre 26/08 e 09/11/2026.

## Como trabalhar

- `npm run dev` sobe local na porta 5173. Todas as rotas pedem login
- Antes de commitar: `npm run check` e `npm test`. O teste roda num espelho em disco local,
  porque o vitest trava dentro do Drive
- Instalar ou atualizar pacote: `npm run deps`, nunca `npm install` (ele apaga o atalho do
  `node_modules` e recria a pasta inteira dentro do Drive)
- Terminou e passou na verificação: commit na `main` e push, sem pedir confirmação. O Bruno
  autorizou em 08/09/2026 ("suba direto para o dspace.verts.me")
- Avisar antes do que mexe no banco de produção (migration, ensaio de carga) e do que apaga dados.
  O banco local é o de produção
- Texto de tela e mensagem de commit em português
