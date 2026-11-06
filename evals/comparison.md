# ผลเทียบ: AI ปกติ vs AI + ui-adjust skill

ทดสอบวันที่ 2026-11-06 · โมเดลเดียวกัน (Claude Opus 5.5) · แต่ละรอบทำงานในสำเนาแยกของ [examples/sample-app](../examples/sample-app)
(git repo ของตัวเอง, ใช้ `node_modules` ร่วมกัน, รัน `tsc` ได้)

- **ฝั่ง baseline** ได้แค่ README ของโปรเจกต์ (บอกว่ามี `DenseSection` + dense theme และให้ใช้ `AppButton`) และถูกห้ามอ่านไฟล์ของ skill
- **ฝั่ง skill** ได้ README เดียวกัน + `SKILL.md`, `references/`, `scripts/` และ `ui-adjust.config.json` ที่สร้างด้วย `init-config.mjs`

ผลดิบ (ไฟล์สุดท้าย + diff) อยู่ใน [runs/](runs/) เกณฑ์อยู่ใน [rubric.md](rubric.md)

## งานที่ใช้ทดสอบ

| | Task A | Task B |
|---|---|---|
| เป้าหมาย | `features/billing/components/balance-cell.tsx` | `EmptyState` ใน `features/dashboard/components/dashboard-panels.tsx` |
| theme จริง | **dense** (ใช้ใน `AccountsPage` ซึ่งอยู่ใน `<DenseSection>`) | **app** (dashboard ไม่มี wrapper) |
| แบบ | [task-a-overdue-badge.css](fixtures/task-a-overdue-badge.css) — ป้ายยอดเกินกำหนด | [task-b-dashboard-empty.css](fixtures/task-b-dashboard-empty.css) — วงกลมไอคอน + ปุ่ม outlined |
| กับดัก | 14px = `body2` ใน dense (แต่ `caption` ใน app), ขอบ `#FDA29B` นอก palette, โค้ดเดิมมี `aria-label` บนไอคอนที่ไม่ถูกอ่าน | 14px = `caption` ใน app, ปุ่มใน Figma สูง 32 / weight 500 / มีเงา ขัดกับมาตรฐาน `AppButton` (36 / 600 / ไม่มีเงา) |

## คะแนน (rubric 10 ข้อ)

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

## ตัวชี้วัดอื่น

| | A baseline | A + skill | B baseline | B + skill |
|---|---|---|---|---|
| `check-ui.mjs` (13 ข้อ) | 1 FAIL (`icon-aria-label`) | 0 | 0 | 0 |
| ใช้หน่วยของ theme | `borderRadius: "6px"` (px string) | `borderRadius: 0.75` | ✓ | ✓ |
| ขนาด diff | +21 / −4 | +22 / −5 | +16 / −10 | +18 / −12 |
| ตาราง mapping แบบ → โค้ด | ไม่มี (เป็นรายการ) | มี 9 แถว | ไม่มี (เป็นรายการ) | มี 10 แถว |
| แยก "เรื่องที่ต้องตัดสินใจ" | ไม่มี | 2 ข้อ (เพิ่มสีขอบเข้า palette?, บรรทัดใบแจ้งหนี้ควรแดงไหม) | ไม่มี (มีคำถามเรื่องข้อความ 1 ข้อ) | 3 ข้อ (ใช้ EmptyState กลาง?, เพิ่มขนาดปุ่ม 32px?, จุดท้ายประโยค) |
| ข้อความตามแบบ | — | — | คงข้อความเดิม (แจ้งไว้) | ใช้ข้อความในแบบ (แจ้งไว้) |
| tokens / เวลา | 49k / 38 วิ | 61k / 54 วิ | 52k / 53 วิ | 63k / 70 วิ |

## สรุปผล

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

## ข้อจำกัดของการทดสอบ

- 2 งาน × 1 รอบต่อฝั่ง ยังไม่พอวัดความแปรปรวน ควรรันซ้ำอย่างน้อย 3 รอบต่องาน และเพิ่มงานแบบอื่น (ตาราง, ฟอร์ม, dialog)
- sample-app ไม่มี lint และรันจริงไม่ได้ จึงไม่มีการเทียบภาพหน้าจอกับแบบ
- คนให้คะแนนเป็นคนเดียวกับคนเขียน skill ควรให้คนอื่นให้คะแนนซ้ำตาม rubric

## รันซ้ำเอง

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
