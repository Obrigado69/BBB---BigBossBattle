# BBB — Atualização gráfica + PWA

Esta versão substitui o jogo principal pelo novo `BBB-jogo-atual-2026-10-13.zip`, mantendo os seus assets, regras, menus e ecrãs de multiplayer de demonstração.

## Implementado
- Novo layout e gráficos da versão Codex.
- Funcionamento em GitHub Pages (caminhos de assets relativos).
- Manifesto, ícones de instalação e service worker com carregamento pela rede.
- Ao carregar em BOSS FIGHT pela primeira vez neste dispositivo, surge um ecrã para introduzir o nome de conta. Fica guardado localmente e não volta a aparecer nas aberturas seguintes.
- Skills iniciais de personagem: 0; 25 HP, nível 1.

## Ainda NÃO está implementado
- O nome de conta NÃO está associado a um registo no Supabase: ainda é apenas uma preferência guardada localmente.
- A progressão das personagens continua local e NÃO está sincronizada entre dispositivos.
- Os ecrãs multiplayer deste novo layout continuam como simulação: não são salas reais entre dispositivos.
- `multiplayer.html` permanece como página de protótipo online legado e NÃO substitui a interface personalizada.

## Publicação
Extraia e carregue todos os ficheiros/pastas desta pasta na raiz da branch `main` do repositório GitHub Pages. O `index.html` tem de estar na raiz. Antes de publicar, faça backup do site anterior. Não publique ficheiros privados nem chaves Supabase secret/service_role. Verifique que `config.js` contém somente URL e chave pública.

Depois de publicar, reabra a PWA. A versão nova é obtida pela rede, sem instalar novamente.
