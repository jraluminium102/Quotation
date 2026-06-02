"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

interface ProductOption { id: string; name: string; cat: string; }
interface GlassOption { index: number; name: string; sellUplift: number; }
interface ColorOption { index: number; name: string; minPrice: number; }

interface LineItem {
  key: number;
  productId: string;
  productName: string;
  width: number;
  height: number;
  panels: number;
  qty: number;
  sell: number;       // ราคา/ชุด
  cost?: number | null;
  profit?: number | null;
  area: number;
  msgs: string[];
  addonLabel: string;
}

interface FormState {
  productId: string;
  width: string;
  height: string;
  panels: string;
  qty: string;
  glassIndex: string;
  colorIndex: string;
  tiltTurn: boolean;
  beam: boolean;
  motor: "" | "80" | "300";
  closer: string;
}

const INIT_FORM: FormState = {
  productId: "sliding_sms",
  width: "",
  height: "",
  panels: "1",
  qty: "1",
  glassIndex: "0",
  colorIndex: "0",
  tiltTurn: false,
  beam: false,
  motor: "",
  closer: "",
};

function fmt(n: number) { return Math.round(n).toLocaleString("th-TH"); }

export default function CalculatorPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [glass, setGlass] = useState<GlassOption[]>([]);
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const [form, setForm] = useState<FormState>(INIT_FORM);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<Omit<LineItem, "key" | "qty"> | null>(null);
  const [error, setError] = useState("");
  const [nextKey, setNextKey] = useState(1);

  // load product list
  useEffect(() => {
    fetch("/api/calculator/products")
      .then(r => r.json())
      .then(data => {
        setProducts(data.products ?? []);
        setGlass(data.glass ?? []);
        setColors(data.colors ?? []);
      })
      .catch(() => setError("ไม่สามารถโหลดรายการสินค้าได้"));

    // check owner role from profile API (use existing quotations API pattern)
    fetch("/api/calculator/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "sliding_sms", width: 2, height: 1, panels: 1, options: {} }),
    })
      .then(r => r.json())
      .then(data => {
        if (typeof data.cost !== "undefined") setIsOwner(true);
      })
      .catch(() => {});
  }, []);

  // group products by cat
  const catGroups = products.reduce<Record<string, ProductOption[]>>((acc, p) => {
    (acc[p.cat] = acc[p.cat] || []).push(p);
    return acc;
  }, {});

  const f = (k: keyof FormState, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const selectedProduct = products.find(p => p.id === form.productId);

  const doCalc = useCallback(async () => {
    setError("");
    const w = parseFloat(form.width);
    const h = parseFloat(form.height);
    if (!form.productId || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      setError("กรุณากรอก สินค้า + กว้าง + สูง");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/calculator/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          width: w,
          height: h,
          panels: parseInt(form.panels) || 1,
          options: {
            glassIndex: parseInt(form.glassIndex) || 0,
            colorIndex: parseInt(form.colorIndex) || 0,
            tiltTurn: form.tiltTurn,
            beam: form.beam,
            motor: form.motor || undefined,
            closer: parseFloat(form.closer) || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return; }
      setCalcResult({
        productId: form.productId,
        productName: selectedProduct?.name ?? form.productId,
        width: w,
        height: h,
        panels: parseInt(form.panels) || 1,
        sell: data.sell,
        cost: data.cost,
        profit: data.profit,
        area: data.area,
        msgs: data.msgs,
        addonLabel: data.addonLabel,
      });
      setIsOwner(typeof data.cost !== "undefined");
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
    setLoading(false);
  }, [form, selectedProduct]);

  const addItem = () => {
    if (!calcResult) return;
    const qty = parseInt(form.qty) || 1;
    setItems(prev => [
      ...prev,
      { ...calcResult, key: nextKey, qty },
    ]);
    setNextKey(k => k + 1);
    setCalcResult(null);
    setForm(INIT_FORM);
  };

  const removeItem = (key: number) => setItems(prev => prev.filter(i => i.key !== key));

  const totalSell = items.reduce((s, i) => s + i.sell * i.qty, 0);
  const totalCost = isOwner ? items.reduce((s, i) => s + ((i.cost ?? 0) * i.qty), 0) : null;

  const goToQuotation = () => {
    if (items.length === 0) return;
    const state = encodeURIComponent(JSON.stringify(
      items.map(i => ({
        name: i.productName,
        detail: [
          `กว้าง ${i.width} × สูง ${i.height} ม.`,
          i.panels > 1 ? `${i.panels} บาน` : "",
          i.addonLabel,
          ...i.msgs,
        ].filter(Boolean).join(" · "),
        qty: i.qty,
        unit_price: i.sell,
        line_total: i.sell * i.qty,
      }))
    ));
    router.push(`/quotations/new?items=${state}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
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
          <Icon name="external" size={15} /> เปิดเต็มจอ
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: input panel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-brand-dark">เลือกสินค้า</div>

            {/* Product dropdown */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">สินค้า / รุ่น</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand"
                value={form.productId}
                onChange={e => f("productId", e.target.value)}
              >
                {Object.entries(catGroups).map(([cat, prods]) => (
                  <optgroup key={cat} label={cat}>
                    {prods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Width / Height */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">กว้าง (ม.)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="เช่น 1.5"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand"
                  value={form.width}
                  onChange={e => f("width", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">สูง (ม.)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="เช่น 2.1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand"
                  value={form.height}
                  onChange={e => f("height", e.target.value)}
                />
              </div>
            </div>

            {/* Panels / Qty */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">จำนวนบาน</label>
                <input
                  type="number" min="1" step="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand"
                  value={form.panels}
                  onChange={e => f("panels", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">จำนวนชุด</label>
                <input
                  type="number" min="1" step="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand"
                  value={form.qty}
                  onChange={e => f("qty", e.target.value)}
                />
              </div>
            </div>

            {/* Glass */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">ชนิดกระจก</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand"
                value={form.glassIndex}
                onChange={e => f("glassIndex", e.target.value)}
              >
                {glass.map(g => (
                  <option key={g.index} value={g.index}>
                    {g.name}{g.sellUplift > 0 ? ` (+${g.sellUplift.toLocaleString()}/ตร.ม.)` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">สีอลูมิเนียม</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand"
                value={form.colorIndex}
                onChange={e => f("colorIndex", e.target.value)}
              >
                {colors.map(c => (
                  <option key={c.index} value={c.index}>
                    {c.name}{c.minPrice > 0 ? ` (min ${c.minPrice.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.tiltTurn} onChange={e => f("tiltTurn", e.target.checked)} />
                tilt &amp; turn +5,000/บาน (บานกระทุ้ง)
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.beam} onChange={e => f("beam", e.target.checked)} />
                เพิ่มคาน (BEAM rate)
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">มอเตอร์ (บานยก)</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-brand"
                    value={form.motor}
                    onChange={e => f("motor", e.target.value)}
                  >
                    <option value="">ไม่มี</option>
                    <option value="80">80 กก. (+18,000)</option>
                    <option value="300">300 กก. (+28,000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">โช้ค (บ.)</label>
                  <input
                    type="number" min="0" step="500" placeholder="เช่น 5000"
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
                    value={form.closer}
                    onChange={e => f("closer", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={doCalc}
              disabled={loading}
              className="press w-full bg-brand text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-50"
            >
              {loading ? "กำลังคำนวณ..." : "คำนวณ"}
            </button>
          </div>

          {/* Calc result */}
          {calcResult && (
            <div className="glass rounded-2xl p-4 space-y-2 border border-brand/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-dark">{calcResult.productName}</span>
                <span className="text-2xl font-extrabold text-brand">฿{fmt(calcResult.sell)}</span>
              </div>
              <div className="text-xs text-gray-500">
                พื้นที่ {calcResult.area.toFixed(2)} ตร.ม. · {calcResult.panels} บาน
              </div>
              {calcResult.addonLabel && (
                <div className="text-xs text-gray-600">{calcResult.addonLabel}</div>
              )}
              {calcResult.msgs.map((m, i) => (
                <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1">{m}</div>
              ))}

              {isOwner && calcResult.cost !== null && calcResult.cost !== undefined && (
                <div className="flex gap-4 text-xs border-t pt-2 mt-2">
                  <span>ต้นทุน: <strong className="text-orange-600">฿{fmt(calcResult.cost)}</strong></span>
                  {calcResult.profit !== null && calcResult.profit !== undefined && (
                    <span>กำไร: <strong className={calcResult.profit >= 20 ? "text-green-600" : "text-red-500"}>{calcResult.profit}%</strong></span>
                  )}
                </div>
              )}

              <button
                onClick={addItem}
                className="press w-full border-2 border-brand text-brand rounded-xl py-2 font-bold text-sm"
              >
                + เพิ่มรายการ ({parseInt(form.qty) || 1} ชุด)
              </button>
            </div>
          )}
        </div>

        {/* Right: item list */}
        <div className="lg:col-span-3 space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-brand-dark">รายการที่เพิ่ม</span>
              <span className="text-sm text-gray-500">{items.length} รายการ</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                ยังไม่มีรายการ — คำนวณแล้วกด &ldquo;เพิ่มรายการ&rdquo;
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.key} className="flex items-start gap-2 p-2.5 bg-white/60 rounded-xl border border-white/80">
                    <div className="text-xs text-gray-400 w-5 pt-0.5 shrink-0">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-dark truncate">{item.productName}</div>
                      <div className="text-xs text-gray-500">
                        {item.width}×{item.height} ม. · {item.panels} บาน · {item.qty} ชุด
                      </div>
                      {item.msgs.slice(0, 1).map((m, i) => (
                        <div key={i} className="text-xs text-gray-400 truncate">{m}</div>
                      ))}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-brand">฿{fmt(item.sell)}/ชุด</div>
                      {item.qty > 1 && (
                        <div className="text-xs text-gray-500">รวม ฿{fmt(item.sell * item.qty)}</div>
                      )}
                      {isOwner && item.cost !== null && item.cost !== undefined && (
                        <div className="text-xs text-orange-500">ทุน ฿{fmt(item.cost)}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      className="press text-gray-400 hover:text-red-500 p-1 shrink-0"
                      aria-label="ลบรายการ"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="border-t mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">ยอดรวม</span>
                  <span className="font-extrabold text-brand text-lg">฿{fmt(totalSell)}</span>
                </div>
                {isOwner && totalCost !== null && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>รวมต้นทุนประมาณ</span>
                    <span className="text-orange-500 font-semibold">฿{fmt(totalCost)}</span>
                  </div>
                )}
                <button
                  onClick={goToQuotation}
                  className="press mt-2 w-full bg-brand text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Icon name="file" size={15} /> ส่งไปสร้างใบเสนอราคา
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
