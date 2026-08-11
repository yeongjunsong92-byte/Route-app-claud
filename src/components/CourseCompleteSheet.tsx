// src/components/CourseCompleteSheet.tsx
// 코스 발행 완료 직후 뜨는 선택 화면 (시안 4번: "코스 작성이 완료되었어요!")
// - 내 코스로 저장: 비공개로 둔 채 종료
// - 피드에 게시하기: 코스를 공개로 전환 + 캡션/사진과 함께 피드 게시물 생성
// - 링크로 공유하기: 코스를 공개로 전환 + 공유 링크 복사
// - 나중에 선택하기: 아무 것도 안 하고 종료 (기본 비공개 상태 유지)

import { useRef, useState } from "react";
import { Check, Bookmark, Share2, Link2, ImagePlus, X, Loader2 } from "lucide-react";
import { updateCourse, createFeedPost } from "../lib/firestore";
import { uploadPostImages } from "../lib/storage";
import type { Course } from "../lib/types";

interface CourseCompleteSheetProps {
  course: Course; // id가 포함된, 방금 저장된 코스
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  onClose: () => void;
}

type Mode = "options" | "feedForm" | "linkDone";

export default function CourseCompleteSheet({
  course,
  authorId,
  authorName,
  authorAvatarUrl,
  onClose,
}: CourseCompleteSheetProps) {
  const [mode, setMode] = useState<Mode>("options");
  const [caption, setCaption] = useState(course.description);
  const [images, setImages] = useState<string[]>([course.coverImageUrl].filter(Boolean));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveOnly = () => {
    // 이미 createCourse()로 저장된 상태(기본 비공개)라 추가 작업 없이 닫기만 하면 됩니다.
    onClose();
  };

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

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

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
      // 사용자가 공유 시트를 취소한 경우도 이 catch로 들어오는데, 이건 에러가 아니라서 조용히 무시합니다.
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
        {mode === "options" && (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                <Check size={30} className="text-white" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-800">코스 작성이 완료되었어요!</h2>
              <p className="mt-1 text-sm text-gray-600">이 코스를 어떻게 할까요?</p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={handleSaveOnly}
                className="tap-scale flex items-center gap-3 rounded-2xl border border-gray-300 bg-white p-4 text-left"
              >
                <Bookmark size={20} className="shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">내 코스로 저장</span>
                  <span className="block text-xs text-gray-600">나만 볼 수 있는 여행 계획으로 저장해요</span>
                </span>
              </button>

              <button
                onClick={() => setMode("feedForm")}
                className="tap-scale flex items-center gap-3 rounded-2xl border border-gray-300 bg-white p-4 text-left"
              >
                <Share2 size={20} className="shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">피드에 게시하기</span>
                  <span className="block text-xs text-gray-600">다른 여행자들과 공유하고 영감을 나눠보세요</span>
                </span>
              </button>

              <button
                onClick={handleShareLink}
                disabled={publishing}
                className="tap-scale flex items-center gap-3 rounded-2xl border border-gray-300 bg-white p-4 text-left disabled:opacity-50"
              >
                <Link2 size={20} className="shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">링크로 공유하기</span>
                  <span className="block text-xs text-gray-600">친구에게 코스 링크를 공유해요</span>
                </span>
                {publishing && <Loader2 size={16} className="ml-auto animate-spin text-gray-600" />}
              </button>
            </div>

            {error && <p className="mt-3 text-center text-xs text-red-500">{error}</p>}

            <button onClick={onClose} className="mt-5 w-full text-center text-sm text-gray-600">
              나중에 선택하기
            </button>
          </>
        )}

        {mode === "feedForm" && (
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
                onChange={(e) => handlePickImages(e.target.files)}
              />
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="이 코스에 대해 이야기해주세요"
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none"
            />

            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("options")}
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

        {mode === "linkDone" && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
              <Link2 size={24} className="text-primary" />
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
      </div>
    </div>
  );
}
