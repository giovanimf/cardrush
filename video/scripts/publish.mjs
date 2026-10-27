// Copia o vídeo renderizado para a página /apresentacao do app, em versão menor para a web
// (CRF 23, AAC 96k, faststart para começar a tocar antes de baixar tudo) e com a capa.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const input = "out/cardrush-apresentacao.mp4";
const target = "../public/apresentacao";

const compositor = readdirSync("node_modules/@remotion").find((name) => name.startsWith("compositor-"));
const ffmpeg = compositor && join("node_modules/@remotion", compositor, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
if (!ffmpeg || !existsSync(ffmpeg)) throw new Error("ffmpeg do Remotion não encontrado: rode npm install em video/");
if (!existsSync(input)) throw new Error(`${input} não existe: rode npm run render antes`);

mkdirSync(target, { recursive: true });
const run = (args) => execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

run(["-i", input, "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", join(target, "cardrush-apresentacao.mp4")]);
run(["-ss", "3", "-i", input, "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "3", join(target, "poster.jpg")]);
console.log(`Publicado em ${target}`);
