import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, AlertCircle, Sparkles } from "lucide-react";

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [bio, setBio] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    setLoading(true);

    try {
      await register(email, name, role, password, bio);
      navigate("/"); // Redirect to primary guarded dashboard route
    } catch (err: any) {
      setErrorStatus(err.message || "An account registration error occurred.");
    } finally {
      setLoading(false);
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
          <Link to="/login" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-250 transition-transform hover:scale-105 active:scale-95">
            <BookOpen className="h-6 w-6" />
          </Link>
          <h2 className="text-2xl font-black tracking-tight text-gray-950" id="register_main_heading">
            Socrates Classroom
          </h2>
          <p className="text-xs text-gray-400">
            Create a secure LMS workspace account
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/40">
          
          <div className="mb-6 flex justify-between items-center border-b border-gray-100 pb-4">
            <h3 className="text-sm font-bold text-gray-800">New Account</h3>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <Sparkles className="h-3 w-3" /> Secure Port
            </span>
          </div>

          {errorStatus && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-red-650" id="register_error_box">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-2xs font-semibold leading-normal">{errorStatus}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Avery Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-250 px-4 py-2.5 text-xs outline-hidden transition-all focus:border-blue-500 focus:bg-white"
                id="register_name_input"
              />
            </div>

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
                id="register_email_input"
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
                id="register_password_input"
              />
            </div>

            <div>
              <label className="block text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Select Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-gray-250 bg-white px-4 py-2.5 text-xs outline-hidden transition-all focus:border-blue-500"
                id="register_role_input"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator (Manager)</option>
              </select>
            </div>

            <div>
              <label className="block text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Short Bio (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-gray-250 px-4 py-2.5 text-xs outline-hidden transition-all focus:border-blue-500"
                id="register_bio_input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3 text-xs font-bold text-white shadow-md shadow-blue-150 transition-all ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-98"
              }`}
              id="submit_register_btn"
            >
              {loading ? "Registering session..." : "Create Account & Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-2xs text-gray-400">
              Already have a credential?{" "}
              <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
