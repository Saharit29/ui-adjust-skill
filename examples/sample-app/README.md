# sample-app

A deliberately small MUI + TypeScript codebase used to evaluate the `ui-adjust` skill. It is source only (no bundler,
no router) — `npm install && npm run typecheck` is the only thing you can run.

## Conventions

- `src/theme/theme.ts` is the app theme. Screens wrapped in `<DenseSection>` (`src/components/dense-section.tsx`)
  use the compact `src/theme/dense-theme.ts` instead.
- Shared components live in `src/components` and are imported from `@/components`. Use `AppButton` for every button.
- Feature code lives in `src/features/<feature>/{components,pages,utils}`.

`ui-adjust.config.json` was generated with:

```bash
node ../../scripts/init-config.mjs \
  --theme app=src/theme/palette.ts,src/theme/typography.ts \
  --theme dense=src/theme/dense-theme.ts --wrapper dense=DenseSection \
  --components src/components/index.ts --features src/features
```

then hand-edited to add `handled` colors (values the dense theme already applies) and `sizeLocked`.
