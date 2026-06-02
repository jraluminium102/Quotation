"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { signOut } from "@/app/login/actions";
import { ROLE_LABEL, type Profile } from "@/lib/types";

const NAV = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/customers", icon: "users", label: "ทะเบียนลูกค้า" },
  { href: "/quotations", icon: "file", label: "ใบเสนอราคา" },
];

export default function Shell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="bgwrap">
      <div className="flex max-w-[1320px] mx-auto">
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 p-4 sticky top-0 h-screen hidden md:block no-print">
          <div className="glass-dark rounded-2xl h-full p-4 flex flex-col text-white">
            <div className="px-2 py-3 border-b border-white/15 mb-3">
              <div className="text-xl font-extrabold tracking-wide">JR ERP</div>
              <div className="text-xs text-red-100/80">ระบบบัญชี · Billing &amp; AR</div>
              <div className="text-[10px] text-red-100/50 mt-1">P1 · v0.1</div>
            </div>
            <nav className="space-y-1 flex-1" aria-label="เมนูหลัก">
              {NAV.map((n) => (
                <Link
                  key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
                  className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                    active(n.href) ? "bg-white font-semibold shadow-md text-brand-dark" : "hover:bg-white/12"
                  }`}
                >
                  <Icon name={n.icon} size={18} />
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-white/15 pt-3 mt-2">
              <div className="text-sm font-semibold truncate">{profile.full_name || "ผู้ใช้"}</div>
              <div className="text-[11px] text-red-100/70 mb-2">{ROLE_LABEL[profile.role]}</div>
              <form action={signOut}>
                <button className="press w-full flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] bg-white/12 hover:bg-white/20">
                  <Icon name="logout" size={14} /> ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:pr-6">
          {/* mobile top bar */}
          <div className="md:hidden flex items-center gap-1 mb-4 glass rounded-2xl px-3 py-2 no-print overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.href} href={n.href} aria-label={n.label} aria-current={active(n.href) ? "page" : undefined}
                className={`press shrink-0 w-10 h-10 rounded-xl inline-flex items-center justify-center ${
                  active(n.href) ? "text-white bg-brand" : "glass-soft text-brand-dark"
                }`}
              >
                <Icon name={n.icon} size={18} />
              </Link>
            ))}
            <form action={signOut} className="ml-auto">
              <button aria-label="ออกจากระบบ" className="press w-10 h-10 rounded-xl inline-flex items-center justify-center glass-soft text-brand-dark">
                <Icon name="logout" size={16} />
              </button>
            </form>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
