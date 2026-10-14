# Relatório de testes — BBB multiplayer v2

Data: 14 de outubro de 2026.

## Ambiente e alcance

- PostgreSQL local via PGlite 0.5.9, com a migração Supabase completa, papéis `anon`/`authenticated`, função `auth.uid()` e Row Level Security.
- Duas sessões independentes Chrome, com contextos, cookies, localStorage e contas separados. Viewport 390 × 844. Site servido em `/BBB---BigBossBattle/` para verificar caminhos relativos.
- O SQL é o mesmo que será executado no Supabase. Apenas Auth e o adaptador HTTP PostgREST são locais de teste. A sincronização entre navegadores foi exercitada através da recuperação por polling. Não é um teste do Supabase alojado nem do seu serviço Realtime.

## Resultados

65 verificações do SQL/combate/autorização passaram:

- Migração inicial e segunda execução, sala por código e associação da personagem à conta.
- Controlo de turnos/fases, rejeição de utilizador externo, revisões concorrentes e idempotência do mesmo pedido.
- Ás, Joker e cadeias J/Q/K, ataque, cura de outro jogador, defesa e guard.
- Boss automático e humano, AOE/alternância do Boss 2, duas curas do Boss 3 e fúria persistente; divisão do Boss 4 e baralho AOE limitado a 2–6.
- D20 sorteado no servidor, autorização da vítima e rejeição de segundo lançamento.
- Falha de ligação, salto de turno após timeout, recuperação de D20 pendente e fallback do Boss humano.
- Reentrada sem alterar personagem/HP; entrada tardia de novas contas rejeitada.
- Vitória, recompensa única e persistência na personagem da conta.
- READY retirado ao mudar preparação, colisão de lugares, mudança de HOST ao sair do lobby e capacidade de sete jogadores mais Boss humano.
- Valores de carta física inválidos rejeitados; personagem alheia e fotografia com URL inseguro rejeitadas.
- RLS impede contas exteriores de ler salas/membros/personagens alheias; baralhos privados são inacessíveis e não aparecem no snapshot público.

O teste com dois navegadores passou sem erros JavaScript de página:

- HOST cria sala; segunda conta entra; READY habilita FIGHT; ambas entram no combate.
- Uma sessão sem turno é rejeitada. Cartas, vida, turno e ronda convergem nas duas sessões.
- Falha de rede seguida de reload recupera a mesma conta, username, personagem e combate.
- Boss automático faz os seus turnos. Numa segunda batalha, a outra sessão controla o Boss humano; ao sair, o controlo automático faz avançar o combate.
- Manifesto relativo em modo fullscreen; carregamento offline do shell e ataque Singleplayer ao Boss 4 offline.

## Validação a fazer depois de publicar

Aplicar o SQL, abrir a versão publicada em dois dispositivos e repetir criar/entrar/READY/FIGHT, reconexão e um turno de Boss humano. Confirmar o WebSocket Realtime no Supabase alojado. Verificar a instalação fullscreen num Android e num iPhone, incluindo notch, gestos e rotação. Estes dispositivos físicos e o GitHub Pages publicado não foram testados nesta execução.

A chave pública e os providers do projeto Supabase foram consultados em modo de leitura; não foram criados utilizadores nem salas no projeto remoto.
