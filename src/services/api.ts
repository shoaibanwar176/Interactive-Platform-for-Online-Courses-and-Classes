import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json"
  }
});

// Automatically inject JWT headers if token is found in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lms_token");
  if (token) {
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
