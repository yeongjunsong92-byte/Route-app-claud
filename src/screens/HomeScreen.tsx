// src/screens/HomeScreen.tsx
// 홈 화면: 검색, 지역 필터, 추천 코스, 인기 장소를 보여주는 진입 화면.
// [1단계 데이터 배선] dummy.ts 대신 Firestore(courses)를 실제로 조회하도록 변경.

import { useEffect, useMemo, useState } from "react";
import { Bell, Plane, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import SearchBar from "../components/SearchBar";
import CourseCard from "../components/CourseCard";
import PlaceCard from "../components/PlaceCard";
import NotificationsScreen from "./NotificationsScreen";
import { getAllPublicCourses, getCoursesByAuthor, getCoursesByRegion, getUnreadNotificationCount } from "../lib/firestore";
import { getDDayLabel, getTripStatus } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import type { Course, Place } from "../lib/types";

const REGIONS = ["전체", "제주", "부산", "서울", "강릉", "경주"];

interface HomeScreenProps {
  userName?: string;
  onOpenCourse: (courseId: string) => void;
  onOpenProfile: (userId: string) => void;
}

export default function HomeScreen({ userName, onOpenCourse, onOpenProfile }: HomeScreenProps) {
  const { user } = useAuth();
  const [region, setRegion] = useState("전체");

  // 지역별 공개 코스 목록 (오늘의 추천 코스 / 인기 여행 코스 공용 데이터 소스)
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 내가 진행 중이거나 다가오는 여행 (상단 배너용) — 내 코스 목록에서만 찾음
  const [upcomingTrip, setUpcomingTrip] = useState<Course | null>(null);

  // 알림 화면 열림 상태 + 안 읽은 알림 개수(벨 아이콘 배지)
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const result =
        region === "전체" ? await getAllPublicCourses(20) : await getCoursesByRegion(region, 20);
      setCourses(result);
    } catch (err) {
      console.error(err);
      setError("코스를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  useEffect(() => {
    if (!user) {
      setUpcomingTrip(null);
      return;
    }
    let active = true;
    getCoursesByAuthor(user.uid)
      .then((myCourses) => {
        if (!active) return;
        const next = myCourses.find((c) => c.startDate && getTripStatus(c) !== "done") ?? null;
        setUpcomingTrip(next);
      })
      .catch((err) => {
        // 배너는 부가 정보라 실패해도 화면 전체를 막지 않고 조용히 숨깁니다.
        console.error(err);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // 안 읽은 알림 개수: 최초 진입 시 + 알림 화면을 열고 닫을 때(읽음 처리 반영) 다시 불러옵니다.
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    getUnreadNotificationCount(user.uid)
      .then((count) => {
        if (active) setUnreadCount(count);
      })
      .catch((err) => console.error(err));
    return () => {
      active = false;
    };
  }, [user, notificationsOpen]);

  const popularCourses = useMemo(
    () => [...courses].sort((a, b) => b.likeCount - a.likeCount),
    [courses]
  );

  // "주변 추천 장소"는 별도 장소 컬렉션이 없어서, 이미 불러온 코스들의 stops에 실제로
  // 들어있는 장소를 중복 제거해서 보여줍니다. (dummy 대신 실제 Firestore에 저장된 장소 데이터 사용)
  const nearbyPlaces = useMemo(() => {
    const seen = new Set<string>();
    const places: Place[] = [];
    for (const course of courses) {
      for (const stop of course.stops) {
        if (seen.has(stop.place.id)) continue;
        seen.add(stop.place.id);
        places.push(stop.place);
        if (places.length >= 6) return places;
      }
    }
    return places;
  }, [courses]);

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs text-gray-600">
            {userName ? `${userName}님, 오늘은 어디로 떠나볼까요?` : "오늘은 어디로 떠나볼까요?"}
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-primary">Route</h1>
        </div>
        <button
          onClick={() => setNotificationsOpen(true)}
          aria-label="알림"
          className="tap-scale relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card"
        >
          <Bell size={18} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </header>

      {upcomingTrip && (
        <div className="px-5 pt-4">
          <button
            onClick={() => onOpenCourse(upcomingTrip.id)}
            className="tap-scale flex w-full items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-left text-white"
          >
            <Plane size={16} className="shrink-0 -rotate-45" />
            <span className="flex-1 truncate text-sm font-semibold">
              {getDDayLabel(upcomingTrip)}&nbsp;&nbsp;{upcomingTrip.title}
            </span>
            <ChevronRight size={16} className="shrink-0" />
          </button>
        </div>
      )}

      <div className="px-5 pt-4">
        <SearchBar onFilterClick={() => {}} />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              region === r ? "bg-primary text-white" : "border border-gray-300 bg-white text-gray-600"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <section className="mt-6">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="text-base font-semibold text-gray-800">오늘의 추천 코스</h2>
          {!loading && !error && <span className="text-xs text-gray-600">{courses.length}개</span>}
        </div>

        <div className="mt-3 px-5">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" />
              코스를 불러오는 중...
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-start gap-2 py-6">
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={loadCourses}
                className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <RefreshCw size={12} />
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && courses.length === 0 && (
            <p className="py-6 text-sm text-gray-600">
              아직 {region === "전체" ? "등록된" : `${region} 지역의`} 코스가 없어요. 첫 코스를
              만들어보세요!
            </p>
          )}
        </div>

        {!loading && !error && courses.length > 0 && (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onClick={(c) => onOpenCourse(c.id)} />
            ))}
          </div>
        )}
      </section>

      <div className="route-divider mx-5 my-6" />

      <section>
        <h2 className="px-5 text-base font-semibold text-gray-800">주변 추천 장소</h2>
        {/* 별도의 "장소" Firestore 컬렉션은 없어서, 위에서 이미 불러온 코스들의 stops 안에
           실제로 저장된 장소를 재사용합니다 (새 API 호출이나 컬렉션 추가 없이 dummy만 제거). */}
        {nearbyPlaces.length > 0 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {nearbyPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} variant="compact" />
            ))}
          </div>
        ) : (
          !loading && (
            <p className="mt-3 px-5 text-sm text-gray-600">
              아직 추천할 장소가 없어요. 코스가 등록되면 여기에 표시돼요.
            </p>
          )
        )}
      </section>

      {!loading && !error && popularCourses.length > 0 && (
        <>
          <div className="route-divider mx-5 my-6" />
          <section>
            <h2 className="px-5 text-base font-semibold text-gray-800">인기 여행 코스</h2>
            <div className="mt-3 flex flex-col gap-2.5 px-5">
              {popularCourses.map((course) => (
                <CourseCard key={course.id} course={course} variant="horizontal" onClick={(c) => onOpenCourse(c.id)} />
              ))}
            </div>
          </section>
        </>
      )}

      {notificationsOpen && (
        <NotificationsScreen
          onClose={() => setNotificationsOpen(false)}
          onOpenCourse={onOpenCourse}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
}
