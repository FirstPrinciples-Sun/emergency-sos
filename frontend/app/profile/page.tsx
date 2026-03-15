"use client";

import { useState, useEffect } from "react";
import { useLiff } from "@/components/LiffProvider";
import { updateProfile } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfilePage() {
  const { user, userProfile, isLoggedIn, isLoading, login, logout, refreshProfile } = useLiff();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicDiseases, setChronicDiseases] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Populate form from profile
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || "");
      setPhone(userProfile.phone || "");
      setBloodType(userProfile.blood_type || "");
      setAllergies(userProfile.allergies || "");
      setChronicDiseases(userProfile.chronic_diseases || "");
      setEmergencyContactName(userProfile.emergency_contact_name || "");
      setEmergencyContactPhone(userProfile.emergency_contact_phone || "");
    }
  }, [userProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        blood_type: bloodType,
        allergies: allergies.trim(),
        chronic_diseases: chronicDiseases.trim(),
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
      });
      await refreshProfile();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("[Profile] Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset to profile values
    if (userProfile) {
      setFullName(userProfile.full_name || "");
      setPhone(userProfile.phone || "");
      setBloodType(userProfile.blood_type || "");
      setAllergies(userProfile.allergies || "");
      setChronicDiseases(userProfile.chronic_diseases || "");
      setEmergencyContactName(userProfile.emergency_contact_name || "");
      setEmergencyContactPhone(userProfile.emergency_contact_phone || "");
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col pb-24">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span>
          ข้อมูลของฉัน
        </h1>
        <p className="text-xs text-slate-500 mt-1">ข้อมูลนี้จะถูกส่งไปพร้อมกับการแจ้งเหตุฉุกเฉิน</p>
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
            {/* Saved toast */}
            {saved && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 animate-scale-in">
                <span className="material-symbols-outlined filled text-emerald-400">check_circle</span>
                <span className="text-sm font-semibold text-emerald-300">บันทึกข้อมูลเรียบร้อยแล้ว</span>
              </div>
            )}

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
                  {userProfile?.full_name || user?.displayName || "ไม่ทราบชื่อ"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  LINE: {user?.displayName}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">เชื่อมต่อแล้ว</span>
                </div>
              </div>
            </div>

            {/* Personal Info Section */}
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">badge</span>
                  ข้อมูลส่วนตัว
                </h2>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold text-primary hover:text-primary-light flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    แก้ไข
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">ชื่อ-นามสกุล *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field"
                      placeholder="ชื่อ นามสกุล"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">เบอร์โทร *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field"
                      placeholder="0812345678"
                      maxLength={20}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>ชื่อ-นามสกุล</span>
                    <span className="text-white font-medium">{userProfile?.full_name || "-"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>เบอร์โทร</span>
                    <span className="text-white font-medium">{userProfile?.phone || "-"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Medical Info Section */}
            <div className="card-elevated p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-red-400">medical_information</span>
                ข้อมูลทางการแพทย์
              </h2>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">กรุ๊ปเลือด</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="input-field"
                    >
                      <option value="">ไม่ระบุ</option>
                      {BLOOD_TYPES.filter(b => b).map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">ประวัติแพ้ยา / สารก่อภูมิแพ้</label>
                    <textarea
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="input-field-area"
                      placeholder="เช่น แพ้เพนิซิลิน, แพ้อาหารทะเล"
                      rows={2}
                      maxLength={500}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">โรคประจำตัว</label>
                    <textarea
                      value={chronicDiseases}
                      onChange={(e) => setChronicDiseases(e.target.value)}
                      className="input-field-area"
                      placeholder="เช่น เบาหวาน, ความดันสูง"
                      rows={2}
                      maxLength={500}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>กรุ๊ปเลือด</span>
                    <span className="text-white font-medium">{userProfile?.blood_type || "-"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>แพ้ยา/สารก่อภูมิแพ้</span>
                    <span className="text-white font-medium text-right max-w-[60%] truncate">
                      {userProfile?.allergies || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>โรคประจำตัว</span>
                    <span className="text-white font-medium text-right max-w-[60%] truncate">
                      {userProfile?.chronic_diseases || "-"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact Section */}
            <div className="card-elevated p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-orange-400">contact_phone</span>
                ผู้ติดต่อฉุกเฉิน
              </h2>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">ชื่อผู้ติดต่อ</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="input-field"
                      placeholder="ชื่อญาติ/คนใกล้ชิด"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">เบอร์โทรฉุกเฉิน</label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="input-field"
                      placeholder="0812345678"
                      maxLength={20}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>ชื่อ</span>
                    <span className="text-white font-medium">{userProfile?.emergency_contact_name || "-"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>เบอร์โทร</span>
                    <span className="text-white font-medium">{userProfile?.emergency_contact_phone || "-"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Edit actions */}
            {editing && (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 py-3 bg-bg-surface hover:bg-bg-card border border-white/5
                             rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !fullName.trim() || !phone.trim()}
                  className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white
                             rounded-xl text-sm font-bold transition-all disabled:opacity-50
                             flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">save</span>
                  )}
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            )}

            {/* Info section */}
            <div className="card-elevated p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">info</span>
                เกี่ยวกับระบบ
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>เวอร์ชัน</span>
                  <span className="text-white font-medium">2.3.0</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>สายด่วนกู้ชีพ</span>
                  <a href="tel:1669" className="text-primary font-bold">1669</a>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ระบบ AI</span>
                  <span className="text-emerald-400 font-medium">พร้อมใช้งาน</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PDPA</span>
                  <span className="text-emerald-400 font-medium">
                    {userProfile?.pdpa_accepted ? "ยินยอมแล้ว" : "ยังไม่ยินยอม"}
                  </span>
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
