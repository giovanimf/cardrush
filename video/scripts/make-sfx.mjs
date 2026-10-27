// Gera os sons sutis do vídeo (sem arquivos de terceiros): clique de mouse e tecla.
// PCM 16 bits mono, 48 kHz, em public/sfx.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RATE = 48_000
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx")

// Ruído determinístico: o mesmo arquivo a cada geração
function noise(seed) {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 2_147_483_648 - 1
  }
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((value, index) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32_767), index * 2))
  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write("data", 36)
  header.writeUInt32LE(data.length, 40)
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, data]))
}

// Clique de mouse: estalo curto (ruído filtrado) com um "tic" agudo que decai rápido
function click({ seconds, tone, toneLevel, noiseLevel, decay, seed }) {
  const random = noise(seed)
  const total = Math.round(seconds * RATE)
  const samples = new Float32Array(total)
  let low = 0
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    const envelope = Math.exp(-t / decay)
    low += 0.35 * (random() - low)
    samples[i] = envelope * (noiseLevel * low + toneLevel * Math.sin(2 * Math.PI * tone * t))
  }
  return samples
}

fs.mkdirSync(OUT, { recursive: true })
writeWav("click.wav", click({ seconds: 0.07, tone: 2_400, toneLevel: 0.35, noiseLevel: 0.9, decay: 0.008, seed: 7 }))
writeWav("key.wav", click({ seconds: 0.045, tone: 3_200, toneLevel: 0.2, noiseLevel: 0.6, decay: 0.005, seed: 11 }))
console.log(`sons gerados em ${OUT}`)
