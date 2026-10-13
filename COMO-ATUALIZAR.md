# BBB — PWA sem cache de ficheiros do jogo

Agora a PWA pede à rede os ficheiros do BBB em cada abertura. O Service Worker não guarda HTML, CSS, JavaScript ou imagens na Cache Storage e elimina as caches `bbb-*` antigas ao ativar.

## Publicar
1. Extrai o ZIP.
2. No GitHub `obrigado69/BBB---BigBossBattle`, substitui **sw.js**, **index.html** e **multiplayer.html** na raiz da branch `main`. Podes carregar a restante pasta também, mantendo a configuração `config.js` correta.
3. Faz commit e aguarda o GitHub Pages publicar.
4. Abre primeiro o BBB **no Chrome**, deixa a página carregar totalmente e depois fecha e reabre a PWA instalada. Se a PWA tiver ficado aberta desde a versão antiga, termina-a completamente. Em casos excecionais, a versão antiga poderá persistir até o Service Worker novo ativar.

## Compromissos
- **Internet obrigatória:** sem rede, os ficheiros do jogo podem não abrir. O multiplayer já depende de rede.
- A atualização não é push instantâneo: novas versões entram quando se faz uma nova navegação/abertura com rede; a página aberta não muda sozinha.
- Um combate já aberto não é recarregado à força, para evitar perder a partida.
- **Dados locais não são apagados**: não usamos `localStorage.clear()` nem eliminamos IndexedDB ou contas.
- A instalação PWA mantém-se, incluindo manifesto e ícones. A mudança de ícone em sistemas móveis pode demorar.
- O GitHub Pages pode demorar alguns minutos a publicar, mesmo depois do commit.
