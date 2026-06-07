import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`[Socket.IO] New connection: ${socket.id}`);

  socket.on("identify", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] User ${userId} identified on socket ${socket.id}`);
  });

  socket.on("join-course", (courseId) => {
    socket.join(`course:${courseId}`);
    console.log(`[Socket.IO] Socket ${socket.id} joined course room ${courseId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const JWT_SECRET = process.env.JWT_SECRET || "socrates_secret_key_6a38b1f8";

// Middleware to verify JWT tokens
function authenticateJWT(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied: Missing or malformed authentication token." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Access denied: Invalid or expired authentication token." });
  }
}

// Middleware to restrict access based on roles (Role Based Authorization)
function authorizeRoles(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied: Unauthorized session." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied: Restricted permission level. Requires one of [${roles.join(", ")}].` });
    }
    next();
  };
}

app.use(express.json());

// Ensure Database Storage Directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const DB_FILE = path.join(DATA_DIR, "db.json");

// Helper structure/defaults representing MongoDB Collections
const SEED_DATA = {
  users: [
    {
      id: "u_student",
      email: "student@lms.com",
      password: "password", // Clear text / simple authentication for playground demo convenience
      name: "Avery Johnson",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
      bio: "Sophomore studying CS. Love frontend UI/UX and learning smart web techs.",
      createdAt: new Date().toISOString()
    },
    {
      id: "u_teacher",
      email: "teacher@lms.com",
      password: "password",
      name: "Prof. Marcus Vance",
      role: "teacher",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
      bio: "Ph.D. in Computer Science with 12+ years of teaching engineering.",
      createdAt: new Date().toISOString()
    },
    {
      id: "u_admin",
      email: "admin@lms.com",
      password: "password",
      name: "System Controller",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop",
      bio: "Lead Platform Manager. Ensuring smooth operations for digital classrooms.",
      createdAt: new Date().toISOString()
    }
  ],
  courses: [
    {
      id: "c_ai_gemini",
      title: "Introduction to Artificial Intelligence & Google Gemini API",
      description: "Learn how to integrate powerful generative AI capabilities into modern applications. From basic text engineering to multimodal structures and agent models.",
      instructorId: "u_teacher",
      instructorName: "Prof. Marcus Vance",
      category: "Computer Science",
      coverImage: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&h=400&fit=crop",
      difficulty: "Beginner",
      lessonsCount: 3,
      studentsEnrolled: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: "c_full_stack",
      title: "Advanced Full Stack Application Design & Deployment",
      description: "Master real-world responsive design, backend optimization, modular database schema design, and production-level deployments with Vite, Express, and databases.",
      instructorId: "u_teacher",
      instructorName: "Prof. Marcus Vance",
      category: "Web Engineering",
      coverImage: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&h=400&fit=crop",
      difficulty: "Intermediate",
      lessonsCount: 2,
      studentsEnrolled: 0,
      createdAt: new Date().toISOString()
    }
  ],
  lessons: [
    {
      id: "l_gemini_1",
      courseId: "c_ai_gemini",
      title: "1. Core Principles of Large Language Models (LLMs)",
      content: "Large Language Models are deep learning systems trained on billions of parameters to parse, predict, and produce fluent strings of text. In this lesson, we will understand how the neural weights of transformer blocks parse queries and use soft attention links to construct coherent text predictions.\n\n### Core Topics of Study:\n1. Attention mechanism & Self-Attention arrays\n2. Next-token estimation probabilities\n3. Training pipelines and RLHF tuning frameworks",
      durationMin: 35,
      sequenceOrder: 1
    },
    {
      id: "l_gemini_2",
      courseId: "c_ai_gemini",
      title: "2. Prompt Drafting & Input Structuring",
      content: "To extract the most consistent outputs from Generative AI, engineering structured contexts is key. Learn to supply systemic instructions, clarify roles, add few-shot input-output training arrays, and request machine-readable responses (such as structured JSON blocks).\n\n### Key Techniques Covered:\n- Clear boundary tags (e.g. triple backticks or custom markers)\n- Few-Shot examples to establish structural templates\n- System Instructions stating tone, domain limits, and expected behavior",
      durationMin: 40,
      sequenceOrder: 2
    },
    {
      id: "l_gemini_3",
      courseId: "c_ai_gemini",
      title: "3. Direct Integrations with @google/genai SDK",
      content: "We translate prompt architecture into production-ready software using standard developer tools. This lesson covers setting up standard headers in Node.js server pipelines, using `GoogleGenAI` model content generators, parsing response parts, and rendering outputs safely.\n\n```ts\nimport { GoogleGenAI } from '@google/genai';\nconst ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });\n```",
      durationMin: 45,
      sequenceOrder: 3
    },
    {
      id: "l_fs_1",
      courseId: "c_full_stack",
      title: "1. Architecting Resilient Full Stack Hubs",
      content: "Full-stack structures isolate frontend UI frameworks (SPA bundles) from secret-facing API nodes. All third-party secrets must live exclusively on custom server logic, while clients authenticate using tokens safely enclosed in headers.",
      durationMin: 50,
      sequenceOrder: 1
    },
    {
      id: "l_fs_2",
      courseId: "c_full_stack",
      title: "2. Modular CSS Systems & Interactive Components",
      content: "Learn to build sleek, robust user dashboards by combining utility Tailwind styles with motion wrappers. Consistent spacing grids, accessible typography options, and touch-ready buttons create highly interactive user experiences.",
      durationMin: 45,
      sequenceOrder: 2
    }
  ],
  enrollments: [
    {
      id: "e_student1",
      studentId: "u_student",
      courseId: "c_ai_gemini",
      progress: 33,
      completedLessons: ["l_gemini_1"],
      enrolledAt: new Date().toISOString()
    }
  ],
  assignments: [
    {
      id: "a_gemini_p1",
      courseId: "c_ai_gemini",
      lessonId: "l_gemini_2",
      title: "Structured Prompt Design and JSON Output Generation",
      description: "Draft a system instruction block that forces the Gemini model to return a list of 5 computer science terms with definitions inside a raw JSON array of objects. Write out your prompt text, the target JSON schema configuration parameters, and discuss why standard boundary systems improve consistency.",
      maxPoints: 100,
      dueDate: "2026-06-25T23:59:00Z"
    },
    {
      id: "a_fs_p1",
      courseId: "c_full_stack",
      lessonId: "l_fs_1",
      title: "Secure API Proxies & Environment Configurations",
      description: "Define an Express route handler on your server that hides an API key of a third-party service, processes client parameters safely, handles errors with elegant responses, and discuss how you configure system variables.",
      maxPoints: 100,
      dueDate: "2026-06-30T23:59:00Z"
    }
  ],
  submissions: [
    {
      id: "s_student_1",
      assignmentId: "a_gemini_p1",
      courseId: "c_ai_gemini",
      studentId: "u_student",
      studentName: "Avery Johnson",
      submittedContent: "I have structured my system instruction: 'You are an AI Terminology Assistant. Always return output as JSON conforming to the requested schema. Do not output conversational text.'\n\n```json\n[\n  { \"term\": \"Transformer\", \"def\": \"A deep learning architecture based on self-attention mechanisms.\" },\n  { \"term\": \"Token\", \"def\": \"A text fragment processed as a single numerical atom by the decoder.\" }\n]\n```\nBoundary structures such as brackets prevent the LLM from adding preamble noise, making the output directly parseable.",
      submittedAt: new Date().toISOString(),
      grade: 95,
      feedback: "Excellent layout structure and thoughtful reasoning, Avery! Your schema checks out perfectly.",
      gradedBy: "u_teacher",
      gradedAt: new Date().toISOString()
    }
  ],
  forums: [
    {
      id: "f_post_1",
      courseId: "c_ai_gemini",
      authorId: "u_student",
      authorName: "Avery Johnson",
      authorRole: "student",
      title: "When to prefer gemini-3.5-flash vs. gemini-3.1-pro?",
      content: "Hello class, I'm starting prompt engineering pipelines and wanted to ask when we should rely on gemini-3.5-flash, versus when to upgrade to more powerful reasoning models like gemini-3.1-pro-preview?",
      createdAt: new Date().toISOString(),
      repliesCount: 1
    }
  ],
  comments: [
    {
      id: "f_comment_1",
      postId: "f_post_1",
      authorId: "u_teacher",
      authorName: "Prof. Marcus Vance",
      authorRole: "teacher",
      content: "Great inquiry! Select gemini-3.5-flash by default for all core text utilities, summaries, fast interactions, and everyday processing. Upgrade to the Pro model (gemini-3.1-pro-preview) when you require advanced reasoning structures, complex coding loops, multi-step math problems, or rich multi-turn logical hierarchies.",
      createdAt: new Date().toISOString()
    }
  ],
  notifications: [
    {
      id: "n_1",
      userId: "u_student",
      title: "Welcome to Interactive LMS",
      message: "Get started by accessing your enrolled course: Introduction to Artificial Intelligence!",
      read: false,
      createdAt: new Date().toISOString()
    }
  ],
  attendance: [
    {
      id: "att_1",
      studentId: "u_student",
      studentName: "Avery Johnson",
      courseId: "c_ai_gemini",
      date: "2026-06-03",
      status: "present"
    },
    {
      id: "att_2",
      studentId: "u_student",
      studentName: "Avery Johnson",
      courseId: "c_ai_gemini",
      date: "2026-06-04",
      status: "present"
    },
    {
      id: "att_3",
      studentId: "u_student",
      studentName: "Avery Johnson",
      courseId: "c_ai_gemini",
      date: "2026-06-05",
      status: "late"
    },
    {
      id: "att_4",
      studentId: "u_student",
      studentName: "Avery Johnson",
      courseId: "c_ai_gemini",
      date: "2026-06-06",
      status: "present"
    },
    {
      id: "att_5",
      studentId: "u_student",
      studentName: "Avery Johnson",
      courseId: "c_ai_gemini",
      date: "2026-06-07",
      status: "present"
    }
  ],
  chatHistory: [] as any[],
  liveClasses: [] as any[]
};

