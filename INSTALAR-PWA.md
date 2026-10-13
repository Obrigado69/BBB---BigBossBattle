# BBB — instalar a PWA

1. Abre o repositório `BBB---BigBossBattle` no GitHub.
2. Faz upload do **conteúdo da pasta** deste ZIP para a raiz, substituindo os ficheiros existentes (não carregues o ZIP fechado).
3. Confirma o commit. Mantém Settings > Pages > `main` > `/(root)`.
4. Abre https://obrigado69.github.io/BBB---BigBossBattle/ depois de o GitHub Pages atualizar.
5. iPhone: Safari > Partilhar > Adicionar ao ecrã principal > Abrir como app (se disponível).
6. Android: Chrome > menu ⋮ > Instalar aplicação ou Adicionar ao ecrã principal.

## Atualizações
- Para alterar ficheiros, faz novo commit no GitHub. Páginas HTML têm prioridade de rede para obter versões recentes.
- A cache permite abrir algumas partes offline, **não** jogar multiplayer offline.
- Ao mudar o conjunto de ficheiros essenciais, altera `bbb-static-v1` no `sw.js` para nova versão (`bbb-static-v2`, etc.).
- A versão final do jogo do Codex pode substituir o `index.html`, mantendo manifest, icons, sw.js e rotas.
- O site e o modo multiplayer não foram publicados por mim; é necessário o upload e testes em dispositivos reais.
- `config.js` contém chave **pública** do Supabase; nunca publiques secret key ou service_role.
