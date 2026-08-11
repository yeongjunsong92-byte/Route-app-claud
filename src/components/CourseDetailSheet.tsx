// src/components/CourseDetailSheet.tsx
// 코스 카드를 탭했을 때 아래에서 올라오는 상세 바텀시트.
//
// [구조 안정화] 예전엔 이미 로드된 Course 객체를 통째로 props로 받았는데,
// FeedScreen처럼 "courseId만 아는" 화면에서는 dummy 데이터에서 찾다가 실패해서
// 아무 반응이 없는(흰 화면) 문제가 있었습니다. 이제 courseId(string)만 받아서
// 컴포넌트 내부에서 직접 Firestore를 조회하므로, 어느 화면에서 열든 항상 같은 방식으로
// 동작하고, 로딩/실패 상태도 명시적으로 보여줍니다.

import { useEffect, useState } from "react";
import { X, Heart, Bookmark, Share, Share2, Clock, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getCourse,
  toggleCourseLike,
  toggleCourseSave,
  getCourseLikeSaveStatus,
  createNotification,
} from "../lib/firestore";
import { shareCourse, setCourseShareMeta, resetShareMeta } from "../lib/share";
import { CATEGORY_META } from "../lib/types";
import type { Course } from "../lib/types";

interface CourseDetailSheetProps {
  courseId: string | null;
  onClose: () => void;
  onStartTravel?: (courseId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export default function CourseDetailSheet({
  courseId,
  onClose,
  onStartTravel,
  onOpenProfile,
}: CourseDetailSheetProps) {
  const { user, profile } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"not-found" | "network" | "">("");

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<"like" | "save" | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // courseId가 바뀔 때마다 코스 본문 + 내 좋아요/저장 상태를 함께 불러옵니다.
  useEffect(() => {
    setCourse(null);
    setLiked(false);
    setSaved(false);
    setError("");

    if (!courseId) return;

    let cancelled = false;
    setLoading(true);

    getCourse(courseId)
      .then(async (result) => {
        if (cancelled) return;
        if (!result) {
          setError("not-found"); // 문서가 삭제됐거나 courseId가 잘못된 경우
          return;
        }
        setCourse(result);
        if (user) {
          const status = await getCourseLikeSaveStatus(courseId, user.uid).catch(() => null);
          if (!cancelled && status) {
            setLiked(status.liked);
            setSaved(status.saved);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("network");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, user]);

  // 공유 미리보기(og:title/description/image/작성자)를 코스 정보로 갱신하고, 닫힐 때 되돌립니다.
  useEffect(() => {
    if (!course) return;
    setCourseShareMeta({
      courseId: course.id,
      title: course.title,
      description: course.description,
      authorName: course.authorName,
      imageUrl: course.coverImageUrl,
    });
    return () => resetShareMeta();
  }, [course]);

  if (!courseId) return null;

  const handleShare = async () => {
    if (!course) return;
    const result = await shareCourse({
      courseId: course.id,
      title: course.title,
      description: course.description,
      authorName: course.authorName,
      imageUrl: course.coverImageUrl,
    });
    if (result === "copied") setShareToast("링크가 복사되었어요");
    else if (result === "failed") setShareToast("공유에 실패했어요");
    else return; // "shared" / "cancelled"는 별도 알림 없이 조용히 종료
    setTimeout(() => setShareToast(null), 2000);
  };

  const handleToggleLike = async () => {
    if (!user || !course || pending) return;
    setPending("like");
    const prev = liked;
    setLiked(!prev); // 낙관적 업데이트
    try {
      const result = await toggleCourseLike(course.id, user.uid);
      setLiked(result);
      // 좋아요가 눌린 경우에만(취소가 아니라) 알림을 생성합니다. 자기 코스에 자기가
      // 좋아요를 누른 경우는 createNotification 내부에서 자동으로 무시됩니다.
      if (result) {
        createNotification({
          recipientId: course.authorId,
          actorId: user.uid,
          actorName: profile?.displayName ?? user.displayName ?? "여행자",
          actorPhotoURL: profile?.avatarUrl ?? user.photoURL ?? "",
          type: "like",
          targetId: course.id,
          targetType: "course",
          message: "회원님의 코스를 좋아합니다",
        }).catch((err) => console.error(err));
      }
    } catch (err) {
      console.error(err);
      setLiked(prev); // 실패 시 되돌리기
    } finally {
      setPending(null);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !course || pending) return;
    setPending("save");
    const prev = saved;
    setSaved(!prev);
    try {
      const result = await toggleCourseSave(course.id, user.uid);
      setSaved(result);
    } catch (err) {
      console.error(err);
      setSaved(prev);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[480px]">
      <div
        className="absolute inset-0 animate-fade-in bg-gray-800/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="animate-sheet-up absolute bottom-0 left-0 right-0 max-h-[88vh] min-h-[40vh] overflow-y-auto rounded-t-3xl bg-white shadow-sheet">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
          <span className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
          <button
            onClick={onClose}
            aria-label="닫기"
            className="tap-scale absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-paper text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* 로딩 상태: 예전엔 여기서 아무것도 안 뜨고 "흰 화면"이었던 부분 */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-gray-600">
            <Loader2 size={22} className="animate-spin" />
            <p className="text-sm">코스를 불러오는 중...</p>
          </div>
        )}

        {/* 문서를 못 찾음: 삭제됐거나 잘못된 courseId */}
        {!loading && error === "not-found" && (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-center">
            <AlertCircle size={24} className="text-gray-600" />
            <p className="text-sm font-medium text-gray-800">코스를 찾을 수 없어요</p>
            <p className="text-xs text-gray-600">삭제되었거나 더 이상 존재하지 않는 코스예요.</p>
            <button
              onClick={onClose}
              className="tap-scale mt-2 rounded-full bg-primary-light px-4 py-2 text-xs font-semibold text-primary"
            >
              닫기
            </button>
          </div>
        )}

        {/* 네트워크 등 조회 실패 */}
        {!loading && error === "network" && (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-center">
            <AlertCircle size={24} className="text-gray-600" />
            <p className="text-sm font-medium text-gray-800">코스를 불러오지 못했어요</p>
            <p className="text-xs text-gray-600">잠시 후 다시 시도해주세요.</p>
            <button
              onClick={onClose}
              className="tap-scale mt-2 rounded-full bg-primary-light px-4 py-2 text-xs font-semibold text-primary"
            >
              닫기
            </button>
          </div>
        )}

        {!loading && !error && course && (
          <>
            <div className="relative h-56 w-full">
              <img
                src={course.coverImageUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            <div className="px-5 pt-4">
              <p className="text-xs font-medium text-secondary">
                {course.region} · {course.durationDays}일 코스
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-800">{course.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{course.description}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onOpenProfile?.(course.authorId)}
                  disabled={!onOpenProfile}
                  className="tap-scale flex items-center gap-2 disabled:pointer-events-none"
                >
                  <img
                    src={course.authorAvatarUrl}
                    alt={course.authorName}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-gray-600">{course.authorName}</span>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {course.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="route-divider my-5" />

              <h3 className="text-base font-semibold text-gray-800">여행 코스</h3>
              <ol className="relative mt-4 space-y-5 border-l border-dashed border-gray-300 pl-5">
                {course.stops.map((stop) => {
                  const meta = CATEGORY_META[stop.place.category];
                  return (
                    <li key={stop.order} className="relative">
                      <span
                        className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {stop.order}
                      </span>
                      <div className="flex gap-3 rounded-xl border border-gray-300 p-2.5">
                        <img
                          src={stop.place.imageUrl}
                          alt={stop.place.name}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {stop.time && (
                              <span className="text-[11px] font-semibold text-gray-600">
                                {stop.time}
                              </span>
                            )}
                            <span
                              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: meta.bg, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <h4 className="mt-0.5 truncate text-sm font-medium text-gray-800">
                            {stop.place.name}
                          </h4>
                          <p className="truncate text-xs text-gray-600">{stop.place.address}</p>
                          {stop.memo && (
                            <p className="mt-1 truncate text-xs text-primary">{stop.memo}</p>
                          )}
                        </div>
                        {stop.stayMinutes && (
                          <span className="ml-auto flex shrink-0 items-center gap-1 self-start text-[11px] text-gray-600">
                            <Clock size={12} />
                            {stop.stayMinutes}분
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="sticky bottom-0 relative mt-6 flex items-center gap-2 border-t border-gray-300 bg-white px-5 py-3 safe-bottom">
              {shareToast && (
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800/85 px-3 py-1.5 text-xs text-white">
                  {shareToast}
                </div>
              )}
              <button
                onClick={handleToggleLike}
                disabled={!user}
                className="tap-scale flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 disabled:opacity-40"
                aria-label="좋아요"
              >
                <Heart size={20} className={liked ? "fill-primary text-primary" : "text-gray-800"} />
              </button>
              <button
                onClick={handleToggleSave}
                disabled={!user}
                className="tap-scale flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 disabled:opacity-40"
                aria-label="저장"
              >
                <Bookmark size={20} className={saved ? "fill-primary text-primary" : "text-gray-800"} />
              </button>
              <button
                onClick={handleShare}
                className="tap-scale flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-800"
                aria-label="공유"
              >
                <Share size={20} />
              </button>
              <button
                onClick={() => {
                  onStartTravel?.(course.id);
                  onClose();
                }}
                className="tap-scale flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white"
              >
                <Share2 size={16} />이 코스로 여행 시작하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
