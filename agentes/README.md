# Agentes do DGathe em arquivo

Cada agente do DGathe que faz parte de uma equipe é um arquivo aqui: `agentes/<equipe>/<id>.md`.
O arquivo é a fonte da verdade, versionada no git. O banco (`dgathe_agentes`) é só o que a ponte lê
quando abre a sessão do agente. Por isso a regra é: **mudou o arquivo, sincronize**. Instrução nova
vale na próxima rodada do agente, inclusive na retomada de uma conversa.

Contrato completo: [`docs/dgathe/contrato-equipes.md`](../docs/dgathe/contrato-equipes.md), seção 6.
Conteúdo das cadeiras do departamento de Desenvolvimento & IA: [`docs/dgathe/cargos-dev-ia.md`](../docs/dgathe/cargos-dev-ia.md).

## Formato

```markdown
---
id: lewis
nome: Lewis
cargo: Gerente de Desenvolvimento e IA
equipe: dev
lider: sim
sala: dev
cadeira: Cadeira do gerente
pasta: dunamiscompany
autonomia: editar
modelo:
esforco:
ordem: 10
ativo: sim
---

# Lewis · Gerente de Desenvolvimento e IA

(as instruções do agente, em markdown)
```

O cabeçalho vai entre duas linhas `---`, uma `chave: valor` por linha. Linha em branco pode; aspas em
volta do valor são tiradas. Tudo depois do segundo `---` é o corpo, que vira as `instrucoes` do agente.

| Chave | O que é | Regra |
|---|---|---|
| `id` | identificador do agente | igual ao nome do arquivo (`lewis.md` → `lewis`); minúsculas, números e hífen, 2 a 40 caracteres |
| `nome` | nome no jogo | até 40 caracteres |
| `cargo` | cargo no crachá e no painel | até 60 caracteres |
| `equipe` | a equipe | igual à pasta (`agentes/dev/` → `dev`); minúsculas, números e hífen, 2 a 30 caracteres |
| `lider` | se lidera a equipe (só o líder delega) | `sim` ou `não` (também `nao`, `true`, `false`) |
| `sala` | sala do mapa onde ele trabalha | id da sala em `src/lib/dgathe/mapa.ts` (ex.: `dev`) |
| `cadeira` | nome do móvel onde senta | ex.: `Cadeira do gerente`, `Cadeira de Bandolete` |
| `pasta` | pasta de trabalho da sessão | relativa à VERT SYS, sem `..` e sem começar com `/` |
| `autonomia` | o que faz sem pedir licença | `perguntar`, `editar` ou `livre` |
| `modelo` | modelo do Claude Code | vazio = o padrão do Mac; senão `opus`, `sonnet`, `haiku`… |
| `esforco` | esforço do modelo | vazio = o padrão do Mac; senão `low`, `medium`, `high`, `xhigh` ou `max` |
| `ordem` | ordem nas listas e na distribuição das cadeiras | número inteiro |
| `ativo` | se recebe tarefa | `sim` ou `não` |

Todas são obrigatórias, menos `modelo` e `esforco`. As instruções são obrigatórias e vão até 20.000
caracteres (mire de 3 a 8 mil: elas entram em toda sessão do agente).

Regras entre arquivos: um id só aparece uma vez, e cada equipe tem **um** líder ativo (o banco tem um
índice único que recusaria dois). Equipe sem líder ativo e líder com autonomia `perguntar` dão aviso,
mas gravam.

**Nunca ponha a aparência do boneco no arquivo.** A chave `aparencia` não existe aqui (dá erro de
"chave desconhecida") e o sincronizador nunca mexe nessa coluna: ela é escolhida no jogo.

Ignorados: este `README.md`, `README.md` dentro das pastas e nomes que começam com `_` ou `.` (bom
para rascunho: `_rascunho.md`). Um `.md` solto aqui na raiz, fora de uma pasta de equipe, também é
ignorado, mas dá aviso.

## Sincronizar

```sh
node ponte/agentes.mjs --conferir             # valida e mostra o que mudaria, sem gravar
node ponte/agentes.mjs                        # valida e grava
node ponte/agentes.mjs --desativar-ausentes   # também desativa quem sumiu dos arquivos
node ponte/agentes.mjs --pasta <dir>          # lê <dir>/<equipe>/<id>.md em vez desta pasta
```

Rode de dentro de `dunamisspace/`. Entra no banco como superusuário, com a senha de
`~/.config/dunamisspace/backup.env` (o usuário da ponte só lê os agentes), e precisa da migration 0102.

Saída de exemplo:

```
Definições em agentes/: 11 arquivo(s), 1 equipe (dev)

  novo         lewis      Lewis · Gerente de Desenvolvimento e IA · dev (líder)
  mudou        clovis     ordem, instrucoes
  igual        shakira
  sem arquivo  teste-x    (equipe dev) continua ativo; --desativar-ausentes desativa

Gravado: 1 novo, 1 mudou, 9 iguais.
```

O que ele garante:

- **Qualquer erro em qualquer arquivo: nada é gravado.** Cada erro sai com o arquivo e a linha
  (`agentes/dev/lewis.md:7: ordem precisa ser um número inteiro`). Saída 1.
- Grava tudo numa transação (upsert pelo `id`) e confere no fim que o banco ficou igual aos arquivos.
  Só regrava quem mudou de verdade. Erro no meio desfaz tudo (saída 2).
- **Nunca apaga agente.** Agente ativo de uma equipe desta pasta que não tem mais arquivo continua
  ativo e aparece como `sem arquivo`; só o `--desativar-ausentes` desativa. As tarefas e o histórico
  dele ficam.
- Só olha as equipes que têm pasta com arquivo aqui. Agente sem equipe (o `assessor`, da Diretoria)
  mora só no banco e nunca é tocado.
- Troca de líder num passo só: muda os dois arquivos e sincronize. Se o líder antigo sumiu dos
  arquivos e continua ativo no banco, ele recusa e pede o `--desativar-ausentes`.

## Quem pode sincronizar

Criar, ativar ou desativar agente, mudar a autonomia para `livre` ou trocar o modelo do padrão é
decisão do CEO. Mexer só nas instruções passa pelo gerente da equipe (ver
`docs/dgathe/cargos-dev-ia.md`, seção 3.1). O `--conferir` é livre: não grava nada.

## Testar sem mexer nos agentes de verdade

Use uma pasta fora daqui e ids começando com `teste-`, numa equipe com nome que ninguém mais usa
(ex.: `teste-sinc`), e apague no fim:

```sh
node ponte/agentes.mjs --pasta /caminho/teste-agentes      # lê /caminho/teste-agentes/teste-sinc/*.md
```

No fim, como superusuário: `delete from public.dgathe_agentes where id like 'teste-sinc-%'` (as
tarefas vão junto). Apague só os ids que você criou: outras pessoas podem estar testando com `teste-`.
