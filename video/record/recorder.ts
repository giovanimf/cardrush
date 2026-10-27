import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { BrowserContext, CDPSession, Locator, Page } from "@playwright/test"

// Grava uma aba em alta qualidade pelo screencast do Chrome (o recordVideo do Playwright
// sai em VP8 a 1 Mbps, borrado em 1080p) e anota o mouse, os cliques e as teclas para o
// Remotion desenhar o cursor e tocar os sons no tempo certo.

export const VIDEO_DIR = path.resolve(__dirname, "..")
const CLIPS_DIR = path.join(VIDEO_DIR, "public", "clips")
const DATA_DIR = path.join(VIDEO_DIR, "src", "clips")
const FRAMES_ROOT = path.join(VIDEO_DIR, ".frames")

export type ClipEvent =
  | { type: "move"; t: number; d: number; x: number; y: number }
  | { type: "click"; t: number; x: number; y: number }
  | { type: "key"; t: number }
  | { type: "scroll"; t: number; d: number }
  | { type: "mark"; t: number; label: string }

export type ClipManifest = {
  name: string
  // Início do clipe no relógio do sistema: alinha clipes gravados ao mesmo tempo
  startedAt: number
  durationMs: number
  viewport: { width: number; height: number }
  events: ClipEvent[]
}

