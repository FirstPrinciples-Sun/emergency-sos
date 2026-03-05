"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Don't show if already dismissed recently (7 days)
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed) {
            const ts = parseInt(dismissed, 10);
            if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShow(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShow(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    };

    if (!show) return null;

    return (
        <div className="mx-5 mt-2 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3 animate-fade-in-up">
            <span className="material-symbols-outlined filled text-primary text-xl">install_mobile</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">ติดตั้งแอป SOS</p>
                <p className="text-xs text-slate-400">เพิ่มลงหน้าจอหลักเพื่อเข้าถึงเร็วขึ้น</p>
            </div>
            <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-full transition-colors shrink-0"
            >
                ติดตั้ง
            </button>
            <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 shrink-0">
                <span className="material-symbols-outlined text-lg">close</span>
            </button>
        </div>
    );
}
