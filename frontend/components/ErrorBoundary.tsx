"use client";

import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary] Caught:", error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-dvh flex items-center justify-center bg-bg-main p-6">
                    <div className="card-elevated max-w-sm w-full p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined filled text-red-400 text-3xl">
                                error
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            เกิดข้อผิดพลาด
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 py-3 bg-bg-surface hover:bg-bg-card border border-white/5
                           rounded-full text-sm font-semibold transition-all"
                            >
                                หน้าหลัก
                            </button>
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 py-3 bg-primary hover:bg-primary-dark
                           rounded-full text-sm font-bold text-white transition-all
                           shadow-lg shadow-primary/20"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
