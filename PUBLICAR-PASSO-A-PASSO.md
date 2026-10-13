# BBB — Publicar o multiplayer (teste privado)

## A. Criar o backend (Supabase)
1. Abrir https://supabase.com/dashboard e criar um novo projeto de testes.
2. Em Authentication > Providers, ativar **Anonymous Sign-ins**.
3. Abrir SQL Editor > New query, colar TODO o conteúdo de `supabase/schema.sql` e executar.
4. Em Project Settings > API (ou Connect), copiar:
   - Project URL (https://...supabase.co)
   - Publishable key (sb_publishable_...), nunca uma secret/service_role key!
5. Colar ambos os valores em `config.js` (dentro das aspas) e guardar.

## B. Publicar no GitHub Pages
1. Criar um repositório novo no GitHub para testes. Atenção: GitHub Pages gratuito costuma exigir repo público.
2. Enviar o CONTEÚDO desta pasta para a raiz do repositório (index.html, multiplayer.html, multiplayer.js, config.js, assets/, supabase/).
3. Em Settings > Pages, selecionar `Deploy from a branch`, branch `main`, pasta `/(root)`, Save.
4. Abrir a URL indicada pelo GitHub Pages quando ficar disponível. Podes abri-la num iPhone e num Android.
5. Qualquer alteração futura enviada à branch publicada atualiza o mesmo link.

## C. Primeiro teste real
- Abrir site no browser A -> Multiplayer -> definir nome -> Criar sala.
- Abrir mesmo link no browser B ou telemóvel diferente -> Multiplayer -> inserir o código -> Entrar.
- Confirmar que aparecem dois participantes; iniciar a batalha no browser do host.
- Validar que o turno e HP mudam nos dois ecrãs.
- Fechar e reabrir browser B: deverá tentar retomar a sala, se a sessão anónima e armazenamento ainda existirem.

## Limitações importantes
- **Ainda não foi publicado nem ligado ao teu Supabase**: falta criares o projeto e preencheres config.js.
- O combate online atual é DEMONSTRAÇÃO SIMPLIFICADA, não o motor final do BBB.
- Este site NÃO disponibiliza ainda cartas especiais completas, D20, Boss humano nem progressão final online.
- O código de sala não é senha forte; antes de lançamento público: rate limit, expiração, testes de RLS, validação server-side.
- Login anónimo perde acesso à identidade se o utilizador apagar dados do browser; para guardar progresso entre dispositivos, ligar uma conta.
- Se o ambiente do GitHub Pages não usar HTTPS ou a ligação à rede falhar, multiplayer pode não funcionar.
- Nunca guardar passwords ou chaves secret/service_role no repositório.
