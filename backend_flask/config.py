import os
from dotenv import load_dotenv

# Load environments
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "socrates_secret_key_6a38b1f8")
    JWT_SECRET = os.getenv("JWT_SECRET", "socrates_secret_key_6a38b1f8")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://user:password@cluster.mongodb.net/lms?retryWrites=true&w=majority")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
