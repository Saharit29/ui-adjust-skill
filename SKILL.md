---
name: ui-adjust
description: ปรับ UI ของหน้าจอ/component React + MUI ที่มีอยู่แล้วให้ตรงกับแบบ (ภาพ Figma, CSS ที่ copy จาก Figma หรือคำบรรยาย) โดยแปลงค่าในแบบเป็น theme token ของ theme ที่ component นั้นอยู่จริง (รองรับ ThemeProvider ซ้อน), ใช้ shared component ของโปรเจกต์แทนการเขียนใหม่, ไม่ลอก layout noise ของ Figma (absolute, width/height ตายตัว, font-family) แล้วตรวจผลด้วยสคริปต์ + typecheck/lint และรายงานจุดที่ต่างจากแบบ ใช้เมื่อผู้ใช้สั่ง /ui-adjust, ส่งภาพแบบหรือ CSS จาก Figma มาให้ปรับหน้า, ขอ "ปรับ UI ตามแบบ", "แก้ให้เหมือน figma", "match the design", "จัด spacing/สี/ฟอนต์ให้ตรงแบบ" — ไม่ใช่สำหรับออกแบบใหม่จากศูนย์หรือวิจารณ์ความสวยงาม
---

# ui-adjust — ปรับ UI ให้ตรงแบบ โดยใช้ design system ของโปรเจกต์

เป้าหมาย: **หน้าจอดูเหมือนแบบ และโค้ดยังเป็นของ design system** หมายถึงสีเป็น token, ระยะเป็น spacing unit,
ตัวอักษรเป็น variant, ปุ่ม/dialog/ตารางเป็น shared component เพื่อให้เปลี่ยน theme ครั้งเดียวแล้วทุกหน้าตาม
การลอกค่า px/hex จาก Figma ตรง ๆ ทำให้หน้าเหมือนแบบได้ในวันนี้ แต่จะหลุดจาก theme ทันทีที่ theme เปลี่ยน
และมักผิดตั้งแต่แรกในโปรเจกต์ที่มี theme ซ้อน เพราะ token เดียวกันให้ค่าต่างกันในแต่ละ theme

`$S` ข้างล่าง = โฟลเดอร์ `scripts/` ของ skill นี้ (เช่น `.claude/skills/ui-adjust/scripts`) สคริปต์ทุกตัวรันจาก root ของโปรเจกต์

## ก่อนเริ่ม: config ของโปรเจกต์

สคริปต์อ่าน token, component และ path จาก `ui-adjust.config.json` (ที่ root หรือ `.claude/ui-adjust.config.json`)

- **ไม่มี config** → สร้างก่อน แล้วให้ผู้ใช้ตรวจ (ดู `references/config.md`):
  ```bash
  node $S/init-config.mjs --theme app=<palette/theme files> [--theme dense=<file> --wrapper dense=<WrapperComponent>] \
    --components <shared components index.ts> --features <feature dir>
  ```
- **มี config** → `node $S/init-config.mjs --check` ถ้ามี DRIFT/NEW แปลว่า theme เปลี่ยนแล้ว config ยังไม่ตาม แจ้งผู้ใช้
- อ่านไฟล์ใน `docs` ของ config (ถ้ามี) — เป็นเอกสารเฉพาะโปรเจกต์ (สีพิเศษ, กติกา component) ที่มีน้ำหนักเหนือ skill นี้

## Input

| ชื่อ | ตัวอย่าง | จำเป็น |
|---|---|---|
| เป้าหมาย | path ไฟล์, ชื่อหน้า/เมนู, หรือ route | ใช่ |
| แบบ | ภาพหน้าจอ Figma, CSS จาก Figma "Copy as CSS", หรือคำบรรยาย ("chip แดง มุมโค้ง 6") | ใช่ อย่างน้อย 1 อย่าง |
| ขอบเขต | "ตามแบบเป๊ะ" / "เฉพาะส่วน X" / "ปรับสีอย่างเดียว" | ไม่ (default: เฉพาะส่วนที่แบบแสดง) |

ไม่มีแบบเลย → ถามก่อน อย่าเดา มีแต่ภาพไม่มี CSS → ประมาณค่าจากภาพ แล้วระบุในรายงานว่าเป็นค่าประมาณ

## Output

1. ไฟล์ที่แก้ (diff เล็กที่สุดที่ทำให้ตรงแบบ ไม่ refactor ส่วนที่แบบไม่ได้พูดถึง)
2. **ตาราง mapping**: ค่าในแบบ → สิ่งที่ใช้ในโค้ด (token/variant/component) พร้อมเหตุผลของค่าที่ไม่ได้ตรงตัว
3. **รายการจุดที่ต่างจากแบบ** + ผลกระทบต่อหน้าอื่น (ถ้าแตะ shared component/สีกลาง)
4. **เรื่องที่ต้องตัดสินใจ** (ถ้ามี) แยกออกมาให้เห็นชัด
5. ผลตรวจตามจริง: `check-ui.mjs`, typecheck, lint (และ build ถ้าแก้ shared/theme)

