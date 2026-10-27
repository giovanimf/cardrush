import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { Clip } from "../clips";
import { ClickSounds } from "../components/ClickSounds";
import { BrowserFrame, ClipView } from "../components/ClipView";
import { Segments } from "../components/Segments";
import { Backdrop, Captions, SceneHeader, type CaptionItem } from "../components/Stage";
import type { Segment } from "../edit";

type Side = { clip: Clip; label: string };

type Props = {
  index: number;
  title: string;
  url: string;
  left: Side;
  right: Side;
  // Trechos no relógio do clipe da esquerda (os dois foram gravados juntos)
  segments: Segment[];
  rate: number;
  captions: CaptionItem[];
};

const WIDTH = 700;

// O clipe da direita no relógio do da esquerda (diferença de início da gravação)
const Aligned = ({ left, right, children }: { left: Clip; right: Clip; children: React.ReactNode }) => {
  const { fps } = useVideoConfig();
  const delta = Math.round(((left.startedAt - right.startedAt) / 1000) * fps);
  return delta >= 0 ? (
    <Sequence name={right.name} trimBefore={delta} layout="none">
      {children}
    </Sequence>
  ) : (
    <Sequence name={right.name} from={-delta} layout="none">
      {children}
    </Sequence>
  );
};

// Dois navegadores lado a lado na mesma sala: o lance de um aparece no outro
export const SplitScene = ({ index, title, url, left, right, segments, rate, captions }: Props) => (
  <AbsoluteFill>
    <Backdrop />
    <SceneHeader index={index} title={title} left={220} />
    <Segments segments={segments} rate={rate}>
      <div style={{ position: "absolute", top: 124, left: 220 }}>
        <BrowserFrame url={url} label={left.label}>
          <ClipView clip={left.clip} width={WIDTH} />
        </BrowserFrame>
      </div>
      <Aligned left={left.clip} right={right.clip}>
        <div style={{ position: "absolute", top: 124, left: 220 + WIDTH + 80 }}>
          <BrowserFrame url={url} label={right.label}>
            <ClipView clip={right.clip} width={WIDTH} />
          </BrowserFrame>
        </div>
      </Aligned>
      <Captions items={captions} />
    </Segments>
    <ClickSounds clip={left.clip} segments={segments} rate={rate} />
    <ClickSounds clip={right.clip} segments={segments} rate={rate} offsetMs={right.clip.startedAt - left.clip.startedAt} />
  </AbsoluteFill>
);
