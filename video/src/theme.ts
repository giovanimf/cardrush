import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";

// Mesma identidade do app (app/globals.css): azul-marinho, azul de destaque e as fontes do design
export const COLORS = {
  ink: "#0d1b3d",
  ink2: "#13254a",
  ink3: "#1f3566",
  accent: "#2e5bff",
  accentSoft: "#6cb4ff",
  cream: "#f2f5fb",
  muted: "#9fb0ce",
  line: "rgba(159, 176, 206, 0.18)",
  green: "#3ccf91",
  danger: "#ff6b81",
};

export const FONTS = {
  title: loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily,
  body: loadPlex("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily,
  mono: loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily,
};
