// src/screens/MyPageScreen.tsx
// 내 코스와 마이 화면을 mode로 분리합니다. Firebase 프로필·코스·아바타 로직은 유지합니다.

import { useEffect, useRef, useState } from "react";
import { BookOpen, Camera, Loader2, LogOut, MapPinned, RefreshCw, UserRound } from "lucide-react";
import CourseCard from "../components/CourseCard";
import { useAuth } from "../context/AuthContext";
import { signOut } from "../lib/auth";
import { getCoursesByAuthor, getSavedCourses, updateUserProfile } from "../lib/firestore";
import { uploadAvatar } from "../lib/storage";
import type { Course } from "../lib/types";

type CourseTab = "my" | "saved";
type MyPageMode = "courses" | "profile";

interface MyPageScreenProps {
  mode: MyPageMode;
  onOpenCourse: (courseId: string) => void;
}

export default function MyPageScreen({ mode, onOpenCourse }: MyPageScreenProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [courseTab, setCourseTab] = useState<CourseTab>("my");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = profile?.displayName ?? user?.displayName ?? "여행자";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatarUrl || user?.photoURL || "";
  const isCoursesMode = mode === "courses";
  const currentList = courseTab === "my" ? myCourses : savedCourses;

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

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-medium text-secondary">{isCoursesMode ? "MY ROUTES" : "Route"}</p>
          <h1 className="mt-0.5 text-xl font-bold text-gray-800">
            {isCoursesMode ? "내 코스" : "마이"}
          </h1>
        </div>
        {!isCoursesMode && (
          <button
            onClick={() => signOut()}
            aria-label="로그아웃"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
          >
            <LogOut size={16} className="text-gray-600" />
          </button>
        )}
      </header>

      {isCoursesMode ? (
        <>
          <section className="mx-5 mt-4 rounded-2xl border border-gray-300 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                <BookOpen size={19} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">저장된 여행 Route</h2>
                <p className="mt-0.5 text-xs text-gray-600">만든 일정과 저장한 코스를 한곳에서 관리하세요.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-paper px-3 py-2.5">
                <p className="text-[11px] text-gray-600">생성한 코스</p>
                <p className="mt-0.5 text-base font-bold text-gray-800">{myCourses.length}<span className="ml-0.5 text-xs font-medium text-gray-600">개</span></p>
              </div>
              <div className="rounded-xl bg-paper px-3 py-2.5">
                <p className="text-[11px] text-gray-600">저장한 코스</p>
                <p className="mt-0.5 text-base font-bold text-gray-800">{savedCourses.length}<span className="ml-0.5 text-xs font-medium text-gray-600">개</span></p>
              </div>
            </div>
          </section>

          <div className="mt-6 flex border-b border-gray-300 px-5">
            {(
              [
                { key: "my", label: "생성한 코스" },
                { key: "saved", label: "저장한 코스" },
              ] as { key: CourseTab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCourseTab(key)}
                className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                  courseTab === key ? "border-b-2 border-primary-dark text-primary-dark" : "text-gray-600"
                }`}
              >
                {label} <span className="text-xs">{key === "my" ? myCourses.length : savedCourses.length}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 px-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-secondary">{courseTab === "my" ? "MY CREATED ROUTES" : "SAVED ROUTES"}</p>
                <h2 className="mt-0.5 text-base font-semibold text-gray-800">
                  {courseTab === "my" ? "내가 만든 코스" : "저장한 코스"}
                </h2>
              </div>
              {!loading && !error && <span className="text-xs text-gray-600">{currentList.length}개</span>}
            </div>
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
                  className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark"
                >
                  <RefreshCw size={12} />
                  다시 시도
                </button>
              </div>
            )}

            {!loading && !error && currentList.length === 0 && (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary-dark">
                  <MapPinned size={20} />
                </span>
                <p className="mt-3 text-sm font-semibold text-gray-800">
                  {courseTab === "my" ? "아직 만든 Route가 없어요" : "아직 저장한 Route가 없어요"}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  {courseTab === "my"
                    ? "지도에서 장소를 찾고 첫 여행 코스를 만들어보세요."
                    : "마음에 드는 코스를 저장하면 이곳에서 다시 확인할 수 있어요."}
                </p>
              </div>
            )}

            {!loading && !error && currentList.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {currentList.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    variant="list"
                    onClick={(selectedCourse) => onOpenCourse(selectedCourse.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <section className="mx-5 mt-4 flex items-center gap-4 rounded-2xl border border-gray-300 bg-white p-4 shadow-card">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="프로필 사진 변경"
              className="tap-scale relative h-16 w-16 shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                  <UserRound size={28} />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white">
                {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAvatarChange(event.target.files)}
            />

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-800">{displayName}</h2>
              {email && <p className="mt-0.5 truncate text-xs text-gray-600">{email}</p>}
              <p className="mt-1 text-xs text-gray-600">{profile?.bio || "나만의 여행 Route를 관리해보세요."}</p>
              {avatarError && <p className="mt-1 text-[11px] text-red-500">{avatarError}</p>}
            </div>
          </section>

          <section className="mx-5 mt-3 flex items-center justify-between rounded-2xl border border-gray-300 bg-white p-4 shadow-card">
            <div>
              <p className="text-sm font-semibold text-gray-800">계정 관리</p>
              <p className="mt-1 text-xs text-gray-600">프로필 사진과 로그인 정보를 확인할 수 있어요.</p>
            </div>
            <span className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark">
              내 코스 {myCourses.length}
            </span>
          </section>
        </>
      )}
    </div>
  );
}
