#!/usr/bin/env node
// Which theme does a component render under? Walks "who renders <Component>" upwards until it hits
// a theme wrapper declared in ui-adjust.config.json (themes.<name>.wrapper) or runs out of parents.
//
//   node <skill>/scripts/which-theme.mjs src/features/billing/components/balance-badge.tsx
//   node <skill>/scripts/which-theme.mjs <file> --depth 6 --json
//
// Output: one line per render path, e.g.
//   dense   BalanceBadge ← AccountMetersTable ← AccountDetailPage (<DensePage>)
//   app     BalanceBadge ← DashboardPage (no wrapper found → default theme)
// Heuristic: matches `<Name` in .tsx/.jsx files under paths.features (and src/), not real imports.

import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./lib/config.mjs";

const args = process.argv.slice(2);
const cfg = loadConfig(args);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const maxDepth = Number(flag("--depth", 6));
const asJson = args.includes("--json");
const target = args.find((a, i) => !a.startsWith("--") && !["--config", "--depth"].includes(args[i - 1]));
if (!target) { console.error("usage: which-theme.mjs <component file> [--depth n] [--json]"); process.exit(2); }

const wrappers = Object.values(cfg.themes).filter((t) => t.wrapper).map((t) => ({ theme: t.name, tag: t.wrapper }));
const roots = [...new Set([...(cfg.paths.features ?? []), "src", "app"])].filter((d) => fs.existsSync(d));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...new Set(roots.flatMap((r) => walk(r)).map((f) => path.normalize(f)))];
const sources = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));

const exportsOf = (text) => [...text.matchAll(/export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z]\w*)/g)].map((m) => m[1]);
const wrapperIn = (text) => wrappers.find((w) => new RegExp(`<${w.tag}\\b`).test(text));

const results = [];
function climb(file, chain, depth, seen) {
  const text = sources.get(path.normalize(file)) ?? fs.readFileSync(file, "utf8");
  const names = exportsOf(text);
  const here = [...chain, `${names[0] ?? path.basename(file)} (${path.relative(process.cwd(), file).replace(/\\/g, "/")})`];
  if (chain.length) { // the target itself rendering a wrapper doesn't count
    const w = wrapperIn(text);
    if (w) { results.push({ theme: w.theme, via: w.tag, chain: here }); return; }
  }
  if (depth >= maxDepth || names.length === 0) { results.push({ theme: cfg.defaultTheme, via: null, chain: here }); return; }
  const parents = [...sources].filter(([f, t]) => f !== path.normalize(file) && !seen.has(f) &&
    names.some((n) => new RegExp(`<${n}\\b`).test(t)));
  if (parents.length === 0) {
    // a page/route file renders nothing above it → default theme; a component nobody renders is just unused
    const isEntry = /(^|[\\/])(page|layout|route|index|main|App)\.(t|j)sx$/.test(file) || /-page\.(t|j)sx$/.test(file);
    results.push({ theme: chain.length && !isEntry ? "unused" : cfg.defaultTheme, via: null, chain: here });
    return;
  }
  for (const [p] of parents) climb(p, here, depth + 1, new Set([...seen, p]));
}
climb(target, [], 0, new Set([path.normalize(target)]));

const themes = [...new Set(results.filter((r) => r.theme !== "unused").map((r) => r.theme))];
if (asJson) console.log(JSON.stringify({ themes, paths: results }, null, 2));
else {
  for (const r of results) {
    const tail = r.via ? `  [<${r.via}>]` : r.theme === "unused" ? "  [nobody renders the last one — ignore this path]" : "  [no wrapper → default]";
    console.log(`${r.theme.padEnd(10)} ${r.chain.join(" ← ")}${tail}`);
  }
  if (themes.length === 0) { console.log(`\n→ no renderer found — assume ${cfg.defaultTheme} and say so in the report`); process.exit(0); }
  console.log(themes.length === 1
    ? `\n→ theme: ${themes[0]}  (use --theme ${themes[0]})`
    : `\n→ rendered under ${themes.length} themes (${themes.join(", ")}): use semantic tokens only, no hex, and check every context`);
}
