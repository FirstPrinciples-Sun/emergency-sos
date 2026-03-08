"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import {
    initLiff,
    getLiffProfile,
    getLiffAccessToken,
    liffLogin,
    liffLogout,
    type LiffProfile,
} from "@/lib/liff";
import { getMyProfile, checkPdpaStatus, acceptPdpa, updateProfile, type UserProfile } from "@/lib/api";
import PDPAConsent from "./PDPAConsent";
import RegistrationForm from "./RegistrationForm";

interface LiffContextValue {
    user: LiffProfile | null;
    userProfile: UserProfile | null;
    accessToken: string | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const LiffContext = createContext<LiffContextValue>({
    user: null,
    userProfile: null,
    accessToken: null,
    isLoggedIn: false,
    isLoading: true,
    login: () => { },
    logout: () => { },
    refreshProfile: async () => { },
});

export function useLiff() {
    return useContext(LiffContext);
}

export default function LiffProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<LiffProfile | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [pdpaAccepted, setPdpaAccepted] = useState<boolean | null>(null);
    const [needsRegistration, setNeedsRegistration] = useState(false);
    const [pdpaSubmitting, setPdpaSubmitting] = useState(false);
    const [regSubmitting, setRegSubmitting] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const profile = await getMyProfile();
            setUserProfile(profile);
            setPdpaAccepted(profile.pdpa_accepted);
            if (profile.pdpa_accepted && !profile.full_name && !profile.phone) {
                setNeedsRegistration(true);
            } else {
                setNeedsRegistration(false);
            }
        } catch {
            setPdpaAccepted(false);
        }
    }, []);

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
                    if (token) {
                        localStorage.setItem("liff-token", token);
                    }
                    await fetchProfile();
                }
            } catch (err) {
                console.error("[LiffProvider] Error:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [fetchProfile]);

    const handlePdpaAccept = async () => {
        setPdpaSubmitting(true);
        try {
            await acceptPdpa();
            setPdpaAccepted(true);
            setNeedsRegistration(true);
        } catch (err) {
            console.error("[PDPA] Accept failed:", err);
        } finally {
            setPdpaSubmitting(false);
        }
    };

    const handleRegistrationComplete = async (data: {
        full_name: string;
        phone: string;
        blood_type?: string;
        allergies?: string;
        chronic_diseases?: string;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
    }) => {
        setRegSubmitting(true);
        try {
            await updateProfile(data);
            setNeedsRegistration(false);
            await fetchProfile();
        } catch (err) {
            console.error("[Registration] Failed:", err);
        } finally {
            setRegSubmitting(false);
        }
    };

    const value: LiffContextValue = {
        user,
        userProfile,
        accessToken,
        isLoggedIn: loggedIn,
        isLoading,
        login: liffLogin,
        logout: liffLogout,
        refreshProfile: fetchProfile,
    };

    // Gate: show PDPA consent if logged in but not accepted
    if (!isLoading && loggedIn && pdpaAccepted === false) {
        return (
            <LiffContext.Provider value={value}>
                <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col items-center justify-center">
                    <PDPAConsent onAccept={handlePdpaAccept} isSubmitting={pdpaSubmitting} />
                </div>
            </LiffContext.Provider>
        );
    }

    // Gate: show registration if PDPA accepted but no profile yet
    if (!isLoading && loggedIn && pdpaAccepted && needsRegistration) {
        return (
            <LiffContext.Provider value={value}>
                <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col overflow-y-auto">
                    <RegistrationForm
                        displayName={user?.displayName}
                        onComplete={handleRegistrationComplete}
                        isSubmitting={regSubmitting}
                    />
                </div>
            </LiffContext.Provider>
        );
    }

    return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}
