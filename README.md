# ui-adjust

> An [Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) for Claude Code that turns a Figma design (screenshot,
> "Copy as CSS", or a description) into changes to an **existing React + MUI screen** — using your theme tokens,
> the theme the component actually renders under, and your shared components, instead of pasted hex/px values.

Skill สำหรับ Claude Code ใช้ **ปรับ UI ของหน้าจอหรือ component (React + MUI) ที่มีอยู่แล้วให้ตรงกับแบบ** โดยที่โค้ดยังเป็นของ
design system: สีเป็น theme token, ระยะเป็น spacing unit, ตัวอักษรเป็น typography variant และใช้ shared component ของโปรเจกต์

## แก้ปัญหาอะไร

งานปรับ UI มักเริ่มจาก "ภาพแบบ + CSS ที่ copy จาก Figma" เมื่อให้ AI ทำโดยไม่มีบริบท มักเกิดปัญหาซ้ำ ๆ

| ปัญหา | ทำไมถึงเกิด | ผล |
|---|---|---|
| ลอก hex มาตรง ๆ | Figma ให้ `#475467` ไม่ได้บอกว่าเป็น `text.secondary` | เปลี่ยน theme แล้วหน้านี้ไม่ตาม |
| ใช้ token/variant ผิด theme | โปรเจกต์ที่มี `ThemeProvider` ซ้อน (เช่น theme หนาแน่นสำหรับตาราง) ให้ค่าต่างกันสำหรับ token เดียวกัน | 14px คือ `caption` ใน theme หนึ่ง แต่คือ `body2` ในอีก theme |
| ลอก layout noise | Figma ใส่ `position: absolute; left: 1164px`, `width: 128px`, `font-family` มาทุก layer | layout แตกเมื่อข้อมูลยาวขึ้น |
| เขียนทับสิ่งที่ theme/shared component ทำแล้ว | ไม่รู้ว่าปุ่ม/การ์ด/ตารางมี override อยู่ | ปุ่มหน้านี้สูงไม่เท่าปุ่มอื่นทั้งระบบ |
| snap สีนอก palette เข้า token เงียบ ๆ | สีขอบพิเศษดู "คล้าย" divider | สีบนจอเปลี่ยนไปจากแบบ โดยไม่มีใครรู้ |
| a11y ของ MUI ที่ดูถูกแต่ใช้ไม่ได้ | `aria-label` บน `<WarningIcon>` | MUI ใส่ `aria-hidden` ให้ไอคอน — screen reader ไม่อ่าน |

Skill นี้ให้ workflow ที่หา theme ก่อนแก้ สคริปต์แปลง CSS → `sx` ด้วย token ของโปรเจกต์ และสคริปต์ตรวจผล 13 ข้อ
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
│   ├── init-config.mjs              # อ่านไฟล์ theme ของ MUI → สร้าง config · --check ตรวจว่า config ยังตรงกับ theme
│   ├── which-theme.mjs              # component นี้ render อยู่ใต้ theme ไหน (ไล่หา wrapper ของ ThemeProvider)
│   ├── figma-css-to-sx.mjs          # CSS จาก Figma → sx ที่ใช้ token + รายการ DROPPED / REVIEW
│   ├── check-ui.mjs                 # ตรวจไฟล์ .tsx 13 ข้อ (FAIL/WARN), exit 1 เมื่อมี FAIL
│   └── lib/                         # config loader, ตัวอ่าน theme
├── templates/
│   ├── ui-adjust.config.example.json
│   └── ui-adjust.config.schema.json # JSON schema (autocomplete ใน editor)
├── examples/sample-app/             # โปรเจกต์ MUI ขนาดเล็กที่ใช้ทดสอบ (2 theme, AppButton, EmptyState)
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
1. `which-theme.mjs` หาว่า component อยู่ใต้ theme ไหน
2. `figma-css-to-sx.mjs` แปลง CSS แล้วเทียบกับภาพ
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

node $S/check-ui.mjs --diff                  # เฉพาะบรรทัดที่แก้ เทียบกับ HEAD (ใช้ก่อน commit / รีวิว PR)
node $S/check-ui.mjs src/features/**/*.tsx   # audit ทั้ง folder
node $S/init-config.mjs --check              # หลังแก้ theme
```

`check-ui.mjs` และ `init-config.mjs --check` exit 1 เมื่อพบปัญหา จึงใส่ใน pre-commit, CI หรือ Claude Code hook ได้

## ใช้กับโปรเจกต์อื่นได้อย่างไร

- **ทุกโปรเจกต์ React + MUI** — สิ่งเดียวที่ต่างคือ `ui-adjust.config.json` ซึ่งสร้างจากไฟล์ theme ได้ใน 1 คำสั่ง
- **theme เดียวหรือหลาย theme** — ใส่ `--theme` กี่ตัวก็ได้ theme ที่มี `--wrapper` จะถูกหาด้วย `which-theme.mjs`
- **กติกาเฉพาะโปรเจกต์** (สีสถานะพิเศษ, ข้อห้ามของ component) — เขียนเป็น markdown แล้วใส่ path ใน `docs` ของ config
  Claude จะอ่านก่อนเริ่มงาน โดยไม่ต้องแก้ skill
- **แบบที่ไม่ใช่ Figma** — ภาพหน้าจอ, คำบรรยาย, หรือ CSS จากเครื่องมืออื่น ใช้กติกาใน `references/mapping-rules.md`
- **รีวิว PR / audit** — `check-ui.mjs --diff` ใน CI หรือรันทั้ง folder เพื่อหา hex ที่ควรเป็น token

## ข้อจำกัด

- สคริปต์ใช้ regex/heuristic ไม่ได้ parse TypeScript จริง: `init-config` อ่านค่าที่คำนวณตอน runtime ไม่ได้ (`alpha()`, `darken()`),
  `which-theme` จับจาก `<ComponentName` ไม่ใช่ import, `check-ui` อาจมี false positive/negative
- ไม่มี visual diff ต้องเปิดหน้าจริงดูเอง
- รองรับ MUI (`sx`, `createTheme`) เท่านั้น ไม่รองรับ Tailwind / CSS Modules
- ไม่ใช่เครื่องมือออกแบบ ถ้าไม่มีแบบ และอยากให้หน้า "สวยขึ้น" ให้ใช้ skill ด้านการออกแบบแทน

## ผลการทดสอบ

ทดสอบบน [examples/sample-app](examples/sample-app) เทียบ AI ปกติกับ AI + skill ดู [evals/comparison.md](evals/comparison.md)
