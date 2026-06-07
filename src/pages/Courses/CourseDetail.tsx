import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader } from "../../components/Card";
import { 
  ArrowLeft, 
  BookOpen, 
  PenTool, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  Check, 
  Paperclip, 
  Send,
  User as UserIcon,
  Upload,
  Plus,
  Trash2,
  Layers,
  ThumbsUp
} from "lucide-react";
import api from "../../services/api";

interface CourseDetailProps {
  courseId: string;
  onGoBack: () => void;
  initialTab?: "syllabus" | "assignments" | "forum" | "ai_tutor";
}

export const CourseDetail: React.FC<CourseDetailProps> = ({ courseId, onGoBack, initialTab }) => {
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // State Tabs choices
  const [activeTab, setActiveTab] = useState<"syllabus" | "assignments" | "forum" | "ai_tutor">(initialTab || "syllabus");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Selected details
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  // Submissions state
  const [submissionTexts, setSubmissionTexts] = useState<Record<string, string>>({});
  const [submittingFiles, setSubmittingFiles] = useState<Record<string, { name: string, url: string } | null>>({});
  const [uploadingSubFile, setUploadingSubFile] = useState<Record<string, boolean>>({});

  // Forum state
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState({ title: "", content: "" });
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [forumSearchQuery, setForumSearchQuery] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // AI Tutor state
  const [aiChatLogs, setAiChatLogs] = useState<any[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiWriting, setAiWriting] = useState(false);

  const [loading, setLoading] = useState(true);

  const loadAllCourseData = async () => {
    try {
      const [courseRes, lessonsRes, enrollsRes, assignsRes, subsRes, forumRes] = await Promise.all([
        api.get("/courses"),
        api.get(`/courses/${courseId}/lessons`),
        api.get(`/users/${user?.id}/enrollments`),
        api.get(`/courses/${courseId}/assignments`),
        api.get(`/users/${user?.id}/submissions`),
        api.get(`/courses/${courseId}/forum`)
      ]);

      const matchedCourse = courseRes.data.find((c: any) => c.id === courseId);
      setCourse(matchedCourse);

      const sortedLessons = lessonsRes.data.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
      setLessons(sortedLessons);
      if (sortedLessons.length > 0) {
        setSelectedLesson(sortedLessons[0]);
      }

      setEnrollment(enrollsRes.data.find((e: any) => e.courseId === courseId));
      setAssignments(assignsRes.data);
      setSubmissions(subsRes.data.filter((s: any) => s.courseId === courseId));
      setForumPosts(forumRes.data);

      // Load AI Chat histories
      const aiHist = await api.get(`/ai/history/${courseId}/${user?.id}`);
      setAiChatLogs(aiHist.data);

    } catch (err) {
      console.error("Failed to compile Course Details bundle:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCourseData();
  }, [courseId, user]);

  const handleCompleteChapter = async (lessonId: string) => {
    if (!user || !enrollment) return;
    try {
      const response = await api.post("/enrollments/complete-lesson", {
        studentId: user.id,
        courseId,
        lessonId
      });
      setEnrollment(response.data);
      
      // Auto advance to next chapter order if exists
      const currentOrder = selectedLesson?.sequenceOrder || 1;
      const nextL = lessons.find(l => l.sequenceOrder === currentOrder + 1);
      if (nextL) {
        setSelectedLesson(nextL);
      }
    } catch (err) {
      console.error("Failed to mark lesson completed:", err);
    }
  };

  const isLessonCompleted = (id: string) => {
    return enrollment?.completedLessons?.includes(id) || false;
  };

  const handlePostSubmission = async (e: React.FormEvent, assignId: string) => {
    e.preventDefault();
    const txt = submissionTexts[assignId];
    if (!txt || !user) return;

    try {
      const response = await api.post("/submissions", {
        assignmentId: assignId,
        courseId,
        studentId: user.id,
        studentName: user.name,
        submittedContent: txt,
        submittedFile: submittingFiles[assignId] || null
      });
      setSubmissions(prev => [...prev.filter(s => s.assignmentId !== assignId), response.data]);
      // clear the local file attachment
      setSubmittingFiles(prev => ({ ...prev, [assignId]: null }));
      alert("Your homework answer was posted successfully to Dr Marcus Vance's Grading desk!");
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  // Forum Methods
  const handleCreateForumPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const response = await api.post(`/courses/${courseId}/forum`, {
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        title: newTopic.title,
        content: newTopic.content
      });
      setForumPosts(prev => [response.data, ...prev]);
      setShowAddTopic(false);
      setNewTopic({ title: "", content: "" });
    } catch (err) {
      console.error("Forum post failed", err);
    }
  };

  const viewPostReplies = async (postId: string) => {
    setActivePostId(postId);
    try {
      const commentsRes = await api.get(`/forum/${postId}/comments`);
      setPostComments(commentsRes.data);
    } catch (err) {
      console.error("Failed to gather responses comments", err);
    }
  };

  const handleTogglePostLike = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.post(`/forum/${postId}/like`);
      setForumPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: res.data.likes } : p));
    } catch (err) {
      console.error("Failed to like thread", err);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    try {
      const res = await api.post(`/forum/comments/${commentId}/like`);
      setPostComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: res.data.likes } : c));
    } catch (err) {
      console.error("Failed to like comment", err);
    }
  };

  const handlePostCommentReply = async (commentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePostId || !replyText.trim()) return;
    try {
      const response = await api.post(`/forum/${activePostId}/comments`, {
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        content: replyText,
        parentId: commentId
      });
      setPostComments(prev => [...prev, response.data]);
      setReplyText("");
      setActiveReplyCommentId(null);

      // update count
      setForumPosts(prev =>
        prev.map(p => (p.id === activePostId ? { ...p, repliesCount: (p.repliesCount || 0) + 1 } : p))
      );
    } catch (err) {
      console.error("Failed to submit reply thread", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePostId || !commentText) return;
    try {
      const response = await api.post(`/forum/${activePostId}/comments`, {
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        content: commentText
      });
      setPostComments(prev => [...prev, response.data]);
      setCommentText("");
      
      // Update replies count in list
      setForumPosts(prev =>
        prev.map(p => (p.id === activePostId ? { ...p, repliesCount: (p.repliesCount || 0) + 1 } : p))
      );
    } catch (err) {
      console.error("Post response comment failed", err);
    }
  };

  // AI Tutor Methods
  const handleQueryAiTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !user || aiWriting) return;

    const currentMsg = aiQuery;
    setAiQuery("");
    setAiWriting(true);

    // Push instant user message local log
    const userMsg = {
      id: `local_${Date.now()}`,
      sender: "user" as const,
      message: currentMsg,
      timestamp: new Date().toISOString()
    };
    setAiChatLogs(prev => [...prev, userMsg]);

    try {
      const response = await api.post("/ai/chat", {
        courseId,
        userId: user.id,
        message: currentMsg,
        courseTitle: course?.title,
        lessonTitle: selectedLesson?.title
      });

      const aiMsg = {
        id: `local_ai_${Date.now()}`,
        sender: "ai" as const,
        message: response.data.reply,
        timestamp: new Date().toISOString()
      };
      setAiChatLogs(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI query crashed:", err);
    } finally {
      setAiWriting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Dynamic Navigation Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGoBack}
          className="rounded-xl border border-gray-100 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer"
          title="Return to desk"
          id="detail_back_btn"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none">COURSE DETAILED WORKSPACE</h2>
          <p className="text-xs font-bold text-gray-850 mt-1">{course?.title}</p>
        </div>
      </div>

      {/* Tabs navigation list */}
      <div className="flex border-b border-gray-100">
        {(["syllabus", "assignments", "forum", "ai_tutor"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              // Clean nested thread trackers
              setActivePostId(null);
            }}
            className={`border-b-2 px-6 py-3 text-xs font-bold leading-none transition-all cursor-pointer ${
              activeTab === tab
                ? "border-b-blue-600 text-blue-600 font-extrabold"
                : "border-b-transparent text-gray-400 hover:text-gray-700"
            }`}
            id={`tab_select_${tab}`}
          >
            {tab === "syllabus" && "Syllabus Content"}
            {tab === "assignments" && "Homework Tasks"}
            {tab === "forum" && "Peer forums discussion"}
            {tab === "ai_tutor" && "Socrates AI Tutor ✦"}
          </button>
        ))}
      </div>

      {/* Main active sub-view area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Column depending on active Tabs */}
        <div className="space-y-4 lg:col-span-2">
          
          {/* SYLLABUS LESSON VIEWER */}
          {activeTab === "syllabus" && (
            <div className="space-y-4">
              {/* Learning Handouts / Supplementary Packets */}
              {course?.materials && course.materials.length > 0 && (
                <Card className="border-sky-200 bg-sky-50/5 p-4 rounded-xl">
                  <span className="block text-[8px] font-mono font-black uppercase text-sky-700 tracking-wider mb-2">✦ Suppplementary Syllabus materials, Handouts & study pack</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {course.materials.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-150/50 hover:border-sky-300 transition-all font-sans">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="bg-sky-100 text-sky-700 font-mono font-bold text-[9px] min-w-8 p-1.5 rounded-md text-center shrink-0">
                            {m.type === "PDF Document" ? "PDF" : m.type === "Slide Deck" ? "SLIDE" : m.type === "Code Archive" ? "ZIP" : "VIDEO"}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-extrabold text-gray-800 truncate leading-snug">{m.name}</p>
                            <p className="text-[8px] font-mono text-gray-400 block leading-none mt-0.5">Supplementary Handout</p>
                          </div>
                        </div>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-3xs px-3 py-1.5 rounded-lg shrink-0 select-none cursor-pointer"
                        >
                          View / Download
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {lessons.length === 0 ? (
                <Card className="py-12 text-center text-xs text-gray-400">
                  <span>Professor has not submitted course lessons yet. Check back soon.</span>
                </Card>
              ) : selectedLesson ? (
                <Card className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-blue-600 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> EST. Study Duration: {selectedLesson.durationMin} Minutes
                      </span>
                      <h3 className="text-sm font-black leading-none mt-1.5 text-gray-800">
                        {selectedLesson.title}
                      </h3>
                    </div>
                    {isLessonCompleted(selectedLesson.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-4xs font-bold text-emerald-800">
                        <Check className="h-3 w-3" /> Completed
                      </span>
                    ) : (
                      user?.role === "student" && (
                        <button
                          onClick={() => handleCompleteChapter(selectedLesson.id)}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-3xs font-bold text-white shadow-xs hover:bg-blue-700"
                        >
                          Mark Finished
                        </button>
                      )
                    )}
                  </div>

                  {/* Syllabus markdown representation body */}
                  <div className="rounded-xl bg-gray-50/50 p-5 border border-gray-100/50 text-left font-sans text-xs text-gray-700 italic leading-relaxed whitespace-pre-wrap">
                    {selectedLesson.content}
                  </div>
                </Card>
              ) : null}
            </div>
          )}

          {/* ASSIGNMENTS SUBMISSION CENTER */}
          {activeTab === "assignments" && (
            <div className="space-y-4">
              {assignments.length === 0 ? (
                <Card className="py-12 text-center text-xs text-gray-400 font-medium">No published homework tasks for this course catalog.</Card>
              ) : (
                assignments.map((as: any) => {
                  const subm = submissions.find(s => s.assignmentId === as.id);
                  const isGraded = subm?.grade !== undefined;
                  const currentText = submissionTexts[as.id] || "";

                  return (
                    <Card key={as.id} className="space-y-4 hover:border-blue-100 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-800">{as.title}</h4>
                          <span className="text-4xs text-gray-400 block mt-0.5">
                            Est. Points: {as.maxPoints} pts &bull; Due till: {new Date(as.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        {isGraded ? (
                          <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 text-3xs font-black text-emerald-850">
                            Score Card: {subm.grade}/100
                          </span>
                        ) : subm ? (
                          <span className="inline-block rounded-md bg-yellow-100 px-2.5 py-1 text-3xs font-bold text-yellow-800">
                            Submitted - Awaiting Grade
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-blue-100 px-2.5 py-1 text-3xs font-black text-blue-800 uppercase tracking-widest">
                            Assigned
                          </span>
                        )}
                      </div>

                      {/* Prompt description */}
                      <div className="rounded-lg bg-gray-50 p-3.5 border border-gray-100/40 text-left space-y-3">
                        <div>
                          <span className="block text-5xs font-mono font-bold text-gray-400 mb-1 leading-none uppercase">TASK DIRECTIONS PROMPTS:</span>
                          <p className="text-3xs text-gray-650 font-serif leading-relaxed italic">{as.description}</p>
                        </div>

                        {/* Reference files attached by teacher */}
                        {as.files && as.files.length > 0 && (
                          <div className="space-y-1.5 pt-2.5 border-t border-dashed border-gray-150 text-left font-sans">
                            <span className="block text-4xs font-mono font-bold text-gray-500 uppercase">Instructional Reference Materials ({as.files.length}):</span>
                            <div className="flex flex-wrap gap-2">
                              {as.files.map((f: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] bg-white border border-gray-200 text-blue-700 font-extrabold hover:bg-gray-50 rounded px-2 py-1 inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                  title="View instruction file"
                                >
                                  <Paperclip className="h-2.5 w-2.5 text-gray-450" />
                                  <span>{f.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Custom input submission forms */}
                      {user?.role === "student" && !isGraded && (
                        <form onSubmit={(e) => handlePostSubmission(e, as.id)} className="space-y-3.5">
                          <div>
                            <label className="block text-4xs font-mono font-bold text-gray-400 mb-1">YOUR HOMEWORK ANSWER ESSAY OR CODE BLOCK</label>
                            <textarea
                              rows={5}
                              required
                              placeholder="Type out your calculations, explanations or code strings here..."
                              value={currentText}
                              onChange={e => setSubmissionTexts({...submissionTexts, [as.id]: e.target.value})}
                              className="w-full rounded-xl border border-gray-200 p-4 text-xs font-mono bg-white outline-hidden focus:border-blue-500"
                            />
                          </div>

                          {/* File submit drag-and-drop simulated zone */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-4xs font-mono font-bold text-gray-400">UPLOAD PDF / DOCX COMPLEMENTARY PAPER (OPTIONAL):</label>
                            <div
                              onClick={() => {
                                setUploadingSubFile(prev => ({ ...prev, [as.id]: true }));
                                setTimeout(() => {
                                  setUploadingSubFile(prev => ({ ...prev, [as.id]: false }));
                                  const mockDocs = [
                                    { name: "My_Lab_Assignment_Draft_v2.pdf", url: "https://example-lms-cdn.net/submissions/docs/My_Lab_Assignment_Draft_v2.pdf" },
                                    { name: "Socrates_Case_Study_Draft_Final.docx", url: "https://example-lms-cdn.net/submissions/docs/Socrates_Case_Study_Draft_Final.docx" },
                                    { name: "Interactive_Curriculum_Evaluation.pdf", url: "https://example-lms-cdn.net/submissions/docs/Interactive_Curriculum_Evaluation.pdf" }
                                  ];
                                  const matchedDoc = mockDocs[Math.floor(Math.random() * mockDocs.length)];
                                  setSubmittingFiles(prev => ({ ...prev, [as.id]: matchedDoc }));
                                }, 1000);
                              }}
                              className="border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-4 bg-blue-50/5 cursor-pointer hover:bg-blue-50/15 transition-all text-center group"
                            >
                              {uploadingSubFile[as.id] ? (
                                <div className="space-y-1 font-mono text-3xs text-blue-700 animate-pulse">
                                  <Layers className="animate-spin text-blue-600 h-4.5 w-4.5 mx-auto" style={{ display: 'block' }} />
                                  <span>Extracting and uploading document properties...</span>
                                </div>
                              ) : submittingFiles[as.id] ? (
                                <div className="flex items-center justify-between bg-white border border-blue-150 p-2 rounded-xl">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <div className="bg-blue-100 text-blue-800 font-mono font-black text-[8px] px-2 py-0.5 rounded uppercase">
                                      {submittingFiles[as.id]?.name.endsWith(".docx") ? "DOCX" : "PDF"}
                                    </div>
                                    <span className="text-3xs text-gray-700 font-bold truncate leading-none">{submittingFiles[as.id]?.name}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubmittingFiles(prev => ({ ...prev, [as.id]: null }));
                                    }}
                                    className="text-gray-450 hover:text-rose-600 p-1 rounded-lg shrink-0 text-3xs font-bold font-mono"
                                  >
                                    ✕ Remove File
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1 text-gray-500">
                                  <Upload className="h-4 w-4 text-blue-500 mx-auto group-hover:scale-110 transition-all" style={{ display: 'block' }} />
                                  <p className="text-3xs text-blue-850 font-extrabold font-sans">Simulate Dragging or Selecting PDF/DOCX paper</p>
                                  <p className="text-[9px] font-mono text-gray-400">Accepted files: standard PDF/DOCX up to 25MB</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-3xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer active:scale-95"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>{subm ? "Overwrite Submit Answer" : "Submit Answer"}</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Display critique feedbacks from teachers if graded */}
                      {subm && (
                        <div className="rounded-2xl bg-gray-50/50 p-4 border border-gray-100 space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-5xs font-mono font-bold text-gray-400 block text-left uppercase">MY RECORDED ANSWERS CONTENT:</span>
                            <p className="text-3xs font-mono mt-0.5 text-gray-700 bg-white p-2.5 rounded border border-gray-100 text-left whitespace-pre-wrap italic">&ldquo;{subm.submittedContent}&ldquo;</p>
                            
                            {subm.submittedFile && (
                              <div className="mt-3.5 p-3 bg-blue-50/15 border border-blue-100/50 rounded-xl flex items-center justify-between text-left font-sans">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="bg-blue-100 text-blue-800 font-mono font-black text-[9px] px-2 py-0.5 rounded-md text-center uppercase">
                                    {subm.submittedFile.name.endsWith(".docx") ? "DOCX" : "PDF"}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-extrabold text-blue-900 truncate leading-snug">{subm.submittedFile.name}</p>
                                    <p className="text-[8px] font-mono text-gray-400 block leading-none mt-0.5">My Attached Submission Document</p>
                                  </div>
                                </div>
                                <a
                                  href={subm.submittedFile.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-[9px] px-3 py-1.5 rounded-lg shrink-0 select-none cursor-pointer"
                                >
                                  Open Attached Document
                                </a>
                              </div>
                            )}
                          </div>
                          {isGraded && (
                            <div className="pt-2 border-t border-dashed border-gray-200">
                              <span className="text-5xs font-mono font-bold text-gray-400 block text-emerald-700 text-left">INSTRUCTOR CORRECTION CRITIQUE COMMENT:</span>
                              <p className="text-3xs font-serif italic mt-0.5 text-gray-700 text-left leading-normal font-sans">&ldquo;{subm.feedback || 'Excellent understanding of parameters.'}&ldquo;</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* PEER DISCUSSION FORUMS */}
          {activeTab === "forum" && (
            <div className="space-y-4">
              
              {!activePostId ? (
                // Post Lists View
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-400">Class Discussion Forums</h4>
                      <p className="text-[10px] text-gray-500 font-sans mt-0.5">Explore active course-wise topics, like key points, or create new study threads</p>
                    </div>
                    <button
                      onClick={() => setShowAddTopic(!showAddTopic)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-3xs font-bold text-white shadow-xs hover:bg-blue-700 leading-none self-start cursor-pointer active:scale-95 transition-all"
                    >
                      + Create Thread Topic
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-150 flex gap-2">
                    <input
                      type="text"
                      placeholder="🔍 Search general discussions by title, content, or author..."
                      value={forumSearchQuery}
                      onChange={e => setForumSearchQuery(e.target.value)}
                      className="flex-grow rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs outline-hidden"
                    />
                    {forumSearchQuery && (
                      <button
                        onClick={() => setForumSearchQuery("")}
                        className="rounded-lg px-2.5 bg-gray-255 text-gray-600 hover:bg-gray-300 text-3xs font-bold leading-none"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Form to submit a dynamic thread topic */}
                  {showAddTopic && (
                    <Card className="bg-blue-50/20 border-blue-100">
                      <form onSubmit={handleCreateForumPost} className="space-y-3 text-left">
                        <h4 className="text-xs font-semibold text-gray-800">Launch Thread Topic</h4>
                        <div>
                          <label className="block text-4xs font-mono text-gray-400 mb-0.5 font-bold">TOPIC HEADER TITLE</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Help understanding modular CSS loops?"
                            value={newTopic.title}
                            onChange={e => setNewTopic({...newTopic, title: e.target.value})}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-4xs font-mono text-gray-400 mb-0.5 font-bold">DISCUSSION PARAGRAPH CONTENT</label>
                          <textarea
                            rows={3}
                            required
                            placeholder="Write down questions, opinions, or study findings..."
                            value={newTopic.content}
                            onChange={e => setNewTopic({...newTopic, content: e.target.value})}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs outline-hidden"
                          />
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddTopic(false)}
                            className="rounded-xl px-3 py-1.5 bg-white border border-gray-200 text-4xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded-xl px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 text-4xs font-bold"
                          >
                            Post Thread
                          </button>
                        </div>
                      </form>
                    </Card>
                  )}

                  <div className="space-y-3">
                    {(() => {
                      const filtered = forumPosts.filter(p => {
                        const search = forumSearchQuery.toLowerCase();
                        return (
                          !search ||
                          p.title?.toLowerCase().includes(search) ||
                          p.content?.toLowerCase().includes(search) ||
                          p.authorName?.toLowerCase().includes(search)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center rounded-2xl border border-dashed border-gray-150 bg-gray-50/20">
                            <p className="text-xs text-gray-400">No discussion threads found matching &ldquo;{forumSearchQuery}&rdquo;</p>
                            <p className="text-4xs text-gray-400 mt-1">Try other search terms or launch a new topic yourself.</p>
                          </div>
                        );
                      }

                      return filtered.map(post => {
                        const userLiked = user && post.likes && post.likes.includes(user.id);
                        return (
                          <Card key={post.id} className="text-left select-none hover:shadow-md hover:border-gray-200 transition-all">
                            <div className="flex justify-between items-start">
                              <span className="text-5xl font-mono text-indigo-600 uppercase font-black tracking-wide">
                                {post.authorRole} CLASS THREAD
                              </span>
                              
                              {/* Post Likes Toggle */}
                              <button
                                onClick={(e) => handleTogglePostLike(post.id, e)}
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  userLiked 
                                    ? "bg-rose-50 border-rose-205 text-rose-600 font-bold" 
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span>{post.likes ? post.likes.length : 0} Likes</span>
                              </button>
                            </div>
                            
                            <h4 className="text-xs font-extrabold text-gray-850 mt-1">{post.title}</h4>
                            <p className="text-3xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{post.content}</p>
                            
                            <div className="mt-3.5 pt-3 border-t border-gray-50 flex items-center justify-between text-4xs text-gray-400">
                              <span>Author: <strong className="text-gray-700">{post.authorName}</strong> &bull; {new Date(post.createdAt).toLocaleDateString()}</span>
                              <button
                                onClick={() => viewPostReplies(post.id)}
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline hover:text-blue-700 font-sans cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{post.repliesCount || 0} comments</span>
                              </button>
                            </div>
                          </Card>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                // Thread Comments Viewer
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActivePostId(null)}
                      className="text-4xs font-mono font-bold text-gray-400 hover:text-gray-800 py-1 cursor-pointer"
                    >
                      &larr; Back to forum threads catalog
                    </button>
                  </div>

                  {/* Root Post Card */}
                  {(() => {
                    const postObj = forumPosts.find(p => p.id === activePostId);
                    if (!postObj) return null;
                    const userLiked = user && postObj.likes && postObj.likes.includes(user.id);
                    return (
                      <Card className="text-left bg-gray-50/20">
                        <div className="flex justify-between items-start">
                          <span className="text-5xs font-mono text-indigo-600 uppercase font-bold">{postObj.authorRole} Profile</span>
                          
                          <button
                            onClick={() => handleTogglePostLike(postObj.id)}
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              userLiked 
                                ? "bg-rose-50 border-rose-205 text-rose-600 font-bold" 
                                : "bg-white border-gray-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>{postObj.likes ? postObj.likes.length : 0} Likes</span>
                          </button>
                        </div>
                        <h4 className="text-xs font-black text-gray-850 mt-1 leading-snug">{postObj.title}</h4>
                        <p className="text-3xs text-gray-650 font-serif leading-relaxed mt-2 italic whitespace-pre-wrap">{postObj.content}</p>
                        <p className="text-5xs text-gray-400 font-mono mt-3">Author: {postObj.authorName} &bull; {new Date(postObj.createdAt).toLocaleTimeString()}</p>
                      </Card>
                    );
                  })()}

                  {/* Comment Thread */}
                  <div className="space-y-3.5">
                    <h5 className="text-5xs font-mono font-bold text-gray-400 tracking-wider">RESPONSES COMMENTS IN CLASSROOM INDEX</h5>
                    {(() => {
                      const rootComments = postComments.filter(c => !c.parentId);
                      if (rootComments.length === 0) {
                        return <p className="text-4xs font-mono text-gray-450 italic py-4 block">No comment replies in thread. Start the conversation below!</p>;
                      }

                      return rootComments.map(comment => {
                        const childComments = postComments.filter(c => c.parentId === comment.id);
                        const userCommentLiked = user && comment.likes && comment.likes.includes(user.id);
                        return (
                          <div key={comment.id} className="rounded-xl border border-gray-150 bg-white p-3.5 text-left text-3xs space-y-2 shadow-2xs">
                            <div className="flex justify-between items-center text-5xs text-gray-400">
                              <span className="font-bold text-gray-700">{comment.authorName} ({comment.authorRole})</span>
                              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-650 leading-relaxed font-sans">{comment.content}</p>
                            
                            {/* Actions line for Root comment */}
                            <div className="flex gap-2 items-center text-[10px] pt-1.5 border-t border-gray-50">
                              <button
                                onClick={() => handleToggleCommentLike(comment.id)}
                                className={`inline-flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded-md ${
                                  userCommentLiked ? "text-rose-600 font-bold animate-tick" : "text-gray-400"
                                }`}
                              >
                                <ThumbsUp className="h-2.5 w-2.5" />
                                <span>{comment.likes ? comment.likes.length : 0} Likes</span>
                              </button>

                              <span className="text-gray-300">|</span>

                              <button
                                onClick={() => {
                                  setActiveReplyCommentId(activeReplyCommentId === comment.id ? null : comment.id);
                                  setReplyText("");
                                }}
                                className="text-blue-600 hover:underline font-bold cursor-pointer"
                              >
                                {activeReplyCommentId === comment.id ? "Cancel Reply" : "Reply"}
                              </button>
                            </div>

                            {/* Inline Reply Input Block */}
                            {activeReplyCommentId === comment.id && (
                              <form onSubmit={(e) => handlePostCommentReply(comment.id, e)} className="flex items-center gap-1.5 pt-2 border-t border-dashed border-gray-100">
                                <span className="text-4xs font-mono text-gray-400">@reply:</span>
                                <input
                                  type="text"
                                  required
                                  placeholder="Type your response to this user..."
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  className="flex-grow rounded-lg border border-gray-200 px-2 py-1 text-4xs bg-slate-50 outline-hidden"
                                />
                                <button
                                  type="submit"
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-3 py-1 text-3xs cursor-pointer"
                                >
                                  Post
                                </button>
                              </form>
                            )}

                            {/* Thread Indented Responses */}
                            {childComments.length > 0 && (
                              <div className="ml-5 mt-2 pt-2 border-l-2 border-indigo-50 pl-3.5 space-y-2 bg-slate-50/30 rounded-r-lg">
                                {childComments.map(child => {
                                  const userSubLiked = user && child.likes && child.likes.includes(user.id);
                                  return (
                                    <div key={child.id} className="text-[10px] space-y-1 p-1">
                                      <div className="flex justify-between text-5xs text-gray-400 font-medium">
                                        <span className="font-extrabold text-indigo-750">{child.authorName} ({child.authorRole})</span>
                                        <span>{new Date(child.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-gray-650 leading-snug">{child.content}</p>
                                      
                                      <div className="flex items-center gap-1.5 pt-0.5">
                                        <button
                                          onClick={() => handleToggleCommentLike(child.id)}
                                          className={`inline-flex items-center gap-1 cursor-pointer text-4xs ${
                                            userSubLiked ? "text-rose-600 font-black animate-tick" : "text-gray-400 hover:text-gray-600"
                                          }`}
                                        >
                                          <ThumbsUp className="h-2 w-2" />
                                          <span>{child.likes ? child.likes.length : 0} Likes</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Comment Form */}
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Input supportive comments or question parameters regarding this topic..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      className="flex-grow rounded-xl border border-gray-250 bg-white px-3.5 py-2.5 text-xs outline-hidden"
                    />
                    <button
                      type="submit"
                      className="rounded-xl px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Post Reply comment"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* SOCRATES AI STUDY GUIDE */}
          {activeTab === "ai_tutor" && (
            <div className="space-y-4">
              <Card className="flex flex-col h-[32rem] justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">✦</div>
                      <div>
                        <h4 className="text-xs font-black text-gray-800">Socrates-AI Study Guide</h4>
                        <p className="text-5xs font-mono text-gray-400">Powered by Gemini 3.5 Flash Model Integration</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg">Online</span>
                  </div>

                  {/* Conversational container window */}
                  <div className="space-y-3.5 max-h-[22rem] overflow-y-auto pr-1 text-left scrollbar-thin">
                    <div className="rounded-xl bg-blue-50/50 p-3.5 text-3xs border border-blue-100/30">
                      <p className="font-bold text-blue-800 leading-none mb-1">How can I assist you with: &rdquo;{course?.title}&rdquo; today?</p>
                      <p className="text-gray-500 leading-relaxed mt-1">
                        I can extract textbook parameters, debug codes, explain topics, draft study matrices, or provide context regarding current lessons. Ask away!
                      </p>
                    </div>

                    {aiChatLogs.map((chat) => {
                      const isAi = chat.sender === "ai";
                      return (
                        <div
                          key={chat.id}
                          className={`flex ${isAi ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`rounded-2xl p-3.5 max-w-lg text-3xs shadow-xs leading-relaxed leading-normal ${
                              isAi
                                ? "bg-gray-100 text-gray-800 border border-gray-150 text-left font-sans"
                                : "bg-blue-600 text-white text-left font-mono"
                            }`}
                          >
                            <span className="block text-[8px] font-mono font-bold uppercase mb-1 tracking-wider opacity-60">
                              {isAi ? "Socrates-AI" : "Scholar"} &bull; {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="whitespace-pre-wrap">{chat.message}</div>
                          </div>
                        </div>
                      );
                    })}

                    {aiWriting && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl p-4 bg-gray-50 border border-gray-100 text-left">
                          <p className="text-3xs italic text-gray-400 font-mono animate-pulse">Socrates-AI logic module calculating response...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input form */}
                <form onSubmit={handleQueryAiTutor} className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={aiWriting}
                    placeholder={`Ask AI about "${selectedLesson?.title || 'this course'}"...`}
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    className="flex-grow rounded-xl border border-gray-250 bg-white px-4 py-3 text-xs outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={aiWriting}
                    className={`rounded-xl px-5 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center shadow-md shadow-blue-100 active:scale-95 ${
                      aiWriting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Send query message to Gemini Tutor"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </Card>
            </div>
          )}

        </div>

        {/* Right Column (Always visible context syllabus navigation blocks!) */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">Chapters Index</h3>
          <Card className="space-y-3 p-4">
            <CardHeader title="Syllabus Progress Tracker" subtitle="Select active chapters to read" />
            
            <div className="space-y-2 max-h-[25rem] overflow-y-auto">
              {lessons.map(les => {
                const isSelected = selectedLesson?.id === les.id;
                const completed = isLessonCompleted(les.id);

                return (
                  <button
                    key={les.id}
                    onClick={() => {
                      setSelectedLesson(les);
                      setActiveTab("syllabus"); // Auto toggle back to reader view
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
                      isSelected
                        ? "bg-blue-50/40 border border-blue-400/40 text-blue-900 shadow-xs"
                        : "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mt-0.5">
                      {completed ? (
                        <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-2xs font-bold">
                          {les.sequenceOrder}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="text-3xs font-extrabold leading-none">{les.title}</h5>
                      <span className="text-5xs text-gray-400 block mt-1">Duration: {les.durationMin} Min</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Overall enrollment metrics card */}
            {user?.role === "student" && enrollment && (
              <div className="mt-4 border-t border-gray-100 pt-3 text-left">
                <span className="block text-[8px] font-mono uppercase text-gray-400">MY LEARNING STATUS TRACK</span>
                <div className="mt-2 text-3xs text-gray-600 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Lessons finished count:</span>
                    <span className="font-bold text-gray-800">{enrollment.completedLessons?.length} / {lessons.length} chapters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calculated overall progress:</span>
                    <span className="font-bold text-blue-600">{enrollment.progress}% progress</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};
