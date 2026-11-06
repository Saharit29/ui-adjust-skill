#!/usr/bin/env node
// Audit MUI UI code for the mistakes that show up when a Figma design is copied into a project.
// Token tables, component names and paths come from ui-adjust.config.json.
//
//   node <skill>/scripts/check-ui.mjs <file.tsx> [...more]   # whole files
//   node <skill>/scripts/check-ui.mjs --diff                  # only lines added vs HEAD (all changed .tsx)
//   node <skill>/scripts/check-ui.mjs --diff <file.tsx>       # only added lines of that file
//   add --json for machine-readable output, --config <path> for a non-default config
//
// FAIL = must fix before done · WARN = fix or justify in the report.
// Exit code 1 when any FAIL is found, so it can run in a hook.

import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { loadConfig, normalizeHex, tokenIndex, describeToken } from "./lib/config.mjs";

const args = process.argv.slice(2);
const diffMode = args.includes("--diff");
const asJson = args.includes("--json");
let files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--config");

const cfg = loadConfig(args);
const index = tokenIndex(cfg);
const tokenHexes = new Set(index.keys());
const tokenName = (hex) => {
  if (hex === "#FFFFFF") return "background.paper (surface) / common.white (text/icon on a filled color)";
  return describeToken(index, hex);
};
const norm = (f) => f.replace(/\\/g, "/");
const rel = (file) => norm(path.relative(process.cwd(), path.resolve(file)));
// a path entry can be a directory (prefix match) or a single file (exact match)
const under = (file, dirs) => dirs.some((d) => rel(file) === norm(d) || rel(file).startsWith(norm(d).replace(/\/?$/, "/")));
const isThemeFile = (file) => under(file, cfg.paths.themeSources ?? []);
const isFeatureFile = (file) => under(file, cfg.paths.features ?? ["src"]);
const C = cfg.components ?? {};
const BUTTON = C.button;
const DIALOGS = [C.dialog, C.confirmDialog].filter(Boolean);
const SIZED = [C.button, C.dialog, ...(C.sizeLocked ?? [])].filter(Boolean);

function addedLines(file) {
  try {
    const tracked = execSync(`git ls-files -- "${file}"`, { encoding: "utf8" }).trim();
    if (!tracked) return null; // untracked → every line is new
    const out = execSync(`git diff -U0 HEAD -- "${file}"`, { encoding: "utf8" });
    const lines = new Set();
    for (const m of out.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      for (let i = 0; i < count; i++) lines.add(start + i);
    }
    return lines;
  } catch {
    return null;
  }
}

if (diffMode && files.length === 0) {
  const changed = execSync("git diff --name-only HEAD", { encoding: "utf8" }).split("\n");
  const untracked = execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).split("\n");
  files = [...changed, ...untracked].filter((f) => /\.(tsx|jsx|vue|svelte|astro|html)$/.test(f) && fs.existsSync(f));
}
if (files.length === 0) {
  console.error("usage: check-ui.mjs [--diff] [--json] <file.tsx|.jsx|.vue|.svelte|.html ...>");
  process.exit(2);
}

/** Find the full opening tag text of every <Name ...> (handles `=>` and nested braces). */
function openingTags(text, name) {
  const tags = [];
  const re = new RegExp(`<${name}\\b`, "g");
  let m;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index + 1;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && text[i - 1] !== "=") break;
    }
    tags.push({ index: m.index, text: text.slice(m.index, i + 1) });
  }
  return tags;
}
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

