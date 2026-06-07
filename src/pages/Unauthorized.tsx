import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4">
      <div className="w-full max-w-md p-8 bg-white border border-gray-100 rounded-3xl shadow-xl space-y-6 text-center animate-in fade-in duration-300">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Access Denied</h2>
          <p className="text-xs text-gray-400">
            Your current account credentials do not hold the authorization credentials required to view this segment.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-1.5 w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-xs border border-gray-150 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
          
          <Link
            to="/"
            className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md shadow-blue-100 transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
