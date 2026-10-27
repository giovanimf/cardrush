import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Stage";
import { COLORS, FONTS } from "../theme";

const enter = (frame: number, start: number, length: number) => ({
  opacity: interpolate(frame, [start, start + length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  translate: interpolate(frame, [start, start + length], ["0px 28px", "0px 0px"], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }),
});

const Logo = ({ size }: { size: number }) => (
  <div style={{ fontFamily: FONTS.title, fontWeight: 700, fontSize: size, letterSpacing: "-0.03em", color: COLORS.cream, lineHeight: 1 }}>
    Card<span style={{ color: COLORS.accentSoft }}>Rush</span>
  </div>
);

const Chip = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      padding: "16px 30px",
      borderRadius: 999,
      border: `1px solid ${COLORS.line}`,
      background: "rgba(31, 53, 102, 0.6)",
      color: COLORS.cream,
      fontFamily: FONTS.body,
      fontWeight: 500,
      fontSize: 34,
      ...style,
    }}
  >
    {children}
  </div>
);

// Abertura: marca, proposta e os três pilares
export const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
        <div
          style={{
            opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateRight: "clamp" }),
            scale: interpolate(frame, [0, 1 * fps], [0.86, 1], {
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <Logo size={180} />
        </div>
        <div style={{ ...enter(frame, 0.7 * fps, 0.6 * fps), fontFamily: FONTS.body, fontSize: 54, color: COLORS.cream, fontWeight: 500 }}>
          Leilões ao vivo de cartas colecionáveis
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
          <Chip style={enter(frame, 1.4 * fps, 0.5 * fps)}>Lances em tempo real</Chip>
          <Chip style={enter(frame, 1.65 * fps, 0.5 * fps)}>Carteira e comprovantes</Chip>
          <Chip style={enter(frame, 1.9 * fps, 0.5 * fps)}>Auditoria pública</Chip>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FEATURES = [
  "Vitrine com busca",
  "Cadastro com papéis",
  "Carteira e depósito",
  "Lances em tempo real",
  "Prorrogação automática",
  "Comprovante público",
  "Auditoria HMAC-SHA256",
  "Painel do leiloeiro",
  "Tema escuro e 2 idiomas",
  "Feito para o celular",
];

// Encerramento: recapitulação das funcionalidades e a marca
export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 56 }}>
        <div style={enter(frame, 0, 0.6 * fps)}>
          <Logo size={120} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 300px)", gap: 22 }}>
          {FEATURES.map((feature, index) => (
            <div
              key={feature}
              style={{
                ...enter(frame, 0.5 * fps + index * 0.12 * fps, 0.45 * fps),
                height: 116,
                borderRadius: 18,
                border: `1px solid ${COLORS.line}`,
                background: "rgba(31, 53, 102, 0.55)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 24px",
                color: COLORS.cream,
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: 27,
                lineHeight: 1.2,
              }}
            >
              <svg width={30} height={30} viewBox="0 0 24 24" style={{ flex: "none" }}>
                <circle cx={12} cy={12} r={11} fill={COLORS.accent} />
                <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {feature}
            </div>
          ))}
        </div>
        <div style={{ ...enter(frame, 2.2 * fps, 0.6 * fps), fontFamily: FONTS.mono, fontSize: 26, color: COLORS.muted }}>
          Next.js 16 · React 19 · Prisma · PostgreSQL · Better Auth
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
