import os
import time
import uuid
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import bcrypt
import jwt

# Internal modules
from .config import Config
from .db import (
    users, courses, lessons, enrollments, submissions,
    assignments, forums, comments, notifications, attendance,
    chat_history, live_classes
)
from .auth_middleware import token_required, roles_authorized

app = Flask(__name__)
app.config.from_object(Config)

# Configure Cross-Origin Resource Sharing
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure WebSockets
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent" if sys_module_checker := False else None)

# Helper function to parse Mongo documents removing internal bson object IDs
def serialize_doc(doc):
    if not doc:
        return doc
    doc_copy = dict(doc)
    if "_id" in doc_copy:
        doc_copy["_id"] = str(doc_copy["_id"])
    return doc_copy

def serialize_list(cursor):
    return [serialize_doc(x) for x in cursor]

# Server-Side real-time notification dispatch helper
def create_send_notification(user_id, title, message, notif_type, extra_data=None):
    if extra_data is None:
        extra_data = {}
        
    new_notif = {
        "id": f"n_{int(time.time() * 1000)}_{uuid.uuid4().hex[:5]}",
        "userId": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "read": False,
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
        **extra_data
    }
    
    # Save to MongoDB Atlas user's collection
    notifications.insert_one(new_notif)
    
    # Broadcast to websocket user room
    socketio.emit("notification", serialize_doc(new_notif), room=f"user:{user_id}")
    return new_notif

# SOCKET EVENTS
@socketio.on("connect")
def handle_connect():
    print(f"[WebSocket] Connected client socket session: {request.sid}")

@socketio.on("identify")
def handle_identify(user_id):
    join_room(f"user:{user_id}")
    print(f"[WebSocket] User {user_id} identified on socket session: {request.sid}")

@socketio.on("join-course")
def handle_join_course(course_id):
    join_room(f"course:{course_id}")
    print(f"[WebSocket] Access register joined course room: {course_id}")

@socketio.on("disconnect")
def handle_disconnect():
    print(f"[WebSocket] Disconnected socket session: {request.sid}")


