# Sistema Online Dunamis — Estrutura do Projeto

> Sistema online integrado para a agência **Dunamis Company Marketing Digital**.
> Fonte: board do Figma "Projeto Dunamis Company".

## Visão do sistema (antes de tudo)
O sistema **não é só "organizar tarefas"**. Ele precisa ser:
- **Centro operacional** da agência (onde a operação inteira acontece).
- **Base de decisão**: transformar dados em lucro.

Objetivo final: tirar o dono do operacional e colocá-lo na **gestão**.

---

## 1. Arquitetura em camadas
O sistema é dividido em 4 camadas conceituais (não são telas, são "papéis" dos dados):

| Camada | Papel | O que contém |
|--------|-------|--------------|
| **1. Controle (Gestão)** | Decisão e contrato | Financeiro, Clientes, Projetos, Contratos |
| **2. Operacional (Execução)** | Produção do dia a dia | Tarefas, Conteúdo, Aprovação, Cronograma |
| **3. Performance (Inteligência)** | Medir resultado | Relatórios, KPIs, Produtividade, ROI de clientes |
| **4. Colaboração** | Comunicação | Comunicação interna, Comentários, Status em tempo real |

---

## 2. Módulos essenciais

### 1. CRM + Clientes — *base de tudo*
- Cadastro completo de clientes
- Status: lead, ativo, pausado, cancelado
- Histórico de interações
- Serviços contratados
- Valor mensal (MRR)
- Responsável pelo cliente
- 🔥 **Avançado:** Score de cliente (rentabilidade + risco de churn)

### 2. Financeiro — *o mais importante*
- Receita recorrente (mensalidades)
- Receitas pontuais (projetos, impressos)
- Despesas (fixas + variáveis)
- Custos por cliente
- Margem por cliente
- Fluxo de caixa
- 🔥 **Diferencial:** Lucro por cliente automático + alerta de cliente "não lucrativo"

### 3. Projetos / Jobs — *toda a operação*
- Criação de projetos por cliente
- Tipos de job: social media, design, tráfego pago, impressos
- Status: em andamento, aguardando cliente, em aprovação, finalizado
- 🔥 **Ideia:** Templates de projeto pré-configurados (ex: "Plano mensal Instagram")

### 4. Tarefas — *estilo Asana, melhorado*
- Kanban + lista + calendário
- Responsáveis, prioridade, prazo
- Checklist interno
- 🔥 **Diferencial:** Tempo gasto por tarefa + custo por tarefa (ligado ao salário/hora do colaborador)

### 5. Planejamento de Conteúdo — *substitui 100% o Notion*
- Calendário de posts (Reels, Carrossel, Story)
- Copy + legenda
- Arte vinculada
- Status: rascunho, aprovado, programado, publicado
- 🔥 **Essencial:** Tag por cliente, contador de posts mensais (pra não acumular), status "programado" e "postado manual"

### 6. Aprovação de Cliente
- Cliente visualiza o conteúdo
- Aprova / solicita alteração
- Comentários
- 🔥 **Diferencial:** Histórico de aprovação + tempo médio de resposta do cliente

### 7. Colaboradores / Equipe
- Cadastro de equipe
- Função (designer, social media, gestor, etc.)
- Carga de trabalho
- Tarefas atribuídas
- 🔥 **Diferencial:** Ranking de produtividade + tempo médio de entrega

### 8. Dashboard — *o cérebro do sistema*
Visão geral: faturamento mensal, lucro, clientes ativos, tarefas atrasadas, conteúdos pendentes, performance da equipe.
> É o que tira o dono do operacional.

### 9. Contratos e Planos
- Plano do cliente: Starter, Gold, Premium
- Entregas mensais, limites (ex: 16 posts)
- Vigência, renovação
- 🔥 **Diferencial:** Comparação prometido vs. entregue

### 10. Gestão de Campanhas (Jornal / Promoções)
- Cadastro de campanhas
- Produtos (REF, preço, limite), datas
- Materiais vinculados: feed, stories, faixa, jornal
- 🔥 **Diferencial:** Validação automática de preços + organização por campanha (ex: "Operação Fecha Mês")

### 11. Base de Conhecimento — *substitui parte do Notion*
- Processos internos, padrões de legenda, scripts, modelos de campanha
- Ex: "Como fazer post Rede Bazzar", "Padrão Casa do Tita"

---

## 3. Funcionalidades avançadas (diferencial de mercado)
- **IA integrada:** gerar legenda automática, sugerir ideias de conteúdo, revisar textos
- **Alertas inteligentes:** cliente sem post na semana, tarefa atrasada, cliente com baixa lucratividade
- **Previsão de faturamento:** baseado em contratos ativos → projeção mensal

---

## 4. Plano de construção

### Fase 1 — MVP (começar simples e escalável)
**Tabelas principais do banco:** Clientes, Projetos, Tarefas, Conteúdos, Colaboradores, Financeiro, Campanhas

**Telas iniciais:**
1. Dashboard
2. Clientes
3. Projetos
4. Tarefas
5. Conteúdo
6. Financeiro
7. Equipe

### Fase 2 — Evolução
- API própria
- Banco relacional (PostgreSQL)

---

## Resumo
O sistema precisa controlar: **Clientes · Dinheiro · Produção · Conteúdo · Equipe · Performance.**
Se ele fizer isso bem, o dono sai de operador e vira gestor de verdade.
