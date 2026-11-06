# Mapping rules — แปลงค่าจาก Figma เป็น MUI theme

กติกาที่สคริปต์ `figma-css-to-sx.mjs` ใช้ และที่ต้องใช้เองเมื่อมีแต่ภาพแบบ ค่าจริงของแต่ละโปรเจกต์อยู่ใน `ui-adjust.config.json`

## theme ซ้อน

MUI ใช้ `ThemeProvider` ซ้อนกันได้ component ได้ theme จาก provider ที่ใกล้ที่สุด **รวม Dialog/Menu/Popover/Tooltip**
ที่ render ผ่าน portal เพราะ React context ไม่ขาดตาม DOM

ผลคือ `text.secondary`, `body2`, `caption` อาจให้สีหรือขนาดต่างกันในแต่ละ theme เช่นในโปรเจกต์ตัวอย่าง:

| | app theme | dense theme |
|---|---|---|
| `text.secondary` | `#475467` | `#344054` |
| 14px | `caption` | `body2` |
| 12px | `overline` (ตัวพิมพ์ใหญ่!) → ใช้ `caption` + `fontSize` | `caption` |

ถ้า component ถูกใช้ทั้งในและนอก wrapper ให้ใช้ token เชิงความหมายเท่านั้น และทดสอบทั้งสองบริบท

## สี

1. **ตรง token** → ใช้ path ของ token (`"error.light"`, `"text.secondary"`, `"divider"`)
2. **`text.primary` บน Typography** → ไม่ต้องใส่ เป็น default
3. **`#FFFFFF`** → พื้น = `background.paper`, ตัวอักษร/ไอคอนบนพื้นสี = `common.white` หรือ `<color>.contrastText`
4. **ความโปร่งใส** (`rgba(r,g,b,a)` ของสี token) → `(t) => alpha(t.palette.<token>, a)` (`alpha` จาก `@mui/material/styles`)
5. **ใกล้ token** (`≈`, ห่างไม่เกิน `nearThreshold`) → ใช้ token แจ้งในรายงาน
6. **theme ทำให้แล้ว** (`handled` ใน config เช่นสี hover ของปุ่ม, ขอบ input) → ไม่ต้องเขียน
7. **นอก palette** → อย่า snap เข้า token เงียบ ๆ (สีบนจอจะเปลี่ยน) ให้เป็น const UPPER_CASE + `// figma: <layer>`
   หรือเพิ่มเข้า map สถานะ → สี ที่ feature มีอยู่ ถ้าต้องใช้ ≥ 2 feature ให้ถามว่าจะเพิ่มเข้า palette หรือไม่

## ระยะ

`theme.spacing(1)` = `spacingUnit` (ปกติ 8px) ใน sx ใช้ตัวเลข: `p: 2` = 16px, `gap: 1.5` = 12px, `0.5` = 4px, `0.25` = 2px
ค่าที่ไม่ลง grid 2px ให้ปัดเข้า grid แล้วแจ้ง ยกเว้นค่านั้นมาจาก override ของ theme อยู่แล้ว (เช่น padding ของ TableCell)

## ตัวอักษร

- **ห้ามใส่ `fontFamily`** — Figma ใส่มาทุก layer แต่ theme ตั้งไว้แล้ว
- เลือก variant ที่ขนาดห่างไม่เกิน 1px จาก `themes.<name>.typography` ถ้าเท่ากันหลายตัว เลือก body → caption → heading → subtitle
  (ข้อความตัวหนา ≥ 600 เลือก heading ก่อน) ไม่เลือก `overline` เว้นแต่แบบเป็นตัวพิมพ์ใหญ่ ไม่เลือก `button` สำหรับข้อความทั่วไป
- ไม่มี variant ใกล้พอ → variant ใกล้สุด + `fontSize` เป็น rem
- `line-height` จาก Figma ทิ้งได้เมื่อใช้ variant ใส่เป็น ratio เมื่อแบบต่างชัดเจน
- `font-weight` ใส่เองได้
- ตัวเลขเงิน/จำนวน: `fontVariantNumeric: "tabular-nums"` + `whiteSpace: "nowrap"`

## มุม เงา ขอบ

- `borderRadius` ใน sx เป็นตัวคูณของ `theme.shape.borderRadius` (`radiusUnit`): 8px → `1`, 6px → `0.75`, 4px → `0.5`, pill → `"999px"`
- Card/Paper/Dialog/Button/Input/Chip มักได้ radius จาก theme แล้ว — ตรวจ overrides ก่อนใส่
- เงา: ตรงกับ `themes.<name>.shadows` → `boxShadow: <index>` ไม่ตรง → ใช้ elevation ที่ใกล้ หรือขอบ `divider` แล้วแจ้ง
- ขอบ `1px solid <token>` → `border: 1, borderColor: "<token>"`

