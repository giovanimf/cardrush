import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import type { Clip } from "../clips";
import { placeSegments, type Segment } from "../edit";

type Props = {
  clip: Clip;
  segments: Segment[];
  rate: number;
  // Diferença de início em relação ao clipe que define os trechos (tela dividida)
  offsetMs?: number;
};

// Clique e tecla sutis (gerados por scripts/make-sfx.mjs) no instante de cada evento gravado.
// Ficam fora dos trechos acelerados: o playbackRate esticaria o som e apagaria o estalo.
export const ClickSounds = ({ clip, segments, rate, offsetMs = 0 }: Props) => {
  const { fps } = useVideoConfig();
  const { placed } = placeSegments(segments, fps, rate);

  return (
    <>
      {clip.events.map((event, index) => {
        if (event.type !== "click" && event.type !== "key") return null;
        const frame = ((event.t + offsetMs) / 1000) * fps;
        const segment = placed.find((item) => frame >= item.trimBefore && frame < item.trimBefore + item.durationInFrames);
        if (!segment) return null;
        return (
          <Sequence
            key={index}
            name={event.type === "click" ? "Clique" : "Tecla"}
            from={Math.round(segment.from + (frame - segment.trimBefore) / rate)}
            durationInFrames={4}
            layout="none"
          >
            <Audio src={staticFile(event.type === "click" ? "sfx/click.wav" : "sfx/key.wav")} volume={event.type === "click" ? 0.35 : 0.14} />
          </Sequence>
        );
      })}
    </>
  );
};
