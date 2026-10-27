import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";

// Fundo azul-marinho com a grade do "playmat" das cartas
export const Backdrop = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 700px at 20% 0%, ${COLORS.ink3} 0%, ${COLORS.ink} 60%), ${COLORS.ink}`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${COLORS.line} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.line} 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
        opacity: 0.35,
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
      }}
    />
  </AbsoluteFill>
);

type HeaderProps = { index: number; title: string; left?: number };

// Número e nome da funcionalidade no alto da cena
export const SceneHeader = ({ index, title, left = 260 }: HeaderProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        top: 46,
        left,
        display: "flex",
        alignItems: "baseline",
        gap: 20,
        opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(frame, [0, 0.6 * fps], ["0px 16px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <span style={{ fontFamily: FONTS.mono, fontSize: 26, fontWeight: 500, color: COLORS.accentSoft }}>{String(index).padStart(2, "0")}</span>
      <span style={{ fontFamily: FONTS.title, fontSize: 54, fontWeight: 700, color: COLORS.cream, letterSpacing: "-0.02em" }}>{title}</span>
    </div>
  );
};

export type CaptionItem = { atMs: number; text: string };

type CaptionProps = { items: CaptionItem[]; top?: number; align?: "center" | "left"; left?: number; width?: number };

const CAPTION_IN_MS = 450;

// Legenda da cena. Fica dentro do Sequence do clipe, então os tempos são do clipe gravado.
export const Captions = ({ items, top = 986, align = "center", left = 0, width = 1920 }: CaptionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 1000;
  const current = items.findLast((item) => t >= item.atMs);
  if (!current) return null;
  const since = t - current.atMs;

  return (
    <div style={{ position: "absolute", top, left, width, display: "flex", justifyContent: align === "center" ? "center" : "flex-start" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 28px",
          borderRadius: 999,
          background: "rgba(13, 27, 61, 0.86)",
          border: `1px solid ${COLORS.line}`,
          color: COLORS.cream,
          fontFamily: FONTS.body,
          fontWeight: 500,
          fontSize: 34,
          opacity: interpolate(since, [0, CAPTION_IN_MS], [0, 1], { extrapolateRight: "clamp" }),
          translate: interpolate(since, [0, CAPTION_IN_MS], ["0px 14px", "0px 0px"], {
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS.accent, boxShadow: `0 0 0 6px rgba(46, 91, 255, 0.25)` }} />
        {current.text}
      </div>
    </div>
  );
};
