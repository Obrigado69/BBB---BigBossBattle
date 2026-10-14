# BBB — Big Boss Battle · multiplayer Supabase

Esta versão parte de `BBB-novos-bosses-fullscreen-PWA (6).zip`. Conserva os quatro Bosses, a arte, o motor Singleplayer e os ecrãs originais. O multiplayer está integrado no `index.html`; o endereço antigo `multiplayer.html` encaminha para o jogo.

## Publicar

1. No Supabase, abre o SQL Editor e executa **`supabase/multiplayer-v2.sql` integralmente**. `supabase/schema.sql` contém a mesma migração, para compatibilidade; executa apenas um dos dois. Pode voltar a ser executada. As tabelas antigas do protótipo são preservadas, mas o jogo novo usa exclusivamente `bbb2_*`.
2. Em Authentication, ativa **Anonymous Sign-ins** e permite inscrições. A configuração pública verificada neste projeto já permite contas anónimas; confirma que continua ativa ao publicar.
3. Confirma em `config.js` o URL e a publishable key do projeto. Os valores públicos do ZIP original foram mantidos. Não uses uma service-role key ou uma chave secreta no navegador.
4. Coloca **o conteúdo do ZIP na raiz do repositório**, incluindo `index.html`, `online.js`, `online.css`, `vendor/`, `assets/`, `icons/`, `sw.js`, `manifest.webmanifest` e `.nojekyll`.
5. Em GitHub → Settings → Pages, escolhe **Deploy from a branch**, a branch que contém os ficheiros e **/(root)**. Não é necessário build, servidor Node ou Edge Functions.
6. Abre o endereço publicado. A PWA usa caminhos relativos e funciona em `/BBB---BigBossBattle/` ou noutro subdiretório. Após atualizar uma instalação antiga, fecha e reabre a PWA; se continuar na versão anterior, faz uma atualização completa do site ou reinstala a PWA.

Documentação oficial: [Anonymous Sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [configurar GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Jogar online

- Na primeira utilização de multiplayer, escolhe um username. É guardado no dispositivo, sem email/password. A identidade real é a conta anónima Supabase, e as três personagens pertencem a essa identidade. Dois dispositivos com o mesmo username continuam a ser contas diferentes; o username não é uma credencial de login. Apagar os dados do navegador perde o acesso à conta.
- O HOST escolhe um dos quatro Bosses e cria a sala. O servidor gera um código de seis dígitos, que pode começar por zero. Os restantes jogadores entram com esse código.
- Existem sete lugares de jogador e um lugar de Boss humano. A sala é criada com Boss automático; clicar no lugar BOSS assume o seu controlo. Para voltar ao automático, o controlador escolhe um lugar de jogador livre.
- Cada participante escolhe uma personagem da sua conta e baralho digital ou físico. Trocar lugar, personagem ou baralho retira o READY. O HOST inicia quando todos os restantes participantes estão ligados e prontos.
- Só o jogador do turno pode atuar. O Boss humano escolhe as suas cartas físicas/alvos; no digital, o servidor retira as cartas. Os outros jogadores veem a mesma cadeia de cartas, vida, turnos, log, divisão do Boss e resultado.
- Cartas digitais, alvos automáticos e D20 são sorteados no PostgreSQL. Cartas físicas são declaradas pelo jogador e validadas quanto aos valores permitidos. Nenhum cliente pode enviar um snapshot arbitrário do combate.
- A ligação usa Realtime e uma leitura conjunta do estado a cada 2,5 segundos como recuperação. O heartbeat é enviado a cada oito segundos. Um jogador ausente há mais de 45 segundos pode ter o turno ultrapassado; se for o Boss, o controlo passa a automático. Qualquer participante ligado pode fazer avançar o Boss automático — não depende do HOST continuar online.
- A mesma conta pode reentrar pelo código durante o combate, mantendo personagem, HP e estado. O botão REENTRAR conserva a sala de um combate abandonado; recarregar também recupera essa sala. Um jogador novo não pode entrar num combate iniciado. O D20 de uma vítima desconectada pode ficar pendente para o regresso, enquanto houver jogadores vivos.
- As recompensas são aplicadas uma única vez pelo servidor e ficam na personagem usada. A progressão Singleplayer continua local e é sincronizada com a conta quando há ligação. Foram preservados os bónus de teste que já existiam no ZIP original: quatro pontos iniciais e ataque 55 na personagem principal. Não existe leaderboard nem validação antitrapaça da progressão offline.

## PWA e testes

O manifesto pede fullscreen, com fallback standalone. O navegador/SO determina o modo efetivamente suportado. O shell do jogo fica em cache para Singleplayer offline; multiplayer necessita de internet e os dados de Auth/salas não são guardados no cache da PWA.

Consulta `RELATORIO-TESTES.md`. Foram usadas duas sessões Chrome com armazenamento isolado e o SQL real num PostgreSQL local. Auth e transporte REST foram emulados; o Supabase alojado e o seu WebSocket Realtime precisam do teste final após a migração. Não foi feita publicação nem alterado o teu projeto remoto.

Os testes reproduzíveis estão em `tests/`. Com Node 22+ instalado, a partir da raiz: `npm install --prefix tests`, `npx --prefix tests playwright install chromium`, `node tests/test-combat.mjs` e `node tests/test-browser.mjs`. O teste de navegador usa a porta local 4173.
