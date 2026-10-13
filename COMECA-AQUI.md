# BBB — Base web com salas multiplayer (MVP)

## O que está incluído
- `index.html`: último site do BBB enviado anteriormente, assets preservados. `Singleplayer` permanece na versão existente.
- `multiplayer.html` + `multiplayer.js`: salas privadas, host, entrada por código, lobby em tempo real, reconexão após refresh, demonstração de combate partilhado.
- `assets/`: artwork BBB original.
- `supabase/schema.sql`: esquema, autenticação por identidade anónima, regras de acesso e funções de servidor para salas e ações.

## Configuração inicial
1. Criar um projeto em https://supabase.com/dashboard.
2. Em Authentication > Providers, **ativar Anonymous Sign-Ins**. Isso cria uma identidade diferente por browser; não é o mesmo que usar a `anon key` sem autenticação.
3. SQL Editor > executar o conteúdo de `supabase/schema.sql` num projeto **novo / de testes**.
4. Em Project Settings > API (ou Connect), copiar Project URL e a chave **publishable** (`sb_publishable_...`, ou legacy `anon` se necessário) para `config.js`. NUNCA inserir service_role ou secret key no browser.
5. Servir a pasta por HTTP: `python3 -m http.server 5173` e abrir `http://localhost:5173` (ou alojar estes ficheiros num host estático HTTPS, ex. GitHub Pages/Netlify).
6. Abrir em dois browsers ou em janela normal e privada. Clicar Multiplayer, criar sala num browser, usar código no outro, e iniciar partida.

## O que realmente funciona
- Cada browser recebe uma identidade anónima persistida enquanto guardar sessão.
- Host cria sala de 6 dígitos, outro jogador entra com código, lobby partilhado e arranque sincronizado.
- Atualizações via Supabase Realtime Postgres Changes + polling de segurança a cada 3 segundos.
- O servidor mantém HP, valida o turno, aplica uma carta numérica aleatória de **2 a 10**, atualiza HP e realiza um ataque automático do Boss uma vez por ronda, após todos os jogadores vivos.
- Sala restaurada no mesmo browser por armazenamento local e sessão Supabase.

## O que AINDA NÃO está integrado (deliberadamente)
A batalha online é **uma simulação simplificada** para testar a infraestrutura, não a versão final do BBB. Falta substituir o combate de teste pelo motor de jogo final: baralhos de 52 cartas individuais, figuras e Jokers, D20, cura em terceiros, skills, Boss humano, recompensa única, progressão, cartas físicas, sincronização visual e persistência robusta de reconexão cross-device.
Não é apropriado publicar como jogo final nem considerar o combate atual um motor seguro com regras completas.

## Segurança e lançamento
- Políticas RLS só permitem ver salas aos seus membros; operações críticas por RPC com validação e lock da sala.
- O código de 6 dígitos não é uma senha forte. Antes de lançar publicamente, adicionar rate limiting contra tentativas de entrada e política de expiração/limpeza de salas.
- Nunca usar chave `service_role` ou `secret` no frontend.
- Anónimos podem perder o progresso se limparem o armazenamento. Adicionar vinculação de conta para personagens permanentes.
- Testar concorrência, reconexão, dispositivos e regras RLS antes de produção.

## Próxima integração com o Codex
Preservar a app concluída noutro computador. Migrar somente o lobby e backend, substituindo `bbb_take_action` e o estado JSON por operações do motor de combate final, autoritativas no servidor. Não reimplementar todas as regras apenas no cliente. Manter singleplayer offline e multiplayer online com as mesmas regras.
