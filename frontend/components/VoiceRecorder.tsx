"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceRecorderProps {
  onComplete: (data: { audio?: string; transcript?: string }) => void;
  onSkip: () => void;
  category?: string;
}

const MAX_SECONDS = 60;

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export default function VoiceRecorder({
  onComplete,
  onSkip,
  category,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    chunksRef.current = [];
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // --- MediaRecorder for audio backup ---
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // Use ref to avoid stale closure over transcript state
        const finalTranscript = transcriptRef.current.trim();
        onComplete({
          audio: base64,
          transcript: finalTranscript || undefined,
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);

      // --- Web Speech API for real-time Thai transcription ---
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "th-TH";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = "";
          let final = "";
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript;
            } else {
              interim += result[0].transcript;
            }
          }
          if (final) {
            setTranscript((prev) => {
              const updated = prev + final;
              transcriptRef.current = updated;
              return updated;
            });
          }
          setInterimTranscript(interim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          // Restart if still recording (speech recognition stops automatically sometimes)
          if (mediaRecorderRef.current?.state === "recording") {
            try { recognition.start(); } catch {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= MAX_SECONDS - 1) {
            stopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setPermissionDenied(true);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = seconds / MAX_SECONDS;
  const displayTranscript = transcript + interimTranscript;

  // --- Permission Denied ---
  if (permissionDenied) {
    return (
      <div className="card-elevated w-full max-w-md flex flex-col items-center gap-5 p-8 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-yellow-400 text-3xl">mic_off</span>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-yellow-300 mb-1">
            ไม่สามารถเข้าถึงไมโครโฟนได้
          </p>
          <p className="text-sm text-slate-400">
            กรุณาอนุญาตการใช้งานไมโครโฟน หรือพิมพ์ข้อความแทน
          </p>
        </div>
        <button
          onClick={onSkip}
          className="w-full py-4 bg-bg-surface hover:bg-bg-card rounded-full text-lg font-semibold transition-colors"
        >
          พิมพ์ข้อความแทน
        </button>
      </div>
    );
  }

  // --- Main Recorder ---
  return (
    <div className="card-elevated w-full max-w-md flex flex-col items-center gap-5 p-6 animate-fade-in-up">
      {/* Category badge if set */}
      {category && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold">
          <span className="material-symbols-outlined text-base">category</span>
          {category}
        </div>
      )}

      <p className="text-base font-semibold text-center text-slate-200">
        {isRecording
          ? "กำลังฟัง... พูดอธิบายเหตุการณ์"
          : "กดปุ่มไมค์แล้วพูดอธิบายเหตุการณ์"}
      </p>

      {/* Central circle with progress ring */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {/* SVG progress ring */}
        {isRecording && (
          <svg className="absolute inset-0" width={160} height={160} viewBox="0 0 160 160">
            <circle cx={80} cy={80} r={72} fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth={4} />
            <circle
              cx={80} cy={80} r={72}
              fill="none" stroke="#e61919" strokeWidth={4} strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 72}
              strokeDashoffset={2 * Math.PI * 72 * (1 - progress)}
              transform="rotate(-90 80 80)"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
        )}

        {!isRecording ? (
          <button
            onClick={startRecording}
            className="relative z-10 w-32 h-32 rounded-full
                       bg-gradient-to-br from-red-500 to-primary-dark
                       hover:from-red-400 hover:to-primary
                       flex items-center justify-center transition-all
                       shadow-lg shadow-primary/30
                       focus:outline-none active:scale-95"
            aria-label="เริ่มบันทึกเสียง"
          >
            <span className="material-symbols-outlined text-white text-5xl">mic</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="relative z-10 w-32 h-32 rounded-full
                       bg-bg-surface border-2 border-primary/50
                       flex flex-col items-center justify-center transition-all
                       hover:bg-bg-card active:scale-95
                       focus:outline-none"
            aria-label="หยุดบันทึกเสียง"
          >
            {/* Wave bars */}
            <div className="flex items-center gap-[3px] mb-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="wave-bar w-1 bg-primary rounded-full"
                  style={{ animationDelay: `${i * 0.1}s`, height: 6 }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400 font-medium">กดเพื่อหยุด</span>
          </button>
        )}
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="text-center">
          <span className="recording-pulse text-3xl font-mono tabular-nums text-primary font-bold">
            {formatTime(seconds)}
          </span>
        </div>
      )}

      {/* Real-time transcript */}
      {isRecording && displayTranscript && (
        <div className="w-full bg-bg-surface rounded-xl p-4 border border-white/5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-emerald-400 text-sm">auto_awesome</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">ข้อความที่ฟังได้</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-slate-500">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Max time hint */}
      {!isRecording && (
        <>
          <p className="text-sm text-slate-500">สูงสุด 60 วินาที • ถอดเสียงอัตโนมัติ</p>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">keyboard</span>
            พิมพ์ข้อความแทน
          </button>
        </>
      )}
    </div>
  );
}
