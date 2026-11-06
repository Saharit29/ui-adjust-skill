#!/usr/bin/env node
// Generate a first-draft ui-adjust.config.json from a project's theme files.
//
// MUI:
//   node <skill>/scripts/init-config.mjs \
//     --theme app=src/theme/palette.ts,src/theme/typography.ts \
//     --theme dense=src/theme/dense-theme.ts --wrapper dense=DensePage \
//     --components src/components/index.ts \
//     [--features src/features] [--out ui-adjust.config.json] [--force]
//
// Tailwind CSS (v4 CSS @theme, or a v3 tailwind.config.*):
//   node <skill>/scripts/init-config.mjs --tailwind src/app.css --components src/components/ui
//
// --components accepts a barrel file (index.ts) or a directory of component files.
//
// The first --theme without a --wrapper becomes "defaultTheme". Re-run with --check to verify an
// existing config's colors still exist in its theme sources (drift after a theme change).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTheme } from "./lib/theme-scan.mjs";
import { extractTailwindTheme } from "./lib/tailwind-scan.mjs";
import { findConfigPath, normalizeHex } from "./lib/config.mjs";

const argv = process.argv.slice(2);
const all = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] ? [argv[i + 1]] : []));
const one = (flag, fallback) => all(flag)[0] ?? fallback;
const cwd = process.cwd();

// ── --check: drift detection ──
if (argv.includes("--check")) {
  const p = findConfigPath(argv, cwd);
  if (!p) { console.error("no config to check"); process.exit(2); }
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  let drift = 0;
  if (cfg.format === "tailwind") {
    for (const [name, t] of Object.entries(cfg.themes)) {
      const { theme: fresh } = extractTailwindTheme({ cwd, sources: t.sources ?? [], normalizeHex });
      const have = new Set(Object.keys(t.colors ?? {}).map((h) => normalizeHex(h)));
      for (const hex of have) {
        if (!fresh.colors[hex]) { console.log(`DRIFT ${name}: ${hex} (${t.colors[hex]}) is no longer in the theme`); drift++; }
      }
      for (const [hex, token] of Object.entries(fresh.colors)) {
        if (!have.has(hex)) { console.log(`NEW   ${name}: ${hex} (${token}) is in the theme but not in the config`); drift++; }
      }
      for (const k of ["typography", "radius"]) {
        for (const [key, v] of Object.entries(fresh[k])) {
          if (t[k]?.[key] !== v) { console.log(`DRIFT ${name}: ${k}.${key} = ${v} (config: ${t[k]?.[key]})`); drift++; }
        }
      }
    }
    console.log(drift ? `${drift} difference(s) — update ${path.relative(cwd, p)}` : "config in sync with theme sources");
    process.exit(drift ? 1 : 0);
  }
  for (const [name, t] of Object.entries(cfg.themes)) {
    const text = (t.sources ?? []).map((s) => fs.readFileSync(path.join(cwd, s), "utf8")).join("\n").toUpperCase();
    if (!text) { console.log(`skip ${name}: no "sources"`); continue; }
    const fresh = extractTheme((t.sources ?? []).map((s) => fs.readFileSync(path.join(cwd, s), "utf8")), normalizeHex);
    for (const hex of Object.keys(t.colors ?? {})) {
      const h = normalizeHex(hex);
      if (h && !text.includes(h)) { console.log(`DRIFT ${name}: ${h} (${t.colors[hex]}) is no longer in ${t.sources.join(", ")}`); drift++; }
    }
    for (const hex of Object.keys(fresh.colors)) {
      if (!Object.keys(t.colors ?? {}).some((h) => normalizeHex(h) === hex)) {
        console.log(`NEW   ${name}: ${hex} (${fresh.colors[hex]}) is in the theme but not in the config`);
        drift++;
      }
    }
  }
  console.log(drift ? `${drift} difference(s) — update ${path.relative(cwd, p)}` : "config in sync with theme sources");
  process.exit(drift ? 1 : 0);
}

const themeArgs = all("--theme");
const tailwindArg = one("--tailwind");
if (themeArgs.length === 0 && !tailwindArg) {
  console.error("usage: init-config.mjs (--theme <name>=<file>[,<file>] [--wrapper <name>=<Component>] | --tailwind <app.css|tailwind.config.js>) [--components <index.ts|dir>] [--out file]");
  process.exit(2);
}
const wrappers = Object.fromEntries(all("--wrapper").map((w) => w.split("=")));

