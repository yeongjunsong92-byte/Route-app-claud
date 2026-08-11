// src/screens/TravelLogDetailScreen.tsx
// 여행 기록 상세 화면: DAY별 타임라인 / 사진(추가·삭제) / 메모(작성·수정) / 이동거리 / 지도 보기 / 코스 공유

import { useEffect, useRef, useState } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Share,
  ImagePlus,
} from "lucide-react";
import PlaceCard from "../components/PlaceCard";
import PlaceMap from "../components/PlaceMap";
import { getTravelLog, updateTravelLog } from "../lib/firestore";
import { uploadTravelLogPhotos, deleteFileByUrl } from "../lib/storage";
import { formatDistance } from "../lib/googleMaps";
import { shareCourse } from "../lib/share";
import type { TravelLog, TravelLogStop } from "../lib/types";

interface TravelLogDetailScreenProps {
  logId: string;
  onClose: () => void;
}

function formatLogDate(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** stops를 DAY별로 묶습니다. day가 없는 기존 데이터는 1일차로 취급합니다 (CourseDetailScreen과 동일한 규칙). */
function groupStopsByDay(stops: TravelLogStop[]): { day: number; stops: TravelLogStop[] }[] {
  const map = new Map<number, TravelLogStop[]>();
  for (const stop of stops) {
    const day = stop.day ?? 1;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(stop);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, list]) => ({ day, stops: list.slice().sort((a, b) => a.order - b.order) }));
}

