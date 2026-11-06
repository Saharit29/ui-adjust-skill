// Figma layer (parsed CSS props) → Tailwind utility classes, using the project's theme tokens.
// Mirrors the MUI converter's three outputs: classes, DROPPED (Figma noise), REVIEW (needs a decision).

import { mapColor, normalizeHex, rgbToHex } from "./config.mjs";

const px = (v) => {
  const m = String(v).match(/^(-?\d+(?:\.\d+)?)px$/);
  return m ? Number(m[1]) : null;
};

const DROP_ALWAYS = {
  position: "absolute/relative positioning from the Figma artboard — use flex/grid layout",
  left: "artboard coordinate", top: "artboard coordinate", right: "artboard coordinate", bottom: "artboard coordinate",
  "font-family": "the theme's --font-sans already sets it",
  "font-style": "default", order: "Figma auto-layout index", "flex-grow": "Figma auto-layout default (0)",
  flex: "Figma auto-layout default (`none`)", "box-sizing": "Tailwind preflight already uses border-box",
  isolation: "Figma artefact", "font-feature-settings": "Figma artefact", "mix-blend-mode": "Figma artefact",
};

const WEIGHTS = { 100: "thin", 200: "extralight", 300: "light", 400: "normal", 500: "medium", 600: "semibold", 700: "bold", 800: "extrabold", 900: "black" };
const ALIGN = { "flex-start": "start", start: "start", center: "center", "flex-end": "end", end: "end", stretch: "stretch", baseline: "baseline" };
const JUSTIFY = { "flex-start": "start", start: "start", center: "center", "flex-end": "end", end: "end", "space-between": "between", "space-around": "around", "space-evenly": "evenly" };

