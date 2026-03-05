"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiff } from "@/components/LiffProvider";
import BottomNav from "@/components/BottomNav";
import {
    uploadDocument,
    listDocuments,
    deleteDocument,
    getDownloadUrl,
    type DocumentMeta,
} from "@/lib/documents-api";

const FILE_ICONS: Record<string, string> = {
    "application/pdf": "picture_as_pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "text/plain": "description",
    default: "attach_file",
};

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string): string {
    return FILE_ICONS[contentType] || FILE_ICONS.default;
}

export default function DocumentsPage() {
    const { user, accessToken, isLoggedIn, isLoading: authLoading, login } = useLiff();
    const [documents, setDocuments] = useState<DocumentMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadDocuments = useCallback(async () => {
        if (!accessToken) return;
        try {
            setLoading(true);
            const docs = await listDocuments(accessToken);
            setDocuments(docs);
        } catch (err) {
            setError(err instanceof Error ? err.message : "ไม่สามารถโหลดเอกสารได้");
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (isLoggedIn && accessToken) {
            loadDocuments();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [isLoggedIn, accessToken, authLoading, loadDocuments]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 10MB limit
        if (file.size > 10 * 1024 * 1024) {
            setError("ไฟล์มีขนาดใหญ่เกิน 10 MB");
            return;
        }

        try {
            setUploading(true);
            setError(null);
            await uploadDocument(file, accessToken);
            setSuccess(`อัปโหลด "${file.name}" สำเร็จ`);
            await loadDocuments();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = "";
        }
    };

    const handleDelete = async (doc: DocumentMeta) => {
        if (!confirm(`ลบ "${doc.filename}" ?`)) return;
        try {
            setError(null);
            await deleteDocument(doc.id, accessToken);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            setSuccess("ลบเอกสารสำเร็จ");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
        }
    };

    const handleDownload = async (doc: DocumentMeta) => {
        try {
            const url = await getDownloadUrl(doc.id, accessToken);
            window.open(url, "_blank");
        } catch (err) {
            setError(err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ");
        }
    };

    // Auth gate
    if (authLoading) {
        return (
            <div className="min-h-dvh flex items-center justify-center pb-24">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <BottomNav />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col items-center justify-center p-6 pb-24">
                <div className="card-elevated max-w-sm w-full p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#06C755]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined filled text-[#06C755] text-3xl">lock</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">เข้าสู่ระบบ</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        กรุณาเข้าสู่ระบบด้วย LINE เพื่อจัดการเอกสาร
                    </p>
                    <button
                        onClick={login}
                        className="w-full py-4 bg-[#06C755] hover:bg-[#05b34c] rounded-full text-base font-bold text-white transition-all shadow-lg"
                    >
                        เข้าสู่ระบบด้วย LINE
                    </button>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-md mx-auto min-h-dvh flex flex-col pb-24">
            {/* Header */}
            <header className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">folder</span>
                        เอกสารของฉัน
                    </h1>
                    {user && (
                        <p className="text-xs text-slate-500 mt-0.5">{user.displayName}</p>
                    )}
                </div>
                <a
                    href="/"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">home</span>
                    หน้าหลัก
                </a>
            </header>

            {/* Messages */}
            {error && (
                <div className="mx-5 mb-3 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-scale-in">
                    <span className="material-symbols-outlined filled text-red-400">error</span>
                    <span className="text-sm text-red-300 flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {success && (
                <div className="mx-5 mb-3 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 animate-scale-in">
                    <span className="material-symbols-outlined filled text-emerald-400">check_circle</span>
                    <span className="text-sm text-emerald-300">{success}</span>
                </div>
            )}

            {/* Upload */}
            <div className="px-5 mb-4">
                <label
                    className={`card flex items-center justify-center gap-3 p-6 cursor-pointer
                     hover:border-primary/30 transition-all ${uploading ? "opacity-50 pointer-events-none" : ""
                        }`}
                >
                    <input
                        type="file"
                        onChange={handleUpload}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx"
                        disabled={uploading}
                    />
                    {uploading ? (
                        <>
                            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <span className="text-sm text-slate-300">กำลังอัปโหลด...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-primary text-2xl">cloud_upload</span>
                            <div>
                                <p className="text-sm font-semibold text-white">อัปโหลดเอกสาร</p>
                                <p className="text-xs text-slate-500">PDF, รูปภาพ, ข้อความ (สูงสุด 10 MB)</p>
                            </div>
                        </>
                    )}
                </label>
            </div>

            {/* Document list */}
            <div className="flex-1 px-5 pb-6 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <span className="material-symbols-outlined text-slate-600 text-5xl">folder_open</span>
                        <p className="text-slate-500 text-sm">ยังไม่มีเอกสาร</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="card flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-primary">
                                        {getFileIcon(doc.content_type)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{doc.filename}</p>
                                    <p className="text-xs text-slate-500">
                                        {formatSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString("th-TH")}
                                    </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-emerald-500/10 flex items-center justify-center transition-colors"
                                        title="ดาวน์โหลด"
                                    >
                                        <span className="material-symbols-outlined text-emerald-400 text-lg">download</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc)}
                                        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                                        title="ลบ"
                                    >
                                        <span className="material-symbols-outlined text-red-400 text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
