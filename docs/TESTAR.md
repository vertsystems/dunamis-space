# Testar o Dunamis Space

> Como testar de verdade aqui. A regra curta está no `CLAUDE.md` da pasta; o banco, em
> [BANCO.md](BANCO.md).

## Testes e tipos

- `npm test -- src/lib/<caminho>.test.ts [outro.test.ts …]`. O `npm test` chama
  `scripts/testar.mjs`, que espelha o projeto num disco local e roda o vitest lá, porque dentro do
  Google Drive o vitest trava a 0% de CPU: nunca rode `npx vitest` direto
- Teste novo mora ao lado do arquivo testado (`<nome>.test.ts`). A bateria inteira (`npm test`
  sem arquivo) só quando ninguém mais está editando
- `npm run check` (1 a 3 min). Erro em arquivo que não é do seu trabalho: cite, não conserte
- `npm run build` (uns 5 min, sem imprimir nada até o fim) quando a mudança mexe em rota,
  configuração ou dependência

## Ver uma tela que pede login

Toda rota pede login, e quem testa não tem sessão. Criar usuário de teste com senha é credencial:
pergunte ao Bruno. Três caminhos:

1. Testar a função que a tela usa
2. **Prévia temporária** numa rota pública: `src/routes/pagamentos/zz-prev-<nome>/+page.svelte`
   (o `/pagamentos/` é público no `hooks.server.ts`), com os dados preenchidos à mão, servida por
   `npx vite dev --port 5174 --strictPort` em segundo plano. Antes de entregar: apague a pasta,
   derrube o servidor e confira com `git status --short`. Prévia esquecida em `/pagamentos/` é
   exposição. Editar arquivo com o vite rodando recarrega a página minutos depois
3. Conferência com login em produção fica com o Bruno: diga exatamente o que ele deve olhar

## Prints

Chrome headless, computador em 1440 x 900 e celular em 500 de largura (o headless não desce de
500 px: abaixo disso ele corta o print, sem ser defeito da página):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --user-data-dir="$TMPDIR/chrome-teste" --window-size=1440,900 --virtual-time-budget=8000 \
  --screenshot="<caminho>.png" "<url>"
```

## Produção

- Confira no domínio final (dspace.verts.me), nunca na URL `.vercel.app`, que cai na proteção da
  Vercel e dá falso negativo
- Velocidade de página que tem o `dm.js` do DMetric: sempre com
  `--blocked-url-patterns='*dspace.verts.me*'` no Lighthouse, senão a medição conta como visita
