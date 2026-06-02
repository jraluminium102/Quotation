-- ============================================================
-- JR ERP — ระบบบัญชี P1 · Schema
-- Customer Master + ใบเสนอราคา + รหัสออโต้ + profiles(role)
-- ============================================================

-- ---------- Enums ----------
create type user_role as enum ('sales', 'admin', 'owner', 'viewer');
create type quotation_status as enum ('draft', 'sent', 'approved', 'cancelled');

-- ---------- profiles (1:1 กับ auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        user_role not null default 'sales',
  created_at  timestamptz not null default now()
);
comment on table public.profiles is 'ข้อมูลผู้ใช้ + role (Sales/Admin/Owner/Viewer)';

-- ---------- customers (P0-1) ----------
create table public.customers (
  id             bigint generated always as identity primary key,
  name           text not null,                 -- ชื่อลูกค้า/งาน
  job            text not null default '',       -- ชื่องาน/โปรเจกต์
  address        text not null default '',       -- ที่อยู่ออกบิล
  tax_id         text not null default '',       -- เลขผู้เสียภาษี
  line_id        text not null default '',
  phone          text not null default '',
  contact_person text not null default '',
  is_active      boolean not null default true,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.customers using gin (to_tsvector('simple', name || ' ' || job || ' ' || phone || ' ' || line_id));

-- ---------- document_sequences (รหัสออโต้ — reset รายเดือน) ----------
-- คีย์: (doc_type, year_be, month) ; พ.ศ. = ค.ศ. + 543
create table public.document_sequences (
  doc_type     text not null,        -- 'QT' | 'BL' | 'INV'
  year_be      int  not null,        -- พ.ศ. เช่น 2568
  month        int  not null,        -- 1-12
  last_running int  not null default 0,
  primary key (doc_type, year_be, month)
);

-- ---------- quotations (P0-2) ----------
create table public.quotations (
  id                bigint generated always as identity primary key,
  code              text not null unique,         -- QT2568060001
  customer_id       bigint references public.customers(id),
  customer_snapshot jsonb not null,               -- snapshot ข้อมูลลูกค้า ณ วันออก
  issue_date        date not null default current_date,
  status            quotation_status not null default 'draft',
  vat_rate          numeric(5,2) not null default 7,    -- 0 หรือ 7
  discount_pct      numeric(5,2) not null default 0,    -- ≤ 2
  wht_rate          numeric(5,2) not null default 0,    -- 0/3/5
  subtotal          numeric(14,2) not null default 0,
  discount_amt      numeric(14,2) not null default 0,
  vat_amt           numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,   -- หลัง VAT
  wht_amt           numeric(14,2) not null default 0,
  net               numeric(14,2) not null default 0,   -- ยอดรับสุทธิ
  note              text not null default '',
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.quotations (status);
create index on public.quotations (customer_id);

-- ---------- quotation_items ----------
create table public.quotation_items (
  id           bigint generated always as identity primary key,
  quotation_id bigint not null references public.quotations(id) on delete cascade,
  name         text not null,
  detail       text not null default '',
  qty          numeric(12,2) not null default 1,
  unit_price   numeric(14,2) not null default 0,
  line_total   numeric(14,2) not null default 0,
  sort_order   int not null default 0
);
create index on public.quotation_items (quotation_id);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_customers_touch  before update on public.customers  for each row execute function public.touch_updated_at();
create trigger trg_quotations_touch before update on public.quotations for each row execute function public.touch_updated_at();