## Workflow

### 1. หาเป้าหมายและ theme ที่ครอบอยู่ (ยังไม่แก้ไฟล์)

```bash
node $S/which-theme.mjs <component file>
```

สคริปต์ไล่ว่าใคร render component นี้ จนเจอ wrapper ของ theme ที่ประกาศใน config (`themes.<name>.wrapper`)

- ได้ theme เดียว → ใช้ `--theme <name>` ในขั้นต่อไป
- ได้หลาย theme → ใช้ token เชิงความหมายเท่านั้น (ห้าม hex) และตรวจทุกบริบท
- Dialog/Menu/Popover ที่เปิดจากใน wrapper ใช้ theme ของ wrapper ด้วย (portal ยังรับ React context)
- ผลเป็น heuristic (จับจาก `<Name` ไม่ใช่ import จริง) ถ้าดูแปลกให้เปิดไฟล์ตรวจเอง

อ่านไฟล์เป้าหมายทั้งไฟล์ และ component แม่/ลูกที่เกี่ยวข้อง จดว่า pattern เดิมใช้อะไร (Stack vs Box, map สถานะ → สี ที่มีอยู่, prop API)

### 2. แปลงแบบเป็นรายการค่า

ถ้ามี CSS จาก Figma (วางลงไฟล์ชั่วคราวก่อน หรือ pipe เข้า stdin ด้วย `-`):

```bash
node $S/figma-css-to-sx.mjs <file.css> --theme <name>
```

ได้ 3 ส่วนต่อ layer:
- **sx ที่แนะนำ** — token, spacing unit, variant ของ theme นั้น
- **DROPPED** — noise ของ Figma ที่ห้ามลอก (`position: absolute` + `left/top`, width/height ตายตัว, `font-family`, `flex: none`, `order`, line-height ที่ variant กำหนดให้แล้ว)
- **REVIEW** — ค่าที่ไม่ลง token → ตัดสินใจตามขั้น 4

ถ้ามีแต่ภาพ: ไล่ทีละส่วน แล้วเทียบกับตาราง `colors`/`typography` ใน config ด้วยตัวเอง (กติกาใน `references/mapping-rules.md`)

ผลสคริปต์เป็น **วัตถุดิบ** ไม่ใช่โค้ดสำเร็จ CSS ไม่บอกความหมาย ต้องดูภาพประกอบเสมอ
(สีแดงนั้นคือ "เกินกำหนด" → `error.main` ไม่ใช่แค่ hex)

### 3. หา component ที่มีอยู่แล้ว ก่อนเขียน sx

- ดู `components` ใน config (`button`, `dialog`, `confirmDialog`, `emptyState`, `table`, `catalog`) แล้วเปิดไฟล์จริงดู props
- `ls` โฟลเดอร์ components ของ feature นั้น — มี component/map สถานะ → สี ที่ทำหน้าที่ใกล้เคียงอยู่แล้วไหม ถ้ามี map เดิม **ต้องเพิ่มเข้า map เดิม**
- เปิดไฟล์ theme ของ theme นั้น (`themes.<name>.sources`) ดู `components` overrides — ค่าในแบบที่ตรงกับ override
  (ความสูงปุ่ม, ขอบ Card, padding ของ TableCell, radius) **ไม่ต้องใส่ใน sx**

### 4. ตัดสินใจกับค่าที่ไม่ลงตัว

| กรณี | ทำ |
|---|---|
| สีห่างจาก token เล็กน้อย (สคริปต์บอก `≈ token`) | ใช้ token แจ้งในรายงาน |
| สีนอก palette ที่แบบตั้งใจ (สถานะ, กราฟ, ขอบพิเศษ) | const UPPER_CASE บนสุดของไฟล์ หรือเพิ่มเข้า map เดิมของ feature พร้อม `// figma: <layer>` |
| สีใหม่ที่ต้องใช้ ≥ 2 feature, หรือแบบขัดกับ theme override/มาตรฐาน shared component (ความสูงปุ่ม, radius, เงา) | **หยุดถามผู้ใช้** ห้ามแก้ palette/theme เอง และห้าม sx ทับ shared component เพื่อให้ตรงแบบเป๊ะ |
| ระยะนอก grid ของ spacing | ปัดเข้า grid แจ้งในรายงาน |
| fontSize ไม่ตรง variant (> 1px) | variant ใกล้สุด + `fontSize` เป็น rem |
| width/height ตายตัว | ทิ้ง ยกเว้นไอคอน, avatar, วงกลม/กรอบไอคอน, คอลัมน์ตาราง, control ที่ต้องกว้างคงที่ |

