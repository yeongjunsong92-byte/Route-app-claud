// src/screens/TravelNavigatorScreen.tsx
// 지도 따라가기: 코스를 실제로 따라가며 진행하는 실시간 여행 내비게이션 화면.
// - navigator.geolocation.watchPosition()으로 현재 위치를 실시간 추적
// - 현재 목적지까지의 거리를 계산해 반경 50m 이내로 들어오면 자동으로 "도착" 처리 후 다음 목적지로 이동
// - 마지막 목적지까지 도착하면 여행 완료 화면 표시
// - Google Directions API로 현재 위치 -> 다음 목적지 경로를 지도 위에 표시 (기존 PlaceMap 재사용)
// - 여행을 완료하면 travelLogs 컬렉션에 여행 기록(코스명/기간/이동거리/방문 장소 수/메모/사진)을 자동 저장
// - 완료 화면에서 코스 공유(Web Share API/링크 복사) 가능

import { useEffect, useRef, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import {
  X,
  Loader2,
  AlertCircle,
  Navigation,
  Clock,
  PartyPopper,
  CornerUpRight,
  ImagePlus,
  Share,
} from "lucide-react";
import PlaceMap from "../components/PlaceMap";
import { useAuth } from "../context/AuthContext";
import { createTravelLog, getCourse, updateTravelLog } from "../lib/firestore";
import { uploadTravelLogPhotos } from "../lib/storage";
import { shareCourse } from "../lib/share";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  distanceMeters,
  formatDistance,
} from "../lib/googleMaps";
import { CATEGORY_META } from "../lib/types";
import type { Course, Place } from "../lib/types";

interface TravelNavigatorScreenProps {
  courseId: string;
  onClose: () => void;
}

const ARRIVAL_RADIUS_METERS = 50;
const DIRECTIONS_REFRESH_METERS = 30; // 이 거리 이상 이동했을 때만 경로를 다시 요청

