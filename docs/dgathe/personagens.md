# Personagens prontos do DGathe

> Pedido do Bruno (10/11/2026): em vez de montar o avatar peça a peça no Meu Perfil, **escolher um
> personagem pronto**: escolhe o sexo, clica na cabecinha que gosta e pronto, cada um já é um
> avatar completo (roupa, cabelo, acessório). O mesmo catálogo serve para os **agentes** novos, cada
> um com estilo, personalidade e jeito de andar próprios: "alguns reais, outros sobrenaturais,
> heróis... bastante opções, para encaixar neles e não ficar repetido".
>
> **Primeira rodada:** 17 imagens de referência viraram 56 personagens originais.
> **Segunda rodada** (mesmo dia): mais 38 referências (refs. 18 a 55) viraram 45 personagens, entre
> eles uma família nova, os **bichos de roupa** (cabeça, mãos e pés de bicho num corpo de gente
> vestido). Hoje são 101.

Este arquivo é a **lista única** do que cada pintor entrega, com o que já está desenhado e o que
falta, e as convenções de desenho. As tabelas de peças e o catálogo são gerados do código
(`aparencia.ts` e `personagens.ts`): a coluna "Quem usa" é exata.

## Regra de autoria (vale para todo mundo)

- Personagem **original**, inspirado no arquétipo. Nada de personagem com dono (Hulk, Majin Boo,
  Inspetor Bugiganga, Homem-Aranha...), nada de pessoa real reconhecível (Ayrton Senna, Michael
  Jackson, jogador famoso, rainha, papa...), nada de logo, letra, número ou marca (o "S", o "M",
  Nike, Vans, adidas, "LA", "Chicago 23", crachá com nome de empresa). Emblema de herói é raio,
  estrela ou losango, nas cores do personagem.
- Na segunda rodada: os dois "homens-aranha" viraram heróis nossos (o **Mascarado**, de capuz e
  máscara de cores próprias, sem teia nem aranha; o **Samurai**, de chapéu de palha, sem símbolo); o
  loiro de topete e regata verde é o **Lutador**, de cara própria; a senhora de casaco rosa é uma
  **Dama** elegante qualquer; o senhor de túnica clara virou o **Vovô Sorriso**, de cardigã (nada de
  roupa de papa); o jogador é o **Boleiro**, de listras roxas e brancas, sem escudo.
- O estilo é o do jogo: flat, chapado, cartoon, cabeça grande, olhos grandes com brilho, bochecha
  rosada, contorno `#232a3a` em tudo, sombra chapada à direita (a luz vem da esquerda). As
  referências em 3D viram flat: poucas formas, bem contornadas.
- **O tamanho não muda** (o Bruno gostou do atual): ~54 px de altura no zoom 1, cabeça de raio 9,6.
  Gigante pode ficar até 3 px mais alto; baixinho, até 3 px mais baixo. A cabeça é a mesma em todos
  (a de bicho ocupa o mesmo círculo; só as orelhas passam dele).

## Situação em 10/11/2026 (fim do dia)

- **As duas rodadas estão desenhadas.** As 122 peças da primeira rodada, as 62 da segunda e as 10
  cabeças de bicho mudam o boneco nos dois sexos (conferido peça a peça contra a saída padrão; só o
  `rabo` "falta" na conferência, porque sem bicho ele não desenha nada, como deve). Os 101 personagens
  saem sem nenhum erro de desenho, de frente, de costas, andando, espelhados e sentados.
- O boneco antigo (formato do editor) e os 56 personagens da primeira rodada continuam **idênticos
  pixel a pixel** (1.400 + 392 desenhos comparados depois de tudo, inclusive da integração).
- **Integrado:** o Meu Perfil escolhe o personagem pela cabecinha, o jogo anda do jeito de cada um, e
  os agentes têm crachá com o momento da rotina, balão de ampulheta e raquete no pingue-pongue (veja
  "Integração").
- Duas trocas do integrador, olhando os prints: o **Veterano** passou de `longo` para `ondulado` (o
  liso grisalho parecia um capacete; a ref. 24 tem o cabelo comprido e solto) e a **Mascarada** de
  `rabo` para `curto` (o rabo de cavalo saía para fora do capuz, de frente e de costas).

## Como funciona

### O que fica guardado

`colaboradores.dgathe_avatar` (pessoas) e `dgathe_agentes.aparencia` (agentes) aceitam dois formatos,
lidos por `lerAparencia` (`src/lib/dgathe/aparencia.ts`):

| Formato | Exemplo | Quando |
|---|---|---|
| Personagem pronto | `{"personagem": "detetive"}` | o novo; é o que o Meu Perfil grava |
| Personagem com troca | `{"personagem": "ogro", "corRoupa": "#3b6ef6"}` | um agente que precisa de outra cor para não repetir |
| Peças soltas (antigo) | `{"corpo": "feminino", "pele": "negra", ...}` | quem salvou antes de 10/11/2026; continua valendo |

- Campo desconhecido ou fora do catálogo cai no padrão, campo por campo. Personagem que não existe
  cai no formato antigo (com a cor de tema do perfil na roupa).
- `paraGuardar(a)` devolve só `{"personagem": id}` quando a aparência é o personagem sem mudança, e a
  aparência inteira quando mudou. Gravar sempre por ele: assim, quando o desenho de um personagem
  melhorar, quem o escolheu já aparece com o novo.
- **O id de personagem nunca muda nem é reaproveitado** (está gravado no banco). Para tirar alguém da
  tela de escolha, deixe de listar, mas mantenha a ficha.

### Campos da aparência

Os 8 de sempre (`corpo`, `pele`, `cabelo`, `corCabelo`, `roupa`, `corRoupa`, `sapato`, `oculos`) e os
novos, todos com padrão que deixa o boneco como era:

| Campo | Padrão | O que é | Lista em `aparencia.ts` |
|---|---|---|---|
| `porte` | `padrao` | tipo de corpo | `PORTES` |
| `baixo` | `auto` | parte de baixo (`auto` = a de sempre, que sai da roupa) | `BAIXOS` |
| `corBaixo` | `''` | cor da parte de baixo; `''` = a que combina com a roupa | `#rrggbb` |
| `barba` | `nenhuma` | barba e bigode, na cor do cabelo | `BARBAS` |
| `chapeu` | `nenhum` | chapéu e enfeite de cabeça | `CHAPEUS` |
| `naMao` | `nada` | o que leva na mão da frente | `NA_MAO` |
| `rosto` | `sorriso` | expressão (`sorriso` é o rosto de sempre) | `ROSTOS` |
| `detalhes` | `[]` | detalhes que se somam (até 6, sem repetir) | `DETALHES` |
| `corExtra` | `''` | cor de destaque: capa, chapéu, faixa, bolsa, tênis colorido | `#rrggbb` |
| `andar` | `normal` | jeito de andar | `ANDARES` |
| `personagem` | `''` | de qual personagem veio (`''` = montada peça a peça) | `PERSONAGENS` |
| `bicho` | `nenhum` | bicho de roupa (segunda rodada); `nenhum` = gente | `BICHOS` |

As peles e cores de cabelo de fantasia têm `fantasia: true` (para a tela de pessoas não oferecer pele
verde por engano). Cada detalhe diz qual pintor desenha (`pintor: 'cabeca' | 'corpo'`). Cor de cabelo
nova da segunda rodada: `grisalhoEscuro` ("sal e pimenta", só cor, não precisa de desenho).

### Arquivos e donos

| Arquivo | O que tem | Quem mexe |
|---|---|---|
| `src/lib/dgathe/aparencia.ts` | catálogo de peças, `BICHOS`, `lerAparencia`, `paraGuardar`, `ANDARES`, `bichoDe` | arquiteto |
| `src/lib/dgathe/personagens.ts` | o tipo `Personagem`, os grupos (`GRUPOS`, `NOME_DO_GRUPO`) e o catálogo (101) | arquiteto |
| `src/lib/dgathe/avatar-base.ts` | primitivas (`forma`, `sombraDireita`...), cores, medidas, os tipos `Quadro`, `Medidas`, `Passada`, os ajudantes `extraOu`, `temDetalhe`, `ehBicho` | arquiteto (os pintores só importam) |
| `src/lib/dgathe/avatar.ts` | as peças originais, a ordem das camadas, os ganchos, `passada()` e a altura de cada peça (`ALTO_*`) | arquiteto e integrador |
| `src/lib/dgathe/avatar-cabeca.ts` | peças novas da cabeça e as cabeças de bicho | **pintor da cabeça** |
| `src/lib/dgathe/avatar-corpo.ts` | peças novas do corpo, mão e pé de bicho, rabo | **pintor do corpo** |
| `EditorAvatar.svelte`, `routes/perfil/+page.svelte`, `jogo.ts`, prévia temporária | a tela de escolha e o jogo | **integrador** |

Os pintores importam **só de `avatar-base.ts`** (nunca de `avatar.ts`, que importa os dois: viraria
import circular). Função auxiliar própria fica no arquivo de cada um. Nenhum gancho novo foi criado
na segunda rodada: tudo cabe nos que já existem (tabela "A ordem das camadas").

## Convenções de desenho

### Coordenadas

px de tela no zoom 1; `y` cresce para baixo; **os pés ficam em (0, 0)**. O boneco olha um pouco para a
direita (rosto em 3/4: o lado direito do rosto é deslocado +1 px). Pontos de referência do corpo padrão:

| Ponto | Masculino | Feminino |
|---|---|---|
| Pés (chão do sapato) | y = 0, pernas em x = ±3 | y = 0, pernas em x = ±2,2 |
| Quadril / começo da perna | y ≈ -16 | y ≈ -17 (calça), saia começa em -19,4 |
| Tronco | x -7,2 a 7,2; y -30,5 a -14 (cantos 4,6 em cima) | topo em -30,5, ombro ±5,9 em -27,8, cintura ±4,4 em -20,8, termina em -18,2 (moletom: -14,4) |
| Ombro (articulação do braço) | (±7,2; -28,6) | (±5,4; -28,4) |
| Braço | cápsula de 4,4 de largura, mão (raio 2,5) a 12,6 do ombro | 3,8 de largura, mão (raio 2,1) a 12,2 |
| Pescoço | y -32,4 a -29,8 | igual, mais fino |
| Cabeça | centro (0; -40,5), raio 9,6: vai de -50,1 a -30,9 | igual |
| Orelhas | (±9,3; -39,7), oval 2 × 2,6 | igual, brinco em (±9,5; -36,6) |
| Olhos | (-2,7; -40,3) e (3,7; -40,3) | igual, maiores e com cílios |
| Sobrancelhas | y -43,5 a -44,6 | finas e arqueadas, até -45,7 |
| Nariz | arco em (1; -38,2) | igual |
| Boca | de (-1,7; -35,7) a (3,7; -35,7), fundo em -31,6 | contorno de batom |
| Bochechas | (-5,5; -36,4) e (6,4; -36,4) | mais coradas |
| Alto do cabelo | ≈ -52,8 (black power: -56,4) | igual |