const themes = {};
let tailwindSpacing = null;
if (tailwindArg) {
  const sources = tailwindArg.split(",").map((f) => f.trim()).filter(Boolean);
  const { theme, notes, customCount, version } = extractTailwindTheme({ cwd, sources, normalizeHex });
  tailwindSpacing = theme.spacingUnit ?? 4;
  delete theme.spacingUnit;
  themes.default = { sources, ...theme, handled: {} };
  console.error(`tailwind v${version}: ${Object.keys(theme.colors).length} colors (${customCount} from the project), ` +
    `${Object.keys(theme.typography).length} text sizes, ${Object.keys(theme.radius).length} radii · ${notes.join(" · ")}`);
}
for (const arg of themeArgs) {
  const [name, files] = arg.split("=");
  const sources = files.split(",").map((f) => f.trim()).filter(Boolean);
  const texts = sources.map((f) => fs.readFileSync(path.join(cwd, f), "utf8"));
  const { colors, typography } = extractTheme(texts, normalizeHex);
  themes[name] = {
    ...(wrappers[name] ? { wrapper: wrappers[name] } : {}),
    sources,
    colors,
    typography,
    handled: {},
    shadows: {},
  };
  console.error(`${name}: ${Object.keys(colors).length} colors, ${Object.keys(typography).length} type sizes from ${sources.join(", ")}`);
}

// shared component catalog: exported PascalCase names from a barrel file
let catalog = [];
const componentsIndex = one("--components");
if (componentsIndex) {
  const abs = path.join(cwd, componentsIndex);
  // a directory (e.g. shadcn's components/ui): read every component file; .vue/.svelte → PascalCased file name
  const text = fs.statSync(abs).isDirectory()
    ? fs.readdirSync(abs)
      .filter((f) => /\.(tsx|jsx|ts|js|vue|svelte)$/.test(f))
      .map((f) => (/\.(vue|svelte)$/.test(f)
        ? `export const ${f.replace(/\.\w+$/, "").replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase())} = 1`
        : fs.readFileSync(path.join(abs, f), "utf8")))
      .join("\n")
    : fs.readFileSync(abs, "utf8");
  catalog = [...new Set([...text.matchAll(/export\s*\{([^}]+)\}|export\s+(?:function|const)\s+([A-Z]\w*)/g)]
    .flatMap((m) => (m[1] ? m[1].split(",") : [m[2]]))
    .map((s) => s.trim().split(/\s+as\s+/).pop())
    .filter((s) => /^[A-Z]/.test(s) && !/^type\b/.test(s)))];
}
const guess = (re) => catalog.find((n) => re.test(n)) ?? null;

const out = one("--out", "ui-adjust.config.json");
const schemaFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates", "ui-adjust.config.schema.json");

const config = {
  $schema: path.relative(path.dirname(path.resolve(out)), schemaFile).replace(/\\/g, "/"),
  ...(tailwindArg ? { format: "tailwind" } : {}),
  defaultTheme: Object.keys(themes).find((n) => !themes[n].wrapper) ?? Object.keys(themes)[0],
  spacingUnit: tailwindArg ? tailwindSpacing : 8,
  ...(tailwindArg ? {} : { radiusUnit: 8 }),
  themes,
  components: {
    button: guess(/^App?Button$|Button$/),
    dialog: guess(/^App?Dialog$/),
    confirmDialog: guess(/Confirm/),
    emptyState: guess(/EmptyState$/),
    table: guess(/(Data)?Table$/),
    import: componentsIndex ? componentsIndex.replace(/^src\//, "@/").replace(/\/index\.tsx?$/, "").replace(/\.tsx?$/, "") : null,
    sizeLocked: [],
    catalog,
  },
  paths: {
    features: [one("--features", "src")],
    // MUI: the theme folders · Tailwind: the theme files themselves (app.css usually sits next to feature code)
    themeSources: [...new Set(Object.values(themes).flatMap((t) => t.sources.map((s) => (tailwindArg ? s : path.dirname(s)))))],
  },
  docs: [],
};

if (fs.existsSync(out) && !argv.includes("--force")) {
  console.error(`${out} exists — pass --force to overwrite (or --out another file)`);
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify(config, null, 2) + "\n");
console.error(`wrote ${out} — review it: fill "handled" (colors the theme applies itself), "shadows", and component roles`);
