import React from "react";
import { 
  Compass, 
  Grid, 
  PenTool, 
  Sparkles, 
  MessageSquare, 
  Users, 
  Database, 
  Activity,
  Heart
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  role: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onChangeTab, role }) => {
  
  const getNavItems = () => {
    switch (role) {
      case "student":
        return [
          { id: "dashboard", label: "Dashboard", icon: Grid },
          { id: "explore", label: "Explore Courses", icon: Compass },
          { id: "ai_chat", label: "Gemini AI Tutor", icon: Sparkles },
        ];
      case "teacher":
        return [
          { id: "dashboard", label: "Teaching Center", icon: Grid },
          { id: "courses_curriculum", label: "Curriculum Builder", icon: Compass },
          { id: "grading_center", label: "Grading Desk", icon: PenTool },
        ];
      case "admin":
        return [
          { id: "dashboard", label: "Platform Metrics", icon: Grid },
          { id: "user_manage", label: "User Database", icon: Users },
          { id: "system_health", label: "System Diagnostic", icon: Activity },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-gray-100 bg-white p-4 md:flex justify-between">
      <div className="space-y-1">
        <span className="px-3 text-4xs font-mono font-bold uppercase tracking-widest text-gray-400">
          Navigation Desk
        </span>
        <nav className="mt-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold leading-none transition-all duration-150 active:scale-98 ${
                  isActive
                    ? role === "admin"
                      ? "bg-rose-50 text-rose-700 shadow-xs"
                      : role === "teacher"
                      ? "bg-emerald-50 text-emerald-700 shadow-xs"
                      : "bg-blue-50 text-blue-700 shadow-xs"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
                id={`sidebar_tab_${item.id}`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "scale-105" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Decorative Brand Card */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/30 p-4 border border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500 animate-pulse" />
          <span>Active Learning</span>
        </div>
        <p className="mt-1 text-4xs leading-normal text-gray-400">
          Unlock your complete programming potential utilizing server-grade sandbox platforms.
        </p>
      </div>
    </aside>
  );
};