# 1. AUTHENTICATION MODULES
@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "student") # default role
    name = data.get("name", "").strip()

    if not email or not password or not name:
        return jsonify({"message": "Inputs missing! Submit name, email and password."}), 400

    if users.find_one({"email": email}):
        return jsonify({"message": "User registers error: Email already taken!"}), 400

    # Strong password hashing
    hashed_pass = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    
    new_user = {
        "id": f"u_{uuid.uuid4().hex[:8]}",
        "email": email,
        "name": name,
        "password": hashed_pass,
        "role": role,
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    users.insert_one(new_user)
    
    # Generate token
    token = jwt.encode(
         {"id": new_user["id"], "role": new_user["role"], "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)},
         Config.JWT_SECRET,
         algorithm="HS256"
    )

    resp_user = serialize_doc(new_user)
    del resp_user["password"]

    return jsonify({
         "token": token,
         "user": resp_user
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
         return jsonify({"message": "Payload inputs missing: email and password."}), 400

    user = users.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
         return jsonify({"message": "Access Denied: Invalid email or password secret!"}), 401

    token = jwt.encode(
         {"id": user["id"], "role": user["role"], "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)},
         Config.JWT_SECRET,
         algorithm="HS256"
    )

    resp_user = serialize_doc(user)
    del resp_user["password"]

    return jsonify({
         "token": token,
         "user": resp_user
    }), 200


# 2. COURSE MANAGEMENT MODULE
@app.route("/api/courses", methods=["GET"])
@token_required
def get_courses(current_user):
    all_courses = serialize_list(courses.find())
    return jsonify(all_courses), 200

@app.route("/api/courses", methods=["POST"])
@token_required
@roles_authorized("teacher", "admin")
def create_course(current_user):
    data = request.json or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    category = data.get("category", "").strip()
    difficulty = data.get("difficulty", "Intermediate")
    banner = data.get("banner", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3")

    if not title:
        return jsonify({"message": "Course title missing!"}), 400

    new_course = {
        "id": f"c_{uuid.uuid4().hex[:6]}",
        "title": title,
        "description": description,
        "category": category,
        "difficulty": difficulty,
        "banner": banner,
        "instructorId": current_user["id"],
        "instructorName": current_user["name"],
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }
    
    courses.insert_one(new_course)
    return jsonify(serialize_doc(new_course)), 201

@app.route("/api/lessons", methods=["POST"])
@token_required
@roles_authorized("teacher", "admin")
def create_lesson(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    duration_min = int(data.get("durationMin", 15))
    sequence_order = int(data.get("sequenceOrder", 1))

    if not course_id or not title:
        return jsonify({"message": "Parameters courseId and title are required!"}), 400

    new_lesson = {
        "id": f"l_{uuid.uuid4().hex[:6]}",
        "courseId": course_id,
        "title": title,
        "content": content,
        "durationMin": duration_min,
        "sequenceOrder": sequence_order
    }
    
    lessons.insert_one(new_lesson)
    return jsonify(serialize_doc(new_lesson)), 201


# 3. ENROLLMENT & PROGRESS TRACKER MODULE
@app.route("/api/users/<user_id>/enrollments", methods=["GET"])
@token_required
def get_user_enrollments(current_user, user_id):
    if current_user["id"] != user_id and current_user["role"] not in ["teacher", "admin"]:
        return jsonify({"message": "Access Forbidden: Authorization profiles unmatched."}), 403
        
    user_enrolls = serialize_list(enrollments.find({"studentId": user_id}))
    return jsonify(user_enrolls), 200

@app.route("/api/enrollments", methods=["POST"])
@token_required
def enroll_course(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    student_id = current_user["id"]

    if not course_id:
        return jsonify({"message": "courseId parameter required!"}), 400

    course = courses.find_one({"id": course_id})
    if not course:
        return jsonify({"message": "Associated target course not found!"}), 404

    existing = enrollments.find_one({"courseId": course_id, "studentId": student_id})
    if existing:
        return jsonify({"message": "Student already registered in course"}), 400

    new_enroll = {
        "id": f"e_{uuid.uuid4().hex[:8]}",
        "courseId": course_id,
        "studentId": student_id,
        "progress": 0,
        "completed": False,
        "completedLessons": [],
        "attendanceRecords": [],
        "enrolledAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    enrollments.insert_one(new_enroll)

    # Real-Time Notifications
    # Notify student
    create_send_notification(
        student_id,
        "Successfully Enrolled in Course!",
        f"You have successfully registered for the course '{course['title']}'. Begin your learning path now!",
        "course-enrollment",
        {"courseId": course_id}
    )

    # Notify instructor
    if course.get("instructorId"):
        create_send_notification(
            course["instructorId"],
            "New Student Joined Your Course!",
            f"'{current_user['name']}' has joined your course '{course['title']}'.",
            "course-enrollment",
            {"courseId": course_id, "studentId": student_id}
        )

    return jsonify(serialize_doc(new_enroll)), 201

@app.route("/api/enrollments/complete-lesson", methods=["POST"])
@token_required
def complete_lesson(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    lesson_id = data.get("lessonId")
    student_id = current_user["id"]

    if not course_id or not lesson_id:
        return jsonify({"message": "courseId and lessonId arguments are mandatory!"}), 400

    enroll = enrollments.find_one({"courseId": course_id, "studentId": student_id})
    if not enroll:
        return jsonify({"message": "Active enrollment not found for this user!"}), 404

    completed_lessons = enroll.get("completedLessons", [])
    if lesson_id not in completed_lessons:
        completed_lessons.append(lesson_id)

    # Calculate total and set progress
    all_lessons = list(lessons.find({"courseId": course_id}))
    total_count = len(all_lessons)
    
    progress = 0
    if total_count > 0:
        progress = int((len(completed_lessons) / total_count) * 100)

    completed = progress >= 100

    enrollments.update_one(
        {"id": enroll["id"]},
        {"$set": {
            "completedLessons": completed_lessons,
            "progress": progress,
            "completed": completed
        }}
    )

    # If completed, notify student
    if completed:
        course = courses.find_one({"id": course_id})
        create_send_notification(
            student_id,
            "🎓 Course Completed!",
            f"Congratulations! You completed '{course['title'] if course else 'your course'}'. Claim your certificate!",
            "course-completed",
            {"courseId": course_id}
        )

    return jsonify({"success": True, "progress": progress, "completed": completed}), 200


# 4. ASSIGNMENT SYSTEM MODULE
@app.route("/api/assignments", methods=["POST"])
@token_required
@roles_authorized("teacher", "admin")
def create_assignment(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    title = data.get("title", "").strip()
    instructions = data.get("instructions", "").strip()
    max_points = int(data.get("maxPoints", 100))
    due_date = data.get("dueDate", datetime.datetime.utcnow().isoformat() + "Z")

    if not course_id or not title:
        return jsonify({"message": "Required fields: title and courseId."}), 400

    new_assign = {
        "id": f"a_{uuid.uuid4().hex[:6]}",
        "courseId": course_id,
        "title": title,
        "instructions": instructions,
        "maxPoints": max_points,
        "dueDate": due_date,
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    assignments.insert_one(new_assign)

    # Notifications to course participants
    course = courses.find_one({"id": course_id})
    enrolled_students = list(enrollments.find({"courseId": course_id}))
    for student in enrolled_students:
        create_send_notification(
            student["studentId"],
            "New Assignment Released!",
            f"A new assignment '{title}' has been published in '{course['title'] if course else 'Course'}'. Due: {due_date[:10]}.",
            "new-assignment",
            {"courseId": course_id, "assignmentId": new_assign["id"]}
        )

    return jsonify(serialize_doc(new_assign)), 201

@app.route("/api/submissions", methods=["POST"])
@token_required
@roles_authorized("student")
def create_submission(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    assignment_id = data.get("assignmentId")
    submitted_code = data.get("submittedCode", "").strip()

    if not course_id or not assignment_id or not submitted_code:
        return jsonify({"message": "Required arguments missing from submissions context!"}), 400

    new_sub = {
        "id": f"s_{uuid.uuid4().hex[:8]}",
        "courseId": course_id,
        "assignmentId": assignment_id,
        "studentId": current_user["id"],
        "studentName": current_user["name"],
        "submittedCode": submitted_code,
        "grade": None,
        "feedback": None,
        "gradedAt": None,
        "gradedBy": None,
        "submittedAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    submissions.insert_one(new_sub)
    return jsonify(serialize_doc(new_sub)), 201

@app.route("/api/submissions/<sub_id>/grade", methods=["POST"])
@token_required
@roles_authorized("teacher", "admin")
def grade_submission(current_user, sub_id):
    data = request.json or {}
    grade = data.get("grade")
    feedback = data.get("feedback", "").strip()

    if grade is None:
        return jsonify({"message": "Grade input parameter is required!"}), 400

    sub = submissions.find_one({"id": sub_id})
    if not sub:
        return jsonify({"message": "Target student submission not found in database!"}), 404

    submissions.update_one(
        {"id": sub_id},
        {"$set": {
            "grade": grade,
            "feedback": feedback,
            "gradedAt": datetime.datetime.utcnow().isoformat() + "Z",
            "gradedBy": current_user["id"]
        }}
    )

    # Notify student
    assign = assignments.find_one({"id": sub["assignmentId"]})
    course = courses.find_one({"id": sub["courseId"]})
    
    create_send_notification(
         sub["studentId"],
         "New Assignment Grade Posted!",
         f"Your work for '{assign['title'] if assign else 'Assignment'}' in '{course['title'] if course else 'Course'}' has been marked. Grade: {grade}/{assign['maxPoints'] if assign else 100}",
         "grade-released",
         {"courseId": sub["courseId"], "assignmentId": sub["assignmentId"], "submissionId": sub["id"]}
    )

    return jsonify({"success": True}), 200


# 5. DISCUSSION FORUM MODULE
@app.route("/api/courses/<course_id>/forum", methods=["POST"])
@token_required
def create_forum_post(current_user, course_id):
    data = request.json or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    category = data.get("category", "General")

    if not title or not content:
        return jsonify({"message": "Forum post must include title and body text."}), 400

    new_post = {
        "id": f"p_{uuid.uuid4().hex[:6]}",
        "courseId": course_id,
        "authorId": current_user["id"],
        "authorName": current_user["name"],
        "authorRole": current_user["role"],
        "title": title,
        "content": content,
        "category": category,
        "likes": [],
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    forums.insert_one(new_post)

    # Post notifications within active course lists
    course = courses.find_one({"id": course_id})
    if course:
        enrolled_students = list(enrollments.find({"courseId": course_id}))
        for student in enrolled_students:
            if student["studentId"] != current_user["id"]:
                create_send_notification(
                    student["studentId"],
                    "New Forum Thread Posted!",
                    f"'{current_user['name']}' posted a new discussion: '{title}' in course '{course['title']}'.",
                    "forum-activity",
                    {"courseId": course_id, "postId": new_post["id"]}
                )

        # Notify instructor
        if course.get("instructorId") and course["instructorId"] != current_user["id"]:
            create_send_notification(
                course["instructorId"],
                "New Forum Post Joined Course!",
                f"'{current_user['name']}' posted discussion thread for: '{title}' in your course.",
                "forum-activity",
                {"courseId": course_id, "postId": new_post["id"]}
            )

    return jsonify(serialize_doc(new_post)), 201

@app.route("/api/forum/<post_id>/comments", methods=["POST"])
@token_required
def create_comment(current_user, post_id):
    data = request.json or {}
    content = data.get("content", "").strip()
    parent_id = data.get("parentId") # nesting support

    if not content:
        return jsonify({"message": "Comment body Content is mandatory!"}), 400

    post = forums.find_one({"id": post_id})
    if not post:
        return jsonify({"message": "Parent discussion post not found!"}), 404

    new_comment = {
        "id": f"com_{uuid.uuid4().hex[:6]}",
        "postId": post_id,
        "parentId": parent_id,
        "authorId": current_user["id"],
        "authorName": current_user["name"],
        "authorRole": current_user["role"],
        "content": content,
        "likes": [],
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    comments.insert_one(new_comment)

    # Notify original post creator
    if post.get("authorId") and post["authorId"] != current_user["id"]:
         create_send_notification(
             post["authorId"],
             "New Comment on Your Thread",
             f"'{current_user['name']}' commented on your thread '{post['title']}': '{content[:50]}...'",
             "forum-activity",
             {"courseId": post["courseId"], "postId": post_id, "commentId": new_comment["id"]}
         )

    return jsonify(serialize_doc(new_comment)), 201


# 6. PROGRESS PROFILE PORT METRICS
@app.route("/api/users/<user_id>/progress", methods=["GET"])
@token_required
def get_user_progress_profile(current_user, user_id):
    if current_user["id"] != user_id and current_user["role"] not in ["teacher", "admin"]:
        return jsonify({"message": "Access Denied: Unmatched credentials."}), 403

    user_enrolls = list(enrollments.find({"studentId": user_id}))
    user_subs = list(submissions.find({"studentId": user_id}))
    user_attendance = list(attendance.find({"userId": user_id}))
    user_live_classes = serialize_list(live_classes.find())

    # Build rich statistics report
    progress_details = {
         "enrollments": serialize_list(user_enrolls),
         "submissions": serialize_list(user_subs),
         "attendance": serialize_list(user_attendance),
         "liveClasses": user_live_classes
    }
    return jsonify(progress_details), 200


# 7. ATTENDANCE CHECKS & BULK OPERATIONS
@app.route("/api/attendance/check-in", methods=["POST"])
@token_required
def check_in_attendance(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    date_str = data.get("date", datetime.date.today().isoformat())

    if not course_id:
        return jsonify({"message": "Missing courseId key from attendance profile."}), 400

    new_att = {
         "id": f"att_{uuid.uuid4().hex[:6]}",
         "courseId": course_id,
         "userId": current_user["id"],
         "userName": current_user["name"],
         "date": date_str,
         "status": "present",
         "submittedAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    attendance.insert_one(new_att)
    return jsonify(serialize_doc(new_att)), 201


# 8. NOTIFICATIONS HANDLERS
@app.route("/api/users/<user_id>/notifications", methods=["GET"])
@token_required
def get_notifications(current_user, user_id):
    user_notifs = serialize_list(notifications.find({"userId": user_id}))
    return jsonify(user_notifs), 200

@app.route("/api/notifications/<notif_id>/read", methods=["POST"])
@token_required
def mark_read(current_user, notif_id):
    notifications.update_one({"id": notif_id}, {"$set": {"read": True}})
    return jsonify({"success": True}), 200


# 9. INTEGRATED GEMINI AI TUTOR
@app.route("/api/ai/chat", methods=["POST"])
@token_required
def ai_chat_companion(current_user):
    data = request.json or {}
    message = data.get("message", "").strip()
    course_id = data.get("courseId")
    lesson_id = data.get("lessonId")

    if not message:
         return jsonify({"message": "Empty chat requests forbidden!"}), 400

    course_title = "Science and Computing"
    lesson_title = "the Syllabus"

    if course_id:
         course = courses.find_one({"id": course_id})
         if course:
              course_title = course["title"]
    if lesson_id:
         lesson = lessons.find_one({"id": lesson_id})
         if lesson:
              lesson_title = lesson["title"]

    # Log user message to history
    user_msg = {
        "id": f"chat_u_{int(time.time())}",
        "userId": current_user["id"],
        "role": "user",
        "message": message,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }
    chat_history.insert_one(user_msg)

    ai_reply_text = ""

    # Call Gemini API if Key is present
    if Config.GEMINI_API_KEY and Config.GEMINI_API_KEY != "MY_GEMINI_API_KEY":
        try:
            # Lazy import google-genai
            from google import genai
            client = genai.Client(api_key=Config.GEMINI_API_KEY)
            
            # Construct instructions matching our prompt rules
            system_instruction = (
                f"You are 'Socrates-AI Study Guide', a helpful, cheerful, and disciplined computer science tutor for the course titled '{course_title}'. "
                f"Your tone is encouraging, scientific, and clear. Maintain insights from '{lesson_title}' of the syllabus. Keep code elegant, short, and explanatory."
            )
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=message,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                )
            )
            ai_reply_text = response.text
        except Exception as e:
            ai_reply_text = f"Socrates AI encountered an API issue: {str(e)}. However, here is a localized fallback reply explaining concepts."
    
    # Simple clever fallback logic
    if not ai_reply_text:
        ai_reply_text = (
            f"Hello {current_user['name']}! I'm Socrates AI, your learning tutor. "
            f"It looks like my live Gemini model cloud keys are not active in your configuration environment right now. "
            f"But I can still assist you on course topics in '{course_title}'! Please formulate questions about lessons on code architecture, full-stack pipelines, or prompt engineering."
        )

    # Save and output AI Reply
    ai_msg = {
        "id": f"chat_ai_{int(time.time())}",
        "userId": current_user["id"],
        "role": "assistant",
        "message": ai_reply_text,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }
    chat_history.insert_one(ai_msg)

    return jsonify({
         "response": ai_reply_text,
         "chatHistory": serialize_list(chat_history.find({"userId": current_user["id"]}))
    }), 200


# 10. LIVE CLASSES & INTERACTIVE SESSIONS
@app.route("/api/live-classes", methods=["POST"])
@token_required
@roles_authorized("teacher", "admin")
def schedule_live_class(current_user):
    data = request.json or {}
    course_id = data.get("courseId")
    title = data.get("title", "").strip()
    date_str = data.get("date")
    time_str = data.get("time")

    if not course_id or not title:
        return jsonify({"message": "Required: courseId and title to schedule classes."}), 400

    new_class = {
         "id": f"lc_{uuid.uuid4().hex[:6]}",
         "courseId": course_id,
         "title": title,
         "date": date_str or datetime.date.today().isoformat(),
         "time": time_str or "12:00 PM",
         "status": "scheduled",
         "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    live_classes.insert_one(new_class)

    # Dispatch alerts to students
    course = courses.find_one({"id": course_id})
    enrolled = list(enrollments.find({"courseId": course_id}))
    for item in enrolled:
         create_send_notification(
             item["studentId"],
             "New Live Class Scheduled!",
             f"{course['title'] if course else 'Course'}: '{title}' has been scheduled for {date_str} at {time_str}.",
             "live-class-reminder",
             {"courseId": course_id, "liveClassId": new_class["id"]}
         )

    return jsonify(serialize_doc(new_class)), 201

@app.route("/api/live-classes/<class_id>/status", methods=["POST"])
@token_required
@roles_authorized("teacher", "admin")
def update_live_status(current_user, class_id):
    data = request.json or {}
    status = data.get("status") # "scheduled" | "live" | "ended"

    if not status:
         return jsonify({"message": "status parameter is required"}), 400

    live_class = live_classes.find_one({"id": class_id})
    if not live_class:
         return jsonify({"message": "Live session room not found!"}), 404

    live_classes.update_one({"id": class_id}, {"$set": {"status": status}})

    # Trigger alerts if transition changed to "live"
    if status == "live":
        enrolled = list(enrollments.find({"courseId": live_class["courseId"]}))
        for student in enrolled:
            create_send_notification(
                 student["studentId"],
                 "🔴 Live Class is Starting Now!",
                 f"Your class '{live_class['title']}' has started! Click here to join the live session room.",
                 "live-class-starting",
                 {"courseId": live_class["courseId"], "liveClassId": live_class["id"]}
            )

    return jsonify({"success": True, "status": status}), 200

@app.route("/api/live-classes/<class_id>/join", methods=["POST"])
@token_required
def join_live_classroom(current_user, class_id):
    live_class = live_classes.find_one({"id": class_id})
    if not live_class:
         return jsonify({"message": "Session room has ended or was cancelled!"}), 404

    # Log user present in class registry attendance
    date_today = datetime.date.today().isoformat()
    existing_att = attendance.find_one({
         "courseId": live_class["courseId"],
         "userId": current_user["id"],
         "date": date_today
    })

    if not existing_att:
         check_in = {
             "id": f"att_{uuid.uuid4().hex[:6]}",
             "courseId": live_class["courseId"],
             "userId": current_user["id"],
             "userName": current_user["name"],
             "date": date_today,
             "status": "present",
             "notes": "Live interactive class join check-in automatic trigger",
             "submittedAt": datetime.datetime.utcnow().isoformat() + "Z"
         }
         attendance.insert_one(check_in)

    return jsonify({"roomToken": f"token_{uuid.uuid4().hex[:12]}", "roomUrl": f"/live-stream/{class_id}"}), 200


if __name__ == "__main__":
    port = Config.PORT
    print(f"[Flask LMS Backend] Starting server pipeline on host 0.0.0.0 and port {port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=Config.DEBUG)
