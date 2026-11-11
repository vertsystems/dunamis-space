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
| Ponte do DGathe | launchd `com.vertsystems.dgathe-ponte`, roda `ponte/ponte.mjs` o tempo todo: pega as tarefas passadas aos agentes no jogo e abre as sessões do Claude Code no Mac. Configuração em `~/.config/dunamisspace/ponte.env` (senha do usuário `dgathe_ponte`, que só enxerga as tabelas do DGathe), log em `~/Library/Logs/dgathe-ponte.log`. `node ponte/instalar.mjs --status` mostra se está viva; `node ponte/ponte.mjs --conferir` testa banco e Claude Code |

**Se esta pasta mudar de lugar de novo:** o `~/Library/LaunchAgents/com.vertsystems.dunamisspace-backup.plist`
guarda o caminho completo dela. Atualizar o plist e recarregar (`launchctl bootout` + `bootstrap`),
senão o backup para em silêncio. Foi o que aconteceu entre 26/08 e 09/11/2026. A ponte do DGathe
também guarda o caminho (no plist e no `DGATHE_BASE` do `ponte.env`): rodar `node ponte/instalar.mjs` de novo.

**Ponte do DGathe e os agentes:** cada agente é uma linha em `dgathe_agentes` (sala, cadeira, pasta
relativa à VERT SYS, instruções, autonomia `perguntar`/`editar`/`livre`). A ponte roda cada tarefa como
sessão do Claude Code sem terminal (`-p` com stream-json): os passos vão para `dgathe_mensagens`, as
permissões e as perguntas (AskUserQuestion) viram `dgathe_pedidos` e esperam resposta no jogo, e
mensagem nova numa tarefa terminada retoma a mesma sessão (`--resume`). As contas que dá para testar
estão em `src/lib/dgathe/ponte.ts` e `passos.ts` (rodam direto no Node da ponte, sem build: nada de
enum e import com extensão `.ts`). Mexeu na ponte: `node ponte/instalar.mjs` recarrega o launchd.

**Os agentes se chamam Bandoletes (desde 10/11/2026):** é o nome que o Bruno deu aos agentes de IA do
DGathe. Vale em todo texto de tela (jogo, painel, permissões) e a ponte avisa cada agente do nome. No
código, no banco e nos arquivos (`dgathe_agentes`, `agentes/`, `Agente`) continua "agente".

**Equipes de agentes (desde 10/11/2026):** a definição de cada agente de equipe mora em
`agentes/<equipe>/<id>.md` (cabeçalho + instruções, formato em [agentes/README.md](agentes/README.md)) e
vai para o banco com `node ponte/agentes.mjs` (`--conferir` mostra sem gravar). O líder da equipe delega
de dentro da sessão com `node ponte/equipe.mjs delegar` (subtarefas com `pai_id`); a tarefa dele fica
`aguardando` até a equipe terminar, e a ponte devolve o retorno na mesma conversa. O fechamento semanal
só acontece quando um CEO pede: o automático de sexta foi desligado em 11/11/2026, a pedido do Bruno
(`DGATHE_FECHAMENTO=1` no `ponte.env` liga de novo). O contrato técnico é
[docs/dgathe/contrato-equipes.md](docs/dgathe/contrato-equipes.md) e os cargos do departamento de
Desenvolvimento & IA estão em [docs/dgathe/cargos-dev-ia.md](docs/dgathe/cargos-dev-ia.md).

**Diretoria e VERT SYS (desde 11/11/2026):** todo Bandolete enxerga a pasta VERT SYS inteira
(`--add-dir`), sem mudar a pasta de trabalho dele. A equipe `diretoria` (Sun, Pep e Henry, em
`agentes/diretoria/`) fica logo abaixo dos CEOs, não tem líder e passa trabalho aos gerentes, que
redistribuem para a equipe (dois níveis no máximo). A memória deles mora no Contex OS, em
`dunamiscompany/diretoria/`. Detalhes na seção 10 do contrato das equipes.

**Departamento Financeiro (desde 11/11/2026):** a equipe `financeiro` (Warren, o Gerente Financeiro, e
sete especialistas, em `agentes/financeiro/`) segue o manual em `docs/dgathe/manual-departamento-financeiro.pdf`.
Eles preparam e conferem; quem aprova e mexe no dinheiro são os CEOs. O trabalho e a memória moram em
`dunamiscompany/financeiro/` (fora do git, porque o repositório do Contex OS é público). Seção 11 do
contrato das equipes.

## Como trabalhar

- `npm run dev` sobe local na porta 5173. Todas as rotas pedem login
- Antes de commitar: `npm run check` e `npm test`. O teste roda num espelho em disco local,
  porque o vitest trava dentro do Drive
- Instalar ou atualizar pacote: `npm run deps`, nunca `npm install` (ele apaga o atalho do
  `node_modules` e recria a pasta inteira dentro do Drive)
- Terminou e passou na verificação: commit na `main` e push, sem pedir confirmação. O Bruno
  autorizou em 08/09/2026 ("suba direto para o dspace.verts.me")
- **Os agentes do DGathe também commitam e publicam sem pedir** (autonomia máxima, decisão do Bruno em
  11/11/2026), depois de conferir; no departamento de Desenvolvimento & IA quem publica é o Smith,
  assim que o QA passa. Numa sessão aberta pela ponte (com `DGATHE_TAREFA` no ambiente), eles só
  perguntam no jogo antes de gastar dinheiro, falar para fora, mexer em dinheiro, apagar o que não
  tem volta, mexer em senha ou acesso, criar Bandolete ou numa dúvida que só o CEO resolve (seção 12
  do contrato das equipes). `node ponte/instalar.mjs` nunca roda de dentro de uma sessão: ele derruba
  todas, inclusive a de quem rodou
- Avisar antes do que mexe no banco de produção (migration, ensaio de carga) e do que apaga dados.
  O banco local é o de produção
- Texto de tela e mensagem de commit em português
