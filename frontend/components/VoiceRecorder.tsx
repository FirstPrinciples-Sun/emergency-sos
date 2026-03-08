"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceRecorderProps {
  onComplete: (data: { audio?: string; transcript?: string }) => void;
  onSkip: () => void;
  category?: string;
}

const MAX_SECONDS = 60;

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/x-m4a",
  ];
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // Some browsers throw on isTypeSupported
    }
  }
  return "";
}

function mimeToDataUriPrefix(mime: string): string {
  const base = mime.split(";")[0] || "audio/webm";
  return `data:${base};base64,`;
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
  const mimeTypeRef = useRef("");

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
    // Check MediaRecorder support before anything
    if (typeof MediaRecorder === "undefined") {
      setPermissionDenied(true);
      return;
    }

    chunksRef.current = [];
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualMime = mimeTypeRef.current || mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const dataUri = mimeToDataUriPrefix(actualMime) + base64;

        const finalTranscript = transcriptRef.current.trim();
        onComplete({
          audio: dataUri,
          transcript: finalTranscript || undefined,
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);

      // Web Speech API for real-time Thai transcription
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
            กรุณาอนุญาตการใช้งานไมโครโฟนในตั้งค่าเบราว์เซอร์ หรือพิมพ์ข้อความแทน
          </p>
        </div>
        <button
          onClick={onSkip}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl text-base font-bold transition-all
                     flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">keyboard</span>
          พิมพ์ข้อความแทน
        </button>
      </div>
    );
  }

  return (
    <div className="card-elevated w-full max-w-md flex flex-col items-center gap-4 p-6 animate-fade-in-up">
      {category && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold">
          <span className="material-symbols-outlined text-base">category</span>
          {category}
        </div>
      )}

      {/* Instruction */}
      {!isRecording ? (
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-white">บันทึกเสียงอธิบายเหตุ</p>
          <p className="text-sm text-slate-400">กดปุ่มไมค์สีแดง แล้วพูดอธิบายสิ่งที่เกิดขึ้น</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg font-bold text-primary animate-pulse">กำลังฟัง...</p>
          <p className="text-sm text-slate-400 mt-0.5">พูดอธิบายเหตุการณ์ได้เลย</p>
        </div>
      )}

      {/* Mic button */}
      <div className="relative flex items-center justify-center my-2" style={{ width: 160, height: 160 }}>
        {/* Progress ring */}
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

        {/* Pulse rings when idle */}
        {!isRecording && (
          <>
            <div className="absolute w-40 h-40 rounded-full border-2 border-red-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute w-36 h-36 rounded-full border border-red-500/5 animate-ping" style={{ animationDuration: "2.5s" }} />
          </>
        )}

        {!isRecording ? (
          <button
            onClick={startRecording}
            className="relative z-10 w-32 h-32 rounded-full
                       bg-gradient-to-br from-red-500 to-primary-dark
                       hover:from-red-400 hover:to-primary
                       flex flex-col items-center justify-center transition-all
                       shadow-xl shadow-red-500/30
                       focus:outline-none active:scale-95"
            aria-label="เริ่มบันทึกเสียง"
          >
            <span className="material-symbols-outlined text-white text-5xl">mic</span>
            <span className="text-white/80 text-[10px] font-bold mt-1 uppercase tracking-wider">กดเพื่อพูด</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="relative z-10 w-32 h-32 rounded-full
                       bg-bg-surface border-2 border-primary/40
                       flex flex-col items-center justify-center transition-all
                       hover:bg-bg-card hover:border-primary/60 active:scale-95
                       focus:outline-none shadow-lg"
            aria-label="หยุดบันทึกเสียง"
          >
            {/* Wave bars */}
            <div className="flex items-center gap-[3px] mb-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="wave-bar w-1 bg-primary rounded-full"
                  style={{ animationDelay: `${i * 0.1}s`, height: 6 }}
                />
              ))}
            </div>
            <span className="text-primary text-xs font-bold">หยุดบันทึก</span>
          </button>
        )}
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="recording-pulse text-3xl font-mono tabular-nums text-primary font-bold">
            {formatTime(seconds)}
          </span>
          <span className="text-xs text-slate-500">/ {formatTime(MAX_SECONDS)}</span>
        </div>
      )}

      {/* Live transcript */}
      {isRecording && displayTranscript && (
        <div className="w-full bg-bg-surface rounded-xl p-4 border border-white/5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-emerald-400 text-sm">auto_awesome</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">ข้อความที่ฟังได้</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-slate-500 italic">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Whisper fallback notice when browser STT unavailable */}
      {isRecording && !displayTranscript && seconds > 2 && (
        <div className="w-full bg-blue-500/10 rounded-xl p-3 border border-blue-500/20 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-sm">cloud_upload</span>
            <span className="text-xs text-blue-300">
              ระบบจะแปลงเสียงเป็นข้อความอัตโนมัติหลังหยุดบันทึก
            </span>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      {!isRecording && (
        <div className="w-full flex flex-col gap-2 mt-1">
          <p className="text-xs text-slate-500 text-center">สูงสุด 60 วินาที &middot; ระบบจะแปลงเสียงเป็นข้อความอัตโนมัติ</p>
          <button
            onClick={onSkip}
            className="w-full py-3 bg-bg-surface hover:bg-bg-card border border-white/5
                       rounded-full text-sm font-semibold transition-all
                       flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">keyboard</span>
            ข้ามขั้นตอนนี้ &middot; พิมพ์ข้อความแทน
          </button>
        </div>
      )}
    </div>
  );
}
