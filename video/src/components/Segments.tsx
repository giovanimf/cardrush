import { Sequence, useVideoConfig } from "remotion";
import { placeSegments, type Segment } from "../edit";

type Props = { segments: Segment[]; rate: number; children: React.ReactNode };

// Mostra só os trechos mantidos do clipe, um atrás do outro. Dentro de cada trecho o quadro
// atual é o tempo do clipe gravado, então vídeo, cursor, cliques e legenda seguem juntos.
export const Segments = ({ segments, rate, children }: Props) => {
  const { fps } = useVideoConfig();
  const { placed } = placeSegments(segments, fps, rate);

  return (
    <>
      {placed.map((segment, index) => (
        <Sequence
          key={index}
          name={`Trecho ${index + 1}`}
          from={segment.from}
          trimBefore={segment.trimBefore}
          durationInFrames={segment.durationInFrames}
          playbackRate={rate}
          layout="none"
        >
          {children}
        </Sequence>
      ))}
    </>
  );
};
