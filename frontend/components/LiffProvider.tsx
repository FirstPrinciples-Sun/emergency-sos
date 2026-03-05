"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    initLiff,
    getLiffProfile,
    getLiffAccessToken,
    liffLogin,
    liffLogout,
    isLiffLoggedIn,
    type LiffProfile,
} from "@/lib/liff";

interface LiffContextValue {
    user: LiffProfile | null;
    accessToken: string | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
}

const LiffContext = createContext<LiffContextValue>({
    user: null,
    accessToken: null,
    isLoggedIn: false,
    isLoading: true,
    login: () => { },
    logout: () => { },
});

export function useLiff() {
    return useContext(LiffContext);
}

export default function LiffProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<LiffProfile | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const loggedInResult = await initLiff();
                setLoggedIn(loggedInResult);

                if (loggedInResult) {
                    const profile = await getLiffProfile();
                    setUser(profile);
                    const token = getLiffAccessToken();
                    setAccessToken(token);
                    // Store token so api.ts can read it
                    if (token) {
                        sessionStorage.setItem("liff-token", token);
                    }
                }
            } catch (err) {
                console.error("[LiffProvider] Error:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const value: LiffContextValue = {
        user,
        accessToken,
        isLoggedIn: loggedIn,
        isLoading,
        login: liffLogin,
        logout: liffLogout,
    };

    return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}
