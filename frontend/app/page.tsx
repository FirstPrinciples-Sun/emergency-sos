"use client";

import { useState, useCallback } from "react";
import SOSButton from "@/components/SOSButton";
import VoiceRecorder from "@/components/VoiceRecorder";
import LocationCapture, { GpsStatus } from "@/components/LocationCapture";
import EmergencyForm from "@/components/EmergencyForm";
import ConfirmationScreen from "@/components/ConfirmationScreen";
import ModeSelector from "@/components/ModeSelector";
import InstallPrompt from "@/components/InstallPrompt";
import BottomNav from "@/components/BottomNav";
import { submitIncident, transcribeAudio } from "@/lib/api";
import { useLiff } from "@/components/LiffProvider";

type AppState = "idle" | "mode-select" | "recording" | "transcribing" | "form" | "submitting" | "done";

interface LocationData {
  latitude: number;
  longitude: number;
}

const STEPS = [
  { key: "recording", label: "บันทึกเสียง", icon: "mic" },
  { key: "form", label: "รายละเอียด", icon: "edit_note" },
  { key: "done", label: "เสร็จสิ้น", icon: "check_circle" },
] as const;

function getStepIndex(state: AppState): number {
  if (state === "submitting" || state === "transcribing") return 1;
  return STEPS.findIndex((s) => s.key === state);
}