export default function TravelLogDetailScreen({ logId, onClose }: TravelLogDetailScreenProps) {
  const [log, setLog] = useState<TravelLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // 메모 수정
  const [memoDraft, setMemoDraft] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [memoError, setMemoError] = useState("");

  // 사진 추가/삭제
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError("");
    getTravelLog(logId)
      .then((result) => {
        if (!result) {
          setError("여행 기록을 찾을 수 없어요");
          return;
        }
        setLog(result);
        setMemoDraft(result.memo);
      })
      .catch((err) => {
        console.error(err);
        setError("여행 기록을 불러오지 못했어요");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  const handleSaveMemo = async () => {
    if (!log) return;
    setSavingMemo(true);
    setMemoError("");
    setMemoSaved(false);
    const trimmed = memoDraft.trim(); // 빈 메모 저장도 허용 — 빈 문자열은 구조를 깨뜨리지 않습니다.
    try {
      await updateTravelLog(log.id, { memo: trimmed });
      setLog((prev) => (prev ? { ...prev, memo: trimmed } : prev));
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setMemoError("메모 저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSavingMemo(false);
    }
  };

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !log) return;
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const remaining = Math.max(0, 5 - log.photoUrls.length);
      if (remaining === 0) {
        setPhotoError("사진은 최대 5장까지 추가할 수 있어요.");
        return;
      }
      const urls = await uploadTravelLogPhotos(
        log.authorId,
        log.courseId,
        Array.from(files).slice(0, remaining)
      );
      const nextPhotoUrls = [...log.photoUrls, ...urls];
      await updateTravelLog(log.id, { photoUrls: nextPhotoUrls });
      setLog((prev) => (prev ? { ...prev, photoUrls: nextPhotoUrls } : prev));
    } catch (err) {
      console.error(err);
      setPhotoError(err instanceof Error ? err.message : "사진 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!log) return;
    setDeletingPhotoUrl(url);
    setPhotoError("");
    const nextPhotoUrls = log.photoUrls.filter((u) => u !== url);
    try {
      await updateTravelLog(log.id, { photoUrls: nextPhotoUrls });
      setLog((prev) => (prev ? { ...prev, photoUrls: nextPhotoUrls } : prev));
      // Storage 파일 정리는 best-effort로 처리합니다 (실패해도 목록에서는 이미 지워진 상태 유지).
      deleteFileByUrl(url).catch((err) => console.error("Storage 파일 삭제 실패:", err));
    } catch (err) {
      console.error(err);
      setPhotoError("사진 삭제에 실패했어요. 다시 시도해주세요.");
    } finally {
      setDeletingPhotoUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-2 bg-paper text-gray-600">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm">여행 기록을 불러오는 중...</p>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-2 bg-paper px-5 text-center">
        <AlertCircle size={24} className="text-gray-600" />
        <p className="text-sm font-medium text-gray-800">{error || "여행 기록을 찾을 수 없어요"}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={load}
            className="tap-scale rounded-full bg-primary-light px-4 py-2 text-xs font-semibold text-primary"
          >
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

  const dayGroups = groupStopsByDay(log.stops);
  const allPlaces = log.stops.map((s) => s.place);

  const handleShare = async () => {
    const result = await shareCourse({
      courseId: log.courseId,
      title: log.courseTitle,
      imageUrl: log.coverImageUrl,
    });
    if (result === "copied") setShareToast("링크가 복사되었어요");
    else if (result === "failed") setShareToast("공유에 실패했어요");
    else return;
    setTimeout(() => setShareToast(null), 2000);
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
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            log.isCompleted ? "bg-primary text-white" : "bg-gray-300 text-gray-600"
          }`}
        >
          {log.isCompleted ? "완료" : "진행중"}
        </span>
      </header>

      {log.coverImageUrl && (
        <div className="mt-3 px-5">
          <img
            src={log.coverImageUrl}
            alt={log.courseTitle}
            className="h-40 w-full rounded-2xl object-cover"
          />
        </div>
      )}

      <div className="mt-4 px-5">
        <h2 className="text-xl font-bold text-gray-800">{log.courseTitle}</h2>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
          <CalendarDays size={12} />
          {formatLogDate(log.startedAt)}
          {log.endedAt ? ` ~ ${formatLogDate(log.endedAt)}` : ""}
        </p>

        <div className="mt-3 flex items-center justify-around rounded-2xl border border-gray-300 bg-white py-3.5">
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{formatDistance(log.distanceMeters)}</p>
            <p className="text-[11px] text-gray-600">이동 거리</p>
          </div>
          <div className="h-full w-px bg-gray-300" />
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">
              {log.visitedPlaceCount}/{log.totalPlaceCount}
            </p>
            <p className="text-[11px] text-gray-600">방문 장소</p>
          </div>
          <div className="h-full w-px bg-gray-300" />
          <div className="text-center">
            <p className="flex items-center justify-center gap-1 text-base font-bold text-gray-800">
              {log.isCompleted && <CheckCircle2 size={14} className="text-primary" />}
              {log.isCompleted ? "완료" : "미완료"}
            </p>
            <p className="text-[11px] text-gray-600">여행 상태</p>
          </div>
        </div>

        <div className="relative mt-3 flex gap-2">
          {shareToast && (
            <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800/85 px-3 py-1.5 text-xs text-white">
              {shareToast}
            </div>
          )}
          {allPlaces.length > 0 && (
            <button
              onClick={() => setShowMap((v) => !v)}
              className="tap-scale flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 text-sm font-semibold text-gray-800"
            >
              <MapPin size={16} className="text-primary" />
              {showMap ? "지도 닫기" : "지도에서 보기"}
            </button>
          )}
          <button
            onClick={handleShare}
            aria-label="공유"
            className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-800"
          >
            <Share size={18} />
          </button>
        </div>

        {showMap && allPlaces.length > 0 && (
          <div className="mt-3">
            <PlaceMap
              places={allPlaces}
              routeStops={allPlaces.length >= 2 ? allPlaces : undefined}
              heightClassName="h-[42vh]"
            />
          </div>
        )}

        {/* 메모: 항상 편집 가능 */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">메모</h3>
          <textarea
            value={memoDraft}
            onChange={(e) => setMemoDraft(e.target.value)}
            placeholder="이번 여행은 어땠나요?"
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleSaveMemo}
              disabled={savingMemo || memoDraft === log.memo}
              className="tap-scale flex h-9 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-white disabled:opacity-40"
            >
              {savingMemo ? "저장 중..." : "메모 저장"}
            </button>
            {memoSaved && <span className="text-xs text-primary">저장됐어요</span>}
            {memoError && <span className="text-xs text-red-500">{memoError}</span>}
          </div>
        </div>

        {/* 사진: 추가/삭제 가능 */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">사진</h3>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {log.photoUrls.map((url) => (
              <div key={url} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => handleDeletePhoto(url)}
                  disabled={deletingPhotoUrl === url}
                  aria-label="사진 삭제"
                  className="tap-scale absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/70 text-white disabled:opacity-50"
                >
                  {deletingPhotoUrl === url ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <X size={11} />
                  )}
                </button>
              </div>
            ))}
            {log.photoUrls.length < 5 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="tap-scale flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 disabled:opacity-50"
              >
                {uploadingPhoto ? (
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
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddPhotos(e.target.files)}
            />
          </div>
          {photoError && <p className="mt-1.5 text-xs text-red-500">{photoError}</p>}
        </div>

        {/* 타임라인: DAY별로 묶어서 표시 (day가 없는 기존 기록은 DAY 1로 취급) */}
        {dayGroups.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-800">타임라인</h3>
            {dayGroups.map(({ day, stops }) => (
              <div key={day} className="mt-3">
                {dayGroups.length > 1 && (
                  <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                    DAY {day}
                  </span>
                )}
                <div className="mt-2 flex flex-col gap-2.5">
                  {stops.map((stop) => (
                    <PlaceCard
                      key={`${day}-${stop.order}-${stop.place.id}`}
                      place={stop.place}
                      order={stop.order}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

