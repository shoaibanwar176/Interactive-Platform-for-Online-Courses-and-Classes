# 🎓 Modern LMS Portal with Real-Time WebSockets & AI-Tutor

A high-fidelity, complete, and production-ready **Learning Management System (LMS) Portal**. Crafted to yield deep learning experiences, the architecture bridges live interactions, classroom whiteboards, student/teacher diagnostics dashboards, and a specialized **Tutor Assistant driven by Gemini AI**.

This project provides a **Dual-Architecture full-stack deployment schema**, supporting:
*   **Default Stack (Live Preview Mode)**: React 19 (Vite) + Node.js Express + Socket.IO + Local Persistent cache mapping.
*   **Enterprise Py-Stack**: React 19 (Vite) + Flask CORS Microserver + Socket.IO + PyMongo + MongoDB Atlas Cloud cluster.

---

## 🏛️ Project Architecture

We separate visual layouts from business logic through a **Clean Architecture pipeline**, isolating presentation grids, event-handlers, service queries, state-machines, and database nodes:

```
                            [ React 19 SPA Context Client ]
                                         │
                   (AXIOS API HTTP)     │     (Sockets Over HTTP)
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
         [ Node/Flask REST Controller ]         [ Socket.IO Real-Time Engine ]
                        │                                 │
                        ├─────────────────────────────────┤
                        ▼
            [ Mongo Atlas DB / JSON Cache ]
                        │
                        ▼
          [ Google GenAI SDK (Gemini) ]
```

---

## 📂 Project Folder Structure

The complete structure of the project folders is clean and modular:

```
├── README.md                      # Comprehensive user documentation and system manual
├── TESTING.md                     # QA automated & integration testing matrix
├── package.json                   # Node package definitions and build scripts
├── server.ts                      # Unified Express/Vite server controller (TypeScript)
├── tsconfig.json                  # TS compiler rules and absolute pathway aliasing
├── vite.config.ts                 # React assembly pipeline with TailwindCSS plugins
├── data/                          # Cached data databases for offline fallbacks
│   └── lms_db.json
├─┬ backend_flask/                 # Flask Python + MongoDB Atlas backend project bundle
│   ├── app.py                     # Main Flask Server & WebSocket Event controller
│   ├── config.py                  # API tokens and Atlas connection strings configuration
│   ├── db.py                      # PyMongo client initialization with fallbacks
│   ├── auth_middleware.py         # JWT Token & user role clearance decorators
│   └── requirements.txt           # Python backend dependencies list
├─┬ src/                           # Client-side React 19 frontend
│   │
│   ├── App.tsx                    # Main Routing panels and context providers wrapper
│   ├── index.css                  # Master Tailwind directives layer
│   ├── main.tsx                   # DOM mount target compiler
│   │
│   ├─┬ components/                # Independent, reusable visual blocks
│   │   ├── Card.tsx               # Content containers
│   │   ├── Navbar.tsx             # Interactive header matching Socket.IO push badge feeds
│   │   ├── Sidebar.tsx            # Context navigation menu
│   │   ├── ProtectedRoute.tsx     # Session checkpoint checking role clearances
│   │   └── LiveClassroomRoom.tsx  # Multi-user whiteboard drawings workspace
│   │
│   ├─┬ context/                   # Global React state providers
│   │   ├── AuthContext.tsx        # User login details, register handlers, and cookies
│   │   └── SocketContext.tsx      # WebSocket channels, push listeners, and user state sync
│   │
│   ├─┬ pages/                     # Full-viewport views
│   │   ├── Login.tsx              # Secure entrance gates
│   │   ├── Register.tsx           # Role registration console
│   │   ├── Unauthorized.tsx       # Security warnings
│   │   │
│   │   ├─┬ Dashboard/                  
│   │   │   ├── StudentDashboard.tsx # Progress charts, checks, and notifications
│   │   │   ├── TeacherDashboard.tsx # Scheduling pipelines, curriculum grids, and grading
│   │   │   └── AdminDashboard.tsx   # Global database, registry audit tables, and metrics
│   │   │
│   │   └─┬ Courses/                    
│   │       ├── CourseExplore.tsx    # Scrollable enrollable listings
│   │       └── CourseDetail.tsx     # Active video hubs, lessons checklist, forum threads, and AI-chat Sidebar
│   │
│   └─┬ services/                  
│       └── api.ts                 # Centralized HTTP request controller with JWT request interceptors
```

