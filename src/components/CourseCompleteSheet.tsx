// src/components/CourseCompleteSheet.tsx
// 코스 저장 완료 화면. 1차 MVP에서는 내 코스 확인만 노출하고, SNS 확장 코드는 안전하게 보존합니다.

import { useRef, useState } from "react";
import { Bookmark, Check, ImagePlus, Link2, Loader2, Share2, X } from "lucide-react";
import { createFeedPost, updateCourse } from "../lib/firestore";
import { uploadPostImages } from "../lib/storage";
import type { Course } from "../lib/types";

interface CourseCompleteSheetProps {
  course: Course;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  onClose: () => void;
  onViewCourses: () => void;
}

type Mode = "complete" | "feedForm" | "linkDone";

// 피드 게시·링크 공유 기능은 1차 MVP에서 노출하지 않지만, 확장 시 재사용할 수 있도록 구현을 보존합니다.
const LEGACY_SOCIAL_ACTIONS_ENABLED = false;

export default function CourseCompleteSheet({
  course,
  authorId,
  authorName,
  authorAvatarUrl,
  onClose,
  onViewCourses,
}: CourseCompleteSheetProps) {
  const [mode, setMode] = useState<Mode>("complete");
  const [caption, setCaption] = useState(course.description);
  const [images, setImages] = useState<string[]>([course.coverImageUrl].filter(Boolean));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 아래 함수들은 공개 코스·피드·공유 확장용으로 유지하며, 1차 MVP UI에서는 호출되지 않습니다.
  const handlePickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    setError("");
    try {
      const urls = await uploadPostImages(authorId, course.id, Array.from(files).slice(0, 5));
      setImages((prev) => [...prev, ...urls].slice(0, 5));
    } catch (err) {
      console.error(err);
      setError("사진 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((item) => item !== url));

  const handlePublishToFeed = async () => {
    if (images.length === 0) {
      setError("사진을 1장 이상 추가해주세요.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      await updateCourse(course.id, { isPublic: true });
      await createFeedPost({
        courseId: course.id,
        authorId,
        authorName,
        authorAvatarUrl,
        location: course.region,
        images,
        caption: caption.trim() || course.title,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("게시 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setPublishing(false);
    }
  };

  const handleShareLink = async () => {
    setPublishing(true);
    setError("");
    try {
      await updateCourse(course.id, { isPublic: true });
      const shareUrl = `${window.location.origin}/course/${course.id}`;
      if (typeof navigator.share === "function") {
        await navigator.share({ title: course.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setMode("linkDone");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setPublishing(false);
        return;
      }
      console.error(err);
      setError("공유 링크 생성에 실패했어요. 다시 시도해주세요.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-[480px] items-end justify-center bg-gray-800/40">
      <div className="animate-sheet-up w-full rounded-t-3xl bg-white px-5 pb-8 pt-6 safe-bottom">
        {mode === "complete" && (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                <Check size={30} strokeWidth={2.5} />
              </div>
              <p className="mt-4 text-xs font-semibold text-secondary">ROUTE SAVED</p>
              <h2 className="mt-1 text-xl font-bold text-gray-800">코스를 저장했어요</h2>
              <p className="mt-1 text-sm text-gray-600">내 코스에서 언제든지 여행 일정을 확인할 수 있어요.</p>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-300 bg-paper p-4">
              <p className="text-sm font-semibold text-gray-800">{course.title}</p>
              <p className="mt-1 text-xs text-gray-600">
                {course.region} · {course.durationDays}일 · 장소 {course.stops.length}곳
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={onViewCourses}
                className="tap-scale flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-dark text-sm font-semibold text-white"
              >
                <Bookmark size={16} />
                내 코스에서 확인하기
              </button>
              <button
                onClick={onClose}
                className="tap-scale flex h-11 w-full items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-800"
              >
                새 코스 만들기
              </button>
            </div>
          </>
        )}

        {LEGACY_SOCIAL_ACTIONS_ENABLED && mode === "feedForm" && (
          <>
            <h2 className="text-base font-semibold text-gray-800">피드에 게시하기</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(url)}
                    aria-label="사진 제거"
                    className="tap-scale absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/70 text-white"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="tap-scale flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-600"
                >
                  {uploadingImage ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <ImagePlus size={18} />
                      <span className="text-[10px]">사진 추가</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handlePickImages(event.target.files)}
              />
            </div>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="이 코스에 대해 이야기해주세요"
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none"
            />
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("complete")}
                className="tap-scale flex h-11 flex-1 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-800"
              >
                뒤로
              </button>
              <button
                onClick={handlePublishToFeed}
                disabled={publishing || uploadingImage}
                className="tap-scale flex h-11 flex-[2] items-center justify-center rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-50"
              >
                {publishing ? "게시 중..." : "게시하기"}
              </button>
            </div>
          </>
        )}

        {LEGACY_SOCIAL_ACTIONS_ENABLED && mode === "linkDone" && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
              <Link2 size={24} className="text-primary-dark" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-800">
              {typeof navigator.share === "function" ? "공유 완료!" : "링크가 복사되었어요"}
            </p>
            <button
              onClick={onClose}
              className="tap-scale mt-5 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
            >
              확인
            </button>
          </div>
        )}

        {LEGACY_SOCIAL_ACTIONS_ENABLED && mode === "complete" && (
          <div className="hidden">
            <button onClick={() => setMode("feedForm")}>
              <Share2 size={1} />
            </button>
            <button onClick={handleShareLink}>
              <Link2 size={1} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
