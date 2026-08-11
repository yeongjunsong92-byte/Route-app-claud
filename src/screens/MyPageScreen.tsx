// src/screens/MyPageScreen.tsx
// 마이페이지: 내 프로필, 내가 만든 코스, 저장한 코스를 확인.
// [2단계] 아바타 업로드(uploadAvatar) 연결 + 내 코스/저장한 코스를 실제 Firestore로 조회.

import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound, Camera, Loader2, RefreshCw, History, Sparkles } from "lucide-react";
import CourseCard from "../components/CourseCard";
import { useAuth } from "../context/AuthContext";
import { signOut } from "../lib/auth";
import { getCoursesByAuthor, getSavedCourses, updateUserProfile } from "../lib/firestore";
import { uploadAvatar } from "../lib/storage";
import type { Course } from "../lib/types";

type Tab = "my" | "saved";

interface MyPageScreenProps {
  onOpenCourse: (courseId: string) => void;
  onOpenTravelLogs: () => void;
  onOpenAIRecommend: () => void;
}

export default function MyPageScreen({
  onOpenCourse,
  onOpenTravelLogs,
  onOpenAIRecommend,
}: MyPageScreenProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>("my");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 실제 Firebase 프로필 데이터를 우선 사용하고, 없을 때만 dummy 문자열("여행자")로 대체합니다.
  const displayName = profile?.displayName ?? user?.displayName ?? "여행자";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatarUrl || user?.photoURL || "";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [mine, saved] = await Promise.all([
        getCoursesByAuthor(user.uid),
        getSavedCourses(user.uid),
      ]);
      setMyCourses(mine);
      setSavedCourses(saved);
    } catch (err) {
      console.error(err);
      setError("코스를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleAvatarChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    setAvatarError("");
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateUserProfile(user.uid, { avatarUrl: url });
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setAvatarError("프로필 사진 업로드에 실패했어요.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const currentList = tab === "my" ? myCourses : savedCourses;

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-xl font-bold text-gray-800">마이페이지</h1>
        <div className="flex gap-2">
          <button
            onClick={onOpenAIRecommend}
            aria-label="AI 여행 추천"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
          >
            <Sparkles size={16} className="text-gray-600" />
          </button>
          <button
            onClick={onOpenTravelLogs}
            aria-label="여행 기록"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
          >
            <History size={16} className="text-gray-600" />
          </button>
          <button
            onClick={() => signOut()}
            aria-label="로그아웃"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
          >
            <LogOut size={16} className="text-gray-600" />
          </button>
        </div>
      </header>

      {/* 프로필 카드 */}
      <section className="mx-5 mt-4 flex items-center gap-4 rounded-2xl border border-gray-300 bg-white p-4">
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          aria-label="프로필 사진 변경"
          className="tap-scale relative h-16 w-16 shrink-0"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary">
              <UserRound size={28} />
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white">
            {uploadingAvatar ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Camera size={12} />
            )}
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleAvatarChange(e.target.files)}
        />

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-800">{displayName}</h2>
          {email && <p className="mt-0.5 truncate text-xs text-gray-600">{email}</p>}
          <p className="mt-1 text-xs text-gray-600">
            {profile?.bio || "여행 코스를 기록하고 공유해보세요"}
          </p>
          {avatarError && <p className="mt-1 text-[11px] text-red-500">{avatarError}</p>}
        </div>
      </section>

      <section className="mx-5 mt-3 flex justify-around rounded-2xl border border-gray-300 bg-white py-3.5">
        <div className="text-center">
          <p className="text-base font-bold text-gray-800">{myCourses.length}</p>
          <p className="text-[11px] text-gray-600">코스</p>
        </div>
        <div className="h-full w-px bg-gray-300" />
        <div className="text-center">
          <p className="text-base font-bold text-gray-800">{profile?.followerCount ?? 0}</p>
          <p className="text-[11px] text-gray-600">팔로워</p>
        </div>
        <div className="h-full w-px bg-gray-300" />
        <div className="text-center">
          <p className="text-base font-bold text-gray-800">{profile?.followingCount ?? 0}</p>
          <p className="text-[11px] text-gray-600">팔로잉</p>
        </div>
      </section>

      <div className="mt-6 flex border-b border-gray-300 px-5">
        {(
          [
            { key: "my", label: "내 코스" },
            { key: "saved", label: "저장한 코스" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              tab === key ? "border-b-2 border-primary text-primary" : "text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 px-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
            <Loader2 size={16} className="animate-spin" />
            불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-10">
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

        {!loading && !error && currentList.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-600">
            {tab === "my" ? "아직 만든 코스가 없어요. 첫 코스를 만들어보세요!" : "아직 저장한 코스가 없어요."}
          </p>
        )}

        {!loading && !error && currentList.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {currentList.map((course) => (
              <CourseCard key={course.id} course={course} variant="list" onClick={(c) => onOpenCourse(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
