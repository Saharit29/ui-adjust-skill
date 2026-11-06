# ui-adjust

> An [Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) for Claude Code that turns a Figma design (screenshot,
> "Copy as CSS", or a description) into changes to an **existing MUI or Tailwind CSS screen** — using your theme tokens,
> the theme the component actually renders under, and your shared components, instead of pasted hex/px values.

Skill สำหรับ Claude Code ใช้ **ปรับ UI ของหน้าจอหรือ component ที่มีอยู่แล้วให้ตรงกับแบบ** โดยที่โค้ดยังเป็นของ design system:
สีเป็น theme token, ระยะเป็น spacing scale, ตัวอักษรเป็น variant / `text-*` และใช้ shared component ของโปรเจกต์

## รองรับอะไรบ้าง

| Stack | workflow | `init-config` | `figma-css-to-sx` | `check-ui` | `which-theme` |
|---|---|---|---|---|---|
| **React + MUI** (รวม Joy UI) | ✓ | ✓ `createTheme` / palette files | ✓ `sx` + variant | ✓ 22 ข้อ | ✓ |
| **Tailwind CSS v4** (React, Vue, Svelte, Astro, HTML) | ✓ | ✓ `@theme` ใน CSS + default ของ Tailwind | ✓ `className` | ✓ 22 ข้อ | — (theme เดียว) |
| **Tailwind CSS v3** | ✓ | ✓ `tailwind.config.*` | ✓ `className` | ✓ | — |
| React + Chakra / Mantine / styled-components | ✓ | เขียน config เอง | ใช้ค่าเป็นแนวทาง (syntax ต่าง) | กฎทั่วไปใช้ได้ | ✓ ถ้าประกาศ wrapper |
| Vue / Angular / Flutter แบบไม่ใช้ Tailwind | ✓ แนวคิด | — | — | กฎ hex/inline style บางส่วน | — |

## แก้ปัญหาอะไร

งานปรับ UI มักเริ่มจาก "ภาพแบบ + CSS ที่ copy จาก Figma" เมื่อให้ AI ทำโดยไม่มีบริบท มักเกิดปัญหาซ้ำ ๆ

| ปัญหา | ทำไมถึงเกิด | ผล |
|---|---|---|
| ลอก hex มาตรง ๆ | Figma ให้ `#475467` ไม่ได้บอกว่าเป็น `text.secondary` | เปลี่ยน theme แล้วหน้านี้ไม่ตาม |
| ใช้ token/variant ผิด theme | โปรเจกต์ที่มี `ThemeProvider` ซ้อน (เช่น theme หนาแน่นสำหรับตาราง) ให้ค่าต่างกันสำหรับ token เดียวกัน | 14px คือ `caption` ใน theme หนึ่ง แต่คือ `body2` ในอีก theme |
| ลอก layout noise | Figma ใส่ `position: absolute; left: 1164px`, `width: 128px`, `font-family` มาทุก layer | layout แตกเมื่อข้อมูลยาวขึ้น |
| เขียนทับสิ่งที่ theme/shared component ทำแล้ว | ไม่รู้ว่าปุ่ม/การ์ด/ตารางมี override อยู่ | ปุ่มหน้านี้สูงไม่เท่าปุ่มอื่นทั้งระบบ |
| snap สีนอก palette เข้า token เงียบ ๆ | สีขอบพิเศษดู "คล้าย" divider | สีบนจอเปลี่ยนไปจากแบบ โดยไม่มีใครรู้ |
| Tailwind arbitrary value | ลอก `#FEF3F2`, `16px`, `14px` จาก Figma | `bg-[#FEF3F2] p-[16px] text-[14px]` แทน `bg-danger-50 p-4 text-sm` |
| a11y ของ icon ที่ดูถูกแต่ใช้ไม่ได้ | `aria-label` บน `<WarningIcon>` | MUI และ icon kit ส่วนใหญ่ใส่ `aria-hidden` ให้ไอคอน — screen reader ไม่อ่าน |

Skill นี้ให้ workflow ที่หา theme ก่อนแก้ สคริปต์แปลง CSS → `sx` หรือ Tailwind class ด้วย token ของโปรเจกต์ และสคริปต์ตรวจผล 22 ข้อ
ค่าของแต่ละโปรเจกต์อยู่ใน `ui-adjust.config.json` ไฟล์เดียว (สร้างอัตโนมัติจากไฟล์ theme)

## โครงสร้าง