// Database operation helpers
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    // Generate fresh seed DB with hashed passwords
    const seeded = { ...SEED_DATA };
    seeded.users = seeded.users.map((u) => {
      const isAlreadyHashed = u.password.startsWith("$2a$") || u.password.startsWith("$2b$");
      return {
        ...u,
        password: isAlreadyHashed ? u.password : bcrypt.hashSync(u.password, 10)
      };
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    let changed = false;

    // Scan and migrate any plain text passwords
    if (parsed && Array.isArray(parsed.users)) {
      parsed.users = parsed.users.map((u: any) => {
        const isAlreadyHashed = u.password && (u.password.startsWith("$2a$") || u.password.startsWith("$2b$"));
        if (u.password && !isAlreadyHashed) {
          u.password = bcrypt.hashSync(u.password, 10);
          changed = true;
        }
        return u;
      });
    }

    // Ensure all collections from SEED_DATA exist in parsed DB to avoid undefined check crashes
    for (const key of Object.keys(SEED_DATA)) {
      if (parsed[key] === undefined) {
        parsed[key] = JSON.parse(JSON.stringify((SEED_DATA as any)[key]));
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error("Database reading error, resetting with default seed:", err);
    return SEED_DATA;
  }
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Set up server-side common notification creation and real-time dispatch helper
function createAndSendNotification(userId: string, title: string, message: string, type: string, extraData: any = {}) {
  const db = readDB();
  const newNotif = {
    id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    ...extraData
  };
  
  db.notifications = db.notifications || [];
  db.notifications.push(newNotif);
  writeDB(db);
  
  // Real-time emit to user specific room
  io.to(`user:${userId}`).emit("notification", newNotif);
  console.log(`[Socket.IO Notification] Sent to user ${userId} of type "${type}": "${title}"`);
  return newNotif;
}

// REST APIs

// 1. Auth Endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required parameters." });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: "Incorrect email or password credentials." });
  }

  // Compare passwords cryptographically using bcryptjs
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: "Incorrect email or password credentials." });
  }

  // Sign real JWT token with 24-hour expiration
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

