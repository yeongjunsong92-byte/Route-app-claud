// src/screens/NotificationsScreen.tsx
// 알림 화면: 좋아요/댓글/팔로우 알림을 최신순으로 보여주고, 클릭 시 읽음 처리 + 관련 화면으로 이동.

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, RefreshCw, Heart, MessageCircle, UserPlus, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from "../lib/firestore";
import type { AppNotification } from "../lib/types";

interface NotificationsScreenProps {
  onClose: () => void;
  onOpenCourse: (courseId: string) => void;
  onOpenProfile: (userId: string) => void;
}

function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 60) return `${Math.max(diffMin, 1)}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "like") return <Heart size={12} className="fill-white text-white" />;
  if (type === "comment") return <MessageCircle size={12} className="text-white" />;
  if (type === "follow") return <UserPlus size={12} className="text-white" />;
  return <Bell size={12} className="text-white" />;
}

export default function NotificationsScreen({ onClose, onOpenCourse, onOpenProfile }: NotificationsScreenProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await getMyNotifications(user.uid);
      setNotifications(result);
    } catch (err) {
      console.error(err);
      setError("알림을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = (n: AppNotification) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      markNotificationRead(n.id).catch((err) => console.error(err));
    }
    // targetType이 "course"면 코스 상세로, "user"(팔로우)면 그 사용자 프로필로 이동합니다.
    if (n.targetType === "course" && n.targetId) {
      onOpenCourse(n.targetId);
      onClose();
    } else if (n.targetType === "user" && n.targetId) {
      onOpenProfile(n.targetId);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead(user.uid);
    } catch (err) {
      console.error(err);
      load();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper pb-10 safe-bottom">
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
        >
          <X size={16} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-800">알림</h1>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || markingAll}
          className="tap-scale rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-40"
        >
          모두 읽음
        </button>
      </header>

      <div className="mt-4 px-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
            <Loader2 size={16} className="animate-spin" />
            불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-16">
            <AlertCircle size={20} className="text-gray-600" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={load}
              className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <RefreshCw size={12} />
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-600">아직 알림이 없어요.</p>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`tap-scale flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${
                  n.isRead ? "border-gray-300 bg-white" : "border-primary/30 bg-primary-light"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      n.actorPhotoURL ||
                      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(n.actorName)}`
                    }
                    alt={n.actorName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-white">
                    <NotificationIcon type={n.type} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{n.actorName}</span>
                    {"님이 "}
                    {n.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span
                    aria-label="읽지 않음"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
