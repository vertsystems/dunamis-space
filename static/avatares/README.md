# Avatares

Solte aqui os arquivos de avatar. **Prefira `.webp`** (bem mais leve).
Também aceita `.png`, `.jpg` e `.svg`.

Cada arquivo desta pasta vira uma opção na galeria de avatares do perfil
(**/perfil → botão de câmera no avatar**).

- O **nome do arquivo** vira o rótulo da opção (ex.: `astronauta.webp` → "Astronauta";
  use `-` ou `_` para espaços: `super-heroi.webp` → "Super heroi").
- Evite espaços no nome do arquivo (use `-`) para URLs limpas.
- Prefira imagens **quadradas** (ex.: 250×250) — elas são exibidas em recorte circular/arredondado.
- Depois de adicionar/remover arquivos, faça o **deploy** (git push): a lista é
  gerada no build automaticamente. Não precisa editar nenhum código.

> A lista é gerada por `scripts/gen-avatares.mjs` para `src/lib/avatares.generated.json`.
