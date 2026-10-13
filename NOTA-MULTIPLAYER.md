# Correção do ecrã Multiplayer

A versão anterior desviava o botão Multiplayer para `multiplayer.html`, o lobby antigo.

Esta correção restaura o percurso **Multiplayer → Código da Dungeon → Lobby personalizado** incluído no ZIP do Codex.

**ATENÇÃO:** o lobby personalizado presente no ZIP original é uma SIMULAÇÃO LOCAL. Não permite a entrada real de amigos noutro dispositivo. O ficheiro `multiplayer.html` continua no projeto e contém a demonstração online Supabase (interface antiga).

Para ter multiplayer REAL com os ecrãs novos, ainda é preciso integrar as ações de criar/entrar na sala e o estado do lobby personalizado com o serviço Supabase. Não confundas este patch visual com essa integração.

Publicação: extrair o ZIP, colocar os ficheiros na raiz da branch `main` e fazer commit. Se só quiseres corrigir a navegação, basta substituir `index.html`.
