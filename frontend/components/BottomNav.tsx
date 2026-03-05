"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "sos", label: "แจ้งเหตุ" },
  { href: "/history", icon: "history", label: "ประวัติ" },
  { href: "/documents", icon: "folder", label: "เอกสาร" },
  { href: "/profile", icon: "person", label: "โปรไฟล์" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30
                     bg-bg-main/95 backdrop-blur-lg border-t border-white/5
                     px-2 pt-2 pb-6 safe-area-bottom">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors
                ${active
                  ? "text-primary"
                  : "text-slate-500 hover:text-slate-300"
                }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${active ? "filled" : ""}`}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
