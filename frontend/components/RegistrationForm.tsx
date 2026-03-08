"use client";

import { useState } from "react";

interface RegistrationFormProps {
  displayName?: string;
  onComplete: (data: {
    full_name: string;
    phone: string;
    blood_type?: string;
    allergies?: string;
    chronic_diseases?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }) => void;
  isSubmitting?: boolean;
}

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegistrationForm({
  displayName,
  onComplete,
  isSubmitting,
}: RegistrationFormProps) {
  const [fullName, setFullName] = useState(displayName || "");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicDiseases, setChronicDiseases] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const canSubmit = fullName.trim().length > 0 && phone.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      full_name: fullName.trim(),
      phone: phone.trim(),
      blood_type: bloodType || undefined,
      allergies: allergies.trim() || undefined,
      chronic_diseases: chronicDiseases.trim() || undefined,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 p-5 animate-fade-in-up overflow-y-auto no-scrollbar">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-primary text-3xl">person_add</span>
        </div>
        <h2 className="text-xl font-bold text-white">ลงทะเบียนข้อมูลผู้ใช้</h2>
        <p className="text-sm text-slate-400 mt-1">กรอกข้อมูลเพื่อความรวดเร็วในการแจ้งเหตุ</p>
      </div>

      {/* Required fields */}
      <div className="card-elevated p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">badge</span>
          ข้อมูลพื้นฐาน <span className="text-red-400">*</span>
        </h3>

        <div className="space-y-2">
          <label htmlFor="reg-name" className="text-xs font-semibold text-slate-400 ml-1">ชื่อ-นามสกุล *</label>
          <input
            id="reg-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="สมชาย ใจดี"
            maxLength={100}
            className="input-field"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-phone" className="text-xs font-semibold text-slate-400 ml-1">เบอร์โทรศัพท์ *</label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812345678"
            maxLength={20}
            className="input-field"
          />
        </div>
      </div>

      {/* Optional medical info */}
      <div className="card-elevated p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-blue-400">medical_information</span>
          ข้อมูลทางการแพทย์ (ไม่บังคับ)
        </h3>

        <div className="space-y-2">
          <label htmlFor="reg-blood" className="text-xs font-semibold text-slate-400 ml-1">กรุ๊ปเลือด</label>
          <select
            id="reg-blood"
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            className="input-field"
          >
            <option value="">ไม่ระบุ</option>
            {BLOOD_TYPES.filter(Boolean).map((bt) => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-allergy" className="text-xs font-semibold text-slate-400 ml-1">แพ้ยา/อาหาร</label>
          <input
            id="reg-allergy"
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="เช่น แพ้เพนิซิลลิน, แพ้อาหารทะเล"
            maxLength={500}
            className="input-field"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-chronic" className="text-xs font-semibold text-slate-400 ml-1">โรคประจำตัว</label>
          <input
            id="reg-chronic"
            type="text"
            value={chronicDiseases}
            onChange={(e) => setChronicDiseases(e.target.value)}
            placeholder="เช่น เบาหวาน, ความดันสูง"
            maxLength={500}
            className="input-field"
          />
        </div>
      </div>

      {/* Emergency contact */}
      <div className="card-elevated p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-orange-400">contact_phone</span>
          ผู้ติดต่อฉุกเฉิน (ไม่บังคับ)
        </h3>

        <div className="space-y-2">
          <label htmlFor="reg-ec-name" className="text-xs font-semibold text-slate-400 ml-1">ชื่อ</label>
          <input
            id="reg-ec-name"
            type="text"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            placeholder="ชื่อผู้ติดต่อฉุกเฉิน"
            maxLength={100}
            className="input-field"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-ec-phone" className="text-xs font-semibold text-slate-400 ml-1">เบอร์โทร</label>
          <input
            id="reg-ec-phone"
            type="tel"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="0898765432"
            maxLength={20}
            className="input-field"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full py-4 rounded-2xl text-base font-bold transition-all
                   bg-primary hover:bg-primary-dark text-white
                   shadow-lg shadow-primary/20
                   disabled:bg-bg-surface disabled:text-slate-500 disabled:shadow-none
                   flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            กำลังบันทึก...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">check</span>
            บันทึกข้อมูล
          </>
        )}
      </button>
    </div>
  );
}
