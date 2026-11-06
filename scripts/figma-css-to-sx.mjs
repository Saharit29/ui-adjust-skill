#!/usr/bin/env node
// Convert Figma "Copy as CSS" output into an MUI `sx` suggestion that uses the project's theme tokens
// (read from ui-adjust.config.json — see templates/ui-adjust.config.example.json).
//
//   node <skill>/scripts/figma-css-to-sx.mjs <file.css> [--theme <name>] [--config <path>]
//   cat figma.css | node <skill>/scripts/figma-css-to-sx.mjs - --theme dense
//
// Output, per Figma layer (block):
//   - suggested sx object (tokens, spacing units, typography variant)
//   - DROPPED: Figma layout noise that must not be copied (absolute position, fixed size, font-family…)
//   - REVIEW: values that did not map to a token — decide, don't silently hardcode
// --json prints the machine-readable result instead.

import fs from "node:fs";
import { loadConfig, pickTheme, mapColor, normalizeHex, rgbToHex } from "./lib/config.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const cfg = loadConfig(args);
const T = pickTheme(cfg, flag("--theme"));
const theme = T.name;
const SPACING_UNIT = cfg.spacingUnit;
const RADIUS_UNIT = cfg.radiusUnit;
const BUTTON = cfg.components?.button ?? "Button";
const asJson = args.includes("--json");
const input = args.find((a, i) => !a.startsWith("--") && !["--theme", "--config"].includes(args[i - 1]));
if (!input) {
  console.error(`usage: figma-css-to-sx.mjs <file.css|-> [--theme ${Object.keys(cfg.themes).join("|")}] [--config path] [--json]`);
  process.exit(2);
}
const css = fs.readFileSync(input === "-" ? 0 : input, "utf8");

// ── parse: Figma emits `/* Layer name */` followed by `prop: value;` lines (sometimes inside `{}`) ──
function parseBlocks(text) {
  const blocks = [];
  let current = { name: "(root)", props: [] };
  const push = () => current.props.length && blocks.push(current);
  const tokens = text.replace(/\r/g, "").split(/(\/\*[\s\S]*?\*\/|[{}]|;)/);
  let buffer = "";
  for (const t of tokens) {
    if (!t) continue;
    if (t.startsWith("/*")) {
      const name = t.slice(2, -2).trim();
      // inline comments after a value (e.g. `/* identical to box height */`) are not layer names
      // (Figma writes e.g. `/* identical to box height, or 150% */` or `/* or 129% */`)
      if (/^identical to|^or \d+(\.\d+)?%$|^(inside )?auto layout$/i.test(name)) continue;
      push();
      current = { name, props: [] };
      buffer = "";
    } else if (t === "{") {
      const selector = buffer.trim();
      if (selector) { push(); current = { name: selector, props: [] }; }
      buffer = "";
    } else if (t === ";" || t === "}") {
      const m = buffer.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+?)\s*$/i);
      if (m) current.props.push([m[1].toLowerCase(), m[2].trim()]);
      buffer = "";
    } else {
      buffer += t;
    }
  }
  const m = buffer.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+?)\s*$/i);
  if (m) current.props.push([m[1].toLowerCase(), m[2].trim()]);
  push();
  return blocks;
}

// ── value helpers ──
const px = (v) => {
  const m = String(v).match(/^(-?\d+(?:\.\d+)?)px$/);
  return m ? Number(m[1]) : null;
};
const spacing = (v) => {
  const n = px(v);
  if (n === null) return { value: v, exact: false };
  if (n === 0) return { value: 0, exact: true };
  const units = n / SPACING_UNIT;
  const exact = Number.isInteger(units * 4); // 0.25 steps = 2px grid
  return exact ? { value: units, exact } : { value: `${n}px`, exact };
};

