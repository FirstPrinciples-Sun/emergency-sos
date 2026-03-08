"use client";

interface ModeSelectorProps {
  onSelectAI: () => void;
  onSelectDirect: () => void;
  onBack: () => void;
}

export default function ModeSelector({ onSelectAI, onSelectDirect, onBack }: ModeSelectorProps) {
  return (
    <div className="w-full max-w-md flex flex-col gap-5 animate-fade-in-up">
      <p className="text-center text-base font-semibold text-slate-200">
        เลือกวิธีแจ้งเหตุ
      </p>

      <button
        onClick={onSelectAI}
        className="card-elevated p-6 flex items-center gap-4 text-left
                   border-2 border-transparent hover:border-emerald-500/30
                   transition-all active:scale-[0.98]"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-emerald-400 text-3xl">auto_awesome</span>
        </div>
        <div>
          <p className="text-lg font-bold text-white">AI วิเคราะห์</p>
          <p className="text-sm text-slate-400 mt-0.5">
            บันทึกเสียง/พิมพ์ AI จะวิเคราะห์ระดับความรุนแรงและจัดหน่วยให้
          </p>
        </div>
      </button>

      <button
        onClick={onSelectDirect}
        className="card-elevated p-6 flex items-center gap-4 text-left
                   border-2 border-transparent hover:border-orange-500/30
                   transition-all active:scale-[0.98]"
      >
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-orange-400 text-3xl">bolt</span>
        </div>
        <div>
          <p className="text-lg font-bold text-white">ส่งด่วน</p>
          <p className="text-sm text-slate-400 mt-0.5">
            ส่งข้อมูลตรงไปยังเจ้าหน้าที่ทันที ไม่ผ่านการวิเคราะห์
          </p>
        </div>
      </button>

      <button
        onClick={onBack}
        className="w-full py-3 bg-bg-surface hover:bg-bg-card border border-white/5
                   rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        ย้อนกลับ
      </button>
    </div>
  );
}
