import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/SocketContext";
import { BookOpen, Bell, LogOut, User as UserIcon, Check } from "lucide-react";
import api from "../services/api";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-6 backdrop-blur-md shadow-sm">
      {/* Brand Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
          <BookOpen className="h-5.5 w-5.5" id="nav_logo_icon" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-none" id="brand_title">
            Socrates Portal
          </h1>
          <span className="text-2xs font-mono text-gray-400">Interactive Classroom</span>
        </div>
      </div>

      {/* Profile & Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications Hub */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative rounded-xl p-2.5 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-95"
              title="Notifications"
              id="notif_bell_btn"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-3xs font-extrabold text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="mb-2 flex items-center justify-between px-2 pb-1 border-b border-gray-50">
                  <h3 className="text-xs font-bold text-gray-800">Learning Alerts</h3>
                  {unreadCount > 0 && <span className="text-4xs font-bold px-1.5 py-0.5 bg-red-50 rounded text-red-600">{unreadCount} New</span>}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-gray-400">All caught up! No recent alerts.</p>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`group flex items-start gap-2 rounded-xl p-2 text-left transition-all hover:bg-gray-50 ${
                          !notif.read ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-gray-800 leading-snug">{notif.title}</h4>
                          <p className="mt-0.5 text-2xs text-gray-500 leading-normal">{notif.message}</p>
                          <span className="mt-1 block text-4xs font-mono text-gray-400">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="rounded-full bg-blue-100 p-1 text-blue-600 hover:bg-blue-200 opacity-90 hover:opacity-100"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Badge Info */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-gray-100">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-800" id="user_display_name">{user.name}</p>
              <div className="flex justify-end mt-0.5">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-4xs font-mono font-extrabold uppercase tracking-wide ${
                    user.role === "admin"
                      ? "bg-rose-100 text-rose-700"
                      : user.role === "teacher"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                  id="user_role_tag"
                >
                  {user.role}
                </span>
              </div>
            </div>
            <img
              src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
              alt="Avatar image"
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full border border-gray-100 object-cover shadow-inner hover:scale-105 transition-all"
            />
            
            {/* Log out option */}
            <button
              onClick={logout}
              className="rounded-xl border border-gray-100 p-2.5 text-gray-500 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95"
              title="Log out"
              id="logout_action_btn"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
