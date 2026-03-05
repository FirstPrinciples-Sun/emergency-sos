"use client";

import { useEffect, useRef } from "react";

export type GpsStatus = "requesting" | "active" | "error";

interface LocationCaptureProps {
  onLocation: (location: { latitude: number; longitude: number }) => void;
  onStatusChange?: (status: GpsStatus) => void;
  onError?: (message: string) => void;
  /** Change this value to force a re-capture */
  retryKey?: number;
}

export default function LocationCapture({
  onLocation,
  onStatusChange,
  onError,
  retryKey = 0,
}: LocationCaptureProps) {
  const lastRetryKey = useRef<number>(-1);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Only run when retryKey changes (or on first mount)
    if (lastRetryKey.current === retryKey) return;
    lastRetryKey.current = retryKey;

    // Clean up any previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!navigator.geolocation) {
      onStatusChange?.("error");
      onError?.("อุปกรณ์ไม่รองรับ GPS");
      return;
    }

    onStatusChange?.("requesting");

    // Attempt high-accuracy first, then fall back
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        onStatusChange?.("active");
      },
      (err) => {
        console.warn("High-accuracy GPS failed, trying fallback:", err.message);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            onLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            onStatusChange?.("active");
          },
          (fallbackErr) => {
            console.error("Geolocation failed:", fallbackErr.message);
            onStatusChange?.("error");
            const msg =
              fallbackErr.code === 1
                ? "กรุณาอนุญาตการเข้าถึง GPS"
                : fallbackErr.code === 2
                  ? "ไม่สามารถระบุตำแหน่งได้"
                  : "GPS หมดเวลา กรุณาลองใหม่";
            onError?.(msg);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    // Also watch for updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        onStatusChange?.("active");
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [retryKey, onLocation, onStatusChange, onError]);

  // This component renders nothing – it only captures GPS
  return null;
}
