# BBB — Novos bosses · 21/10/2026

Atualização preparada a partir do ZIP do GitHub fornecido, incluindo as correções de 20/10 (barras finas e vídeos na seleção). Nada foi publicado e a base de dados live não foi alterada.

## Instalar

1. No SQL Editor do teu projeto Supabase, executar integralmente `supabase/novos-bosses-v3.sql`. Este ficheiro é aditivo: preserva contas, personagens, recompensas e salas. Pode ser executado novamente sem voltar a renumerar as vitórias do Xiongmao. `supabase/multiplayer-v2.sql` fica atualizado com o mesmo motor para instalações novas.
2. Copiar os ficheiros do ZIP da atualização para as mesmas pastas do jogo, substituindo os existentes. Não enviar o ZIP em si para o GitHub. O ZIP completo é uma cópia alternativa do projeto inteiro; não precisas de enviar os dois.
3. Manter o teu `config.js`. A atualização parcial não o substitui. Abrir novamente a app para receber o novo cache. Todas as pessoas de uma sala devem usar a mesma versão; terminar partidas antigas antes de publicar evita misturar clientes antigos com o novo motor.

Sem executar o SQL, as novas regras do multiplayer não ficam ativas. A atualização do frontend, por si só, não atualiza o servidor.

## Bosses

- 01 King Mantis, 02 Stone Golem e 03 Queen Mothra: preservados, incluindo vídeos e imagens de derrota existentes.
- 04 Xiongmao: ao atingir 20% de vida ou menos e continuar vivo, ativa permanentemente a habilidade. A próxima ronda absorve ataques dos jogadores e cura a quantidade de dano, até ao máximo de HP. Depois alterna uma ronda de dano e uma ronda de absorção até ao fim, mesmo que a vida suba acima dos 20%. Os ataques restantes na ronda que ativou a habilidade ainda causam dano.
- 05 Puppet Master & Dummy: antigo Boss 04. Mantém a divisão a meio da vida e as duas barras finas independentes. As vitórias antigas, a seleção guardada e as partidas guardadas são migradas uma única vez para o novo número.
- 06 Ice Lord: no fim de cada terceira ronda completa, congela aleatoriamente um jogador vivo. Este não pode atacar, curar ou receber cura até perder o seu próximo turno. O turno é saltado automaticamente e depois descongela.
- 07 Dot: aos 30% de vida ou menos, se continuar vivo, transforma-se em Black Hole e os ataques causam dano ×2 até ao fim. Nome e imagem mudam. A arte é provisória e foi desenhada em SVG.
- 08 Trikster: no fim de cada N rondas, sendo N o número inicial de jogadores (sem contar o Boss), troca os HP atuais dos jogadores vivos. A distribuição usa uma rotação aleatória sem deixar um jogador com os seus próprios HP; com um único jogador vivo não há troca. Mantém mortos fora da troca e respeita a vida máxima de cada personagem.
- 09 Crabinator: o primeiro ataque do Boss aplica bleed, o segundo não, e assim sucessivamente. Bleed retira 1 HP depois de cada turno concluído de qualquer participante, incluindo o Boss que o aplicou, durante cinco turnos. A defesa não reduz esse ponto. Pode ser curado e a cura não remove bleed. Uma nova aplicação renova para cinco turnos sem acumular dano. Dano fatal segue a última chance D20 existente; resolver o D20 não conta como um turno extra nem repete o desconto. Bleed continua após uma ressurreição enquanto tiver duração, podendo voltar a matar.

Ronda = todos os jogadores e o Boss jogaram. Turno = um participante jogou. Participantes mortos não recebem novos turnos. O contador da ronda e os efeitos aparecem na batalha e no histórico.

Os cinco bosses novos têm 300 HP **base**, conforme combinado. A escala que o jogo já usa para grupos continua aplicada: 300 a solo, 450 com dois jogadores e 600 com três. Puppet Master & Dummy mantém também os seus 300 HP base.

Xiongmao, Ice Lord, Trikster e Crabinator usam os espaços de arte provisória existentes até recebermos as imagens/vídeos finais. Não foram inventadas regras adicionais de dificuldade nem alteradas as habilidades dos bosses 01–03.

## Verificação

- Testes do motor local para os nove bosses, limites de ativação, alternância, gelo, trocas, bleed, curas e D20.
- Testes do motor PostgreSQL isolado e dos comandos de multiplayer, incluindo permissões e rejeição de curas/ações congeladas.
- 65 verificações de regressão de combate, autenticação, baralhos, reconexão e recompensas.
- Migração repetida, preservação do progresso e das partidas antigas, e manutenção de vitórias novas do Xiongmao numa segunda execução.
- Verificação dos vídeos dos bosses 02/03, imagens de derrota e duas barras do Boss 05.
- Verificação visual local a 390 × 844. O teste não se ligou ao Supabase live. Não foi feita uma partida real entre telemóveis nesta fase.

Os ficheiros em `tests/` são apenas verificações de desenvolvimento e não introduzem botões de administrador no jogo.
