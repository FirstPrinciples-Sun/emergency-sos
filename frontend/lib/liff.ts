/**
 * LINE LIFF SDK helper module.
 * Wraps @line/liff for safe usage in Next.js (SSR-safe).
 */

import type liff from "@line/liff";

// We dynamically import '@line/liff' since it uses browser APIs
let liffInstance: typeof liff | null = null;

export interface LiffProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

export async function initLiff(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (!LIFF_ID) {
        console.warn("[LIFF] NEXT_PUBLIC_LIFF_ID is not set – running in guest mode");
        return false;
    }

    try {
        const liffModule = await import("@line/liff");
        liffInstance = liffModule.default;
        await liffInstance.init({ liffId: LIFF_ID });
        return liffInstance.isLoggedIn();
    } catch (err) {
        console.error("[LIFF] Init failed:", err);
        return false;
    }
}

export function isLiffLoggedIn(): boolean {
    return liffInstance?.isLoggedIn() ?? false;
}

export function liffLogin(): void {
    if (!liffInstance) {
        console.warn("[LIFF] Not initialized");
        return;
    }
    liffInstance.login();
}

export function liffLogout(): void {
    if (!liffInstance) return;
    localStorage.removeItem("liff-token");
    liffInstance.logout();
    window.location.reload();
}

export async function getLiffProfile(): Promise<LiffProfile | null> {
    if (!liffInstance || !liffInstance.isLoggedIn()) return null;
    try {
        const profile = await liffInstance.getProfile();
        return {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
        };
    } catch (err) {
        console.error("[LIFF] getProfile error:", err);
        return null;
    }
}

export function getLiffAccessToken(): string | null {
    if (!liffInstance || !liffInstance.isLoggedIn()) return null;
    return liffInstance.getAccessToken();
}

export function isInLiffClient(): boolean {
    return liffInstance?.isInClient() ?? false;
}