export function convertTailwind(block, { cfg, theme, button }) {
  const classes = [];
  const dropped = [];
  const review = [];
  const props = Object.fromEntries(block.props);
  const unit = cfg.spacingUnit ?? 4;
  let isText = false;

  const scale = (value, prefix, label = prefix) => {
    const n = px(value);
    if (n === null) { review.push(`${label}: ${value} — not px; check manually`); return null; }
    if (n === 0) return `${prefix}-0`;
    const steps = n / unit;
    if (Number.isInteger(steps * 2)) return `${prefix}-${steps}`; // 0.5 steps = 2px with the default scale
    review.push(`${label}: ${value} is off the ${unit}px spacing scale — arbitrary value used; round it unless the design insists`);
    return `${prefix}-[${n}px]`;
  };

  const color = (raw, utility, label) => {
    let hex = normalizeHex(raw);
    let alpha = null;
    const rgba = String(raw).match(/rgba?\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/);
    if (rgba) {
      hex = rgbToHex(rgba[1], rgba[2], rgba[3]);
      if (rgba[4] !== undefined) {
        const a = rgba[4].endsWith("%") ? Number(rgba[4].slice(0, -1)) / 100 : Number(rgba[4]);
        if (a < 1) alpha = Math.round(a * 100);
      }
    }
    if (!hex) { review.push(`${label}: \`${raw}\` — not a plain color (gradient/var?) — check the design`); return null; }
    const hit = mapColor(hex, theme, cfg.nearThreshold);
    const withAlpha = (c) => (alpha !== null ? `${c}/${alpha}` : c);
    if (hit.kind === "theme-handled") { review.push(`${label}: ${hex} — ${hit.note}; leave it out`); return null; }
    if (hit.kind === "exact") return withAlpha(`${utility}-${hit.token}`);
    if (hit.kind === "near") {
      review.push(`${label}: ${hex} ≈ ${hit.token} (${hit.from}, Δ${hit.d}) — snapped to the token; mention it in the report`);
      return withAlpha(`${utility}-${hit.token}`);
    }
    review.push(`${label}: ${hex} OFF-PALETTE (nearest ${hit.nearest}) — add a token to @theme or keep the arbitrary value with a // figma: comment; ask if it's reused`);
    return withAlpha(`${utility}-[${hex}]`);
  };

  const box = (value, kind) => { // padding / margin shorthand
    const p = value.split(/\s+/);
    const [t, r = t, b = t, l = r] = p;
    const pre = kind === "padding" ? "p" : "m";
    if (t === r && r === b && b === l) return [scale(t, pre, kind)];
    if (t === b && r === l) return [scale(t, `${pre}y`, kind), scale(r, `${pre}x`, kind)];
    return [scale(t, `${pre}t`, kind), scale(r, `${pre}r`, kind), scale(b, `${pre}b`, kind), scale(l, `${pre}l`, kind)];
  };

  for (const [prop, value] of block.props) {
    if (DROP_ALWAYS[prop]) {
      if (!(prop === "position" && value === "static")) dropped.push(`${prop}: ${value} — ${DROP_ALWAYS[prop]}`);
      continue;
    }
    switch (prop) {
      case "width": case "height": {
        if (px(value) !== null) dropped.push(`${prop}: ${value} — fixed artboard size; let content/flex decide (keep only for icons/avatars/icon frames: size-*)`);
        else if (value !== "auto") classes.push(`${prop === "width" ? "w" : "h"}-[${value}]`);
        break;
      }
      case "max-width": {
        const n = px(value);
        const hit = n !== null && Object.entries(theme.containers ?? {}).find(([, v]) => v === n);
        classes.push(hit ? `max-w-${hit[0]}` : `max-w-[${value}]`);
        break;
      }
      case "min-width": classes.push(`min-w-[${value}]`); break;
      case "min-height": classes.push(`min-h-[${value}]`); break;
      case "display":
        if (value === "flex" || value === "inline-flex" || value === "grid" || value === "inline-grid" || value === "block" || value === "inline-block") classes.push(value);
        else if (value !== "none") classes.push(value);
        break;
      case "flex-direction": if (value === "column") classes.push("flex-col"); else if (value === "row-reverse") classes.push("flex-row-reverse"); else if (value === "column-reverse") classes.push("flex-col-reverse"); break;
      case "align-items": if (ALIGN[value]) classes.push(`items-${ALIGN[value]}`); break;
      case "justify-content": if (JUSTIFY[value]) classes.push(`justify-${JUSTIFY[value]}`); break;
      case "flex-wrap": if (value === "wrap") classes.push("flex-wrap"); break;
      case "align-self":
        if (value === "stretch") dropped.push(`align-self: stretch — Figma "fill container"; usually the default in a column`);
        else if (ALIGN[value]) classes.push(`self-${ALIGN[value]}`);
        break;
      case "gap": classes.push(scale(value, "gap")); break;
      case "row-gap": classes.push(scale(value, "gap-y")); break;
      case "column-gap": classes.push(scale(value, "gap-x")); break;
      case "padding": case "margin": classes.push(...box(value, prop)); break;
      case "border-radius": {
        const n = px(value);
        if (value === "50%" || (n ?? 0) >= 100) { classes.push("rounded-full"); break; }
        const hit = n !== null && Object.entries(theme.radius ?? {}).find(([, v]) => v === n);
        if (hit) classes.push(hit[0] === "DEFAULT" ? "rounded" : `rounded-${hit[0]}`);
        else { classes.push(`rounded-[${value}]`); review.push(`border-radius: ${value} — no radius token; arbitrary value used`); }
        break;
      }
      case "border": case "border-top": case "border-bottom": case "border-left": case "border-right": {
        const side = { border: "", "border-top": "-t", "border-bottom": "-b", "border-left": "-l", "border-right": "-r" }[prop];
        const m = value.match(/^(\d+(?:\.\d+)?)px\s+(solid|dashed|dotted)\s+(.+)$/);
        if (!m) { review.push(`${prop}: ${value} — check manually`); break; }
        classes.push(Number(m[1]) === 1 ? `border${side}` : `border${side}-${m[1]}`);
        if (m[2] !== "solid") classes.push(`border-${m[2]}`);
        const c = color(m[3], "border", prop);
        if (c) classes.push(c);
        break;
      }
      case "background": case "background-color": { const c = color(value, "bg", prop); if (c) classes.push(c); break; }
      case "color": { const c = color(value, "text", "color"); if (c) classes.push(c); break; }
      case "box-shadow": {
        const norm = (v) => v.replace(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*[,/]\s*([\d.]+)\s*\)/g, "rgb($1 $2 $3 / $4)")
          .replace(/(\d)px/g, "$1").replace(/\s+/g, " ").trim();
        const hit = Object.entries(theme.shadows ?? {}).find(([, v]) => norm(v) === norm(value));
        if (hit) classes.push(hit[0] === "DEFAULT" ? "shadow" : `shadow-${hit[0]}`);
        else review.push(`box-shadow: ${value} — matches no shadow token (${Object.keys(theme.shadows ?? {}).join(", ") || "none"}); pick the nearest or use a border`);
        break;
      }
      case "font-size": {
        isText = true;
        const n = px(value);
        const hit = n !== null && Object.entries(theme.typography ?? {})
          .map(([k, size]) => [k, Math.abs(size - n)]).filter(([, d]) => d <= 1).sort((a, b) => a[1] - b[1])[0];
        if (hit) classes.push(`text-${hit[0]}`);
        else { classes.push(`text-[${value}]`); review.push(`font-size: ${value} — no text-* size within 1px; arbitrary value used`); }
        break;
      }
      case "font-weight": {
        isText = true;
        if (Number(value) === 400) break; // default weight
        const w = WEIGHTS[Number(value)];
        classes.push(w ? `font-${w}` : `font-[${value}]`);
        break;
      }
      case "line-height":
        dropped.push(`line-height: ${value} — text-* sizes carry their own line height; add leading-* only if the design clearly differs`);
        break;
      case "letter-spacing": if (!["0", "0px", "normal"].includes(value)) { classes.push(`tracking-[${value}]`); review.push(`letter-spacing: ${value} — check for a tracking-* token`); } break;
      case "text-align": if (value !== "left" && value !== "start") classes.push(`text-${value}`); break;
      case "text-transform": if (value === "uppercase") classes.push("uppercase"); else if (value === "lowercase") classes.push("lowercase"); else if (value === "capitalize") classes.push("capitalize"); break;
      case "opacity": classes.push(`opacity-${Math.round(Number(value) * 100)}`); break;
      case "overflow": classes.push(`overflow-${value}`); break;
      case "white-space": if (value === "nowrap") classes.push("whitespace-nowrap"); else classes.push(`whitespace-${value}`); break;
      case "text-decoration": case "text-decoration-line": if (value === "underline") classes.push("underline"); break;
      default:
        review.push(`${prop}: ${value} — not handled by the converter; check manually`);
    }
  }

  // text default color is usually inherited from the page — keep it, but flag the common case
  let element = isText ? "span / p" : props.display === "flex" || props.display === "inline-flex" ? "div (flex)" : "div";
  const final = classes.filter(Boolean);

  if (/\b(button|btn)\b|ปุ่ม/i.test(block.name)) {
    const variant = /outlined?/i.test(block.name) || props.border ? "outline" : /text|ghost/i.test(block.name) ? "ghost" : "primary";
    const C = button ?? "button";
    review.push(`button layer — use ${C}${button ? ` variant="${variant}"` : ""}; it owns height, padding, radius, font weight, shadow and hover/focus, so don't pass those as className`);
    return { name: block.name, element: `${C}${button ? ` variant="${variant}"` : ""}`, classes: [], dropped: [...dropped, `box/text classes of the button (${final.join(" ")}) — ${C} owns them`], review };
  }
  return { name: block.name, element, classes: final, dropped, review };
}
