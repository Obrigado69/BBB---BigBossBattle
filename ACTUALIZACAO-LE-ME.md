# BBB — Atualização do jogo no GitHub Pages

Esta pasta combina o jogo recebido em `BBB-ultima-versao-2026-10-13.zip` com a infraestrutura PWA anterior.

## O que foi feito
- `index.html`: substituído pela nova versão do jogo, com os assets atualizados.
- Caminhos das imagens corrigidos para GitHub Pages (`assets/` relativo).
- Manifest PWA, ícones e service worker sem cache antiga preservados.
- `config.js`, `multiplayer.js`, `multiplayer.html` e schema Supabase preservados.
- Botão MULTIPLAYER abre `multiplayer.html` (lobby online protótipo anterior). O lobby de demonstração incorporado no jogo novo **não é multiplayer real**.
- Singleplayer do jogo novo mantido.

## Publicar
1. Faz backup da branch main / repositório antes de atualizar.
2. Extrai este ZIP; envia o CONTEÚDO da pasta para a raiz do repositório `BBB---BigBossBattle` na branch `main`.
3. Confirma em particular `index.html` e toda a pasta `assets/` (incluindo novas cartas e gráficos).
4. Faz Commit changes e aguarda o GitHub Pages terminar o deploy.
5. Abre o site no browser e na PWA após fechar/reabrir.

## Estado / limites
- Ainda não estão integradas as mecânicas finais do jogo com o servidor multiplayer. `multiplayer.html` continua com a batalha simplificada para teste.
- Não foi executado teste ponta-a-ponta com o teu Supabase e dois telemóveis.
- A atualização não altera nem migra a base de dados.
- O novo jogo usa armazenamento local; não está ainda sincronizado com a identidade multiplayer.
- O service worker não faz cache offline; a app requer internet para carregar.
- Antes de distribuir a amigos, valida em Android e iOS e faz testes de permissões do backend.
