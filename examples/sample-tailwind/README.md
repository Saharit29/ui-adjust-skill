# sample-tailwind

A deliberately small React + Tailwind CSS v4 + TypeScript codebase used to evaluate the `ui-adjust` skill.
Source only (no bundler, no router) — `npm install && npm run typecheck` is the only thing you can run.

## Conventions

- Design tokens live in the `@theme` block of `src/app.css` (`brand-*`, `ink*`, `canvas`, `surface`, `line`, `danger-*`, `success-*`).
  Tailwind's default palette and scales are available too.
- Shared UI lives in `src/components/ui` and is imported from `@/components/ui`. Use `Button` for every button and link-button.
- Feature code lives in `src/features/<feature>/{components,pages,utils}`. Merge classes with `cn()` from `@/lib/cn`.

`ui-adjust.config.json` was generated with:

```bash
node ../../scripts/init-config.mjs --tailwind src/app.css --components src/components/ui --features src/features
```