Constantes prontas em `avatar-base.ts`: `CY`, `R`, `OLHOS`, `BOCA`, `MEDIDAS_MASCULINO`,
`MEDIDAS_FEMININO`, `ABAIXA_SENTADO`, `RECUO_SENTADO`.

**Teto:** chapéu e enfeite podem subir até y ≈ -60 (cartola, chapéu de mago e a orelha da coelha até
-62). Acima disso encosta no "z z z" de quem está ausente e no balão do agente. Na largura, o boneco
cabe em x de -12 a 12 (o clique é esse retângulo); capa, asas, cajado e as abas largas podem passar um
pouco, mas nada além de ±16.

**Altura de cada peça (`ALTO_CABELO`, `ALTO_CHAPEU`, `ALTO_BICHO` em `avatar.ts`):** o jogo usa para pôr o
crachá, o "z z z" e o balão acima da cabeça. As da segunda rodada estão lá com o **teto planejado**
(por exemplo `flattop` 59,5, `abaLarga` 59, `coelho` 62, `lobo` 58): desenhe dentro dele. Precisou
passar? Avise o integrador, que mede e atualiza.

### Estilo

- Toda forma com `forma(ctx, caminho, cor)`, que passa o contorno `CONTORNO` (`LW` = 1,05). Detalhe
  pequeno usa contorno de 0,5 a 0,8 (`forma(ctx, c, cor, 0.6)`); risco solto com `traco()`; botão,
  brilho e pinta com `ponto()` (sem contorno).
- Sombra chapada à direita com `sombraDireita(ctx, caminho, xDe)`, `xDe` uns 55 a 60% para a direita do
  centro da forma. Na pele do rosto, `SOMBRA_PELE`. Brilho do cabelo e de coisa lisa à esquerda, em cima
  (`brilho()` faz o do cabelo).
- Cores derivadas com `tom(cor, k)`: `0.76` para a dobra e o detalhe escuro, `0.6` para costura,
  `1.25` a `1.45` para o detalhe claro. Use as cores do `Quadro` (`q.roupa`, `q.corBaixo`, `q.pele`,
  `q.cabelo`, `q.bicho`) e a de destaque com `extraOu(q, padrão)`. Roupa clara (`q.clara`) pede detalhe
  escuro.
- Estampa (xadrez, listra, camuflado, florzinha): poucas formas grandes, nunca textura. No boneco de
  54 px, detalhe menor que 0,8 px some e textura vira sujeira. Nada de letra, número, logo.
- **Desempenho:** cada boneco é desenhado a cada quadro (umas 20 pessoas e agentes, 60 vezes por
  segundo). Nada de `getImageData`, `shadowBlur`, imagem ou `filter`. Gradiente só na aura.
- **Deixe o contexto como encontrou:** mudou `globalAlpha`, transformação ou recorte, use
  `ctx.save()`/`ctx.restore()`. Não altere o `Quadro`.
- **Id que não é seu ou que você ainda não desenhou:** devolva `false`/`null` (ou não faça nada). O
  boneco cai na peça padrão ou fica sem a peça, mas nunca quebra.

### De frente, de costas, espelhado, sentado, andando

- `q.deFrente`: de frente quando desce na tela; de costas quando sobe. De costas não tem rosto: a
  cabeça é coberta pelo cabelo (`cabeca.costas`), a roupa mostra as costas (`corpo.roupa` com
  `q.deFrente = false`) e a capa, as asas, a mochila e o rabo passam para a frente do corpo
  (`corpo.acabamento`).
- Indo para a esquerda, `avatar.ts` espelha tudo (`scale(-1, 1)`) antes de chamar os ganchos:
  desenhe sempre olhando para a direita.
- `q.sentado`: o corpo do quadril para cima já vem recuado `RECUO_SENTADO` e abaixado; as pernas viram
  canelas (do joelho, em -13,4, até o pé) nas posições x = ±2,7 (dele) e ±2,2 (dela); de frente, o
  colo (`corpo.colo`) vai do quadril (px - 0,4; -16,4) ao joelho (px + 5,1; -14,7). Saia comprida,
  túnica, casacão e sobretudo sentados: só o colo e a barra caindo na frente da canela. Maleta, bolsa
  e sacola não aparecem sentado; café, celular, livro, banana e notebook podem ficar no colo.
- Andando: `q.passada` traz o instante (ver "Jeitos de andar"). As pernas padrão vão em
  `x = ±(3 - passo × 2,4)` (dela: `±(2,2 - passo × 2,2)`) e erguem `max(0, ±passo) × pe`; o corpo
  sobe `sobe`. Peça comprida (barra do casacão, capa, túnica, saia longa, rabo) pode balançar com
  `Math.sin(q.fase)`.
- Feminino (`q.feminino`) tem corpo próprio: ombro estreito, cintura, braço e perna finos. Cada roupa
  nova precisa de uma versão dela quando algum personagem feminino a usa (coluna "Versões" abaixo); a
  outra versão é bônus.

### A ordem das camadas e os ganchos

`avatar.ts` desenha nesta ordem. **Troca** = se o gancho devolver `true` (ou um caminho), a peça padrão
daquela camada não sai. **Soma** = o gancho desenha por cima, sempre.

| # | Camada | Gancho | Tipo | Contexto |
|---|---|---|---|---|
| 1 | sombra no chão | | | menor quando flutua |
| 2 | atrás de tudo: aura, asas, capa, cauda, rabo e espada de frente | `corpo.atras` | soma | no quadril (já com sobe, inclinação e recuo sentado) |
| 3 | pernas e sapatos (em pé, andando, canelas sentado) | `corpo.pernas` | troca | no chão; para os pés chame `q.sapato(px, y)` |
| 3a | cada pé | `corpo.sapato` | troca | `px` = meio do pé, `y` = chão do pé; bico para +x |
| 4 | saia, quadril da calça, barra comprida (em pé) | `corpo.parteDeBaixo` | troca | no quadril |
| 5 | cabelo de trás (de frente) | `cabeca.cabecaAtras` | soma (depois do padrão) | na altura da cabeça (`m.ergue`) |
| 6 | braço de trás | `corpo.braco(ctx, q, -1)` | troca | no ombro e girado; mão em (0, `q.m.braco`) |
| 7 | contorno do tronco | `corpo.tronco` | troca (devolve o caminho) | no quadril |
| 8 | roupa, dentro do recorte do tronco | `corpo.roupa` | troca | recorte já pintado com a cor da roupa; sombra e contorno vêm depois |
| 9 | por cima do tronco: gola, lenço, corrente, cinto, crachá, cachecol, alças, capa, asas, mochila e rabo de costas | `corpo.acabamento` | soma | no quadril |
| 10 | colo (sentado, de frente) | `corpo.colo` | troca | no quadril |
| 11 | pescoço, orelhas (as de bicho também) | `cabeca.orelhas` | troca (orelhas e brinco dela) | na altura da cabeça |
| 12 | cabeça (a de bicho também) | `cabeca.formaDaCabeca` | troca | |
| 13 | rosto (de frente; o de bicho também) | `cabeca.rosto` | troca | |
| 14 | sobre o rosto: barba, sardas, piercing, caninos, presas, máscaras, orelha caída de cachorro | `cabeca.sobreORosto` | soma | |
| 15 | cabelo da frente | `cabeca.cabeloFrente` | soma (depois do padrão) | |
| 16 | óculos | `cabeca.oculos` | soma (depois do padrão) | |
| 17 | chapéu, enfeite, chifres, antenas, ponta da orelha de bicho por cima do chapéu | `cabeca.chapeu` | soma | |
| 15-17 de costas | cabelo, chapéu e enfeites vistos por trás | `cabeca.costas` | soma (depois do padrão) | |
| 18 | item na mão, atrás dos dedos | `corpo.naMao(ctx, q, 'atras')` | soma | no centro da mão da frente, sem o giro do braço (y para baixo) |
| 19 | braço da frente | `corpo.braco(ctx, q, 1)` | troca | no ombro e girado |
| 20 | item na mão, na frente dos dedos (e os braços cruzados) | `corpo.naMao(ctx, q, 'frente')` | soma | igual ao 18 |

`corpo.medidas(q, padrao)` roda antes de tudo e devolve as `Medidas` do porte: `ombroX`, `ombroY`,
`braco` (do ombro ao centro da mão), `ergue` (quanto a cabeça sobe; o pescoço vem junto), `anguloMao`
(giro extra do braço da frente para segurar o item: ~0,5 segura na frente da barriga, ~0,9 ergue na
frente do peito, ~1,2 põe a mão no peito) e `sombraX` (onde começa a sombra do tronco). Devolva um
objeto novo.

O `Quadro` (`q`) traz: `a` (a aparência), `feminino`, `deFrente`, `sentado`, `andando`, `fase`, `t`
(relógio, para balançar antena, pulsar aura, soltar fumaça), `passada`, `m` (medidas), `bicho` (o bicho
de roupa com as cores, ou `null`), as cores resolvidas (`pele`, `cabelo`, `roupa`, `clara`, `corBaixo`,
`extra`) e `sapato(px, y)`. Ajudantes: `extraOu(q, cor)`, `temDetalhe(q, id)` e `ehBicho(q, forma?)`.

### Bichos de roupa (segunda rodada)

A cabeça, as mãos e os pés são de bicho; o corpo é de gente vestido (refs. 28 a 30, 33 a 35, 54 e 55).

- **O bicho vem em `q.bicho`** (`null` para gente), com `forma` (o desenho da cabeça) e quatro cores:
  `pelo` (cabeça, pescoço e tudo que é "pele"), `claro` (focinho, máscara clara, barriga, dentro da
  orelha), `escuro` (nariz, manchas, listras, máscara escura) e `mao` (a pata). São 10 bichos em 7
  formas: bichos da mesma forma dividem o desenho e só mudam cor e marca (o panda é um urso com
  manchas; o dálmata, um cachorro de pintas; o gato e o tigre, o mesmo felino).
- **`avatar.ts` já faz a parte dele:** num bicho, `q.pele` é a cor do pelo (o pescoço, a mão, a perna de
  bermuda e o peito sem camisa saem na cor do pelo sem ninguém mexer) e o cabelo original não sai. Todo
  bicho do catálogo usa `cabelo: 'careca'`; o topete do macaco é da cabeça de bicho.
- **Pintor da cabeça:** `orelhas` (troca) desenha as orelhas de bicho, atrás da cabeça; `formaDaCabeca`
  (troca) desenha a cabeça com o pelo e as marcas (frente e costas); `rosto` (troca) desenha olhos,
  sobrancelha, focinho, nariz e boca respeitando a expressão (`q.a.rosto`: sorriso, sorriso fechado,
  confiante, piscada, sério...), com cílios nela; orelha caída (cachorro) passa por cima da cabeça:
  `sobreORosto` de frente e `costas` de costas. Com chapéu que cobre a cabeça (gorro do guaxinim, lenço
  da dálmata), as orelhas saem pelos lados ou a ponta aparece por cima do chapéu (`chapeu`). Óculos e
  chapéus de gente servem no bicho como estão: o olho de bicho fica no mesmo lugar do olho de gente.