export default function SOSPage() {
  const { user, userProfile, isLoggedIn, login, logout } = useLiff();

  const [state, setState] = useState<AppState>("idle");
  const [skipAi, setSkipAi] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("requesting");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsRetryKey, setGpsRetryKey] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGpsStatus = useCallback((status: GpsStatus) => {
    setGpsStatus(status);
    if (status === "active") setGpsError(null);
  }, []);

  const handleGpsError = useCallback((msg: string) => {
    setGpsError(msg);
  }, []);

  const handleRetryGps = () => {
    setGpsError(null);
    setLocation(null);
    setGpsRetryKey((k) => k + 1);
  };

  const handleSOSPress = () => setState("mode-select");

  const handleCategoryPress = (cat: string) => {
    setCategory(cat);
    setState("mode-select");
  };

  /* Mode selection handlers */
  const handleSelectAI = () => {
    setSkipAi(false);
    setState("recording");
  };

  const handleSelectDirect = () => {
    setSkipAi(true);
    setState("recording");
  };

  const handleRecordingComplete = async (data: { audio?: string; transcript?: string }) => {
    if (data.audio) setAudioBase64(data.audio);
    if (data.transcript) {
      setTranscript(data.transcript);
      setState("form");
      return;
    }
    // No browser transcript – run Whisper STT on backend
    if (data.audio) {
      setState("transcribing");
      try {
        const text = await transcribeAudio(data.audio);
        if (text) setTranscript(text);
      } catch (err) {
        console.warn("Whisper transcription failed:", err);
      }
    }
    setState("form");
  };

  const handleSkipRecording = () => setState("form");

  const handleSubmit = async (formData: {
    textDescription?: string;
    addressHint?: string;
    reporterPhone?: string;
    skipAi?: boolean;
  }) => {
    if (!location) {
      setError("ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS");
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const result = await submitIncident({
        latitude: location.latitude,
        longitude: location.longitude,
        address_hint: formData.addressHint || undefined,
        audio_base64: audioBase64 || undefined,
        text_description: formData.textDescription || transcript || undefined,
        reporter_phone: formData.reporterPhone || undefined,
        line_user_id: user?.userId || undefined,
        display_name: user?.displayName || undefined,
        skip_ai: formData.skipAi || false,
        selected_category: category || undefined,
      });
      setResponse(result);
      setState("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
      );
      setState("form");
    }
  };

  const handleReset = () => {
    setState("idle");
    setSkipAi(false);
    setAudioBase64(null);
    setTranscript(null);
    setCategory(undefined);
    setResponse(null);
    setError(null);
    setLocation(null);
    setGpsRetryKey((k) => k + 1);
  };

  const currentStep = getStepIndex(state);
  const defaultPhone = userProfile?.phone || "";

  return (
    <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col overflow-hidden">
      {/* Always capture location */}
      <LocationCapture
        onLocation={setLocation}
        onStatusChange={handleGpsStatus}
        onError={handleGpsError}
        retryKey={gpsRetryKey}
      />

      {/* Install PWA prompt */}
      <InstallPrompt />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-1.5">
            <span className="text-primary font-extrabold">SOS</span>
            <span className="text-slate-200">Thailand</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">ระบบแจ้งเหตุฉุกเฉินอัจฉริยะ</p>
        </div>
        <div className="flex items-center gap-2">
          {/* GPS badge */}
          {gpsStatus === "active" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">GPS</span>
            </div>
          ) : gpsStatus === "error" ? (
            <button
              onClick={handleRetryGps}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">ลองใหม่</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">GPS...</span>
            </div>
          )}

          {/* User avatar / login */}
          {isLoggedIn && user ? (
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/30 hover:border-emerald-400 transition-colors"
              title={user.displayName}
            >
              {user.pictureUrl ? (
                <img src={user.pictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{user.displayName?.[0]}</span>
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#06C755]/10 border border-[#06C755]/20 hover:bg-[#06C755]/20 transition-colors"
            >
              <span className="text-[10px] font-semibold text-[#06C755] uppercase tracking-wider">LINE</span>
            </button>
          )}
        </div>
      </header>

      {/* GPS error banner */}
      {gpsError && (
        <div className="mx-5 mb-2 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 animate-scale-in">
          <span className="material-symbols-outlined filled text-yellow-400 text-lg">location_off</span>
          <span className="text-sm text-yellow-300 flex-1">{gpsError}</span>
          <button
            onClick={handleRetryGps}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded-lg bg-yellow-500/10"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Stepper - only show during recording/transcribing/form/submitting/done */}
      {(state === "recording" || state === "transcribing" || state === "form" || state === "submitting" || state === "done") && (
        <div className="flex items-center justify-center gap-3 px-6 py-3 animate-fade-in-up">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${i < currentStep
                      ? "bg-emerald-500/20 text-emerald-400"
                      : i === currentStep
                        ? "bg-primary/20 text-primary shadow-lg shadow-primary/20"
                        : "bg-white/5 text-slate-600"
                    }`}
                >
                  {i < currentStep ? (
                    <span className="material-symbols-outlined filled text-base">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-base">{step.icon}</span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${i <= currentStep ? "text-slate-300" : "text-slate-600"
                  }`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-[2px] -mt-4 rounded-full transition-all ${i < currentStep ? "bg-emerald-500/40" : "bg-white/5"
                  }`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-5 mb-3 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-scale-in">
          <span className="material-symbols-outlined filled text-red-400">error</span>
          <span className="text-sm text-red-300 flex-1">{error}</span>
          {error.includes("GPS") && (
            <button
              onClick={handleRetryGps}
              className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-red-500/10"
            >
              ลองใหม่
            </button>
          )}
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center px-5 pb-24 overflow-y-auto no-scrollbar">
        {state === "idle" && (
          <SOSButton onPress={handleSOSPress} onCategoryPress={handleCategoryPress} />
        )}

        {state === "mode-select" && (
          <ModeSelector
            onSelectAI={handleSelectAI}
            onSelectDirect={handleSelectDirect}
            onBack={() => setState("idle")}
          />
        )}

        {state === "recording" && (
          <VoiceRecorder
            onComplete={handleRecordingComplete}
            onSkip={handleSkipRecording}
            category={category}
          />
        )}

        {state === "transcribing" && (
          <div className="flex flex-col items-center gap-5 animate-fade-in-up">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 text-2xl">hearing</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">กำลังแปลงเสียง...</p>
              <p className="text-sm text-slate-400 mt-1">
                Whisper AI กำลังแปลงเสียงเป็นข้อความ
              </p>
            </div>
          </div>
        )}

        {state === "form" && (
          <EmergencyForm
            onSubmit={handleSubmit}
            hasAudio={!!audioBase64}
            transcript={transcript || undefined}
            onBack={() => setState("recording")}
            skipAi={skipAi}
            defaultPhone={defaultPhone}
            category={category}
          />
        )}

        {state === "submitting" && (
          <div className="flex flex-col items-center gap-5 animate-fade-in-up">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {skipAi ? "bolt" : "auto_awesome"}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">กำลังส่งข้อมูล...</p>
              <p className="text-sm text-slate-400 mt-1">
                {audioBase64 && !transcript
                  ? "กำลังแปลงเสียงเป็นข้อความ (Whisper AI)..."
                  : skipAi
                    ? "กำลังส่งข้อมูลให้เจ้าหน้าที่โดยตรง"
                    : "AI กำลังวิเคราะห์และจัดลำดับเหตุการณ์"}
              </p>
            </div>
          </div>
        )}

        {state === "done" && response && (
          <ConfirmationScreen result={response} onNewReport={handleReset} />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
