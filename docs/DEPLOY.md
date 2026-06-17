# Deploy — Dunamis Space

## 1. Banco de dados (Supabase)

Projeto: `rboenllphxqecjroolzo` · URL: https://rboenllphxqecjroolzo.supabase.co

**Opção A — SQL Editor (mais rápido):** abra o Supabase → SQL Editor → cole o conteúdo de
`supabase/migrations/0001_init.sql` → Run.

**Opção B — Supabase CLI:**
```bash
npx supabase login                      # abre o navegador
npx supabase link --project-ref rboenllphxqecjroolzo
npx supabase db push                    # aplica supabase/migrations
```

> Depois de criar um usuário em Authentication → Users, insira o colaborador correspondente:
> `insert into colaboradores (auth_user_id, nome, email, funcao) values ('<uuid-do-user>', 'Bruno', 'bruno@...', 'admin');`

## 2. App (Vercel)

O login da Vercel é interativo (abre o navegador), então rode você mesmo:

```bash
npm i -g vercel          # ou use npx vercel
vercel login
vercel link              # cria/vincula o projeto — nome: dunamis-space
```

**Variáveis de ambiente** (Vercel → Project → Settings → Environment Variables), ou via CLI:
```bash
vercel env add PUBLIC_SUPABASE_URL        # https://rboenllphxqecjroolzo.supabase.co
vercel env add PUBLIC_SUPABASE_ANON_KEY   # sb_publishable_...
```

**Deploy:**
```bash
vercel           # preview
vercel --prod    # produção
```

## 3. Domínio custom (verts.me)

Subdomínio do projeto: **`dspace.verts.me`**.

No projeto da Vercel → Settings → Domains → Add → `dspace.verts.me`.
Se `verts.me` já está na sua conta Vercel, basta adicionar e ela cria o registro automaticamente.
Caso o DNS esteja em outro provedor, aponte um **CNAME** `dspace` → `cname.vercel-dns.com`.

## Segurança
- A senha do Postgres compartilhada no chat deve ser **rotacionada** (Supabase → Settings → Database → Reset password).
- Nunca commitar `.env` (já está no `.gitignore`). A connection string com senha não vai para o repositório nem para o `.env` do front — o app usa apenas a *publishable key*.
