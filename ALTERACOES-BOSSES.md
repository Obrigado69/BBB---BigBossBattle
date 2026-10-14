# Atualização de gráficos dos bosses — 14/10/2026

- King Mantis: vídeo apenas no painel de combate, autoplay muted loop playsinline. Mantém imagem na seleção, nos retratos/turnos e nos resultados.
- Boss 02: Stone Golem, WebP em todos os ecrãs; WebP Dead na vitória com transição suave.
- Boss 03: Queen Mothra, WebP em todos os ecrãs; WebP Dead na vitória com transição suave.
- IDs, HP, skills, lógica Supabase, autenticação e configuração preservados. Boss 04 permanece como estava.
- Novos ficheiros em assets/. Carregar todo o conteúdo do ZIP no alojamento existente, incluindo sw.js. O vídeo requer servir .mp4 como video/mp4 e suportar pedidos HTTP Range.
- Service worker atualizado para renovar o cache. WebP novos disponíveis offline; vídeo transmitido pela rede, com PNG de fallback.
- Não foi feita qualquer publicação nem alteração na base de dados live.

## Ficheiros otimizados
- Quatro imagens convertidas para WebP qualidade 88, 1600 × 900, mantendo proporção. Referências no index.html e sw.js atualizadas.
- Vídeo H.264, 800 × 336, 24 fps, 40 segundos, sem áudio, faststart; 1,27 MB.
- Os antigos stone-golem.png, stone-golem-dead.png, queen-mothra.png e queen-mothra-dead.png deixam de ser usados. Podem ser removidos do alojamento/repositório depois da atualização.
