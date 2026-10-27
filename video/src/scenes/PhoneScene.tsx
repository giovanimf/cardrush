import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Clip } from "../clips";
import { ClickSounds } from "../components/ClickSounds";
import { ClipView } from "../components/ClipView";
import { Segments } from "../components/Segments";
import { Backdrop, SceneHeader, type CaptionItem } from "../components/Stage";
import type { Segment } from "../edit";
import { COLORS, FONTS } from "../theme";

type Props = {
  clip: Clip;
  index: number;
  title: string;
  segments: Segment[];
  rate: number;
  // Tópicos que aparecem um a um ao lado do celular
  points: CaptionItem[];
};

const PHONE_WIDTH = 410;
const BEZEL = 14;

// Tópicos acumulados (ficam na tela), no relógio do clipe
const Points = ({ points }: { points: CaptionItem[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 1000;

  return (
    <div style={{ position: "absolute", top: 300, left: 260, width: 820, display: "flex", flexDirection: "column", gap: 36 }}>
      {points.map((point) => {
        const since = t - point.atMs;
        return (
          <div
            key={point.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              color: COLORS.cream,
              fontFamily: FONTS.body,
              fontWeight: 500,
              fontSize: 44,
              opacity: interpolate(since, [0, 450], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(since, [0, 450], ["-24px 0px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            <span style={{ width: 16, height: 16, flex: "none", borderRadius: "50%", background: COLORS.accent, boxShadow: "0 0 0 8px rgba(46, 91, 255, 0.25)" }} />
            {point.text}
          </div>
        );
      })}
    </div>
  );
};

// Tela do celular numa moldura de aparelho, com os toques marcados
export const PhoneScene = ({ clip, index, title, segments, rate, points }: Props) => {
  const height = (clip.viewport.height * PHONE_WIDTH) / clip.viewport.width;

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneHeader index={index} title={title} />
      <Segments segments={segments} rate={rate}>
        <div
          style={{
            position: "absolute",
            top: (1080 - height - 2 * BEZEL) / 2,
            left: 1240,
            padding: BEZEL,
            borderRadius: 56,
            background: "#050b1c",
            border: `2px solid ${COLORS.ink3}`,
            boxShadow: "0 40px 90px rgba(0, 0, 0, 0.55)",
          }}
        >
          <div style={{ borderRadius: 42, overflow: "hidden" }}>
            <ClipView clip={clip} width={PHONE_WIDTH} touch />
          </div>
        </div>
        <Points points={points} />
      </Segments>
      <ClickSounds clip={clip} segments={segments} rate={rate} />
    </AbsoluteFill>
  );
};
