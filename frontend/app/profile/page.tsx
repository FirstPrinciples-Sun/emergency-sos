"use client";

import { useLiff } from "@/components/LiffProvider";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const { user, isLoggedIn, isLoading, login, logout } = useLiff();

  return (
    <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col pb-24">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span>
          โปรไฟล์
        </h1>
      </header>

      <main className="flex-1 px-5 space-y-4 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !isLoggedIn ? (
          <div className="card-elevated p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-[#06C755]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#06C755] text-4xl">person_add</span>
            </div>
            <p className="text-lg font-semibold text-slate-200">เข้าสู่ระบบ</p>
            <p className="text-sm text-slate-500">
              เชื่อมต่อบัญชี LINE เพื่อระบุตัวตนเมื่อแจ้งเหตุ
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-full font-semibold transition-colors flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE Login
            </button>
          </div>
        ) : (
          <>
            {/* User card */}
            <div className="card-elevated p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/30 shrink-0">
                {user?.pictureUrl ? (
                  <img
                    src={user.pictureUrl}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {user?.displayName?.[0] || "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">
                  {user?.displayName || "ไม่ทราบชื่อ"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  LINE ID: {user?.userId?.slice(0, 12)}...
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">เชื่อมต่อแล้ว</span>
                </div>
              </div>
            </div>

            {/* Info section */}
            <div className="card-elevated p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">info</span>
                เกี่ยวกับระบบ
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>เวอร์ชัน</span>
                  <span className="text-white font-medium">2.0.0</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>สายด่วนกู้ชีพ</span>
                  <a href="tel:1669" className="text-primary font-bold">1669</a>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ระบบ AI</span>
                  <span className="text-emerald-400 font-medium">พร้อมใช้งาน</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-full py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-red-400 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              ออกจากระบบ
            </button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
