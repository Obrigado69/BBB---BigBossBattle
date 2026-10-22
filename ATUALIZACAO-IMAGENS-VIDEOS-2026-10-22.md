# BBB — Imagens e vídeos · 22/10/2026

Atualização sobre a versão dos nove bosses de 21/10/2026. Não foi publicada no site e não altera o Supabase.

## Aplicar

Extrair o ZIP da atualização e copiar os ficheiros para as mesmas pastas do jogo, substituindo os existentes. Manter a pasta `assets` e os nomes dos ficheiros. O ZIP completo é uma alternativa que contém o projeto inteiro.

Esta alteração visual não exige SQL novo. Se ainda não instalaste a atualização dos nove bosses de 21/10, aplica primeiro essa atualização e o respetivo SQL, ou usa o jogo completo e segue `ATUALIZACAO-NOVOS-BOSSES-2026-10-21.md`.

## Vídeos

Os painéis com vídeo mostram apenas vídeo, sem imagem estática por trás e sem poster. Isto aplica-se à seleção local, seleção e preparação multiplayer e combate. Os retratos pequenos e os resultados de vitória/derrota continuam a usar imagens estáticas.

Ao trocar de boss, o jogo prepara o primeiro fotograma do próximo vídeo antes da transição. Os vídeos dos bosses vizinhos são pré-carregados; a mesma instância é reutilizada para não reiniciar a animação quando se muda uma opção ou o ecrã é redesenhado. Ao sair do painel, o vídeo anterior fica em pausa.

O primeiro carregamento continua a depender da rede e das regras de reprodução do dispositivo. Se um vídeo não carregar, não é substituído silenciosamente por uma fotografia. O jogo deixa de mostrar a passagem fotografia → vídeo que causava o salto visual.

## Imagens

- Boss 04: Xiongmao.
- Boss 05: The Puppet Master antes da divisão; Dummy (a imagem com os dois) depois da divisão. Os dois participantes da sequência de turnos têm o seu retrato correspondente.
- Boss 06: Ice Lord.
- Boss 07: Dot inicialmente; Black Hole quando ativa a fúria.
- Boss 08: Trikster.
- Boss 09: Crabinator.

As oito imagens fornecidas foram convertidas para WebP, a 1920 × 1079, preservando proporções e otimizando o peso. Os originais PNG não foram modificados. As imagens são usadas também nos restantes ecrãs estáticos, com o efeito de preto e branco de vitória já existente.

O enquadramento mantém as proporções e recorta o excesso para preencher as molduras. A seleção privilegia os rostos e o combate do Boss 05 ajusta o enquadramento para a imagem da segunda fase.

## Verificação

- Testes de painéis de vídeo sem poster nem imagem subjacente, nos modos local e multiplayer.
- Testes das oito imagens, resultados estáticos, duas fases do Boss 05 e transformação de Dot.
- Regressão das habilidades dos nove bosses, duas barras finas e imagens de derrota dos bosses 02/03.
- Reprodução real dos três vídeos no navegador local e continuidade ao alterar opções.
- Verificação visual local, incluindo formato 390 × 844. Nenhuma ligação ao Supabase live durante a verificação.
