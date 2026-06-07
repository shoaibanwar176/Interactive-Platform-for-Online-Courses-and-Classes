# LMS Portal: Automated Testing & Verification Strategy

This document details the complete automated, integration, and manual end-to-end (E2E) testing strategy for the LMS portal. Our software architecture consists of a custom full-stack architecture running high-fidelity **React 18** (Vite + TypeScript) on the client, and a unified **Node.js Express** server with persistent fallback storage and live **Socket.IO** state synchronization on the backend.

---

## 🏛️ Testing Architecture Overview

```
                      +------------------------------------------+
                      |         Continuous Integration (CI)       |
                      +------------------------------------------+
                                           |
                  +------------------------+------------------------+
                  |                                                 |
                  v                                                 v
      +------------------------+                        +------------------------+
      |    Frontend Suites     |                        |     Backend Suites     |
      +------------------------+                        +------------------------+
      |  - Vitest / Jest       |                        |  - Mocha / Jest        |
      |  - React Testing Lib   |                        |  - Supertest APIs      |
      |  - Mock Socket Clients |                        |  - socket.io-client    |
      +------------------------+                        +------------------------+
```

---

## 🎨 1. Frontend Testing Strategy

Our frontend contains stateful custom hooks (`AuthContext`, `SocketContext`), interactive canvas elements (whiteboards in `LiveClassroomRoom`), and complex dashboard filters based on user authorization roles (`student`, `teacher`, `admin`).

### 🧪 A. Unit Testing

Unit tests isolate logical utility layers, context variables, and rendering engines without mocking full network layers.

#### Custom Hooks & Context Testing
*   **AuthContext Hook**: Verify user identification persistence in local state and Axios auth header interpolation.
    *   *Test Cases*:
        1.  Verify calling `login()` successfully writes standard JWT payloads to browser security memory.
        2.  Assert that state clears on `logout()`, removing cookies, cached configurations, and API authorization tokens.
*   **SocketContext Hook**: Confirm Socket.IO initialization, client-side event listeners setup, and background push notification integration.
    *   *Test Cases*:
        1.  Verify socket instantiation binds to `window.location.origin` upon user session activation.
        2.  Assert code calls `socket.emit("identify", userId)` once connection registers as active.
        3.  Test that system notification permission requests run if status is `default`.

#### Local Utility Formatters (`/src/utils/`)
*   *Test Cases*:
    1.  Test date-time formatters handle zero padding, specific timezone conversions, and relative localized indicators (e.g., `"Just now"`, `"scheduled"`, or duration calculators).

---

### 🖥️ B. Component Testing

Component tests render JSX components in virtual DOMs (via JSDOM in `Vitest` or `Jest`) to assert element visibility, style states, micro-interactive handshakes, and input loops.

#### 🔔 Notification Hub Dropdown (`Navbar.tsx`)
*   **Setup**: Mock `useNotifications` context values (`notifications`, `unreadCount`, `markAsRead`).
*   *Test Cases*:
    1.  **Rendering Feed Counts**: Assert the notifications bell icon badge prints the exact unread integer count (e.g., `3`) when values are loaded.
    2.  **Dropdown Toggle**: Simulate clicking the icon; verify dropdown list visibility, containing matching text.
    3.  **Read Action Handshake**: Select an unread item, simulate a click event, and verify the mockup triggers the matching `markAsRead(notificationId)` hook parameter.

#### 🔴 LiveInteractiveRoom & Whiteboard (`LiveClassroomRoom.tsx`)
*   **Setup**: Mock `useAuth` context, customize mock audio-video device hardware queries (`navigator.mediaDevices.getUserMedia`).
*   *Test Cases*:
    1.  **Media Stream Defaults**: Verify rendering triggers standard element `video.play()` handles with scale-X transformations representing front-facing cameras.
    2.  **Hardware Muting Toggles**: Click `"Stop Camera"`. Observe that state changes, removing stream sources from DOM targets and showing custom placeholders with initials.
    3.  **Drawing Canvas Interactions**: Simulate a mouse sequence on our workspace `<canvas>`: `mousedown` (coordinate x=100, y=100) -> `mousemove` (coordinate x=150, y=120) -> `mouseup`. Assert matching context functions trace correct borders with colors matching state palettes.
    4.  **Simulated Chat Push Loop**: Input a text message in the chat feed and hit submit. Verify client-side state pushes a matching message to list nodes, and that a mock responder triggers answer responses within 1.5 seconds.
    5.  **Presence Signals / Raising Hand**: Toggle the hand raise option; confirm system notices notify other sockets about state queuing.

---

## ⚙️ 2. Backend Testing Strategy

The backend layer coordinates SQL/JSON operations, maps role-based route middleware controls (`authenticateJWT`, `authorizeRoles`), processes live WebRTC rooms, and coordinates multi-device messaging channels.

### 🔌 A. API Endpoint Testing

We test HTTP APIs using framework-agnostic tooling like `Supertest` to verify payload schema bindings, safety measures, error conditions, and storage transactions.

