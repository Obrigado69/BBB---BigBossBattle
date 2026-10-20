# Atualização de bosses — 20/10/2026

Base: BBB---BigBossBattle-main.zip enviado pelo utilizador.

- Boss 4: título Puppet Master & Dummy; ao dividir-se usa duas barras finas nos locais medidos na prancheta 20 do Illustrator. Cada barra mostra a vida real da respetiva metade, mantendo a privacidade da vida do Boss em multiplayer. A lógica de divisão, dano, turnos e Supabase não foi alterada. A imagem do Boss 4 mantém o placeholder existente, pois não foi fornecido um grafismo próprio para esse boss.
- Novo asset assets/v2/hp-thin.webp convertido do BARRA_VIDA_PEQ.png fornecido.
- Vídeos fornecidos de Stone Golem e Queen Mothra adicionados ao catálogo, para seleção/preparação e combate, em loop sem som. Resultados continuam a usar imagens estáticas.
- As imagens de boss derrotado dos bosses 2 e 3 já existiam e foram mantidas.
- Cache do service worker renovado.

## Atualizar
Extrair e sobrepor os ficheiros na raiz do repositório, mantendo assets/ e assets/v2/. O ZIP de atualização contém apenas ficheiros alterados ou novos; não substituir a pasta assets inteira por uma pasta só com estes novos ficheiros. Para upload web, enviar os ficheiros extraídos, mantendo as pastas. Os ficheiros de configuração e SQL permanecem iguais. Não é necessário executar uma migração SQL.

## Verificação
node tests/test-boss-media.cjs
Testes cobrem divisão a metade da vida, duas barras independentes, visibilidade de HP, vídeos na seleção local/multiplayer e imagens de vitória/derrota. Verificação no browser local: duas barras no layout mobile 390 × 844, vídeos com autoplay/muted/loop e sem erro de reprodução. Nenhuma publicação ou acesso à base de dados live foi efetuado.

Correção de preenchimento: margens interiores das duas barras finas ajustadas para 2,5% de cada lado; com 100 HP, o vermelho preenche toda a área útil.
