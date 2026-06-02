import Icon from "@/components/Icon";

export const metadata = { title: "เครื่องคิดราคา R3.9 — JR ERP" };

// เครื่องคิดราคา R3.9 (สูตรที่ตรวจแล้ว) เสิร์ฟจาก /public/calculator/index.html
// ฝังผ่าน iframe เพื่อ reuse สูตรเดิมทั้งหมด (ไม่ rewrite) — หน้านี้อยู่หลัง auth
export default function CalculatorPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-brand-dark flex items-center gap-2.5">
          <span className="text-white rounded-xl w-9 h-9 inline-flex items-center justify-center bg-brand shadow-brand">
            <Icon name="calculator" size={18} />
          </span>
          เครื่องคิดราคา R3.9
        </h1>
        <a
          href="/calculator/index.html" target="_blank" rel="noopener noreferrer"
          className="press inline-flex items-center gap-1.5 glass-soft rounded-xl px-4 py-2 text-sm font-semibold text-brand-dark"
        >
          <Icon name="external" size={15} /> เปิดเต็มจอ (แท็บใหม่)
        </a>
      </div>

      <div className="glass rounded-2xl overflow-hidden" style={{ height: "calc(100dvh - 150px)" }}>
        <iframe
          src="/calculator/index.html"
          title="เครื่องคิดราคา R3.9"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
