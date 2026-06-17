# Sistema Online Dunamis — Blueprint Completo (todas as fases)

> Stack: **Next.js (Vercel) + Supabase (Postgres + Auth + Storage)**.
> Modo: **single-tenant** — sistema exclusivo da Dunamis.
> Complemento de `Sistema-Online-Dunamis-Estrutura.md` (visão e módulos).

---

## 1. Modelo de dados (todas as tabelas)

Convenção: toda tabela tem `id` (uuid, pk), `created_at`, `updated_at`. FK = `→ tabela`.

### Identidade & Equipe
**`colaboradores`** — perfil ligado ao Supabase Auth
- `auth_user_id` (uuid, → auth.users)
- `nome`, `email`
- `funcao` enum: `admin | gestor | social_media | designer | trafego`
- `custo_hora` (numeric) · `ativo` (bool)

### Clientes (CRM)
**`clientes`**
- `nome`, `razao_social`, `cnpj_cpf`
- `contato_nome`, `contato_email`, `contato_whatsapp`
- `status` enum: `lead | ativo | pausado | cancelado`
- `responsavel_id` → colaboradores
- `segmento`, `data_inicio`, `mrr` (numeric), `observacoes`
- *Score de cliente* = campo calculado (rentabilidade + risco de churn) — view

**`cliente_interacoes`**
- `cliente_id` → clientes · `colaborador_id` → colaboradores
- `tipo` enum: `reuniao | ligacao | email | whatsapp | nota`
- `descricao`, `data`

### Contratos & Planos
**`planos`** (catálogo)
- `nome` (Starter / Gold / Premium), `descricao`, `valor_mensal`
- `limite_posts`, `limite_stories`, `limite_reels`, `escopo` (jsonb)

**`contratos`**
- `cliente_id` → clientes · `plano_id` → planos
- `valor_mensal`, `data_inicio`, `data_fim`
- `status` enum: `ativo | suspenso | encerrado`
- `renovacao_automatica` (bool)
- *Prometido vs entregue* = limites do plano × contagem de conteúdos no mês

### Projetos / Jobs
**`projetos`**
- `cliente_id` → clientes · `responsavel_id` → colaboradores
- `nome`, `descricao`
- `tipo` enum: `social_media | design | trafego | impresso | site | outro`
- `status` enum: `em_andamento | aguardando_cliente | em_aprovacao | finalizado`
- `recorrente` (bool), `valor` (se job pontual), `data_inicio`, `prazo`
- `template_id` → projeto_templates (opcional)

**`projeto_templates`**
- `nome`, `tipo`, `checklist` (jsonb), `tarefas_padrao` (jsonb)

### Tarefas
**`tarefas`**
- `projeto_id` → projetos · `responsavel_id` → colaboradores
- `titulo`, `descricao`
- `status` enum: `backlog | fazendo | em_aprovacao | concluido`
- `prioridade` enum: `baixa | media | alta`
- `prazo`, `ordem` (kanban), `tempo_estimado`, `tempo_gasto` *(F2)*

**`tarefa_checklist`**
- `tarefa_id` → tarefas · `item`, `concluido` (bool)

### Conteúdo (planejamento editorial)
**`conteudos`**
- `cliente_id` → clientes · `projeto_id` → projetos (opcional) · `responsavel_id` → colaboradores
- `tipo` enum: `feed | reels | carrossel | story`
- `titulo`, `legenda` (text), `arte_url` (Supabase Storage)
- `data_publicacao`
- `status` enum: `rascunho | em_aprovacao | aprovado | programado | publicado`
- `publicado_manual` (bool)
- *Contador mensal por cliente* = count agrupado por mês

### Aprovação de Cliente *(Fase 2)*
**`aprovacoes`**
- `conteudo_id` → conteudos
- `status` enum: `pendente | aprovado | alteracao_solicitada`
- `comentario_cliente`, `data_envio`, `data_resposta`, `token_publico` (link do portal)

### Campanhas (jornal / promoções) *(Fase 2)*
**`campanhas`**
- `cliente_id` → clientes · `nome` (ex: "Operação Fecha Mês")
- `data_inicio`, `data_fim`, `descricao`

**`campanha_produtos`**
- `campanha_id` → campanhas
- `ref`, `nome`, `preco`, `preco_promocional`, `limite`