- **Pintor do corpo:** a mão vira pata na cor `q.bicho.mao` (panda: preta), com três risquinhos de dedo,
  dentro do seu `braco` (a manga como sempre, a mão de bicho no lugar da de gente); luvas vencem a
  pata. O tigre tem listras escuras no antebraço à mostra. `semCamisa` num bicho é peito de pelo com a
  barriga clara (`q.bicho.claro`) em oval, sem os traços de músculo. Os pés de bicho são o sapato
  `patas`; o rabo é o detalhe `rabo`.

### Como conferir

1. `npm run check` e `npm test -- src/lib/dgathe/personagens.test.ts src/lib/dgathe/aparencia.test.ts`.
2. A conferência de pixels e a folha de todos os personagens, rodada de qualquer pasta:
   `zsh "/private/tmp/claude-501/-Users-brunosantana-Library-CloudStorage-GoogleDrive-bruno-bsarts-gmail-com-Meu-Drive-Clients-DUNAMIS-COMPANY-VERT-SYS/21c69020-344f-41fd-a887-399c59784334/scratchpad/arquiteto2/ver.sh"`.
   Mostra (a) se o boneco antigo e os 56 personagens da primeira rodada continuam idênticos, (b) quais
   peças ainda saem no padrão (`pecas-faltando.txt`) e (c) a folha (`folha.png`).
3. Olhar com os olhos: em 10/11/2026 o integrador usou uma prévia temporária (todos os personagens de
   frente, andando, de costas e sentados, o editor novo e o jogo com crachás e balões), apagada no fim.
   Para conferir de novo, recrie uma rota pública sem o app e tire prints no Chrome sem janela.
4. Peça nova não pode mudar quem não a usa: o boneco antigo sai **idêntico pixel a pixel**.

## Peças do pintor da CABEÇA (`avatar-cabeca.ts`)

### Situação: tudo desenhado

As duas rodadas estão prontas (cabelos, barbas, chapéus, óculos, expressões, detalhes e as 10 cabeças
de bicho). Nos bichos, os ganchos da cabeça não desenham cabelo nem barba. Com chapéu que cobre a
cabeça, a orelha em pé sai pelos lados (o guaxinim de gorro); o capuz esconde as orelhas, e a da
coelha sai sempre por cima. O `flattop` não tem contorno embaixo e tem cerdinhas na beira de cima (com
contorno, parecia gorro de cozinheiro). A ponta do `chapeuPalha` cobre o coque do samurai.

### Cabelos — `cabecaAtras` (a parte de trás), `cabeloFrente`, `costas`

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `topete` | Laterais curtas e um topete alto penteado para trás, passando ~2 px do alto da cabeça (ref. 1) | executivo, marceneiro, diabinho | feito |
| `penteadoTras` | Liso e puxado para trás, sem franja, com uma mecha que se solta no alto (ref. 5); no vampiro, bico na testa | vovo-bigode, vendedor, conselheiro, vampiro | feito |
| `arrepiado` | Curto e bagunçado, tufos saindo nas laterais acima das orelhas; fica bom por baixo do chapéu (ref. 6) | detetive, recrutador | feito |
| `espetado` | Pontas para cima em zigue-zague (5 a 7), cartoon (ref. 12) | estagiario, ogro, cacador | feito |
| `moicano` | Laterais raspadas (sombra na cor do cabelo, alfa baixo) e uma crista alta do meio da testa à nuca | brutamontes | feito |
| `calvoLados` | Topo careca com brilho; cabelo só nas laterais e na nuca | cientista, tiozao, vovo-sorriso | feito |
| `afroCurto` | Crespo curto e rente, contorno arredondado ~1 px além da cabeça, textura de pontinhos | dj, professor, boleiro | feito |
| `dreads` | Dreads grossos até o ombro, caindo pelos lados e atrás, pontas arredondadas | fotografo | feito |
| `trancas` | Tranças finas e longas até o meio das costas, repartidas ao meio, risco das tranças | produtora, aventureira, troll | feito |
| `ondulado` | Longo abaixo do ombro com ondas (contorno em S), repartido de lado (ref. 2) | veterano, executiva, dancarina, curadora, descolada, vampira | feito |
| `cachosVolumosos` | Nuvem de cachos grandes em volta do rosto até o ombro (ref. 7), mais solta que o black | analista, ruivinha, anjo | feito |
| `chanelCacheado` | Na altura do queixo, cacheado e cheio dos lados (ref. 3) | diretora-criativa | feito |
| `raboCacheado` | Rabo alto no topo com cachos que descem até o meio das costas por um lado; frente lisa puxada (ref. 17) | consultora | feito |
| `franja` | Longo e liso com franja reta até as sobrancelhas | roqueira | feito |
| `mariaChiquinha` | Dois rabinhos dos lados, presos com elástico, franja leve | estudante | feito |
| `joaozinho` | Curtinho (pixie), franja de lado, nuca curta | artista | feito |
| `repicado` | Médio e repicado até a altura da orelha, franja bagunçada em mechas caindo na testa (para acima da sobrancelha), volume nos lados (ref. 27) | gala | feito |
| `onduladoCurto` | Curto com ondas grandes em cima, volume para cima e para o lado e uma mecha em S caindo na testa; laterais curtas (refs. 22 e 43) | arquiteto, redator | feito |
| `flattop` | Topete reto e alto, chapado em cima (até y ≈ -59), laterais raspadas com sombra na cor do cabelo (ref. 26). Cara própria: nada de franja de lutador de videogame | lutador | feito |
| `coqueSolto` | Coque alto e bagunçado no topo, com duas mechas soltas emoldurando o rosto dos lados (refs. 37 e 45) | anfitria, professora | feito |
| `chanelOndulado` | Chanel retrô na altura do queixo, ondas grandes, pontas viradas para fora, repartido de lado (ref. 38) | romantica | feito |
| `ombro` | Na altura do ombro, ondas leves, repartido de lado, cobrindo as orelhas (ref. 44) | recepcionista, marceneira | feito |
| `duasTrancas` | Repartido ao meio, duas tranças grossas (embutidas, com gomos) caindo pela frente dos ombros até o peito (ref. 47) | soldada | feito |
| `permanente` | Curtinho e fofo de senhora, ondinhas miúdas em volta da cabeça (ref. 49); aparece por baixo do chapéu | dama | feito |

### Barbas e bigodes — `sobreORosto`, na cor do cabelo

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `porFazer` | Sombra de barba na mandíbula e no buço (cor do cabelo, alfa ~0,25), sem contorno | minimalista, roqueiro, empolgado, recrutador, redator | feito |
| `curta` | Barba curta e desenhada contornando a mandíbula, bigode ligado, sorriso à mostra (ref. 1) | executivo, conselheiro | feito |
| `cheia` | Barba cheia e arredondada cobrindo o queixo, com bigode (ref. 10) | diretor, criativo, marceneiro, veterano, tiozao, barista, durao, barao | feito |
| `cavanhaque` | Bigode e cavanhaque no queixo (no diabinho, pontudo) | professor, paizao, diabinho | feito |
| `bigode` | Bigode fino acima do lábio | vendedor | feito |
| `bigodao` | Bigode grosso e farto caindo pelos cantos da boca (ref. 5) | vovo-bigode, ranzinza | feito |
| `longa` | Barba longa de mago, até o peito (passa por cima da roupa) | vovo-inverno, mago | feito |

### Chapéus e enfeites — `chapeu` e `costas` (o capuz também em `cabecaAtras`)

Cor: `extraOu(q, padrão)`.

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `fedora` | Chapéu de feltro com aba e fita mais escura, copa com vinco (ref. 6) | detetive | feito |
| `cartola` | Cartola alta de showman, aba estreita, fita | dancarino | feito |
| `bone` | Boné com aba para a frente, levemente de lado (ref. 14) | skatista, barista, descolada | feito |
| `gorro` | Gorro de lã com dobra | fotografo, vovo-inverno, guaxinim, aventureira | feito |
| `boina` | Boina caída de lado | artista, soldada | feito |
| `capuz` | Capuz levantado cobrindo o cabelo, o rosto aparece na abertura; de costas cobre a cabeça | cacador, mascarado, mascarada | feito |
| `laco` | Laço grande de tecido no alto, com as pontas caindo (ref. 15) | estilosa | feito |
| `tiara` | Tiara fina dourada com uma pedrinha na testa | elfa | feito |
| `fone` | Fone grande: arco por cima da cabeça e conchas nas orelhas (cor de destaque nas conchas) | dj, programadora | feito |
| `bandana` | Faixa amarrada na testa com as pontas soltas atrás | ninja, guerreira | feito |
| `chapeuMago` | Chapéu pontudo de aba larga, ponta caída; estrelinhas no do mago | mago, feiticeira | feito |
| `aureola` | Anel dourado flutuando acima da cabeça, sobe e desce de leve com `q.t` | anjo | feito |
| `abaLarga` | Chapéu de abas largas (tipo panamá): aba bem larga (até x ±15), copa com vinco e fita mais escura; cor de destaque (ref. 48) | barao | feito |
| `chapeuPalha` | Chapéu de palha cônico, baixo e bem largo (aba até x ±15), raios da trama e cordão no queixo; cor de destaque. Sem símbolo (ref. 32) | samurai, espadachim | feito |
| `lencoCabeca` | Lenço de seda cobrindo o alto e os lados da cabeça, amarrado embaixo do queixo com nó e pontas soltas; barrado na cor de destaque e miolo claro com estampinha. Na dálmata, as orelhas caídas saem por baixo (ref. 35) | dalmata | feito |
| `chapeuFlor` | Chapéu de copa baixa com aba curta virada e uma flor de lado; sem cor de destaque, na cor da roupa (`extraOu(q, q.roupa)`) (ref. 49) | dama | feito |

### Óculos — `oculos`

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `redondo` | Armação fina dourada, redonda e grande (ref. 7) | cientista, vovo-sorriso, analista, coelha | feito |
| `meiaLua` | Óculos de leitura meia-lua, mais baixos, na ponta do nariz | professor, vovo | feito |
| `gatinho` | Armação gatinho com as pontas de cima levantadas | doutora, gata | feito |
| `aviador` | Lentes em gota, armação fina metálica, lente escura | vovo-inverno, cacador | feito |
| `solQuadrado` | Escuros grandes e quadrados, armação grossa (ref. 14) | skatista | feito |
| `visor` | Faixa futurista de um lado a outro, translúcida, na cor de destaque | androide | feito |
| `tartaruga` | Armação grossa arredondada em tartaruga (marrom com pintinhas mais escuras), lente clara (ref. 39) | curadora | feito |
| `lenteColorida` | Formato aviador grande, armação e lente translúcida na cor de destaque (laranja na dálmata) (ref. 35) | dalmata | feito |
| `solRedondo` | Redondo pequeno de lente escura, armação dourada fina (ref. 54) | lobo | feito |

### Expressões — `rosto` (troca o rosto padrão)

