// src/screens/HomeScreen.tsx
// 홈 화면: Firestore 코스 데이터를 바탕으로 장소 탐색과 코스 확인을 안내하는 MVP 시작 화면.

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Compass, Loader2, MapPinned, Plane, RefreshCw, Route as RouteIcon } from "lucide-react";
import SearchBar from "../components/SearchBar";
import CourseCard from "../components/CourseCard";
import PlaceCard from "../components/PlaceCard";
import { getAllPublicCourses, getCoursesByAuthor, getCoursesByRegion } from "../lib/firestore";
import { getDDayLabel, getTripStatus } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import type { Course, Place } from "../lib/types";

const REGIONS = ["전체", "제주", "부산", "서울", "강릉", "경주"];

interface HomeScreenProps {
  userName?: string;
  onOpenCourse: (courseId: string) => void;
  // 알림 화면이 MVP 홈에서 숨겨졌지만, 상위 화면 호환성을 위해 프로필 콜백 타입은 유지합니다.
  onOpenProfile: (userId: string) => void;
}

export default function HomeScreen(props: HomeScreenProps) {
  const { userName, onOpenCourse } = props;
  const { user } = useAuth();
  const [region, setRegion] = useState("전체");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upcomingTrip, setUpcomingTrip] = useState<Course | null>(null);

  // 기존 공개 코스 조회 방식과 지역 필터를 그대로 유지합니다.
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

  // 기존 D-day 배너 데이터 연결을 그대로 유지합니다.
  useEffect(() => {
    if (!user) {
      setUpcomingTrip(null);
      return;
    }
    let active = true;
    getCoursesByAuthor(user.uid)
      .then((myCourses) => {
        if (!active) return;
        const next = myCourses.find((course) => course.startDate && getTripStatus(course) !== "done") ?? null;
        setUpcomingTrip(next);
      })
      .catch((err) => {
        // 배너는 부가 정보이므로 실패해도 홈 화면을 막지 않습니다.
        console.error(err);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // 추천 코스·장소의 기존 데이터 연결은 유지합니다.
  const popularCourses = useMemo(
    () => [...courses].sort((a, b) => b.likeCount - a.likeCount),
    [courses]
  );

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
      <header className="px-5 pt-6">
        <p className="text-xs font-medium text-secondary">TRAVEL ROUTE PLANNER</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-800">Route</h1>
            <p className="mt-1 text-sm text-gray-600">
              {userName ? `${userName}님, 다음 여행을 시작해볼까요?` : "다음 여행을 시작해볼까요?"}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-dark shadow-card">
            <Compass size={20} strokeWidth={2} />
          </span>
        </div>
      </header>

      {upcomingTrip && (
        <div className="px-5 pt-5">
          <button
            onClick={() => onOpenCourse(upcomingTrip.id)}
            className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-primary-light px-4 py-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <Plane size={17} className="-rotate-45" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-primary-dark">다가오는 여행</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-gray-800">
                {getDDayLabel(upcomingTrip)} · {upcomingTrip.title}
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-primary-dark" />
          </button>
        </div>
      )}

      <section className="px-5 pt-5">
        <SearchBar onFilterClick={() => {}} />
      </section>

      <section className="mx-5 mt-4 rounded-2xl bg-secondary p-4 text-white shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/18">
            <MapPinned size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">지도로 장소를 찾아보세요</h2>
            <p className="mt-1 text-xs leading-5 text-white/85">
              지도 탭에서 여행지의 장소를 검색하고, 나만의 Route에 담을 수 있어요.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between px-5">
          <div>
            <p className="text-xs font-medium text-secondary">DISCOVER</p>
            <h2 className="mt-0.5 text-base font-semibold text-gray-800">어디로 떠나볼까요?</h2>
          </div>
          {!loading && !error && <span className="text-xs text-gray-600">{courses.length}개 코스</span>}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {REGIONS.map((item) => (
            <button
              key={item}
              onClick={() => setRegion(item)}
              className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                region === item
                  ? "bg-primary-dark text-white"
                  : "border border-gray-300 bg-white text-gray-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
              <RouteIcon size={16} />
            </span>
            <h2 className="text-base font-semibold text-gray-800">추천 코스</h2>
          </div>
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
                className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark"
              >
                <RefreshCw size={12} />
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && courses.length === 0 && (
            <p className="py-6 text-sm text-gray-600">
              아직 {region === "전체" ? "등록된" : `${region} 지역의`} 코스가 없어요. 지도에서 장소를 찾아 첫 Route를 만들어보세요.
            </p>
          )}
        </div>

        {!loading && !error && courses.length > 0 && (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onClick={(selectedCourse) => onOpenCourse(selectedCourse.id)} />
            ))}
          </div>
        )}
      </section>

      <div className="route-divider mx-5 my-7" />

      <section>
        <div className="flex items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary-light text-secondary">
            <MapPinned size={16} />
          </span>
          <h2 className="text-base font-semibold text-gray-800">추천 장소</h2>
        </div>
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
          <div className="route-divider mx-5 my-7" />
          <section>
            <div className="flex items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium text-secondary">MORE TO EXPLORE</p>
                <h2 className="mt-0.5 text-base font-semibold text-gray-800">더 많은 추천 코스</h2>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2.5 px-5">
              {popularCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="horizontal"
                  onClick={(selectedCourse) => onOpenCourse(selectedCourse.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
