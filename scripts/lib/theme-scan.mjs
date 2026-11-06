// Tiny, dependency-free scanner that pulls palette colors and typography sizes out of MUI theme
// source files (palette.ts, theme.ts, createTheme({...}) …). It understands:
//   const brand = "#0F766E";                      → brand
//   const tokens = { text: "#1d2939" };           → tokens.text
//   palette: { primary: { main: brand } }          → palette.primary.main = #0F766E
//   export const palette: PaletteOptions = { … }  → palette.*
//   h1: { fontSize: 38 } / { fontSize: "2.5rem" }  → typography.h1 = 38 / 40 (px)
// It is a heuristic, not a TypeScript parser: always review the generated config.

const TOKEN_RE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\.\.\.|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|-?\d+(?:\.\d+)?|[{}()[\]:,=;]/g;

function tokenize(text) {
  return [...text.matchAll(TOKEN_RE)].map((m) => m[0]).filter((t) => !t.startsWith("//") && !t.startsWith("/*"));
}

const unquote = (t) => (/^["'`]/.test(t) ? t.slice(1, -1) : null);

/** Returns Map<path, value> where value is { str } | { num } | { ref }. */
export function scanAssignments(text) {
  const toks = tokenize(text);
  const out = new Map();
  const stack = [];
  let pendingKey = null;
  let decl = null; // name of a `const X =` waiting for its value
  let inDecl = false;

  const here = (k) => [...stack, k].filter(Boolean).join(".");
  const skipBalanced = (i, open, close) => {
    let depth = 0;
    for (; i < toks.length; i++) {
      if (toks[i] === open) depth++;
      else if (toks[i] === close && --depth === 0) return i;
    }
    return i;
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === "const" || t === "let" || t === "var") { decl = toks[i + 1]; inDecl = true; i++; continue; }
    if (inDecl) {
      if (t === "=") inDecl = false;
      continue; // skip type annotations
    }
    if (t === "{") { stack.push(decl ?? pendingKey ?? ""); decl = null; pendingKey = null; continue; }
    if (t === "}") { stack.pop(); pendingKey = null; continue; }
    if (t === "[") { i = skipBalanced(i, "[", "]"); pendingKey = null; continue; }
    if (t === "...") { i++; continue; }
    if (t === ":" ) continue;
    if (t === "," || t === ";") { pendingKey = null; decl = null; continue; }

    const next = toks[i + 1];
    // key: value
    if (next === ":" && stack.length) { pendingKey = unquote(t) ?? t; continue; }

    const key = decl ?? pendingKey;
    if (!key) continue;
    if (next === "(") { // call → unresolvable value (alpha(), createTheme() …) — but keep scanning its object args
      if (/^createTheme$|^extendTheme$/.test(t)) { pendingKey = null; decl = null; continue; }
      i = skipBalanced(i + 1, "(", ")");
      pendingKey = null; decl = null; continue;
    }
    const s = unquote(t);
    if (s !== null) out.set(here(key), { str: s });
    else if (/^-?\d/.test(t)) out.set(here(key), { num: Number(t) });
    else if (!/^(true|false|null|undefined|as|satisfies)$/.test(t)) out.set(here(key), { ref: t });
    pendingKey = null; decl = null;
  }
  return out;
}

export function resolve(map, value, seen = new Set()) {
  if (!value) return null;
  if ("str" in value || "num" in value) return value;
  if (seen.has(value.ref)) return null;
  seen.add(value.ref);
  return resolve(map, map.get(value.ref), seen);
}

const PRIORITY = [
  "text.primary", "text.secondary", "text.disabled", "primary.main", "secondary.main", "error.main",
  "warning.main", "success.main", "info.main", "primary.", "secondary.", "error.", "warning.", "success.",
  "info.", "background.", "divider", "action.", "common.",
];
const rank = (token) => {
  if (token.endsWith("contrastText")) return PRIORITY.length + 1; // a foreground-on-color value, never the "meaning" of a hex
  const i = PRIORITY.findIndex((p) => (p.endsWith(".") ? token.startsWith(p) : token === p));
  return i < 0 ? PRIORITY.length : i;
};

const VARIANTS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "subtitle1", "subtitle2", "body1", "body2", "caption", "overline", "button"]);

/** Merge several files into { colors: {hex: token}, typography: {variant: px} }. */
export function extractTheme(texts, normalizeHex) {
  const all = new Map();
  for (const text of texts) for (const [k, v] of scanAssignments(text)) all.set(k, v);

  const candidates = new Map(); // hex → tokens[]
  let htmlFontSize = 16;
  const typography = {};
  for (const [p, v] of all) {
    const segs = p.split(".");
    const pi = segs.lastIndexOf("palette");
    const ti = segs.lastIndexOf("typography");
    const val = resolve(all, v);
    if (!val) continue;
    if (pi >= 0 && "str" in val) {
      const token = segs.slice(pi + 1).join(".");
      const hex = normalizeHex(val.str);
      if (!hex || !token || token === "mode") continue;
      if (!candidates.has(hex)) candidates.set(hex, []);
      candidates.get(hex).push(token);
    }
    if (ti >= 0) {
      const rest = segs.slice(ti + 1);
      if (rest.length === 1 && rest[0] === "htmlFontSize" && "num" in val) htmlFontSize = val.num;
      if (rest.length === 2 && VARIANTS.has(rest[0]) && rest[1] === "fontSize") {
        typography[rest[0]] = val;
      }
    }
  }
  const colors = {};
  for (const [hex, tokens] of candidates) {
    colors[hex] = [...tokens].sort((a, b) => rank(a) - rank(b))[0];
  }
  // MUI defaults (px at fontSize 14) for variants the theme doesn't override; MUI scales them by fontSize / 14
  const MUI_DEFAULTS = { h1: 96, h2: 60, h3: 48, h4: 34, h5: 24, h6: 20, subtitle1: 16, subtitle2: 14, body1: 16, body2: 14, caption: 12, overline: 12, button: 14 };
  const base = [...all].find(([p, v]) => /(^|\.)typography\.fontSize$/.test(p) && "num" in v)?.[1].num ?? 14;
  const px = {};
  for (const [variant, size] of Object.entries(MUI_DEFAULTS)) {
    if (!typography[variant]) px[variant] = Number(((size * base) / 14).toFixed(2));
  }
  for (const [variant, val] of Object.entries(typography)) {
    if ("num" in val) px[variant] = val.num;
    else {
      const m = String(val.str).match(/^([\d.]+)(rem|px)$/);
      if (m) px[variant] = Number((Number(m[1]) * (m[2] === "rem" ? htmlFontSize : 1)).toFixed(2));
    }
  }
  return { colors, typography: px };
}
