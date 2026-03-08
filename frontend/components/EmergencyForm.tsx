"use client";

import { useState, useEffect } from "react";

interface EmergencyFormProps {
  onSubmit: (data: {
    textDescription?: string;
    addressHint?: string;
    reporterPhone?: string;
    skipAi?: boolean;
  }) => void;
  hasAudio: boolean;
  transcript?: string;
  onBack: () => void;
  isSubmitting?: boolean;
  skipAi?: boolean;
  defaultPhone?: string;
}

export default function EmergencyForm({
  onSubmit,
  hasAudio,
  transcript,
  onBack,
  isSubmitting,
  skipAi = false,
  defaultPhone,
}: EmergencyFormProps) {
  const [textDescription, setTextDescription] = useState(transcript || "");
  const [addressHint, setAddressHint] = useState("");
  const [reporterPhone, setReporterPhone] = useState(defaultPhone || "");

  useEffect(() => {
    if (defaultPhone && !reporterPhone) {
      setReporterPhone(defaultPhone);
    }
  }, [defaultPhone]);

  const canSubmit = hasAudio || textDescription.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      textDescription: textDescription.trim() || undefined,
      addressHint: addressHint.trim() || "ไม่ระบุ",
      reporterPhone: reporterPhone.trim() || undefined,
      skipAi,
    });
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-5 animate-fade-in-up">
      {/* Mode indicator */}
      <div className={`flex items-center gap-2 justify-center px-4 py-2 rounded-full text-sm font-bold ${
        skipAi
          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      }`}>
        <span className="material-symbols-outlined text-base">
          {skipAi ? "bolt" : "auto_awesome"}
        </span>
        {skipAi ? "ส่งด่วน (ไม่ผ่าน AI)" : "AI วิเคราะห์"}
      </div>

      {hasAudio && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <span className="material-symbols-outlined filled text-emerald-400">check_circle</span>
          <div>
            <span className="text-sm font-semibold text-emerald-300">บันทึกเสียงเรียบร้อยแล้ว</span>
            {transcript ? (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">&ldquo;{transcript}&rdquo;</p>
            ) : (
              <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">cloud_upload</span>
                ระบบจะแปลงเสียงเป็นข้อความให้อัตโนมัติ
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
          <span className="material-symbols-outlined text-lg text-slate-400">chat</span>
          {hasAudio ? "ข้อมูลเพิ่มเติม (ถ้ามี)" : "อธิบายเหตุการณ์ *"}
        </label>
        <textarea
          id="description"
          value={textDescription}
          onChange={(e) => setTextDescription(e.target.value)}
          placeholder="เช่น รถชนกัน 2 คัน มีคนเจ็บ 3 คน"
          rows={3}
          maxLength={2000}
          className="input-field-area"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="address" className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
          <span className="material-symbols-outlined text-lg text-slate-400">location_on</span>
          จุดสังเกตใกล้เคียง
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-500 text-xl">pin_drop</span>
          </div>
          <input
            id="address"
            type="text"
            value={addressHint}
            onChange={(e) => setAddressHint(e.target.value)}
            placeholder="ไม่ระบุ (ใช้ GPS แทน)"
            maxLength={500}
            className="input-field pl-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
          <span className="material-symbols-outlined text-lg text-slate-400">call</span>
          เบอร์โทรติดต่อกลับ
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-500 text-xl">phone_android</span>
          </div>
          <input
            id="phone"
            type="tel"
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            placeholder="0812345678"
            maxLength={20}
            className="input-field pl-12"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-4 rounded-2xl text-base font-bold transition-all
                     text-white shadow-lg active:scale-[0.98]
                     disabled:bg-bg-surface disabled:text-slate-500 disabled:shadow-none
                     flex items-center justify-center gap-2 ${
                       skipAi
                         ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                         : "bg-primary hover:bg-primary-dark shadow-primary/20"
                     }`}
        >
          <span className="material-symbols-outlined text-xl">
            {skipAi ? "bolt" : "auto_awesome"}
          </span>
          {skipAi ? "ส่งด่วน" : "AI วิเคราะห์แล้วส่ง"}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full py-3 bg-bg-surface hover:bg-bg-card border border-white/5
                     rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2
                     disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          ย้อนกลับ
        </button>
      </div>

      {!canSubmit && (
        <p className="text-xs text-yellow-400 text-center flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-sm">warning</span>
          กรุณาบันทึกเสียงหรือพิมพ์อธิบายเหตุการณ์
        </p>
      )}
    </div>
  );
}
