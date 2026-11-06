// Read a Tailwind CSS theme into ui-adjust's config shape — no Tailwind runtime needed.
//
//   v4: CSS `@theme { --color-brand-500: #0f766e; --text-sm: 0.875rem; --radius-md: 0.375rem; … }`
//       defaults come from the project's node_modules/tailwindcss/theme.css (oklch colors converted to hex)
//   v3: tailwind.config.{js,ts,cjs,mjs} `theme` / `theme.extend` (colors, fontSize, borderRadius, boxShadow, maxWidth)
//       defaults = Tailwind v3 scale + the project's `tailwindcss/colors` if installed
//
// Token names are utility suffixes: colors "danger-50" (→ bg-danger-50 / text-… / border-…),
// typography "sm" (→ text-sm), radius "md" (→ rounded-md), shadows "sm" (→ shadow-sm), containers "xs" (→ max-w-xs).

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { scanAssignments, resolve } from "./theme-scan.mjs";

const remToPx = (v) => {
  const m = String(v).trim().match(/^(-?[\d.]+)(rem|px)?$/);
  if (!m) return null;
  return Number((Number(m[1]) * (m[2] === "rem" ? 16 : 1)).toFixed(2));
};

// ── oklch → sRGB hex (CSS Color 4 / Björn Ottosson's OKLab) ──
export function oklchToHex(value) {
  const m = String(value).match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return null;
  const L = Number(m[1]) / (m[2] ? 100 : 1);
  const C = Number(m[3]);
  const h = (Number(m[4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const enc = (x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return "#" + lin.map(enc).map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function toHex(value, normalizeHex) {
  return normalizeHex(String(value).trim()) ?? oklchToHex(value);
}

function emptyTheme() {
  return { colors: {}, typography: {}, radius: {}, shadows: {}, containers: {}, spacingUnit: null };
}

// ── v4: CSS custom properties ──
export function readCssVars(text) {
  const vars = new Map();
  const body = text.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of body.matchAll(/--([a-z0-9-]+(?:--[a-z0-9-]+)?)\s*:\s*([^;{}]+);/gi)) vars.set(m[1], m[2].trim());
  return vars;
}

function applyCssVars(theme, vars, normalizeHex, { custom }) {
  for (const [name, value] of vars) {
    if (name.includes("--")) continue; // --text-sm--line-height etc.
    let m;
    if ((m = name.match(/^color-(.+)$/))) {
      const hex = toHex(value, normalizeHex);
      if (!hex) continue;
      // custom tokens win over Tailwind defaults for the same hex; first custom name wins among customs
      if (!theme.colors[hex] || (custom && !theme.__custom.has(hex))) {
        theme.colors[hex] = m[1];
        if (custom) theme.__custom.add(hex);
      }
    } else if ((m = name.match(/^text-(.+)$/))) {
      const px = remToPx(value);
      if (px !== null) theme.typography[m[1]] = px;
    } else if ((m = name.match(/^radius-(.+)$/))) {
      const px = remToPx(value);
      if (px !== null) theme.radius[m[1]] = px;
    } else if ((m = name.match(/^shadow-(.+)$/))) {
      theme.shadows[m[1]] = value;
    } else if ((m = name.match(/^container-(.+)$/))) {
      const px = remToPx(value);
      if (px !== null) theme.containers[m[1]] = px;
    } else if (name === "spacing") {
      theme.spacingUnit = remToPx(value);
    }
  }
}

// ── v3 defaults ──
const V3 = {
  typography: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48, "6xl": 60 },
  radius: { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, "2xl": 16, "3xl": 24, full: 9999 },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  containers: { xs: 320, sm: 384, md: 448, lg: 512, xl: 576, "2xl": 672, "3xl": 768 },
};

function flattenColors(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const name = k === "DEFAULT" ? prefix : prefix ? `${prefix}-${k}` : k;
    if (typeof v === "string") out.push([name, v]);
    else if (v && typeof v === "object") flattenColors(v, name, out);
  }
  return out;
}

function applyV3Config(theme, text, normalizeHex) {
  const map = scanAssignments(text);
  for (const [p, raw] of map) {
    const segs = p.split(".").filter((s) => s !== "extend");
    const ti = segs.indexOf("theme");
    if (ti < 0) continue;
    const [group, ...rest] = segs.slice(ti + 1);
    const key = rest.filter((s) => s !== "DEFAULT").join("-");
    const val = resolve(map, raw);
    if (!val || !("str" in val || "num" in val)) continue;
    const v = val.str ?? String(val.num);
    if (group === "colors" && key) {
      const hex = toHex(v, normalizeHex);
      if (hex) { theme.colors[hex] = key; theme.__custom.add(hex); }
    } else if (group === "fontSize" && rest.length >= 1) {
      const px = remToPx(v);
      if (px !== null) theme.typography[rest[0]] = px;
    } else if (group === "borderRadius" && rest.length >= 1) {
      const px = remToPx(v);
      if (px !== null) theme.radius[rest[0]] = px;
    } else if (group === "boxShadow" && rest.length >= 1) {
      theme.shadows[rest[0]] = v;
    } else if (group === "maxWidth" && rest.length >= 1) {
      const px = remToPx(v);
      if (px !== null) theme.containers[rest[0]] = px;
    }
  }
}

/** Build one ui-adjust theme from Tailwind sources (CSS and/or config files). */
export function extractTailwindTheme({ cwd, sources, normalizeHex }) {
  const theme = emptyTheme();
  theme.__custom = new Set();
  const notes = [];
  const req = createRequire(path.join(cwd, "package.json"));
  const isV4 = sources.some((s) => s.endsWith(".css"));

  if (isV4) {
    let defaults = null;
    try { defaults = req.resolve("tailwindcss/theme.css"); } catch { /* not installed */ }
    if (defaults) {
      applyCssVars(theme, readCssVars(fs.readFileSync(defaults, "utf8")), normalizeHex, { custom: false });
      notes.push(`defaults: ${path.relative(cwd, defaults)}`);
    } else notes.push("tailwindcss/theme.css not found — only the project's @theme values are included");
  } else {
    Object.assign(theme.typography, V3.typography);
    Object.assign(theme.radius, V3.radius);
    Object.assign(theme.shadows, V3.shadows);
    Object.assign(theme.containers, V3.containers);
    theme.spacingUnit = 4;
    try {
      const colors = req("tailwindcss/colors");
      for (const [name, value] of flattenColors(colors, "", [])) {
        const hex = toHex(value, normalizeHex);
        if (hex && !theme.colors[hex]) theme.colors[hex] = name;
      }
      notes.push("defaults: tailwindcss/colors + v3 scale");
    } catch { notes.push("tailwindcss/colors not found — default palette not included"); }
  }

  for (const s of sources) {
    const text = fs.readFileSync(path.join(cwd, s), "utf8");
    if (s.endsWith(".css")) applyCssVars(theme, readCssVars(text), normalizeHex, { custom: true });
    else applyV3Config(theme, text, normalizeHex);
  }
  const customCount = theme.__custom.size;
  // project tokens: the only ones a "near" color may snap to (snapping #FDA29B to Tailwind's red-300 in a
  // project that has its own danger-* family mixes two palettes — better to propose a new project token)
  theme.projectColors = [...theme.__custom].map((h) => theme.colors[h]);
  delete theme.__custom;
  // ordering: project tokens first is nicer to read — rebuild colors with customs first
  return { theme, notes, customCount, version: isV4 ? 4 : 3 };
}
