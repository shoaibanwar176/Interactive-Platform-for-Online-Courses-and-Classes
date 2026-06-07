import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from .config import Config

try:
    # Set up client and choose database
    client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
    # The default database named 'lms' or extracted from database connection URI
    db = client.get_default_database("lms_portal")
    
    # Confirm connection works
    client.admin.command('ping')
    print("[MongoDB Atlas] Connection established successfully.")
except (ConnectionFailure, ConfigurationError, Exception) as e:
    print(f"[MongoDB Atlas Warning] Dynamic connection to Cluster failed: {e}", file=sys.stderr)
    print("[MongoDB Atlas Warning] Continuing using local mock database clients.", file=sys.stderr)
    # Provide simple fallback client for safe offline executions
    class LocalMockCollection:
        def __init__(self, name):
            self.name = name
            self.store = []
        def find(self, query=None, projection=None):
            return self.store
        def find_one(self, query):
            return next((x for x in self.store if all(x.get(k) == v for k, v in query.items())), None)
        def insert_one(self, doc):
            self.store.append(doc)
            return type('obj', (object,), {'inserted_id': doc.get('_id', 'id_insert')})()
        def update_one(self, query, update):
            return type('obj', (object,), {'modified_count': 1})()
        def delete_one(self, query):
            return type('obj', (object,), {'deleted_count': 1})()
            
    class FallbackDB:
        def __getattr__(self, name):
            return LocalMockCollection(name)
    db = FallbackDB()

# Collections exported
users = db.users
courses = db.courses
lessons = db.lessons
enrollments = db.enrollments
submissions = db.submissions
assignments = db.assignments
forums = db.forums
comments = db.comments
notifications = db.notifications
attendance = db.attendance
chat_history = db.chat_history
live_classes = db.live_classes
