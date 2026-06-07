export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  category: string;
  coverImage: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lessonsCount: number;
  studentsEnrolled: number;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number; // Percentage (e.g., 40 for 40%)
  completedLessons: string[]; // List of lessonIds
  enrolledAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string; // Markdown or Rich Text
  durationMin: number;
  sequenceOrder: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description: string;
  maxPoints: number;
  dueDate: string;
  files?: { name: string; url: string }[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  submittedContent: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  submittedFile?: { name: string; url: string };
}

export interface ForumPost {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  createdAt: string;
  repliesCount: number;
}

export interface ForumComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  courseId: string;
  userId: string;
  sender: 'user' | 'ai';
  message: string;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  date: string; // e.g. "2026-06-07"
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
}

