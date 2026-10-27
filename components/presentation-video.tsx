"use client"

import { useRef } from "react"

type Chapter = { time: string; label: string }

const VIDEO_SRC = "/apresentacao/cardrush-apresentacao.mp4"

// "1:35" → 95
function toSeconds(time: string): number {
  const [minutes, seconds] = time.split(":").map(Number)
  return minutes * 60 + seconds
}

// Vídeo da apresentação com capítulos que pulam para o trecho
export function PresentationVideo({ chapters, fallback, download }: { chapters: Chapter[]; fallback: string; download: string }) {
  const video = useRef<HTMLVideoElement>(null)

  function seek(time: string) {
    if (!video.current) return
    video.current.currentTime = toSeconds(time)
    void video.current.play().catch(() => undefined)
  }

  return (
    <div className="pres-video">
      <video ref={video} controls preload="metadata" playsInline poster="/apresentacao/poster.jpg" data-testid="presentation-video">
        <source src={VIDEO_SRC} type="video/mp4" />
        {fallback}
      </video>
      <ol className="pres-chapters">
        {chapters.map((chapter) => (
          <li key={chapter.time}>
            <button type="button" onClick={() => seek(chapter.time)}>
              <span className="mono">{chapter.time}</span>
              {chapter.label}
            </button>
          </li>
        ))}
      </ol>
      <a className="hint" href={VIDEO_SRC} download>
        {download}
      </a>
    </div>
  )
}