/** Google Directions 안내 문구(instructions)에 포함된 HTML 태그를 제거해 순수 텍스트로 변환합니다. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export default function TravelNavigatorScreen({ courseId, onClose }: TravelNavigatorScreenProps) {
  const { user } = useAuth();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "network" | "empty" | "">("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  const [remainingDistanceText, setRemainingDistanceText] = useState("");
  const [etaText, setEtaText] = useState("");

  // 턴바이턴 안내: 현재 위치에서 가장 가까운 다음 안내(steps[0])와, 그 다음 안내 미리보기
  const [currentStepInstruction, setCurrentStepInstruction] = useState("");
  const [currentStepDistance, setCurrentStepDistance] = useState("");
  const [upcomingStepInstruction, setUpcomingStepInstruction] = useState("");

  // 같은 목적지에서 위치가 크게 안 바뀌었으면 도착 처리를 반복 실행하지 않도록 하는 가드
  const arrivedHandledRef = useRef(false);
  // 같은 목적지에서 짧은 이동마다 Directions API를 다시 호출하지 않도록 하는 가드
  const lastDirectionsRef = useRef<{ lat: number; lng: number; stopIndex: number } | null>(null);

  // ---------- 여행 기록(Travel Log) ----------
  // 여행 시작 시각(화면 진입 시 1회만 기록) + 실시간 위치 추적으로 누적되는 실제 이동 거리.
  const startedAtRef = useRef(Date.now());
  const traveledDistanceMetersRef = useRef(0);
  const lastPosForDistanceRef = useRef<{ lat: number; lng: number } | null>(null);
  const logSavingRef = useRef(false);
  const [savedLogId, setSavedLogId] = useState<string | null>(null);
  const [logSaveError, setLogSaveError] = useState("");
  const [memo, setMemo] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // ---------- 코스 로드 ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getCourse(courseId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError("not-found");
          return;
        }
        if (result.stops.length === 0) {
          setError("empty");
          return;
        }
        setCourse(result);
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
  }, [courseId]);

  // ---------- 실시간 위치 추적 ----------
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("이 기기에서는 위치 정보를 사용할 수 없어요.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError("");
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error(err);
        setGeoError("위치 정보를 가져오지 못했어요. 위치 권한을 확인해주세요.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const currentStop = course?.stops[currentIndex];

  // 목적지가 바뀌면 도착 처리 가드를 초기화
  useEffect(() => {
    arrivedHandledRef.current = false;
  }, [currentIndex]);

  // ---------- 도착 판정: 반경 50m 이내로 들어오면 자동으로 다음 목적지로 ----------
  useEffect(() => {
    if (!userPos || !course || !currentStop || completed) return;

    const dist = distanceMeters(userPos, { lat: currentStop.place.lat, lng: currentStop.place.lng });
    setRemainingDistanceText((prev) => (prev ? prev : formatDistance(dist)));

    if (dist <= ARRIVAL_RADIUS_METERS && !arrivedHandledRef.current) {
      arrivedHandledRef.current = true;
      if (currentIndex >= course.stops.length - 1) {
        setCompleted(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setRemainingDistanceText("");
        setEtaText("");
        setCurrentStepInstruction("");
        setCurrentStepDistance("");
        setUpcomingStepInstruction("");
      }
    }
  }, [userPos, course, currentStop, currentIndex, completed]);

  // ---------- 현재 위치 -> 다음 목적지 경로/거리/도착 예정 시간 (Google Directions API) ----------
  useEffect(() => {
    if (!isLoaded || !userPos || !currentStop || completed) return;

    const last = lastDirectionsRef.current;
    if (last && last.stopIndex === currentIndex) {
      const moved = distanceMeters(last, userPos);
      if (moved < DIRECTIONS_REFRESH_METERS) return;
    }
    lastDirectionsRef.current = { lat: userPos.lat, lng: userPos.lng, stopIndex: currentIndex };

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: userPos,
        destination: { lat: currentStop.place.lat, lng: currentStop.place.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          const leg = result.routes[0]?.legs[0];
          if (leg?.distance?.text) setRemainingDistanceText(leg.distance.text);
          if (leg?.duration?.text) setEtaText(leg.duration.text);

          // 턴바이턴 안내: 현재 위치 기준으로 다시 계산된 경로의 첫 안내(steps[0])가 항상
          // "지금부터 다음 회전/직진까지"의 안내이므로, 매 재계산마다 이걸 현재 안내로 보여줍니다.
          const steps = leg?.steps ?? [];
          setCurrentStepInstruction(steps[0] ? stripHtml(steps[0].instructions) : "");
          setCurrentStepDistance(steps[0]?.distance?.text ?? "");
          setUpcomingStepInstruction(steps[1] ? stripHtml(steps[1].instructions) : "");
        }
      }
    );
  }, [isLoaded, userPos, currentStop, currentIndex, completed]);

  // ---------- 실제 이동 거리 누적 (여행 기록용) ----------
  // GPS 노이즈로 인한 미세한 흔들림은 이동 거리로 잡지 않도록 최소 임계값(5m)을 둡니다.
  useEffect(() => {
    if (!userPos) return;
    const last = lastPosForDistanceRef.current;
    if (last) {
      const delta = distanceMeters(last, userPos);
      if (delta > 5) traveledDistanceMetersRef.current += delta;
    }
    lastPosForDistanceRef.current = userPos;
  }, [userPos]);

  // ---------- 여행 완료 시 여행 기록(travelLogs) 자동 저장 ----------
  const saveTravelLog = () => {
    if (!course || !user || logSavingRef.current) return;
    logSavingRef.current = true;
    setLogSaveError("");
    createTravelLog({
      courseId: course.id,
      courseTitle: course.title,
      coverImageUrl: course.coverImageUrl,
      authorId: user.uid,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      distanceMeters: Math.round(traveledDistanceMetersRef.current),
      visitedPlaceCount: course.stops.length,
      totalPlaceCount: course.stops.length,
      memo: "",
      photoUrls: [],
      isCompleted: true,
      // day를 함께 저장해야 TravelLogDetailScreen에서도 DAY별로 묶어 보여줄 수 있습니다.
      stops: course.stops.map((s) => ({ order: s.order, place: s.place, day: s.day ?? 1 })),
    })
      .then((id) => setSavedLogId(id))
      .catch((err) => {
        console.error(err);
        logSavingRef.current = false; // 실패 시 재시도할 수 있도록 가드를 풀어줍니다.
        setLogSaveError("여행 기록 저장에 실패했어요.");
      });
  };

  useEffect(() => {
    if (!completed || !course || !user || logSavingRef.current || savedLogId) return;
    saveTravelLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, course, user, savedLogId]);

  const handlePickLogPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !course) return;
    setUploadingPhoto(true);
    setLogSaveError("");
    try {
      const urls = await uploadTravelLogPhotos(user.uid, course.id, Array.from(files).slice(0, 5));
      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 5));
    } catch (err) {
      console.error(err);
      setLogSaveError(err instanceof Error ? err.message : "사진 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveLogDetails = async () => {
    if (!savedLogId) return;
    setSavingDetails(true);
    setLogSaveError("");
    try {
      await updateTravelLog(savedLogId, { memo: memo.trim(), photoUrls });
    } catch (err) {
      console.error(err);
      setLogSaveError("메모/사진 저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleShareCourse = async () => {
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
    else return;
    setTimeout(() => setShareToast(null), 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-2 bg-paper text-gray-600">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm">코스를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    const message =
      error === "not-found"
        ? "코스를 찾을 수 없어요"
        : error === "empty"
          ? "이 코스에는 방문할 장소가 없어요"
          : "코스를 불러오지 못했어요";
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-2 bg-paper px-5 text-center">
        <AlertCircle size={24} className="text-gray-600" />
        <p className="text-sm font-medium text-gray-800">{message}</p>
        <button
          onClick={onClose}
          className="tap-scale mt-2 rounded-full bg-primary-light px-4 py-2 text-xs font-semibold text-primary"
        >
          닫기
        </button>
      </div>
    );
  }

  if (!course || !currentStop) return null;

  const totalStops = course.stops.length;
  const progressPct = completed ? 100 : (currentIndex / totalStops) * 100;

  // Google Directions 경로를 그리기 위한 "현재 위치" 임시 Place. 지도에 별도 마커로는 표시하지
  // 않고(경로 계산용) 실제 파란 점 마커는 PlaceMap의 userLocation prop이 담당합니다.
  const originPlace: Place | null = userPos
    ? {
        id: "__current_location__",
        name: "현재 위치",
        category: currentStop.place.category,
        address: "",
        region: "",
        lat: userPos.lat,
        lng: userPos.lng,
        imageUrl: "",
        rating: 0,
        reviewCount: 0,
      }
    : null;

  if (completed) {
    return (
      <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper safe-bottom">
        <div className="flex flex-col items-center px-8 pt-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <PartyPopper size={30} className="text-white" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-800">여행을 완료했어요!</h2>
          <p className="mt-1 text-sm text-gray-600">
            {course.title} 코스의 모든 목적지({totalStops}곳)에 도착했어요.
          </p>
          <div className="relative mt-3">
            {shareToast && (
              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800/85 px-3 py-1.5 text-xs text-white">
                {shareToast}
              </div>
            )}
            <button
              onClick={handleShareCourse}
              className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Share size={12} />
              코스 공유하기
            </button>
          </div>
        </div>

        <div className="mt-6 px-5">
          <h3 className="text-sm font-semibold text-gray-800">여행 메모</h3>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이번 여행은 어땠나요?"
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none"
          />

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {photoUrls.map((url) => (
              <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                  aria-label="사진 제거"
                  className="tap-scale absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/70 text-white"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {photoUrls.length < 5 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || !savedLogId}
                className="tap-scale flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 disabled:opacity-50"
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
              onChange={(e) => handlePickLogPhotos(e.target.files)}
            />
          </div>

          {logSaveError && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <p className="text-center text-xs text-red-500">{logSaveError}</p>
              {!savedLogId && (
                <button
                  onClick={saveTravelLog}
                  className="tap-scale shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  다시 시도
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSaveLogDetails}
            disabled={!savedLogId || savingDetails}
            className="tap-scale mt-4 flex h-11 w-full items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-800 disabled:opacity-50"
          >
            {savingDetails ? "저장 중..." : "메모/사진 저장"}
          </button>
        </div>

        <div className="mt-4 px-5 pb-6">
          <button
            onClick={onClose}
            className="tap-scale flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[currentStop.place.category];

  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper safe-bottom">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <button
          onClick={onClose}
          aria-label="여행 종료"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
        >
          <X size={16} className="text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-xs text-gray-600">여행 진행 중</p>
          <p className="max-w-[220px] truncate text-sm font-bold text-primary">{course.title}</p>
        </div>
        <div className="flex h-9 min-w-9 items-center justify-center rounded-full bg-primary-light px-2 text-xs font-bold text-primary">
          {currentIndex + 1} / {totalStops}
        </div>
      </header>

      <div className="px-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {geoError && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-primary-light px-3 py-2 text-xs text-primary">
          <AlertCircle size={14} className="shrink-0" />
          {geoError}
        </div>
      )}

      {currentStepInstruction && (
        <div className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <CornerUpRight size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentStepInstruction}</p>
            {currentStepDistance && (
              <p className="text-xs text-white/80">{currentStepDistance} 후</p>
            )}
            {upcomingStepInstruction && (
              <p className="mt-0.5 truncate text-[11px] text-white/70">
                다음: {upcomingStepInstruction}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 px-5">
        <PlaceMap
          places={[currentStop.place]}
          selectedPlaceId={currentStop.place.id}
          routeStops={originPlace ? [originPlace, currentStop.place] : undefined}
          userLocation={userPos}
          center={userPos ?? { lat: currentStop.place.lat, lng: currentStop.place.lng }}
          heightClassName="h-[42vh]"
        />
      </div>

      <div className="mt-4 px-5 pb-6">
        <div className="rounded-2xl border border-gray-300 bg-white p-4">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-xs text-gray-600">다음 목적지</span>
          </div>
          <h2 className="mt-2 text-base font-bold text-gray-800">{currentStop.place.name}</h2>
          {currentStop.place.address && (
            <p className="mt-0.5 truncate text-xs text-gray-600">{currentStop.place.address}</p>
          )}

          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-800">
              <Navigation size={14} className="text-primary" />
              {remainingDistanceText || "위치 확인 중..."}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-800">
              <Clock size={14} className="text-primary" />
              {etaText || "계산 중..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