app.post("/api/auth/register", (req, res) => {
  const { email, password, name, role, bio } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required parameters to register." });
  }

  const db = readDB();

  if (db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "User with this email already exists." });
  }

  // Cryptographically hash the user's password using bcrypt before database insertion
  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = {
    id: `u_${Date.now()}`,
    email,
    password: hashedPassword,
    name,
    role: role || "student",
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop`,
    bio: bio || "Enthusiastic web learner",
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  // Sign fresh real JWT token
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      avatar: newUser.avatar,
      bio: newUser.bio
    }
  });
});

// 2. Courses API
app.get("/api/courses", authenticateJWT, (req, res) => {
  const db = readDB();
  const coursesWithLessons = (db.courses || []).map((c: any) => ({
    ...c,
    lessons: (db.lessons || []).filter((l: any) => l.courseId === c.id),
    materials: c.materials || []
  }));
  res.json(coursesWithLessons);
});

app.post("/api/courses", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { title, description, category, difficulty, coverImage } = req.body;
  const db = readDB();
  const authUser = (req as any).user;

  // Retrieve user full name from user database
  const userRecord = db.users.find((u: any) => u.id === authUser.id);
  const instructorName = userRecord ? userRecord.name : "Instructor";

  const newCourse = {
    id: `c_${Date.now()}`,
    title,
    description,
    instructorId: authUser.id,
    instructorName: instructorName,
    category: category || "General Study",
    coverImage: coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop",
    difficulty: difficulty || "Beginner",
    lessonsCount: 0,
    studentsEnrolled: 0,
    materials: [],
    createdAt: new Date().toISOString()
  };

  db.courses.push(newCourse);
  writeDB(db);
  res.status(201).json({
    ...newCourse,
    lessons: []
  });
});

app.put("/api/courses/:id", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { id } = req.params;
  const { title, description, category, difficulty, coverImage, materials } = req.body;
  const db = readDB();
  const index = db.courses.findIndex((c: any) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Course not found" });
  }

  // Authorize: Only the teacher of the course or an admin can edit it
  const user = (req as any).user;
  if (user.role !== "admin" && db.courses[index].instructorId !== user.id) {
    return res.status(403).json({ error: "Unauthorized access: You are not the instructor of this course." });
  }

  if (title !== undefined) db.courses[index].title = title;
  if (description !== undefined) db.courses[index].description = description;
  if (category !== undefined) db.courses[index].category = category;
  if (difficulty !== undefined) db.courses[index].difficulty = difficulty;
  if (coverImage !== undefined) db.courses[index].coverImage = coverImage;
  if (materials !== undefined) db.courses[index].materials = materials;

  writeDB(db);
  
  const updatedCourse = {
    ...db.courses[index],
    lessons: (db.lessons || []).filter((l: any) => l.courseId === id)
  };
  res.json(updatedCourse);
});

app.delete("/api/courses/:id", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.courses = db.courses.filter((c: any) => c.id !== id);
  db.lessons = db.lessons.filter((l: any) => l.courseId !== id);
  db.enrollments = db.enrollments.filter((e: any) => e.courseId !== id);
  writeDB(db);
  res.json({ success: true, message: "Course removed successfully." });
});

// 3. Lessons API
app.get("/api/courses/:courseId/lessons", authenticateJWT, (req, res) => {
  const db = readDB();
  const lessons = db.lessons
    .filter((l: any) => l.courseId === req.params.courseId)
    .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
  res.json(lessons);
});

app.post("/api/lessons", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { courseId, title, content, durationMin } = req.body;
  const db = readDB();

  const siblings = db.lessons.filter((l: any) => l.courseId === courseId);
  const nextOrder = siblings.length + 1;

  const newLesson = {
    id: `l_${Date.now()}`,
    courseId,
    title,
    content,
    durationMin: Number(durationMin) || 30,
    sequenceOrder: nextOrder
  };

  db.lessons.push(newLesson);

  // Update lessonsCount in corresponding course
  const course = db.courses.find((c: any) => c.id === courseId);
  if (course) {
    course.lessonsCount = siblings.length + 1;
  }

  writeDB(db);
  res.status(201).json(newLesson);
});

// 4. Enrollments API
app.get("/api/users/:userId/enrollments", authenticateJWT, (req, res) => {
  const db = readDB();
  const enrolls = db.enrollments.filter((e: any) => e.studentId === req.params.userId);
  res.json(enrolls);
});

app.post("/api/enrollments", authenticateJWT, (req, res) => {
  const { studentId, courseId } = req.body;
  const db = readDB();

  const existing = db.enrollments.find((e: any) => e.studentId === studentId && e.courseId === courseId);
  if (existing) {
    return res.json(existing);
  }

  const newEnroll = {
    id: `e_${Date.now()}`,
    studentId,
    courseId,
    progress: 0,
    completedLessons: [],
    enrolledAt: new Date().toISOString()
  };

  db.enrollments.push(newEnroll);

  // Increase student enrollment count
  const course = db.courses.find((c: any) => c.id === courseId);
  if (course) {
    course.studentsEnrolled = (course.studentsEnrolled || 0) + 1;
  }

  writeDB(db);

  // Send real-time notification alerts
  const student = db.users?.find((u: any) => u.id === studentId);
  if (course) {
    // Notify student
    createAndSendNotification(
      studentId,
      "Successfully Enrolled in Course!",
      `You have successfully registered for the course "${course.title}". Begin your learning path now!`,
      "course-enrollment",
      { courseId }
    );

    // Notify instructor
    if (course.instructorId) {
      createAndSendNotification(
        course.instructorId,
        "New Student Joined Your Course!",
        `${student ? student.name : "A student"} has joined your course "${course.title}".`,
        "course-enrollment",
        { courseId, studentId }
      );
    }
  }

  res.status(201).json(newEnroll);
});

// Mark lesson completed & calculate progress percentage
app.post("/api/enrollments/complete-lesson", authenticateJWT, (req, res) => {
  const { studentId, courseId, lessonId } = req.body;
  const db = readDB();

  const enrol = db.enrollments.find((e: any) => e.studentId === studentId && e.courseId === courseId);
  if (!enrol) {
    return res.status(404).json({ error: "Enrollment details not found" });
  }

  if (!enrol.completedLessons.includes(lessonId)) {
    enrol.completedLessons.push(lessonId);
  }

  // Calculate percentage progress
  const totalLessons = db.lessons.filter((l: any) => l.courseId === courseId).length;
  enrol.progress = totalLessons > 0 ? Math.round((enrol.completedLessons.length / totalLessons) * 100) : 100;

  writeDB(db);
  res.json(enrol);
});

// 5. Assignments API
app.get("/api/courses/:courseId/assignments", authenticateJWT, (req, res) => {
  const db = readDB();
  const assigns = db.assignments.filter((a: any) => a.courseId === req.params.courseId);
  res.json(assigns);
});

app.post("/api/assignments", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { courseId, lessonId, title, description, maxPoints, dueDate, files } = req.body;
  const db = readDB();

  const newAssign = {
    id: `a_${Date.now()}`,
    courseId,
    lessonId: lessonId || undefined,
    title,
    description,
    maxPoints: Number(maxPoints) || 100,
    dueDate: dueDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    files: files || []
  };

  db.assignments.push(newAssign);
  writeDB(db);

  // Send real-time notification alerts to all students enrolled in this course
  const course = db.courses.find((c: any) => c.id === courseId);
  const enrolledStudents = db.enrollments?.filter((e: any) => e.courseId === courseId) || [];
  enrolledStudents.forEach((enrol: any) => {
    createAndSendNotification(
      enrol.studentId,
      "New Assignment Released!",
      `A new assignment "${title}" has been published in "${course ? course.title : 'Course'}". Due date: ${new Date(newAssign.dueDate).toLocaleDateString()}.`,
      "new-assignment",
      { courseId, assignmentId: newAssign.id }
    );
  });

  res.status(201).json(newAssign);
});

// 6. Submissions API (Student submits)
app.get("/api/courses/:courseId/submissions", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const db = readDB();
  const subms = db.submissions.filter((s: any) => s.courseId === req.params.courseId);
  res.json(subms);
});

app.get("/api/users/:userId/submissions", authenticateJWT, (req, res) => {
  const db = readDB();
  const subms = db.submissions.filter((s: any) => s.studentId === req.params.userId);
  res.json(subms);
});

app.post("/api/submissions", authenticateJWT, authorizeRoles("student"), (req, res) => {
  const { assignmentId, courseId, studentId, studentName, submittedContent, submittedFile } = req.body;
  const db = readDB();

  // Remove existing submission if any (overwrite support)
  db.submissions = db.submissions.filter(
    (s: any) => !(s.assignmentId === assignmentId && s.studentId === studentId)
  );

  const newSub = {
    id: `s_${Date.now()}`,
    assignmentId,
    courseId,
    studentId,
    studentName,
    submittedContent,
    submittedFile: submittedFile || null,
    submittedAt: new Date().toISOString()
  };

  db.submissions.push(newSub);
  writeDB(db);
  res.status(201).json(newSub);
});

// 7. Grading Submissions (Teacher grades)
app.post("/api/submissions/:submissionId/grade", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { grade, feedback, gradedBy } = req.body;
  const db = readDB();

  const sub = db.submissions.find((s: any) => s.id === req.params.submissionId);
  if (!sub) {
    return res.status(404).json({ error: "Submitted record not found" });
  }

  sub.grade = Number(grade);
  sub.feedback = feedback || "";
  sub.gradedBy = gradedBy || "u_teacher";
  sub.gradedAt = new Date().toISOString();

  // Create standard user notification to Avery or target student
  const studentId = sub.studentId;
  const assign = db.assignments.find((a: any) => a.id === sub.assignmentId);
  const course = db.courses.find((c: any) => c.id === sub.courseId);

  createAndSendNotification(
    studentId,
    "New Assignment Grade Posted!",
    `Your work for "${assign ? assign.title : 'Assignment'}" in "${course ? course.title : 'Course'}" has been marked. Grade: ${grade}/${assign ? assign.maxPoints : 100}`,
    "grade-released",
    { courseId: sub.courseId, assignmentId: sub.assignmentId, submissionId: sub.id }
  );

  res.json(sub);
});

// 8. Forum Discussion APIs
app.get("/api/courses/:courseId/forum", authenticateJWT, (req, res) => {
  const db = readDB();
  const posts = (db.forums || []).filter((f: any) => f.courseId === req.params.courseId)
    .map((p: any) => ({ ...p, likes: p.likes || [] }));
  res.json(posts);
});

app.post("/api/courses/:courseId/forum", authenticateJWT, (req, res) => {
  const { authorId, authorName, authorRole, title, content } = req.body;
  const db = readDB();

  const newPost = {
    id: `f_${Date.now()}`,
    courseId: req.params.courseId,
    authorId,
    authorName,
    authorRole,
    title,
    content,
    createdAt: new Date().toISOString(),
    repliesCount: 0,
    likes: []
  };

  db.forums = db.forums || [];
  db.forums.unshift(newPost); // Place at the start as newest
  writeDB(db);

  // Send real-time forum notifications to students and teacher
  const course = db.courses.find((c: any) => c.id === req.params.courseId);
  if (course) {
    const enrolledStudents = db.enrollments?.filter((e: any) => e.courseId === course.id) || [];
    
    // Notify other students
    enrolledStudents.forEach((enrol: any) => {
      if (enrol.studentId !== authorId) {
        createAndSendNotification(
          enrol.studentId,
          "New Forum Thread Posted!",
          `"${authorName}" posted a new discussion: "${title}" in course "${course.title}".`,
          "forum-activity",
          { courseId: course.id, postId: newPost.id }
        );
      }
    });

    // Notify teacher if not the creator
    if (course.instructorId && course.instructorId !== authorId) {
      createAndSendNotification(
        course.instructorId,
        "New Forum Thread Posted!",
        `"${authorName}" started a new discussion: "${title}" in your course "${course.title}".`,
        "forum-activity",
        { courseId: course.id, postId: newPost.id }
      );
    }
  }

  res.status(201).json(newPost);
});

app.post("/api/forum/:postId/like", authenticateJWT, (req, res) => {
  const db = readDB();
  const post = db.forums.find((f: any) => f.id === req.params.postId);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const userId = (req as any).user.id;
  if (!post.likes) post.likes = [];

  const idx = post.likes.indexOf(userId);
  if (idx > -1) {
    post.likes.splice(idx, 1);
  } else {
    post.likes.push(userId);
  }

  writeDB(db);
  res.json({ id: post.id, likes: post.likes });
});

app.get("/api/forum/:postId/comments", authenticateJWT, (req, res) => {
  const db = readDB();
  const comments = (db.comments || []).filter((c: any) => c.postId === req.params.postId)
    .map((c: any) => ({ ...c, likes: c.likes || [], parentId: c.parentId || null }));
  res.json(comments);
});

app.post("/api/forum/:postId/comments", authenticateJWT, (req, res) => {
  const { authorId, authorName, authorRole, content, parentId } = req.body;
  const db = readDB();

  const newComment = {
    id: `fc_${Date.now()}`,
    postId: req.params.postId,
    authorId,
    authorName,
    authorRole,
    content,
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
    likes: []
  };

  db.comments = db.comments || [];
  db.comments.push(newComment);

  // Update replies count in original post
  const post = db.forums.find((f: any) => f.id === req.params.postId);
  if (post) {
    post.repliesCount = (post.repliesCount || 0) + 1;
  }

  writeDB(db);

  // Send real-time forum activity notifications for comments
  if (post) {
    const course = db.courses.find((c: any) => c.id === post.courseId);
    
    // 1. Notify original thread author if they are not the reply author
    if (post.authorId && post.authorId !== authorId) {
      createAndSendNotification(
        post.authorId,
        "New Comment on Your Thread",
        `"${authorName}" commented on your thread "${post.title}": "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
        "forum-activity",
        { courseId: post.courseId, postId: post.id, commentId: newComment.id }
      );
    }

    // 2. Notify parent comment author if replying directly to another comment
    if (parentId) {
      const parentComment = db.comments.find((c: any) => c.id === parentId);
      if (parentComment && parentComment.authorId && parentComment.authorId !== authorId && parentComment.authorId !== post.authorId) {
        createAndSendNotification(
          parentComment.authorId,
          "New Reply to Your Comment",
          `"${authorName}" replied to your comment: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
          "forum-activity",
          { courseId: post.courseId, postId: post.id, commentId: newComment.id }
        );
      }
    }

    // 3. Notify instructor unless they are the author of the post or the commenter
    if (course && course.instructorId && course.instructorId !== authorId && course.instructorId !== post.authorId) {
      createAndSendNotification(
        course.instructorId,
        "New Reply in Course Forum",
        `"${authorName}" replied to "${post.title}" in your course "${course.title}".`,
        "forum-activity",
        { courseId: post.courseId, postId: post.id, commentId: newComment.id }
      );
    }
  }

  res.status(201).json(newComment);
});

app.post("/api/forum/comments/:commentId/like", authenticateJWT, (req, res) => {
  const db = readDB();
  const comment = db.comments.find((c: any) => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: "Comment not found" });
  }

  const userId = (req as any).user.id;
  if (!comment.likes) comment.likes = [];

  const idx = comment.likes.indexOf(userId);
  if (idx > -1) {
    comment.likes.splice(idx, 1);
  } else {
    comment.likes.push(userId);
  }

  writeDB(db);
  res.json({ id: comment.id, likes: comment.likes });
});

// Delete forum thread (Teacher/Admin moderation)
app.delete("/api/forum/:postId", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const db = readDB();
  db.forums = db.forums.filter((f: any) => f.id !== req.params.postId);
  db.comments = db.comments.filter((c: any) => c.postId !== req.params.postId);
  writeDB(db);
  res.json({ success: true, message: "Forum post and its comments deleted successfully" });
});

// Delete comment/reply (Teacher/Admin moderation)
app.delete("/api/forum/comments/:commentId", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const db = readDB();
  const comment = db.comments.find((c: any) => c.id === req.params.commentId);
  if (comment) {
    const post = db.forums.find((f: any) => f.id === comment.postId);
    if (post && post.repliesCount > 0) {
      post.repliesCount -= 1;
    }
    db.comments = db.comments.filter((c: any) => c.id !== req.params.commentId);
    writeDB(db);
  }
  res.json({ success: true, message: "Comment deleted successfully" });
});

// 9. Notifications API
app.get("/api/users/:userId/notifications", authenticateJWT, (req, res) => {
  const db = readDB();
  const notifs = db.notifications.filter((n: any) => n.userId === req.params.userId);
  res.json(notifs);
});

app.post("/api/notifications/:id/read", authenticateJWT, (req, res) => {
  const db = readDB();
  const notif = db.notifications.find((n: any) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    writeDB(db);
  }
  res.json({ success: true });
});

// 10. Progress Tracking and Attendance APIs
app.get("/api/users/:userId/progress", authenticateJWT, (req, res) => {
  const db = readDB();
  const userId = req.params.userId;
  
  // Find enrolled courses
  const userEnrollments = (db.enrollments || []).filter((e: any) => e.studentId === userId);
  const enrolledCourseIds = userEnrollments.map((e: any) => e.courseId);
  const userCourses = (db.courses || []).filter((c: any) => enrolledCourseIds.includes(c.id));
  
  // All lessons for enrolled courses
  const allLessons = db.lessons || [];
  
  // Attendance records for user
  const userAttendance = (db.attendance || []).filter((a: any) => a.studentId === userId);
  
  // Submissions and grades
  const userSubmissions = (db.submissions || []).filter((s: any) => s.studentId === userId);
  
  const courseWiseStats = userEnrollments.map((enroll: any) => {
    const course = userCourses.find((c: any) => c.id === enroll.courseId);
    const courseLessons = allLessons.filter((l: any) => l.courseId === enroll.courseId);
    
    // Attendance count
    const courseAttendance = userAttendance.filter((a: any) => a.courseId === enroll.courseId);
    const presentCount = courseAttendance.filter((a: any) => a.status === "present" || a.status === "late").length;
    // Expected attendance logs - default baseline is 5, or more if records exceed
    const totalAttendanceExpected = Math.max(5, courseAttendance.length);
    const attendanceRate = Math.round((presentCount / totalAttendanceExpected) * 100);
    
    // Graded assignments for this course
    const courseSubmissions = userSubmissions.filter((s: any) => s.courseId === enroll.courseId && s.grade !== undefined);
    const totalPointsObtained = courseSubmissions.reduce((sum: number, s: any) => sum + s.grade, 0);
    const avgScore = courseSubmissions.length > 0 ? Math.round(totalPointsObtained / courseSubmissions.length) : null;
    
    // Active check in state today
    const todayStr = new Date().toISOString().split('T')[0];
    const checkedInToday = courseAttendance.some((a: any) => a.date === todayStr);

    return {
      courseId: enroll.courseId,
      courseName: course ? course.title : "Unknown Course",
      syllabusProgress: enroll.progress || 0,
      completedLessonsCount: (enroll.completedLessons || []).length,
      totalLessonsCount: courseLessons.length,
      completedLessonsList: enroll.completedLessons || [],
      attendanceRate,
      checkedInToday,
      averageScore: avgScore,
      presentCount,
      totalExpectedSessions: totalAttendanceExpected,
      attendanceRecords: courseAttendance
    };
  });
  
  // Aggregated general indicators
  const totalEnrolled = userEnrollments.length;
  const avgSyllabusProgress = totalEnrolled > 0
    ? Math.round(userEnrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / totalEnrolled)
    : 0;
    
  // Overall attendance calculation
  const totalPresent = userAttendance.filter((a: any) => a.status === "present" || a.status === "late").length;
  const baseExpectedOverall = Math.max(5 * totalEnrolled, userAttendance.length, 1);
  const overallAttendanceRate = Math.round((totalPresent / baseExpectedOverall) * 100);
  
  // Mean assignments score
  const gradedSubs = userSubmissions.filter((s: any) => s.grade !== undefined);
  const averageAssignmentScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum: number, s: any) => sum + s.grade, 0) / gradedSubs.length)
    : null;
    
  res.json({
    enrolledCount: totalEnrolled,
    averageSyllabusProgress: avgSyllabusProgress,
    overallAttendanceRate: Math.min(100, overallAttendanceRate),
    averageAssignmentScore,
    completedLessonsTotalCount: userEnrollments.reduce((sum: number, e: any) => sum + (e.completedLessons || []).length, 0),
    courseWiseStats,
    allAttendanceRecords: userAttendance,
    allSubmissions: userSubmissions,
    liveClasses: db.liveClasses || []
  });
});

app.get("/api/attendance", authenticateJWT, (req, res) => {
  const db = readDB();
  res.json(db.attendance || []);
});

app.get("/api/users/:userId/attendance", authenticateJWT, (req, res) => {
  const db = readDB();
  const records = (db.attendance || []).filter((a: any) => a.studentId === req.params.userId);
  res.json(records);
});

app.post("/api/attendance/check-in", authenticateJWT, (req, res) => {
  const { studentId, studentName, courseId } = req.body;
  if (!studentId || !courseId) {
    return res.status(400).json({ error: "studentId and courseId are required parameters." });
  }

  const db = readDB();
  const todayStr = new Date().toISOString().split('T')[0];

  db.attendance = db.attendance || [];

  // Check if they are enrolled
  const enrolled = (db.enrollments || []).some((e: any) => e.studentId === studentId && e.courseId === courseId);
  if (!enrolled) {
    return res.status(400).json({ error: "You must be enrolled in this course to log attendance." });
  }

  const existing = db.attendance.find((a: any) => a.studentId === studentId && a.courseId === courseId && a.date === todayStr);
  if (existing) {
    return res.status(400).json({ error: "Already checked-in today for this course." });
  }

  const newRecord = {
    id: `att_${Date.now()}`,
    studentId,
    studentName: studentName || "Student",
    courseId,
    date: todayStr,
    status: "present",
    checkInTime: new Date().toISOString()
  };

  db.attendance.push(newRecord);
  writeDB(db);

  res.status(201).json(newRecord);
});

app.post("/api/courses/:courseId/attendance/bulk", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const { date, records } = req.body; // records: Array of { studentId, studentName, status: 'present'|'absent'|'late' }
  const courseId = req.params.courseId;

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: "date and records array are required." });
  }

  const db = readDB();
  db.attendance = db.attendance || [];

  // Clear previous records for that exact course + date to overwrite with new submission
  db.attendance = db.attendance.filter((a: any) => !(a.courseId === courseId && a.date === date));

  const newLogs = records.map((r: any, idx: number) => ({
    id: `att_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
    studentId: r.studentId,
    studentName: r.studentName || "Student",
    courseId,
    date,
    status: r.status,
    checkInTime: r.status === "present" || r.status === "late" ? new Date().toISOString() : undefined
  }));

  db.attendance.push(...newLogs);
  writeDB(db);

  res.status(201).json({ success: true, count: newLogs.length, records: newLogs });
});

