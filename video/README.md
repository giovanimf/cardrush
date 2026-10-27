# Vídeo de apresentação do CardRush

Vídeo de ~3 min (1920×1080, 30 fps, MP4 H.264) feito com [Remotion](https://www.remotion.dev) a partir das **telas reais do sistema**. Sem narração; o áudio são só cliques e teclas sutis, gerados aqui mesmo.

## Como funciona

1. **Gravação** (`record/`): um roteiro do Playwright usa o app no servidor de teste dos E2E (porta 3100, banco `e2e`, relógio controlável). Ele cria uma conta, deposita, dá lances em dois navegadores ao mesmo tempo, adianta o relógio para mostrar a prorrogação e o encerramento, adultera um lance no banco para a auditoria acusar, cria um lote como leiloeira, troca o tema e o idioma e usa o celular.
   - Os quadros vêm do screencast do Chrome (JPEG de alta qualidade) e viram MP4 H.264 com o ffmpeg que acompanha o Remotion: `public/clips/*.mp4`.
   - Cada clipe tem um manifesto em `src/clips/*.json` com o mouse, os cliques, as teclas, as rolagens e as marcações do roteiro.
2. **Montagem** (`src/`): cada cena põe o clipe numa janela de navegador (ou num celular), desenha o cursor e o efeito de clique a partir do manifesto, toca os sons nos instantes gravados e mostra a legenda. Esperas do servidor maiores que ~3 s são cortadas automaticamente (`src/edit.ts`).
3. **Renderização**: o Remotion desenha cada quadro num Chrome sem janela e codifica o MP4.

## Comandos

```bash
npm install          # dentro de video/
npm run dev          # Remotion Studio: prévia no navegador
npm run render       # gera out/cardrush-apresentacao.mp4
npm run publish      # copia uma versão para web (~13 MB) e a capa para ../public/apresentacao (página /apresentacao)
npm run record       # grava as telas de novo (sobe o servidor de teste; precisa do .env do app)
npm run sfx          # gera de novo os sons em public/sfx
```

`npm run record` usa o `E2E_DATABASE_URL` do `.env` do app e **apaga os dados do banco de teste**, como os testes E2E.

## Estrutura

```
record/scenes.spec.ts   roteiro das cenas (Playwright)
record/recorder.ts      gravação por screencast + manifesto de eventos
src/Presentation.tsx    ordem das cenas, legendas e aproximações
src/timeline.ts         início, velocidade e duração de cada cena
src/scenes/             abertura, cena de navegador, tela dividida, celular, encerramento
src/components/         cursor, sons de clique, janela do navegador, legendas
scripts/make-sfx.mjs    sons sintetizados (sem arquivos de terceiros)
```

Licença do Remotion: gratuita para pessoas físicas e empresas de até 3 pessoas ([remotion.pro/license](https://www.remotion.pro/license)).
