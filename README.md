# JR ERP — ระบบบัญชี (Billing & AR) · P1

Webapp ตาม PRD ระบบบัญชี · **Next.js 14 (App Router) + Supabase + Vercel** · สถาปัตยกรรม **BFF**

> ขอบเขตรอบนี้ = **P1**: ทะเบียนลูกค้า (Customer Master) + ใบเสนอราคา (Quotation) + รหัสออโต้ + พิมพ์ PDF + Auth/Role
> ทุน-กำไร (ownerMode), ใบวางบิล, ใบเสร็จ, งวดชำระ, AR dashboard, เชื่อม R3.9 → อยู่ P2-P4 (ยังไม่ build)

---

## สถาปัตยกรรม BFF

```
Browser (React)
   │  เรียกเฉพาะ  →  Next.js (RSC + /api Route Handlers)   ← BFF layer
   │                         │  ใช้ Supabase server client (เคารพ RLS)
   └────────────────────────▶└─────────────────────────────▶ Supabase (Postgres + Auth)
```

- **Browser ไม่เคยต่อ Supabase ตรง** — คุยกับ Next.js เท่านั้น (RSC สำหรับอ่าน, `/api/*` สำหรับเขียน/ค้นหา)
- ยอดเงินคำนวณฝั่ง server (`src/lib/money.ts`) = แหล่งความจริงเดียว (กฎเหล็ก "ยอดต้องตรง")
- รหัสเอกสารออกจาก Postgres function แบบ atomic — กันเลขซ้ำ/ข้าม

---

## ติดตั้งครั้งแรก

### 1) ติดตั้ง Node.js
ดาวน์โหลด LTS ที่ https://nodejs.org (เครื่องนี้ยังไม่มี node) แล้ว:
```bash
cd webapp
npm install
```

### 2) สร้าง Supabase project
1. สมัคร/สร้าง project ที่ https://supabase.com
2. ไปที่ **SQL Editor** → รันไฟล์ตามลำดับ:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_rls.sql`
   - (ทางเลือก) `supabase/seed.sql` — ลูกค้าตัวอย่าง
3. **Project Settings > API** คัดลอก URL / anon key / service_role key

### 3) ตั้งค่า env
```bash
cp .env.local.example .env.local
# เติม NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 4) สร้างผู้ใช้ + ตั้ง role
- **Authentication > Users > Add user** (อีเมล+รหัสผ่าน) — profile จะถูกสร้างอัตโนมัติ (trigger)
- ตั้งให้เป็น Owner (พี่นัท) ใน SQL Editor:
```sql
update public.profiles set role='owner', full_name='พี่นัท'
where id = (select id from auth.users where email='ใส่อีเมล');
```
role: `sales` / `admin` / `owner` เขียนได้ · `viewer` อ่านอย่างเดียว

### 5) รัน
```bash
npm run dev      # http://localhost:3000
```

---

## Deploy ขึ้น Vercel
1. push โค้ดขึ้น GitHub
2. Vercel > New Project > import repo > **Root Directory = `webapp`**
3. ใส่ env 3 ตัวเดียวกัน (Settings > Environment Variables)
4. Deploy — Supabase รองรับ serverless ได้เลย

---

## โครงสร้างไฟล์

```
webapp/
├─ supabase/migrations/      # schema, functions(รหัสออโต้ พ.ศ.), RLS
├─ middleware.ts             # refresh session + กันหน้าใน
└─ src/
   ├─ lib/
   │  ├─ supabase/server.ts  # client เคารพ RLS (RSC/handlers)
   │  ├─ supabase/admin.ts   # service role (server only)
   │  ├─ money.ts            # สูตรยอดเงิน (แหล่งความจริงเดียว)
   │  ├─ auth.ts             # getProfile / canWrite
   │  └─ bff.ts              # helper response
   ├─ app/
   │  ├─ login/              # Supabase Auth (server action)
   │  ├─ (app)/              # หน้าใน (มี Shell sidebar)
   │  │  ├─ dashboard/
   │  │  ├─ customers/       # P0-1
   │  │  └─ quotations/      # P0-2  (new / [id] / [id]/print)
   │  └─ api/                # BFF: customers, quotations
   └─ components/            # Shell, Icon(SVG), ui, QuotationForm
```

## API (BFF)
| Method | Path | สิทธิ์ |
|---|---|---|
| GET/POST | `/api/customers` | อ่าน=login · เขียน=sales/admin/owner |
| GET/PATCH | `/api/customers/[id]` | เขียน=sales/admin/owner |
| GET/POST | `/api/quotations` | สร้าง=ออกรหัส+คำนวณยอด server-side |
| GET | `/api/quotations/[id]` | login |
| PATCH | `/api/quotations/[id]/status` | sales/admin/owner |

## รหัสเอกสาร (Q-1 = พ.ศ. รีเซ็ตรายเดือน)
`QT` + ปี พ.ศ.(4) + เดือน(2) + running(4) → `QT2568060001`
ออกจาก function `next_document_code('QT')` แบบ atomic (upsert) · running เริ่มใหม่ทุกเดือน

---
*P1 v0.1 · อ้างอิง PRD ระบบบัญชี · JR Aluminium and Glass*
