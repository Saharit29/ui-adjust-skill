# ผลเทียบ: AI ปกติ vs AI + ui-adjust skill

| ชุดทดสอบ | AI ปกติ | AI + skill |
|---|---|---|
| [MUI](#mui--examplessample-app) (2 งาน) | 19/20 | 20/20 |
| [Tailwind v4](#tailwind-v4--examplessample-tailwind) (2 งาน) | 20/20 | 20/20 |

## MUI — examples/sample-app

ทดสอบวันที่ 2026-11-06 · โมเดลเดียวกัน (Claude Opus 5.5) · แต่ละรอบทำงานในสำเนาแยกของ [examples/sample-app](../examples/sample-app)
(git repo ของตัวเอง, ใช้ `node_modules` ร่วมกัน, รัน `tsc` ได้) · ผลดิบใน `runs/a-*`, `runs/b-*`

- **ฝั่ง baseline** ได้แค่ README ของโปรเจกต์ (บอกว่ามี `DenseSection` + dense theme และให้ใช้ `AppButton`) และถูกห้ามอ่านไฟล์ของ skill
- **ฝั่ง skill** ได้ README เดียวกัน + `SKILL.md`, `references/`, `scripts/` และ `ui-adjust.config.json` ที่สร้างด้วย `init-config.mjs`

ผลดิบ (ไฟล์สุดท้าย + diff) อยู่ใน [runs/](runs/) เกณฑ์อยู่ใน [rubric.md](rubric.md)

### งานที่ใช้ทดสอบ

| | Task A | Task B |
|---|---|---|
| เป้าหมาย | `features/billing/components/balance-cell.tsx` | `EmptyState` ใน `features/dashboard/components/dashboard-panels.tsx` |
| theme จริง | **dense** (ใช้ใน `AccountsPage` ซึ่งอยู่ใน `<DenseSection>`) | **app** (dashboard ไม่มี wrapper) |
| แบบ | [task-a-overdue-badge.css](fixtures/task-a-overdue-badge.css) — ป้ายยอดเกินกำหนด | [task-b-dashboard-empty.css](fixtures/task-b-dashboard-empty.css) — วงกลมไอคอน + ปุ่ม outlined |
| กับดัก | 14px = `body2` ใน dense (แต่ `caption` ใน app), ขอบ `#FDA29B` นอก palette, โค้ดเดิมมี `aria-label` บนไอคอนที่ไม่ถูกอ่าน | 14px = `caption` ใน app, ปุ่มใน Figma สูง 32 / weight 500 / มีเงา ขัดกับมาตรฐาน `AppButton` (36 / 600 / ไม่มีเงา) |

### คะแนน (rubric 10 ข้อ)

| เกณฑ์ | A baseline | A + skill | B baseline | B + skill |
|---|---|---|---|---|
| 1. theme + variant (2) | 2 | 2 | 2 | 2 |
| 2. ไม่มี token hex (1) | 1 | 1 | 1 | 1 |
| 3. ไม่ลอก Figma noise (1) | 1 | 1 | 1 | 1 |
| 4. ค่าที่ไม่ลง token (1) | 1 | 1 | 1 | 1 |
| 5. ใช้ของที่มีอยู่ (1) | 1 | 1 | 1 | 1 |
| 6. พฤติกรรม + บอกสิ่งที่เปลี่ยน (1) | 1 | 1 | 1 | 1 |
| 7. a11y (1) | **0** — คง `aria-label="Overdue"` บนไอคอน (MUI ซ่อนด้วย `aria-hidden`) | **1** — เปลี่ยนเป็น `titleAccess` พร้อมอธิบาย | 1 | 1 |
| 8. รายงาน (1) | 1 | 1 | 1 | 1 |
| 9. `tsc` (1) | 1 | 1 | 1 | 1 |
| **รวม** | **9/10** | **10/10** | **10/10** | **10/10** |

### ตัวชี้วัดอื่น

| | A baseline | A + skill | B baseline | B + skill |
|---|---|---|---|---|
| `check-ui.mjs` (13 ข้อ) | 1 FAIL (`icon-aria-label`) | 0 | 0 | 0 |
| ใช้หน่วยของ theme | `borderRadius: "6px"` (px string) | `borderRadius: 0.75` | ✓ | ✓ |
| ขนาด diff | +21 / −4 | +22 / −5 | +16 / −10 | +18 / −12 |
| ตาราง mapping แบบ → โค้ด | ไม่มี (เป็นรายการ) | มี 9 แถว | ไม่มี (เป็นรายการ) | มี 10 แถว |
| แยก "เรื่องที่ต้องตัดสินใจ" | ไม่มี | 2 ข้อ (เพิ่มสีขอบเข้า palette?, บรรทัดใบแจ้งหนี้ควรแดงไหม) | ไม่มี (มีคำถามเรื่องข้อความ 1 ข้อ) | 3 ข้อ (ใช้ EmptyState กลาง?, เพิ่มขนาดปุ่ม 32px?, จุดท้ายประโยค) |
| ข้อความตามแบบ | — | — | คงข้อความเดิม (แจ้งไว้) | ใช้ข้อความในแบบ (แจ้งไว้) |
| tokens / เวลา | 49k / 38 วิ | 61k / 54 วิ | 52k / 53 วิ | 63k / 70 วิ |

### สรุปผล

- **ช่องว่างแคบ:** baseline ได้ 19/20 ส่วน skill ได้ 20/20 โมเดลรุ่นใหม่ทำงานพื้นฐานได้ดีอยู่แล้ว เมื่อโปรเจกต์มี README บอก
  เรื่อง theme ซ้อน ทั้งสองฝั่งหา theme ถูก เลือก variant ถูก และไม่ลอก absolute/fontFamily
- **สิ่งที่ skill ช่วยได้ซ้ำ ๆ คือจุดที่ "ดูถูกแต่ผิด":** `aria-label` บน MUI Icon ถูกมองข้ามโดย baseline ทั้งในการทดสอบนี้
  และในการทดสอบครั้งแรกบนโปรเจกต์จริง (private, ผลแนวเดียวกัน 18/20 vs 20/20) ฝั่ง skill แก้ได้ทุกครั้ง เพราะมีทั้งกฎใน
  SKILL.md และ `check-ui.mjs` ที่จับให้
- **รายงานตรวจทานง่ายกว่า:** ฝั่ง skill ให้ตาราง mapping ทุกค่า และแยกเรื่องที่ต้องตัดสินใจระดับ design system ออกมา
  (สีใหม่เข้า palette, ขนาดปุ่มใหม่) แทนที่จะตัดสินใจเงียบ ๆ
- **ไม่ต่างในงาน B:** ทั้งสองฝั่งได้โค้ดเกือบเหมือนกัน ความต่างมีแค่การเลือกข้อความ ซึ่งทั้งสองฝั่งแจ้งไว้
- **ต้นทุน:** ฝั่ง skill ใช้ tokens มากกว่า ~22% และเวลานานกว่า ~37% (อ่าน SKILL.md + รันสคริปต์ 3–4 ตัว)

### ผลที่ได้กลับมาปรับ skill

การทดสอบครั้งแรก (บนโปรเจกต์จริง) ทำให้เพิ่มกฎ `icon-aria-label` และ `shared-size-override` ใน `check-ui.mjs`
และพบบั๊กของตัวแปลง 3 จุด ส่วนการสร้างเวอร์ชันทั่วไปนี้พบบั๊กอีก 3 จุด: comment ชื่อ layer ที่ขึ้นต้นด้วยตัวเลขถูกข้าม,
variant ขนาดเท่ากัน (`subtitle2` กับ `body1`) เลือกผิดตัว, และ `which-theme` สรุปว่า component ที่ไม่มีใครใช้อยู่ใต้ theme default

### ข้อจำกัดของการทดสอบ

- 2 งาน × 1 รอบต่อฝั่ง ยังไม่พอวัดความแปรปรวน ควรรันซ้ำอย่างน้อย 3 รอบต่องาน และเพิ่มงานแบบอื่น (ตาราง, ฟอร์ม, dialog)
- sample-app ไม่มี lint และรันจริงไม่ได้ จึงไม่มีการเทียบภาพหน้าจอกับแบบ
- คนให้คะแนนเป็นคนเดียวกับคนเขียน skill ควรให้คนอื่นให้คะแนนซ้ำตาม rubric

### รันซ้ำเอง

```bash
cd examples/sample-app && npm install
# 1) คัดลอก sample-app เป็น 2 ชุด (ลบ ui-adjust.config.json ออกจากชุด baseline) แล้ว git init แต่ละชุด
# 2) เปิด Claude Code ในแต่ละชุด ส่ง prompt ของ task เดียวกัน พร้อม path ของไฟล์ใน evals/fixtures/
#    ชุด baseline: ห้ามอ่านไฟล์ของ skill · ชุด skill: /ui-adjust <path>
# 3) ตรวจผล
node ../../scripts/check-ui.mjs --diff && npx tsc --noEmit
# 4) ให้คะแนนตาม evals/rubric.md
```

prompt ที่ใช้ (ภาษาอังกฤษ เพราะ sample-app เป็นภาษาอังกฤษ):

- **Task A:** "Update src/features/billing/components/balance-cell.tsx to match the Figma design. When the balance is overdue,
  show it as a badge — light red background, pink border, rounded corners — containing the warning icon and the bold red amount;
  the 'N unpaid invoices' line sits under the badge. Open (not overdue) balances stay as they are. 'No balance' uses the color
  from the 'No balance' layer. The CSS copied from Figma is in evals/fixtures/task-a-overdue-badge.css"
- **Task B:** "Update the EmptyState in src/features/dashboard/components/dashboard-panels.tsx to match the Figma design: the icon
  sits in a light teal circle and is teal, then the title, the description, and an outlined 'View all' button — only when an
  action is given. Add the button to the 'Waiting on you' panel, linking to /inbox; the other panels have no button.
  The CSS copied from Figma is in evals/fixtures/task-b-dashboard-empty.css"

## Tailwind v4 — examples/sample-tailwind

ทดสอบวันที่ 2026-11-06 · เงื่อนไขเดียวกับชุด MUI · งานเดียวกัน (prompt เดียวกัน เปลี่ยนแค่ไฟล์ fixture
[tw-task-a-overdue-badge.css](fixtures/tw-task-a-overdue-badge.css), [tw-task-b-dashboard-empty.css](fixtures/tw-task-b-dashboard-empty.css)
ให้สีตรงกับ token ของ sample-tailwind) · ผลดิบใน `runs/tw-*`
README ของสำเนาฝั่ง baseline ถูกตัดส่วนที่พูดถึง `ui-adjust.config.json` ออก

กับดักของชุดนี้: token ใน `@theme` มีชื่อเชิงความหมาย (`danger-50`, `ink-muted`) แต่ค่าใน Figma เป็น hex ทั่วไป → ชวนให้เขียน
`bg-[#FEF3F2]` · `Button` มีขนาดตายตัว (sm 36px) แต่แบบเป็น 32px · icon component ซ่อนตัวเองจาก screen reader ถ้าไม่มี `title`

### คะแนน

| เกณฑ์ | A baseline | A + skill | B baseline | B + skill |
|---|---|---|---|---|
| 1. theme + ขนาดตัวอักษร (2) | 2 | 2 | 2 | 2 |
| 2. ไม่มี arbitrary color ที่เป็น token (1) | 1 | 1 | 1 | 1 |
| 3. ไม่ลอก Figma noise (1) | 1 | 1 | 1 | 1 |
| 4. ค่าที่ไม่ลง token (1) | 1 — เพิ่ม `--color-danger-300` ใน `@theme` เอง (แจ้งในรายงาน แต่ไม่ได้ถาม) | 1 — ใช้ `red-300` ของ Tailwind (Δ12) แจ้ง + แยกเป็นเรื่องที่ต้องตัดสินใจ | 1 | 1 |
| 5. ใช้ของที่มีอยู่ (1) | 1 | 1 | 1 — `Button` | 1 — `Button` |
| 6. พฤติกรรม + บอกสิ่งที่เปลี่ยน (1) | 1 | 1 | 1 | 1 |
| 7. a11y (1) | 1 — `aria-label` → `title` | 1 — `aria-label` → `title` | 1 | 1 |
| 8. รายงาน (1) | 1 | 1 | 1 | 1 |
| 9. `tsc` (1) | 1 | 1 | 1 | 1 |
| **รวม** | **10/10** | **10/10** | **10/10** | **10/10** |

### ตัวชี้วัดอื่น

| | A baseline | A + skill | B baseline | B + skill |
|---|---|---|---|---|
| `check-ui.mjs` (22 ข้อ) | 0 | 0 | 0 | 0 |
| แก้ theme (`app.css`) | **แก้** (+1 token) | ไม่แก้ | ไม่แก้ | ไม่แก้ |
| ตาราง mapping | ไม่มี | 9 แถว | ไม่มี | 10 แถว |
| แยก "เรื่องที่ต้องตัดสินใจ" | ไม่มี | 2 ข้อ | ไม่มี (ถามเรื่องข้อความ 1 ข้อ) | 3 ข้อ |
| ข้อความตามแบบ | — | — | คงข้อความเดิม (แจ้งไว้) | ใช้ข้อความในแบบ (แจ้งไว้) |
| `max-width: 320px` | — | — | `max-w-80` (spacing scale) | `max-w-xs` (container token) |
| ขนาด diff | +11 / −7 (2 ไฟล์) | +10 / −4 | +19 / −8 | +19 / −8 |
| tokens / เวลา | 48k / 45 วิ | 70k / 58 วิ | 46k / 47 วิ | 67k / 57 วิ |

### สรุปผลชุด Tailwind

- **คะแนนเท่ากัน** โมเดลทำงาน Tailwind ได้ดีมากโดยไม่ต้องมี skill ทั้งสองฝั่งใช้ token ของโปรเจกต์ (ไม่มี `bg-[#…]` สักตัว)
  ไม่ sx/className ทับขนาดปุ่ม และแก้บั๊ก `aria-label` ได้ทั้งคู่ — ต่างจากชุด MUI เพราะใน sample นี้ `Icon` เขียนตรรกะ `aria-hidden`
  ไว้ในไฟล์ของโปรเจกต์เอง ให้อ่านเห็น ส่วนใน MUI ตรรกะนี้ซ่อนอยู่ใน `node_modules`
- **ต่างกันที่การตัดสินใจระดับ design system:** baseline เพิ่ม token ใหม่เข้า `@theme` เอง (แก้ไฟล์ theme ที่ทุกหน้าใช้ร่วม)
  ส่วนฝั่ง skill ไม่แตะ theme แล้วยกเป็นคำถาม ตามกติกา "หยุดถามก่อนแก้ palette"
- **พบจุดอ่อนของ skill และแก้แล้ว:** ฝั่ง skill เลือก `red-300` ของ Tailwind เพราะตัวแปลงบอกว่า "ใกล้เคียง" ซึ่งทำให้โปรเจกต์ที่มีกลุ่มสี
  `danger-*` ของตัวเอง มีสีจาก palette default ปนเข้ามา หลังทดสอบได้เพิ่ม `projectColors` ใน config ให้ snap ได้เฉพาะเข้า token
  ของโปรเจกต์ — ตอนนี้ `#FDA29B` จะถูกรายงานเป็น "นอก palette → เสนอเพิ่ม token" แทน (ยังไม่ได้รันทดสอบซ้ำหลังแก้)
- **ต้นทุน:** ฝั่ง skill ใช้ tokens มากกว่า ~45% และเวลานานกว่า ~25%

## ข้อสรุปรวมทั้ง 2 ชุด

- skill **ไม่ได้ทำให้โค้ดดีขึ้นมากในงานง่าย** โมเดลรุ่นใหม่ทำงานพื้นฐานได้ถูกอยู่แล้วเมื่อโปรเจกต์มี README ดี
- skill **ช่วยในจุดที่มองไม่เห็นจากโค้ดในโปรเจกต์** (พฤติกรรม a11y ของ library ใน `node_modules`, ความต่างของ variant ระหว่าง theme ซ้อน)
  และ **ทำให้ผลตรวจทานได้** (ตาราง mapping ทุกค่า, แยกเรื่องที่ต้องตัดสินใจ, ไม่แก้ theme เงียบ ๆ)
- `check-ui.mjs` มีประโยชน์ **แม้ไม่ใช้ Claude** — ใช้ตรวจ PR หรือ audit โค้ดเก่าได้
- ข้อจำกัดเดิมยังอยู่: งานละ 1 รอบ, ไม่มีการเทียบภาพหน้าจอ, คนให้คะแนนเป็นคนเขียน skill