## สิ่งที่ทิ้งได้เสมอ

| Figma | เหตุผล |
|---|---|
| `position: absolute` + `left/top/right/bottom` | พิกัดบน artboard ไม่ใช่ layout |
| `width`/`height` ตายตัวของ container/ข้อความ | ให้เนื้อหา/flex กำหนด (เก็บไว้เฉพาะไอคอน, avatar, กรอบไอคอน, control กว้างคงที่) |
| `font-family`, `font-style: normal` | theme กำหนด |
| `flex: none`, `order`, `flex-grow: 0`, `align-self: stretch` | ค่าภายในของ auto layout |
| `box-sizing`, `isolation`, `mix-blend-mode` (ถ้าไม่ได้ตั้งใจ) | artefact ของ Figma |
| ค่า box ของ layer ที่เป็นปุ่ม (padding, radius, height, shadow) | ปุ่มของ design system กำหนด |

## Tailwind CSS (`"format": "tailwind"`)

กติกาเดียวกับข้างบน แต่ผลลัพธ์เป็น utility class และ token คือชื่อใน `@theme` (v4) หรือ `theme` / `theme.extend` (v3)

| Figma | Tailwind | หมายเหตุ |
|---|---|---|
| `background: #FEF3F2` (เป็น token `--color-danger-50`) | `bg-danger-50` | ใช้ชื่อ token ของโปรเจกต์ก่อนสีของ Tailwind (`red-50`) เสมอ — init-config ให้ token ของโปรเจกต์ชนะเมื่อ hex ซ้ำ |
| `color: #0F766E` | `text-brand-600` | ข้อความ/ไอคอนใช้ `text-*` (ไอคอน SVG ใช้ `currentColor`) |
| `border: 1px solid #EAECF0` | `border border-line` | ความหนา 2px → `border-2` |
| `rgba(15,118,110,0.1)` | `bg-brand-600/10` | opacity modifier แทน arbitrary rgba |
| สีนอก theme | `border-[#FDA29B]` + คอมเมนต์ `figma: <layer>` | แล้วเสนอเพิ่ม `--color-…` ใน `@theme` ถ้าจะใช้ซ้ำ |
| `padding: 4px 8px` | `px-2 py-1` | scale = `--spacing` (default 4px): 2px → `0.5`, 6px → `1.5`, 12px → `3` |
| `gap: 12px` | `gap-3` | |
| `font-size: 14px` | `text-sm` | ใช้ขนาดจาก config (`typography`) ไม่ต้องใส่ `leading-*` ถ้าแบบไม่ต่างชัด |
| `font-weight: 600` | `font-semibold` | 400 ไม่ต้องใส่ |
| `border-radius: 6px` | `rounded-md` | ตาม `radius` ใน config (v4: sm 4, md 6, lg 8, xl 12 · v3: DEFAULT 4, md 6, lg 8) · pill → `rounded-full` |
| `max-width: 320px` | `max-w-xs` | ตาม `containers` ใน config |
| `box-shadow` ที่ตรง token | `shadow-sm` / `shadow-xs` | ไม่ตรง → ถาม หรือใช้ border |
| `width: 56px; height: 56px` ของกรอบไอคอน | `size-14` | เก็บเฉพาะไอคอน/กรอบไอคอน/avatar — container ทั่วไปให้เนื้อหากำหนด |
| `position: absolute; left: 1164px` | (ทิ้ง) | |
| `font-family: 'Inter'` | (ทิ้ง) | `--font-sans` ของ theme |

- **arbitrary value (`[…]`) เป็นทางเลือกสุดท้าย** ใช้ได้เมื่อไม่มี token จริง ๆ และต้องแจ้งในรายงาน
- **ปุ่ม/badge/input ของ design system** มักมี `variant` / `size` อยู่แล้ว (`cva`, object map) — เลือกจากที่มี อย่าส่ง `className` ทับขนาด/มุม/น้ำหนัก
- **รวม class** ด้วย helper ที่ไฟล์ใช้อยู่ (`cn`, `clsx`, `twMerge`) และคงลำดับ/โครงสร้างเงื่อนไขเดิม
- **โหมดมืด**: ถ้าโปรเจกต์ใช้ `dark:` ให้ใส่คู่ `dark:` ด้วย token เช่นกัน ถ้า token เป็น CSS variable ที่สลับตาม theme อยู่แล้ว ไม่ต้องใส่