```
ui-adjust/
├── SKILL.md                         # workflow ที่ Claude ทำตาม: input, output, 7 ขั้นตอน, ข้อห้าม, template รายงาน
├── README.md
├── references/
│   ├── mapping-rules.md             # กติกาแปลงสี/ระยะ/ตัวอักษร/มุม/เงา และสิ่งที่ทิ้งได้เสมอ
│   └── config.md                    # อธิบาย ui-adjust.config.json ทีละ field
├── scripts/                         # Node 18+, ไม่มี dependency
│   ├── init-config.mjs              # อ่าน theme (MUI / Tailwind v3 / v4) → สร้าง config · --check ตรวจว่า config ยังตรงกับ theme
│   ├── which-theme.mjs              # component นี้ render อยู่ใต้ theme ไหน (ไล่หา wrapper ของ ThemeProvider)
│   ├── figma-css-to-sx.mjs          # CSS จาก Figma → sx หรือ Tailwind class ที่ใช้ token + รายการ DROPPED / REVIEW
│   ├── check-ui.mjs                 # ตรวจ .tsx .jsx .vue .svelte .astro .html 22 ข้อ (FAIL/WARN), exit 1 เมื่อมี FAIL
│   └── lib/                         # config loader, ตัวอ่าน theme ของ MUI/Tailwind, ตัวแปลงเป็น Tailwind
├── templates/
│   ├── ui-adjust.config.example.json
│   └── ui-adjust.config.schema.json # JSON schema (autocomplete ใน editor)
├── examples/
│   ├── sample-app/                  # โปรเจกต์ MUI ขนาดเล็กที่ใช้ทดสอบ (2 theme, AppButton, EmptyState)
│   └── sample-tailwind/             # โปรเจกต์ React + Tailwind v4 ขนาดเล็กที่ใช้ทดสอบ (@theme tokens, Button)
└── evals/                           # rubric, CSS จาก Figma ที่ใช้ทดสอบ, ผลรันดิบ, ผลเทียบ
```

## ติดตั้ง

