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
| Migrations | `supabase/migrations/`. Aplicar com `set -a; source ~/.config/dunamisspace/backup.env; set +a; node scripts/run_migration.mjs <arquivo>` ou pelo SQL Editor ([docs/BANCO.md](docs/BANCO.md)) |
| Dependências | `~/Documents/repo claude/dspace/node_modules`, com um atalho aqui (o Drive não sincroniza ~30 mil arquivos) |
| Backup | launchd `com.vertsystems.dunamisspace-backup`, dias 10 e 25 ao meio-dia, grava em `backups/` ([docs/BACKUP.md](docs/BACKUP.md)) |

**Se esta pasta mudar de lugar de novo:** o `~/Library/LaunchAgents/com.vertsystems.dunamisspace-backup.plist`
guarda o caminho completo dela. Atualizar o plist e recarregar (`launchctl bootout` + `bootstrap`),
senão o backup para em silêncio. Foi o que aconteceu entre 26/08 e 09/11/2026.

O DGathe (escritório em jogo e a ponte dos agentes) foi retirado em 12/11/2026; o projeto inteiro está guardado em VERT SYS/#off/dgathe/, e as equipes de agentes passaram para dunamiscompany/agentes/.

## Como trabalhar

- `npm run dev` sobe local na porta 5173. Todas as rotas pedem login
- Antes de commitar: `npm run check` (1 a 3 min) e `npm test -- <arquivo.test.ts>`. O teste roda
  num espelho em disco local, porque o vitest trava dentro do Drive: nunca `npx vitest` direto. A
  bateria inteira (`npm test` sem arquivo) só quando ninguém mais está editando o código
- `npm run build` leva uns 5 min sem imprimir nada até o fim
- Instalar ou atualizar pacote: `npm run deps`, nunca `npm install` nem `npm audit fix` (eles apagam
  o atalho do `node_modules` e recriam a pasta inteira dentro do Drive)
- Terminou e passou na verificação: commit na `main` e push, sem pedir confirmação. O Bruno
  autorizou em 08/09/2026 ("suba direto para o dspace.verts.me"). Commit só dos arquivos do
  trabalho, pelo nome: nunca `git add -A`. Passo a passo, conferência e como voltar atrás:
  [docs/PUBLICAR.md](docs/PUBLICAR.md)
- O banco local é o de produção. Migration que só acrescenta e consulta vão sem perguntar (o Bruno,
  em 09/11/2026: "pode sempre rodar no banco"). Apagar ou alterar dado que já existe e restaurar
  backup: perguntar antes. Como consultar, ensaiar e escrever migration: [docs/BANCO.md](docs/BANCO.md)
- Texto de tela e mensagem de commit em português

## Regras do código

- Svelte 5 com runes (`$state`, `$derived`, `$effect`, `$props`). Bulma (Sass) e Tailwind 4
  convivem: siga o padrão da tela vizinha. Ícones do `@lucide/svelte`. Lógica de tela em função
  `.ts` testável com o vitest, com o teste ao lado (`<nome>.test.ts`)
- O sistema visual é um só: `src/lib/styles/design-system.css`, `app.scss` (Bulma com a paleta da
  marca) e os componentes de `src/lib/components/ui/` (Button, Card, DataTable, EmptyState,
  FormShell, Input, Modal, Select, Skeleton, Tabs, Toaster…). Use os de lá antes de criar outro
- Permissão: módulos e níveis (nenhum, ver, editar, excluir) em `src/lib/permissoes.ts`; a
  permissão efetiva vem do banco, pela `tem_permissao`. Módulo novo nasce sem seed: só ceo e admin
  veem até alguém liberar
- Política RLS nova sempre com `(select public.tem_permissao('<modulo>', '<nivel>'))`. A chamada
  direta é avaliada linha a linha (792 ms contra 1 ms no DMetric, em 23/10/2026)
- Rota chamada por cron ou por site de fora entra no `publicRoute` do `src/hooks.server.ts` e
  confere o próprio segredo. Fora do `publicRoute` ela cai no login, nunca roda e não avisa (a
  faxina do SOS ficou parada até 10/10/2026)
- Migration em `supabase/migrations/NNNN_<nome>.sql`, com o bloco "Para desfazer", reaplicável e
  conferida por `node scripts/verificar.js migracao dunamisspace/supabase/migrations` (de
  `dunamiscompany/`). Depois de aplicar, `npm run tipos` regenera `src/lib/database.types.ts`
- Dado de teste no banco leva o prefixo `zz-teste` e é apagado no fim, com a contagem que prova
- A senha do Postgres entra só por `set -a; source ~/.config/dunamisspace/backup.env; set +a`,
  nunca em comando visível, arquivo ou commit: o repositório é público
- `backups/` nunca entra no git: o dump traz as senhas do cofre

## Onde fica cada coisa

| O quê | Onde |
|---|---|
| Telas | `src/routes/**/+page.svelte` |
| Servidor | `+page.server.ts`, `+server.ts`, `src/lib/server/` |
| Login e rotas públicas | `src/hooks.server.ts` (`publicRoute`) |
| Tipos do banco | `src/lib/database.types.ts` (`npm run tipos`) |
| DMetric | `src/lib/dmetric/`; coleta pelo `dm.js` em `/api/dm`; botões do PageLinks em `/api/dmetric/botoes` (webhook com segredo próprio); tabelas `dmetric_*`, com dezenas de milhares de linhas |
| CRM | o módulo Comercial (`/comercial`) |
| Crons | `vercel.json` (horário em UTC; Brasília é UTC−3): faxinas do SOS e do Pag's Up, robôs e relatórios do DMetric |
| Visão do sistema | `docs/Sistema-Online-Dunamis-Blueprint.md` e `docs/Sistema-Online-Dunamis-Estrutura.md` |

## Testar e conferir

- Tela com login, sem sessão: teste a função que a tela usa, ou faça uma prévia temporária numa rota
  pública, apagada antes de publicar. Passo a passo em [docs/TESTAR.md](docs/TESTAR.md)
- Permissão de verdade se testa rodando o mesmo SQL como duas pessoas, numa transação desfeita
  ([docs/BANCO.md](docs/BANCO.md))
- Produção se confere no domínio final (dspace.verts.me), nunca na URL `.vercel.app`, que cai na
  proteção de login da Vercel

## Segurança: o que merece olho

- O repositório `vertsystems/dunamis-space` é público: código, documento e comentário ficam
  visíveis para qualquer um
- As rotas públicas (`/login`, `/redefinir-senha`, `/aprovar`, `/pagamentos/`, `/relatorio/`, os
  crons e `/api/dm`) conferem token ou segredo sozinhas. Rota pública nova é ponto de auditoria, e
  prévia `zz-prev-` esquecida em `/pagamentos/` é exposição
- As funções `SECURITY DEFINER` do portal de aprovação
- Dado pessoal guardado: CPF/CNPJ, Pix, telefone de prestador e de cliente e o cofre de acessos (módulo
  `vault`)
- Auditoria, de `dunamiscompany/`: `node scripts/auditar-rls.js dunamisspace` e
  `node scripts/vazamento.js dunamisspace` (depois de um build)