---

## 🧭 Modules Breakdown

### 1. 🔐 Security & Role Authentication
*   **JWT session engines**: Authentication verifies custom encoded user credentials, injecting authorization details inside standard HTTP request headers.
*   **Middleware Checks**: Checks roles (`student`, `teacher`, `admin`) to limit operations on restricted URLs (e.g., student grading blocks).

### 2. 📡 Real-Time Notifications Hub
*   **Socket.IO Server Push broadcasts**: Instantly sends high-priority updates to target student groups without waiting for page refreshes.
*   **Custom Notifications Grid**: Tracks assignment grade postings, newly scheduled classes, discussion boards updates, and instant live session alerts.

### 3. 🎨 Interactive Whiteboard & Classroom Rooms
*   **Multi-user whiteboard canvas**: Canvas uses drawing event streams to synchronize coordinates across devices.
*   **Hardware controls mockups**: Camera toggling, microphone controls, and instant chat windows complete the experience.

### 4. 🧠 Socrates-AI Tutor Companion
*   **Interactive Chat with Gemini**: Uses system instructions to guide the tutor on specified course syllabi concepts.
*   **Structured Chat Logs**: Keeps a history of chat questions and responses in the UI for easy reading.

### 5. 👥 Course Management & Forums
*   **Threaded Discussions**: Supports threads categorized by course, with likes, replies, and notifications.
*   **Progress Indicators**: Shows course status visually using lesson checklists and progress bars.

---

## 🛠️ Installation & Setup Manual

Follow these steps to run the application in your preferred layout.

### A. Run NodeJS + React Stack (Live Mode default)

1.  **Configure Environment Variables**:
    Create `.env` based on `.env.example`:
    ```env
    JWT_SECRET=your_super_secret_session_key
    GEMINI_API_KEY=your_actual_gemini_api_key_from_google_ai_studio
    ```

2.  **Dependencies Setup**:
    ```bash
    npm install
    ```

3.  **Launch Server Pipings (Starts Express & Vite)**:
    ```bash
    npm run dev
    ```
    *   Open your browser to: `http://localhost:3000`

4.  **Production Production Compilation**:
    ```bash
    npm run build
    npm run start
    ```

---

### B. Run Python Flask Backend + React Stack

1.  **Enter Python Virtual Workspace**:
    ```bash
    cd backend_flask
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Dependencies Setup**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Add Backend Environment Credentials**:
    Create a `.env` inside `/backend_flask`:
    ```env
    FLASK_ENV=development
    PORT=5000
    MONGO_URI=mongodb+srv://<auth_user>:<auth_pass>@your-cluster.mongodb.net/?retryWrites=true&w=majority
    JWT_SECRET=your_super_secret_session_key
    GEMINI_API_KEY=your_actual_gemini_api_key_from_google_ai_studio
    ```

4.  **Run Flask API server**:
    ```bash
    python -m backend_flask.app
    ```
    *   The backend starts at `http://localhost:5000`

5.  **Bind Frontend to Flask endpoint**:
    Modify `/src/services/api.ts` or add a proxy in `vite.config.ts`.
    ```ts
    // /src/services/api.ts
    const api = axios.create({
      baseURL: "http://localhost:5000/api", // Point path directly to local python server
      headers: { ... }
    });
    ```
    Re-run your react front-end developer server: `npm run dev` out of root workspace directory.

---

## 🧪 Automated Testing Strategy

A detailed testing script is available inside the project in `/TESTING.md`. Run assertions locally in your workspace via:
```bash
npm run lint
```
This processes all strict type safety declarations and verifies compilation parameters.
