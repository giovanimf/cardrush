import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import { CLIPS, markMs } from "./clips";
import { Intro, Outro } from "./scenes/Bookends";
import { ClipScene } from "./scenes/ClipScene";
import { PhoneScene } from "./scenes/PhoneScene";
import { SplitScene } from "./scenes/SplitScene";
import { sceneFrames, SEGMENTS, TIMING, TRANSITION_SECONDS } from "./timeline";

// Vídeo de apresentação do CardRush, com as telas reais gravadas por record/scenes.spec.ts.
// Legendas e aproximações usam as marcações feitas durante a gravação (tempo do clipe).

const { vitrine, cadastro, disputaLucas, disputaMarina, encerramento, arremates, auditoria, leiloeiro, tema, celular } = CLIPS;

// Próximo ponto do cursor depois de uma marcação: alvo das aproximações
function focusAfter(clip: typeof vitrine, label: string) {
  const at = markMs(clip, label);
  const move = clip.events.find((event) => event.type === "move" && event.t >= at);
  if (!move || move.type !== "move") throw new Error(`Sem movimento depois de ${label} em ${clip.name}`);
  return { at, x: move.x, y: move.y };
}

// A legenda da disputa segue o clipe do Lucas, já alinhado com o da Marina
const disputaStart = SEGMENTS.disputa[0].fromMs;
const marinaSees = markMs(disputaMarina, "marina-ve") + (disputaMarina.startedAt - disputaLucas.startedAt);

const encerrado = focusAfter(encerramento, "encerrado");
const comprovante = focusAfter(encerramento, "comprovante");
const adulterado = focusAfter(auditoria, "adulterado");

