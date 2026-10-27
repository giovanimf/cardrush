import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Clip } from "../clips";
import { COLORS } from "../theme";

type Point = { x: number; y: number };

const ease = Easing.bezier(0.45, 0, 0.2, 1);

// Posição do mouse no instante t (ms do clipe), interpolando cada movimento gravado
export function cursorAt(clip: Clip, t: number): Point {
  let position: Point = { x: clip.viewport.width / 2, y: clip.viewport.height / 2 };
  for (const event of clip.events) {
    if (event.type !== "move") continue;
    if (t < event.t) break;
    if (t >= event.t + event.d) {
      position = { x: event.x, y: event.y };
      continue;
    }
    const progress = ease((t - event.t) / event.d);
    return { x: position.x + (event.x - position.x) * progress, y: position.y + (event.y - position.y) * progress };
  }
  return position;
}

type Props = {
  clip: Clip;
  // Pixels do vídeo por pixel da tela gravada
  scale: number;
  touch?: boolean;
};

const RIPPLE_MS = 520;

// Fica dentro do Sequence do clipe: o quadro atual já é o tempo do clipe gravado
export const Cursor = ({ clip, scale, touch = false }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 1000;
  const position = cursorAt(clip, t);
  const click = clip.events.findLast((event) => event.type === "click" && t >= event.t && t - event.t < RIPPLE_MS);
  const sinceClick = click ? t - click.t : RIPPLE_MS;
  const ripple = sinceClick / RIPPLE_MS;
  const press = interpolate(sinceClick, [0, 90, 220], [0.82, 0.82, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {click && click.type === "click" && (
        <div
          style={{
            position: "absolute",
            left: click.x * scale,
            top: click.y * scale,
            width: (touch ? 70 : 54) * Math.max(0.6, scale),
            height: (touch ? 70 : 54) * Math.max(0.6, scale),
            marginLeft: (-(touch ? 70 : 54) * Math.max(0.6, scale)) / 2,
            marginTop: (-(touch ? 70 : 54) * Math.max(0.6, scale)) / 2,
            borderRadius: "50%",
            border: `3px solid ${COLORS.accent}`,
            background: touch ? "rgba(46, 91, 255, 0.25)" : "rgba(46, 91, 255, 0.12)",
            scale: interpolate(ripple, [0, 1], [0.35, 1.25], { easing: Easing.out(Easing.cubic) }),
            opacity: interpolate(ripple, [0, 0.15, 1], [0, 0.95, 0]),
          }}
        />
      )}
      {!touch && (
        <svg
          width={34}
          height={34}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            left: position.x * scale - 6,
            top: position.y * scale - 3,
            scale: press,
            transformOrigin: "6px 3px",
            filter: "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35))",
          }}
        >
          <path d="M5.5 3.2v15.6l4.1-4 2.6 5.9 2.6-1.1-2.5-5.8h5.9z" fill="#ffffff" stroke={COLORS.ink} strokeWidth={1.4} strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
};
