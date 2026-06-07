import jwt
from functools import wraps
from flask import request, jsonify
from .config import Config
from .db import users

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Retrieve authorization header
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"].split(" ")
            if len(auth_header) == 2 and auth_header[0] == "Bearer":
                token = auth_header[1]
                
        if not token:
            return jsonify({"message": "Access Token remains missing from headers!"}), 401
            
        try:
            # Decode the JSON Web Token
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            current_user = users.find_one({"id": data["id"]})
            if not current_user:
                return jsonify({"message": "Associated User payload is invalid or deactivated!"}), 401
            
            # Remove password field from scope storage injection
            if "password" in current_user:
                del current_user["password"]
            if "_id" in current_user:
                current_user["_id"] = str(current_user["_id"])
                
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Authorization Token session is expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Session token signature is invalid!"}), 401
        except Exception as e:
            return jsonify({"message": f"Could not authenticate: {str(e)}"}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def roles_authorized(*roles):
    def decorator(f):
        @wraps(f)
        def wrapper(current_user, *args, **kwargs):
            if current_user.get("role") not in roles:
                return jsonify({
                    "message": f"Access Denied: Role authorization error! Required scope: {roles}"
                }), 403
            return f(current_user, *args, **kwargs)
        return wrapper
    return decorator