function colorOf(raw, review, label) {
  let hex = normalizeHex(raw);
  let alpha = null;
  const rgba = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    hex = rgbToHex(rgba[1], rgba[2], rgba[3]);
    if (rgba[4] !== undefined && Number(rgba[4]) < 1) alpha = Number(rgba[4]);
  }
  if (!hex) {
    review.push(`${label}: \`${raw}\` — not a plain color (gradient/var?) — check the design`);
    return raw;
  }
  const hit = mapColor(hex, T, cfg.nearThreshold);
  if (hit.kind === "theme-handled") {
    review.push(`${label}: ${hex} — ${hit.note}; remove from sx`);
    return undefined;
  }
  if (hit.kind === "exact") {
    return alpha !== null ? `(t) => alpha(t.palette.${hit.token}, ${alpha})` : hit.token;
  }
  if (hit.kind === "near") {
    review.push(`${label}: ${hex} ≈ ${hit.token} (${hit.from}, Δ${hit.d}) — snapped to token; mention in report`);
    return alpha !== null ? `(t) => alpha(t.palette.${hit.token}, ${alpha})` : hit.token;
  }
  review.push(
    `${label}: ${hex} OFF-PALETTE (nearest ${hit.nearest}) — keep as a named const with the Figma layer name, or ask; do not inline`,
  );
  return alpha !== null ? `alpha("${hex}", ${alpha})` : hex;
}

function boxShorthand(value) {
  const parts = value.split(/\s+/);
  const [t, r = t, b = t, l = r] = parts;
  if (t === b && r === l) return t === r ? { p: t } : { py: t, px: r };
  return { pt: t, pr: r, pb: b, pl: l };
}

// ── convert one block ──
const DROP_ALWAYS = {
  position: "absolute/relative positioning from Figma artboard — use flex/Stack layout",
  left: "artboard coordinate", top: "artboard coordinate", right: "artboard coordinate", bottom: "artboard coordinate",
  "font-family": "theme typography already sets the font family",
  "font-style": "default", order: "Figma auto-layout index", "flex-grow": "Figma auto-layout default (0)",
  flex: "Figma auto-layout default (`none`)", "box-sizing": "MUI default", isolation: "Figma artefact",
  "font-feature-settings": "Figma artefact", "mix-blend-mode": "Figma artefact",
};

