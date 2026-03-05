"use client";

interface TriageResult {
  severity_level: string;
  severity_score: number;
  category: string;
  summary_th: string;
  required_units: string[];
  first_aid_advice: string;
  confidence_score: number;
}

interface IncidentResponse {
  incident_id: string;
  status: string;
  triage_result: TriageResult | null;
  line_sent: boolean;
  message: string;
}

interface ConfirmationScreenProps {
  result: IncidentResponse;
  onNewReport: () => void;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CRITICAL: { label: "วิกฤต", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: "emergency" },
  HIGH:     { label: "รุนแรง", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: "warning" },
  MEDIUM:   { label: "ปานกลาง", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: "info" },
  LOW:      { label: "เบา", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: "check_circle" },
};

const DEFAULT_SEVERITY = { label: "ไม่ระบุ", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20", icon: "help" };

export default function ConfirmationScreen({
  result,
  onNewReport,
}: ConfirmationScreenProps) {
  const triage = result.triage_result;
  const sev = triage ? (SEVERITY_CONFIG[triage.severity_level] || DEFAULT_SEVERITY) : DEFAULT_SEVERITY;

  return (
    <div className="w-full max-w-md flex flex-col gap-4 animate-fade-in-up">
      {/* Success banner */}
      <div className="card-elevated p-6 text-center">
        {/* Animated check circle */}
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4 animate-scale-in">
          <span className="material-symbols-outlined filled text-emerald-400 text-4xl">check_circle</span>
        </div>
        <p className="text-emerald-300 font-bold text-lg">{result.message}</p>
        <p className="text-slate-500 text-sm mt-1 font-mono">
          ID: {result.incident_id.slice(0, 8)}
        </p>
      </div>

      {/* LINE status */}
      <div className={`card flex items-center justify-center gap-2 p-4 text-sm ${
        result.line_sent ? "border-emerald-500/20" : "border-yellow-500/20"
      }`}>
        <span className={`material-symbols-outlined filled text-lg ${
          result.line_sent ? "text-emerald-400" : "text-yellow-400 animate-spin"
        }`}>
          {result.line_sent ? "check_circle" : "sync"}
        </span>
        <span className={result.line_sent ? "text-emerald-300" : "text-yellow-300"}>
          {result.line_sent
            ? "แจ้งเจ้าหน้าที่ผ่าน LINE แล้ว"
            : "รอการประสานงานเจ้าหน้าที่"}
        </span>
      </div>

      {/* AI Triage result */}
      {triage && (
        <>
          {/* Severity + Summary card */}
          <div className="card-ai p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-emerald-400 text-sm">auto_awesome</span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">AI วิเคราะห์</span>
            </div>

            {/* Severity badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${sev.bg} mb-4`}>
              <span className={`material-symbols-outlined filled ${sev.color} text-lg`}>{sev.icon}</span>
              <span className={`font-bold ${sev.color}`}>{sev.label}</span>
              <span className="text-slate-500 text-sm font-mono">
                {triage.severity_score}/10
              </span>
            </div>

            {/* Category */}
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider font-bold text-emerald-500/60 mb-1">ประเภท</p>
              <p className="text-lg font-bold text-white">{triage.category}</p>
            </div>

            {/* Thai summary */}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider font-bold text-emerald-500/60 mb-1">สรุปเหตุการณ์</p>
              <p className="text-base text-slate-200 leading-relaxed">{triage.summary_th}</p>
            </div>

            {/* Required units tags */}
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-emerald-500/60 mb-2">หน่วยที่ต้องการ</p>
              <div className="flex flex-wrap gap-2">
                {triage.required_units.map((unit, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-emerald-500/20 rounded-xl text-sm font-medium text-emerald-200"
                  >
                    <span className="material-symbols-outlined text-sm">local_hospital</span>
                    {unit}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* First aid advice */}
          <div className="card p-5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined filled text-blue-400 text-xl">health_and_safety</span>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-300 mb-1">ปฐมพยาบาลเบื้องต้น</p>
                <p className="text-sm text-slate-300 leading-relaxed">{triage.first_aid_advice}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={onNewReport}
          className="flex-1 py-4 bg-bg-surface hover:bg-bg-card border border-white/5
                     rounded-full text-base font-semibold transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          แจ้งเหตุใหม่
        </button>
        <a
          href="tel:1669"
          className="flex-1 py-4 bg-primary hover:bg-primary-dark
                     rounded-full text-base font-bold text-center transition-all
                     shadow-lg shadow-primary/20
                     flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined filled text-lg">call</span>
          โทร 1669
        </a>
      </div>
    </div>
  );
}
