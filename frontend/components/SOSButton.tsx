"use client";

interface SOSButtonProps {
  onPress: () => void;
  onCategoryPress?: (category: string) => void;
}

const CATEGORIES = [
  { key: "MEDICAL", icon: "medical_services", label: "การแพทย์", color: "text-red-400", bg: "bg-red-500/10" },
  { key: "FIRE", icon: "local_fire_department", label: "ไฟไหม้", color: "text-orange-400", bg: "bg-orange-500/10" },
  { key: "ACCIDENT", icon: "car_crash", label: "อุบัติเหตุ", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { key: "CRIME", icon: "shield", label: "ตำรวจ", color: "text-blue-400", bg: "bg-blue-500/10" },
];

export default function SOSButton({ onPress, onCategoryPress }: SOSButtonProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full animate-fade-in-up">
      {/* Hero text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white leading-tight mb-2">
          กดปุ่มเพื่อ<br />แจ้งเหตุฉุกเฉิน
        </h2>
        <p className="text-slate-400 text-sm">
          กดค้าง 1 วินาที แล้วพูดอธิบายเหตุการณ์
        </p>
      </div>

      {/* SOS Button with glow rings */}
      <div className="relative flex items-center justify-center my-4">
        {/* Expanding rings */}
        <div className="sos-ring-1 absolute w-52 h-52 rounded-full border border-primary/20" />
        <div className="sos-ring-2 absolute w-52 h-52 rounded-full border border-primary/15" />
        <div className="sos-ring-3 absolute w-52 h-52 rounded-full border border-primary/10" />

        {/* Glow background */}
        <div className="absolute w-44 h-44 rounded-full bg-primary/20 blur-2xl" />

        <button
          onClick={onPress}
          className="sos-glow relative z-10 w-40 h-40 rounded-full
                     bg-gradient-to-br from-red-500 via-primary to-primary-dark
                     flex flex-col items-center justify-center text-white
                     active:scale-95 transition-transform duration-100
                     focus:outline-none"
          aria-label="กดเพื่อแจ้งเหตุฉุกเฉิน"
        >
          {/* Signal icon */}
          <span className="material-symbols-outlined text-3xl mb-0.5 opacity-80">
            sensors
          </span>
          {/* Location pin */}
          <span className="material-symbols-outlined text-2xl -mt-1 opacity-90">
            location_on
          </span>
          <span className="text-3xl font-extrabold tracking-[0.2em] mt-1">SOS</span>
        </button>
      </div>

      {/* Category shortcuts */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-sm animate-fade-in-up-delay">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCategoryPress?.(cat.key)}
            className="category-card"
          >
            <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined filled ${cat.color} text-2xl`}>
                {cat.icon}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-300">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
