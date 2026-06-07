import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Shield, GraduationCap, Users, AlertCircle, Sparkles } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate("/"); // Navigate to guarded dashboard
    } catch (err: any) {
      setErrorStatus(err.message || "Incorrect credentials or authentication failure.");
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (roleType: string) => {
    setErrorStatus(null);
    if (roleType === "student") {
      setEmail("student@lms.com");
      setPassword("password");
    } else if (roleType === "teacher") {
      setEmail("teacher@lms.com");
      setPassword("password");
    } else if (roleType === "admin") {
      setEmail("admin@lms.com");
      setPassword("password");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50/50 px-4 py-8 relative overflow-hidden">
      
      {/* Dynamic Background Blur Accents */}
      <div className="absolute top-10 left-10 -z-10 h-72 w-72 rounded-full bg-blue-100/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-72 w-72 rounded-full bg-emerald-100/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Workspace Brand Hub */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-gray-950" id="login_main_heading">
            Socrates Classroom
          </h2>
          <p className="text-xs text-gray-400">
            A production-ready secure Learning Management Hub
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/40">
          
          <div className="mb-6 flex justify-between items-center border-b border-gray-100 pb-4">
            <h3 className="text-sm font-bold text-gray-800">Sign In</h3>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Encrypted Session
            </span>
          </div>

          {/* Playground Quick Entry Tags */}
          <div className="mb-6 rounded-2xl bg-blue-50/40 p-4 border border-blue-100/30 text-left">
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Playground Demo Login
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setDemoCredentials("student")}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-2 border border-gray-150 text-center transition-all hover:border-blue-400 hover:bg-blue-50/20 active:scale-95 cursor-pointer"
                title="Avery login"
                id="demo_student_btn"
              >
                <GraduationCap className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-[9px] font-bold text-gray-700">Student</span>
              </button>
              <button
                onClick={() => setDemoCredentials("teacher")}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-2 border border-gray-150 text-center transition-all hover:border-emerald-400 hover:bg-emerald-50/20 active:scale-95 cursor-pointer"
                title="Dr Vance login"
                id="demo_teacher_btn"
              >
                <Users className="h-4 w-4 text-emerald-600 mb-1" />
                <span className="text-[9px] font-bold text-gray-700">Teacher</span>
              </button>
              <button
                onClick={() => setDemoCredentials("admin")}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-2 border border-gray-150 text-center transition-all hover:border-rose-400 hover:bg-rose-50/20 active:scale-95 cursor-pointer"
                title="Manager login"
                id="demo_admin_btn"
              >
                <Shield className="h-4 w-4 text-rose-600 mb-1" />
                <span className="text-[9px] font-bold text-gray-700">Admin</span>
              </button>
            </div>
          </div>

          {errorStatus && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-red-650 text-left" id="login_error_box">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-2xs font-semibold leading-normal">{errorStatus}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-250 px-4 py-2.5 text-xs outline-hidden transition-all focus:border-blue-500 focus:bg-white"
                id="login_email_input"
              />
            </div>

            <div>
              <label className="block text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-250 px-4 py-2.5 text-xs outline-hidden transition-all focus:border-blue-500 focus:bg-white"
                id="login_password_input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-98"
              }`}
              id="submit_auth_btn"
            >
              {loading ? "Verifying..." : "Sign In to Socrates"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-2xs text-gray-400">
              New to Socrates?{" "}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700" id="link_to_register">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
