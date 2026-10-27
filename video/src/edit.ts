import type { Clip } from "./clips";

// Cortes automáticos: esperas do servidor (compilação do next dev, polling) deixam a tela
// parada vários segundos. As pausas do roteiro ficam abaixo de MAX_IDLE_MS; acima disso a
// espera é cortada, mantendo um pouco do começo (o botão "Aguarde…") e do fim.

export type Segment = { fromMs: number; toMs: number };

const MAX_IDLE_MS = 3200;
const KEEP_BEFORE_MS = 1200;
const KEEP_AFTER_MS = 900;

type Timed = { t: number; d?: number };

// Eventos de vários clipes no relógio do primeiro (clipes gravados juntos)
export function eventsOn(base: Clip, ...others: Clip[]): Timed[] {
  return [base, ...others]
    .flatMap((clip) => clip.events.map((event) => ({ t: event.t + (clip.startedAt - base.startedAt), d: "d" in event ? event.d : 0 })))
    .sort((a, b) => a.t - b.t);
}

export function keptSegments(events: Timed[], startMs: number, endMs: number): Segment[] {
  const segments: Segment[] = [];
  let from = startMs;
  let lastEnd = startMs;
  for (const event of events) {
    if (event.t < startMs) continue;
    if (event.t - lastEnd > MAX_IDLE_MS) {
      segments.push({ fromMs: from, toMs: lastEnd + KEEP_BEFORE_MS });
      from = event.t - KEEP_AFTER_MS;
    }
    lastEnd = Math.max(lastEnd, event.t + (event.d ?? 0));
  }
  segments.push({ fromMs: from, toMs: endMs });
  return segments;
}

export type PlacedSegment = { from: number; trimBefore: number; durationInFrames: number };

// Posição de cada trecho na cena: trimBefore e durationInFrames no tempo do clipe,
// from no tempo da cena (já com a velocidade aplicada)
export function placeSegments(segments: Segment[], fps: number, rate: number): { placed: PlacedSegment[]; total: number } {
  let at = 0;
  const placed = segments.map((segment) => {
    const trimBefore = Math.round((segment.fromMs / 1000) * fps);
    const durationInFrames = Math.max(1, Math.round((segment.toMs / 1000) * fps) - trimBefore);
    const item = { from: at, trimBefore, durationInFrames };
    at += Math.floor(durationInFrames / rate);
    return item;
  });
  return { placed, total: at };
}