#### 🔐 Module 1: Authentication & User Registration (`/api/auth/*`)
*   *Test Cases*:
    1.  **POST `/api/auth/register`**: Submit missing parameters. Assert server returns `400 Bad Request`. Provide details matching existing data and secure strong passwords; verify response returns `201` status.
    2.  **POST `/api/auth/login`**: Test incorrect password strings return `401 Unauthorized` responses. On successful credentials, confirm payload yields correct signature JWT tokens with exact expiration scopes.

#### 📖 Module 2: Course Enroller & Curriculums (`/api/courses/*`, `/api/enrollments/*`)
*   *Test Cases*:
    1.  **GET `/api/courses`**: Assert public access allows courses reading with standard array lengths.
    2.  **POST `/api/enrollments`**: Connect as `student`. Call enrollment on specific courses. Assert DB updates enrollments with state status indexes, and verify that the system issues structured real-time alerts to instructors.

#### 📝 Module 3: Assignments & Evaluation Engines (`/api/assignments/*`, `/api/submissions/*`)
*   *Test Cases*:
    1.  **POST `/api/assignments`**: Authenticate as `student` and try posting a task. Expect `403 Forbidden` from role check middlewares. Resubmit as `teacher`; verify database processes parameters and issues new assignment alert notification arrays.
    2.  **POST `/api/submissions/:submissionId/grade`**: As `teacher`, publish an evaluation. Assert response updates submission stats, and triggers high-priority relative grade broadcast payloads over active websockets.

---

### 🌐 B. Real-Time Integration Testing (Socket.IO)

Integration tests assess multi-user synchronization by establishing real-world, concurrent socket connections to local test instances.

```
       +-------------------+               +--------------------+
       |  Teacher Client   |               |   Student Client   |
       +-------------------+               +--------------------+
                 |                                    |
                 | (Pushes Course Event)              | (Joins Room & Matches IDs)
                 v                                    v
       +--------------------------------------------------------+
       |             Live LMS Server Integration                |
       +--------------------------------------------------------+
```

#### Complete Socket Connection & ID Loop
*   *Test Cases*:
    1.  **Identify Handling**: Establish a connection. Send `socket.emit("identify", "student_user_123")`. Verify the server adds the socket to channel room `"user:student_user_123"`.
    2.  **Multicast Course Notifications**:
        *   Establish two unique student socket clients, registering as joined to Course ID `"course_python_101"`.
        *   Establish a teacher client. Create a new Live Class for the course via HTTP POST.
        *   Verify both student sockets concurrently trigger `on("notification")` emissions with exact payload information reflecting WebRTC schedules.
    3.  **Real-Time Thread Replacements**: Post forum responses to discussion tables. Confirm relevant thread hosts instantly catch comment updates, highlighting changes.

---

## 📊 3. Detailed Module-by-Module Test Matrix

| Target Module | Test Suite Scope | Test Type | Expected Functional Outcome & Assertions |
| :--- | :--- | :--- | :--- |
| **Auth** | User Registration | API | Sending valid formatting fields appends record node to flat-file DB, returning validation status logs. |
| **Auth** | User Login | API | Successful credentials response returns signed JWT token, profile metadata object, and resets lockouts. |
| **Course** | Curriculums | Component | Accessing lessons switches active curriculum nodes, rendering video overlays and markdown read logs. |
| **Course** | Complete Lesson | Integration | Posting lesson progress writes records to schema, adjusting user course progress percentage bars. |
| **Enrollment** | Register course | API | Joining a course adds student mapping, updating participant counters and firing alert triggers. |
| **Assignments** | Create Task | Integration | Teachers publishing templates writes records to schema, and sends **New Assignment** real-time indicators to sockets. |
| **Assignments** | Grade Submission | API | Teachers editing score parameters saves submission data, firing **Grade Released** push events. |
| **Forums** | Post New Thread | Integration | Creating a title + content post updates forum list, sending a thread notification to course boards. |
| **Forums** | Append Comment | Integration | Comment submissions attach replies to database, generating thread activity alerts. |
| **Live Room** | Create Broadcast | API | Teacher schedules class, returning simulated link streams and emitting live calendar event signals to subscribers. |
| **Live Room** | Join Call | Integration | Calling the join endpoint logs immediate student class attendance status logs. |
| **Live Room** | Whiteboard Canvas | Component | Dragging cursors paints on canvas vectors, allowing options like board sweeps. |
| **Notifications** | Identity binds | E2E Socket | Logging in binds sockets to user IDs, validating the reception of direct channel events. |
| **Notifications** | Mark as Read | API / Client | Selecting notification items changes item opacity, and updates unread count badges. |

---

## 🏃 4. Running the Tests Locally

Add test scripts to your standard setup.

To run component and integration test actions, configure `package.json` scripts with your preferred framework (e.g., `Vitest` or `Jest`):

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Then execute standard terminal run commands inside your dev containers:
```bash
npm run test
```
