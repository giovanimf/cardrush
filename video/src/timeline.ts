import { CLIPS, type Clip } from "./clips";
import { eventsOn, keptSegments, placeSegments, type Segment } from "./edit";

// Início (ms gravados) e velocidade de cada cena; os trechos e as durações saem daqui
export const TIMING = {
  vitrine: { startMs: 600, rate: 1 },
  cadastro: { startMs: 500, rate: 1.15 },
  disputa: { startMs: 500, rate: 1.1 },
  encerramento: { startMs: 500, rate: 1 },
  arremates: { startMs: 400, rate: 1 },
  auditoria: { startMs: 500, rate: 1 },
  leiloeiro: { startMs: 400, rate: 1.2 },
  tema: { startMs: 500, rate: 1 },
  celular: { startMs: 500, rate: 1 },
} as const;

export const TRANSITION_SECONDS = 0.4;
export const INTRO_SECONDS = 4.5;
export const OUTRO_SECONDS = 7;

const single = (clip: Clip, startMs: number) => keptSegments(eventsOn(clip), startMs, clip.durationMs);

const { disputaLucas, disputaMarina } = CLIPS;

export const SEGMENTS: Record<keyof typeof TIMING, Segment[]> = {
  vitrine: single(CLIPS.vitrine, TIMING.vitrine.startMs),
  cadastro: single(CLIPS.cadastro, TIMING.cadastro.startMs),
  // Relógio do Lucas; termina quando o primeiro dos dois clipes acaba
  disputa: keptSegments(
    eventsOn(disputaLucas, disputaMarina),
    Math.max(0, disputaMarina.startedAt - disputaLucas.startedAt) + TIMING.disputa.startMs,
    Math.min(disputaLucas.durationMs, disputaMarina.startedAt + disputaMarina.durationMs - disputaLucas.startedAt),
  ),
  encerramento: single(CLIPS.encerramento, TIMING.encerramento.startMs),
  arremates: single(CLIPS.arremates, TIMING.arremates.startMs),
  auditoria: single(CLIPS.auditoria, TIMING.auditoria.startMs),
  leiloeiro: single(CLIPS.leiloeiro, TIMING.leiloeiro.startMs),
  tema: single(CLIPS.tema, TIMING.tema.startMs),
  celular: single(CLIPS.celular, TIMING.celular.startMs),
};

export function sceneFrames(fps: number) {
  const clipScene = (name: keyof typeof TIMING) => placeSegments(SEGMENTS[name], fps, TIMING[name].rate).total;
  return {
    intro: Math.round(INTRO_SECONDS * fps),
    vitrine: clipScene("vitrine"),
    cadastro: clipScene("cadastro"),
    disputa: clipScene("disputa"),
    encerramento: clipScene("encerramento"),
    arremates: clipScene("arremates"),
    auditoria: clipScene("auditoria"),
    leiloeiro: clipScene("leiloeiro"),
    tema: clipScene("tema"),
    celular: clipScene("celular"),
    outro: Math.round(OUTRO_SECONDS * fps),
  };
}

// Cada transição sobrepõe duas cenas: desconta da duração total
export function totalFrames(fps: number) {
  const scenes = Object.values(sceneFrames(fps));
  return scenes.reduce((sum, frames) => sum + frames, 0) - (scenes.length - 1) * Math.round(TRANSITION_SECONDS * fps);
}
