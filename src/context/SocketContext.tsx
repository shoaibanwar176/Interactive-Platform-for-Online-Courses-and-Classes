import React, { createContext, useContext, useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../services/api";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string; // "new-assignment" | "grade-released" | "course-enrollment" | "live-class-reminder" | "live-class-starting" | "forum-activity"
  read: boolean;
  createdAt: string;
  courseId?: string;
  assignmentId?: string;
  submissionId?: string;
  postId?: string;
  commentId?: string;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      return;
    }

    // Connect to same origin
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[Socket.IO Client] Connected to real-time gateway node:", newSocket.id);
      newSocket.emit("identify", user.id);
    });

    // Listen for real-time push notifications
    newSocket.on("notification", (newNotif: NotificationItem) => {
      console.log("[Socket.IO Client] Received real-time notification alert:", newNotif);
      setNotifications((prev) => {
        // Prevent duplicates
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      // Show real-time modern system notification
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(newNotif.title, {
            body: newNotif.message,
            tag: newNotif.id,
          });
        } catch (e) {
          console.warn("Could not dispatch desktop notification context:", e);
        }
      }
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket.IO Client] Disconnected from lms real-time server");
    });

    // Cleanup on user session logout / unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  // Load initial notifications list from DB via API on login
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/users/${user.id}/notifications`);
        // Sort with newest first
        const sorted = (response.data || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sorted);
      } catch (err) {
        console.error("Failed loading initial notification inbox from api:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user?.id]);

  // Request browser notification permissions on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission();
      } catch (err) {
        console.warn("Could not request web notification permissions:", err);
      }
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      await Promise.all(unread.map((n) => api.post(`/notifications/${n.id}/read`)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed marking all notifications read:", err);
    }
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useNotifications must be consumed within a SocketProvider context panel");
  }
  return context;
};
