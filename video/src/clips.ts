import vitrine from "./clips/01-vitrine.json";
import cadastro from "./clips/02-cadastro.json";
import disputaLucas from "./clips/03-disputa-lucas.json";
import disputaMarina from "./clips/03-disputa-marina.json";
import encerramento from "./clips/04-encerramento.json";
import arremates from "./clips/05-arremates.json";
import auditoria from "./clips/06-auditoria.json";
import leiloeiro from "./clips/07-leiloeiro.json";
import tema from "./clips/08-tema.json";
import celular from "./clips/09-celular.json";

// Manifestos gerados pelo gravador (record/recorder.ts): duração, tamanho da tela e os
// eventos de mouse, clique e teclado de cada clipe, em ms desde o início do clipe.

export type ClipEvent =
  | { type: "move"; t: number; d: number; x: number; y: number }
  | { type: "click"; t: number; x: number; y: number }
  | { type: "key"; t: number }
  | { type: "scroll"; t: number; d: number }
  | { type: "mark"; t: number; label: string };

export type Clip = {
  name: string;
  startedAt: number;
  durationMs: number;
  viewport: { width: number; height: number };
  events: ClipEvent[];
};

export const CLIPS = {
  vitrine,
  cadastro,
  disputaLucas,
  disputaMarina,
  encerramento,
  arremates,
  auditoria,
  leiloeiro,
  tema,
  celular,
} as Record<string, Clip> as Record<
  | "vitrine"
  | "cadastro"
  | "disputaLucas"
  | "disputaMarina"
  | "encerramento"
  | "arremates"
  | "auditoria"
  | "leiloeiro"
  | "tema"
  | "celular",
  Clip
>;

// Momento de uma marcação feita no roteiro; "key" é a primeira tecla digitada
export function markMs(clip: Clip, label: string): number {
  const event =
    label === "key"
      ? clip.events.find((item) => item.type === "key")
      : clip.events.find((item) => item.type === "mark" && item.label === label);
  if (!event) throw new Error(`Marcação ${label} não existe em ${clip.name}`);
  return event.t;
}