const RULES = [
  {
    id: "token-hex", level: "FAIL",
    desc: "hex literal equals a theme token — use the token path",
    scan: (line) => [...line.matchAll(/["'`](#[0-9A-Fa-f]{3,8})["'`]/g)]
      .map((m) => normalizeHex(m[1]))
      .filter((h) => h && tokenHexes.has(h))
      .map((h) => `${h} → ${tokenName(h)}`),
  },
  {
    id: "off-palette-hex", level: "WARN",
    desc: "hex not in either theme — must be a named const (with design source) or a palette addition, never inline in sx",
    scan: (line) => {
      // allowed: a named UPPER_CASE const, or any line that cites its design source (`// figma: <layer>`)
      if (/^\s*(export\s+)?const\s+[A-Z0-9_]+\s*=/.test(line) || /\/\/\s*figma/i.test(line)) return [];
      if (!/sx=|sx:|style=|color=|bgcolor|borderColor|background/.test(line)) return [];
      return [...line.matchAll(/["'`](#[0-9A-Fa-f]{3,8})["'`]/g)]
        .map((m) => normalizeHex(m[1]))
        .filter((h) => h && !tokenHexes.has(h) && h !== "#000000");
    },
  },
  {
    id: "font-family", level: "FAIL",
    desc: "fontFamily override — the theme already sets the font family",
    scan: (line) => (/fontFamily\s*:/.test(line) ? ["fontFamily"] : []),
  },
  {
    id: "important", level: "FAIL",
    desc: "!important — raise specificity with the right selector or a theme override instead",
    scan: (line) => (/!important/.test(line) ? ["!important"] : []),
  },
  {
    id: "absolute-coords", level: "WARN",
    desc: "absolute position with fixed coordinates — usually copied from the Figma artboard",
    scan: (line) => (/position\s*:\s*["']absolute["']/.test(line) && /(top|left)\s*:\s*["']?\d{2,}/.test(line) ? ["absolute + coords"] : []),
  },
  {
    id: "px-spacing", level: "WARN",
    desc: `px string for spacing — use theme spacing units (1 = ${cfg.spacingUnit}px)`,
    scan: (line) => [...line.matchAll(/\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|padding|margin|rowGap|columnGap)\s*:\s*["'](\d+px(?:\s+\d+px)*)["']/g)]
      .filter((m) => m[2].split(/\s+/).every((v) => Number.parseInt(v, 10) % 4 === 0))
      .map((m) => `${m[1]}: "${m[2]}"`),
  },
  {
    id: "px-font-size", level: "WARN",
    desc: "fontSize in px — prefer a Typography variant (check the ambient theme's sizes)",
    scan: (line) => (/fontSize\s*:\s*["']\d+px["']/.test(line) && !/Icon/.test(line) ? ["fontSize px"] : []),
  },
  {
    id: "raw-shadow", level: "WARN",
    desc: "literal box-shadow — use a theme elevation index (boxShadow: <n>) or a divider border",
    scan: (line) => (/boxShadow\s*:\s*["'`][^"'`]*rgba?\(/.test(line) ? ["boxShadow literal"] : []),
  },
];

// ── Tailwind: arbitrary values that should be theme utilities ──
const T0 = Object.values(cfg.themes)[0];
const TW_COLOR_UTIL = "bg|text|border(?:-[trblxy])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|decoration|accent|caret|placeholder";
const strings = (line) => [...line.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
const twClasses = (line) => strings(line).flatMap((s) => s.split(/\s+/)).filter(Boolean);
const nearestKey = (table, n) => Object.entries(table ?? {}).find(([, v]) => Math.abs(v - n) < 0.01)?.[0];
const TW_RULES = [
  {
    id: "tw-token-arbitrary", level: "FAIL",
    desc: "arbitrary color equals a theme token — use the utility (bg-[#FEF3F2] → bg-danger-50)",
    scan: (line) => twClasses(line).flatMap((c) => {
      const m = c.match(new RegExp(`^((?:[\\w-]+:)*)(${TW_COLOR_UTIL})-\\[(#[0-9A-Fa-f]{3,8})\\](\\/\\d+)?$`));
      const hex = m && normalizeHex(m[3]);
      if (!hex || !tokenHexes.has(hex)) return [];
      return [`${c} → ${m[1]}${m[2]}-${describeToken(index, hex)}${m[4] ?? ""}`];
    }),
  },
  {
    id: "tw-offpalette-arbitrary", level: "WARN",
    desc: "arbitrary color not in the theme — add a token to @theme / tailwind.config, or justify with a `figma:` comment",
    scan: (line) => (/figma/i.test(line) ? [] : twClasses(line).flatMap((c) => {
      const m = c.match(new RegExp(`(${TW_COLOR_UTIL})-\\[(#[0-9A-Fa-f]{3,8})\\]`));
      const hex = m && normalizeHex(m[2]);
      return hex && !tokenHexes.has(hex) ? [c] : [];
    })),
  },
  {
    id: "tw-arbitrary-spacing", level: "WARN",
    desc: `arbitrary px on the spacing scale — use the scale (1 = ${cfg.spacingUnit}px): p-[16px] → p-${16 / cfg.spacingUnit}`,
    scan: (line) => twClasses(line).flatMap((c) => {
      const m = c.match(/^((?:[\w-]+:)*-?)(p[trblxy]?|m[trblxy]?|gap(?:-[xy])?|space-[xy]|w|h|size|min-w|min-h|top|left|right|bottom|inset(?:-[xy])?)-\[(\d+(?:\.\d+)?)px\]$/);
      if (!m) return [];
      const steps = Number(m[3]) / cfg.spacingUnit;
      // large offsets are artboard coordinates (tw-absolute-coords), not spacing
      if (/^(top|left|right|bottom|inset)/.test(m[2]) && steps > 24) return [];
      return Number.isInteger(steps * 2) ? [`${c} → ${m[1]}${m[2]}-${steps}`] : [];
    }),
  },
  {
    id: "tw-arbitrary-text", level: "WARN",
    desc: "arbitrary font size that matches a text-* size — use it (text-[14px] → text-sm)",
    scan: (line) => twClasses(line).flatMap((c) => {
      const m = c.match(/^(?:[\w-]+:)*text-\[(\d+(?:\.\d+)?)(px|rem)\]$/);
      if (!m) return [];
      const k = nearestKey(T0?.typography, Number(m[1]) * (m[2] === "rem" ? 16 : 1));
      return k ? [`${c} → text-${k}`] : [];
    }),
  },
  {
    id: "tw-arbitrary-radius", level: "WARN",
    desc: "arbitrary radius that matches a rounded-* token — use it (rounded-[6px] → rounded-md)",
    scan: (line) => twClasses(line).flatMap((c) => {
      const m = c.match(/^(?:[\w-]+:)*rounded(-[trbl]{1,2}|-[se]{1,2})?-\[(\d+(?:\.\d+)?)px\]$/);
      if (!m) return [];
      const k = nearestKey(T0?.radius, Number(m[2]));
      return k ? [`${c} → rounded${m[1] ?? ""}${k === "DEFAULT" ? "" : `-${k}`}`] : [];
    }),
  },
  {
    id: "tw-font-family", level: "FAIL",
    desc: "arbitrary font family — the theme's font-sans already applies",
    scan: (line) => twClasses(line).filter((c) => /^(?:[\w-]+:)*font-\[['"]?[A-Za-z]/.test(c) && !/^font-\[\d/.test(c)),
  },
  {
    id: "tw-important", level: "FAIL",
    desc: "important modifier (!p-4 / p-4!) — fix the class order or the component API instead",
    scan: (line) => twClasses(line).filter((c) => /^(?:[\w-]+:)*![a-z]/.test(c) || /^[a-z][\w\-[\]/.:#]*[\w\]]!$/.test(c)),
  },
  {
    id: "tw-absolute-coords", level: "WARN",
    desc: "absolute + artboard coordinates — usually copied from the Figma frame",
    scan: (line) => (twClasses(line).includes("absolute") && twClasses(line).some((c) => /^(left|top|right|bottom)-\[\d{3,}px\]$/.test(c)) ? ["absolute + coords"] : []),
  },
  {
    id: "tw-arbitrary-shadow", level: "WARN",
    desc: "arbitrary shadow — use a shadow-* token or a border",
    scan: (line) => twClasses(line).filter((c) => /^(?:[\w-]+:)*shadow-\[/.test(c)),
  },
];
RULES.push(...TW_RULES);

const FILE_RULES = [
  {
    id: "icon-button-label", level: "FAIL",
    desc: "IconButton without aria-label/title — screen readers announce nothing",
    scan: (text) => openingTags(text, "IconButton")
      .filter((t) => !/aria-label|aria-labelledby|title=/.test(t.text))
      .map((t) => ({ line: lineOf(text, t.index), hit: "<IconButton>" })),
  },
  {
    id: "shared-size-override", level: "WARN",
    desc: `${SIZED.join("/") || "shared component"} sx overrides height/radius/shadow/weight — that is the design-system standard; report it as a deviation or ask, don't fight the component`,
    scan: (text) => SIZED.flatMap((name) => openingTags(text, name)
      .filter((t) => /sx=\{[\s\S]*\b(minHeight|height|borderRadius|boxShadow|fontWeight)\s*:/.test(t.text) ||
        /className=[\s\S]*(?:^|["'`\s])(?:[\w-]+:)*(h-|min-h-|rounded|shadow|font-(?:thin|light|normal|medium|semibold|bold|black)\b)/.test(t.text))
      .map((t) => ({ line: lineOf(text, t.index), hit: `<${name}> size/shape override in sx/className` }))),
  },
  {
    id: "icon-aria-label", level: "FAIL",
    desc: "aria-label on an *Icon component is usually ignored — MUI SvgIcon and most icon kits set aria-hidden unless given a title (MUI: titleAccess) — use that prop, or put the label on the wrapper/text",
    scan: (text) => [...text.matchAll(/<[A-Z][A-Za-z]*Icon\b/g)]
      .map((m) => openingTags(text.slice(m.index), m[0].slice(1))[0])
      .filter(Boolean)
      .filter((t) => /aria-label=/.test(t.text) && !/titleAccess/.test(t.text))
      .map((t) => ({ line: lineOf(text, text.indexOf(t.text)), hit: "Icon aria-label" })),
  },
  {
    id: "raw-mui-button", level: "WARN",
    desc: `@mui Button in a feature — use ${BUTTON ?? "the project's button component"} unless it's a plain text link`,
    scan: (text, file) => {
      if (!BUTTON || !isFeatureFile(file)) return [];
      const m = text.match(/import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*["']@mui\/material["']|import\s+Button\s+from\s*["']@mui\/material\/Button["']/);
      return m ? [{ line: lineOf(text, m.index), hit: "import Button" }] : [];
    },
  },
  {
    id: "adhoc-dialog", level: "WARN",
    desc: `hand-built Dialog+DialogTitle — use ${DIALOGS.join(" / ") || "the project's dialog component"}`,
    scan: (text, file) => {
      if (DIALOGS.length === 0 || !isFeatureFile(file)) return [];
      if (!/<Dialog\b/.test(text) || !/<DialogTitle\b/.test(text)) return [];
      return [{ line: lineOf(text, text.indexOf("<Dialog")), hit: "<Dialog> + <DialogTitle>" }];
    },
  },
];

const results = [];
for (const file of files) {
  if (isThemeFile(file)) continue; // theme sources are allowed to hold literals
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const scope = diffMode ? addedLines(file) : null;
  const inScope = (n) => !scope || scope.has(n);
  const findings = [];
  lines.forEach((line, i) => {
    if (!inScope(i + 1) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const rule of RULES) {
      for (const hit of rule.scan(line)) findings.push({ rule: rule.id, level: rule.level, line: i + 1, hit });
    }
  });
  for (const rule of FILE_RULES) {
    for (const f of rule.scan(text, file)) {
      if (inScope(f.line)) findings.push({ rule: rule.id, level: rule.level, line: f.line, hit: f.hit });
    }
  }
  results.push({ file, findings });
}

const fails = results.flatMap((r) => r.findings).filter((f) => f.level === "FAIL").length;
const warns = results.flatMap((r) => r.findings).filter((f) => f.level === "WARN").length;
const totalRules = RULES.length + FILE_RULES.length;

if (asJson) {
  console.log(JSON.stringify({ fails, warns, results }, null, 2));
} else {
  const allRules = Object.fromEntries([...RULES, ...FILE_RULES].map((r) => [r.id, r]));
  for (const r of results) {
    const broken = new Set(r.findings.map((f) => f.rule));
    console.log(`${r.file}  (${totalRules - broken.size}/${totalRules} rules clean)`);
    for (const f of r.findings) console.log(`  ${f.level} ${f.rule}  L${f.line}  ${f.hit}`);
    if (r.findings.length === 0) console.log("  PASS");
  }
  console.log(`\n${fails} FAIL · ${warns} WARN${diffMode ? " (added lines only)" : ""}`);
  if (fails || warns) {
    const seen = new Set(results.flatMap((r) => r.findings.map((f) => f.rule)));
    for (const id of seen) console.log(`  ${id}: ${allRules[id].desc}`);
  }
}
process.exit(fails ? 1 : 0);
