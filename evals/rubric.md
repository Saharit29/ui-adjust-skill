# Rubric — ให้คะแนนงานปรับ UI (10 คะแนน)

ใช้ให้คะแนนทั้ง AI ปกติ (baseline) และ AI + skill ด้วยเกณฑ์เดียวกัน ข้อ 2–3 และ 7 ใช้ `check-ui.mjs` ช่วย ข้อ 9 ใช้ `tsc --noEmit`
ส่วนข้ออื่นตรวจจาก diff และข้อความตอบกลับ

| # | เกณฑ์ | คะแนน | Task A (BalanceCell) | Task B (Dashboard EmptyState) |
|---|---|---|---|---|
| 1 | theme ถูก + variant ถูกตาม theme | 2 | dense · 14px → `body2`, 12px → `caption` | app · 16px → `body1`, 14px → `caption` |
| 2 | ไม่มี hex ที่เป็น token อยู่แล้ว | 1 | `check-ui` rule `token-hex` = 0 | เหมือนกัน |
| 3 | ไม่ลอก noise ของ Figma (`fontFamily`, absolute + พิกัด, width/height ของ container, เงา literal) | 1 | | |
| 4 | ค่าที่ไม่ลง token จัดการอย่างตั้งใจ | 1 | ขอบ `#FDA29B` เป็น const + แจ้ง | ไม่ sx ทับความสูง/น้ำหนัก/เงาของ `AppButton` แต่แจ้งว่าต่างจากแบบ |
| 5 | ใช้ของที่มีอยู่ | 1 | คง `isOverdue`/`formatCurrency`/โครงสร้างเดิม | `AppButton` (ไม่สร้างปุ่มเอง) |
| 6 | พฤติกรรมเดิมไม่เสีย + บอกสิ่งที่เปลี่ยน | 1 | props `align`/`showInvoiceCount` คงอยู่, แจ้งว่าบรรทัด "N unpaid invoices" ไม่แดงแล้ว | panel อื่นไม่มีปุ่ม, ปุ่มเป็นลิงก์จริงไป `/inbox` |
| 7 | a11y ถูกต้อง | 1 | ไอคอนเตือนถูกอ่านจริง (`titleAccess` ไม่ใช่ `aria-label`) | ปุ่มเป็น `<a href>` |
| 8 | รายงาน: mapping, จุดที่ต่างจากแบบ, บอกตามจริงว่ายังไม่ได้ตรวจอะไร | 1 | | |
| 9 | `tsc --noEmit` ผ่าน | 1 | | |

ข้อสังเกตที่ไม่ได้ให้คะแนนแยก (บันทึกไว้ใน comparison.md): ใช้หน่วยของ theme หรือ px string, ใช้ข้อความตามแบบหรือคงข้อความเดิม,
แยก "เรื่องที่ต้องตัดสินใจ" ออกมาหรือไม่, ขนาด diff, tokens/เวลาที่ใช้