ต้องมี [Claude Code](https://claude.com/claude-code) และ Node.js 18 ขึ้นไป

```bash
# 1) วาง skill ไว้ในโปรเจกต์ (หรือ ~/.claude/skills/ui-adjust เพื่อใช้ทุกโปรเจกต์)
git clone https://github.com/Saharit29/ui-adjust-skill.git .claude/skills/ui-adjust
#    หรือเป็น submodule:  git submodule add https://github.com/Saharit29/ui-adjust-skill.git .claude/skills/ui-adjust

# 2) สร้าง config จากไฟล์ theme ของโปรเจกต์ (รันจาก root ของโปรเจกต์)
node .claude/skills/ui-adjust/scripts/init-config.mjs \
  --theme app=src/theme/palette.ts,src/theme/typography.ts \
  --components src/components/index.ts \
  --features src/features \
  --out .claude/ui-adjust.config.json

#    มี theme ซ้อน? เพิ่ม:  --theme dense=src/theme/dense-theme.ts --wrapper dense=DenseSection

#    Tailwind v4:  node .claude/skills/ui-adjust/scripts/init-config.mjs --tailwind src/app.css --components src/components/ui
#    Tailwind v3:  node .claude/skills/ui-adjust/scripts/init-config.mjs --tailwind tailwind.config.js --components src/components

# 3) เปิด config ตรวจ แล้วเติม "handled" / "shadows" / component roles (ดู references/config.md)
```

เปิด Claude Code ใหม่ แล้ว `ui-adjust` จะขึ้นในรายการ skill

## วิธีใช้

### ใน Claude Code

```
/ui-adjust src/features/billing/components/balance-cell.tsx
<แนบภาพแบบ> <วาง CSS จาก Figma>
```

หรือพิมพ์ปกติ Claude จะเลือก skill เองจากคำว่า "ปรับตามแบบ", "match the Figma", "แก้ให้เหมือน figma"

Claude จะทำตามลำดับ:
1. `which-theme.mjs` หาว่า component อยู่ใต้ theme ไหน (MUI / React provider)
2. `figma-css-to-sx.mjs` แปลง CSS เป็น `sx` หรือ Tailwind class แล้วเทียบกับภาพ
3. จับคู่กับ shared component และ override ของ theme
4. ตัดสินใจกับค่าที่ไม่ลง token และหยุดถามถ้าต้องแก้ palette/มาตรฐาน component
5. แก้โค้ดแบบ diff เล็กที่สุด พร้อม state และ a11y ที่แบบไม่ได้วาด
6. `check-ui.mjs --diff` + typecheck + lint ของโปรเจกต์
7. รายงานเป็นตาราง mapping + จุดที่ต่างจากแบบ + เรื่องที่ต้องตัดสินใจ

### Input / Output

| | รายละเอียด |
|---|---|
| **Input** | เป้าหมาย (path / ชื่อหน้า / route) + แบบอย่างน้อย 1 อย่าง (ภาพ, CSS จาก Figma, คำบรรยาย) + ขอบเขต (ไม่บังคับ) |
| **Output** | ไฟล์ที่แก้ · ตาราง mapping "ในแบบ → ในโค้ด" · จุดที่ต่างจากแบบ + ผลกระทบต่อหน้าอื่น · เรื่องที่ต้องตัดสินใจ · ผลตรวจตามจริง |

### ใช้สคริปต์เองโดยไม่ผ่าน Claude

```bash
S=.claude/skills/ui-adjust/scripts

node $S/which-theme.mjs src/features/billing/components/balance-cell.tsx
#   dense      BalanceCell ← AccountsPage  [<DenseSection>]
#   → theme: dense  (use --theme dense)

node $S/figma-css-to-sx.mjs figma.css --theme dense
#   ── $1,250.00
#   <Typography variant="body2" sx={{"fontWeight":700,"color":"error.main"}} />
#     DROPPED  width: 80px — fixed artboard size; let content/flex decide
#     DROPPED  font-family: 'Inter' — theme typography already sets the font family

# โปรเจกต์ Tailwind (config "format": "tailwind")
node $S/figma-css-to-sx.mjs figma.css
#   ── Balance / Overdue
#   <div (flex) className="flex items-center py-1 px-2 gap-1 bg-danger-50 border border-red-300 rounded-md" />
#     REVIEW   border: #FDA29B ≈ red-300 (#FFA2A2, Δ12) — snapped to the token; mention it in the report

node $S/check-ui.mjs --diff                  # เฉพาะบรรทัดที่แก้ เทียบกับ HEAD (ใช้ก่อน commit / รีวิว PR)
node $S/check-ui.mjs src/features/**/*.tsx   # audit ทั้ง folder (.vue .svelte .html ก็ได้)
#   FAIL tw-token-arbitrary  L4  bg-[#FEF3F2] → bg-danger-50
#   WARN tw-arbitrary-text   L4  text-[14px] → text-sm
node $S/init-config.mjs --check              # หลังแก้ theme
```

`check-ui.mjs` และ `init-config.mjs --check` exit 1 เมื่อพบปัญหา จึงใส่ใน pre-commit, CI หรือ Claude Code hook ได้

## ใช้กับโปรเจกต์อื่นได้อย่างไร

- **ทุกโปรเจกต์ MUI หรือ Tailwind** — สิ่งเดียวที่ต่างคือ `ui-adjust.config.json` ซึ่งสร้างจากไฟล์ theme ได้ใน 1 คำสั่ง
- **Tailwind นอก React** (Vue, Svelte, Astro, HTML) — `init-config`, `figma-css-to-sx` และ `check-ui` ใช้ได้เหมือนกัน
  เพราะทำงานกับ class string ไม่ใช่ JSX
- **theme เดียวหรือหลาย theme** — ใส่ `--theme` กี่ตัวก็ได้ theme ที่มี `--wrapper` จะถูกหาด้วย `which-theme.mjs`
- **กติกาเฉพาะโปรเจกต์** (สีสถานะพิเศษ, ข้อห้ามของ component) — เขียนเป็น markdown แล้วใส่ path ใน `docs` ของ config
  Claude จะอ่านก่อนเริ่มงาน โดยไม่ต้องแก้ skill
- **แบบที่ไม่ใช่ Figma** — ภาพหน้าจอ, คำบรรยาย, หรือ CSS จากเครื่องมืออื่น ใช้กติกาใน `references/mapping-rules.md`
- **รีวิว PR / audit** — `check-ui.mjs --diff` ใน CI หรือรันทั้ง folder เพื่อหา hex ที่ควรเป็น token

## ข้อจำกัด

- สคริปต์ใช้ regex/heuristic ไม่ได้ parse TypeScript จริง: `init-config` อ่านค่าที่คำนวณตอน runtime ไม่ได้ (`alpha()`, `darken()`),
  `which-theme` จับจาก `<ComponentName` ไม่ใช่ import, `check-ui` อาจมี false positive/negative
- ไม่มี visual diff ต้องเปิดหน้าจริงดูเอง
- รองรับ MUI และ Tailwind (v3/v4) ยังไม่รองรับ CSS Modules, vanilla-extract, Panda CSS หรือ UnoCSS
- Tailwind: ยังไม่ได้แยก theme หลายชุด (`dark:`, `[data-theme]`) ใน config — workflow ใน SKILL.md บอกให้ตรวจเอง
- ไม่ใช่เครื่องมือออกแบบ ถ้าไม่มีแบบ และอยากให้หน้า "สวยขึ้น" ให้ใช้ skill ด้านการออกแบบแทน

## ผลการทดสอบ

ทดสอบบน [examples/sample-app](examples/sample-app) (MUI) และ [examples/sample-tailwind](examples/sample-tailwind) (Tailwind v4)
เทียบ AI ปกติกับ AI + skill งานละ 2 ชุด รวม 8 รอบ ดู [evals/comparison.md](evals/comparison.md)

| | AI ปกติ | AI + skill |
|---|---|---|
| MUI (2 งาน) | 19/20 | 20/20 |
| Tailwind v4 (2 งาน) | 20/20 | 20/20 |
