"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity, Lock, User, Loader2 } from "lucide-react";

export default function Login() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await signIn("credentials", {
            redirect: false,
            username: formData.username,
            password: formData.password,
        });

        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push("/"); // Login success par Dashboard bhej do
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_2px_24px_-4px_rgba(0,0,0,0.05)] border border-slate-100 p-8">

                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 mb-4">
                        <Activity className="text-white w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pharma<span className="text-emerald-500">ERP</span></h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Staff & Admin Login Portal</p>
                </div>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-semibold mb-6 text-center border border-rose-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                placeholder="Enter username"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                placeholder="Enter password"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base px-4 py-4 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center mt-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Login"}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-slate-400 font-medium flex items-center justify-center">
                    <Lock className="w-3 h-3 mr-1" /> Secure & Encrypted Login
                </div>
            </div>
        </div>
    );
}