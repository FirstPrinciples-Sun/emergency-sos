"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import BottomNav from "@/components/BottomNav";

interface IncidentRecord {
  incident_id: string;
  severity_level: string;
  severity_score: number;
  category: string;
  summary_th: string;
  timestamp: string;
  line_sent: boolean;
  victim_count: number | null;
  key_symptoms: string[];
  required_units: string[];
  first_aid_advice: string;
  confidence_score: number;
  latitude: number;
  longitude: number;
  address_hint: string | null;
  selected_category: string | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const CAT_ICONS: Record<string, { icon: string; color: string }> = {
  MEDICAL: { icon: "medical_services", color: "text-red-400" },
  FIRE: { icon: "local_fire_department", color: "text-orange-400" },
  ACCIDENT: { icon: "car_crash", color: "text-yellow-400" },
  CRIME: { icon: "shield", color: "text-blue-400" },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const { accessToken, isLoggedIn, isLoading, login } = useLiff();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
            <a
              href="/"
              className="mt-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full text-sm font-bold transition-colors"
            >
              แจ้งเหตุฉุกเฉิน
            </a>
          </div>
        )}

        {/* Incident list */}
        {incidents.map((inc) => {
          const expanded = expandedId === inc.incident_id;
          const catInfo = inc.selected_category ? CAT_ICONS[inc.selected_category] : null;
          const mapsUrl = `https://maps.google.com/?q=${inc.latitude},${inc.longitude}`;

          return (
            <div
              key={inc.incident_id}
              className="card-elevated overflow-hidden transition-all"
            >
              {/* Main row — clickable */}
              <button
                onClick={() => toggleExpand(inc.incident_id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        SEVERITY_COLOR[inc.severity_level] || "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {inc.severity_level}
                    </span>
                    {catInfo && (
                      <span className={`material-symbols-outlined text-base filled ${catInfo.color}`}>
                        {catInfo.icon}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(inc.timestamp).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-200">{inc.category}</p>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{inc.summary_th}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px]">
                  <span className="text-slate-600">#{inc.incident_id.slice(0, 8)}</span>
                  {inc.line_sent && (
                    <span className="flex items-center gap-0.5 text-emerald-500">
                      <span className="material-symbols-outlined text-xs filled">check_circle</span>
                      ส่งแจ้งแล้ว
                    </span>
                  )}
                  <span className={`material-symbols-outlined text-slate-500 text-sm ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 animate-fade-in-up">
                  {/* Location */}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <span className="material-symbols-outlined text-base">location_on</span>
                    ดูตำแหน่งบน Google Maps
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>

                  {inc.address_hint && (
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">จุดสังเกต:</span> {inc.address_hint}
                    </p>
                  )}

                  {/* Required units */}
                  {inc.required_units && inc.required_units.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">หน่วยกู้ชีพที่ต้องการ:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {inc.required_units.map((u, i) => (
                          <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* First aid advice */}
                  {inc.first_aid_advice && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                      <p className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">healing</span>
                        คำแนะนำปฐมพยาบาล
                      </p>
                      <p className="text-xs text-slate-300">{inc.first_aid_advice}</p>
                    </div>
                  )}

                  {/* Symptoms */}
                  {inc.key_symptoms && inc.key_symptoms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">อาการสำคัญ:</p>
                      <p className="text-xs text-slate-400">{inc.key_symptoms.join(", ")}</p>
                    </div>
                  )}

                  {/* Score detail */}
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <span>ความรุนแรง: {inc.severity_score}/10</span>
                    {inc.victim_count != null && <span>ผู้ประสบเหตุ: {inc.victim_count} คน</span>}
                    {inc.confidence_score > 0 && <span>ความมั่นใจ AI: {Math.round(inc.confidence_score * 100)}%</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}
