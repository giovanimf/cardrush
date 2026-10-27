// Tema: "system" segue o sistema operacional (sem data-theme no <html>); light/dark ficam salvos no navegador
export const THEMES = ["system", "light", "dark"] as const
export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = "cardrush-theme"

// Roda no <head> antes da pintura: aplica a escolha salva sem piscar o tema claro
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`

// Cor da barra do navegador no celular: a mesma da barra superior em cada tema
export const THEME_COLORS = { light: "#0d1b3d", dark: "#172a5c" }
