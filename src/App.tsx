import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Unauthorized } from "./pages/Unauthorized";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StudentDashboard } from "./pages/Dashboard/StudentDashboard";
import { TeacherDashboard } from "./pages/Dashboard/TeacherDashboard";
import { AdminDashboard } from "./pages/Dashboard/AdminDashboard";
import { CourseExplore } from "./pages/Courses/CourseExplore";
import { CourseDetail } from "./pages/Courses/CourseDetail";

const LMSAppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<string>("dashboard");
  const [courseInitialTab, setCourseInitialTab] = useState<"syllabus" | "assignments" | "forum" | "ai_tutor">("syllabus");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-2xs font-mono text-gray-400">Loading classroom portal...</p>
        </div>
      </div>
    );
  }

  const navigateToCourse = (courseId: string, initialTab: "syllabus" | "assignments" | "forum" | "ai_tutor" = "syllabus") => {
    setPreviousTab(currentTab);
    setActiveCourseId(courseId);
    setCourseInitialTab(initialTab);
    setCurrentTab("course_detail");
  };

  const renderContent = () => {
    // 1. Role Check: STUDENT
    if (user.role === "student") {
      switch (currentTab) {
        case "dashboard":
          return <StudentDashboard onResumeCourse={navigateToCourse} />;
        case "explore":
          return <CourseExplore onSelectCourse={navigateToCourse} />;
        case "course_detail":
          return activeCourseId ? (
            <CourseDetail
              courseId={activeCourseId}
              initialTab={courseInitialTab}
              onGoBack={() => {
                setCurrentTab(previousTab || "dashboard");
                setActiveCourseId(null);
                setCourseInitialTab("syllabus");
              }}
            />
          ) : (
            <StudentDashboard onResumeCourse={navigateToCourse} />
          );
        case "ai_chat":
          // Open direct general portal with the first course AI
          return (
            <div className="space-y-4 text-left">
              <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider">LMS AI Study Assistant</h3>
              <CourseDetail courseId="c_ai_gemini" initialTab="ai_tutor" onGoBack={() => setCurrentTab("dashboard")} />
            </div>
          );
        default:
          return <StudentDashboard onResumeCourse={navigateToCourse} />;
      }
    }

    // 2. Role Check: TEACHER
    if (user.role === "teacher") {
      // Teacher tasks map into responsive sub-elements of TeacherDashboard
      return <TeacherDashboard />;
    }

    // 3. Role Check: ADMIN
    if (user.role === "admin") {
      // Admin tasks map into AdminDashboard
      return <AdminDashboard />;
    }

    return (
      <div className="py-20 text-center text-xs text-gray-400">
        Unauthorized access parameters detected. Please speak with systemic supervisors.
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col text-gray-800">
      
      {/* Platform Header Navigation bar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Adaptive role-based Sidebar controllers */}
        <Sidebar
          role={user.role}
          currentTab={currentTab}
          onChangeTab={(tab) => {
            setCurrentTab(tab);
            setActiveCourseId(null);
          }}
        />

        {/* Dynamic content canvas panel */}
        <main className="flex-1 p-4 md:p-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
            {renderContent()}
          </div>
        </main>
      </div>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <LMSAppContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
