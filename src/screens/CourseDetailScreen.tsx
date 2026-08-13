// src/screens/CourseDetailScreen.tsx
// 코스 상세 화면 (전체 화면). 기존 CourseDetailSheet(바텀시트)를 대체합니다.
// - 일정 보기(DAY별 타임라인) / 지도 보기(번호 마커+경로, 자동차·도보 토글) 전환
// - 상단 통계: 총 장소 수 / 예상 소요시간 / 이동 거리
// - "다음 장소 추천(AI)": 마지막 장소 주변 인기 장소를 추천, 내 코스면 바로 추가 가능
//   (별도 AI 서버 호출 없이 Google Places Nearby Search + 평점순 정렬로 근사 구현)
// - 장소를 누르면 PlaceDetailScreen으로 이동

import { useEffect, useMemo, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share,
  Navigation2,
  CalendarDays,
  Clock,
  Route as RouteIcon,
  Car,
  Footprints,
  Star,
  Plus,
  Loader2,
  AlertCircle,
  Home,
  UtensilsCrossed,
  Coffee,
  Trees,
  Camera,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PlaceMap from "../components/PlaceMap";
import { useAuth } from "../context/AuthContext";
import {
  getCourse,
  toggleCourseLike,
  toggleCourseSave,
  getCourseLikeSaveStatus,
  createNotification,
  updateCourse,
} from "../lib/firestore";
import { shareCourse, setCourseShareMeta, resetShareMeta } from "../lib/share";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  distanceMeters,
  searchNearbyPlaces,
} from "../lib/googleMaps";
import { CATEGORY_META } from "../lib/types";
import type { Course, CourseStop, Place, PlaceCategory } from "../lib/types";

interface CourseDetailScreenProps {
  courseId: string | null;
  onClose: () => void;
  onStartTravel?: (courseId: string) => void;
  onOpenProfile?: (userId: string) => void;
  onOpenPlace?: (place: Place) => void;
}

const CATEGORY_ICON: Record<PlaceCategory, LucideIcon> = {
  stay: Home,
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  nature: Trees,
  culture: Camera,
  activity: Sparkles,
  shopping: ShoppingBag,
};

type ViewMode = "schedule" | "map";

