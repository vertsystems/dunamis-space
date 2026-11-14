# Publicar o Dunamis Space

> Push na `main` é deploy de produção na Vercel (time `vert-projects`, projeto `dunamis-space`).
> O Bruno autorizou publicar sem perguntar (08/09/2026). A configuração inicial está em
> [DEPLOY.md](DEPLOY.md).

## O que existe e o que não existe

- Não há ambiente de teste separado: o dev local usa o banco de produção. O deploy de prévia
  (`vercel` sem `--prod`) existe, mas a URL `.vercel.app` cai na proteção de login
- Não há CI (nenhum `.github/`): a entrega contínua é o push na `main`
- Não há ferramenta de monitoramento nem de alerta: o que dá para olhar é o estado do deploy, os
  logs da Vercel e o backup
- CLI da Vercel não está instalada: `npx -y vercel@latest <comando> --scope vert-projects` (o
  token já está no Mac)
- Variáveis de produção (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `DMETRIC_SEGREDO`…) só no
  painel da Vercel. O `CRON_SECRET` não fica guardado em lugar nenhum: testar um cron na mão exige
  trocar o segredo e publicar. Teste a função da rotina direto, com dado de teste

## Passo a passo

1. `git status --short && git log --oneline -1`. Anote o commit atual: é o caminho de volta.
   Confira que mudou só o que é do trabalho; o que é de outra pessoa fica de fora
2. `npm run check` e `npm test -- <os testes do que mudou>`
3. De `dunamiscompany/`: `node scripts/verificar.js segredo dunamisspace`. Nenhuma prévia
   `src/routes/pagamentos/zz-prev-*` sobrando. Migration de que a mudança depende já aplicada
   (confira por consulta)
4. `git add <cada arquivo, pelo nome>` e `git diff --cached --stat`: nada de `.env`, `backups/` ou
   chave. Nunca `git add -A`, `git add .`, `git stash`, `git reset`, `git checkout -- …` nem
   `git clean`: a pasta é compartilhada, e eles levam ou desfazem o trabalho dos outros
5. `git commit -m "<o que muda, em português>"` e `git push origin main`. Push recusado: não force
6. Confira o deploy: `gh api repos/vertsystems/dunamis-space/commits/$(git rev-parse HEAD)/status --jq .state`
   até dar `success` (`pending` enquanto compila; `failure` ou `error`: o site continua na versão
   anterior, e o link do log sai no mesmo comando sem o `--jq`)
7. No domínio final: `curl -s https://dspace.verts.me/_app/version.json` mudou de valor,
   `curl -sI https://dspace.verts.me/login` responde 200 e, se a mudança é numa rota pública, um
   print

## Voltar atrás

- Código: `git revert <commit>` e push (é uma publicação), ou promover o deploy anterior com
  `npx -y vercel@latest rollback --scope vert-projects` (ainda não testado aqui)
- Banco: o bloco "Para desfazer" da migration, ou `scripts/restore.mjs` (restaurar: perguntar ao
  Bruno antes)
- Incidente: primeiro conter (voltar a versão), depois investigar; registrar o que houve, a causa e
  o que evita a repetição

## Rotinas

- Crons em `vercel.json`, em UTC (Brasília é UTC−3). Calcule com
  `node scripts/rotinas.js proxima "toda sexta 17h"`, de `dunamiscompany/`, e não de cabeça
- Rota de cron entra no `publicRoute` do `hooks.server.ts` e confere o `CRON_SECRET`
- Backup pelo launchd ([BACKUP.md](BACKUP.md)). O plist guarda o caminho completo desta pasta: se
  ela mudar de lugar, o backup para em silêncio