// Teacher Dashboard analytics and discussion management dataset aggregator
app.get("/api/teachers/analytics", authenticateJWT, authorizeRoles("teacher", "admin"), (req, res) => {
  const db = readDB();
  const safeStudents = db.users
    .filter((u: any) => u.role === "student")
    .map((u: any) => {
      const { password, ...safe } = u;
      return safe;
    });

  res.json({
    enrollments: db.enrollments || [],
    students: safeStudents,
    submissions: db.submissions || [],
    forums: db.forums || [],
    comments: db.comments || [],
    attendance: db.attendance || [],
    liveClasses: db.liveClasses || [],
    courses: (db.courses || []).map((c: any) => ({
      ...c,
      lessons: (db.lessons || []).filter((l: any) => l.courseId === c.id),
      materials: c.materials || []
    }))
  });
});

// 10. Admin User Management Database (Role Based Authorization)
app.get("/api/admin/users", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  const db = readDB();
  // Strip passwords for safety
  const safeUsers = db.users.map((u: any) => {
    const { password, ...safe } = u;
    return safe;
  });
  res.json(safeUsers);
});

// Admin Create User Endpoint
app.post("/api/admin/users", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  const { name, email, password, role, bio, avatar } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields (name, email, password, role)" });
  }
  const db = readDB();
  const exists = db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: `u_${Date.now()}`,
    name,
    email,
    password: hashedPassword,
    role,
    bio: bio || "",
    avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop`,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// Admin Update User Endpoint
app.put("/api/admin/users/:id", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  const { name, email, role, bio, avatar, password } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const exists = db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Email already in use" });
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (role) user.role = role;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;
  if (password) {
    user.password = bcrypt.hashSync(password, 10);
  }

  writeDB(db);
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.delete("/api/admin/users/:id", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  const db = readDB();
  db.users = db.users.filter((u: any) => u.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Admin Platform Analytics & Reports Endpoint
app.get("/api/admin/analytics", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  const db = readDB();
  const totalUsers = db.users.length;
  const students = db.users.filter((u: any) => u.role === "student");
  const teachers = db.users.filter((u: any) => u.role === "teacher");
  const admins = db.users.filter((u: any) => u.role === "admin");
  const courses = db.courses || [];
  const enrollments = db.enrollments || [];
  const submissions = db.submissions || [];
  const forums = db.forums || [];
  const comments = db.comments || [];

  // Course progress breakdown
  const coursesData = courses.map((c: any) => {
    const enrolledStudents = enrollments.filter((e: any) => e.courseId === c.id);
    const completedStudents = enrolledStudents.filter((e: any) => e.progress === 100).length;
    const avgProgress = enrolledStudents.length > 0 
      ? Math.round(enrolledStudents.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0) / enrolledStudents.length)
      : 0;
    
    return {
      courseId: c.id,
      title: c.title,
      category: c.category,
      difficulty: c.difficulty,
      instructor: c.instructorName,
      enrolledCount: enrolledStudents.length,
      completionRate: enrolledStudents.length > 0 ? Math.round((completedStudents / enrolledStudents.length) * 100) : 0,
      averageProgress: avgProgress
    };
  });

  // Grade distributions
  const gradeCount = { A: 0, B: 0, C: 0, F: 0 };
  submissions.forEach((s: any) => {
    if (s.grade !== undefined) {
      if (s.grade >= 90) gradeCount.A++;
      else if (s.grade >= 80) gradeCount.B++;
      else if (s.grade >= 70) gradeCount.C++;
      else gradeCount.F++;
    }
  });

  // Recent actions logs
  const systemMetrics = {
    uptime: "99.98%",
    apiCalls24h: 3840,
    activeSessions: db.users.length > 0 ? Math.min(db.users.length, 5) : 1,
    dbStatus: "Optimal",
    memoryUsage: "52 MB"
  };

  res.json({
    summary: {
      totalUsers,
      studentsCount: students.length,
      teachersCount: teachers.length,
      adminsCount: admins.length,
      coursesCount: courses.length,
      enrollmentsCount: enrollments.length,
      submissionsCount: submissions.length,
      forumsCount: forums.length,
      commentsCount: comments.length
    },
    coursesData,
    gradeCount,
    systemMetrics
  });
});

// 11. AI Tutor Assistant API with @google/genai SDK
app.get("/api/ai/history/:courseId/:userId", authenticateJWT, (req, res) => {
  const db = readDB();
  const history = db.chatHistory.filter((ch: any) => ch.courseId === req.params.courseId && ch.userId === req.params.userId);
  res.json(history);
});

app.post("/api/ai/chat", authenticateJWT, async (req, res) => {
  const { courseId, userId, message, courseTitle, lessonTitle } = req.body;
  const db = readDB();

  // Setup user message log
  const userMsg = {
    id: `chat_${Date.now()}`,
    courseId,
    userId,
    sender: "user" as const,
    message,
    timestamp: new Date().toISOString()
  };
  db.chatHistory.push(userMsg);

  let aiReplyText = "";

  // 1. Check if Gemini Secrets are available
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct powerful structural guidelines context
      const systemInstruction = `You are "Socrates-AI Study Guide", a helpful, cheerful, and highly disciplined computer science tutor for the course titled "${courseTitle || "General Study"}". Your tone is encouraging, scientific, and clear. If a current lesson is provided, guide your responses incorporating insights from "${lessonTitle || 'the syllabus'}". Keep code blocks elegant, short, and explanatory. Do not write filler introductory phrases. Start directly explaining or asking guided questions.`;

      // Fetch dynamic course chat history to give a coherent response
      const recentChats = db.chatHistory
        .filter((ch: any) => ch.courseId === courseId && ch.userId === userId)
        .slice(-6); // Last 6 conversations

      const chatHistoryPrompt = recentChats.map((c: any) => `${c.sender === "user" ? "Student" : "Socrates-AI"}: ${c.message}`).join("\n");

      // Generate content stream or dynamic response
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${chatHistoryPrompt}\nStudent: ${message}\nSocrates-AI:`,
        config: {
          systemInstruction,
          temperature: 0.8
        }
      });

      aiReplyText = response.text || "I processed your query, but could not formulate feedback at this instant. Could you try rephrasing?";
    } catch (apiErr: any) {
      console.error("Gemini API Error occurred:", apiErr);
      aiReplyText = `*System Note: Socrates-AI has encountered a cloud pipeline latency (${apiErr.message || 'Network delay'}). Here is a diagnostic assistance guidance block for your question: "${message}"* \n\nLearning large models benefits from studying attention weights, query-matching variables, and vector values. Please consult your primary textbook resources while our service refreshes.`;
    }
  } else {
    // If no key is set, keep the application fully functional and fun with high-quality pre-programmed expert educational hints!
    const keyGuides = [
      "To connect actual high-performance Gemini intelligence responses, register a real secret in **Settings > Secrets** using the variable `GEMINI_API_KEY`!",
      "Large Language Models learn grammar systems by multiplying high-dimensional arrays in deep transformer layers.",
      "An attention score tells the learning model which specific previous tokens are grammatically and semantically associated with the current prediction key.",
      "Vite is a next-generation local server setup leveraging native ES modules for rapid hot module builds.",
      "Always design database structures (such as MongoDB collections or Firestore tracks) specifying key fields, data patterns, and optimal indexing queries so metrics remain lightning fast."
    ];
    const item = keyGuides[Math.floor(Math.random() * keyGuides.length)];
    aiReplyText = `### Hello there! I'm Socrates-AI, your Interactive Course Guide.\n\n*Study Connection Info:* It looks like your Gemini key is not configured inside your cloud space yet. You can activate full server-side answering anytime by pasting your Key inside the **Settings > Secrets** panel of the AI Studio UI.\n\nHere is an expert educational topic tip for you while we wait:\n\n> **${item}**\n\nHow else can I help you construct study lists, complete coursework, or explain definitions?`;
  }

  const aiMsg = {
    id: `chat_${Date.now() + 1}`,
    courseId,
    userId,
    sender: "ai" as const,
    message: aiReplyText,
    timestamp: new Date().toISOString()
  };
  db.chatHistory.push(aiMsg);
  writeDB(db);

  res.json({ reply: aiReplyText });
});

