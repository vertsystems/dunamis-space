# Dunamis Space

Sistema online interno da **Dunamis Company Marketing Digital** — gestão completa da agência: clientes, contratos, financeiro, projetos, tarefas, planejamento de conteúdo, aprovação de cliente e base de conhecimento.

🔗 **Produção:** [dspace.verts.me](https://dspace.verts.me)
📦 **Repositório:** [github.com/vertsystems/dunamis-space](https://github.com/vertsystems/dunamis-space)

> Deploy automático: cada `push` na branch `main` dispara um deploy de produção na Vercel.

## Stack

- **[SvelteKit 2](https://svelte.dev/)** (Svelte 5 / runes) + TypeScript
- **[Bulma](https://bulma.io/)** (Sass) com a paleta da marca
- **[Supabase](https://supabase.com/)** — Postgres, Auth e Storage
- **[Vercel](https://vercel.com/)** — hospedagem (`adapter-vercel`)

## Módulos

| Módulo | Rota | Descrição |
| --- | --- | --- |
| Dashboard | `/` | Indicadores reais: clientes ativos, MRR, lucro, tarefas atrasadas |
| Clientes (CRM) | `/clientes` | Cadastro, status, interações |
| Contratos & Planos | `/contratos` | Contratos + catálogo de planos |
| Financeiro | `/financeiro` | Receitas/despesas + lucro por cliente |
| Projetos | `/projetos` | Jobs por cliente |
| Tarefas | `/tarefas` | Kanban com drag-and-drop |
| Conteúdo | `/conteudo` | Planejamento editorial |
| Aprovação de Cliente | `/aprovar/[token]` | Portal público (sem login) para o cliente aprovar conteúdo |
| Campanhas | `/campanhas` | Campanhas + produtos + materiais |
| Base de Conhecimento | `/base-conhecimento` | Wiki interna |
| Equipe | `/equipe` | Colaboradores |

## Desenvolvimento

```sh
npm install
cp .env.example .env   # preencha com as chaves do Supabase
npm run dev
```

| Comando | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run check` | Verificação de tipos (svelte-check) |
| `npm test` | Testes (214 em 24 arquivos) |
| `npm run deps` | Reinstala as dependências (no lugar de `npm install`) |

> **Este projeto mora dentro do Google Drive**, e isso pede dois desvios.
>
> **Testes.** O vitest não consegue subir seus processos de trabalho a partir de
> um volume do Drive — trava sem imprimir nada. Por isso `npm test` passa por
> [`scripts/testar.mjs`](scripts/testar.mjs), que espelha o projeto em disco
> local e roda o vitest de lá. É transparente: edite no Drive e rode `npm test`
> normalmente.
>
> **Dependências.** A pasta `node_modules` (~30 mil arquivos que o Git ignora)
> vive em `~/Documents/repo claude/dspace/`, e no projeto existe só um atalho
> para ela — assim o Drive não sincroniza nada disso. Use **`npm run deps`** no
> lugar de `npm install`: o `npm install` apaga o atalho e recria a pasta dentro
> do Drive. Ver [`scripts/dependencias.mjs`](scripts/dependencias.mjs).
>
> Fora do Drive os dois scripts saem da frente e chamam as ferramentas direto.

## Banco de dados

As migrations ficam em [`supabase/migrations/`](supabase/migrations/) e são aplicadas no SQL Editor do Supabase:

- `0001_init.sql` — schema completo (tabelas, enums, triggers, RLS, view `v_lucro_cliente`)
- `0002_aprovacao_publica.sql` — RPCs `security definer` do portal público de aprovação

## Variáveis de ambiente

Definidas em `.env` (local) e no painel da Vercel (Production):

| Variável | Descrição |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Chave pública (publishable) do Supabase |

> ⚠️ A connection string com a senha do Postgres **nunca** entra no repositório. O `.env` é ignorado pelo Git.

## Documentação

- [`docs/Sistema-Online-Dunamis-Estrutura.md`](docs/Sistema-Online-Dunamis-Estrutura.md) — visão dos módulos
- [`docs/Sistema-Online-Dunamis-Blueprint.md`](docs/Sistema-Online-Dunamis-Blueprint.md) — modelo de dados e roadmap
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — guia de deploy (Supabase + Vercel)

---

Projeto interno — Vert Systems · Dunamis Company
