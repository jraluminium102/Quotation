export type UserRole = "sales" | "admin" | "owner" | "viewer";
export type QuotationStatus = "draft" | "sent" | "approved" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface Customer {
  id: number;
  name: string;
  job: string;
  address: string;
  tax_id: string;
  line_id: string;
  phone: string;
  contact_person: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  name: string;
  detail: string;
  qty: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface Quotation {
  id: number;
  code: string;
  customer_id: number | null;
  customer_snapshot: Pick<Customer, "name" | "job" | "address" | "tax_id" | "line_id" | "phone" | "contact_person">;
  issue_date: string;
  status: QuotationStatus;
  vat_rate: number;
  discount_pct: number;
  wht_rate: number;
  subtotal: number;
  discount_amt: number;
  vat_amt: number;
  total: number;
  wht_amt: number;
  net: number;
  note: string;
  created_at: string;
  updated_at: string;
  quotation_items?: QuotationItem[];
}

export const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "ร่าง",
  sent: "ส่งลูกค้า",
  approved: "อนุมัติ",
  cancelled: "ยกเลิก",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  sales: "เซลล์",
  admin: "แอดมิน/บัญชี",
  owner: "เจ้าของ (Owner)",
  viewer: "ดูอย่างเดียว",
};