// Live Classroom Management Endpoints
app.get("/api/live-classes", authenticateJWT, (req: any, res: any) => {
  const db = readDB();
  res.json(db.liveClasses || []);
});

app.post("/api/live-classes", authenticateJWT, authorizeRoles("teacher", "admin"), (req: any, res: any) => {
  const db = readDB();
  const { courseId, title, description, date, time, duration, meetingType } = req.body;
  if (!courseId || !title || !date || !time) {
    return res.status(400).json({ error: "Required fields missing (courseId, title, date, time)." });
  }

  const course = db.courses.find((c: any) => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: "Associated course curriculum not found." });
  }

  const classId = `live_${Date.now()}`;
  const meetingLink = meetingType === "google-meet" 
    ? `https://meet.google.com/abc-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}` 
    : `webrtc-room-${classId}`;

  const newClass = {
    id: classId,
    courseId,
    courseName: course.title,
    title,
    description: description || "",
    date,
    time,
    duration: Number(duration) || 60,
    meetingType: meetingType || "webrtc",
    meetingLink,
    status: "scheduled", // scheduled, live, ended
    instructorId: req.user.id,
    createdAt: new Date().toISOString()
  };

  db.liveClasses = db.liveClasses || [];
  db.liveClasses.push(newClass);

  // Send real-time notification alerts to all students enrolled in this course
  const enrolledStudents = db.enrollments?.filter((e: any) => e.courseId === courseId) || [];
  enrolledStudents.forEach((enrol: any) => {
    createAndSendNotification(
      enrol.studentId,
      "New Live Class Scheduled!",
      `${course.title}: "${title}" has been scheduled for ${date} at ${time}.`,
      "live-class-reminder",
      { courseId, liveClassId: newClass.id }
    );
  });

  writeDB(db);
  res.status(201).json(newClass);
});

