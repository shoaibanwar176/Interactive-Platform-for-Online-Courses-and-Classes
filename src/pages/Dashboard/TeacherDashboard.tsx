import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader } from "../../components/Card";
import { 
  Plus, 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  Layers, 
  Calendar, 
  Clock,
  Check, 
  Edit3, 
  AlertCircle,
  FileText,
  MessageSquare,
  Trash2,
  TrendingUp,
  Award,
  BarChart,
  PieChart as PieIcon,
  Search,
  Book,
  Send,
  ChevronRight,
  Filter,
  User,
  Activity,
  ThumbsUp,
  CornerDownRight,
  Sparkles,
  Paperclip,
  Tv
} from "lucide-react";
import api from "../../services/api";
import { LiveClassroomRoom } from "../../components/LiveClassroomRoom";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Tab System
  const [activeTab, setActiveTab] = useState<"courses" | "assignments" | "grading" | "analytics" | "forum" | "live">("courses");

  // Core Datasets
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attendance Management Core States
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceCourseId, setAttendanceCourseId] = useState("");
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, "present" | "absent" | "late">>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Forms Management States
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ 
    title: "", 
    description: "", 
    category: "", 
    difficulty: "Beginner" as 'Beginner'|'Intermediate'|'Advanced', 
    coverImage: "" 
  });

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseForm, setEditCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "Beginner" as 'Beginner'|'Intermediate'|'Advanced',
    coverImage: ""
  });
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState({ name: "", type: "PDF Document", url: "" });
  const [uploadingState, setUploadingState] = useState(false);
  const [uploadingAssignFile, setUploadingAssignFile] = useState(false);

  const [activeCourseId, setActiveCourseId] = useState<string>("");
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", durationMin: 30, content: "" });

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [assignForm, setAssignForm] = useState<{ courseId: string; title: string; description: string; maxPoints: number; dueDate: string; files: { name: string; url: string }[] }>({ courseId: "", title: "", description: "", maxPoints: 100, dueDate: "", files: [] });

  // Grading desk controls
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(90);
  const [feedbackText, setFeedbackText] = useState("");

  // Forums & Discussions Management
  const [allForums, setAllForums] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostComments, setSelectedPostComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [forumSearch, setForumSearch] = useState("");
  const [forumCourseFilter, setForumCourseFilter] = useState("all");

  // Live class states
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [schedulingForm, setSchedulingForm] = useState({
    courseId: "",
    title: "",
    description: "",
    date: "",
    time: "",
    duration: 60,
    meetingType: "webrtc" // "webrtc" or "google-meet"
  });
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch dynamic aggregated insights dataset for teachers
      const res = await api.get("/api/teachers/analytics");
      const { 
        courses: dbCourses, 
        submissions: dbSubmissions, 
        enrollments: dbEnrollments, 
        students: dbStudents, 
        forums: dbForums, 
        attendance: dbAttendance,
        liveClasses: dbLiveClasses 
      } = res.data;

      // Filter courses matching instructor or let admin view all
      const instructorCourses = dbCourses.filter((c: any) => c.instructorId === user?.id || user?.role === "admin");
      setCourses(instructorCourses);

      // Map corresponding arrays
      setEnrollments(dbEnrollments || []);
      setStudents(dbStudents || []);
      setSubmissions(dbSubmissions || []);
      setAllForums(dbForums || []);
      setAttendanceRecords(dbAttendance || []);
      setLiveClasses(dbLiveClasses || []);

      // Fetch assignments across instructor courses
      const assns = await Promise.all(
        instructorCourses.map((c: any) => api.get(`/courses/${c.id}/assignments`).catch(() => ({ data: [] })))
      );
      setAssignments(assns.flatMap(r => r.data || []));

      // Handle default active course indicators
      if (instructorCourses.length > 0) {
        setActiveCourseId(instructorCourses[0].id);
        setAssignForm(prev => ({ ...prev, courseId: instructorCourses[0].id }));
        setAttendanceCourseId(prev => prev || instructorCourses[0].id);
        setSchedulingForm(prev => prev.courseId ? prev : { ...prev, courseId: instructorCourses[0].id });
      }
    } catch (err) {
      console.error("Failed to fetch teacher aggregated insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Synchronize attendance sheet checklist when course selection changes
  useEffect(() => {
    if (!attendanceCourseId) return;
    const enrolledStudents = enrollments.filter(e => e.courseId === attendanceCourseId);
    const initialSheet: Record<string, "present" | "absent" | "late"> = {};
    enrolledStudents.forEach(e => {
      initialSheet[e.studentId] = "present";
    });
    setAttendanceSheet(initialSheet);
  }, [attendanceCourseId, enrollments]);

  // Live stream class scheduling actions
  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingForm.courseId || !schedulingForm.title || !schedulingForm.date || !schedulingForm.time) {
      alert("Please fill out all mandatory schedule parameters of the classroom.");
      return;
    }

    setSchedulingLoading(true);
    try {
      await api.post("/live-classes", schedulingForm);
      alert("🎉 Successfully scheduled your live class and broadcasted alerts to students!");
      setSchedulingForm({
        courseId: courses[0]?.id || "",
        title: "",
        description: "",
        date: "",
        time: "",
        duration: 60,
        meetingType: "webrtc"
      });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to schedule live class.");
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleUpdateClassStatus = async (lcId: string, status: "scheduled" | "live" | "ended") => {
    try {
      await api.post(`/live-classes/${lcId}/status`, { status });
      alert(`🎉 Classroom streaming session shifted status to ${status.toUpperCase()}!`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to transition session state.");
    }
  };

  const handleSubmitBulkAttendance = async () => {
    if (!attendanceCourseId) {
      alert("Please select a target course first.");
      return;
    }
    const studentIds = Object.keys(attendanceSheet);
    if (studentIds.length === 0) {
      alert("No student checklist has been configured yet.");
      return;
    }

    const records = studentIds.map(sid => ({
      studentId: sid,
      status: attendanceSheet[sid]
    }));

    setSavingAttendance(true);
    try {
      await api.post(`/courses/${attendanceCourseId}/attendance/bulk`, {
        date: attendanceDate,
        records
      });
      alert("Successfully recorded the bulk class session attendance! Student directories updated.");
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Failed to record bulk session attendance registers.";
      alert(errMsg);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Handle Forum comment load
  useEffect(() => {
    const fetchCommentsForThread = async () => {
      if (!selectedPostId) {
        setSelectedPostComments([]);
        return;
      }
      try {
        const commentsResponse = await api.get(`/forum/${selectedPostId}/comments`);
        setSelectedPostComments(commentsResponse.data || []);
      } catch (err) {
        console.error("Failed to load replies for discussion thread:", err);
      }
    };
    fetchCommentsForThread();
  }, [selectedPostId]);

  // Handle addition posts
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/courses", {
        ...courseForm,
        instructorId: user?.id,
        instructorName: user?.name,
        coverImage: courseForm.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200"
      });
      setCourses(prev => [...prev, response.data]);
      setShowAddCourse(false);
      setCourseForm({ title: "", description: "", category: "", difficulty: "Beginner", coverImage: "" });
      if (!activeCourseId) {
        setActiveCourseId(response.data.id);
      }
      await loadData();
    } catch (err) {
      console.error("Course insertion broken:", err);
    }
  };

  const handleEditCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourseId) return;
    try {
      const response = await api.put(`/courses/${editingCourseId}`, {
        ...editCourseForm
      });
      setCourses(prev => prev.map(c => c.id === editingCourseId ? { ...c, ...response.data } : c));
      setEditingCourseId(null);
      await loadData();
    } catch (err) {
      console.error("Course modification broken:", err);
    }
  };

  const handleDeleteCourseSubmit = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to delete this course and all its curriculum lessons? All history will be erased.")) return;
    try {
      await api.delete(`/courses/${courseId}`);
      setCourses(prev => prev.filter(c => c.id !== courseId));
      if (activeCourseId === courseId) {
        setActiveCourseId("");
      }
      await loadData();
    } catch (err) {
      console.error("Course removal failed:", err);
    }
  };

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseId) return;
    try {
      const targetCourse = courses.find(c => c.id === activeCourseId);
      if (!targetCourse) return;
      const currentMaterials = targetCourse.materials || [];
      const newMaterial = {
        id: `m_${Date.now()}`,
        name: materialForm.name,
        type: materialForm.type,
        url: materialForm.url || "https://example.com/materials/curriculum_document.pdf",
        uploadedAt: new Date().toISOString()
      };
      
      const response = await api.put(`/courses/${activeCourseId}`, {
        materials: [...currentMaterials, newMaterial]
      });

      setCourses(prev => prev.map(c => c.id === activeCourseId ? { ...c, ...response.data } : c));
      setShowAddMaterial(false);
      setMaterialForm({ name: "", type: "PDF Document", url: "" });
      await loadData();
    } catch (err) {
      console.error("Syllabus materials attachment broken:", err);
    }
  };

  const handleDeleteMaterialSubmit = async (materialId: string) => {
    if (!activeCourseId) return;
    if (!window.confirm("Are you sure you want to remove this learning document?")) return;
    try {
      const targetCourse = courses.find(c => c.id === activeCourseId);
      if (!targetCourse) return;
      const currentMaterials = targetCourse.materials || [];
      const updatedMaterials = currentMaterials.filter((m: any) => m.id !== materialId);

      const response = await api.put(`/courses/${activeCourseId}`, {
        materials: updatedMaterials
      });

      setCourses(prev => prev.map(c => c.id === activeCourseId ? { ...c, ...response.data } : c));
      await loadData();
    } catch (err) {
      console.error("Material removal failed:", err);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseId) return;
    try {
      await api.post("/lessons", {
        ...lessonForm,
        courseId: activeCourseId
      });
      setShowAddLesson(false);
      setLessonForm({ title: "", durationMin: 30, content: "" });
      await loadData();
    } catch (err) {
      console.error("Lesson creation failed:", err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/assignments", assignForm);
      setAssignments(prev => [...prev, response.data]);
      setShowAddAssignment(false);
      setAssignForm({ courseId: activeCourseId, title: "", description: "", maxPoints: 100, dueDate: "", files: [] });
      await loadData();
    } catch (err) {
      console.error("Assignment generation failed:", err);
    }
  };

  const handlePublishGrade = async (subId: string) => {
    try {
      await api.post(`/submissions/${subId}/grade`, {
        grade: gradeScore,
        feedback: feedbackText,
        gradedBy: user?.id
      });
      // Refresh local analytics values
      setSubmissions(prev =>
        prev.map(s => (s.id === subId ? { ...s, grade: gradeScore, feedback: feedbackText } : s))
      );
      setActiveSubId(null);
      setFeedbackText("");
      await loadData();
    } catch (err) {
      console.error("Failed to commit and notify student grade:", err);
    }
  };

  // Discussion threads actions
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this discussion thread and all its replies?")) return;
    try {
      await api.delete(`/forum/${postId}`);
      setAllForums(prev => prev.filter(p => p.id !== postId));
      if (selectedPostId === postId) {
        setSelectedPostId(null);
      }
    } catch (err) {
      console.error("Failed to delete discussion post:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this reply?")) return;
    try {
      await api.delete(`/forum/comments/${commentId}`);
      setSelectedPostComments(prev => prev.filter(c => c.id !== commentId));
      // update replies counts locally
      setAllForums(prev =>
        prev.map(p => {
          if (p.id === selectedPostId) {
            return { ...p, repliesCount: Math.max(0, (p.repliesCount || 1) - 1) };
          }
          return p;
        })
      );
    } catch (err) {
      console.error("Failed to delete reply comment:", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPostId || submittingComment) return;
    try {
      setSubmittingComment(true);
      const res = await api.post(`/forum/${selectedPostId}/comments`, {
        authorId: user?.id,
        authorName: `${user?.name} (Instructor)`,
        authorRole: "teacher",
        content: newCommentText
      });
      setNewCommentText("");
      setSelectedPostComments(prev => [...prev, res.data]);
      setAllForums(prev =>
        prev.map(p => (p.id === selectedPostId ? { ...p, repliesCount: (p.repliesCount || 0) + 1 } : p))
      );
    } catch (err) {
      console.error("Failed to send instructor reply comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Student analytics calculations
  const courseAnalyticsData = courses.map((c: any) => {
    const enrolledList = enrollments.filter((e: any) => e.courseId === c.id);
    const avgProgress = enrolledList.length > 0
      ? Math.round(enrolledList.reduce((acc: number, item: any) => acc + (item.progress || 0), 0) / enrolledList.length)
      : 0;
    
    return {
      name: c.title.split(":")[0],
      enrolled: enrolledList.length || c.studentsEnrolled || 0,
      progress: avgProgress,
    };
  });

  // Grade distributions tracker
  const gradesCount = { A: 0, B: 0, C: 0, F: 0 };
  const evaluatedSubmissions = submissions.filter((s: any) => s.grade !== undefined);
  evaluatedSubmissions.forEach((s: any) => {
    if (s.grade >= 90) gradesCount.A++;
    else if (s.grade >= 80) gradesCount.B++;
    else if (s.grade >= 70) gradesCount.C++;
    else gradesCount.F++;
  });

  const gradeDistribution = [
    { name: "Excellent (90-100)", value: gradesCount.A || 0, color: "#10b981" },
    { name: "Proficient (80-89)", value: gradesCount.B || 0, color: "#3b82f6" },
    { name: "Satisfactory (70-79)", value: gradesCount.C || 0, color: "#f59e0b" },
    { name: "Developing (<70)", value: gradesCount.F || 0, color: "#ef4444" }
  ].filter(g => g.value > 0);

  const pendingGradingCount = submissions.filter(s => s.grade === undefined).length;

  // Filter discussions
  const filteredDiscussions = allForums.filter((post: any) => {
    const belongsToInstructor = courses.some(c => c.id === post.courseId);
    if (!belongsToInstructor) return false;

    const matchesCourse = forumCourseFilter === "all" || post.courseId === forumCourseFilter;
    const matchesSearch = post.title.toLowerCase().includes(forumSearch.toLowerCase()) || 
                          post.content.toLowerCase().includes(forumSearch.toLowerCase()) ||
                          post.authorName.toLowerCase().includes(forumSearch.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-2xs font-mono text-gray-400">Loading integrated faculty control data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left pb-16">
      
      {/* Dynamic Faculty Header Banner */}
      <div className="rounded-3xl bg-linear-to-r from-teal-600 via-emerald-600 to-emerald-700 p-6 md:p-8 text-white shadow-lg shadow-emerald-100/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/5 blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-teal-500/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-100 border border-white/10 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-200 fill-emerald-200" /> Authorized Academic Workspace
            </div>
            <h2 className="text-2xl font-black tracking-tight" id="teacher_display_title">
              {user?.name || "Professor Marcus Vance"}
            </h2>
            <p className="mt-1 text-xs text-emerald-100 max-w-lg font-medium">
              Create student curriculum materials, prepare assignments, evaluate homework and study discussions indices. Access analytics on average completion.
            </p>
          </div>
          
          <div className="flex rounded-2xl bg-white/15 p-4 backdrop-blur-md border border-white/10 gap-6">
            <div className="text-center">
              <span className="block text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Courses Taught</span>
              <span className="text-xl font-black mt-0.5 block">{courses.length}</span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <span className="block text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Active Students</span>
              <span className="text-xl font-black mt-0.5 block">
                {courses.reduce((acc, curr) => acc + (curr.studentsEnrolled || 0), 0)}
              </span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <span className="block text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Pending Grades</span>
              <span className="text-xl font-black mt-0.5 block text-yellow-300">{pendingGradingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Widgets Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Total Exercises</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">{assignments.length} Tasks</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Enrollment Cards</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">{enrollments.length} Slots</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Grades Completed</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">
              {evaluatedSubmissions.length} Finished
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-gray-100/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <span className="text-4xs font-mono font-bold uppercase tracking-wider text-gray-400 block">Forum Threads</span>
            <p className="text-lg font-black text-gray-850 mt-0.5">
              {allForums.filter(f => courses.some(co => co.id === f.courseId)).length} Threads
            </p>
          </div>
        </Card>
      </div>

      {/* High-Contrast Interactive Tabs Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap -mb-px gap-2">
          <button
            onClick={() => setActiveTab("courses")}
            className={`cursor-pointer inline-flex items-center gap-1.5 py-3.5 px-5 text-2xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "courses"
                ? "border-emerald-650 text-emerald-700"
                : "border-transparent text-gray-405 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            Syllabus & Courses
          </button>
          
          <button
            onClick={() => setActiveTab("assignments")}
            className={`cursor-pointer inline-flex items-center gap-1.5 py-3.5 px-5 text-2xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "assignments"
                ? "border-emerald-650 text-emerald-700"
                : "border-transparent text-gray-405 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Assignments Admin
          </button>

          <button
            onClick={() => setActiveTab("grading")}
            className={`cursor-pointer inline-flex items-center gap-1.5 py-3.5 px-5 text-2xs font-bold uppercase tracking-wider border-b-2 transition-all relative ${
              activeTab === "grading"
                ? "border-emerald-650 text-emerald-700"
                : "border-transparent text-gray-405 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            Grading Desk
            {pendingGradingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center leading-none px-2 py-0.5 text-4xs font-black bg-orange-500 text-white rounded-full">
                {pendingGradingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`cursor-pointer inline-flex items-center gap-1.5 py-3.5 px-5 text-2xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "analytics"
                ? "border-emerald-650 text-emerald-700"
                : "border-transparent text-gray-405 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Student Analytics
          </button>

          <button
            onClick={() => setActiveTab("forum")}
            className={`cursor-pointer inline-flex items-center gap-1.5 py-3.5 px-5 text-2xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "forum"
                ? "border-emerald-650 text-emerald-700"
                : "border-transparent text-gray-405 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Discussion forums
          </button>

          <button
            onClick={() => setActiveTab("live")}
            className={`cursor-pointer inline-flex items-center gap-1.5 py-3.5 px-5 text-2xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "live"
                ? "border-emerald-650 text-emerald-700 font-extrabold"
                : "border-transparent text-gray-405 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            <Tv className="h-4 w-4 text-indigo-500 font-bold animate-pulse" />
            Live Classroom
            <span className="ml-1 px-1.5 py-0.5 text-[8px] bg-indigo-50 text-indigo-650 border border-indigo-150 rounded-md font-mono shrink-0">NEW</span>
          </button>
        </div>
      </div>

      {/* Dynamic Tab Renderers */}
      <div className="space-y-6">

        {/* TAB 1: SYLLABUS AND COURSES */}
        {activeTab === "courses" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
            
            {/* Left Courses Side */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Class Curriculums Taught</h3>
                  <p className="text-[10px] text-gray-400 font-mono">Select a course to modify and publish syllabus chapters.</p>
                </div>
                <button
                  onClick={() => setShowAddCourse(!showAddCourse)}
                  className="rounded-xl bg-emerald-600 border border-emerald-650 px-3.5 py-2 text-3xs font-bold text-white shadow-xs hover:bg-emerald-750 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                  id="add_new_course_btn"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Course</span>
                </button>
              </div>

              {/* Course form expandable modal */}
              {showAddCourse && (
                <Card className="border-emerald-250 bg-emerald-50/15">
                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Publish a New Course</h4>
                      <button 
                        type="button" 
                        onClick={() => setShowAddCourse(false)}
                        className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">COURSE TITLE</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. LLM Reasoning Foundations"
                          value={courseForm.title}
                          onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">SUBJECT CATEGORY</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Cognitive Systems"
                          value={courseForm.category}
                          onChange={e => setCourseForm({...courseForm, category: e.target.value})}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">DETAILED CURRICULUM DESCRIPTION</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Study attention models, key retrieval sequences, and deep decoder pathways of standard Transformers..."
                        value={courseForm.description}
                        onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs outline-hidden focus:border-emerald-500 leading-relaxed font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">CURRICULUM DIFFICULTY</label>
                        <select
                          value={courseForm.difficulty}
                          onChange={e => setCourseForm({...courseForm, difficulty: e.target.value as any})}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 cursor-pointer font-bold"
                        >
                          <option value="Beginner">Beginner Level</option>
                          <option value="Intermediate">Intermediate Level</option>
                          <option value="Advanced">Advanced Core</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">COVER IMAGE URL</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={courseForm.coverImage}
                          onChange={e => setCourseForm({...courseForm, coverImage: e.target.value})}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 text-gray-600"
                        />
                      </div>
                    </div>

                    {/* Preset Cover Thumbnail Selector */}
                    <div>
                      <span className="block text-4xs font-mono font-bold text-gray-450 mb-1.5 uppercase">Quick Select Cover Image Preset:</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { name: "Gen AI/Cognitive", url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=400&h=300&fit=crop" },
                          { name: "Web Dev/Labs", url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=300&fit=crop" },
                          { name: "UI Design/Space", url: "https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=400&h=300&fit=crop" },
                          { name: "Syllabus/Books", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop" }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCourseForm({...courseForm, coverImage: preset.url})}
                            className="group relative rounded-lg border border-gray-200 overflow-hidden text-left h-12 cursor-pointer focus:outline-hidden hover:border-emerald-500 transition-all font-sans"
                          >
                            <img src={preset.url} alt={preset.name} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-all opacity-40 group-hover:opacity-60" />
                            <span className="absolute bottom-1 left-2 font-black text-gray-900 drop-shadow-sm text-[8px] leading-tight select-none">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowAddCourse(false)}
                        className="rounded-xl px-4 py-2 text-3xs font-bold text-gray-650 bg-white border border-gray-200 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl px-4 py-2 text-3xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      >
                        Publish Course
                      </button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Supplementary Material Upload Panel */}
              {showAddMaterial && (
                <Card className="border-sky-300 bg-sky-50/10 text-left">
                  <form onSubmit={handleAddMaterialSubmit} className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <h4 className="text-xs font-black text-sky-850 uppercase tracking-wide inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-sky-600" />
                        <span>Upload handout for: {courses.find(c => c.id === activeCourseId)?.title}</span>
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setShowAddMaterial(false)}
                        className="text-gray-400 hover:text-gray-650 text-xs font-bold cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">MATERIAL/DOCUMENT NAME</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Transformers Lecture Slides.pdf"
                          value={materialForm.name}
                          onChange={e => setMaterialForm({...materialForm, name: e.target.value})}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-sky-500 font-medium font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">MATERIAL TYPE</label>
                        <select
                          value={materialForm.type}
                          onChange={e => setMaterialForm({...materialForm, type: e.target.value})}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-sky-500 cursor-pointer font-bold"
                        >
                          <option value="PDF Document">PDF Document</option>
                          <option value="Slide Deck">Slide Deck / PPTX</option>
                          <option value="Code Archive">Source Code / ZIP</option>
                          <option value="Video Materials">Direct Video / MP4</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">DOCUMENT LINK OR SOURCE FILE URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/materials/presentation.pdf"
                        value={materialForm.url}
                        onChange={e => setMaterialForm({...materialForm, url: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-sky-500 text-gray-600 font-sans"
                      />
                    </div>

                    {/* Drag-and-drop simulated upload simulator */}
                    <div>
                      <span className="block text-4xs font-mono font-bold text-gray-450 mb-1">SIMULATED FILE DRAG & DROP</span>
                      <div 
                        onClick={() => {
                          setUploadingState(true);
                          setTimeout(() => {
                            setUploadingState(false);
                            const mockNames = [
                              "Lecture_Syllabus_Appendix.pdf",
                              "Model_Parameters_Cheatsheet.pdf",
                              "Lab_Exercise_Guides_Source.zip",
                              "Slide_Lecture_Deck_Interactive.pptx"
                            ];
                            const chooseName = mockNames[Math.floor(Math.random() * mockNames.length)];
                            setMaterialForm({
                              name: chooseName,
                              type: chooseName.endsWith(".zip") ? "Code Archive" : chooseName.endsWith(".pptx") ? "Slide Deck" : "PDF Document",
                              url: `https://example-lms-cdn.net/uploads/${Date.now()}/${chooseName}`
                            });
                          }, 1200);
                        }}
                        className="border-2 border-dashed border-sky-200 rounded-xl p-5 text-center bg-sky-50/10 cursor-pointer hover:bg-sky-100/20 transition-all group"
                      >
                        {uploadingState ? (
                          <div className="space-y-2">
                            <Layers className="animate-spin text-sky-600 h-5 w-5 mx-auto" />
                            <p className="text-3xs font-mono font-bold text-sky-700 animate-pulse">Running local sandbox check & uploading to cloud CDN node...</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Plus className="h-4.5 w-4.5 text-sky-500 mx-auto group-hover:scale-110 transition-all" />
                            <p className="text-3xs text-sky-800 font-extrabold font-sans">Drag files directly here or, click to simulate file upload</p>
                            <p className="text-[9px] text-gray-400 font-mono">Accepts PDF, PPT, Word, ZIP formats up to 100MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowAddMaterial(false)}
                        className="rounded-xl px-4 py-2 text-3xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingState}
                        className="rounded-xl px-4 py-2 text-3xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        Publish Handout
                      </button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Taught classes loop */}
              {courses.length === 0 ? (
                <Card className="text-center py-12 text-xs text-gray-500 border border-dashed border-gray-200">
                  <AlertCircle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700">No active classes under your faculty profile.</p>
                  <p className="text-4xs text-gray-400 mt-1">Click the "Create Course" button above to publish your first syllabus model!</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {courses.map(course => {
                    const active = activeCourseId === course.id;
                    const courseEnrolls = enrollments.filter(e => e.courseId === course.id);

                    // Inline Edit Form Panel
                    if (editingCourseId === course.id) {
                      return (
                        <div key={course.id} className="rounded-2xl border border-emerald-500 bg-emerald-50/5 p-5 transition-all text-left">
                          <form onSubmit={handleEditCourseSubmit} className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <h4 className="text-xs font-black text-emerald-850 uppercase tracking-wide">Edit Course Curriculum</h4>
                              <button 
                                type="button" 
                                onClick={() => setEditingCourseId(null)}
                                className="text-gray-450 hover:text-gray-650 text-xs font-bold cursor-pointer"
                              >
                                ✕ Cancel
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-4xs font-mono font-bold text-gray-550 mb-1">COURSE TITLE</label>
                                <input
                                  type="text"
                                  required
                                  value={editCourseForm.title}
                                  onChange={e => setEditCourseForm({...editCourseForm, title: e.target.value})}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-medium font-sans"
                                />
                              </div>
                              <div>
                                <label className="block text-4xs font-mono font-bold text-gray-550 mb-1">SUBJECT CATEGORY</label>
                                <input
                                  type="text"
                                  required
                                  value={editCourseForm.category}
                                  onChange={e => setEditCourseForm({...editCourseForm, category: e.target.value})}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-medium font-sans"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">CURRICULUM DESCRIPTION</label>
                              <textarea
                                rows={3}
                                required
                                value={editCourseForm.description}
                                onChange={e => setEditCourseForm({...editCourseForm, description: e.target.value})}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs outline-hidden focus:border-emerald-500 leading-relaxed font-sans"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">DIFFICULTY LEVEL</label>
                                <select
                                  value={editCourseForm.difficulty}
                                  onChange={e => setEditCourseForm({...editCourseForm, difficulty: e.target.value as any})}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 cursor-pointer font-bold"
                                >
                                  <option value="Beginner">Beginner Level</option>
                                  <option value="Intermediate">Intermediate Level</option>
                                  <option value="Advanced">Advanced Core</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">COVER IMAGE THUMBNAIL URL</label>
                                <input
                                  type="url"
                                  required
                                  value={editCourseForm.coverImage}
                                  onChange={e => setEditCourseForm({...editCourseForm, coverImage: e.target.value})}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 text-gray-600 font-sans"
                                />
                              </div>
                            </div>

                            {/* Preset Cover Thumbnail Selector */}
                            <div>
                              <span className="block text-4xs font-mono font-bold text-gray-455 mb-1.5 uppercase">Quick Select Thumbnail Preset:</span>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { name: "Gen AI/Cognitive", url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=400&h=300&fit=crop" },
                                  { name: "Web Dev/Labs", url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=300&fit=crop" },
                                  { name: "UI Design/Space", url: "https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=400&h=300&fit=crop" },
                                  { name: "Syllabus/Books", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop" }
                                ].map((preset, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setEditCourseForm({...editCourseForm, coverImage: preset.url})}
                                    className="group relative rounded-lg border border-gray-200 overflow-hidden text-left h-12 cursor-pointer focus:outline-hidden hover:border-emerald-500 transition-all font-sans"
                                  >
                                    <img src={preset.url} alt={preset.name} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-all opacity-40 group-hover:opacity-60" />
                                    <span className="absolute bottom-1 left-2 font-black text-gray-900 drop-shadow-sm text-[8px] leading-tight select-none">{preset.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 font-sans">
                              <button
                                type="button"
                                onClick={() => setEditingCourseId(null)}
                                className="rounded-xl px-4 py-2 text-3xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="rounded-xl px-4 py-2 text-3xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
                              >
                                Save Changes
                              </button>
                            </div>
                          </form>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={course.id}
                        className={`rounded-2xl border p-5 transition-all text-left ${
                          active 
                            ? "border-emerald-500 bg-emerald-50/10 shadow-sm ring-1 ring-emerald-100" 
                            : "border-gray-150 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 font-sans">
                          <div className="flex items-start gap-3.5">
                            <img
                              src={course.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200"}
                              alt={course.title}
                              referrerPolicy="no-referrer"
                              className="h-16 w-16 object-cover rounded-xl border border-gray-100 bg-gray-50 shrink-0"
                            />
                            <div>
                              <span className="inline-block px-1.5 py-0.5 text-[8px] font-mono font-black uppercase text-emerald-700 bg-emerald-50 rounded-md">
                                {course.category}
                              </span>
                              <h4 className="text-xs font-black text-gray-800 leading-tight mt-1">{course.title}</h4>
                              <p className="text-4xs text-gray-400 font-mono mt-0.5">
                                Scope ID: <span className="font-bold">{course.id}</span> &bull; {course.difficulty} &bull; {courseEnrolls.length} students enrolled
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setActiveCourseId(course.id);
                              setAssignForm(prev => ({ ...prev, courseId: course.id }));
                            }}
                            className={`rounded-xl px-4 py-2.5 text-3xs font-bold transition-all cursor-pointer shrink-0 ${
                              active
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-gray-50 text-gray-650 hover:bg-gray-100 border border-gray-200"
                            }`}
                          >
                            {active ? "Currently Selected" : "Audit Syllabus & Lesson"}
                          </button>
                        </div>

                        <p className="text-[10px] mt-3.5 text-gray-650 leading-relaxed font-sans font-medium">
                          {course.description}
                        </p>

                        {/* Supplementary Course Materials Handouts lists inside active teacher course segment */}
                        {course.materials && course.materials.length > 0 && (
                          <div className="mt-4 pt-3.5 border-t border-gray-150/50 text-left">
                            <span className="block text-4xs font-mono font-bold text-gray-500 uppercase mb-2">Supplementary Study Files Handouts ({course.materials.length}):</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
                              {course.materials.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/50 border border-gray-150/40">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="bg-sky-100 text-sky-700 font-mono font-bold text-[9px] min-w-8 p-1.5 rounded-md text-center shrink-0">
                                      {m.type === "PDF Document" ? "PDF" : m.type === "Slide Deck" ? "SLIDE" : m.type === "Code Archive" ? "ZIP" : "VIDEO"}
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="text-[10px] font-extrabold text-gray-800 truncate leading-snug">{m.name}</p>
                                      <a
                                        href={m.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-mono text-blue-600 hover:underline truncate block leading-none mt-0.5"
                                      >
                                        Visit file resource
                                      </a>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteMaterialSubmit(m.id)}
                                    type="button"
                                    className="text-gray-400 hover:text-rose-600 p-1.5 rounded-md transition-colors cursor-pointer shrink-0"
                                    title="Delete this supplement file"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Course Controls toolbar */}
                        {active && (
                          <div className="mt-4 pt-4 border-t border-gray-150/40 flex flex-wrap gap-2 items-center justify-between font-sans">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingCourseId(course.id);
                                  setEditCourseForm({
                                    title: course.title,
                                    description: course.description,
                                    category: course.category,
                                    difficulty: course.difficulty,
                                    coverImage: course.coverImage
                                  });
                                }}
                                className="rounded-xl px-3.5 py-2 border border-emerald-500 bg-white text-emerald-700 text-3xs font-bold hover:bg-emerald-50 cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit Course</span>
                              </button>
                              
                              <button
                                onClick={() => handleDeleteCourseSubmit(course.id)}
                                className="rounded-xl px-3.5 py-2 border border-rose-450 bg-white text-rose-600 text-3xs font-bold hover:bg-rose-50 cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete Course</span>
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setShowAddMaterial(true);
                                setMaterialForm({ name: "", type: "PDF Document", url: "" });
                              }}
                              className="rounded-xl px-3.5 py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 text-3xs font-extrabold cursor-pointer inline-flex items-center gap-1 border border-sky-150"
                            >
                              <Layers className="h-3 w-3" />
                              <span>+ Upload Learning Materials</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Audit Curriculum Segment */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Curriculum Chapter Syllabus</h3>
              
              <Card className="p-4 bg-white border border-gray-150 rounded-3xl">
                {activeCourseId ? (
                  (() => {
                    const matchedCo = courses.find(c => c.id === activeCourseId);
                    const listLessons = matchedCo?.lessons || [];
                    return (
                      <div className="space-y-4">
                        <div className="border-b border-gray-50 pb-3">
                          <span className="block text-[8px] font-mono font-black uppercase text-gray-400">Chapters For Selected Class</span>
                          <h4 className="text-2xs font-bold text-gray-800 tracking-tight">{matchedCo?.title}</h4>
                        </div>

                        {/* Lessons List audit */}
                        {listLessons.length === 0 ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            No course lessons uploaded yet. Write a new chapter down below!
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {listLessons.map((les: any, idx: number) => (
                              <div key={les.id || idx} className="rounded-xl border border-gray-100 p-3 bg-gray-50/20 text-left">
                                <div className="flex items-start justify-between gap-1">
                                  <div>
                                    <span className="text-[9px] font-mono text-emerald-650 font-bold block">CHAPTER {idx + 1}</span>
                                    <h5 className="text-3xs font-extrabold text-gray-850">{les.title}</h5>
                                  </div>
                                  <span className="text-[9px] font-mono text-gray-450 whitespace-nowrap">{les.durationMin} min</span>
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-1 mt-1 leading-snug">
                                  {les.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactive Lesson Poster segment */}
                        <div className="pt-2 border-t border-gray-50">
                          <button
                            onClick={() => setShowAddLesson(!showAddLesson)}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 py-3 text-3xs font-black uppercase tracking-wider transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Upload Lesson Chapter</span>
                          </button>

                          {showAddLesson && (
                            <form onSubmit={handleCreateLesson} className="mt-3 bg-gray-50 rounded-2xl p-3 border border-gray-150 text-left space-y-3">
                              <h5 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Publish New Course Lesson</h5>
                              
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[8px] font-mono font-bold text-gray-400 mb-0.5">LESSON TITLE</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Transformers & Decoder Pathways"
                                    value={lessonForm.title}
                                    onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-hidden"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[8px] font-mono font-bold text-gray-400 mb-0.5">ESTIMATED STUDY DURATION (MINUTES)</label>
                                  <input
                                    type="number"
                                    required
                                    value={lessonForm.durationMin}
                                    onChange={e => setLessonForm({...lessonForm, durationMin: Number(e.target.value)})}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-hidden"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[8px] font-mono font-bold text-gray-400 mb-0.5">LESSON LECTURE CONTENT (MARKDOWN COMPATIBLE)</label>
                                  <textarea
                                    rows={4}
                                    required
                                    placeholder="Write details on self-attention mechanisms, dot products, or include sample JSON queries..."
                                    value={lessonForm.content}
                                    onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-hidden leading-relaxed font-sans"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setShowAddLesson(false)}
                                  className="rounded-lg px-2.5 py-1 text-4xs text-gray-500 bg-white border border-gray-200"
                                >
                                  Hide Form
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-lg px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-4xs font-bold"
                                >
                                  Publish Chapter
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">
                    Select a curriculum taught on the left layout to add syllabus or audit lessons!
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENT ADMIN */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Coursework Assignments</h3>
                <p className="text-[10px] text-gray-400 font-mono">Create and dispatch evaluation worksheets to students.</p>
              </div>
              
              <button
                onClick={() => setShowAddAssignment(!showAddAssignment)}
                className="rounded-xl bg-teal-600 border border-teal-650 px-3.5 py-2 text-3xs font-bold text-white shadow-xs hover:bg-teal-750 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                id="add_new_assignment_btn"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Assignment</span>
              </button>
            </div>

            {showAddAssignment && (
              <Card className="border-teal-200 bg-teal-50/15 max-w-2xl">
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Publish Academic Homework</h4>
                    <button 
                      type="button" 
                      onClick={() => setShowAddAssignment(false)}
                      className="text-gray-400 hover:text-gray-650 text-xs font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">CHOOSE COURSE DISPATCH TARGET</label>
                      <select
                        value={assignForm.courseId}
                        onChange={e => setAssignForm({...assignForm, courseId: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-bold cursor-pointer"
                      >
                        {courses.map(co => (
                          <option key={co.id} value={co.id}>{co.title}</option>
                        ))}
                        {courses.length === 0 && <option value="">No course curricula created</option>}
                      </select>
                    </div>

                    <div>
                      <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">ASSIGNMENT WORK SHEET TITLE</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Assignment 1: API Proxies"
                        value={assignForm.title}
                        onChange={e => setAssignForm({...assignForm, title: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">QUESTIONS & INSTRUCTIONS DIALOGUE</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Build a secure Express server route proxying key integrations, then comment on its state properties..."
                      value={assignForm.description}
                      onChange={e => setAssignForm({...assignForm, description: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 leading-relaxed font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">MAX POINT SCORE</label>
                      <input
                        type="number"
                        required
                        value={assignForm.maxPoints}
                        onChange={e => setAssignForm({...assignForm, maxPoints: Number(e.target.value)})}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-hidden focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-4xs font-mono font-bold text-gray-500 mb-1">SUBMISSION DUE DATE TIMESTAMP</label>
                      <input
                        type="datetime-local"
                        required
                        value={assignForm.dueDate}
                        onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-600 outline-hidden focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Upload reference files section */}
                  <div className="space-y-2 border-t border-gray-100 pt-3 text-left">
                    <span className="block text-4xs font-mono font-bold text-gray-500 uppercase">INSTRUCTIONAL REFERENCE/HANDOUT FILES FOR ASSIGNMENT:</span>
                    
                    <div 
                      onClick={() => {
                        setUploadingAssignFile(true);
                        setTimeout(() => {
                          setUploadingAssignFile(false);
                          const mockMaterials = [
                            { name: "Syllabus_Project_Instructions.pdf", url: "https://example-lms-cdn.net/assignments/materials/Syllabus_Project_Instructions.pdf" },
                            { name: "Code_Template_Scaffolding.zip", url: "https://example-lms-cdn.net/assignments/materials/Code_Template_Scaffolding.zip" },
                            { name: "Reference_Documentation_Cheatsheet.docx", url: "https://example-lms-cdn.net/assignments/materials/Reference_Documentation_Cheatsheet.docx" }
                          ];
                          const selected = mockMaterials[Math.floor(Math.random() * mockMaterials.length)];
                          // check if file is already attached
                          if (!assignForm.files.some(f => f.name === selected.name)) {
                            setAssignForm(prev => ({
                              ...prev,
                              files: [...prev.files, selected]
                            }));
                          }
                        }, 1000);
                      }}
                      className="border-2 border-dashed border-teal-200 hover:border-teal-400 rounded-xl p-4 text-center bg-teal-50/5 cursor-pointer hover:bg-teal-50/20 transition-all group"
                    >
                      {uploadingAssignFile ? (
                        <div className="space-y-1">
                          <Layers className="animate-spin text-teal-600 h-4.5 w-4.5 mx-auto" style={{ display: 'block' }} />
                          <p className="text-3xs font-mono font-bold text-teal-700 animate-pulse">Simulating secure asset upload to Cloud CDN...</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Plus className="h-4 w-4 text-teal-500 mx-auto group-hover:scale-110 transition-all" style={{ display: 'block' }} />
                          <p className="text-3xs text-teal-800 font-extrabold font-sans">Click to simulate & attach reference files (PDF, DOCX, ZIP)</p>
                          <p className="text-[9px] text-gray-400 font-mono">Simulators support standard handout packs up to 50MB</p>
                        </div>
                      )}
                    </div>

                    {assignForm.files && assignForm.files.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {assignForm.files.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-150">
                            <span className="text-[10px] text-gray-700 font-medium truncate shrink" title={f.name}>{f.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignForm(prev => ({
                                  ...prev,
                                  files: prev.files.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-gray-450 hover:text-rose-600 p-1 rounded-md shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowAddAssignment(false)}
                      className="rounded-xl px-4 py-2 text-3xs font-bold text-gray-650 bg-white border border-gray-200 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl px-4 py-2 text-3xs font-bold text-white bg-teal-650 hover:bg-teal-700"
                    >
                      Publish Work Sheet
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {/* Assignments loop */}
            {assignments.length === 0 ? (
              <Card className="text-center py-12 text-xs text-gray-500 border border-dashed border-gray-200">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="font-bold text-gray-700">No student homework assignments published.</p>
                <p className="text-4xs text-gray-400 mt-1">To test knowledge pathways, choose "+ Publish Assignment" above!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assignments.map(assign => {
                  const mCo = courses.find(cc => cc.id === assign.courseId);
                  const relatedSubs = submissions.filter(s => s.assignmentId === assign.id);
                  const gradedCount = relatedSubs.filter(s => s.grade !== undefined).length;
                  return (
                    <Card key={assign.id} className="flex flex-col justify-between border border-gray-150 p-5 bg-white relative overflow-hidden">
                      <div className="space-y-2.5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 text-[8px] font-mono font-bold uppercase text-teal-700 bg-teal-50 rounded-md">
                            {mCo?.title.split(":")[0] || "Curriculum Worksheet"}
                          </span>
                          <span className="text-4xs font-mono text-gray-400">
                            Max: <strong className="text-gray-700">{assign.maxPoints} pts</strong>
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-gray-850 leading-tight">{assign.title}</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-sans">{assign.description}</p>
                        
                        {assign.files && assign.files.length > 0 && (
                          <div className="mt-2.5 space-y-1 border-t border-dashed border-gray-100 pt-2">
                            <span className="block text-[8px] font-mono font-bold text-gray-450 uppercase">Instructional Reference Handouts ({assign.files.length}):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {assign.files.map((f: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer font-sans"
                                  title="Open reference file"
                                >
                                  <Paperclip className="h-2.5 w-2.5 text-slate-500" />
                                  <span>{f.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-left">
                        <div className="space-y-0.5">
                          <span className="text-[9px] block text-gray-450 font-mono">
                            Due date: {new Date(assign.dueDate).toLocaleDateString()} at {new Date(assign.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <span className="text-[9px] block text-emerald-650 font-bold">
                            {gradedCount} evaluated &bull; {relatedSubs.length - gradedCount} pending review
                          </span>
                        </div>

                        <span className="inline-flex items-center justify-center leading-none px-3 py-1 text-4xs font-bold text-gray-600 bg-gray-50 h-7 rounded-lg">
                          {relatedSubs.length} response(s)
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GRADING EVALUATION DESK */}
        {activeTab === "grading" && (
          <div className="max-w-4xl space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Grading Evaluation Desk</h3>
              <p className="text-[10px] text-gray-400 font-mono">Inspect submitted answers, assign points and append written comments.</p>
            </div>

            <Card className="p-4 bg-white border border-gray-150 rounded-3xl space-y-4">
              <CardHeader title="Student Worksheet Submissions Dashboard" subtitle="Manage outstanding grades and provide academic feedback" />

              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {submissions.length === 0 ? (
                  <p className="py-12 text-center text-xs text-gray-450 font-medium">No student answers have been submitted to your courses yet.</p>
                ) : (
                  submissions.map((sub: any) => {
                    const matchedCo = courses.find(co => co.id === sub.courseId);
                    const matchedAs = assignments.find(as => as.id === sub.assignmentId);
                    const isGraded = sub.grade !== undefined;

                    return (
                      <div
                        key={sub.id}
                        className={`rounded-2xl border p-4 text-left transition-all relative ${
                          activeSubId === sub.id
                            ? "border-emerald-500 bg-emerald-50/10 shadow-sm"
                            : isGraded
                            ? "border-gray-100 bg-white"
                            : "border-amber-200 bg-amber-50/5 hover:border-amber-300"
                        }`}
                      >
                        <div className="absolute top-0 right-0 h-full w-1.5 rounded-l-md" style={{
                          backgroundColor: isGraded ? "#10b981" : "#f59e0b"
                        }} />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-gray-800">Student Name: {sub.studentName}</span>
                              <span className="text-4xs font-mono text-gray-405">•</span>
                              <span className="text-4xs font-mono text-gray-405">Course: {matchedCo?.title || "Syllabus Module"}</span>
                            </div>
                            
                            <h5 className="mt-1.5 text-xs font-black text-gray-850 leading-tight">
                              {matchedAs?.title || "Evaluation Target Module"}
                            </h5>
                            <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                              Submitted: {new Date(sub.submittedAt).toLocaleDateString()} at {new Date(sub.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>

                          <div>
                            {isGraded ? (
                              <span className="inline-block rounded-xl bg-emerald-50 px-3.5 py-1 text-3xs font-extrabold text-emerald-800 border border-emerald-100 uppercase tracking-wide">
                                Marks Approved: {sub.grade} / {matchedAs?.maxPoints || 100}
                              </span>
                            ) : (
                              <span className="inline-block rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-1 text-3xs font-black text-amber-800 uppercase tracking-widest animate-pulse">
                                Ungraded Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Student raw answer paper */}
                        <div className="mt-4 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                          <span className="block text-[8px] font-mono font-black text-gray-405 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-gray-400" /> Student Answer paper
                          </span>
                          <p className="text-2xs font-serif text-gray-700 whitespace-pre-wrap leading-relaxed select-all selection:bg-teal-100 mb-2">
                            {sub.submittedContent}
                          </p>
                          
                          {sub.submittedFile && (
                            <div className="mt-3 p-3 bg-teal-50/20 border border-teal-150/45 rounded-xl flex items-center justify-between font-sans">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="bg-teal-100 text-teal-800 font-mono font-black text-[9px] px-2.5 py-1 rounded-md text-center uppercase shrink-0">
                                  {sub.submittedFile.name.endsWith(".docx") || sub.submittedFile.name.endsWith(".doc") ? "DOCX" : "PDF"}
                                </div>
                                <div className="overflow-hidden text-left">
                                  <p className="text-[10px] font-extrabold text-teal-900 truncate leading-snug">{sub.submittedFile.name}</p>
                                  <p className="text-[8px] font-mono text-gray-400 block leading-none mt-0.5">Evaluation Document attachment uploaded by student</p>
                                </div>
                              </div>
                              <a
                                href={sub.submittedFile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-teal-600 hover:bg-teal-700 text-white font-mono font-extrabold text-[9px] px-3 py-1.5 rounded-lg shrink-0 select-none cursor-pointer"
                              >
                                View / Download File
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Grading dialogue */}
                        {isGraded ? (
                          sub.feedback && (
                            <div className="mt-3 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 pl-3.5">
                              <span className="block text-[8px] font-mono font-black uppercase text-emerald-800 tracking-wider">Academic Review feedback:</span>
                              <p className="text-3xs italic mt-0.5 text-gray-700 leading-normal font-sans">
                                &ldquo;{sub.feedback}&rdquo;
                              </p>
                            </div>
                          )
                        ) : activeSubId !== sub.id ? (
                          <div className="mt-4 text-right">
                            <button
                              onClick={() => {
                                setActiveSubId(sub.id);
                                setGradeScore(matchedAs?.maxPoints || 100);
                                setFeedbackText("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-3xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Evaluate Submission</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 border-t border-dashed border-gray-200 pt-3.5 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="col-span-1">
                                <label className="block text-4xs font-mono font-black text-gray-400 mb-1 leading-snug uppercase">AWARD MARKS (0 - {matchedAs?.maxPoints || 100})</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={matchedAs?.maxPoints || 100}
                                  value={gradeScore}
                                  onChange={e => setGradeScore(Math.min(matchedAs?.maxPoints || 100, Number(e.target.value)))}
                                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-center outline-hidden focus:border-emerald-500"
                                />
                              </div>
                              <div className="col-span-1 sm:col-span-2">
                                <label className="block text-4xs font-mono font-black text-gray-400 mb-1 leading-snug uppercase">TEACHER EVALUATION COMMENTS</label>
                                <input
                                  type="text"
                                  placeholder="Well-formed responses! Solid structural designs and comprehensive comment definitions..."
                                  value={feedbackText}
                                  onChange={e => setFeedbackText(e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs outline-hidden focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1 text-xs">
                              <button
                                onClick={() => setActiveSubId(null)}
                                className="rounded-xl px-3 py-1.5 bg-white text-gray-500 border border-gray-200 text-3xs font-bold"
                              >
                                Minimize Dialog
                              </button>
                              <button
                                onClick={() => handlePublishGrade(sub.id)}
                                className="rounded-xl px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 text-3xs font-bold shadow-xs active:scale-95"
                              >
                                Publish Grade & Notification
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: STUDENT ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Student Analytics Center</h3>
              <p className="text-[10px] text-gray-400 font-mono">Observe learner milestones, grade curves and curriculum engagement trends.</p>
            </div>

            {/* Analytics Overview Metric Bento Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Left Bento: Chart for completion and progress */}
              <Card className="p-5 bg-white border border-gray-150 rounded-3xl md:col-span-2 space-y-4">
                <div className="border-b border-gray-50 pb-3">
                  <h4 className="text-2xs font-extrabold text-gray-800">Course Syllabus Progress Metrics</h4>
                  <p className="text-4xs text-gray-400 font-mono">Average completion percentage compared against active learner volumes</p>
                </div>

                {courseAnalyticsData.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-gray-400">
                    No active student analytic registries reported.
                  </div>
                ) : (
                  <div className="h-72 w-full text-2xs" style={{ minWidth: "100%" }}>
                    <ResponsiveContainer width="99%" height="100%">
                      <RechartsBarChart data={courseAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "11px", fontWeight: "bold" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", marginTop: "5px" }} />
                        <Bar dataKey="progress" name="Syllabus Progress (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="enrolled" name="Enrolled Quantity" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={24} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Right Bento: Pie Distribution Chart */}
              <Card className="p-5 bg-white border border-gray-150 rounded-3xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="border-b border-gray-50 pb-3">
                    <h4 className="text-2xs font-extrabold text-gray-800">Grade Curve Distribution</h4>
                    <p className="text-4xs text-gray-400 font-mono">Homework score thresholds over graded assignments</p>
                  </div>

                  {gradeDistribution.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-gray-400 gap-1.5 mt-8">
                      <Activity className="h-5 w-5 text-gray-300 animate-pulse" />
                      <span>No homework evaluations completed yet to trace distribution!</span>
                    </div>
                  ) : (
                    <div className="h-52 w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={gradeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {gradeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(val) => [`${val} scholar(s)`, "Total"]} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none">
                        <span className="text-lg font-black text-gray-800">{evaluatedSubmissions.length}</span>
                        <span className="text-[8px] font-mono text-gray-405 uppercase font-bold">Graded papers</span>
                      </div>
                    </div>
                  )}
                </div>

                {gradeDistribution.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-gray-50">
                    {gradeDistribution.map((item, id) => (
                      <div key={id} className="flex items-center justify-between text-2xs font-medium">
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-bold text-gray-800">{item.value} student(s)</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* BULK SESSION ATTENDANCE REGISTRAR CARD */}
            <Card className="p-5 bg-white border border-gray-150 rounded-3xl space-y-4 text-left">
              <div className="border-b border-gray-50 pb-3 flex items-center gap-1.5">
                <ClipboardCheck className="h-5 w-5 text-emerald-600 font-bold" />
                <div>
                  <h4 className="text-2xs font-extrabold text-gray-800">Bulk Session Attendance Registrar</h4>
                  <p className="text-4xs text-gray-400 font-mono font-medium">Record live class attendance status for all enrolled students in folders</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-mono font-black text-gray-450 uppercase mb-1 tracking-wider">SELECT ACTIVE COURSE</label>
                  <select
                    value={attendanceCourseId}
                    onChange={(e) => setAttendanceCourseId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Course Taught --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-mono font-black text-gray-450 uppercase mb-1 tracking-wider">SESSION RUNNING DATE</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-gray-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {!attendanceCourseId ? (
                <p className="text-4xs font-mono text-gray-400 italic">Please select an active course taught above to review student rosters checksheets.</p>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/50">
                    <span className="text-4xs font-mono font-bold text-emerald-850">Pre-assigned status: PRESENT</span>
                    <span className="text-4xs text-gray-450 font-mono">Enrolled learners: {enrollments.filter(e => e.courseId === attendanceCourseId).length}</span>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto border border-gray-150 rounded-2xl bg-gray-50/25 p-2">
                    {enrollments.filter(e => e.courseId === attendanceCourseId).length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400 italic">No registered student enrollments found under this course curriculum.</div>
                    ) : (
                      enrollments.filter(e => e.courseId === attendanceCourseId).map((enrol: any) => {
                        const matchedStu = students.find(s => s.id === enrol.studentId) || { name: `Scholar ID: ${enrol.studentId.substring(0, 8)}...`, id: enrol.studentId, email: "student@lms.academy" };
                        const curStatus = attendanceSheet[matchedStu.id] || "present";
                        
                        return (
                          <div key={enrol.id} className="py-2 flex items-center justify-between gap-4">
                            <div className="text-left space-y-0.5">
                              <span className="block text-[11px] font-black text-gray-850">{matchedStu.name}</span>
                              <span className="block text-[8px] font-mono text-gray-400 leading-none">{matchedStu.email}</span>
                            </div>

                            <div className="flex gap-1.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                              {(["present", "absent", "late"] as const).map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setAttendanceSheet(prev => ({ ...prev, [matchedStu.id]: opt }))}
                                  className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded-md transition-all cursor-pointer ${
                                    curStatus === opt
                                      ? opt === "present"
                                        ? "bg-emerald-600 text-white"
                                        : opt === "late"
                                        ? "bg-amber-500 text-white"
                                        : "bg-rose-500 text-white"
                                      : "text-gray-400 hover:text-gray-650"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {enrollments.filter(e => e.courseId === attendanceCourseId).length > 0 && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={handleSubmitBulkAttendance}
                        disabled={savingAttendance}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-3xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {savingAttendance ? "Submitting Attendance..." : "✔ Submit Bulk Class Attendance"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Students Roster Summary Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Scholastic Student Roster</h3>

              <Card className="overflow-hidden border border-gray-150 p-0 rounded-3xl bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 font-sans">
                    <thead className="bg-gray-50 text-[10px] font-mono font-bold text-gray-455 tracking-wider uppercase border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Learner Account</th>
                        <th className="px-6 py-4">E-Mail Address</th>
                        <th className="px-6 py-4">Active Course Cards</th>
                        <th className="px-6 py-4 text-center">Average Course progress</th>
                        <th className="px-6 py-4 text-center"> Attendance Rate</th>
                        <th className="px-6 py-4 text-right">Activity Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-sans">
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-gray-400 font-medium">
                            No learners are currently registered in your academic portal directories.
                          </td>
                        </tr>
                      ) : (
                        students.map((student: any) => {
                          const stuEnrolls = enrollments.filter(e => e.studentId === student.id);
                          const avgProg = stuEnrolls.length > 0
                            ? Math.round(stuEnrolls.reduce((sum, item) => sum + (item.progress || 0), 0) / stuEnrolls.length)
                            : 0;

                          const stuAttendance = attendanceRecords.filter(a => a.studentId === student.id);
                          const presentCount = stuAttendance.filter(a => a.status === "present").length;
                          const attendRate = stuAttendance.length > 0
                            ? Math.round((presentCount / stuAttendance.length) * 100)
                            : 100;

                          return (
                            <tr key={student.id} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-850 flex items-center gap-2.5">
                                <div className="h-8.5 w-8.5 rounded-full bg-linear-to-br from-indigo-50 to-indigo-100 border border-indigo-250 flex items-center justify-center uppercase font-black text-2xs text-indigo-700">
                                  {student.name ? student.name.charAt(0) : "S"}
                                </div>
                                <div className="text-left">
                                  <span className="block font-black text-gray-800 text-2xs">{student.name}</span>
                                  <span className="text-[9px] font-mono text-gray-400 uppercase font-semibold">ROLE: {student.role}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-gray-505 text-2xs">{student.email}</td>
                              <td className="px-6 py-4 font-semibold text-gray-650">{stuEnrolls.length} enrolled</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                                  <span className="text-3xs font-mono font-bold text-gray-700">{avgProg}%</span>
                                  <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{
                                      width: `${avgProg}%`,
                                      backgroundColor: avgProg > 80 ? "#10b981" : avgProg > 40 ? "#3b82f6" : "#f59e0b"
                                    }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                                  <span className="text-3xs font-mono font-bold text-gray-700">{attendRate}%</span>
                                  <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{
                                      width: `${attendRate}%`,
                                      backgroundColor: attendRate > 85 ? "#10b981" : attendRate > 65 ? "#3b82f6" : "#f43f5e"
                                    }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-[10px]">
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  <span>Active Scholar</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 5: DISCUSSION FORUM MODERATION */}
        {activeTab === "forum" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
            
            {/* Left forum threads listing and filter */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Discussion forum Moderator</h3>
                  <p className="text-[10px] text-gray-400 font-mono">Resolve academic student queries, delete inappropriate posts/comments.</p>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="rounded-2xl border border-gray-150 bg-white p-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-401" />
                  <input
                    type="text"
                    placeholder="Search thread titles, bodies, student names..."
                    value={forumSearch}
                    onChange={e => setForumSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-xs outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-56 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={forumCourseFilter}
                    onChange={e => setForumCourseFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-hidden font-bold cursor-pointer text-gray-700 uppercase"
                  >
                    <option value="all">✕ ALL SUBJECT SCOPES</option>
                    {courses.map(co => (
                      <option key={co.id} value={co.id}>{co.title.split(":")[0]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Discussions List */}
              {filteredDiscussions.length === 0 ? (
                <Card className="text-center py-12 text-xs text-gray-500 border border-dashed border-gray-200">
                  <AlertCircle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700">No matching open forums reported.</p>
                  <p className="text-4xs text-gray-400 mt-1">Syllabus discussions appear instantly here as soon as students post inquiries!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredDiscussions.map((post: any) => {
                    const corrCourse = courses.find(cc => cc.id === post.courseId);
                    const activeSelected = selectedPostId === post.id;
                    return (
                      <div
                        key={post.id}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          activeSelected 
                            ? "border-emerald-500 bg-emerald-50/10 shadow-xs" 
                            : "border-gray-150 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-block px-1.5 py-0.5 text-[8px] font-mono font-black uppercase text-teal-700 bg-teal-50 rounded-md">
                                {corrCourse?.title.split(":")[0] || "Curriculum General"}
                              </span>
                              <span className="text-4xs text-gray-400 font-mono">
                                Posted by {post.authorName} ({post.authorRole}) &bull; {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h4 className="text-xs font-black text-gray-800 leading-tight pt-1">
                              {post.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 border border-rose-150 transition-all cursor-pointer"
                              title="Delete core topic thread"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Raw Content Summary */}
                        <p className="text-[11px] mt-2.5 text-gray-600 leading-relaxed font-sans line-clamp-3">
                          {post.content}
                        </p>

                        <div className="mt-3.5 pt-3.5 border-t border-gray-50 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{post.repliesCount || 0} discussion replies</span>
                          </span>

                          <button
                            onClick={() => setSelectedPostId(post.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white px-3.5 py-2 text-3xs font-black uppercase tracking-wider transition-all"
                          >
                            <span>Inspect & Write Reply</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right forum replies inspector & reply forms */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Discussion Inspector</h3>

              <Card className="p-4 bg-white border border-gray-150 rounded-3xl">
                {selectedPostId ? (
                  (() => {
                    const matchedPostObj = allForums.find(f => f.id === selectedPostId);
                    return (
                      <div className="space-y-4.5 text-left">
                        <div className="border-b border-gray-50 pb-3 flex justify-between items-start gap-1">
                          <div>
                            <span className="text-[8px] font-mono font-black uppercase text-gray-405 block">Topic Thread details</span>
                            <h4 className="text-2xs font-extrabold text-gray-800 tracking-tight leading-snug line-clamp-2">
                              {matchedPostObj?.title}
                            </h4>
                          </div>

                          <button
                            onClick={() => setSelectedPostId(null)}
                            className="text-gray-400 hover:text-gray-600 text-[10px] font-extrabold uppercase whitespace-nowrap"
                          >
                            ✕ Close
                          </button>
                        </div>

                        {/* Description */}
                        <div className="rounded-xl bg-gray-55/65 border border-gray-100 p-3">
                          <p className="text-3xs text-gray-405 font-mono mb-1 leading-none uppercase">ORIGINAL QUESTION QUERY:</p>
                          <p className="text-2xs text-gray-650 leading-relaxed font-sans select-all font-medium">
                            {matchedPostObj?.content}
                          </p>
                        </div>

                        {/* Selected comments thread */}
                        <div className="space-y-3.5">
                          <span className="block text-[8px] font-mono font-black uppercase text-gray-405">COMMUNITY COMMENTS OUTLINE ({selectedPostComments.length})</span>
                          
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {selectedPostComments.length === 0 ? (
                              <p className="text-center py-4 text-3xs text-gray-400">No replies posted to this thread yet. Write one down below!</p>
                            ) : (
                              selectedPostComments.map((comment: any, idx: number) => {
                                const isTeacher = comment.authorRole === "teacher";
                                return (
                                  <div key={comment.id || idx} className={`rounded-xl border p-2.5 text-left space-y-1 relative ${
                                    isTeacher ? "bg-emerald-50/20 border-emerald-150" : "bg-gray-50/25 border-gray-100"
                                  }`}>
                                    <div className="flex items-start justify-between gap-1">
                                      <div>
                                        <span className={`text-[8.5px] font-extrabold uppercase ${isTeacher ? "text-emerald-700" : "text-gray-700"}`}>
                                          {comment.authorName}
                                        </span>
                                        <span className="text-[8px] text-gray-400 font-mono ml-1">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                      </div>

                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-rose-500 hover:text-rose-700 text-5xs uppercase tracking-wide cursor-pointer font-bold"
                                        title="Delete inappropriate comment reply"
                                      >
                                        Delete Reply
                                      </button>
                                    </div>
                                    <p className="text-3xs text-gray-600 leading-normal font-sans">
                                      {comment.content}
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Submit Comment reply form */}
                        <form onSubmit={handlePostComment} className="pt-2 border-t border-gray-50 space-y-2">
                          <div>
                            <label className="block text-[8px] font-mono font-black text-gray-404 uppercase mb-1">WRITE OFFICIAL ACADEMIC ANSWER</label>
                            <textarea
                              rows={3}
                              required
                              placeholder="Write reply notes, details on transformers, correct syntax definitions, or outline a prompt template..."
                              value={newCommentText}
                              onChange={e => setNewCommentText(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-hidden focus:border-emerald-500 leading-relaxed font-sans text-gray-700 font-medium"
                            />
                          </div>

                          <div className="text-right">
                            <button
                              type="submit"
                              disabled={submittingComment || !newCommentText.trim()}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-3xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              <Send className="h-3 w-3" />
                              <span>{submittingComment ? "Publishing..." : "Publish Answer reply"}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">
                    Select a forum discussion thread on the left layout to audit and write replies immediately!
                  </div>
                )}
              </Card>
            </div>

          </div>
        )}

        {/* Live classes broadcaster dashboard panel */}
        {activeTab === "live" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-fade-in text-left">
            
            {/* Left Column: Schedule Live Form Panel */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Classroom Broadcasting Panel</h3>
              
              <Card className="p-5 bg-white border border-gray-150 rounded-3xl space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="text-2xs font-extrabold text-gray-800 flex items-center gap-1.5 leading-none">
                    <Tv className="h-4 w-4 text-indigo-500 animate-pulse" /> Schedule Live Session
                  </h4>
                  <p className="text-4xs text-gray-400 font-mono leading-tight mt-1">Configure stream metrics to broadcast live feeds or share WebRTC canvases.</p>
                </div>

                <form onSubmit={handleScheduleClass} className="space-y-4 text-left">
                  
                  {/* Select Course Taught */}
                  <div>
                    <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Target Course Coursework *</label>
                    <select
                      required
                      value={schedulingForm.courseId}
                      onChange={(e) => setSchedulingForm((prev) => ({ ...prev, courseId: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700"
                    >
                      <option value="" disabled>Select a taught course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title of Live session */}
                  <div>
                    <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Stream Session Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chapter 4: Neural Networks and Prompt Syntheses"
                      value={schedulingForm.title}
                      onChange={(e) => setSchedulingForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700"
                    />
                  </div>

                  {/* Description of classroom lecture */}
                  <div>
                    <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Learning Agenda Description (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Outline topic summaries, canvas models, or study whiteboard assignments for today's live lecture..."
                      value={schedulingForm.description}
                      onChange={(e) => setSchedulingForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700 leading-relaxed"
                    />
                  </div>

                  {/* Date, Time & Duration row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Broadcasting Date *</label>
                      <input
                        type="date"
                        required
                        value={schedulingForm.date}
                        onChange={(e) => setSchedulingForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Start Time *</label>
                      <input
                        type="time"
                        required
                        value={schedulingForm.time}
                        onChange={(e) => setSchedulingForm((prev) => ({ ...prev, time: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Duration (Mins)</label>
                      <input
                        type="number"
                        min={15}
                        max={240}
                        required
                        value={schedulingForm.duration}
                        onChange={(e) => setSchedulingForm((prev) => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-mono font-black text-gray-404 uppercase tracking-wider mb-1.5">Session Provider Platform</label>
                      <select
                        value={schedulingForm.meetingType}
                        onChange={(e) => setSchedulingForm((prev) => ({ ...prev, meetingType: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-2xs outline-none focus:border-indigo-500 font-medium text-gray-700"
                      >
                        <option value="webrtc">🔐 Interactive WebRTC Room</option>
                        <option value="google-meet">🌐 External Google Meet Link</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={schedulingLoading || courses.length === 0}
                    className="w-full rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white py-2.5 text-2xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95 disabled:bg-gray-150 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {schedulingLoading ? "Scheduling Stream..." : "🚀 Publish Live Broadcaster"}
                  </button>
                  
                </form>
              </Card>
            </div>

            {/* Right Column: Scheduled Live list (2/3 width) */}
            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Classroom broadcasting queue</h3>
              
              <Card className="p-5 bg-white border border-gray-150 rounded-3xl space-y-4">
                
                {liveClasses.length === 0 ? (
                  <div className="py-16 text-center space-y-2 select-none">
                    <Tv className="h-12 w-12 text-gray-300 mx-auto stroke-1 animate-pulse" />
                    <p className="text-xs text-gray-420 font-semibold font-sans">No classroom broadcast schedules exist currently.</p>
                    <p className="text-4xs text-gray-400 max-w-xs font-mono mx-auto leading-relaxed">Fill out the scheduling form on the left to spawn immediate Live streams and trigger student push notifications.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {liveClasses.map((lc) => {
                      const isLive = lc.status === "live";
                      const isEnded = lc.status === "ended";

                      return (
                        <div key={lc.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 transition-all hover:bg-indigo-50/15 -mx-2 px-2 rounded-xl">
                          <div className="space-y-1 text-left min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-4xs font-mono font-black text-indigo-500 uppercase tracking-wider leading-none">
                                {lc.courseName}
                              </span>
                              {isLive && (
                                <span className="animate-pulse bg-rose-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md leading-none flex items-center gap-1 shrink-0 shadow-3xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> streaming live
                                </span>
                              )}
                              {isEnded && (
                                <span className="bg-gray-100 text-gray-500 font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md leading-none shrink-0 border border-gray-150">
                                  Concluded
                                </span>
                              )}
                              {!isLive && !isEnded && (
                                <span className="bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md leading-none shrink-0 font-sans">
                                  Scheduled
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs font-black text-gray-800 leading-snug truncate">
                              {lc.title}
                            </h5>

                            <div className="flex flex-wrap items-center gap-3 text-gray-420 font-mono text-[10px]">
                              <span className="flex items-center gap-1 font-semibold text-gray-600">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                {lc.date}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-gray-600">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {lc.time} ({lc.duration} Mins)
                              </span>
                              <span className="text-4xs font-semibold text-indigo-500 uppercase font-mono bg-indigo-50 px-1.5 py-0.5 rounded-md leading-none border border-indigo-100/50">
                                {lc.meetingType}
                              </span>
                            </div>

                            {lc.description && (
                              <p className="text-4xs text-gray-450 font-sans italic truncate max-w-lg">
                                Agenda: &ldquo;{lc.description}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {/* Toggle Live buttons */}
                            {isEnded ? (
                              <span className="text-[9px] text-gray-400 font-black uppercase bg-gray-55 px-2.5 py-1.5 rounded-xl block border border-gray-150 select-none">
                                Session Concluded
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateClassStatus(lc.id, isLive ? "ended" : "live")}
                                  className={`px-3 py-1.5 rounded-xl text-4xs font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-95 ${
                                    isLive
                                      ? "bg-rose-600 text-white hover:bg-rose-700"
                                      : "bg-emerald-650 text-white hover:bg-emerald-700"
                                  }`}
                                >
                                  {isLive ? "⏹ End Broadcaster" : "🔴 Start session live"}
                                </button>

                                {isLive && lc.meetingType === "webrtc" && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveLiveRoom(lc)}
                                    className="px-3 py-1.5 bg-indigo-650 text-white hover:bg-indigo-700 rounded-xl text-4xs font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1"
                                  >
                                    Join Room
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </Card>
            </div>

          </div>
        )}

      </div>

      {activeLiveRoom && (
        <LiveClassroomRoom
          liveClass={activeLiveRoom}
          user={user}
          onClose={() => {
            setActiveLiveRoom(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
