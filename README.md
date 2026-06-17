# Dunamis Space

Sistema online interno da **Dunamis Company Marketing Digital** — gestão completa da agência: clientes, contratos, financeiro, projetos, tarefas, planejamento de conteúdo, aprovação de cliente e base de conhecimento.

🔗 **Produção:** [dspace.verts.me](https://dspace.verts.me)
📦 **Repositório:** [github.com/vertsystems/dunamis-space](https://github.com/vertsystems/dunamis-space) (privado)

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
