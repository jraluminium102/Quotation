// Supabase admin client (service role) — bypass RLS
// ใช้ฝั่ง server เท่านั้น สำหรับงาน privileged (เช่น utility/seed)
// ห้าม import เข้า client component เด็ดขาด
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
