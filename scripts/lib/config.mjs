// Shared config loader + color/typography mapping for ui-adjust scripts.
//
// Every project describes its own design system in `ui-adjust.config.json`
// (searched at ./ui-adjust.config.json, then ./.claude/ui-adjust.config.json, or pass --config <path>).
// Generate a first draft with `node <skill>/scripts/init-config.mjs`.

import fs from "node:fs";
import path from "node:path";

export const CONFIG_CANDIDATES = ["ui-adjust.config.json", ".claude/ui-adjust.config.json"];

export function findConfigPath(argv = process.argv.slice(2), cwd = process.cwd()) {
  const i = argv.indexOf("--config");
  if (i >= 0 && argv[i + 1]) return path.resolve(cwd, argv[i + 1]);
  for (const c of CONFIG_CANDIDATES) {
    const p = path.join(cwd, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadConfig(argv = process.argv.slice(2), cwd = process.cwd()) {
  const p = findConfigPath(argv, cwd);
  if (!p) {
    console.error(
      `ui-adjust: no config found (looked for ${CONFIG_CANDIDATES.join(", ")}).\n` +
        "Create one with:  node <skill>/scripts/init-config.mjs --theme app=src/theme/palette.ts",
    );
    process.exit(2);
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cfg = {
    spacingUnit: 8,
    radiusUnit: 8,
    nearThreshold: 40,
    components: {},
    paths: {},
    docs: [],
    ...raw,
    __path: p,
  };
  cfg.paths = { features: ["src"], themeSources: [], ...raw.paths };
  for (const [name, t] of Object.entries(cfg.themes ?? {})) {
    t.name = name;
    t.colors = Object.fromEntries(Object.entries(t.colors ?? {}).map(([h, v]) => [normalizeHex(h) ?? h, v]));
    t.handled = Object.fromEntries(Object.entries(t.handled ?? {}).map(([h, v]) => [normalizeHex(h) ?? h, v]));
    t.typography = t.typography ?? {};
    t.shadows = t.shadows ?? {};
  }
  if (!cfg.themes || Object.keys(cfg.themes).length === 0) {
    console.error(`ui-adjust: ${p} has no "themes"`);
    process.exit(2);
  }
  cfg.defaultTheme = cfg.defaultTheme ?? Object.keys(cfg.themes)[0];
  return cfg;
}

export function pickTheme(cfg, name) {
  const t = cfg.themes[name ?? cfg.defaultTheme];
  if (!t) {
    console.error(`unknown --theme ${name} (config has: ${Object.keys(cfg.themes).join(", ")})`);
    process.exit(2);
  }
  return t;
}

// ── colors ──
export function normalizeHex(raw) {
  if (typeof raw !== "string") return null;
  let h = raw.trim().toUpperCase();
  if (!h.startsWith("#")) return null;
  if (h.length === 4) h = "#" + [...h.slice(1)].map((c) => c + c).join("");
  if (h.length === 9 && h.endsWith("FF")) h = h.slice(0, 7);
  return /^#[0-9A-F]{6}$/.test(h) ? h : null;
}

export function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Weighted RGB distance — cheap perceptual approximation. */
export function colorDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2);
}

/**
 * exact → { kind: "exact", token } · theme already does it → { kind: "theme-handled", note }
 * close → { kind: "near", token, from, d } · otherwise → { kind: "off-palette", nearest }
 */
export function mapColor(hex, theme, near = 40) {
  if (theme.colors[hex]) return { kind: "exact", token: theme.colors[hex] };
  if (theme.handled[hex]) return { kind: "theme-handled", note: theme.handled[hex] };
  let best = null;
  for (const [h, token] of Object.entries(theme.colors)) {
    const d = colorDistance(hex, h);
    if (!best || d < best.d) best = { h, token, d };
  }
  if (best && best.d <= near) return { kind: "near", token: best.token, from: best.h, d: Math.round(best.d) };
  return { kind: "off-palette", nearest: best ? `${best.token} (${best.h})` : "none" };
}

/** hex → "token (themeA) / token (themeB)" across every theme in the config. */
export function tokenIndex(cfg) {
  const index = new Map();
  for (const t of Object.values(cfg.themes)) {
    for (const [hex, token] of Object.entries(t.colors)) {
      if (!index.has(hex)) index.set(hex, new Map());
      index.get(hex).set(t.name, token);
    }
  }
  return index;
}

export function describeToken(index, hex) {
  const per = index.get(hex);
  if (!per) return null;
  const tokens = new Set(per.values());
  if (tokens.size === 1) return [...tokens][0];
  return [...per.entries()].map(([theme, token]) => `${token} (${theme})`).join(" / ");
}