// ffmpeg que vem com o Remotion (pacote nativo por plataforma). Chamado direto, sem shell:
// no Windows o cmd quebraria os parênteses do filtro.
function findFfmpeg(): string {
  const base = path.join(VIDEO_DIR, "node_modules", "@remotion")
  for (const dir of fs.readdirSync(base).filter((name) => name.startsWith("compositor-"))) {
    for (const file of ["ffmpeg.exe", "ffmpeg"]) {
      const candidate = path.join(base, dir, file)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  throw new Error("ffmpeg do Remotion não encontrado: rode npm install em video/")
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class Recorder {
  private cdp: CDPSession | null = null
  private frames: { file: string; ts: number }[] = []
  private pending: Promise<void>[] = []
  private startedAt = 0
  private stoppedAt = 0
  private events: ClipEvent[] = []
  private mouse = { x: 0, y: 0 }
  private framesDir: string

  constructor(
    readonly page: Page,
    readonly name: string,
  ) {
    this.framesDir = path.join(FRAMES_ROOT, name)
    const viewport = page.viewportSize()!
    this.mouse = { x: viewport.width / 2, y: viewport.height / 2 }
  }

  private now() {
    return Date.now() - this.startedAt
  }

  async start() {
    fs.rmSync(this.framesDir, { recursive: true, force: true })
    fs.mkdirSync(this.framesDir, { recursive: true })
    await this.page.mouse.move(this.mouse.x, this.mouse.y)

    this.cdp = await this.page.context().newCDPSession(this.page)
    const cdp = this.cdp
    cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      const ts = (metadata.timestamp ?? Date.now() / 1000) * 1000
      if (!this.startedAt) this.startedAt = ts
      const file = path.join(this.framesDir, `${String(this.frames.length).padStart(6, "0")}.jpg`)
      this.frames.push({ file, ts })
      this.pending.push(fs.promises.writeFile(file, Buffer.from(data, "base64")))
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {})
    })
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 2400, maxHeight: 2400, everyNthFrame: 1 })
    // Força um primeiro quadro e espera ele chegar (marca o início do clipe)
    await this.page.evaluate(() => document.body.style.setProperty("--rec", String(Math.random())))
    for (let i = 0; i < 50 && !this.startedAt; i++) await sleep(50)
    if (!this.startedAt) this.startedAt = Date.now()
  }

  mark(label: string) {
    this.events.push({ type: "mark", t: this.now(), label })
  }

  async pause(ms: number) {
    await sleep(ms)
  }

  // Movimento suave até o centro do elemento (ou um ponto)
  async moveTo(target: Locator | { x: number; y: number }, durationMs = 650) {
    let point: { x: number; y: number }
    if ("x" in target) {
      point = target
    } else {
      await target.scrollIntoViewIfNeeded()
      const box = await target.boundingBox()
      if (!box) throw new Error(`Sem posição para ${target}`)
      point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }
    const t = this.now()
    const steps = Math.max(8, Math.round(durationMs / 16))
    await this.page.mouse.move(point.x, point.y, { steps })
    const d = Math.max(1, this.now() - t)
    this.events.push({ type: "move", t, d, x: point.x, y: point.y })
    this.mouse = point
    return point
  }

  async click(target: Locator, options: { before?: number; after?: number } = {}) {
    const point = await this.moveTo(target)
    await sleep(options.before ?? 180)
    this.events.push({ type: "click", t: this.now(), x: point.x, y: point.y })
    await target.click({ position: undefined })
    await sleep(options.after ?? 350)
  }

  // Toque no celular: mesma marcação de clique, sem mover cursor
  async tap(target: Locator, options: { after?: number } = {}) {
    await target.scrollIntoViewIfNeeded()
    const box = (await target.boundingBox())!
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    this.mouse = point
    this.events.push({ type: "move", t: this.now(), d: 1, x: point.x, y: point.y })
    this.events.push({ type: "click", t: this.now(), x: point.x, y: point.y })
    await target.tap()
    await sleep(options.after ?? 450)
  }

  async type(target: Locator, text: string, options: { delay?: number; clear?: boolean } = {}) {
    await this.click(target, { after: 150 })
    if (options.clear) await target.fill("")
    for (const char of text) {
      this.events.push({ type: "key", t: this.now() })
      await this.page.keyboard.type(char)
      await sleep(options.delay ?? 75)
    }
    await sleep(250)
  }

  async press(key: string) {
    this.events.push({ type: "key", t: this.now() })
    await this.page.keyboard.press(key)
  }

  // Rolagem suave com a roda do mouse
  async scroll(deltaY: number, durationMs = 900) {
    const t = this.now()
    const steps = Math.max(6, Math.round(durationMs / 30))
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, deltaY / steps)
      await sleep(durationMs / steps)
    }
    this.events.push({ type: "scroll", t, d: this.now() - t })
    await sleep(200)
  }

  // Rolagem suave pela página (celular, onde não há roda do mouse)
  async scrollTo(top: number, durationMs = 900) {
    const t = this.now()
    await this.page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), top)
    await sleep(durationMs)
    this.events.push({ type: "scroll", t, d: this.now() - t })
  }

  async stop(): Promise<ClipManifest> {
    await sleep(300)
    this.stoppedAt = Date.now()
    await this.cdp?.send("Page.stopScreencast").catch(() => {})
    await this.cdp?.detach().catch(() => {})
    await Promise.all(this.pending)
    if (this.frames.length === 0) throw new Error(`Nenhum quadro gravado em ${this.name}`)

    // Cada quadro fica na tela até o próximo (o Chrome só manda quadro quando algo muda)
    const lines = ["ffconcat version 1.0"]
    this.frames.forEach((frame, index) => {
      const next = this.frames[index + 1]?.ts ?? this.stoppedAt
      lines.push(`file '${path.basename(frame.file)}'`, `duration ${Math.max(0.001, (next - frame.ts) / 1000).toFixed(4)}`)
    })
    lines.push(`file '${path.basename(this.frames.at(-1)!.file)}'`)
    const list = path.join(this.framesDir, "list.ffconcat")
    fs.writeFileSync(list, lines.join("\n"))

    fs.mkdirSync(CLIPS_DIR, { recursive: true })
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const out = path.join(CLIPS_DIR, `${this.name}.mp4`)
    // H.264 de alta qualidade, 30 fps constantes, dimensões pares (exigência do yuv420p).
    // O ffmpeg do Remotion não tem o filtro fps: a taxa sai de -r com -fps_mode cfr
    execFileSync(
      findFfmpeg(),
      [
        "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", list,
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p",
        "-r", "30", "-fps_mode", "cfr",
        "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-movflags", "+faststart", out,
      ],
      { cwd: VIDEO_DIR, stdio: "inherit" },
    )
    fs.rmSync(this.framesDir, { recursive: true, force: true })

    const viewport = this.page.viewportSize()!
    const manifest: ClipManifest = {
      name: this.name,
      startedAt: this.startedAt,
      durationMs: this.stoppedAt - this.startedAt,
      viewport,
      events: this.events,
    }
    fs.writeFileSync(path.join(DATA_DIR, `${this.name}.json`), JSON.stringify(manifest, null, 2) + "\n")
    return manifest
  }
}

// Esconde o indicador do next dev e a barra de rolagem em toda página do contexto
// (não fazem parte do produto)
export async function prepareContext(context: BrowserContext) {
  await context.addInitScript(() => {
    const add = () => {
      const style = document.createElement("style")
      style.textContent = "nextjs-portal{display:none!important} html{scrollbar-width:none} ::-webkit-scrollbar{display:none}"
      document.head.appendChild(style)
    }
    if (document.head) add()
    else document.addEventListener("DOMContentLoaded", add)
  })
}
