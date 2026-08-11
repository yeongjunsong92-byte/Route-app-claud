// src/screens/UserProfileScreen.tsx
// 사용자 프로필 화면. 본인 프로필이면 자신의 코스(공개+비공개)를, 다른 사용자면 팔로우 버튼과
// 공개 코스만 보여줍니다. MyPageScreen(본인 전용, 프로필 수정 포함)과는 별개의 화면입니다.

import { useEffect, useState } from "react";
import { X, UserRound, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import CourseCard from "../components/CourseCard";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  getCoursesByAuthor,
  getPublicCoursesByAuthor,
  getFollowStatus,
  toggleFollow,
  createNotification,
} from "../lib/firestore";
import type { Course, UserProfile } from "../lib/types";

interface UserProfileScreenProps {
  userId: string;
  onClose: () => void;
  onOpenCourse: (courseId: string) => void;
  onOpenFollowList: (userId: string, kind: "followers" | "following") => void;
}

export default function UserProfileScreen({
  userId,
  onClose,
  onOpenCourse,
  onOpenFollowList,
}: UserProfileScreenProps) {
  const { user, profile: myProfile } = useAuth();
  const isSelf = user?.uid === userId;

  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, list] = await Promise.all([
        getUserProfile(userId),
        isSelf ? getCoursesByAuthor(userId) : getPublicCoursesByAuthor(userId),
      ]);
      setTargetProfile(p);
      setCourses(list);
      if (!isSelf && user) {
        setFollowing(await getFollowStatus(user.uid, userId));
      }
    } catch (err) {
      console.error(err);
      setError("프로필을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.uid]);

  const handleToggleFollow = async () => {
    if (!user || isSelf || followPending) return;
    setFollowPending(true);
    const prevFollowing = following;
    const delta = prevFollowing ? -1 : 1;
    setFollowing(!prevFollowing);
    setTargetProfile((p) => (p ? { ...p, followerCount: p.followerCount + delta } : p));
    try {
      const result = await toggleFollow(user.uid, userId);
      setFollowing(result);
      if (result) {
        createNotification({
          recipientId: userId,
          actorId: user.uid,
          actorName: myProfile?.displayName ?? user.displayName ?? "여행자",
          actorPhotoURL: myProfile?.avatarUrl ?? user.photoURL ?? "",
          type: "follow",
          targetId: user.uid,
          targetType: "user",
          message: "회원님을 팔로우하기 시작했습니다",
        }).catch((err) => console.error(err));
      }
    } catch (err) {
      console.error(err);
      // 실패 시 낙관적 업데이트를 되돌립니다.
      setFollowing(prevFollowing);
      setTargetProfile((p) => (p ? { ...p, followerCount: p.followerCount - delta } : p));
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-2 bg-paper text-gray-600">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm">프로필을 불러오는 중...</p>
      </div>
    );
  }

  if (error || !targetProfile) {
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-2 bg-paper px-5 text-center">
        <AlertCircle size={24} className="text-gray-600" />
        <p className="text-sm font-medium text-gray-800">{error || "사용자를 찾을 수 없어요"}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={load}
            className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-4 py-2 text-xs font-semibold text-primary"
          >
            <RefreshCw size={12} />
            다시 시도
          </button>
          <button
            onClick={onClose}
            className="tap-scale rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-base font-bold text-gray-800">프로필</h1>
        <div className="h-9 w-9" />
      </header>

      <section className="mx-5 mt-4 flex items-center gap-4 rounded-2xl border border-gray-300 bg-white p-4">
        {targetProfile.avatarUrl ? (
          <img
            src={targetProfile.avatarUrl}
            alt={targetProfile.displayName}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <UserRound size={28} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-800">{targetProfile.displayName}</h2>
          <p className="mt-1 text-xs text-gray-600">{targetProfile.bio || "아직 소개가 없어요"}</p>
        </div>
        {!isSelf && user && (
          <button
            onClick={handleToggleFollow}
            disabled={followPending}
            className={`tap-scale shrink-0 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50 ${
              following ? "border border-gray-300 text-gray-600" : "bg-primary text-white"
            }`}
          >
            {following ? "팔로잉" : "팔로우"}
          </button>
        )}
      </section>

      <section className="mx-5 mt-3 flex justify-around rounded-2xl border border-gray-300 bg-white py-3.5">
        <div className="text-center">
          <p className="text-base font-bold text-gray-800">{courses.length}</p>
          <p className="text-[11px] text-gray-600">코스</p>
        </div>
        <div className="h-full w-px bg-gray-300" />
        <button
          onClick={() => onOpenFollowList(userId, "followers")}
          className="tap-scale text-center"
        >
          <p className="text-base font-bold text-gray-800">{targetProfile.followerCount}</p>
          <p className="text-[11px] text-gray-600">팔로워</p>
        </button>
        <div className="h-full w-px bg-gray-300" />
        <button
          onClick={() => onOpenFollowList(userId, "following")}
          className="tap-scale text-center"
        >
          <p className="text-base font-bold text-gray-800">{targetProfile.followingCount}</p>
          <p className="text-[11px] text-gray-600">팔로잉</p>
        </button>
      </section>

      <div className="mt-6 px-5">
        <h3 className="text-sm font-semibold text-gray-800">
          {isSelf ? "내 코스" : `${targetProfile.displayName}님의 코스`}
        </h3>
        <div className="mt-3">
          {courses.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-600">
              {isSelf ? "아직 만든 코스가 없어요." : "아직 공개한 코스가 없어요."}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="list"
                  onClick={(c) => onOpenCourse(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
