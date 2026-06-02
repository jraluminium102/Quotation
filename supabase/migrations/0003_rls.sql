-- ============================================================
-- Row Level Security
-- หลัก: ทุกคนที่ login อ่านได้ · เขียนได้เฉพาะ sales/admin/owner
-- viewer = อ่านอย่างเดียว
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.customers         enable row level security;
alter table public.quotations        enable row level security;
alter table public.quotation_items   enable row level security;
alter table public.document_sequences enable row level security;

-- helper: เขียนได้ไหม
create or replace function public.can_write()
returns boolean language sql stable as $$
  select public.current_user_role() in ('sales','admin','owner');
$$;

-- ---------- profiles ----------
create policy "อ่าน profile ตัวเอง" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'owner');
create policy "แก้ profile ตัวเอง (ชื่อ)" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- customers ----------
create policy "อ่าน customers (login)" on public.customers
  for select to authenticated using (true);
create policy "เพิ่ม customers" on public.customers
  for insert to authenticated with check (public.can_write());
create policy "แก้ customers" on public.customers
  for update to authenticated using (public.can_write()) with check (public.can_write());

-- ---------- quotations ----------
create policy "อ่าน quotations (login)" on public.quotations
  for select to authenticated using (true);
create policy "เพิ่ม quotations" on public.quotations
  for insert to authenticated with check (public.can_write());
create policy "แก้ quotations" on public.quotations
  for update to authenticated using (public.can_write()) with check (public.can_write());

-- ---------- quotation_items ----------
create policy "อ่าน items (login)" on public.quotation_items
  for select to authenticated using (true);
create policy "จัดการ items" on public.quotation_items
  for all to authenticated using (public.can_write()) with check (public.can_write());

-- document_sequences: ไม่เปิด policy ใด ๆ → เข้าถึงผ่าน function (security definer) เท่านั้น
