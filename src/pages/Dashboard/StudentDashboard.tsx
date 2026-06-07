import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/SocketContext";
import { Card, CardHeader } from "../../components/Card";
import {
  BookOpen,
  Award,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Play,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Bell,
  Send,
  GraduationCap,
  Clock,
  Check,
  Calendar,
  ChevronRight,
  User,
  Lightbulb,
  Info,
  ThumbsUp,
  Fingerprint,
  Video,
  Tv,
  Users,
  Monitor
} from "lucide-react";
import api from "../../services/api";
import { LiveClassroomRoom } from "../../components/LiveClassroomRoom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  Cell
} from "recharts";

interface StudentDashboardProps {
  onResumeCourse: (
    courseId: string,
    initialTab?: "syllabus" | "assignments" | "forum" | "ai_tutor"
  ) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onResumeCourse }) => {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  
  // States
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [recentForumPosts, setRecentForumPosts] = useState<any[]>([]);
  
  // Progress aggregates and attendance check-in trackers
  const [progressProfile, setProgressProfile] = useState<any>(null);
  const [checkInLoading, setCheckInLoading] = useState<Record<string, boolean>>({});
  const [activeProgressTab, setActiveProgressTab] = useState<"summary" | "attendance" | "assignments">("summary");
  
  // Loading status
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Socrates AI Widget states
  const [activeAiCourseId, setActiveAiCourseId] = useState<string>("");
  const [aiChatLogs, setAiChatLogs] = useState<any[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiWriting, setAiWriting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Live classes dashboard feeds
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);

  // Load all initial API metrics
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const [coursesRes, enrollsRes, subsRes, progressRes] = await Promise.all([
        api.get("/courses"),
        api.get(`/users/${user.id}/enrollments`),
        api.get(`/users/${user.id}/submissions`),
        api.get(`/users/${user.id}/progress`).catch(() => ({ data: null }))
      ]);

      const activeCourses = coursesRes.data || [];
      const userEnrollments = enrollsRes.data || [];
      const userSubmissions = subsRes.data || [];

      setCourses(activeCourses);
      setEnrollments(userEnrollments);
      setSubmissions(userSubmissions);
      if (progressRes.data) {
        setProgressProfile(progressRes.data);
        setLiveClasses(progressRes.data.liveClasses || []);
      } else {
        setProgressProfile(null);
        setLiveClasses([]);
      }

      // Derive active course IDs of user
      const enrolledCourseIds = userEnrollments.map((e: any) => e.courseId);
      
      // Select first enrolled course for AI tutor widget if none is selected yet
      if (enrolledCourseIds.length > 0) {
        // Set first enrolled course as default active AI course id
        const firstCId = enrolledCourseIds[0];
        setActiveAiCourseId(prev => prev || firstCId);
      } else if (activeCourses.length > 0) {
        // Fallback to any course if not enrolled yet
        setActiveAiCourseId(prev => prev || activeCourses[0].id);
      }

      // Load Recent Forum Posts across enrolled courses
      if (enrolledCourseIds.length > 0) {
        try {
          const forumPromises = enrolledCourseIds.map((cid: string) =>
            api.get(`/courses/${cid}/forum`).catch(() => ({ data: [] }))
          );
          const forumResults = await Promise.all(forumPromises);
          const allForums = forumResults.flatMap((res: any) => res.data || []);
          // Sort by creation date descending
          allForums.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRecentForumPosts(allForums.slice(0, 5));
        } catch (forumErr) {
          console.error("Failed to compile forum listings:", forumErr);
        }
      } else {
        setRecentForumPosts([]);
      }

    } catch (err) {
      console.error("Failed to load Student dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading API on mount & on user change
  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  // Load selected course's chat logs when widget selections change
  useEffect(() => {
    const loadSelectedAiLogs = async () => {
      if (!user || !activeAiCourseId) return;
      try {
        setAiError(null);
        const res = await api.get(`/ai/history/${activeAiCourseId}/${user.id}`);
        setAiChatLogs(res.data || []);
      } catch (err) {
        console.error("AI log load failure:", err);
      }
    };
    loadSelectedAiLogs();
  }, [activeAiCourseId, user?.id]);

  // Handle Quick Enrollment on Catalog shortcut
  const handleQuickEnroll = async (courseId: string) => {
    if (!user) return;
    setEnrollingId(courseId);
    try {
      await api.post("/enrollments", {
        studentId: user.id,
        courseId
      });
      // Fetch latest states from database
      await loadDashboardData();
    } catch (err) {
      console.error("Failed quick enrollment sequence:", err);
    } finally {
      setEnrollingId(null);
    }
  };



  // Handle Direct Live Widget Chat submit
  const handleSentLiveAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !user || !activeAiCourseId || aiWriting) return;

    const queryText = aiQuery;
    setAiQuery("");
    setAiWriting(true);
    setAiError(null);

    // Instant local state update for user visual feedback
    const localUserMsg = {
      id: `widget_usr_${Date.now()}`,
      sender: "user" as const,
      message: queryText,
      timestamp: new Date().toISOString()
    };
    setAiChatLogs(prev => [...prev, localUserMsg]);

    try {
      const selectedCourseObj = courses.find(c => c.id === activeAiCourseId);
      const response = await api.post("/ai/chat", {
        courseId: activeAiCourseId,
        userId: user.id,
        message: queryText,
        courseTitle: selectedCourseObj?.title || "Enrolled Curriculum",
        lessonTitle: "General Subject Query"
      });

      const localAiMsg = {
        id: `widget_ai_${Date.now()}`,
        sender: "ai" as const,
        message: response.data.reply,
        timestamp: new Date().toISOString()
      };
      setAiChatLogs(prev => [...prev, localAiMsg]);
    } catch (err: any) {
      console.error("AI response failure:", err);
      setAiError("Socrates AI is currently generating multiple lesson plans. Please try again.");
    } finally {
      setAiWriting(false);
    }
  };

  const handleAttendanceCheckIn = async (courseId: string) => {
    if (!user) return;
    setCheckInLoading(prev => ({ ...prev, [courseId]: true }));
    try {
      await api.post("/attendance/check-in", {
        studentId: user.id,
        studentName: user.name,
        courseId
      });
      alert("Successfully recorded your attendance check-in for today's live class!");
      await loadDashboardData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Unable to clock in attendance. Please confirm your enrollment.";
      alert(errMsg);
    } finally {
      setCheckInLoading(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // Help prompt starter click action
  const handleTriggerQuickPrompt = (promptText: string) => {
    setAiQuery(promptText);
  };

  // Calculations for general study indicators (Progress Tracker)
  const myCourses = enrollments
    .map(enrol => {
      const matched = courses.find(c => c.id === enrol.courseId);
      return matched ? { ...matched, enrollment: enrol } : null;
    })
    .filter(Boolean) as any[];

  // Not enrolled courses Catalog segment
  const catalogNotEnrolled = courses.filter(
    c => !enrollments.some(e => e.courseId === c.id)
  );

  // Extract student's assignments from my enrolled courses
  const allAssignments = enrolledCourseIdsAndAssignments();
  function enrolledCourseIdsAndAssignments() {
    const enrolledIds = enrollments.map(e => e.courseId);
    // Gather all assignments matching enrolled ids or default
    return courses
      .filter(c => enrolledIds.includes(c.id))
      .flatMap(c => {
        // Let's seek assignments created for this course
        // Note: in secondary scenarios, assignments lists are tied to specific courseId
        // We find structural assignments
        const dbAssignments = [
          {
            id: "a_gemini_p1",
            courseId: "c_ai_gemini",
            title: "Structured Prompt Design and JSON Output Generation",
            description: "Study structured response boundaries.",
            maxPoints: 100,
            dueDate: "2026-06-25T23:59:00Z"
          },
          {
            id: "a_fs_p1",
            courseId: "c_full_stack",
            title: "Secure API Proxies & Environment Configurations",
            description: "Formulate Express server routes hiding API secrets.",
            maxPoints: 100,
            dueDate: "2026-06-30T23:59:00Z"
          }
        ];
        return dbAssignments.filter(a => a.courseId === c.id).map(a => ({
          ...a,
          courseName: c.title
        }));
      });
  }

  // Graded homework elements helper
  const gradedSubmissions = submissions.filter(s => s.grade !== undefined);
  const averageGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((acc, current) => acc + current.grade, 0) / gradedSubmissions.length)
    : null;

  // Average syllabus completion multiplier
  const averageProgress = myCourses.length > 0
    ? Math.round(myCourses.reduce((acc, curr) => acc + (curr.enrollment?.progress || 0), 0) / myCourses.length)
    : 0;

  // Unread alerts sum
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Custom static activity telemetry data for Recharts graph visualization
  const weeklyStudyHoursData = [
    { name: "Mon", "Study Hours": 1.5, "Skills Learned": 2, "AI Chats": 1 },
    { name: "Tue", "Study Hours": 3.2, "Skills Learned": 4, "AI Chats": 6 },
    { name: "Wed", "Study Hours": 0.8, "Skills Learned": 1, "AI Chats": 2 },
    { name: "Thu", "Study Hours": 4.5, "Skills Learned": 7, "AI Chats": 9 },
    { name: "Fri", "Study Hours": 2.0, "Skills Learned": 3, "AI Chats": 4 },
    { name: "Sat", "Study Hours": 5.6, "Skills Learned": 9, "AI Chats": 12 },
    { name: "Sun", "Study Hours": 2.5, "Skills Learned": 5, "AI Chats": 3 }
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-2xs font-mono text-gray-400">Assembling study dashboard metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left pb-10">
      
      {/* Visual Header Banner */}
      <div className="rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-indigo-750 p-6 md:p-8 text-white shadow-lg shadow-blue-100/30 relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/5 blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-wider text-blue-100 border border-white/10 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-200 fill-blue-200" /> Active Scholar Desk Mode
            </div>
            <h2 className="text-2xl font-black tracking-tight" id="student_welcome_name">
              Welcome back, {user?.name || "Avery"}!
            </h2>
            <p className="mt-1 text-xs text-blue-100 max-w-lg font-medium">
              Your comprehensive average coursework completion is showing healthy momentum. Use Socrates AI Assistant below to review upcoming lesson parameters.
            </p>
          </div>
          <div className="flex rounded-2xl bg-white/15 p-4 backdrop-blur-md border border-white/10 gap-6">
            <div className="text-center">
              <span className="block text-[10px] text-blue-200 uppercase font-bold tracking-wider">Class Average Score</span>
              <span className="text-xl font-black mt-0.5 block">{averageGrade ? `${averageGrade}%` : "Awaiting Grs"}</span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <span className="block text-[10px] text-blue-200 uppercase font-bold tracking-wider">Avg Syllabus Progress</span>
              <span className="text-xl font-black mt-0.5 block">{averageProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widgets Grid (Progress Tracker Metrics) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Enrolled Courses</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">{myCourses.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Lessons Done</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">
              {myCourses.reduce((sum, c) => sum + (c.enrollment?.completedLessons?.length || 0), 0)} Finished
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Total Credit Score</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">
              {gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0)} pts
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Overall Class Standing</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">Top 12%</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Dual Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* LEFT COLUMN: Main dashboard trackers (2/3 width) */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* LIVE ACADEMIC TIMELINE / SCHEDULER BOARD */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pt-1.5 animate-pulse">
              <Tv className="h-4 w-4 text-indigo-600 font-bold animate-spin" style={{ animationDuration: "4s" }} /> Live Broadcast Roster (WebRTC / Google Meet)
            </h3>

            <Card className="bg-white border border-indigo-150 p-5 rounded-3xl space-y-4 text-left shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-2xs font-extrabold text-gray-800 flex items-center gap-1">
                    Academic Streams Scheduler 
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md font-mono">
                      SYNCED
                    </span>
                  </h4>
                  <p className="text-4xs text-gray-400 font-mono font-medium leading-tight">View live classes, connect to internal WebRTC sandbox feeds, or redirect to official Google Meet scopes.</p>
                </div>

                <div className="flex gap-2">
                  <span className="text-4xs font-mono font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Camera Stream Valid
                  </span>
                </div>
              </div>

              {liveClasses.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 select-none">
                  <Calendar className="h-10 w-10 text-gray-300 stroke-1" />
                  <p className="text-xs text-gray-420 font-medium font-sans animate-fade-in">No live interactive classes are scheduled for your coursework yet.</p>
                  <p className="text-4xs text-gray-400 max-w-xs font-mono leading-relaxed">System instructors will broadcast dates here which instantly updates your feed timeline.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {liveClasses.map((lc) => {
                    const isLive = lc.status === "live";
                    const isEnded = lc.status === "ended";

                    return (
                      <div key={lc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0 transition-all hover:bg-indigo-50/20 -mx-2 px-2 rounded-xl">
                        <div className="space-y-1 text-left min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-4xs font-mono font-black text-indigo-500 uppercase leading-none tracking-wider block">
                              {lc.courseName}
                            </span>
                            {isLive && (
                              <span className="animate-pulse bg-rose-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md leading-none flex items-center gap-1 shrink-0 shadow-3xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> SESSION ONLINE NOW
                              </span>
                            )}
                            {isEnded && (
                              <span className="bg-gray-150 text-gray-500 font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md leading-none shrink-0">
                                Concluded
                              </span>
                            )}
                            {!isLive && !isEnded && (
                              <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md leading-none shrink-0">
                                Upcoming Scheduled
                              </span>
                            )}
                          </div>

                          <h5 className="text-[12.5px] font-black text-gray-800 leading-snug truncate">
                            {lc.title}
                          </h5>

                          <div className="flex flex-wrap items-center gap-3 text-gray-420 font-mono text-[10px]">
                            <span className="flex items-center gap-1 font-semibold text-gray-600">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              {lc.date}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-gray-600">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              {lc.time} ({lc.duration} mins)
                            </span>
                          </div>

                          {lc.description && (
                            <p className="text-4xs text-gray-450 font-sans italic truncate max-w-lg">
                              Agenda: &ldquo;{lc.description}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLive ? (
                            lc.meetingType === "google-meet" ? (
                              <a
                                href={lc.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={async () => {
                                  try {
                                    await api.post(`/live-classes/${lc.id}/join`);
                                    loadDashboardData();
                                  } catch (e) {}
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer decoration-transparent"
                              >
                                Join Google Meet <ChevronRight className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveLiveRoom(lc)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer"
                              >
                                Join WebRTC Room <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )
                          ) : isEnded ? (
                            <div className="text-right">
                              <span className="text-[9px] text-emerald-600 font-black uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/55 flex items-center gap-1 select-none leading-none font-mono">
                                <Check className="h-3.5 w-3.5 text-emerald-500 font-bold" /> Present recorded
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-150 font-bold text-[10.5px] uppercase tracking-wider rounded-xl select-none"
                            >
                              Room Locked
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* PROGRESS TRACKING MODULE: Attendance, Completed Lessons, Assignment Scores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 focus-target-progress">
                <TrendingUp className="h-4 w-4 text-emerald-500 font-bold" /> Course Progress & Attendance Center
              </h3>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-150">
                <button
                  onClick={() => setActiveProgressTab("summary")}
                  className={`px-2.5 py-1 text-3xs font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                    activeProgressTab === "summary" ? "bg-white text-gray-800 shadow-3xs" : "text-gray-400 hover:text-gray-650"
                  }`}
                >
                  Analytics & Charts
                </button>
                <button
                  onClick={() => setActiveProgressTab("attendance")}
                  className={`px-2.5 py-1 text-3xs font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                    activeProgressTab === "attendance" ? "bg-white text-gray-800 shadow-3xs" : "text-gray-400 hover:text-gray-650"
                  }`}
                >
                  Live Check-In
                </button>
                <button
                  onClick={() => setActiveProgressTab("assignments")}
                  className={`px-2.5 py-1 text-3xs font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                    activeProgressTab === "assignments" ? "bg-white text-gray-800 shadow-3xs" : "text-gray-400 hover:text-gray-650"
                  }`}
                >
                  Assignment Grades
                </button>
              </div>
            </div>

            <Card className="bg-white border border-gray-150 p-5 space-y-4 shadow-sm select-none">
              {activeProgressTab === "summary" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Avg Course Syllabus</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-blue-600">{progressProfile?.averageSyllabusProgress || 0}%</span>
                        <span className="text-[10px] text-gray-500 font-sans font-medium">completed</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-150 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressProfile?.averageSyllabusProgress || 0}%` }} />
                      </div>
                    </div>
                    
                    <div className="text-left space-y-1 border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-4 pt-3 sm:pt-0">
                      <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Expected Attendance</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-emerald-600">{progressProfile?.overallAttendanceRate || 0}%</span>
                        <span className="text-[10px] text-gray-500 font-sans font-medium">rate score</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-150 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-300" style={{ width: `${progressProfile?.overallAttendanceRate || 0}%` }} />
                      </div>
                    </div>

                    <div className="text-left space-y-1 border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-4 pt-3 sm:pt-0">
                      <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Assignments Grade Average</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-indigo-600">
                          {progressProfile?.averageAssignmentScore !== null ? `${progressProfile?.averageAssignmentScore}%` : "No Submissions"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-sans font-medium">avg marks</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-150 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progressProfile?.averageAssignmentScore || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Syllabus Completion vs Attendance Chart */}
                  <div className="space-y-1 text-left">
                    <h4 className="text-2xs font-extrabold text-gray-800">Class Performance Benchmark Map</h4>
                    <p className="text-[10px] text-gray-400 font-mono">Comparing syllabus completion, attendance rates, and assignment feedback by active course</p>
                  </div>

                  {myCourses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-150 rounded-xl bg-slate-50/20">
                      Enroll in course-wise studies to begin generating progress metrics.
                    </div>
                  ) : (
                    <div className="h-56 w-full text-xs" style={{ minWidth: "100%" }}>
                      <ResponsiveContainer width="99%" height="100%">
                        <BarChart
                          data={progressProfile?.courseWiseStats || myCourses.map((c: any) => ({
                            courseName: c.title,
                            syllabusProgress: c.enrollment?.progress || 0,
                            attendanceRate: 80,
                            averageScore: 90
                          }))}
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="courseName" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "11px", fontWeight: "bold" }}
                          />
                          <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                          <Bar dataKey="syllabusProgress" name="Syllabus Done (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="attendanceRate" name="Attendance Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="averageScore" name="Assignments Average (%)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {activeProgressTab === "attendance" && (
                <div className="space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="text-2xs font-bold text-gray-800">Daily Presence Registration</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Clock-in presentation for live digital sessions on {new Date().toLocaleDateString()}</p>
                    </div>
                    <span className="px-2.5 py-1 text-4xs font-mono font-black uppercase rounded bg-emerald-50 text-emerald-700">
                      Expected Attendance Rate: {progressProfile?.overallAttendanceRate || 80}%
                    </span>
                  </div>

                  {myCourses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-450 italic">
                      No active enrollments found. Access the Course catalog below to enroll.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {progressProfile?.courseWiseStats?.map((courseStat: any) => {
                        const loadingClock = checkInLoading[courseStat.courseId];
                        return (
                          <div key={courseStat.courseId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-100 p-3.5 rounded-xl bg-gray-50/20 hover:bg-gray-150/40 transition-all gap-4">
                            <div className="space-y-1 text-left">
                              <h5 className="text-xs font-bold text-gray-800 leading-snug">{courseStat.courseName}</h5>
                              <div className="flex flex-wrap gap-2 items-center text-4xs text-gray-400 font-mono">
                                <span>Attendance: <strong className="text-emerald-600 font-extrabold">{courseStat.attendanceRate}%</strong> ({courseStat.presentCount} of {courseStat.totalExpectedSessions} expected sessions logged)</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              {courseStat.checkedInToday ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-150 text-emerald-700 text-3xs font-extrabold rounded-lg">
                                  <Check className="h-3 w-3" /> Checked In Today
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAttendanceCheckIn(courseStat.courseId)}
                                  disabled={loadingClock}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-3xs rounded-xl shadow-3xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1"
                                >
                                  {loadingClock ? "Clocking..." : "+ Register Attendance Today"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Attendance Log Historical visual list */}
                  <div className="space-y-2 border-t border-gray-100 pt-3 text-left">
                    <h5 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider text-left">Recent Attendance Logs Historical Index:</h5>
                    {(progressProfile?.allAttendanceRecords || []).length === 0 ? (
                      <p className="text-4xs text-gray-400 italic text-left">No recent logs recorded. Please register your attendance above to trace timeline indices.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pt-1 justify-start">
                        {(progressProfile?.allAttendanceRecords || []).slice(0, 15).map((log: any) => (
                          <div
                            key={log.id}
                            className={`px-2 py-1 rounded-lg border text-4xs font-mono font-bold flex items-center gap-1 ${
                              log.status === "present"
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : log.status === "late"
                                ? "bg-amber-50 border-amber-100 text-amber-700"
                                : "bg-rose-50 border-rose-100 text-rose-700"
                            }`}
                          >
                            <Calendar className="h-2.5 w-2.5 text-gray-400" />
                            <span>{log.date} ({log.status.toUpperCase()})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeProgressTab === "assignments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="text-left">
                      <h4 className="text-2xs font-bold text-gray-800">Homework &amp; Assignments Grade book</h4>
                      <p className="text-[10px] text-gray-400 font-mono font-medium">Verify certified task scores, points indices and feedback reports</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xs font-mono text-gray-400 leading-none">Mean Grade:</span>
                      <strong className="block text-xs font-black text-indigo-600">{progressProfile?.averageAssignmentScore !== null ? `${progressProfile?.averageAssignmentScore}%` : "No Submissions"}</strong>
                    </div>
                  </div>

                  {(progressProfile?.allSubmissions || submissions).length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 italic">
                      No assignment submittals or grade reports reported in study files.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {(progressProfile?.allSubmissions || submissions).map((submission: any) => {
                        const matchedCourse = courses.find((c: any) => c.id === submission.courseId);
                        
                        return (
                          <div key={submission.id} className="p-3 bg-slate-50 border border-gray-105 rounded-xl space-y-1.5 text-left transition-all hover:bg-white hover:border-gray-200">
                            <div className="flex items-center justify-between text-5xs text-gray-400 font-mono font-bold">
                              <span>Course: {matchedCourse ? matchedCourse.title : "Introduction study"}</span>
                              <span>Sub: {new Date(submission.submittedAt).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h5 className="text-[11px] font-extrabold text-gray-800 leading-tight">Homework Submittal ID Task</h5>
                                <p className="text-[10px] text-gray-500 font-sans mt-0.5 whitespace-pre-wrap italic line-clamp-2">&ldquo;{submission.submittedContent}&rdquo;</p>
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] font-black block text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg leading-none">
                                  {submission.grade !== undefined ? `${submission.grade} / 100` : "PENDING GRADE"}
                                </span>
                              </div>
                            </div>

                            {submission.feedback && (
                              <div className="pt-2 mt-1 border-t border-dashed border-gray-250">
                                <p className="text-4xs text-gray-500 font-sans flex items-start gap-1">
                                  <strong className="text-gray-800">Teacher Feedback:</strong>
                                  <span className="font-serif italic text-gray-650">&ldquo;{submission.feedback}&rdquo;</span>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* SECTION 1: My Enrolled Courses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-blue-500" /> My Active Coursework
              </h3>
              <span className="text-4xs text-gray-400 font-mono font-bold">
                {myCourses.length} active syllabus card(s)
              </span>
            </div>

            {myCourses.length === 0 ? (
              <Card className="py-12 border border-dashed border-gray-200 text-center text-sm text-gray-500">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="font-bold text-gray-700">Not enrolled in any academic courses yet.</p>
                <p className="text-2xs text-gray-400 mt-1 max-w-sm mx-auto">
                  To get started, browse the available catalog below and enroll instantly, or visit the global Explore panel!
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {myCourses.map((course: any) => (
                  <Card key={course.id} className="group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border border-gray-100 hover:shadow-xs transition-all p-4 bg-white hover:border-blue-105">
                    
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={course.coverImage}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-xl object-cover border border-gray-100 bg-gray-50 flex-shrink-0"
                      />
                      <div className="space-y-1">
                        <span className="inline-block text-[9px] font-mono font-black px-2 py-0.5 uppercase bg-blue-50 text-blue-700 rounded-md">
                          {course.category}
                        </span>
                        <h4 className="text-xs font-bold text-gray-850 leading-snug group-hover:text-blue-600 transition-colors">
                          {course.title}
                        </h4>
                        <div className="flex items-center gap-2 text-4xs text-gray-400 font-mono">
                          <span>Instructor: <strong>{course.instructorName}</strong></span>
                          <span>•</span>
                          <span>{course.lessonsCount} lessons</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress slider bar info */}
                    <div className="w-full sm:w-40 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-4xs font-mono">
                        <span className="text-gray-450 uppercase">Completion Rate:</span>
                        <span className="font-black text-blue-600">{course.enrollment?.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${course.enrollment?.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 text-right font-mono">
                        {course.enrollment?.completedLessons?.length || 0} of {course.lessonsCount} chapters done
                      </p>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => onResumeCourse(course.id, "syllabus")}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-gray-50 px-3.5 py-2.5 text-3xs font-bold text-gray-700 transition-all hover:bg-blue-650 hover:text-white group-hover:shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Resume</span>
                      <Play className="h-3 w-3 fill-current" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* CATALOG: Explore and Enroll shortcut */}
          {catalogNotEnrolled.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pt-2">
                <Lightbulb className="h-4 w-4 text-emerald-500 animate-pulse" /> Discover & Quick Enroll
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalogNotEnrolled.map((course: any) => (
                  <div
                    key={course.id}
                    className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 justify-between hover:shadow-xs hover:border-gray-200 transition-all text-left space-y-3"
                  >
                    <div className="space-y-2">
                      <img
                        src={course.coverImage}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="h-28 w-full rounded-xl object-cover border border-gray-50"
                      />
                      <span className="inline-block text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                        {course.category}
                      </span>
                      <h4 className="text-xs font-bold text-gray-800 leading-snug line-clamp-1">
                        {course.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-4xs text-gray-450 font-mono">
                        Difficulty: <strong className="text-gray-650 uppercase">{course.difficulty}</strong>
                      </span>
                      <button
                        onClick={() => handleQuickEnroll(course.id)}
                        disabled={enrollingId === course.id}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-3xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:bg-emerald-450 disabled:cursor-not-allowed"
                      >
                        {enrollingId === course.id ? "Enrolling..." : "Enroll Free"}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Homework & Assignments Status Tracker */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pt-2">
              <Calendar className="h-4 w-4 text-purple-500" /> Study Homework Assignments
            </h3>

            {myCourses.length === 0 ? (
              <Card className="py-8 text-center text-xs text-gray-400 border border-gray-100">
                Enroll in a workspace curriculum to unlock homework tasks and instructor review parameters.
              </Card>
            ) : allAssignments.length === 0 ? (
              <Card className="py-8 text-center text-xs text-gray-400 border border-gray-100">
                No assignments posted for your enrolled subject scopes.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allAssignments.map((assign: any) => {
                  // Determine submission state
                  const userSub = submissions.find(s => s.assignmentId === assign.id);
                  const isGraded = userSub && userSub.grade !== undefined;
                  const isSubmitted = !!userSub;

                  // Compute remaining days
                  const dueTime = new Date(assign.dueDate).getTime();
                  const nowTime = new Date().getTime();
                  const isOverdue = nowTime > dueTime && !isSubmitted;
                  const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));

                  return (
                    <Card key={assign.id} className="flex flex-col justify-between border border-gray-100/80 p-4 space-y-4 bg-white relative overflow-hidden">
                      
                      {/* Decorative status accent border */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        isGraded ? "bg-emerald-500" : isSubmitted ? "bg-amber-500" : isOverdue ? "bg-rose-500" : "bg-blue-400"
                      }`} />

                      <div className="space-y-2 text-left pl-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="block text-[8px] font-mono font-bold text-gray-400 uppercase truncate max-w-40" title={assign.courseName}>
                            {assign.courseName}
                          </span>
                          
                          {isGraded ? (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono font-black uppercase bg-emerald-50 text-emerald-700 rounded-md">
                              Evaluated
                            </span>
                          ) : isSubmitted ? (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono font-black uppercase bg-amber-50 text-amber-700 rounded-md">
                              Reviewing
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono font-black uppercase bg-rose-50 text-rose-700 rounded-md">
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono font-black uppercase bg-blue-50 text-blue-700 rounded-md">
                              Assigned
                            </span>
                          )}
                        </div>

                        <h4 className="text-2xs font-bold text-gray-800 leading-snug line-clamp-1">
                          {assign.title}
                        </h4>
                        
                        <p className="text-[10px] text-gray-450 leading-relaxed line-clamp-2">
                          {assign.description}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-gray-50/70 pl-1 flex items-center justify-between text-left gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 block font-mono">
                            Max: {assign.maxPoints} pts
                          </span>
                          
                          {isSubmitted ? (
                            <span className="text-[9px] text-emerald-600 block font-bold font-sans">
                              {isGraded ? `Score Grade: ${userSub.grade}/100` : "Awaiting evaluation score"}
                            </span>
                          ) : (
                            <span className={`text-[9px] block font-semibold ${isOverdue ? "text-rose-500" : "text-gray-450"}`}>
                              {isOverdue ? "Overdue elapsed" : `Due in ${diffDays} day(s)`}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onResumeCourse(assign.courseId, "assignments")}
                          className={`rounded-lg py-1.5 px-3 text-3xs font-bold font-sans transition-all active:scale-95 cursor-pointer ${
                            isGraded 
                              ? "bg-slate-50 hover:bg-slate-100 text-gray-600"
                              : isSubmitted 
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-700" 
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          }`}
                        >
                          {isGraded ? "Review feedback" : isSubmitted ? "View answer" : "Solve Homework"}
                        </button>
                      </div>

                      {/* Display Teacher Homework comment feedback right inline if evaluated */}
                      {isGraded && userSub.feedback && (
                        <div className="mt-2 text-left bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-2.5 pl-3">
                          <p className="text-[8px] font-mono font-black uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> Dr. Vance evaluation
                          </p>
                          <p className="text-[10px] italic text-gray-700 leading-snug">
                            &ldquo;{userSub.feedback}&rdquo;
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: Visual Study Performance Progress Metrics (Recharts Area Chart) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pt-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Student Progress Timelines
            </h3>
            
            <Card className="p-4 bg-white border border-gray-100/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3">
                <div>
                  <h4 className="text-2xs font-bold text-gray-800">Weekly Performance Log</h4>
                  <p className="text-[10px] font-mono text-gray-400">Class study times, lesson finishes, and tutor interactions over week cycles</p>
                </div>
                <div className="flex gap-4 text-4xs font-mono font-bold text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Study Hrs
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" /> AI Queries
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-teal-400" /> Chapters Done
                  </span>
                </div>
              </div>

              {/* Responsive Container Area Chart */}
              <div className="h-60 w-full text-xs" style={{ minWidth: "100%" }}>
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={weeklyStudyHoursData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStudyHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f3f4f6", fontSize: "11px", fontWeight: "bold", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                    />
                    <Area type="monotone" dataKey="Study Hours" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStudyHours)" />
                    <Area type="monotone" dataKey="AI Chats" stroke="#818cf8" strokeWidth={1.5} fillOpacity={1} fill="url(#colorChats)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* SECTION 4: Recent Forum Discussions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pt-2">
              <MessageSquare className="h-4 w-4 text-teal-500" /> Recent Peer Discussions
            </h3>

            {myCourses.length === 0 ? (
              <Card className="py-8 text-center text-xs text-gray-400 border border-gray-100">
                Enroll inside study modules first to access joint students and teacher open boards.
              </Card>
            ) : recentForumPosts.length === 0 ? (
              <Card className="py-8 text-center text-xs text-gray-400 border border-gray-100">
                No discussions reported inside classes. Initiate a new forum query inside Syllabus pages!
              </Card>
            ) : (
              <div className="space-y-2.5">
                {recentForumPosts.map((post: any) => {
                  const correlated = courses.find(c => c.id === post.courseId);
                  return (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-teal-500/40 hover:shadow-2xs text-left"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 min-w-16 truncate text-center">
                            {correlated?.title || "Class Board"}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            By {post.authorName} ({post.authorRole})
                          </span>
                        </div>
                        <h4 className="text-2xs font-bold text-gray-800 leading-snug truncate">
                          {post.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 leading-normal line-clamp-1 max-w-xl">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{post.repliesCount || 0} answer(s)</span>
                        </div>
                        <button
                          onClick={() => onResumeCourse(post.courseId, "forum")}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-700 px-3.5 py-2 text-3xs font-bold text-gray-650 transition-all cursor-pointer border border-gray-100"
                        >
                          Join conversation
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive AI Tutor and Notifications (1/3 width) */}
        <div className="space-y-6">

          {/* PANEL 1: Embedded Socrates AI Tutor Module */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-500 animate-spin" style={{ animationDuration: "12s" }} /> Socrates AI Assistant
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <Card className="p-4 bg-linear-to-b from-slate-950 to-slate-900 text-white border-none shadow-xl shadow-slate-900/10 space-y-4 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/5 blur-2xl -mr-10 -mt-10 pointer-events-none" />

              {/* Title & Curriculum selector */}
              <div className="space-y-1 text-left relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-md">
                    Prompt Sandbox
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    Model: gemini-3.5-flash
                  </span>
                </div>
                <h4 className="text-xs font-black tracking-tight mt-1">Chat Instantly with Socrates AI</h4>
                
                {/* Select Curriculum dropdown */}
                <div className="pt-2">
                  <label className="block text-[8px] font-bold uppercase text-slate-400 mb-1 tracking-wider">
                    Select Subject Scope
                  </label>
                  <select
                    value={activeAiCourseId}
                    onChange={(e) => setActiveAiCourseId(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 font-sans px-3.5 py-2 text-xs text-white uppercase font-bold outline-hidden cursor-pointer"
                  >
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.category}: {c.title.split(":")[0]}
                      </option>
                    ))}
                    {courses.length === 0 && (
                      <option value="">No curriculum scopes available</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Chat Log viewer */}
              <div className="rounded-2xl bg-slate-925 p-3.5 h-64 overflow-y-auto space-y-3.5 border border-slate-800/60 flex flex-col custom-scrollbar scroll-smooth">
                {aiChatLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-450 space-y-2 mt-4">
                    <Lightbulb className="h-6 w-6 text-slate-600 animate-bounce" />
                    <p className="text-2xs font-bold leading-normal text-slate-300">Awaiting your question, Scholar Avery.</p>
                    <p className="text-[10px] text-slate-500 max-w-[16rem]">
                      Choose any scope and submit a query directly, or pick from our suggested quick prompt templates below!
                    </p>
                  </div>
                ) : (
                  aiChatLogs.map((log: any, idx: number) => {
                    const isAi = log.sender === "ai";
                    return (
                      <div
                        key={log.id || idx}
                        className={`flex flex-col text-left space-y-1 self-${isAi ? "start" : "end"} w-full max-w-[90%]`}
                      >
                        <span className={`text-[8px] font-mono font-black uppercase tracking-wider block ${isAi ? "text-blue-400" : "text-emerald-400"}`}>
                          {isAi ? "✦ Socrates AI" : "Me"}
                        </span>
                        <div className={`rounded-2xl p-3 text-xs leading-relaxed ${
                          isAi ? "bg-slate-850 border border-slate-800 text-slate-100" : "bg-blue-600 text-white ml-auto"
                        }`}>
                          <p className="whitespace-pre-wrap select-text selection:bg-blue-300 pointer-events-auto leading-normal">{log.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {aiWriting && (
                  <div className="flex flex-col text-left space-y-1 w-[80%] self-start animate-pulse">
                    <span className="text-[8px] font-mono font-black uppercase text-blue-400">✦ Socrates AI</span>
                    <div className="rounded-2xl p-3 bg-slate-850 border border-slate-800">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span className="ml-1 text-[9px]">Socrates is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {aiError && (
                  <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-2.5 text-rose-350 text-[10px] text-left">
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1 align-text-bottom" /> {aiError}
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSentLiveAiQuery} className="flex gap-2 relative z-10 pt-1">
                <input
                  type="text"
                  required
                  placeholder="Ask Socrates a syllabus question..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  disabled={aiWriting || courses.length === 0}
                  className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-xs text-white placeholder-slate-450 outline-hidden transition-all focus:border-blue-500 focus:bg-slate-850 disabled:bg-slate-900 disabled:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={aiWriting || !aiQuery.trim() || courses.length === 0}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-11 h-11 flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed shadow-md shadow-blue-500/10"
                  title="Ask Socrates"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>

              {/* Quick Starter prompt chips */}
              <div className="text-left space-y-1 relative z-10 pt-1">
                <span className="text-[8px] font-mono font-black uppercase text-slate-400 tracking-wider">
                  Suggested study prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerQuickPrompt("Summarize attention self-attention mechanics as a human analogy.")}
                    className="rounded-lg bg-slate-800 hover:bg-slate-755 text-slate-300 border border-slate-750 p-2 text-[10px] font-medium leading-tight cursor-pointer active:scale-95 hover:text-white"
                  >
                    Explain Self-Attention
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerQuickPrompt("Provide a fast secure Express middleware structure that verifies JWT and outputs error status.")}
                    className="rounded-lg bg-slate-800 hover:bg-slate-755 text-slate-300 border border-slate-750 p-2 text-[10px] font-medium leading-tight cursor-pointer active:scale-95 hover:text-white"
                  >
                    Show Secure Express Route
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerQuickPrompt("Draft a system instruction block forcing 5 CS terms inside raw JSON outputs.")}
                    className="rounded-lg bg-slate-800 hover:bg-slate-755 text-slate-300 border border-slate-750 p-2 text-[10px] font-medium leading-tight cursor-pointer active:scale-95 hover:text-white"
                  >
                    Create JSON Prompts
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* PANEL 2: Alerts and Notifications Hub */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-rose-500 animate-bounce" style={{ animationDuration: "3s" }} /> Alerts & Notifications
              </h3>
              
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-4xs font-mono font-bold uppercase text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Clear all ({unreadNotificationsCount})
                </button>
              )}
            </div>

            <Card className="p-4 bg-white border border-gray-100/80 space-y-4 rounded-3xl">
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center space-y-2 text-gray-400 bg-gray-50/20 rounded-2xl border border-dashed border-gray-100 p-4">
                    <Info className="mx-auto h-5 w-5 text-gray-300" />
                    <p className="text-2xs font-bold text-gray-700">All notifications cleared!</p>
                    <p className="text-[10px] text-gray-405 leading-normal max-w-xs mx-auto">
                      Any alert logs regardinggraded homeworks, posted curriculum chapters, or class forum answers appear instantly right here.
                    </p>
                  </div>
                ) : (
                  [...notifications]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.read && markAsRead(notif.id)}
                        className={`p-3 rounded-2xl border text-left flex gap-3 cursor-pointer transition-all ${
                          notif.read
                            ? "bg-white border-gray-50 hover:bg-gray-50/10"
                            : "bg-blue-50/20 border-blue-1001 hover:bg-blue-50/35"
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          <span className={`flex h-2.5 w-2.5 rounded-full ${notif.read ? "bg-gray-300" : "bg-blue-600 animate-ping absolute"}`} />
                          {!notif.read && <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 relative" />}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className={`text-2xs font-bold leading-none ${notif.read ? "text-gray-650 font-semibold" : "text-gray-900 font-extrabold"}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] leading-relaxed text-gray-500">
                            {notif.message}
                          </p>
                          <span className="block text-[8px] text-gray-400 font-mono pt-1">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </Card>
          </div>

        </div>

      </div>

      {/* FULL SCREEN INTERACTIVE CLASSROOM ROOM EMBED */}
      {activeLiveRoom && (
        <LiveClassroomRoom
          liveClass={activeLiveRoom}
          user={user}
          onClose={() => {
            setActiveLiveRoom(null);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};