// 공개·SNS·AI 확장 기능은 삭제하지 않고 1차 MVP 상세 화면에서만 숨깁니다.
const LEGACY_SOCIAL_ACTIONS_ENABLED = false;
const LEGACY_AI_RECOMMENDATIONS_ENABLED = false;

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayDate(iso: string): string {
  const d = new Date(iso);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}.${d.getDate()}(${dayNames[d.getDay()]})`;
}

function formatCoursePeriod(course: Pick<Course, "startDate" | "endDate">): string {
  if (!course.startDate) return "여행 날짜 미정";
  const start = course.startDate.replaceAll("-", ".");
  const end = (course.endDate ?? course.startDate).replaceAll("-", ".");
  return start === end ? start : `${start} - ${end}`;
}

function estimateMinutes(stops: CourseStop[]): number {
  return stops.reduce((sum, s) => sum + (s.stayMinutes ?? 60), 0);
}

function estimateDistanceKm(stops: CourseStop[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += distanceMeters(stops[i - 1]!.place, stops[i]!.place);
  }
  return total / 1000;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function CourseDetailScreen({
  courseId,
  onClose,
  onStartTravel,
  onOpenPlace,
}: CourseDetailScreenProps) {
  const { user, profile } = useAuth();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"not-found" | "network" | "">("");

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<"like" | "save" | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("schedule");
  const [travelMode, setTravelMode] = useState<"DRIVING" | "WALKING">("DRIVING");

  const [nearby, setNearby] = useState<Place[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);

  useEffect(() => {
    setCourse(null);
    setLiked(false);
    setSaved(false);
    setError("");
    setNearby([]);
    if (!courseId) return;

    let cancelled = false;
    setLoading(true);
    getCourse(courseId)
      .then(async (result) => {
        if (cancelled) return;
        if (!result) {
          setError("not-found");
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

  const dayGroups = useMemo(() => {
    if (!course) return [];
    const map = new Map<number, CourseStop[]>();
    for (const stop of course.stops) {
      const day = stop.day ?? 1;
      if (!map.get(day)) map.set(day, []);
      map.get(day)!.push(stop);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, stops]) => ({ day, stops: stops.slice().sort((a, b) => a.order - b.order) }));
  }, [course]);

  const totalMinutes = course ? estimateMinutes(course.stops) : 0;
  const totalDistanceKm =
    course?.totalDistanceKm ?? (course ? estimateDistanceKm(course.stops) : 0);
  const isOwner = !!user && !!course && course.authorId === user.uid;

  // "다음 장소 추천(AI)": 내 코스일 때만, 마지막 장소 주변 인기 장소를 불러옵니다.
  useEffect(() => {
    if (!LEGACY_AI_RECOMMENDATIONS_ENABLED || !isLoaded || !course || !isOwner || course.stops.length === 0) return;
    const lastPlace = course.stops[course.stops.length - 1]!.place;
    const excludeIds = new Set(course.stops.map((s) => s.place.id));
    setNearbyLoading(true);
    searchNearbyPlaces(lastPlace, course.region, excludeIds, 3)
      .then(setNearby)
      .catch((err) => console.error(err))
      .finally(() => setNearbyLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, course?.id, isOwner]);

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
    else return;
    setTimeout(() => setShareToast(null), 2000);
  };

  const handleToggleLike = async () => {
    if (!user || !course || pending) return;
    setPending("like");
    const prev = liked;
    setLiked(!prev);
    try {
      const result = await toggleCourseLike(course.id, user.uid);
      setLiked(result);
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
      setLiked(prev);
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

  const handleAddNearby = async (place: Place) => {
    if (!course || !isOwner || addingPlaceId) return;
    setAddingPlaceId(place.id);
    const lastDay = dayGroups[dayGroups.length - 1]?.day ?? 1;
    const newStop: CourseStop = { order: course.stops.length + 1, place, day: lastDay };
    const newStops = [...course.stops, newStop];
    try {
      await updateCourse(course.id, { stops: newStops });
      setCourse({ ...course, stops: newStops });
      setNearby((prev) => prev.filter((p) => p.id !== place.id));
    } catch (err) {
      console.error(err);
    } finally {
      setAddingPlaceId(null);
    }
  };

  const allPlaces = course?.stops.map((s) => s.place) ?? [];

  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper pb-24 safe-bottom">
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={onClose}
          aria-label="뒤로"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
        >
          <ArrowLeft size={16} className="text-gray-600" />
        </button>
        <p className="text-sm font-semibold text-gray-800">내 여행 Route</p>
        <span className="h-9 w-9" aria-hidden="true" />
      </header>

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-20 text-gray-600">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-sm">코스를 불러오는 중...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-20 text-center">
          <AlertCircle size={24} className="text-gray-600" />
          <p className="text-sm font-medium text-gray-800">
            {error === "not-found" ? "코스를 찾을 수 없어요" : "코스를 불러오지 못했어요"}
          </p>
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
          <div className="mt-4 px-5">
            <div className="overflow-hidden rounded-3xl border border-gray-300 bg-white shadow-card">
              {course.coverImageUrl ? (
                <img
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-primary-light text-sm font-medium text-primary-dark">
                  여행 Route
                </div>
              )}
              <div className="p-4">
                <p className="text-xs font-semibold text-secondary">
                  {course.region} · {course.durationDays}일 일정
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-800">{course.title}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                  <CalendarDays size={13} className="text-primary-dark" />
                  {formatCoursePeriod(course)}
                </p>
                {course.description && (
                  <p className="mt-3 text-sm leading-5 text-gray-600">{course.description}</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-around rounded-2xl border border-gray-300 bg-white py-3 shadow-card">
              <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                <RouteIcon size={13} className="text-primary-dark" />총 {course.stops.length}곳
              </div>
              <div className="h-full w-px bg-gray-300" />
              <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                <Clock size={13} className="text-primary-dark" />
                {formatMinutes(totalMinutes)}
              </div>
              <div className="h-full w-px bg-gray-300" />
              <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                <Navigation2 size={13} className="text-primary-dark" />
                {totalDistanceKm.toFixed(1)}km
              </div>
            </div>

            <div className="mt-4 flex h-11 items-center gap-0.5 rounded-full bg-primary-light p-1">
              <button
                onClick={() => setViewMode("schedule")}
                className={`tap-scale h-full flex-1 rounded-full text-sm font-semibold transition-colors ${
                  viewMode === "schedule" ? "bg-primary-dark text-white" : "text-primary-dark"
                }`}
              >
                일정 보기
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`tap-scale h-full flex-1 rounded-full text-sm font-semibold transition-colors ${
                  viewMode === "map" ? "bg-primary-dark text-white" : "text-primary-dark"
                }`}
              >
                지도 보기
              </button>
            </div>
          </div>

          {viewMode === "schedule" && (
            <div className="mt-5 px-5">
              {dayGroups.map(({ day, stops }) => (
                <div key={day} className="mb-6">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary-dark px-2 py-0.5 text-[11px] font-bold text-white">
                      DAY {day}
                    </span>
                    {course.startDate && (
                      <span className="text-xs text-gray-600">
                        {formatDayDate(addDaysIso(course.startDate, day - 1))}
                      </span>
                    )}
                  </div>
                  <ol className="relative mt-3 space-y-4 border-l border-dashed border-gray-300 pl-5">
                    {stops.map((stop) => {
                      const meta = CATEGORY_META[stop.place.category];
                      const Icon = CATEGORY_ICON[stop.place.category];
                      return (
                        <li key={stop.order} className="relative">
                          <span
                            className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: meta.color }}
                          >
                            <Icon size={11} />
                          </span>
                          <button
                            onClick={() => onOpenPlace?.(stop.place)}
                            className="tap-scale flex w-full gap-3 rounded-xl border border-gray-300 p-2.5 text-left"
                          >
                            <img
                              src={stop.place.imageUrl}
                              alt={stop.place.name}
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold text-primary-dark">
                                  순서 {stop.order}
                                </span>
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
                              {stop.place.rating > 0 && (
                                <p className="flex items-center gap-1 text-[11px] text-gray-600">
                                  <Star size={10} className="fill-amber-400 text-amber-400" />
                                  {stop.place.rating.toFixed(1)} ({stop.place.reviewCount})
                                </p>
                              )}
                              <p className="truncate text-xs text-gray-600">{stop.place.address}</p>
                            </div>
                            {stop.stayMinutes && (
                              <span className="ml-auto flex shrink-0 items-center gap-1 self-start text-[11px] text-gray-600">
                                <Clock size={12} />
                                {stop.stayMinutes}분
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}

              {LEGACY_AI_RECOMMENDATIONS_ENABLED && isOwner && (nearbyLoading || nearby.length > 0) && (
                <div className="mt-2 rounded-2xl border border-primary/20 bg-primary-light p-4">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" />
                    <h3 className="text-sm font-semibold text-primary">다음 장소 추천 (AI)</h3>
                  </div>
                  {nearbyLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                      <Loader2 size={13} className="animate-spin" />
                      주변 장소를 찾는 중...
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2">
                      {nearby.map((place) => {
                        const meta = CATEGORY_META[place.category];
                        return (
                          <div
                            key={place.id}
                            className="flex items-center gap-2.5 rounded-xl bg-white p-2.5"
                          >
                            <img
                              src={place.imageUrl}
                              alt={place.name}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-gray-800">
                                {place.name}
                              </p>
                              <p className="text-[10px] font-medium" style={{ color: meta.color }}>
                                {meta.label} · ★{place.rating.toFixed(1)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAddNearby(place)}
                              disabled={addingPlaceId === place.id}
                              aria-label="코스에 추가"
                              className="tap-scale flex h-7 items-center gap-1 rounded-full bg-primary px-2.5 text-[11px] font-semibold text-white disabled:opacity-50"
                            >
                              {addingPlaceId === place.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Plus size={11} />
                              )}
                              추가
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === "map" && (
            <div className="mt-5 px-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gray-600">장소를 누르면 상세 위치를 확인할 수 있어요.</p>
                <div className="flex gap-1.5">
                <button
                  onClick={() => setTravelMode("DRIVING")}
                  className={`tap-scale flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                    travelMode === "DRIVING"
                      ? "bg-primary-dark text-white"
                      : "border border-gray-300 bg-white text-gray-600"
                  }`}
                >
                  <Car size={12} />
                  자동차
                </button>
                <button
                  onClick={() => setTravelMode("WALKING")}
                  className={`tap-scale flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                    travelMode === "WALKING"
                      ? "bg-primary-dark text-white"
                      : "border border-gray-300 bg-white text-gray-600"
                  }`}
                >
                  <Footprints size={12} />
                  도보
                </button>
                </div>
              </div>
              <PlaceMap
                places={allPlaces}
                routeStops={allPlaces}
                travelMode={travelMode}
                onSelectPlace={onOpenPlace}
                heightClassName="h-[52vh]"
              />
            </div>
          )}
        </>
      )}

      {!loading && !error && course && (
        <div className="fixed bottom-0 left-1/2 z-[71] w-full max-w-[480px] -translate-x-1/2 border-t border-gray-300 bg-paper px-5 pb-6 pt-3 safe-bottom">
          {LEGACY_SOCIAL_ACTIONS_ENABLED && shareToast && (
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800/85 px-3 py-1.5 text-xs text-white">
              {shareToast}
            </div>
          )}
          {LEGACY_SOCIAL_ACTIONS_ENABLED && (
            <div className="hidden">
              <button onClick={handleShare} aria-label="공유"><Share size={1} /></button>
              <button onClick={handleToggleLike} disabled={!user} aria-label="좋아요">
                <Heart size={1} className={liked ? "fill-primary text-primary" : "text-gray-800"} />
              </button>
              <button onClick={handleToggleSave} disabled={!user} aria-label="저장">
                <Bookmark size={1} className={saved ? "fill-primary text-primary" : "text-gray-800"} />
              </button>
            </div>
          )}
          <p className="mb-2 text-center text-xs text-gray-600">여행을 시작하면 다음 장소까지의 이동을 안내해드려요.</p>
          <button
            onClick={() => {
              onStartTravel?.(course.id);
              onClose();
            }}
            className="tap-scale flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-dark text-sm font-semibold text-white"
          >
            <Navigation2 size={17} />
            코스 시작하기
          </button>
        </div>
      )}
    </div>
  );
}
