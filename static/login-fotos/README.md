# Fotos do login (rotativas)

Solte aqui as imagens que aparecem no **painel direito da tela de login**.
A cada acesso à tela de login, uma delas é escolhida **aleatoriamente**.

- Formatos aceitos: **`.webp`** (recomendado), `.jpg`, `.png`, `.avif`, `.svg`.
- Prefira imagens em **retrato/vertical** (o painel é mais alto que largo) e com
  boa aparência em recorte (`object-fit: cover`).
- Evite espaços no nome do arquivo (use `-`).
- Depois de adicionar/remover arquivos, faça o **deploy** (git push): a lista é
  gerada no build automaticamente (`scripts/gen-login.mjs`). Não precisa mexer em código.

> Se a pasta estiver vazia, o painel mostra o gradiente da marca (fallback).