export const Presentation = () => {
  const { fps } = useVideoConfig();
  const frames = sceneFrames(fps);
  const transition = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: Math.round(TRANSITION_SECONDS * fps) })} />;

  return (
    <TransitionSeries name="Cenas">
      <TransitionSeries.Sequence name="Abertura" durationInFrames={frames.intro}>
        <Intro />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Vitrine" durationInFrames={frames.vitrine}>
        <ClipScene
          clip={vitrine}
          index={1}
          title="Vitrine de leilões"
          url="localhost:3000/pt"
          segments={SEGMENTS.vitrine}
          rate={TIMING.vitrine.rate}
          captions={[
            { atMs: 0, text: "Lotes ao vivo, agendados e encerrados em uma página" },
            { atMs: markMs(vitrine, "key") - 400, text: "Busca por nome da carta ou coleção" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Cadastro e carteira" durationInFrames={frames.cadastro}>
        <ClipScene
          clip={cadastro}
          index={2}
          title="Cadastro e carteira"
          url="localhost:3000/pt/signup"
          segments={SEGMENTS.cadastro}
          rate={TIMING.cadastro.rate}
          captions={[
            { atMs: 0, text: "Cadastro em segundos: escolha ser licitante ou leiloeiro" },
            { atMs: markMs(cadastro, "carteira"), text: "Carteira com depósito simulado" },
            { atMs: markMs(cadastro, "carteira") + 5200, text: "Saldo disponível sempre visível no topo" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Disputa em tempo real" durationInFrames={frames.disputa}>
        <SplitScene
          index={3}
          title="Lances em tempo real"
          url="localhost:3000/pt/lots/…"
          left={{ clip: disputaLucas, label: "Lucas" }}
          right={{ clip: disputaMarina, label: "Marina" }}
          segments={SEGMENTS.disputa}
          rate={TIMING.disputa.rate}
          captions={[
            { atMs: disputaStart, text: "Lucas dá o primeiro lance no Shivan Dragon" },
            { atMs: marinaSees, text: "Marina vê o lance chegar sem recarregar e cobre" },
            { atMs: markMs(disputaLucas, "lucas-superado"), text: "Lucas é avisado na hora: foi superado" },
            { atMs: markMs(disputaLucas, "reta-final"), text: "Faltam menos de 2 minutos para o fim…" },
            { atMs: markMs(disputaLucas, "prorrogado"), text: "…então o novo lance prorroga o lote em 2 minutos" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Encerramento e comprovante" durationInFrames={frames.encerramento}>
        <ClipScene
          clip={encerramento}
          index={4}
          title="Encerramento e comprovante"
          url="localhost:3000/pt/lots/…"
          segments={SEGMENTS.encerramento}
          rate={TIMING.encerramento.rate}
          captions={[
            { atMs: 0, text: "Quando o tempo acaba, o lote é liquidado sozinho" },
            { atMs: encerrado.at, text: "O vencedor vê o resultado na hora" },
            { atMs: comprovante.at, text: "Comprovante público, verificável por qualquer pessoa" },
          ]}
          zooms={[
            { fromMs: encerrado.at + 300, toMs: encerrado.at + 3200, x: encerrado.x, y: encerrado.y, scale: 1.3 },
            { fromMs: comprovante.at + 1600, toMs: comprovante.at + 3600, x: comprovante.x, y: comprovante.y, scale: 1.35 },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Meus arremates" durationInFrames={frames.arremates}>
        <ClipScene
          clip={arremates}
          index={5}
          title="Meus arremates e extrato"
          url="localhost:3000/pt/my-bids"
          segments={SEGMENTS.arremates}
          rate={TIMING.arremates.rate}
          captions={[
            { atMs: 0, text: "Histórico dos lotes disputados e vencidos" },
            { atMs: markMs(arremates, "extrato"), text: "O valor do arremate sai da carteira, com extrato" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Auditoria" durationInFrames={frames.auditoria}>
        <ClipScene
          clip={auditoria}
          index={6}
          title="Auditoria pública"
          url="localhost:3000/pt/lots/…/audit"
          segments={SEGMENTS.auditoria}
          rate={TIMING.auditoria.rate}
          captions={[
            { atMs: 0, text: "Cada lance entra numa cadeia de hashes HMAC-SHA256" },
            { atMs: adulterado.at, text: "Alteramos um lance direto no banco de dados…" },
            { atMs: adulterado.at + 2600, text: "…e a auditoria aponta a adulteração e o registro" },
          ]}
          zooms={[{ fromMs: adulterado.at + 1800, toMs: adulterado.at + 4600, x: adulterado.x, y: adulterado.y, scale: 1.3 }]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Leiloeiro" durationInFrames={frames.leiloeiro}>
        <ClipScene
          clip={leiloeiro}
          index={7}
          title="Painel do leiloeiro"
          url="localhost:3000/pt/dashboard"
          segments={SEGMENTS.leiloeiro}
          rate={TIMING.leiloeiro.rate}
          captions={[
            { atMs: 0, text: "A leiloeira Helena entra na conta" },
            { atMs: markMs(leiloeiro, "painel"), text: "Painel com os lotes e o total recebido" },
            { atMs: markMs(leiloeiro, "assistente"), text: "Novo lote: a carta vem da API da Scryfall" },
            { atMs: markMs(leiloeiro, "publicado"), text: "Publicado: o lote já está ao vivo" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Tema e idioma" durationInFrames={frames.tema}>
        <ClipScene
          clip={tema}
          index={8}
          title="Tema escuro e idiomas"
          url="localhost:3000/pt/lots"
          segments={SEGMENTS.tema}
          rate={TIMING.tema.rate}
          captions={[
            { atMs: 0, text: "Tema claro, escuro ou o do sistema" },
            { atMs: markMs(tema, "ingles"), text: "Interface em português e inglês" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Celular" durationInFrames={frames.celular}>
        <PhoneScene
          clip={celular}
          index={9}
          title="Feito para o celular"
          segments={SEGMENTS.celular}
          rate={TIMING.celular.rate}
          points={[
            { atMs: 0, text: "Layout próprio para telas pequenas" },
            { atMs: markMs(celular, "lance"), text: "O lance fica preso acima das abas" },
            { atMs: markMs(celular, "abas"), text: "Navegação por abas, com o polegar" },
          ]}
        />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence name="Encerramento" durationInFrames={frames.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