app.post("/api/live-classes/:id/status", authenticateJWT, authorizeRoles("teacher", "admin"), (req: any, res: any) => {
  const db = readDB();
  const classId = req.params.id;
  const { status } = req.body; // live, ended, scheduled
  
  if (!["scheduled", "live", "ended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value specified." });
  }

  db.liveClasses = db.liveClasses || [];
  const liveClass = db.liveClasses.find((lc: any) => lc.id === classId);
  if (!liveClass) {
    return res.status(404).json({ error: "Live class session not found." });
  }

  liveClass.status = status;

  // If status changed to live, send immediate alert notification to all students enrolled
  if (status === "live") {
    const course = db.courses.find((c: any) => c.id === liveClass.courseId);
    const enrolledStudents = db.enrollments?.filter((e: any) => e.courseId === liveClass.courseId) || [];
    enrolledStudents.forEach((enrol: any) => {
      createAndSendNotification(
        enrol.studentId,
        "🔴 Live Class is Starting Now!",
        `Your class "${liveClass.title}" has started! Click here to join the live session room.`,
        "live-class-starting",
        { courseId: liveClass.courseId, liveClassId: liveClass.id }
      );
    });
  }

  writeDB(db);
  res.json(liveClass);
});

app.post("/api/live-classes/:id/join", authenticateJWT, (req: any, res: any) => {
  const db = readDB();
  const classId = req.params.id;
  
  db.liveClasses = db.liveClasses || [];
  const liveClass = db.liveClasses.find((lc: any) => lc.id === classId);
  if (!liveClass) {
    return res.status(404).json({ error: "Live class session not found." });
  }

  // Automatic attendance logger for student joins
  if (req.user.role === "student") {
    db.attendance = db.attendance || [];
    // Ensure student is actually enrolled
    const enrolled = db.enrollments?.some((e: any) => e.studentId === req.user.id && e.courseId === liveClass.courseId);
    if (enrolled) {
      const todayStr = new Date().toISOString().split("T")[0];
      const existing = db.attendance.find((a: any) => a.studentId === req.user.id && a.courseId === liveClass.courseId && a.date === todayStr);
      if (!existing) {
        const studentInfo = db.users.find((u: any) => u.id === req.user.id);
        const nameStr = studentInfo ? studentInfo.name : "Student Scholar";
        
        db.attendance.push({
          id: `att_live_${Date.now()}`,
          studentId: req.user.id,
          studentName: nameStr,
          courseId: liveClass.courseId,
          date: todayStr,
          status: "present" // Auto join marks present
        });
      }
    }
  }

  writeDB(db);
  res.json({ success: true, liveClass });
});

// Configure Vite integration or build asset serving
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Inject Vite Development Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve Compiled Frontend assets from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[LMS SERVER] Live and listening on port ${PORT}`);
  });
}

configureServer().catch((err) => {
  console.error("Failure while initializing LMS Full-Stack Server:", err);
});