Mantêm bochecha, nariz e, nela, cílios e batom. `sorriso` é o rosto de sempre (fica em `avatar.ts`).
Valem também para o rosto de bicho.

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `sorrisoFechado` | Sorriso de boca fechada (só a curva) | contador, minimalista, cientista, veterano, vovo-inverno, tiozao, barista, calouro, mago, urso, golden, analista, doutora, anfitria, romantica, descolada, elfa, panda | feito |
| `confiante` | Meio sorriso de lado e uma sobrancelha levantada | detetive, piloto, diretor, arquiteto, lutador, gala, colosso, vampiro, heroi, guaxinim, lobo, diretora-criativa, consultora, ceo, roqueira, professora, jogadora, heroina, vampira, dalmata | feito |
| `piscada` | Um olho fechado (arco) e sorriso aberto | dancarino, vendedor, diabinho, social-media, feiticeira, gata | feito |
| `serio` | Boca reta curta, sobrancelhas retas e baixas | vovo-bigode, skatista, ranzinza, durao, brutamontes, ninja, cacador, mascarado, samurai, tigre, advogada, soldada, dama, guerreira, mascarada, espadachim | feito |
| `bravo` | Sobrancelhas em V e dentes cerrados (ref. 12), engraçado e não assustador | ogro | feito |
| `sonhador` | Olhos fechados em arco feliz e sorriso doce | anjo | feito |

### Detalhes da cabeça

