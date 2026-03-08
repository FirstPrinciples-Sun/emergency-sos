"use client";

interface IncidentResponse {
  incident_id: string;
  status: string;
  triage_result: any;
  line_sent: boolean;
  message: string;
}

interface ConfirmationScreenProps {
  result: IncidentResponse;
  onNewReport: () => void;
}

export default function ConfirmationScreen({
  result,
  onNewReport,
}: ConfirmationScreenProps) {
  return (
    <div className="w-full max-w-md flex flex-col gap-4 animate-fade-in-up">
      {/* Success banner */}
      <div className="card-elevated p-6 text-center">
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
          result.line_sent ? "text-emerald-400" : "text-yellow-400"
        }`}>
          {result.line_sent ? "check_circle" : "sync"}
        </span>
        <span className={result.line_sent ? "text-emerald-300" : "text-yellow-300"}>
          {result.line_sent
            ? "แจ้งเจ้าหน้าที่ผ่าน LINE แล้ว"
            : "รอการประสานงานเจ้าหน้าที่"}
        </span>
      </div>

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
