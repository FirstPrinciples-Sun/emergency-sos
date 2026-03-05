"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import BottomNav from "@/components/BottomNav";

interface IncidentRecord {
  incident_id: string;
  severity_level: string;
  category: string;
  summary_th: string;
  timestamp: string;
  line_sent: boolean;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const { accessToken, isLoggedIn, isLoading, login } = useLiff();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn || !accessToken) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/my-incidents`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        setIncidents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoading, isLoggedIn, accessToken]);

  return (
    <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col pb-24">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">history</span>
          ประวัติการแจ้งเหตุ
        </h1>
        <p className="text-xs text-slate-500 mt-1">รายการแจ้งเหตุที่ผ่านมาของคุณ</p>
      </header>

      <main className="flex-1 px-5 space-y-3 overflow-y-auto no-scrollbar">
        {/* Not logged in */}
        {!isLoading && !isLoggedIn && (
          <div className="card-elevated p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#06C755] text-3xl">login</span>
            </div>
            <p className="text-slate-300 font-semibold">กรุณาเข้าสู่ระบบด้วย LINE</p>
            <p className="text-sm text-slate-500">เพื่อดูประวัติการแจ้งเหตุของคุณ</p>
            <button
              onClick={login}
              className="px-6 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-full font-semibold transition-colors"
            >
              เข้าสู่ระบบด้วย LINE
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-slate-400">กำลังโหลด...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card-elevated p-6 text-center">
            <span className="material-symbols-outlined text-red-400 text-3xl mb-2">error</span>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && isLoggedIn && incidents.length === 0 && (
          <div className="card-elevated p-8 flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-slate-600 text-5xl">inbox</span>
            <p className="text-slate-400">ยังไม่มีประวัติการแจ้งเหตุ</p>
          </div>
        )}

        {/* Incident list */}
        {incidents.map((inc) => (
          <div key={inc.incident_id} className="card-elevated p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  SEVERITY_COLOR[inc.severity_level] || "bg-slate-500/20 text-slate-400"
                }`}
              >
                {inc.severity_level}
              </span>
              <span className="text-[10px] text-slate-500">
                {new Date(inc.timestamp).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-200">{inc.category}</p>
            <p className="text-xs text-slate-400 line-clamp-2">{inc.summary_th}</p>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-600">#{inc.incident_id.slice(0, 8)}</span>
              {inc.line_sent && (
                <span className="flex items-center gap-0.5 text-emerald-500">
                  <span className="material-symbols-outlined text-xs filled">check_circle</span>
                  ส่งแจ้งแล้ว
                </span>
              )}
            </div>
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