| id | Gancho | Como é | Quem usa | Situação |
|---|---|---|---|---|
| `sardas` | `sobreORosto` | Pontinhos sobre o nariz e as bochechas | analista, romantica, ruivinha | feito |
| `argolas` | `orelhas` | Brincos de argola dourados (troca a bolinha dela) | executiva, diretora-criativa, gerente, consultora, ceo, dancarina, romantica, recepcionista | feito |
| `mascara` | `sobreORosto` | Máscara de herói tipo dominó nos olhos, cor de destaque | heroi, heroina | feito |
| `mascaraNinja` | `sobreORosto` e `costas` | Pano cobrindo do nariz para baixo (cor da roupa); de costas, o nó | ninja, samurai, guerreira | feito |
| `orelhaPontuda` | `orelhas` | Orelhas pontudas para cima e para fora | brutamontes, vampiro, elfa | feito |
| `chifres` | `chapeu` e `costas` | Dois chifrinhos curvos no alto da testa | diabinho | feito |
| `antenas` | `chapeu` e `costas` | Duas antenas finas com bolinha na ponta, balançando com `q.t` | robo, alienigena, androide, marciana | feito |
| `caninos` | `sobreORosto` | Dois caninos brancos e pontudos no sorriso | vampiro, vampira | feito |
| `presas` | `sobreORosto` | Duas presas de baixo para cima saindo da boca | ogro, troll | feito |
| `olhosBrilhando` | `rosto` | Olhos grandes e claros que brilham (troca os olhos) | alienigena, marciana | feito |
| `cabecaRobo` | `formaDaCabeca`, `rosto`, `orelhas` | Cabeça quadrada de cantos arredondados, metálica, visor de luz no lugar dos olhos, parafusos no lugar das orelhas | robo | feito |
| `piercing` | `sobreORosto` | Argolinha dourada na asa do nariz (ref. 43) | redator | feito |
| `mascaraInteira` | `rosto` (devolve true, sem rosto), `cabeloFrente` (vem depois do cabelo original para cobri-lo), `orelhas` (pescoço e orelhas de tecido), `costas` | Máscara de tecido cobrindo a cabeça inteira (azul-marinho #1f2a44), dois olhos grandes brancos em gota com contorno grosso na cor de destaque; sem boca, teia, aranha nem símbolo. De costas, a nuca coberta; com capuz, o capuz vem por cima (ref. 31) | mascarado, mascarada | feito |

### Cabeças de bicho — `orelhas`, `formaDaCabeca`, `rosto`, `costas` (ver "Bichos de roupa")

Desenhe por forma: `urso` (urso, panda), `cachorro` (cachorro, dálmata), `felino` (tigre, gato),
`lobo`, `guaxinim`, `macaco` e `coelho`. As cores vêm de `q.bicho`.

| id | Nome | Forma | Como é | Pelo / claro / escuro / mão | Quem usa | Situação |
|---|---|---|---|---|---|---|
| `urso` | Urso | urso | Forma **urso**: cabeça redonda, um pouco mais larga nas bochechas; duas orelhas redondas no alto (≈ x ±6,5, y -49) com o dentro claro; focinho oval claro saindo para a frente (+x), nariz escuro arredondado e boca em "w" (ref. 28) | `#8a5530` / `#d8b48a` / `#2a1d16` / `#5e3a22` | urso | feito |
| `panda` | Panda | urso | Forma **urso** com as cores do panda: rosto branco, orelhas escuras e uma mancha escura em gota em volta de cada olho (o olho com brilho por cima) (ref. 29) | `#f3f1ec` / `#ffffff` / `#25272e` / `#25272e` | panda | feito |
| `guaxinim` | Guaxinim | guaxinim | Forma **guaxinim**: orelhas pontudas arredondadas de borda clara, máscara escura em faixa nos olhos com borda clara em cima, focinho fino claro e nariz escuro (ref. 30). Com o gorro, as orelhas saem por cima dele | `#8e8580` / `#f1ece4` / `#3a302b` / `#4a3d36` | guaxinim | feito |
| `tigre` | Tigre | felino | Forma **felino**: orelhas triangulares no alto com o dentro claro, focinho claro pequeno, nariz rosado em triângulo, bigodinhos (3 traços de cada lado). O tigre tem listras escuras na testa e nas bochechas, tufos claros nas bochechas e a cabeça um pouco mais larga (ref. 33) | `#e8862a` / `#f7f0e4` / `#1f1a17` / `#e8862a` | tigre | feito |
| `gato` | Gato | felino | Forma **felino** liso, sem listras, olhos amendoados (versão dela); com os óculos gatinho (arquétipo) | `#8d94a3` / `#f1f1f4` / `#3a3f4a` / `#8d94a3` | gata | feito |
| `cachorro` | Cachorro dourado | cachorro | Forma **cachorro**: orelhas compridas caídas dos lados da cabeça (até y ≈ -33, por cima da cabeça: desenhe em `sobreORosto` e `costas`), focinho comprido claro para a frente, nariz grande escuro (ref. 34) | `#d8a257` / `#f1d7a8` / `#2b211b` / `#d8a257` | golden | feito |
| `dalmata` | Dálmata | cachorro | Forma **cachorro**, branca, orelha mais fina, 4 a 6 pintas escuras irregulares na cabeça e nas orelhas (ref. 35). As orelhas saem por baixo do lenço | `#f6f4ef` / `#ffffff` / `#1f2230` / `#f6f4ef` | dalmata | feito |
| `lobo` | Lobo azul | lobo | Forma **lobo**: orelhas grandes e pontudas para cima (até y ≈ -58), focinho comprido e fino para a frente, nariz escuro, máscara clara do focinho ao pescoço, tufos de pelo nas bochechas (ref. 54) | `#5b7fd1` / `#dde6f7` / `#232a3d` / `#4b6cbc` | lobo | feito |
| `macaco` | Macaco | macaco | Forma **macaco**: orelhas grandes e redondas dos lados (na altura dos olhos), rosto claro em forma de coração do olho ao queixo, topete de pelo arrepiado no alto (ref. 55) | `#6f5a33` / `#e6c4a0` / `#2e2416` / `#b98a66` | macaco | feito |
| `coelho` | Coelho | coelho | Forma **coelho**: duas orelhas longas para cima (até y ≈ -62, o teto) com o dentro rosado, focinho pequeno, nariz rosado em Y e dois dentinhos (arquétipo) | `#f2ece6` / `#ffffff` / `#e48fa4` / `#f2ece6` | coelha | feito |

## Peças do pintor do CORPO (`avatar-corpo.ts`)

### Situação: tudo desenhado

As duas rodadas estão prontas, com frente, costas, versão dele e dela, manga própria e barra comprida
quando a roupa pede. As saias lápis, evasê e rodada também saem nele (nenhum personagem usa). Nenhuma
peça de corpo passa de 56 px de altura nem de ±14 px de largura.

Decisões do pintor do corpo (o pedido não dizia):

- **Casaco longo dela:** com a parte de baixo "auto", a perna sai de meia-calça.
- **Haori:** a barra vai até o joelho, aberta, com a hakama aparecendo no meio.
- **Tricô dela:** termina na cintura, para a jardineira ficar por cima.
- **Gola da jaqueta do urso:** caramelo, para não sumir no suéter claro; a do casacão é creme.
- **Mochila:** sempre escura (não usa a cor de destaque).
- **Calção:** quando a faixa lateral tem a mesma cor do calção, ela sai branca (a da jogadora, toda
  azul-marinho, aparece por isso).
- **Banana e caneta:** apontam para fora do braço, senão o braço as cobriria.
- **Professora:** o crachá fica em parte atrás do braço que ergue a caneta.
- **Braços cruzados:** dois braços de verdade, na manga de cada roupa, com a pata do bicho, as listras
  do tigre e o relógio; de costas, só aparecem os braços.

### Portes — `medidas`, `tronco`, `braco`, `pernas`

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `magro` | Tronco ~2 px mais estreito, braço e perna mais finos | cientista, estagiario, calouro, alienigena, corredora | feito |
| `gordinho` | Barriga redonda que passa da linha do tronco, ombro arredondado, perna mais grossa (ref. 4) | contador, veterano, tiozao, paizao | feito |
| `forte` | Ombro largo (`ombroX` ~8,6), peito em V, braço grosso | vovo-bigode, diretor, atleta, lutador, gala, brutamontes, heroi, urso, tigre | feito |
| `gigante` | O maior: ombro ~10, tronco mais alto (`ergue` 2 a 3), mão grande, perna grossa e curta (refs. 12 e 13); versão dela com cintura | ogro, colosso, troll | feito |
| `baixinho` | Tronco e perna mais curtos (`ergue` -2 a -3), cabeça igual | skatista, macaco, estudante, ruivinha | feito |

### Roupas — `roupa` (e `tronco`, `braco`, `acabamento`, `parteDeBaixo` quando precisa)

| id | Como é | Versões | Quem usa | Situação |
|---|---|---|---|---|
| `ternoColete` | Terno com colete à mostra (tom mais escuro, botõezinhos), camisa clara, gravata (ref. 4) | M | contador, barao | feito |
| `smoking` | Paletó com lapela de cetim brilhante, camisa branca, gravata-borboleta | M | dancarino, vampiro | feito |
| `sobretudo` | Casaco comprido aberto até o joelho, lapela larga, camisa e gravata por dentro (ref. 5); a barra sai em `parteDeBaixo` | M | vovo-bigode, cacador, golden | feito |
| `trench` | Capa de chuva trespassada, botões em fileira dupla, cinto com fivela, ombreira (ref. 6), até o joelho | M | detetive | feito |
| `camisaDobrada` | Camisa de botão com gola, manga dobrada no cotovelo (antebraço de pele), por dentro da calça; nela, decote em V | M, F | vendedor, redator, analista, gerente, consultora | feito |
| `blazerVestido` | Blazer curto aberto sobre vestido longo (o vestido é `q.corBaixo`) (ref. 3) | F | diretora-criativa | feito |
| `blusaAmpla` | Gola alta, mangas largas até o cotovelo, cinto fino na cintura (ref. 2) | F | executiva, gata | feito |
| `jaleco` | Jaleco branco comprido até a coxa, aberto, bolso com caneta, roupa escura por baixo | M, F | cientista, doutora | feito |
| `golaAlta` | Suéter fino de gola alta, liso | M | minimalista | feito |
| `sueter` | Suéter de tricô com a gola da camisa aparecendo, punho e barra canelados | M, F | professor, conselheiro, vovo | feito |
| `bomber` | Bomber com ribana no punho e na barra, faixa na manga na cor de destaque, camiseta branca (ref. 14) | M, F | skatista, empolgado, mascarado, mascarada | feito |
| `jaquetaCouro` | Jaqueta de couro aberta, gola larga, zíper, camiseta clara por dentro, brilho no couro | M, F | roqueiro, roqueira | feito |
| `jaquetaCurta` | Jaqueta curta de cotelê com botões duplos, top branco por dentro (ref. 15) | F | estilosa | feito |
| `regata` | Regata cavada (braço todo de pele) | M, F | atleta, lutador, descolada, troll | feito |
| `top` | Top esportivo curto, barriga de pele | F | corredora, dancarina | feito |
| `macacao` | Macacão inteiro (tronco e pernas da mesma cor), faixas na cor de destaque no ombro e na lateral, gola alta e zíper; sem logo nem número | M | piloto, alienigena | feito |
| `semCamisa` | Peito nu (pinte o recorte com `q.pele`), peitoral e abdômen em traços leves | M | ogro, brutamontes, macaco | feito |
| `uniformeHeroi` | Collant colado, cinto e emblema ORIGINAL no peito (raio ou estrela num losango) na cor de destaque | M, F | heroi, heroina | feito |
| `quimono` | Quimono transpassado com faixa escura na cintura, calça larga da mesma cor | M, F | ninja, guerreira | feito |
| `tunica` | Túnica longa até o pé, mangas largas, cinto de corda, estrelinhas; a barra sai em `parteDeBaixo` | M, F | mago, feiticeira | feito |
| `robo` | Corpo de placas metálicas, painel no peito com 3 luzinhas (cor de destaque), juntas no ombro, braço de cano com anéis | M, F | robo, androide | feito |
| `vestidoEnvelope` | Vestido sem manga (braço de pele), justo em cima, saia drapeada transpassada em diagonal com fenda na frente, até o meio da canela; a saia sai em `parteDeBaixo` (ref. 37) | F | anfitria | feito |
| `blusaEnvelope` | Blusa transpassada curta (acaba na cintura), gola de camisa, decote em V, manga longa bufante com punho, laço com as pontas caindo na cintura (ref. 38) | F | romantica | feito |
| `trenchCurto` | Trench curto até a cintura, aberto, lapela, cinto com fivela pendurado, tira no punho; por dentro, gola alta canelada marrom-escura (#5a3a2a) (ref. 39) | F | curadora | feito |
| `casacoLongo` | Casaco de lã comprido (até abaixo do joelho), trespassado com duas fileiras de botões grandes escuros, gola redonda sem lapela; a barra sai em `parteDeBaixo` (ref. 49) | F | dama | feito |
| `camisaCurta` | Camisa de botão de manga curta (a manga acaba no meio do braço, antebraço de pele), gola, botõezinhos, bolso no peito, por dentro da calça com cinto de couro (refs. 22, 23 e 27) | M | arquiteto, ranzinza, gala | feito |
| `xadrezAberta` | Camisa xadrez (na cor da roupa) aberta e solta por fora, manga dobrada no cotovelo, camiseta clara em V por dentro (ref. 36) | M | tiozao | feito |
| `camisaListrada` | Camisa de manga curta com listras verticais finas claras, aberta por fora sobre camiseta branca (ref. 41) | M | barista | feito |
| `jaquetaCapuz` | Jaqueta curta (até o quadril) aberta, capuz caído atrás do pescoço, bolsos de lapela no peito, ribana no punho e na barra; por dentro, camisa xadrez na cor de destaque. De costas, o capuz (ref. 20) | M, F | marceneiro, marceneira | feito |
| `jaquetaPelucia` | Jaqueta de sarja aberta, gola larga de pelúcia creme (borda em bolinhas), bolsos de lapela com botão, suéter claro com zíper por dentro (ref. 28) | M | urso | feito |
| `puffer` | Jaqueta acolchoada em gomos horizontais (3 ou 4, lados ondulados), gola alta e capuz caído atrás, aberta sobre suéter branco; a manga também em gomos (ref. 42) | M, F | durao, aventureira | feito |
| `casacoPele` | Casacão até o joelho com gola larga, punhos e barra de pelúcia creme, bolsos grandes, aberto sobre camisa clara; a barra sai em `parteDeBaixo`. Sem as marcas e escritas da ref. 25 | M | vovo-inverno | feito |
| `cardiga` | Cardigã de tricô abotoado em V, punho e barra canelados, bolsinhos, gola da camisa clara aparecendo (vovô genérico da ref. 50) | M, F | vovo-sorriso, coelha | feito |
| `colete` | Colete de tricô em V sem manga (barra e cava caneladas) sobre camisa clara de manga longa com gola e punho: o braço é a manga clara (ref. 52) | M | calouro | feito |
| `trico` | Suéter de tricô grosso e largo, gola redonda canelada, tranças do tricô (riscos em V) no corpo e na manga (ref. 53) | F | ruivinha | feito |
| `camisaFutebol` | Camisa de time de manga curta com 2 ou 3 listras verticais largas (cor da roupa e branco), gola redonda e punho na cor de destaque; sem escudo, número, estrela nem marca (ref. 51) | M, F | boleiro, jogadora | feito |
| `camuflado` | Farda de manga longa camuflada (manchas em 3 tons: a cor da roupa, `tom` 0,76 e 1,3), dois bolsos no peito, cinto tático escuro; com `baixo` "auto", a calça é cargo camuflada da farda (como no macacão). Sem bandeira, nome nem insígnia (ref. 47) | F | soldada | feito |
| `haori` | Casaco de samurai de mangas largas e quadradas (caem abaixo do pulso), aberto sobre quimono escuro, ombreira de placas, faixa de corda trançada na cintura; com `baixo` "auto", hakama. Sem símbolo (ref. 32) | M, F | samurai, espadachim | feito |

### Partes de baixo — `pernas` e `parteDeBaixo`, na cor `q.corBaixo`

`calcaSocial`, `jeans`, `saiaLapis`, `saiaEvase` e `saiaRodada` já saem no padrão (as saias nele são
bônus). As novas, até ficarem prontas, saem como calça reta (ou saia rodada, nela) na cor escolhida.

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `pantalona` | Cintura alta, perna larga abrindo até o pé, quase cobre o sapato | analista, estilosa, gerente | feito |
| `cargo` | Larga, bolsos laterais na coxa, barra franzida no tornozelo | skatista, fotografo, vovo-inverno, lutador, colosso, guaxinim, aventureira, panda | feito |
| `legging` | Colada à perna, perna fina, sem dobra | robo, heroi, corredora, heroina, androide, mascarada | feito |
| `bufante` | Bem larga e bufante, presa no tornozelo (ref. 11) | brutamontes | feito |
| `bermuda` | Até o joelho, canela de pele | atleta, tiozao, mascarado, macaco | feito |
| `bermudaRasgada` | Barra rasgada em zigue-zague, cordão na cintura | ogro, troll | feito |
| `saiaMidi` | Rodada até o meio da canela, botões na frente e fenda (ref. 2) | executiva, vovo | feito |
| `saiaLonga` | Até o tornozelo, barra levemente rodada | diretora-criativa, elfa, anjo | feito |
| `jeansRasgado` | Jeans (na cor da parte de baixo) com rasgos claros no joelho e na coxa (fiapos brancos e pele aparecendo), barra dobrada (ref. 18) | empolgado | feito |
| `calcaMoletom` | Calça de moletom larga e caída, cós de elástico com cordão, punho no tornozelo; sem número nem escrita (ref. 24) | veterano | feito |
| `calcaLarga` | Perna larga e reta até o chão (quase cobre o tênis), cintura alta, barra dobrada (refs. 39, 40 e 41) | barista, curadora, descolada, gata | feito |
| `saiaFlorida` | Saia longa rodada até o tornozelo com estampa de florzinhas claras (5 a 8, `tom` 1,4) sobre a cor; a barra balança andando (ref. 38) | romantica | feito |
| `calcao` | Calção curto de futebol (acaba acima do joelho), faixa lateral na cor de destaque; a canela é de pele ou do meião da chuteira (ref. 51) | boleiro, jogadora | feito |
| `jardineira` | Jardineira: calça larga de barra dobrada (`pernas` e `parteDeBaixo`) e peitilho com bolso e duas alças com botão por cima da roupa (`acabamento`) (ref. 53) | ruivinha | feito |
| `hakama` | Calça larga plissada até o tornozelo, bem aberta embaixo, pregas verticais (ref. 32); é também a calça do haori com `baixo` "auto" | samurai, espadachim | feito |

### Sapatos — `sapato` (dele e dela; o bico aponta para +x)

| id | Como é | Quem usa | Situação |
|---|---|---|---|
| `nude` | Scarpin nude de bico fino | executiva, analista, romantica | feito |
| `sandalia` | Salto com tiras, pé de pele aparecendo | gerente, dancarina, anfitria, elfa, anjo | feito |
| `plataforma` | Salto plataforma branco com tira no tornozelo (ref. 3) | diretora-criativa, marciana | feito |
| `sapatilha` | Baixa e macia (tabi escura, de ninja) | ninja, samurai, guerreira, espadachim, coelha | feito |
| `tenisVermelho` | Cano alto vermelho, branco e preto, sola grossa branca, sem logo (refs. 13 e 14) | skatista, empolgado, vovo-inverno, colosso | feito |
| `botaAlta` | Cano alto até o joelho (de herói), cor de destaque ou escura | brutamontes, heroi, heroina | feito |
| `botaRobo` | Bota metálica quadrada com faixa de luz | robo, androide | feito |
| `descalco` | Pé grande de pele com três risquinhos de dedo | ogro, troll | feito |
| `chinelo` | Sandália masculina de couro: sola marrom e duas tiras largas sobre o pé de pele (ref. 23) | ranzinza | feito |
| `tenisGrosso` | Tênis de corrida robusto, sola alta ondulada bege, cabedal cinza com recortes bege; sem logo (ref. 24) | veterano | feito |
| `tenisLona` | Cano alto de lona preta, biqueira e sola grossa bege, cadarço claro; sem logo (refs. 41 e 46) | barista, paizao | feito |
| `tenisCor` | Tênis baixo branco com a lateral e o calcanhar na cor de destaque, sola branca; sem logo (refs. 26, 39, 40 e 53) | lutador, curadora, descolada, ruivinha, mascarada | feito |
| `coturno` | Coturno de cano médio de amarrar, sola tratorada escura, cor de areia (#c9a75a) (ref. 47) | soldada, aventureira | feito |
| `chuteira` | Chuteira com travinhas na sola e meião até o joelho na cor de destaque, por cima da canela (ref. 51) | boleiro, jogadora | feito |
| `socialBranco` | Sapato social branco de bico arredondado, sola bege (ref. 54) | lobo | feito |
| `patas` | Pata de bicho no lugar do sapato, na cor `q.bicho.mao`: arredondada, três risquinhos de dedo, garrinhas escuras no urso; sem bicho, pé descalço de pele (refs. 28 e 55) | urso, macaco | feito |

### Na mão — `naMao` (e `medidas.anguloMao` para erguer o braço)

Contexto no centro da mão da frente, sem o giro do braço (y para baixo: o que pendura, pendura).
`'atras'` sai antes do braço (a alça fica sob os dedos), `'frente'` depois.

| id | Como é | Braço | Quem usa | Situação |
|---|---|---|---|---|
| `maleta` | Maleta de couro com alça, pendurada, ~7 × 5 px (refs. 1 e 4), cor de destaque | solto | executivo, advogada | feito |
| `bolsa` | Bolsa de mão estruturada, alça curta (refs. 2 e 16), cor de destaque | solto | executiva, gerente, anfitria, romantica, dama | feito |
| `bolsaOmbro` | Bolsa meia-lua com alça de corrente dourada (ref. 3) | solto | diretora-criativa | feito |
| `notebook` | Notebook fechado, placa cinza fina | solto | contador, produtora, programadora | feito |
| `prancheta` | Prancheta com papel e prendedor | ~0,5 | cientista, doutora | feito |
| `livro` | Livro de capa colorida (grimório roxo na feiticeira) | solto | professor, artista, feiticeira, coelha | feito |
| `celular` | Celular de tela acesa | ergue ~0,9 | vendedor, estudante, social-media | feito |
| `cafe` | Copo de café com tampa (xícara na vovó) | ~0,7 | estagiario, barista, vovo | feito |
| `camera` | Câmera fotográfica com lente | ~0,6 | fotografo | feito |
| `lupa` | Lupa redonda com brilho na lente | ~0,9 | detetive | feito |
| `cachimbo` | Cachimbo na altura do peito, fumacinha que sobe com `q.t` (ref. 5) | ~1,0 | vovo-bigode | feito |
| `capacete` | Capacete de piloto (cor da roupa, faixa de destaque, viseira escura), sem logo (ref. 9) | solto | piloto | feito |
| `cajado` | Cajado de madeira até a altura da cabeça, pedra que brilha na ponta | solto | mago | feito |
| `bracosCruzados` | Braços cruzados na frente do peito: `braco` devolve true sem desenhar nos dois lados e `naMao(ctx, q, 'frente')` desenha os dois antebraços cruzados (manga e mão) na altura do peito; vale sentado também (refs. 23, 30 e 33) | ~1,2 (mão no peito) | ranzinza, guaxinim, tigre | feito |
| `banana` | Banana amarela curva com as pontas escuras, segurada pelo meio (ref. 55) | ~0,7 | macaco | feito |
| `cafeGelado` | Copo transparente alto com café gelado (marrom-claro), tampa e canudo (ref. 40) | ~0,8 | descolada | feito |
| `sacola` | Sacola grande retangular de alças longas, na cor de destaque; só em pé (ref. 39) | solto | curadora | feito |
| `caneta` | Caneta ou marcador escuro erguido entre os dedos (ref. 45) | ~1,1 | professora | feito |
| `raquete` | Raquete de pingue-pongue: cabo de madeira sob os dedos, borracha vermelha por cima; o braço vai e volta (`q.t`). Só em pé | ~0,85 ± 0,45 | nenhum personagem: o jogo põe na mão do agente que joga na pausa | feito |

### Detalhes do corpo

| id | Gancho | Como é | Quem usa | Situação |
|---|---|---|---|---|
| `relogio` | `braco` (lado 1) | Relógio no pulso da frente | atleta, arquiteto, ranzinza, gala, durao, redator, paizao, colosso, corredora, curadora, descolada, professora | feito |
| `pulseiras` | `braco` | Pulseiras ou munhequeiras no pulso | roqueiro, lutador, brutamontes, dancarina, anfitria | feito |
| `corrente` | `acabamento` | Corrente grossa prateada no pescoço com pingente | dj, lutador, colosso, guaxinim, roqueira | feito |
| `lenco` | `acabamento` | Lenço amarrado no pescoço (ref. 3) | diretora-criativa | feito |
| `luvas` | `braco` | Mão na cor da luva (escura) | vovo-inverno, cacador, mascarado, golden, dama | feito |
| `capa` | `atras` (de frente) e `acabamento` (de costas) | Capa presa nos ombros, cor de destaque, forro mais escuro; balança andando | vampiro, heroi, heroina, vampira | feito |
| `asas` | `atras` e `acabamento` (de costas) | Asas brancas de penas, batem devagar com `q.t` | anjo | feito |
| `cauda` | `atras` e `acabamento` (de costas) | Cauda fina de pele com ponta de seta | diabinho | feito |
| `aura` | `atras` | Brilho suave em volta do corpo (alfa até 0,3), pulsando com `q.t` | feiticeira | feito |
| `cracha` | `acabamento` | Cordão escuro descendo do pescoço em V e cartão branco liso (com uma faixinha de cor) no peito; sem escrita, foto nem logo (refs. 44 e 45) | recepcionista, professora | feito |
| `mochila` | `acabamento` (frente e costas) | De frente, as alças escuras sobre os ombros; de costas, a mochila inteira (bolso e zíper) (ref. 52) | calouro, aventureira | feito |
| `cachecol` | `acabamento` | Cachecol xadrez na cor de destaque enrolado no pescoço, as duas pontas caindo pela frente até a barriga (ref. 34) | golden | feito |
| `perolas` | `acabamento` | Colar de pérolas: 7 a 9 bolinhas brancas no colo (ref. 49) | dama | feito |
| `suspensorio` | `acabamento` | Alças de suspensório soltas, caindo dos lados da cintura até a coxa, na cor de destaque (ref. 26) | lutador | feito |
| `tatuagem` | `braco` | Traços escuros finos (alfa ~0,5) nos antebraços, sem desenho reconhecível; só aparece com manga curta, regata ou sem camisa (ref. 24) | veterano | feito |
| `espada` | `atras` e `acabamento` | Espada embainhada atravessada na cintura (sai atrás do quadril), bainha escura e cabo trançado com guarda; nunca fora da bainha (ref. 32) | samurai, espadachim | feito |
| `rabo` | `atras` (de frente) e `acabamento` (de costas) | Rabo do bicho (`q.bicho`): peludo com anéis escuros (guaxinim), fino listrado com ponta escura (tigre), cheio e peludo (lobo), longo e enrolado na ponta (macaco), fino em S (gato), pompom branco (coelho), curtinho e redondo (urso, panda), abanando (cachorro, dálmata). Balança com `Math.sin(q.fase)` andando. Sem bicho, nada (refs. 30, 54 e 55) | guaxinim, tigre, lobo, macaco, coelha, gata | feito |

### Bicho no corpo

| O quê | Gancho | Como é | Quem usa | Situação |
|---|---|---|---|---|
| Mão de bicho | `braco` | A mão vira pata na cor `q.bicho.mao`, um pouco maior, três risquinhos de dedo; luvas vencem a pata | todos os bichos | feito |
| Listras do tigre | `braco` | Duas ou três listras escuras (`q.bicho.escuro`) no antebraço à mostra | tigre | feito |
| Peito de pelo | `roupa` (`semCamisa`) | Peito e barriga de pelo (`q.pele`) com a barriga clara (`q.bicho.claro`) em oval, sem os traços de músculo | macaco | feito |

## Jeitos de andar

O desenho de cada um está em `passada()` (`avatar.ts`); a velocidade no mapa e a rapidez da passada
ficam em `ANDARES` (`aparencia.ts`) e o `jogo.ts` já aplica as duas. Nenhum jeito novo na segunda rodada.

| id | Como anda | Velocidade | Cadência | Quem usa |
|---|---|---|---|---|
| `normal` | O de sempre: passo médio, pulinho leve | 1 | 1 | executivo, minimalista, cientista, fotografo, arquiteto, barista, redator, cacador, diretora-criativa, gerente, programadora, curadora, recepcionista, professora, marceneira |
| `apressado` | Passo longo, pula mais, braço balança muito, corpo inclinado para a frente | 1,15 | 1,35 | piloto, atleta, estagiario, recrutador, boleiro, calouro, heroi, produtora, doutora, estudante, social-media, soldada, jogadora, aventureira, heroina |
| `gingado` | O corpo balança de um lado para o outro a cada passo | 1 | 0,9 | skatista, roqueiro, lutador, colosso, mascarado, guaxinim, consultora, artista, dancarina, descolada |
| `saltitante` | Pulo alto a cada passo | 1,05 | 1,15 | dj, criativo, empolgado, diabinho, macaco, estilosa, corredora, ruivinha, mascarada, coelha |
| `pesado` | Passo curto e firme, pouco pulo, corpo pende a cada pisada | 0,88 | 0,75 | vovo-bigode, ranzinza, vovo-inverno, durao, ogro, brutamontes, urso, roqueira, troll |
| `deslizante` | Os pés não saem do chão, o corpo vai meio para trás | 1 | 0,8 | dancarino, lobo, vampira |
| `flutuante` | Flutua 3 a 5 px acima do chão o tempo todo (parado também), pernas paradas, sombra menor | 0,95 | 0,6 | alienigena, feiticeira, marciana, anjo |
| `elegante` | Passo médio, pouco balanço de braço, quase sem pulo | 0,95 | 0,9 | diretor, vendedor, gala, barao, vampiro, samurai, golden, executiva, ceo, advogada, anfitria, elfa, espadachim, dalmata |
| `robotico` | Em degraus (a perna para em três posições), sem respirar parado | 0,92 | 1,1 | robo, androide |
| `furtivo` | Agachado, passo macio, inclinado para a frente | 0,92 | 0,85 | detetive, ninja, tigre, guerreira, gata |
| `tranquilo` | Passo curto e calmo | 0,88 | 0,8 | contador, professor, marceneiro, conselheiro, veterano, tiozao, paizao, vovo-sorriso, mago, analista, vovo, romantica, dama, panda |

## Integração (feita em 10/11/2026)

- **Meu Perfil (`EditorAvatar.svelte`, `routes/perfil/+page.svelte`):** escolhe o sexo e clica na
  cabecinha. As abas seguem `GRUPOS` (gente da firma, fantasia, heróis, bichos). A prévia mostra o
  personagem inteiro andando do jeito dele (dá para parar e virar de costas), com o grupo, o nome, a
  personalidade e o jeito de andar. Grava `paraGuardar(a)`, que dá `{"personagem": "<id>"}` (27 bytes;
  o banco aceita até 1 KB). Quem tinha avatar montado vê o dele em "Atual" até escolher um personagem.
  Os personagens que já são de algum agente (`dgathe_agentes_agora`) ganham o selo roxo do robô na
  cabecinha e a linha "Também é o agente ..." na prévia.
- **Cabecinha (`desenharCabecinha`):** o boneco de frente, recortado no círculo. Bicho de orelha que
  passa do círculo (a coelha, até 61,5) desce o que passa (até 2,4 px), para a ponta não sair cortada.
- **Alturas (`ALTO_*` em `avatar.ts`):** as da segunda rodada são as medidas pelo pintor da cabeça
  (o `chapeuPalha` subiu para 59,25 para cobrir o coque; o cachorro e a dálmata saíram da tabela, porque
  a orelha caída fica abaixo do padrão). Crachá, "z z z" e o clique sobem junto com quem passa de 56.
- **Jeito de andar (`jogo.ts`):** o meu boneco, as pessoas e os agentes andam com a velocidade e a
  cadência de `ANDARES`; o desenho da passada é o `passada()`. Sentado continua sentado.
- **Agentes no mapa (`jogo.ts`):** `definirAgentes` recebe também o `momento` da rotina (rotina.ts:
  posto, pausa com a atividade, reunião), que o `Escritorio.svelte` passa.
  - Crachá: "precisa de você" vale mais que tudo; em reunião, "em reunião"; com tarefa, o estado
    (trabalhando, na fila, esperando a equipe); sem tarefa, o momento ("no posto", "na pausa do
    café", "descansando", "dando uma volta", "jogando pingue-pongue"). O ponto tem a cor de
    `COR_DO_ESTADO` (cinza sem tarefa).
  - Texto do mouse: nome, cargo e o que faz (a atividade da tarefa, "Esperando a equipe: N
    subtarefas abertas", a atividade da pausa ou "no posto, esperando a próxima tarefa"). Não existe
    mais "livre, na copa".
  - Balão: os três pontinhos (trabalhando), o "!" laranja (precisa de você) e a **ampulheta** do líder
    esperando a equipe (a areia desce e ela vira a cada 2,4 s). Os balões ficam **logo acima do
    crachá**, do tamanho do zoom padrão: em cima da cabeça, o crachá (desenhado por último) cobria o
    balão. O espaço do balão entra na conta que separa os crachás de quem está colado.
  - Pingue-pongue: o agente parado na ponta da mesa, em pausa jogando, aparece com a `raquete` na mão
    e o braço indo e voltando.
- **Prévia temporária** (`src/routes/pagamentos/zz-prev-personagens/`): apagada no fim.
- **Agentes:** a aparência de cada um é `{"personagem": "<id>"}` em `dgathe_agentes.aparencia`. Para um
  agente novo não repetir ninguém, `sugerirPersonagem(sexo, idsEmUso, grupo?)` devolve o primeiro livre
  (com `grupo: 'bicho'`, um bicho).

### O personagem de cada agente

Escolhidos em 10/11/2026 pelo cargo e pela personalidade, gravados em `dgathe_agentes.aparencia` como
`{"personagem":"<id>"}` (o `ponte/agentes.mjs` nunca toca nessa coluna). O personagem não é a pessoa
famosa do nome do agente. A mistura ficou em 8 de gente da firma, 2 de fantasia, 2 heróis e 1 bicho.
Para trocar: `update dgathe_agentes set aparencia = '{"personagem":"<id>"}' where id = '<agente>'`.

| Agente | Cargo | Personagem | Por quê |
|---|---|---|---|
| Assessor | Sala do Bruno | `conselheiro` | escuta a história inteira antes de opinar |
| Assessora | Sala da Aline (desde 10/11/2026) | `analista` | observadora e calma: acha o detalhe que ninguém viu |
| Lewis | Gerente de Desenvolvimento e IA | `diretor` | fala pouco, escuta muito e decide com calma |
| Clovis | Analista de Sistemas | `detetive` | investiga o problema até achar a causa |
| Shakira | Designer UX/UI | `diretora-criativa` | ideia e referência visual |
| Steve | Desenvolvedor Full Stack | `skatista` | entrega antes do prazo, antenado no novo |
| Aoki | Engenheiro de IA | `robo` | o próprio agente de IA |
| BonJovi | Especialista em Automação | `roqueiro` | liga o som e resolve |
| Lowe | Engenheiro de Dados | `guaxinim` | acha qualquer dado perdido |
| Jackie | Analista de QA | `ninja` | silencioso e certeiro: acha o defeito |
| Smith | Engenheiro DevOps | `mago` | infraestrutura que parece mágica |
| Brad | Desenvolvedor Frontend | `dj` | trabalha no ritmo e anima a sala |
| Blade | Engenheiro de Segurança da Informação | `cacador` | vigia a noite toda |

Alternativas que também combinam: `barao` (Assessor), `curadora` (Shakira), `barista` (Steve),
`cientista` (Lowe), `tigre` (Jackie), `samurai` (Smith), `empolgado` (Brad), `mascarado` (Blade).

## Catálogo (101 personagens)

101 personagens: 56 masculinos e 45 femininos; 67 "gente da firma" (66%), 15 de fantasia, 9 heróis e 10 bichos de roupa. A fonte é `src/lib/dgathe/personagens.ts`; os testes (`personagens.test.ts`) garantem ids
únicos e estáveis, nenhum par igual, que toda peça usada existe no catálogo, que todo grupo tem
personagens nos dois sexos, que todo bicho é do grupo dos bichos e que nome e personalidade não citam
personagem com dono, pessoa famosa nem marca.

| id | Nome | Sexo | Grupo | Andar | Personalidade | Inspiração |
|---|---|---|---|---|---|---|
| `executivo` | Executivo | M | real | normal | Pontual e objetivo: chega com a pauta pronta e sai com o combinado fechado. | ref. 1 |
| `contador` | Contador | M | real | tranquilo | Gente boa e caprichoso: confere cada centavo duas vezes. | ref. 4 |
| `vovo-bigode` | Vovô Bigode | M | real | pesado | Rabugento só por fora: conta história boa e dá o melhor conselho da casa. | ref. 5 |
| `detetive` | Detetive | M | real | furtivo | Curioso e desconfiado: não larga um mistério antes de achar a causa. | ref. 6 |
| `dancarino` | Dançarino | M | real | deslizante | Showman nato: chega deslizando e sai aplaudido. | ref. 8 (showman de cartola) |
| `piloto` | Piloto | M | real | apressado | Competitivo e frio sob pressão: decide rápido e não erra a curva. | ref. 9 (piloto genérico, cores próprias) |
| `diretor` | Diretor | M | real | elegante | Fala pouco, escuta muito e decide com calma. | ref. 10 |
| `skatista` | Skatista | M | real | gingado | Antenado no que é novo: fala por gíria e entrega antes do prazo. | ref. 14 |
| `minimalista` | Minimalista | M | real | normal | Corta o excesso: menos botão, mais resultado. | arquétipo: o fundador minimalista |
| `dj` | DJ | M | real | saltitante | Trabalha no ritmo da playlist e levanta o astral de qualquer sala. | arquétipo: o DJ da festa |
| `roqueiro` | Roqueiro | M | real | gingado | Barulhento no bom sentido: liga o som e resolve o problema. | arquétipo: o roqueiro de jaqueta |
| `cientista` | Cientista | M | real | normal | Testa tudo antes de afirmar e adora um gráfico bem feito. | arquétipo: o cientista de jaleco |
| `professor` | Professor | M | real | tranquilo | Explica qualquer coisa com um exemplo e um café. | arquétipo: o professor de suéter |
| `atleta` | Atleta | M | real | apressado | Disciplina de treino: bate a meta e já pensa na próxima. | arquétipo: o atleta |
| `estagiario` | Estagiário | M | real | apressado | Chegou ontem e já quer ajudar em tudo (e trouxe café). | arquétipo: o estagiário animado |
| `vendedor` | Vendedor | M | real | elegante | Conversa com todo mundo e sempre tem um contato para indicar. | arquétipo: o vendedor boa-praça |
| `criativo` | Criativo | M | real | saltitante | Enche o quadro de ideia e sempre acha um jeito diferente de contar. | arquétipo: o criativo de coque |
| `fotografo` | Fotógrafo | M | real | normal | Enxerga a foto antes de todo mundo e não perde um bom ângulo. | arquétipo: o fotógrafo de rua |
| `empolgado` | Empolgado | M | real | saltitante | Comemora cada entrega como gol de final: a energia dele contagia o andar inteiro. | ref. 18 (tênis sem marca) |
| `recrutador` | Recrutador | M | real | apressado | Aponta o talento de longe: sabe quem combina com cada vaga antes da entrevista. | ref. 19 |
| `marceneiro` | Marceneiro | M | real | tranquilo | Mão na massa: conserta, monta e ainda explica como fez. | ref. 20 |
| `conselheiro` | Conselheiro | M | real | tranquilo | Escuta a história inteira antes de opinar; o conselho dele vale ouro. | ref. 21 |
| `arquiteto` | Arquiteto | M | real | normal | Desenha a solução no guardanapo antes de o problema terminar de ser explicado. | ref. 22 |
| `ranzinza` | Ranzinza | M | real | pesado | Desconfia de toda ideia nova, mas quando aprova, defende até o fim. | ref. 23 |
| `veterano` | Veterano | M | real | tranquilo | Programa desde a internet discada: resolve sem pressa e sem drama. | ref. 24 (sem a estampa e o número) |
| `vovo-inverno` | Vovô Inverno | M | real | pesado | Rodou o mundo de mochila e sempre volta com uma história e um atalho novo. | ref. 25 (sem as marcas) |
| `lutador` | Lutador | M | real | gingado | Treina antes do expediente e encara cada bug como adversário de luta. | ref. 26 (cara própria, sem a marca) |
| `gala` | Galã | M | real | elegante | Charme tranquilo: cumprimenta todo mundo pelo nome e fecha a venda. | ref. 27 |
| `tiozao` | Tiozão | M | real | tranquilo | Faz o churrasco da firma e sabe o nome do filho de todo mundo. | ref. 36 |
| `barista` | Barista | M | real | normal | Acha que todo problema se resolve com um bom café e quase sempre tem razão. | ref. 41 |
| `durao` | Durão | M | real | pesado | Cara de poucos amigos e coração mole: é quem fica até tarde ajudando. | ref. 42 (sem as marcas) |
| `redator` | Redator | M | real | normal | Acha a palavra certa para tudo e ainda corta metade do texto. | ref. 43 |
| `paizao` | Paizão | M | real | tranquilo | Acena para todo mundo no corredor e sempre tem um lanche na gaveta. | ref. 46 |
| `barao` | Barão | M | real | elegante | Fala devagar, negocia melhor ainda e não perde a elegância nem no calor. | ref. 48 |
| `vovo-sorriso` | Vovô Sorriso | M | real | tranquilo | Recebe todo mundo com um aceno e uma bala no bolso; ninguém sai triste da sala. | ref. 50 (vovô genérico, de cardigã) |
| `boleiro` | Boleiro | M | real | apressado | Joga em equipe até no escritório: passa a bola, cobra o gol e comemora junto. | ref. 51 (jogador genérico, listras de cores próprias) |
| `calouro` | Calouro | M | real | apressado | Primeiro dia todo dia: anota tudo, pergunta tudo e aprende rápido. | ref. 52 |
| `ogro` | Ogro | M | fantasia | pesado | Cara de bravo, coração mole: é o primeiro a ajudar a carregar peso. | ref. 12 (gigante verde, original) |
| `colosso` | Colosso | M | fantasia | gingado | Estilo de sobra e paciência de monge. | ref. 13 (gigante de jaqueta jeans, original) |
| `brutamontes` | Brutamontes | M | fantasia | pesado | Quieto e leal: come por três e protege a turma inteira. | ref. 11 (gigante rosa, original) |
| `robo` | Robô | M | fantasia | robotico | Literal, preciso e educadíssimo: "Tarefa recebida. Processando." | arquétipo: robô de escritório |
| `alienigena` | Alienígena | M | fantasia | flutuante | Veio de longe estudar os humanos e anota tudo num caderninho. | arquétipo: visitante espacial |
| `vampiro` | Vampiro | M | fantasia | elegante | Elegante e noturno: só rende depois do pôr do sol. | arquétipo: vampiro clássico |
| `mago` | Mago | M | fantasia | tranquilo | Sábio e misterioso: sempre tem uma solução na manga. | arquétipo: mago de barba longa |
| `diabinho` | Diabinho | M | fantasia | saltitante | Provocador simpático: sempre pergunta "e se a gente arriscar?". | arquétipo: diabinho de desenho |
| `heroi` | Herói | M | herói | apressado | Chega voando quando o prazo aperta e salva a entrega. | arquétipo: super-herói de capa (cores e emblema próprios) |
| `ninja` | Ninja | M | herói | furtivo | Silencioso e certeiro: quando você percebe, já terminou. | arquétipo: ninja |
| `cacador` | Caçador noturno | M | herói | normal | Vigia a noite toda: nada passa sem ele ver. | arquétipo: vigilante de capuz |
| `mascarado` | Mascarado | M | herói | gingado | Ninguém sabe quem é, mas o problema some quando ele passa. | ref. 31 (herói nosso: máscara e cores próprias, sem teia nem aranha) |
| `samurai` | Samurai | M | herói | elegante | Disciplina antes de tudo: termina o que começa e não deixa ponta solta. | ref. 32 (sem máscara de aranha nem símbolo) |
| `urso` | Urso | M | bicho | pesado | Abraço de urso e paciência de hibernação: nunca perde a calma. | ref. 28 |
| `guaxinim` | Guaxinim | M | bicho | gingado | Acha qualquer arquivo perdido no servidor (e uns que ninguém sabia que existiam). | ref. 30 (sem a marca do tênis) |
| `tigre` | Tigre | M | bicho | furtivo | Fala pouco e encara o problema de frente; quando ataca, resolve. | ref. 33 |
| `golden` | Golden | M | bicho | elegante | Leal e educado: lembra do aniversário de todo mundo e nunca se atrasa. | ref. 34 |
| `lobo` | Lobo | M | bicho | deslizante | Malandro charmoso: negocia qualquer prazo com um sorriso de canto. | ref. 54 |
| `macaco` | Macaco | M | bicho | saltitante | Brincalhão e esperto: vira a reunião mais chata numa festa (e divide a banana). | ref. 55 |
| `executiva` | Executiva | F | real | elegante | Elegante e prática: resolve a reunião difícil sem perder o sorriso. | ref. 2 |
| `diretora-criativa` | Diretora criativa | F | real | normal | Cheia de ideia e de opinião: puxa o time para cima. | ref. 3 |
| `analista` | Analista | F | real | tranquilo | Observadora e calma: acha o detalhe que ninguém viu. | ref. 7 |
| `estilosa` | Estilosa | F | real | saltitante | Animada e cheia de referência: transforma qualquer briefing em moodboard. | ref. 15 |
| `gerente` | Gerente | F | real | normal | Organizada e gentil: a lista de tarefas está sempre em dia. | ref. 16 |
| `consultora` | Consultora | F | real | gingado | Segura e direta: entra na sala e todo mundo presta atenção. | ref. 17 |
| `produtora` | Produtora | F | real | apressado | Faz acontecer: cronograma na cabeça e três coisas ao mesmo tempo. | arquétipo: a produtora que faz acontecer |
| `vovo` | Vovó | F | real | tranquilo | Doce e afiada: lembra de tudo e não deixa ninguém sem lanche. | arquétipo: a vovó de óculos de leitura |
| `corredora` | Corredora | F | real | saltitante | Energia de manhã cedo: corre 5 km e ainda chega primeiro. | arquétipo: a corredora |
| `doutora` | Doutora | F | real | apressado | Calma na urgência: examina, explica e resolve. | arquétipo: a médica |
| `estudante` | Estudante | F | real | apressado | Curiosa sem fim: pergunta o porquê de tudo (e anota). | arquétipo: a estudante curiosa |
| `ceo` | CEO | F | real | elegante | Visão longa e passo firme: decide e assume. | arquétipo: a CEO de tailleur |
| `artista` | Artista | F | real | gingado | Vê cor em tudo: rabisca uma ideia antes da reunião acabar. | arquétipo: a artista de boina |
| `dancarina` | Dançarina | F | real | gingado | Contagiante: transforma até a planilha numa coreografia. | arquétipo: a dançarina |
| `roqueira` | Roqueira | F | real | pesado | Sincera até demais: aponta o problema e já traz o conserto. | arquétipo: a roqueira de franja |
| `social-media` | Social media | F | real | apressado | Sabe o que está bombando antes de todo mundo e já tem a legenda pronta. | arquétipo: a social media |
| `advogada` | Advogada | F | real | elegante | Firme e detalhista: lê as letras miúdas que todo mundo pula. | arquétipo: a advogada |
| `programadora` | Programadora | F | real | normal | Fone no ouvido e foco total: entrega código limpo e piada ruim. | arquétipo: a programadora de fone |
| `anfitria` | Anfitriã | F | real | elegante | Recebe cliente como visita em casa: ninguém sai sem café e sem solução. | ref. 37 |
| `romantica` | Romântica | F | real | tranquilo | Sonhadora com prazo: enfeita a apresentação e ainda entrega no horário. | ref. 38 |
| `curadora` | Curadora | F | real | normal | Sabe onde está cada arquivo e cada referência; organiza a bagunça com estilo. | ref. 39 (sem a marca do tênis) |
| `descolada` | Descolada | F | real | gingado | Chega com café gelado e playlist pronta; resolve tudo sem perder a leveza. | ref. 40 (boné e tênis sem marca) |
| `recepcionista` | Recepcionista | F | real | normal | Primeiro sorriso de quem chega: sabe quem é quem e onde fica cada coisa. | ref. 44 (crachá sem escrita nem logo) |
| `professora` | Professora | F | real | normal | Transforma assunto difícil em aula boa; ninguém sai da reunião com dúvida. | ref. 45 |
| `soldada` | Soldada | F | real | apressado | Missão dada é missão cumprida: organiza o time e não deixa ninguém para trás. | ref. 47 (sem bandeira, nome nem insígnia) |
| `dama` | Dama | F | real | tranquilo | Pontual e de opinião firme: quando ela aprova, está aprovado. | ref. 49 (senhora elegante genérica) |
| `ruivinha` | Ruivinha | F | real | saltitante | Curiosa e risonha: faz a pergunta que ninguém teve coragem de fazer. | ref. 53 |
| `jogadora` | Jogadora | F | real | apressado | Garra de final de campeonato: corre atrás de cada bola e de cada prazo. | ref. 51 (versão dela, listras de cores próprias) |
| `aventureira` | Aventureira | F | real | apressado | Topa qualquer desafio fora da rotina e volta com o problema resolvido. | refs. 25 e 42 (versão dela) |
| `marceneira` | Marceneira | F | real | normal | Faz, desmonta e refaz até ficar perfeito: capricho não se terceiriza. | ref. 20 (versão dela) |
| `heroina` | Heroína | F | herói | apressado | Corajosa e otimista: aparece na hora certa e ainda elogia o time. | arquétipo: super-heroína de capa (cores e emblema próprios) |
| `guerreira` | Guerreira | F | herói | furtivo | Focada e veloz: some na hora do almoço e volta com tudo pronto. | arquétipo: ninja |
| `feiticeira` | Feiticeira | F | fantasia | flutuante | Misteriosa e engraçada: resolve tudo com uma "poção" de planilha. | arquétipo: bruxa simpática |
| `vampira` | Vampira | F | fantasia | deslizante | Charmosa e noturna: tem as melhores ideias depois da meia-noite. | arquétipo: vampira clássica |
| `elfa` | Elfa | F | fantasia | elegante | Paciente e precisa: mira no detalhe e acerta de primeira. | arquétipo: elfa da floresta |
| `androide` | Androide | F | fantasia | robotico | Gentil e incansável: responde em milissegundos e nunca esquece um prazo. | arquétipo: androide |
| `marciana` | Marciana | F | fantasia | flutuante | Fascinada pela Terra: acha o café a melhor invenção humana. | arquétipo: visitante espacial |
| `troll` | Troll | F | fantasia | pesado | Grandona e risonha: o abraço quebra costela, mas vale a pena. | refs. 11 a 13 (gigante, versão dela) |
| `anjo` | Anjo | F | fantasia | flutuante | Paz em pessoa: acalma qualquer crise com uma frase. | arquétipo: anjo |
| `mascarada` | Mascarada | F | herói | saltitante | Aparece do nada quando o sistema cai e some antes de alguém agradecer. | ref. 31 (versão dela: máscara e cores próprias, sem teia nem aranha) |
| `espadachim` | Espadachim | F | herói | elegante | Calma de quem treinou mil vezes: um corte preciso e o problema acabou. | ref. 32 (versão dela, sem símbolo) |
| `panda` | Panda | F | bicho | tranquilo | Fofa e tranquila por fora, focada por dentro: termina tudo antes do lanche. | ref. 29 (sem a marca do tênis) |
| `dalmata` | Dálmata | F | bicho | elegante | Dita a moda da semana: aparece de lenço e óculos e todo mundo copia. | ref. 35 |
| `coelha` | Coelha | F | bicho | saltitante | Ouve tudo (as orelhas ajudam) e responde antes de você terminar a pergunta. | arquétipo: bicho de roupa (versão dela) |
| `gata` | Gata | F | bicho | furtivo | Independente e curiosa: some para pensar e volta com a ideia pronta. | arquétipo: bicho de roupa (versão dela) |

### Personagem novo

1. Uma ficha em `FICHAS` (`personagens.ts`): id novo (minúsculas e hífen, nunca reaproveitado), nome
   curto (até 18 letras, sem repetir dentro do sexo), sexo, grupo, andar, uma linha de personalidade, a
   inspiração e as peças que mudam do padrão. Em cada sexo, os reais vêm antes dos outros grupos.
2. Bicho de roupa: grupo `bicho`, `bicho: '<id>'` e `cabelo: 'careca'`. Bicho novo entra em `BICHOS`
   (`aparencia.ts`) com uma das formas que existem (ou uma forma nova, com a tabela do pintor da cabeça).
3. Peça que ainda não existe: entra na lista de `aparencia.ts` e na tabela do pintor aqui (o "quem usa"
   sai do catálogo).
4. `npm test -- src/lib/dgathe/personagens.test.ts` (acusa par igual e peça fora do catálogo).
