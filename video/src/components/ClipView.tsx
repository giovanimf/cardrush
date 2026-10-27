import { Video } from "@remotion/media";
import { interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Clip } from "../clips";
import { COLORS, FONTS } from "../theme";
import { Cursor } from "./Cursor";

// Aproximação num ponto da tela gravada (coordenadas da tela, ms do clipe)
export type Zoom = { fromMs: number; toMs: number; x: number; y: number; scale: number };

type Props = {
  clip: Clip;
  width: number;
  zooms?: Zoom[];
  touch?: boolean;
};

const ZOOM_EASE_MS = 700;

// Clipe gravado com o cursor desenhado por cima, na largura pedida. Fica dentro do
// Sequence do clipe (corte e velocidade): o quadro atual é o tempo do clipe gravado.
export const ClipView = ({ clip, width, zooms = [], touch }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 1000;
  const scale = width / clip.viewport.width;
  const height = clip.viewport.height * scale;

  const zoom = zooms.find((item) => t >= item.fromMs && t <= item.toMs);
  const amount = zoom
    ? Math.min(
        interpolate(t, [zoom.fromMs, zoom.fromMs + ZOOM_EASE_MS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        interpolate(t, [zoom.toMs - ZOOM_EASE_MS, zoom.toMs], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      )
    : 0;
  const smooth = amount * amount * (3 - 2 * amount);

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", background: COLORS.cream }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: zoom ? 1 + (zoom.scale - 1) * smooth : 1,
          transformOrigin: zoom ? `${zoom.x * scale}px ${zoom.y * scale}px` : "center",
        }}
      >
        <Video name={clip.name} src={staticFile(`clips/${clip.name}.mp4`)} muted style={{ width, height }} />
        <Cursor clip={clip} scale={scale} touch={touch} />
      </div>
    </div>
  );
};

type FrameProps = { url: string; children: React.ReactNode; label?: string };

// Janela de navegador em volta do clipe
export const BrowserFrame = ({ url, children, label }: FrameProps) => (
  <div
    style={{
      borderRadius: 18,
      overflow: "hidden",
      background: COLORS.ink2,
      border: `1px solid ${COLORS.line}`,
      boxShadow: "0 40px 80px rgba(0, 0, 0, 0.45), 0 8px 24px rgba(0, 0, 0, 0.3)",
    }}
  >
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
        <div key={color} style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
      ))}
      <div
        style={{
          flex: 1,
          margin: "0 18px",
          height: 26,
          borderRadius: 8,
          background: COLORS.ink,
          color: COLORS.muted,
          fontFamily: FONTS.mono,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {url}
      </div>
      {label && <div style={{ color: COLORS.cream, fontFamily: FONTS.body, fontWeight: 600, fontSize: 17, whiteSpace: "nowrap" }}>{label}</div>}
    </div>
    {children}
  </div>
);
