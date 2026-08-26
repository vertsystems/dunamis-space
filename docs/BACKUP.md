# Backup do Dunamis Space

Cópia dos **dados** do banco e dos **arquivos** (logos, prints do SOS), duas
vezes por mês, direto na pasta do Google Drive.

A *estrutura* das tabelas não entra no backup de propósito: ela já está
versionada em `supabase/migrations/`, e migration é mais confiável que dump.

## O que acontece, e quando

| | |
|---|---|
| **Quando** | Dias **10 e 25**, ao meio-dia |
| **Quem dispara** | `launchd` (agendador do macOS), sem depender de app aberto |
| **Se o Mac estiver desligado** | Roda assim que ele ligar — o launchd não pula a data |
| **Onde salva** | `backups/` (dentro do projeto, sincronizado pelo Drive) |
| **Registro** | `~/Library/Logs/dunamisspace-backup.log` e `backups/ultimo-backup.txt` |

```
backups/
├── 2026-08-26_dunamisspace.sql.gz   ← dados de todas as tabelas (~74 kB)
├── 2026-09-10_dunamisspace.sql.gz
├── arquivos/
│   ├── clientes/*.webp              ← logos
│   └── sos/*.webp                   ← prints dos chamados
└── ultimo-backup.txt                ← resumo da última rodada
```

Guarda os **24 dumps mais recentes** (um ano). Os arquivos do Storage são um
espelho que só cresce: nada é apagado de lá, mesmo se sumir do sistema.

> `backups/` está no `.gitignore`. **Nunca** force o commit dessa pasta: o
> repositório é público e o dump traz as senhas do cofre em texto legível.

## Rodar na mão

```bash
PGPASSWORD='<senha>' node scripts/backup.mjs
```

Ou, para usar a senha já guardada no Mac:

```bash
node scripts/backup.mjs
```

## Restaurar

1. Num banco novo, aplique as migrations de `supabase/migrations/` **na ordem**
   (todas são idempotentes).
2. Restaure os dados:
   ```bash
   node scripts/restore.mjs backups/2026-08-26_dunamisspace.sql.gz
   ```
   Ele mostra o que vai fazer e espera você digitar `sim`.
   Use `--limpar` se o banco de destino já tiver dados que devam ser
   substituídos.
3. Recrie os **logins** no painel do Supabase (Authentication → Users). Os
   e-mails de quem tinha acesso estão no cabeçalho do próprio arquivo de
   backup. O perfil de cada pessoa (nome, cargos) volta com os dados.
4. Suba de novo os arquivos de `backups/arquivos/` nos buckets `clientes` e
   `sos`, mantendo os mesmos nomes.

O arquivo `.sql.gz` também abre no SQL Editor do Supabase: basta descompactar e
colar.

## Onde ficam as peças

| Peça | Caminho |
|---|---|
| Script do backup | `scripts/backup.mjs` |
| Script da restauração | `scripts/restore.mjs` |
| Agendamento | `~/Library/LaunchAgents/com.vertsystems.dunamisspace-backup.plist` |
| Senha do banco | `~/.config/dunamisspace/backup.env` (só o dono lê) |

## Mexer no agendamento

```bash
# ver se está ativo e quantas vezes rodou
launchctl print gui/$(id -u)/com.vertsystems.dunamisspace-backup | grep -E "state|runs"

# rodar agora, para testar
launchctl kickstart -k gui/$(id -u)/com.vertsystems.dunamisspace-backup

# desligar / religar (depois de editar o .plist)
launchctl bootout gui/$(id -u)/com.vertsystems.dunamisspace-backup
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.vertsystems.dunamisspace-backup.plist
```

Para mudar os dias ou o horário, edite os blocos `StartCalendarInterval` do
`.plist` e recarregue com os dois últimos comandos.

## Como sei que funciona

O backup se confere sozinho: depois de gravar, ele reabre o arquivo compactado
e checa se o número de linhas bate com o que leu do banco — se não bater, falha
e avisa em `ultimo-backup.txt`.

Em 26/08/2026 o primeiro arquivo passou por um ensaio de restauração completo:
as 1267 linhas foram recriadas em cópias temporárias do banco e comparadas
linha a linha com o original. Contagem e conteúdo idênticos, incluindo os
campos com texto formatado e com listas.