**`campanha_materiais`**
- `campanha_id` → campanhas · `conteudo_id` → conteudos (opcional)
- `tipo` enum: `feed | story | faixa | jornal` · `arquivo_url`

### Financeiro
**`transacoes`** (receitas e despesas num só lugar)
- `tipo` enum: `receita | despesa`
- `categoria`, `descricao`, `valor`
- `cliente_id` → clientes (opcional) · `contrato_id` → contratos (opcional)
- `recorrente` (bool), `data_competencia`, `data_pagamento`
- `status` enum: `previsto | pago | atrasado`
- *Lucro por cliente* = Σ receitas(cliente) − Σ custos(cliente)
- *Custo por cliente* = despesas alocadas + (tempo_gasto × custo_hora) das tarefas *(F2)*

### Base de Conhecimento *(Fase 2)*
**`kb_artigos`**
- `titulo`, `categoria`, `conteudo` (markdown), `tags` (text[])
- `cliente_id` → clientes (opcional, p/ padrão de cliente específico)

### Colaboração & Alertas
**`comentarios`** (polimórfico)
- `entidade_tipo` enum: `projeto | tarefa | conteudo | cliente`
- `entidade_id` (uuid) · `colaborador_id` → colaboradores · `texto`

**`notificacoes`** *(base p/ alertas inteligentes — F3)*
- `colaborador_id` → colaboradores
- `tipo`, `mensagem`, `link`, `lida` (bool)

---

## 2. Mapa de telas

| # | Tela | Fase | Conteúdo |
|---|------|------|----------|
| 1 | **Dashboard** | 1 | Faturamento, lucro, clientes ativos, tarefas atrasadas, conteúdos pendentes, performance |
| 2 | **Clientes** | 1 | Lista + detalhe (abas: dados, contratos, conteúdos, financeiro, interações) |
| 3 | **Contratos & Planos** | 1 | Catálogo de planos + contratos por cliente |
| 4 | **Projetos** | 1 | Lista por cliente + abertura do projeto com suas tarefas |
| 5 | **Tarefas** | 1 | Kanban global + calendário + filtros por responsável |
| 6 | **Conteúdo** | 1 | Calendário editorial + status + tag por cliente |
| 7 | **Financeiro** | 1 | Receitas/despesas + lucro por cliente + fluxo |
| 8 | **Equipe** | 1 | Cadastro de colaboradores + carga de trabalho |
| 9 | **Aprovação / Portal do cliente** | 2 | Link externo p/ cliente aprovar/comentar conteúdo |
| 10 | **Campanhas** | 2 | Campanhas + produtos + materiais |
| 11 | **Base de Conhecimento** | 2 | Wiki interna (processos, padrões, scripts) |
| 12 | **Configurações / IA** | 3 | IA, alertas inteligentes, preferências |

---

## 3. Roadmap por fases

### Fase 0 — Fundação
Projeto Next.js + Supabase, autenticação, design system / layout base (sidebar, tema moderno), Storage para artes, deploy na Vercel.

### Fase 1 — Núcleo operacional (MVP)
Clientes (CRM) · Contratos/Planos · Financeiro (receitas, despesas, lucro por cliente) · Projetos · Tarefas (Kanban) · Conteúdo (calendário) · Equipe (cadastro mínimo) · Dashboard v1.
> Entrega o ciclo completo: Cliente → Plano → Trabalho → Financeiro → Dashboard.

### Fase 2 — Colaboração & especialização
Aprovação de cliente (portal externo) · Campanhas · Base de conhecimento · Comentários · Tempo/custo por tarefa · Score de cliente · "Prometido vs entregue".

### Fase 3 — Inteligência & diferencial
IA (gerar legenda, sugerir ideias, revisar texto) · Alertas inteligentes (cliente sem post, tarefa atrasada, baixa lucratividade) · Previsão de faturamento.

---

## 4. Observações de arquitetura
- **Single-tenant:** sem `org_id`/RLS por organização. Auth do Supabase controla só usuários internos (colaboradores). Sistema é exclusivo da Dunamis — não há plano de virar SaaS multiempresa.
- **Storage:** artes de conteúdo e materiais de campanha no Supabase Storage.
- **Cálculos pesados** (lucro por cliente, score, previsão) começam como *views*/queries; podem virar funções no Postgres conforme crescer.
