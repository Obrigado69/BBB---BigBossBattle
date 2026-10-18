# Integração BBB v2

Atualização visual de 18/10/2026: os ecrãs usam `layout-data.js`, `layout-v2.js`, `layout-v2.css` e `assets/v2/`, carregados depois do motor e do transporte originais. As coordenadas e a tipografia vêm do AI. Consulta primeiro `LE-ME-UPDATE-VISUAL.md`. Esta atualização não exige alterações SQL.

Os lobbies do `index.html` já usam Supabase através de `online.js`. O protótipo online antigo encaminha para o jogo integrado.

- A migração está em `supabase/multiplayer-v2.sql`; `supabase/schema.sql` é uma cópia do mesmo conteúdo.
- As tabelas do protótipo não são apagadas. As novas tabelas têm prefixo `bbb2_`.
- O motor Singleplayer e os recursos gráficos do ZIP original foram mantidos. Multiplayer usa regras equivalentes no PostgreSQL, sem confiar em snapshots enviados pelo cliente.
- O SDK Supabase 2.117.3 está incluído em `vendor/`, com licença, para evitar uma dependência de CDN durante o arranque.
- O manifesto e o service worker permitem instalação e Singleplayer offline, com caminhos relativos para GitHub Pages.

Instruções: `README-PUBLICAR.md`. Evidência e limites: `RELATORIO-TESTES.md`.
