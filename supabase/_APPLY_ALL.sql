-- ============================================================
-- JR ERP — ระบบบัญชี P1 · รวมทุก migration ไว้แปะรอบเดียว
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งหมด > Run
-- (รันซ้ำได้ถ้าเริ่มจาก DB ว่าง — ถ้าเคยรันแล้วให้ DROP ก่อน หรือข้าม)
-- ============================================================

-- ========== 0001 SCHEMA ==========
create type user_role as enum ('sales', 'admin', 'owner', 'viewer');
create type quotation_status as enum ('draft', 'sent', 'approved', 'cancelled');

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        user_role not null default 'sales',
  created_at  timestamptz not null default now()
);

create table public.customers (
  id             bigint generated always as identity primary key,
  name           text not null,
  job            text not null default '',
  address        text not null default '',
  tax_id         text not null default '',
  line_id        text not null default '',
  phone          text not null default '',
  contact_person text not null default '',
  is_active      boolean not null default true,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.document_sequences (
  doc_type     text not null,
  year_be      int  not null,
  month        int  not null,
  last_running int  not null default 0,
  primary key (doc_type, year_be, month)
);

create table public.quotations (
  id                bigint generated always as identity primary key,
  code              text not null unique,
  customer_id       bigint references public.customers(id),
  customer_snapshot jsonb not null,
  issue_date        date not null default current_date,
  status            quotation_status not null default 'draft',
  vat_rate          numeric(5,2) not null default 7,
  discount_pct      numeric(5,2) not null default 0,
  wht_rate          numeric(5,2) not null default 0,
  subtotal          numeric(14,2) not null default 0,
  discount_amt      numeric(14,2) not null default 0,
  vat_amt           numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,
  wht_amt           numeric(14,2) not null default 0,
  net               numeric(14,2) not null default 0,
  note              text not null default '',
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.quotations (status);
create index on public.quotations (customer_id);

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

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_customers_touch  before update on public.customers  for each row execute function public.touch_updated_at();
create trigger trg_quotations_touch before update on public.quotations for each row execute function public.touch_updated_at();

-- ========== 0002 FUNCTIONS ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce((new.raw_user_meta_data->>'role')::user_role, 'sales'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.next_document_code(p_doc_type text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_now   timestamptz := now() at time zone 'Asia/Bangkok';
  v_year  int := extract(year  from v_now)::int + 543;
  v_month int := extract(month from v_now)::int;
  v_run   int;
begin
  insert into public.document_sequences (doc_type, year_be, month, last_running)
  values (p_doc_type, v_year, v_month, 1)
  on conflict (doc_type, year_be, month)
  do update set last_running = public.document_sequences.last_running + 1
  returning last_running into v_run;
  return p_doc_type || lpad(v_year::text,4,'0') || lpad(v_month::text,2,'0') || lpad(v_run::text,4,'0');
end $$;

-- ========== 0003 RLS ==========
alter table public.profiles           enable row level security;
alter table public.customers          enable row level security;
alter table public.quotations         enable row level security;
alter table public.quotation_items    enable row level security;
alter table public.document_sequences enable row level security;

create or replace function public.can_write()
returns boolean language sql stable as $$
  select public.current_user_role() in ('sales','admin','owner');
$$;

create policy "อ่าน profile ตัวเอง" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'owner');
create policy "แก้ profile ตัวเอง" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "อ่าน customers" on public.customers for select to authenticated using (true);
create policy "เพิ่ม customers" on public.customers for insert to authenticated with check (public.can_write());
create policy "แก้ customers"  on public.customers for update to authenticated using (public.can_write()) with check (public.can_write());

create policy "อ่าน quotations" on public.quotations for select to authenticated using (true);
create policy "เพิ่ม quotations" on public.quotations for insert to authenticated with check (public.can_write());
create policy "แก้ quotations"  on public.quotations for update to authenticated using (public.can_write()) with check (public.can_write());

create policy "อ่าน items" on public.quotation_items for select to authenticated using (true);
create policy "จัดการ items" on public.quotation_items for all to authenticated using (public.can_write()) with check (public.can_write());

-- ========== SEED (ลูกค้าตัวอย่าง) ==========
insert into public.customers (name, job, address, tax_id, line_id, phone, contact_person) values
  ('คุณสมชาย รุ่งเรือง', 'บ้านทรายทอง', '13 พหลโยธิน 25 จตุจักร กทม. 10140', '1100xxxxxxxxx', '@somchai', '089-xxx-1234', 'คุณสมชาย'),
  ('คุณเอ ทุ่งครุ', 'ต่อเติมครัวหลังบ้าน', '88/12 ประชาอุทิศ ทุ่งครุ กทม.', '', '@aeyy', '081-xxx-5678', 'คุณเอ'),
  ('บจก. กรีนวิว', 'อาคารสำนักงาน 3 ชั้น', '200 รัชดาภิเษก ห้วยขวาง กทม.', '0105xxxxxxxxx', '@greenview', '02-xxx-9000', 'ฝ่ายจัดซื้อ');

-- เสร็จแล้ว — กลับมาบอก Claude เพื่อสร้าง user owner + เทสต์ flow
