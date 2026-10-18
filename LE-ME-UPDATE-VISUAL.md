# BBB — atualização visual V2 · 18/10/2026

Este pack parte de **BBB-BigBossBattle-Supabase-OTIMIZADO-2026-10-14** e aplica a disposição das 28 pranchetas do `BBB_V2.ai`, usando os novos recortes transparentes.

## Como atualizar

1. Extrai este ZIP.
2. Substitui os ficheiros do jogo no GitHub pelo conteúdo extraído, mantendo `index.html` na raiz. Inclui também `layout-data.js`, `layout-v2.js`, `layout-v2.css`, `assets/v2/` e `sw.js`.
3. Faz o commit e aguarda a atualização do GitHub Pages.
4. Fecha todas as janelas/instâncias antigas da PWA e volta a abrir. Se o navegador ainda mostrar o layout anterior, faz uma atualização completa da página.

**Não é necessário voltar a executar o SQL.** As migrações, o transporte multiplayer, a configuração pública Supabase e o manifesto fullscreen são os mesmos do último pack. As contas e personagens continuam a usar as mesmas chaves de armazenamento.

## O que mudou

- Posições, tamanhos, rotações, máscaras e pesos da fonte medidos diretamente no AI, em coordenadas 390 × 844.
- Menus, personagens, atributos, preparação, salas, combate, seleção de alvos, cartas físicas, D20, resultados e reconexão.
- Novos assets em WebP **sem perdas**, mantendo os pixels e a transparência dos PNGs fornecidos. O logótipo foi obtido da própria prancheta AI. Os ficheiros originais fornecidos não foram alterados.
- Fundo composto em camadas persistentes, com brilho, fogo e brasas. Mantidas as transições de ecrã, troca lateral de Boss, cartas, turnos, vida e D20.
- Vídeo do King Mantis mantido em loop, sem som, com reprodução inline e imagem de fallback. O elemento de vídeo é conservado nas atualizações do combate. Stone Golem e Queen Mothra mantêm as imagens e versões de derrota do último pack; não foram fornecidos novos vídeos para estes Bosses.
- Corrigida a margem herdada que reduzia a área útil dos ecrãs de arte. O conteúdo ocupa a viewport da PWA, mantendo a referência de posições do AI.

Os nomes, HP, cartas, estados READY, seleção e resultados são dados reais do jogo. Por isso, as ilustrações de referência com `NOME`, `123456` e barras vazias dão lugar aos valores da partida. Antes de entrar numa sala desconhecida, o Boss continua por identificar; não é mostrado um Boss inventado. Os diálogos aparecem sobre o ecrã onde a ação acontece.

## Verificação

- Comparados visualmente 28 estados com os PNGs de referência.
- 21 verificações de controlos reais: navegação, nome, atributos, troca de Boss, seleção de controlador, baralho físico, cura, D20, vídeo e viewport.
- 65 verificações de SQL, combate, autorização e persistência.
- Duas sessões Chrome isoladas: salas, READY, combate, Boss automático/humano, fallback, reconexão, username persistido, PWA offline e Singleplayer.
- Vídeo verificado: 40 s, 800 × 336, loop, muted, playsinline; continua a avançar depois de atualizar o ecrã.
- Layout verificado em 360 × 740, 390 × 844 e 430 × 932. Sem erros JavaScript nos testes.

Os testes online desta atualização foram locais, usando o SQL real com Auth/REST emulados. Não houve alterações nem publicação no Supabase/GitHub alojados. A instalação em dispositivos físicos e o comportamento específico do iOS/Android continuam a precisar de confirmação nesses dispositivos.

Para repetir os testes, a partir da raiz do pack: `npm install --prefix tests`, `npx --prefix tests playwright install chromium`, `node tests/test-combat.mjs`, `node tests/test-browser.mjs` e `node tests/test-layout-v2.mjs`.
