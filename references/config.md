# ui-adjust.config.json

ไฟล์เดียวที่บอก skill ว่า design system ของโปรเจกต์หน้าตาเป็นอย่างไร วางไว้ที่ root ของโปรเจกต์ หรือ `.claude/ui-adjust.config.json`
(สคริปต์ทุกตัวรับ `--config <path>` ได้) ตัวอย่างเต็มอยู่ที่ [templates/ui-adjust.config.example.json](../templates/ui-adjust.config.example.json)
schema สำหรับ editor อยู่ที่ [templates/ui-adjust.config.schema.json](../templates/ui-adjust.config.schema.json)

## สร้างครั้งแรก

```bash
node <skill>/scripts/init-config.mjs \
  --theme app=src/theme/palette.ts,src/theme/typography.ts \
  --theme dense=src/theme/dense-theme.ts --wrapper dense=DenseSection \
  --components src/components/index.ts \
  --features src/features
```

| flag | ความหมาย |
|---|---|
| `--theme <name>=<file>[,<file>]` | ไฟล์ที่มี palette/typography ของ theme นั้น (ใส่ได้หลาย theme) |
| `--wrapper <name>=<Component>` | component ที่ครอบ `ThemeProvider` ของ theme นั้น (theme ที่ไม่มี wrapper = `defaultTheme`) |
| `--components <file>` | barrel ของ shared components — ใช้เดาชื่อ button/dialog/... และทำ `catalog` |
| `--features <dir>` | ที่อยู่ของ feature code (กฎ `raw-mui-button`, `adhoc-dialog` ตรวจเฉพาะในนี้) |
| `--out <file>` / `--force` | ไฟล์ปลายทาง / เขียนทับ |

### Tailwind CSS

```bash
# v4 — ไฟล์ CSS ที่มี @theme (default ของ Tailwind อ่านจาก node_modules/tailwindcss/theme.css ของโปรเจกต์)
node <skill>/scripts/init-config.mjs --tailwind src/app.css --components src/components/ui --features src

# v3 — tailwind.config.{js,ts,cjs,mjs} (theme + theme.extend; default palette จาก tailwindcss/colors ถ้าติดตั้งไว้)
node <skill>/scripts/init-config.mjs --tailwind tailwind.config.js --components src/components --features src
```

ได้ config ที่มี `"format": "tailwind"` และ theme เดียวชื่อ `default`:
`colors` (hex → ชื่อ utility เช่น `danger-50`), `typography` (`sm` → 14), `radius` (`md` → 6), `shadows` (`sm` → ค่า),
`containers` (`xs` → 320), `projectColors` (token ของโปรเจกต์ — สีที่ "ใกล้เคียง" จะ snap ได้เฉพาะเข้า token กลุ่มนี้ ไม่ snap เข้า palette default ของ Tailwind) และ `spacingUnit` จาก `--spacing` (default 4)
token ของโปรเจกต์ชนะสีของ Tailwind เมื่อ hex ซ้ำ (`#101828` → `ink` ไม่ใช่ `gray-900`) สี oklch ของ v4 ถูกแปลงเป็น hex
`--components` รับโฟลเดอร์ได้ (เช่น `components/ui` ของ shadcn) ไฟล์ `.vue` / `.svelte` ใช้ชื่อไฟล์เป็นชื่อ component

### MUI — อ่านอะไรได้บ้าง

สคริปต์อ่าน `const`, object literal, `palette: {...}`, `createTheme({...})` และ `typography.<variant>.fontSize` (px หรือ rem)
ได้โดยไม่ต้องรันโค้ด ค่าที่คำนวณตอน runtime (`alpha()`, `darken()`, spread จาก theme อื่น) จะอ่านไม่ได้ — ตรวจผลทุกครั้ง
variant ที่ theme ไม่ได้กำหนด จะเติมด้วยค่า default ของ MUI (ปรับตาม `typography.fontSize`)

## หลังสร้าง ต้องเติมเอง

| field | ทำไม |
|---|---|
| `themes.<name>.handled` | สีที่ theme ทำให้เองผ่าน component overrides (hover ปุ่ม, ขอบ input, focus ring) — แบบที่มีสีเหล่านี้ไม่ต้องเขียน sx |
| `themes.<name>.shadows` | `{ "<index>": "<box-shadow>" }` ถ้าโปรเจกต์ใช้ `shadows` ของตัวเอง เพื่อให้ map เงาจาก Figma เป็น `boxShadow: <index>` |
| `components.*` | ตรวจว่าเดาชื่อถูก (`button`, `dialog`, `confirmDialog`, `emptyState`, `table`) ใส่ `null` ถ้าไม่มี |
| `components.sizeLocked` | shared component อื่นที่ห้าม sx ทับขนาด/มุม/เงา (นอกจาก button/dialog) |
| `paths.themeSources` | โฟลเดอร์ theme — `check-ui` ข้ามไฟล์ในนี้ เพราะเป็นที่ที่ hex อยู่ได้ |
| `docs` | path ของเอกสารเฉพาะโปรเจกต์ที่ skill ต้องอ่านก่อนเริ่ม (กติกาสีพิเศษ, ดัชนี component พร้อมหมายเหตุ) |

## ตรวจว่า config ยังตรงกับ theme

```bash
node <skill>/scripts/init-config.mjs --check
```

- `DRIFT` — สีใน config ไม่อยู่ในไฟล์ theme แล้ว
- `NEW` — มีสีใหม่ใน theme ที่ config ยังไม่มี

exit 1 เมื่อไม่ตรง จึงใส่ใน CI หรือ pre-commit ได้

## field ทั้งหมด

```jsonc
{
  "format": "mui",                   // "mui" (default) | "tailwind" — เลือกตัวแปลงและกฎของ check-ui
  "defaultTheme": "app",             // theme ที่ใช้เมื่อไม่เจอ wrapper
  "spacingUnit": 8,                  // theme.spacing(1) ในหน่วย px
  "radiusUnit": 8,                   // theme.shape.borderRadius ในหน่วย px
  "nearThreshold": 40,               // ระยะสีที่ยัง snap เข้า token ได้ (weighted RGB)
  "themes": {
    "<name>": {
      "wrapper": "DenseSection",     // ไม่ใส่ = theme default
      "sources": ["src/theme/dense-theme.ts"],
      "colors": { "#HEX": "token.path" },
      "typography": { "body2": 14 }, // variant → px
      "handled": { "#HEX": "ทำไมไม่ต้องเขียน" },
      "shadows": { "1": "0px 1px 3px rgba(...)" },  // Tailwind: { "sm": "0 1px 3px 0 rgb(0 0 0 / 0.1), …" }
      "radius": { "md": 6 },         // Tailwind only: rounded-* → px
      "containers": { "xs": 320 }    // Tailwind only: max-w-* → px
    }
  },
  "components": {
    "button": "AppButton", "dialog": null, "confirmDialog": null, "emptyState": "EmptyState", "table": null,
    "import": "@/components", "sizeLocked": [], "catalog": ["AppButton", "EmptyState", "DenseSection"]
  },
  "paths": { "features": ["src/features"], "themeSources": ["src/theme"] },
  "docs": [".claude/ui-adjust/project-notes.md"]
}
```
