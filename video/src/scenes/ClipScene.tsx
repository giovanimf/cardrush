import { AbsoluteFill } from "remotion";
import type { Clip } from "../clips";
import { ClickSounds } from "../components/ClickSounds";
import { BrowserFrame, ClipView, type Zoom } from "../components/ClipView";
import { Segments } from "../components/Segments";
import { Backdrop, Captions, SceneHeader, type CaptionItem } from "../components/Stage";
import type { Segment } from "../edit";

type Props = {
  clip: Clip;
  index: number;
  title: string;
  url: string;
  // Trechos mantidos do clipe (ms gravados) e velocidade
  segments: Segment[];
  rate: number;
  captions: CaptionItem[];
  zooms?: Zoom[];
};

// Uma tela do sistema numa janela de navegador, com cursor, cliques e legenda
export const ClipScene = ({ clip, index, title, url, segments, rate, captions, zooms }: Props) => (
  <AbsoluteFill>
    <Backdrop />
    <SceneHeader index={index} title={title} />
    <Segments segments={segments} rate={rate}>
      <div style={{ position: "absolute", top: 124, left: 260 }}>
        <BrowserFrame url={url}>
          <ClipView clip={clip} width={1400} zooms={zooms} />
        </BrowserFrame>
      </div>
      <Captions items={captions} />
    </Segments>
    <ClickSounds clip={clip} segments={segments} rate={rate} />
  </AbsoluteFill>
);