function convert(block) {
  const sx = {};
  const dropped = [];
  const review = [];
  const props = Object.fromEntries(block.props);
  let variant = null;

  for (const [prop, value] of block.props) {
    if (DROP_ALWAYS[prop]) {
      if (!(prop === "position" && value === "static")) dropped.push(`${prop}: ${value} — ${DROP_ALWAYS[prop]}`);
      continue;
    }
    switch (prop) {
      case "width":
      case "height": {
        const n = px(value);
        if (n !== null) {
          dropped.push(`${prop}: ${value} — fixed artboard size; let content/flex decide (keep only for icons/avatars/fixed controls)`);
        } else if (value !== "auto") sx[prop] = value;
        break;
      }
      case "min-width": case "max-width": case "min-height": case "max-height":
        sx[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = px(value) ?? value;
        break;
      case "display":
        if (value === "flex" || value === "inline-flex") sx.display = value;
        else sx.display = value;
        break;
      case "flex-direction": sx.flexDirection = value; break;
      case "align-items": sx.alignItems = value; break;
      case "justify-content": sx.justifyContent = value; break;
      case "flex-wrap": sx.flexWrap = value; break;
      case "align-self":
        if (value === "stretch") dropped.push(`align-self: stretch — Figma "fill container"; usually default in a column Stack`);
        else sx.alignSelf = value;
        break;
      case "gap": case "row-gap": case "column-gap": {
        const s = spacing(value);
        sx[prop === "gap" ? "gap" : prop === "row-gap" ? "rowGap" : "columnGap"] = s.value;
        if (!s.exact) review.push(`${prop}: ${value} is off the 8px grid (0.25 = 2px steps)`);
        break;
      }
      case "padding": case "margin": {
        const parts = value.split(/\s+/).map(spacing);
        if (parts.some((p) => !p.exact)) review.push(`${prop}: ${value} has off-grid values`);
        const key = prop === "padding" ? "p" : "m";
        const short = boxShorthand(parts.map((p) => p.value).join(" "));
        for (const [k, v] of Object.entries(short)) sx[k.replace("p", key)] = Number.isNaN(Number(v)) ? v : Number(v);
        break;
      }
      case "border-radius": {
        if (value === "50%" || (px(value) ?? 0) >= 100) { sx.borderRadius = "999px"; break; }
        const parts = value.split(/\s+/);
        if (parts.length > 1) { sx.borderRadius = value; review.push(`border-radius: ${value} — per-corner radius; confirm it's intentional`); break; }
        const n = px(value);
        sx.borderRadius = n !== null ? n / RADIUS_UNIT : value;
        if (n === RADIUS_UNIT) review.push(`border-radius: ${n}px = theme.shape.borderRadius — Card/Paper/Dialog/Button/Input usually get it from the theme; drop it if this layer is one of those`);
        break;
      }
      case "border": case "border-top": case "border-bottom": case "border-left": case "border-right": {
        const m = value.match(/^(\d+(?:\.\d+)?)px\s+(solid|dashed|dotted)\s+(.+)$/);
        const key = { border: "border", "border-top": "borderTop", "border-bottom": "borderBottom", "border-left": "borderLeft", "border-right": "borderRight" }[prop];
        if (!m) { sx[key] = value; break; }
        sx[key] = m[2] === "solid" ? Number(m[1]) : `${m[1]}px ${m[2]}`;
        const c = colorOf(m[3], review, prop);
        if (c !== undefined) sx.borderColor = c;
        break;
      }
      case "background": case "background-color": {
        const c = colorOf(value, review, prop);
        if (c !== undefined) sx.bgcolor = c === "background.paper" ? "background.paper" : c;
        break;
      }
      case "color": {
        if (normalizeHex(value) === "#FFFFFF") { sx.color = "common.white"; break; }
        const c = colorOf(value, review, "color");
        if (c !== undefined) sx.color = c;
        break;
      }
      case "box-shadow": {
        // Figma omits the spread when it is 0 — normalise "x y blur 0 color" and "x y blur color" to the same string
        const normShadow = (v) => v.replace(/(-?\d+(?:px)?\s+-?\d+(?:px)?\s+\d+(?:px)?)\s+0(?:px)?\s+/, "$1 ")
          .replace(/(\d)px/g, "$1").replace(/\s+/g, "");
        const norm = normShadow(value);
        const idx = Object.entries(T.shadows).find(([, v]) => normShadow(v) === norm);
        if (idx) sx.boxShadow = Number(idx[0]);
        else { sx.boxShadow = value; review.push(`box-shadow: ${value} — matches no theme.shadows entry in the config (${Object.keys(T.shadows).join(", ") || "none configured"}); use an elevation index or a divider border`); }
        break;
      }
      case "font-size": {
        const n = px(value);
        const table = T.typography;
        // overline is uppercase + tracked — only pick it when Figma says so
        const allowOverline = /uppercase/i.test(props["text-transform"] ?? "");
        // tie-break equal sizes: body text first, then caption, headings (h6 → h1, bold text only), subtitles last
        const weight = Number(props["font-weight"]) || 400;
        const PREF = weight >= 600
          ? ["h6", "h5", "h4", "h3", "h2", "h1", "body1", "body2", "caption", "subtitle1", "subtitle2", "overline"]
          : ["body1", "body2", "caption", "h6", "h5", "h4", "h3", "h2", "h1", "subtitle1", "subtitle2", "overline"];
        const pref = (v) => (PREF.indexOf(v) < 0 ? PREF.length : PREF.indexOf(v));
        const hit = n !== null && Object.entries(table)
          .filter(([v]) => v !== "button" && (v !== "overline" || allowOverline))
          .map(([v, size]) => [v, Math.abs(size - n)])
          .filter(([, d]) => d <= 1)
          .sort((a, b) => a[1] - b[1] || pref(a[0]) - pref(b[0]))[0];
        if (hit) variant = hit[0];
        else { sx.fontSize = n !== null ? `${(n / 16).toFixed(4).replace(/0+$/, "")}rem` : value; review.push(`font-size: ${value} — no ${theme} variant within 1px; using rem`); }
        break;
      }
      case "font-weight": {
        const w = Number(value);
        if (!(variant && ["h1", "h2", "h3", "h4"].includes(variant) && w === 700)) sx.fontWeight = w || value;
        break;
      }
      case "line-height":
        if (px(value) !== null && props["font-size"]) {
          const ratio = px(value) / px(props["font-size"]);
          if (!variant) sx.lineHeight = Number(ratio.toFixed(2));
          else dropped.push(`line-height: ${value} — variant "${variant}" sets its own (ratio ${ratio.toFixed(2)})`);
        } else dropped.push(`line-height: ${value} — handled by variant`);
        break;
      case "letter-spacing":
        if (value !== "0" && value !== "0px" && value !== "normal") sx.letterSpacing = value;
        break;
      case "text-align": if (value !== "left") sx.textAlign = value; break;
      case "text-transform": sx.textTransform = value; break;
      case "opacity": sx.opacity = Number(value); break;
      case "overflow": sx.overflow = value; break;
      case "white-space": sx.whiteSpace = value; break;
      case "text-decoration": case "text-decoration-line": if (value !== "none") sx.textDecoration = value; break;
      default:
        sx[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
        review.push(`${prop}: ${value} — not handled by the converter; check manually`);
    }
  }

  // layout hint
  let element = "Box";
  if (variant || props["font-size"]) element = `Typography${variant ? ` variant="${variant}"` : ""}`;
  else if (sx.display === "flex") {
    const dir = sx.flexDirection === "column" ? "" : ` direction="row"`;
    const gap = sx.gap !== undefined ? ` spacing={${sx.gap}}` : "";
    element = `Stack${dir}${gap}`;
    delete sx.display; delete sx.flexDirection; if (sx.gap !== undefined) delete sx.gap;
  }
  if (element.startsWith("Typography") && sx.color === "text.primary") delete sx.color; // default
  if (/\b(button|btn)\b|ปุ่ม/i.test(block.name)) {
    const variant = /outlined/i.test(block.name) || (sx.border && sx.bgcolor === "background.paper") ? "outlined"
      : /text|ghost/i.test(block.name) ? "text" : "contained";
    element = `${BUTTON} variant="${variant}"`;
    review.push(`button layer — use ${BUTTON}; the component/theme already sets height, radius, padding, hover, focus and shadow, so drop those from sx`);
    return { name: block.name, element, sx: {}, dropped: [...dropped, `layout/box values of the button (${Object.keys(sx).join(", ")}) — ${BUTTON}/theme own them`], review };
  }
  return { name: block.name, element, sx, dropped, review };
}

const blocks = parseBlocks(css).map(convert);

if (asJson) {
  console.log(JSON.stringify({ theme, blocks }, null, 2));
} else {
  console.log(`theme: ${theme} (${T.wrapper ? `inside <${T.wrapper}>` : "default theme"}) · config: ${cfg.__path}\n`);
  for (const b of blocks) {
    console.log(`── ${b.name}`);
    console.log(`<${b.element} sx={${JSON.stringify(b.sx, null, 0).replace(/"\(t\) => ([^"]+)"/g, "(t) => $1")}} />`);
    for (const d of b.dropped) console.log(`  DROPPED  ${d}`);
    for (const r of b.review) console.log(`  REVIEW   ${r}`);
    console.log();
  }
  const reviews = blocks.reduce((n, b) => n + b.review.length, 0);
  const drops = blocks.reduce((n, b) => n + b.dropped.length, 0);
  console.log(`${blocks.length} layer(s) · ${drops} dropped · ${reviews} to review`);
}
