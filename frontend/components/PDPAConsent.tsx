"use client";

import { useState } from "react";

interface PDPAConsentProps {
  onAccept: () => void;
  isSubmitting?: boolean;
}

export default function PDPAConsent({ onAccept, isSubmitting }: PDPAConsentProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 p-5 animate-fade-in-up">
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-400 text-2xl">shield</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">นโยบายคุ้มครองข้อมูลส่วนบุคคล</h2>
            <p className="text-xs text-slate-400">PDPA Consent (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300 leading-relaxed max-h-[50vh] overflow-y-auto pr-2">
          <section>
            <h3 className="font-bold text-white mb-1">ข้อมูลที่เก็บรวบรวม</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>ชื่อ-นามสกุล, เบอร์โทรศัพท์</li>
              <li>ข้อมูลบัญชี LINE (ชื่อ, รูปโปรไฟล์, LINE User ID)</li>
              <li>ตำแหน่ง GPS ขณะแจ้งเหตุ</li>
              <li>ไฟล์เสียงบันทึกเหตุการณ์</li>
              <li>ข้อมูลทางการแพทย์ (กรุ๊ปเลือด, โรคประจำตัว, แพ้ยา)</li>
              <li>ข้อมูลผู้ติดต่อฉุกเฉิน</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">วัตถุประสงค์การใช้งาน</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>แจ้งเหตุฉุกเฉินไปยังหน่วยกู้ชีพ</li>
              <li>ระบุตำแหน่งผู้ประสบเหตุ</li>
              <li>ให้ข้อมูลทางการแพทย์แก่เจ้าหน้าที่</li>
              <li>ติดต่อกลับผู้แจ้งเหตุ</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">ระยะเวลาเก็บรักษา</h3>
            <p className="text-slate-400">ข้อมูลจะถูกเก็บรักษาตามระยะเวลาที่กฎหมายกำหนด หรือจนกว่าผู้ใช้จะขอลบข้อมูล</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">สิทธิของเจ้าของข้อมูล</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>สิทธิในการเข้าถึงข้อมูล</li>
              <li>สิทธิในการแก้ไขข้อมูล</li>
              <li>สิทธิในการลบข้อมูล</li>
              <li>สิทธิในการถอนความยินยอม</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">การแบ่งปันข้อมูล</h3>
            <p className="text-slate-400">ข้อมูลจะถูกส่งต่อไปยังหน่วยกู้ชีพและเจ้าหน้าที่ที่เกี่ยวข้องเท่านั้น เพื่อการช่วยเหลือฉุกเฉิน</p>
          </section>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer px-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-2 border-slate-500 bg-transparent
                     checked:bg-primary checked:border-primary accent-primary cursor-pointer"
        />
        <span className="text-sm text-slate-300 leading-relaxed">
          ข้าพเจ้ายินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามนโยบายข้างต้น
          เพื่อวัตถุประสงค์ในการแจ้งเหตุฉุกเฉินและช่วยเหลือผู้ประสบเหตุ
        </span>
      </label>

      <button
        onClick={onAccept}
        disabled={!checked || isSubmitting}
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
            <span className="material-symbols-outlined">check_circle</span>
            ยอมรับและดำเนินการต่อ
          </>
        )}
      </button>
    </div>
  );
}