### 5. แก้โค้ด

- diff เล็กสุด คง props/API เดิม คง logic (การคำนวณ, เงื่อนไขแสดงผล) ทุกบรรทัด เว้นแต่แบบเปลี่ยนพฤติกรรมจริง ถ้าเปลี่ยน ให้บอก
- ข้อความ (copy) คัดลอกจากแบบตรงตัว ถ้าต่างจากโค้ดเดิม ให้บอกในรายงาน
- ใช้ pattern เดิมของไฟล์ (เช่น `Stack direction/spacing` แทน `display: flex + gap`)
- ใส่ state ที่แบบไม่ได้วาดแต่ต้องมี: hover/focus-visible ของสิ่งที่คลิกได้, disabled, loading, ค่าว่าง, ข้อความยาว (wrap/ellipsis), ตัวเลขยาว (`tabular-nums`, `nowrap`)
- a11y: `IconButton` ต้องมี `aria-label` · **`aria-label` บน MUI `*Icon` ใช้ไม่ได้** (SvgIcon ใส่ `aria-hidden` ให้เองถ้าไม่มี `titleAccess`) → ใช้ `titleAccess` หรือใส่ label ที่ข้อความ/wrapper · ความหมายต้องไม่พึ่งสีอย่างเดียว · ลิงก์ใช้ `href`/`component={Link}` ไม่ใช่ `onClick` + router
- ต้องแก้ shared component: เพิ่ม prop optional เท่านั้น แล้วนับจุดที่ใช้ (`grep -rn "<Component" src | wc -l`) ใส่ในรายงาน
- กติกา lint/compiler ของโปรเจกต์ (ดู CLAUDE.md / README ของโปรเจกต์) มาก่อน skill นี้เสมอ

### 6. ตรวจ

```bash
node $S/check-ui.mjs --diff           # เฉพาะบรรทัดที่เพิ่ม — ต้องไม่มี FAIL; WARN ต้องแก้หรืออธิบาย
<typecheck> && <lint>                 # คำสั่งของโปรเจกต์ (ดู package.json / CLAUDE.md)
<build>                               # เมื่อแก้ shared component / theme
```

`check-ui.mjs` ตรวจ 13 ข้อ — FAIL: hex ที่เป็น token อยู่แล้ว, `fontFamily`, `!important`, `IconButton` ไม่มี label,
`aria-label` บน MUI Icon · WARN: สีนอก palette inline, absolute + พิกัด, px spacing, fontSize px, เงา literal,
sx ทับขนาด/มุม/เงาของ shared component, `@mui Button` / Dialog ทำเอง ใน feature

ถ้าเปิดเบราว์เซอร์ได้ ให้เปิดหน้าจริงเทียบกับภาพแบบ ถ้าไม่ได้เปิด บอกตรง ๆ ว่ายังไม่ได้ดูบนจอ

### 7. รายงาน

```markdown
**theme:** dense (BalanceCell ← AccountsPage ซึ่งอยู่ใน <DenseSection>)

| ในแบบ | ในโค้ด | หมายเหตุ |
|---|---|---|
| bg `#FEF3F2` | `bgcolor: "error.light"` | ตรง token |
| 14px / 700 | `variant="body2"` + `fontWeight: 700` | dense body2 = 14px (ใน app theme 14px คือ caption) |
| border `#FDA29B` | `OVERDUE_BORDER` const | นอก palette |
| width 128, left 1164 | (ทิ้ง) | ค่าจาก artboard |

**ต่างจากแบบ:** ...  ·  **กระทบหน้าอื่น:** ไม่มี / `<Component>` ใช้อยู่ N จุด
**ต้องตัดสินใจ:** ...
**ตรวจแล้ว:** check-ui 0 FAIL · typecheck ✓ · lint ✓ · ยังไม่ได้เปิดดูบนเบราว์เซอร์
```

## ข้อห้าม

- ห้ามใส่ hex/px ที่มี token อยู่แล้ว, `fontFamily`, `!important`, `position: absolute` + พิกัดจาก artboard
- ห้ามใช้ variant/token ของ theme ผิดตัว — ตรวจ theme ก่อนเสมอ
- ห้ามสร้างปุ่ม/dialog/empty state/ตารางใหม่เมื่อโปรเจกต์มี shared component
- ห้าม sx ทับขนาด/มุม/เงา/น้ำหนักของ shared component เพื่อให้ตรงแบบหน้าเดียว — รายงานแทน
- ห้ามเปลี่ยน default ของ shared component หรือ theme เพื่อหน้าเดียว
- ห้าม refactor/เปลี่ยน logic ที่แบบไม่ได้ขอ
- ห้ามรายงานว่า "ตรงแบบแล้ว" ถ้ายังไม่ได้เทียบกับภาพ หรือยังไม่ได้รัน typecheck/lint
