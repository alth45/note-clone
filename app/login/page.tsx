"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Github, User, CheckCircle2, Loader2 } from "lucide-react";
import { useDialog } from "@/context/DialogContext";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isOAuthLoading, setIsOAuthLoading] = useState<"google" | "github" | null>(null);
    const [successMsg, setSuccessMsg] = useState("");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const router = useRouter();
    const { showAlert } = useDialog();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMsg("");

        if (isLogin) {
            try {
                const res = await signIn("credentials", {
                    redirect: false,
                    email,
                    password,
                });

                if (res?.error) {
                    showAlert(res.error, "Login Gagal", "danger");
                } else {
                    router.push("/dashboard");
                    router.refresh();
                }
            } catch {
                showAlert("Terjadi kesalahan server.", "Error", "danger");
            } finally {
                setIsLoading(false);
            }
        } else {
            try {
                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    showAlert(data.message || "Gagal mendaftar.", "Pendaftaran Gagal", "warning");
                    return;
                }

                setIsLogin(true);
                setSuccessMsg("Akun berhasil dibuat! Silakan masuk dengan email Anda.");
                setName("");
                setPassword("");
            } catch {
                showAlert("Terjadi kesalahan koneksi. Coba lagi nanti.", "Error Server", "danger");
            } finally {
                setIsLoading(false);
            }
        }
    }

    async function handleOAuth(provider: "google" | "github") {
        setIsOAuthLoading(provider);
        try {
            await signIn(provider, { callbackUrl: "/dashboard" });
        } catch {
            showAlert("Gagal login dengan provider ini. Coba lagi.", "Error", "danger");
            setIsOAuthLoading(null);
        }
    }

    function toggleMode() {
        setIsLogin(!isLogin);
        setSuccessMsg("");
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md bg-washi rounded-3xl p-8 md:p-10 shadow-[0_8px_40px_rgb(28,28,30,0.06)] border border-sumi-10 relative overflow-hidden transition-all duration-500 ease-in-out">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sumi/5 rounded-bl-[100px] -z-10" />

                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block font-bold text-2xl tracking-tight mb-2 hover:opacity-70 transition-opacity">
                        ロゴ <span className="font-light text-sumi-muted">/ LOGO</span>
                    </Link>
                    <h1 className="text-xl font-bold text-sumi mt-4">
                        {isLogin ? "Selamat Datang Kembali" : "Mulai Perjalananmu"}
                    </h1>
                    <p className="text-sm text-sumi-muted mt-2">
                        {isLogin ? "Masuk untuk melanjutkan membaca dan menulis." : "Buat akun untuk mengekspresikan idemu."}
                    </p>
                </div>

                {/* Success message */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${successMsg ? "max-h-20 opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"}`}>
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100 text-sm font-medium">
                        <CheckCircle2 size={16} />
                        {successMsg}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                    {/* Nama — hanya saat register */}
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isLogin ? "max-h-0 opacity-0 -mb-6" : "max-h-[100px] opacity-100 mb-0"}`}>
                        <div className="relative group">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-sumi-muted group-focus-within:text-sumi transition-colors">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nama Lengkap"
                                className="w-full bg-transparent border-b border-sumi-10 focus:border-sumi outline-none py-3 pl-8 text-sumi placeholder:text-sumi-muted/50 transition-colors text-sm"
                                required={!isLogin}
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-sumi-muted group-focus-within:text-sumi transition-colors">
                            <Mail size={18} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Alamat Email"
                            className="w-full bg-transparent border-b border-sumi-10 focus:border-sumi outline-none py-3 pl-8 text-sumi placeholder:text-sumi-muted/50 transition-colors text-sm"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-sumi-muted group-focus-within:text-sumi transition-colors">
                            <Lock size={18} />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Kata Sandi"
                            className="w-full bg-transparent border-b border-sumi-10 focus:border-sumi outline-none py-3 pl-8 text-sumi placeholder:text-sumi-muted/50 transition-colors text-sm"
                            required
                        />
                    </div>

                    <div className={`flex justify-end overflow-hidden transition-all duration-500 ease-in-out ${!isLogin ? "max-h-0 opacity-0 m-0" : "max-h-10 opacity-100 mt-1"}`}>
                        <Link href="#" className="text-xs font-bold text-sumi-muted hover:text-sumi transition-colors">
                            Lupa kata sandi?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group flex items-center justify-center gap-2 w-full bg-sumi text-washi py-3.5 rounded-xl font-bold text-sm hover:bg-sumi-light hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 mt-2 disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {isLoading
                            ? <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                            : (
                                <>
                                    {isLogin ? "Masuk" : "Daftar Sekarang"}
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )
                        }
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-[1px] bg-sumi-10"></div>
                    <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">Atau</span>
                    <div className="flex-1 h-[1px] bg-sumi-10"></div>
                </div>

                {/* OAuth buttons */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => handleOAuth("google")}
                        disabled={!!isOAuthLoading}
                        className="flex items-center justify-center gap-3 w-full bg-washi-dark border border-sumi-10 text-sumi py-3 rounded-xl text-sm font-medium hover:bg-sumi/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isOAuthLoading === "google" ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25C22.56 11.47 22.49 10.71 22.36 9.98H12V14.27H17.92C17.66 15.65 16.88 16.82 15.71 17.6V20.37H19.28C21.36 18.44 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
                                <path d="M12 23C14.97 23 17.46 22.02 19.28 20.37L15.71 17.6C14.73 18.26 13.48 18.66 12 18.66C9.13 18.66 6.71 16.73 5.84 14.15H2.18V16.98C4.01 20.62 7.69 23 12 23Z" fill="#34A853" />
                                <path d="M5.84 14.15C5.62 13.5 5.5 12.77 5.5 12C5.5 11.23 5.62 10.5 5.84 9.85V7.02H2.18C1.43 8.51 1 10.2 1 12C1 13.8 1.43 15.49 2.18 16.98L5.84 14.15Z" fill="#FBBC05" />
                                <path d="M12 5.34C13.62 5.34 15.07 5.9 16.22 6.99L19.35 3.86C17.46 2.11 14.97 1 12 1C7.69 1 4.01 3.38 2.18 7.02L5.84 9.85C6.71 7.27 9.13 5.34 12 5.34Z" fill="#EA4335" />
                            </svg>
                        )}
                        {isLogin ? "Masuk dengan Google" : "Daftar dengan Google"}
                    </button>

                    <button
                        onClick={() => handleOAuth("github")}
                        disabled={!!isOAuthLoading}
                        className="flex items-center justify-center gap-3 w-full bg-washi-dark border border-sumi-10 text-sumi py-3 rounded-xl text-sm font-medium hover:bg-sumi/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isOAuthLoading === "github" ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Github size={18} />
                        )}
                        {isLogin ? "Masuk dengan GitHub" : "Daftar dengan GitHub"}
                    </button>
                </div>

                <p className="text-center text-xs text-sumi-muted mt-8">
                    {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
                    <button type="button" onClick={toggleMode} className="font-bold text-sumi hover:underline underline-offset-4">
                        {isLogin ? "Daftar sekarang" : "Masuk di sini"}
                    </button>
                </p>
            </div>
        </div>
    );
}