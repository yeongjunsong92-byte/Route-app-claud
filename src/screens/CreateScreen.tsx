// src/screens/CreateScreen.tsx
// 코스 만들기 화면: 기본 정보 입력 -> 장소 검색/추가(지도에서 담은 장소 포함)
// -> 일정/지도 보기 -> 발행 -> 완료 후 선택 화면(CourseCompleteSheet)

import { useCallback, useEffect, useRef, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import {
  ImagePlus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  X,
  CalendarDays,
  Map as MapIcon,
  Loader2,
  Search,
} from "lucide-react";
import SearchBar from "../components/SearchBar";
import PlaceCard from "../components/PlaceCard";
import PlaceMap from "../components/PlaceMap";
import CourseCompleteSheet from "../components/CourseCompleteSheet";
import { useAuth } from "../context/AuthContext";
import { createCourse } from "../lib/firestore";
import { uploadCourseCover } from "../lib/storage";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  REGION_COORDS,
  REGIONS,
  toAppPlace,
} from "../lib/googleMaps";
import type { Course, CourseStop, Place } from "../lib/types";

interface CreateScreenProps {
  draftPlaces?: Place[]; // 지도 화면에서 담아온 장소
  onViewCourses?: () => void;
}

/**
 * stops 배열을 "DAY 순서 -> 그 안에서의 기존 순서"대로 다시 정렬하고 order를 1부터 다시 매깁니다.
 * TravelNavigator는 stops 배열의 실제 순서(인덱스)를 그대로 방문 순서로 사용하기 때문에,
 * 장소를 추가/삭제/DAY 이동/순서 변경할 때마다 이 함수로 배열 자체를 "DAY별로 묶인" 상태로
 * 유지해야 나중에 지도 따라가기가 DAY 순서대로 정상 진행됩니다.
 */
function canonicalizeStops(stops: CourseStop[]): CourseStop[] {
  const byDay = new Map<number, CourseStop[]>();
  for (const stop of stops) {
    const day = stop.day ?? 1;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(stop);
  }
  const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b);
  const flattened: CourseStop[] = [];
  for (const day of sortedDays) flattened.push(...byDay.get(day)!);
  return flattened.map((stop, i) => ({ ...stop, order: i + 1 }));
}

export default function CreateScreen({ draftPlaces = [], onViewCourses }: CreateScreenProps) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState(REGIONS[0]!);
  const [durationDays, setDurationDays] = useState(1);
  const [startDate, setStartDate] = useState(""); // "YYYY-MM-DD" (input type=date 값 그대로)
  const [endDate, setEndDate] = useState("");
  const [stops, setStops] = useState<CourseStop[]>([]);
  const [view, setView] = useState<"schedule" | "map">("schedule");
  const [selectedDay, setSelectedDay] = useState(1); // 장소를 추가할 때 들어갈 DAY
  const [openMoveMenuFor, setOpenMoveMenuFor] = useState<string | null>(null); // "DAY N로 이동" 메뉴

  // 장소 검색 (Google Places) — MapScreen과 동일한 방식
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // 커버 이미지: 직접 업로드한 게 있으면 그걸 우선 사용, 없으면 첫 장소 사진으로 대체
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [completedCourse, setCompletedCourse] = useState<Course | null>(null);

  const coverImageUrl = customCoverUrl ?? stops[0]?.place.imageUrl ?? "";

  // 지도 화면에서 새로 담은 장소가 있으면 코스 순서에 자동으로 이어붙입니다 (현재 선택된 DAY로).
  useEffect(() => {
    if (draftPlaces.length === 0) return;
    setStops((prev) => {
      const existingIds = new Set(prev.map((s) => s.place.id));
      const toAdd = draftPlaces.filter((p) => !existingIds.has(p.id));
      if (toAdd.length === 0) return prev;
      const appended = toAdd.map((place) => ({ order: 0, place, day: selectedDay }));
      return canonicalizeStops([...prev, ...appended]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPlaces]);

  // 코스 기간(durationDays)이 줄어들면, 사라지는 DAY에 있던 장소를 삭제하지 않고
  // 마지막으로 남는 DAY로 옮깁니다 (데이터 유실 방지).
  useEffect(() => {
    setStops((prev) => {
      const needsReassign = prev.some((s) => (s.day ?? 1) > durationDays);
      if (!needsReassign) return prev;
      return canonicalizeStops(
        prev.map((s) => ((s.day ?? 1) > durationDays ? { ...s, day: durationDays } : s))
      );
    });
    setSelectedDay((d) => Math.min(d, durationDays));
  }, [durationDays]);

  const toggleStop = (place: Place) => {
    setStops((prev) => {
      const exists = prev.find((s) => s.place.id === place.id);
      if (exists) {
        return canonicalizeStops(prev.filter((s) => s.place.id !== place.id));
      }
      return canonicalizeStops([...prev, { order: 0, place, day: selectedDay }]);
    });
  };

  const removeStop = (placeId: string) => {
    setStops((prev) => canonicalizeStops(prev.filter((s) => s.place.id !== placeId)));
  };

  /** 장소를 다른 DAY로 이동합니다 (드래그 대신 사용하는 대체 UI). */
  const moveStopToDay = (placeId: string, targetDay: number) => {
    setStops((prev) =>
      canonicalizeStops(
        prev.map((s) => (s.place.id === placeId ? { ...s, day: targetDay } : s))
      )
    );
    setOpenMoveMenuFor(null);
  };

  /** 같은 DAY 안에서 장소를 한 칸 위/아래로 옮깁니다. */
  const moveStopWithinDay = (placeId: string, direction: "up" | "down") => {
    setStops((prev) => {
      const target = prev.find((s) => s.place.id === placeId);
      if (!target) return prev;
      const day = target.day ?? 1;
      const dayStops = prev.filter((s) => (s.day ?? 1) === day);
      const otherStops = prev.filter((s) => (s.day ?? 1) !== day);
      const index = dayStops.findIndex((s) => s.place.id === placeId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= dayStops.length) return prev;
      const reordered = [...dayStops];
      [reordered[index], reordered[swapWith]] = [reordered[swapWith]!, reordered[index]!];
      return canonicalizeStops([...otherStops, ...reordered]);
    });
  };

  const handleSearch = useCallback(
    (keyword: string) => {
      if (!keyword || !isLoaded) return;
      setSearching(true);
      setSearchError("");
      setHasSearched(true);

      const center = REGION_COORDS[region] ?? REGION_COORDS["제주"]!;
      // PlacesService는 지도 인스턴스 없이도 더미 div로 동작합니다 (Text Search API).
      const service = new google.maps.places.PlacesService(document.createElement("div"));
      service.textSearch(
        { query: keyword, location: new google.maps.LatLng(center.lat, center.lng), radius: 20000 },
        (results, status) => {
          setSearching(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            const mapped = results
              .map((r) => toAppPlace(r, region))
              .filter((p): p is Place => p !== null);
            setSearchResults(mapped);
          } else {
            setSearchResults([]);
            setSearchError("검색 결과가 없어요. 다른 키워드로 시도해보세요.");
          }
        }
      );
    },
    [isLoaded, region]
  );

  const handleCoverFileChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    setPublishError("");
    try {
      const url = await uploadCourseCover(user.uid, file);
      setCustomCoverUrl(url);
    } catch (err) {
      console.error(err);
      setPublishError("커버 이미지 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploadingCover(false);
    }
  };

  const canPublish = title.trim().length > 0 && stops.length > 0 && !publishing && !!user;

  const handlePublish = async () => {
    if (!canPublish || !user) return;
    setPublishing(true);
    setPublishError("");
    try {
      const authorName = profile?.displayName ?? user.displayName ?? "여행자";
      const authorAvatarUrl = profile?.avatarUrl || user.photoURL || undefined;
      const base = {
        title: title.trim(),
        description: description.trim(),
        coverImageUrl,
        region,
        authorId: user.uid,
        authorName,
        stops,
        durationDays,
        tags: [],
        // 발행 직후엔 기본적으로 "나만 볼 수 있는" 비공개 상태로 저장하고,
        // CourseCompleteSheet에서 "피드에 게시" / "링크 공유"를 선택할 때만 공개로 전환합니다.
        isPublic: false,
        // Firestore는 값이 undefined인 필드를 거부하므로, 값이 없는 선택 필드는
        // 키 자체를 아예 넣지 않습니다 (undefined로 넣으면 저장 자체가 실패해요).
        ...(authorAvatarUrl ? { authorAvatarUrl } : {}),
        ...(startDate ? { startDate, endDate: endDate || startDate } : {}),
      };
      const courseId = await createCourse(base);

      // 완료 화면에 보여줄 로컬 Course 객체 (createdAt/updatedAt은 화면 표시용 근사치)
      setCompletedCourse({
        id: courseId,
        ...base,
        likeCount: 0,
        saveCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      setPublishError("발행 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStops([]);
    setSelectedDay(1);
    setOpenMoveMenuFor(null);
    setCustomCoverUrl(null);
    setCompletedCourse(null);
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="pb-28">
      <header className="px-5 pt-6">
        <p className="text-xs font-medium text-secondary">CREATE ROUTE</p>
        <h1 className="mt-1 text-xl font-bold text-gray-800">내 코스 만들기</h1>
        <p className="mt-1 text-sm leading-5 text-gray-600">
          장소를 담고, 일정 순서를 확인한 뒤 나만의 Route로 저장하세요.
        </p>
      </header>

      <section className="mt-5 space-y-4 px-5">
        <div className="rounded-2xl border border-primary/30 bg-primary-light p-3.5">
          <p className="text-[11px] font-semibold text-primary-dark">CREATE FLOW</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">장소 추가 → 코스 정보 → 일정 확인 → 저장</p>
          <p className="mt-1 text-xs text-gray-600">지도에서 담은 장소는 아래 일정에 자동으로 반영됩니다.</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-secondary">STEP 1 · 코스 정보</p>
          <h2 className="mt-1 text-base font-semibold text-gray-800">여행의 기본 정보를 입력하세요</h2>
        </div>
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="tap-scale relative flex h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-white text-gray-600"
        >
          {uploadingCover ? (
            <Loader2 size={26} className="animate-spin text-primary" />
          ) : coverImageUrl ? (
            <img src={coverImageUrl} alt="커버" className="h-full w-full object-cover" />
          ) : (
            <>
              <ImagePlus size={26} />
              <span className="text-sm">커버 이미지 추가 (탭해서 업로드)</span>
            </>
          )}
          {coverImageUrl && !uploadingCover && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-[11px] text-white">
              탭해서 변경
            </span>
          )}
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleCoverFileChange(e.target.files)}
        />

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="코스 제목을 입력하세요"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="코스에 대한 소개를 적어주세요"
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none"
        />

        <div className="flex gap-2">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-primary focus:outline-none"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5">
            <button
              onClick={() => setDurationDays((d) => Math.max(1, d - 1))}
              className="tap-scale h-6 w-6 rounded-full bg-primary-light text-primary"
            >
              −
            </button>
            <span className="w-10 text-center text-sm text-gray-800">{durationDays}일</span>
            <button
              onClick={() => setDurationDays((d) => Math.min(14, d + 1))}
              className="tap-scale h-6 w-6 rounded-full bg-primary-light text-primary"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-gray-600">출발일 (선택)</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                // 종료일이 출발일보다 빠르면 자동으로 맞춰줍니다.
                if (endDate && e.target.value && endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-gray-600">종료일 (선택)</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <p className="text-[11px] text-gray-600">
          날짜를 입력하면 홈 화면에 D-day 배너로 표시돼요. 안 정해졌다면 비워둬도 괜찮아요.
        </p>
        <div className="flex items-center justify-between rounded-xl bg-paper px-3 py-2.5 text-xs text-gray-600">
          <span>현재 일정</span>
          <span className="font-semibold text-primary-dark">{durationDays}일 · 장소 {stops.length}곳</span>
        </div>
      </section>

      {/* 일정 보기 / 지도 보기 토글 */}
      {stops.length > 0 && (
        <div className="mt-5 px-5">
          <div className="flex rounded-full bg-primary-light p-1">
            <button
              onClick={() => setView("schedule")}
              className={`tap-scale flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${
                view === "schedule" ? "bg-white text-primary shadow-sm" : "text-primary/70"
              }`}
            >
              <CalendarDays size={14} />
              일정 보기
            </button>
            <button
              onClick={() => setView("map")}
              className={`tap-scale flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${
                view === "map" ? "bg-white text-primary shadow-sm" : "text-primary/70"
              }`}
            >
              <MapIcon size={14} />
              지도 보기
            </button>
          </div>

          {view === "map" && (
            <div className="mt-3">
              <PlaceMap
                places={stops.map((s) => s.place)}
                routeStops={stops.length >= 2 ? stops.map((s) => s.place) : undefined}
                center={{ lat: stops[0]!.place.lat, lng: stops[0]!.place.lng }}
                heightClassName="h-[320px]"
              />
            </div>
          )}
        </div>
      )}

      {/* DAY 탭: 장소를 추가할 때 어느 DAY에 들어갈지 선택합니다 */}
      <div className="mt-5 px-5">
        <p className="text-xs font-semibold text-secondary">STEP 2 · 일정 확인</p>
        <h2 className="mt-1 text-base font-semibold text-gray-800">장소 순서와 이동 흐름을 확인하세요</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: durationDays }, (_, i) => i + 1).map((day) => {
            const count = stops.filter((s) => (s.day ?? 1) === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  selectedDay === day
                    ? "bg-primary text-white"
                    : "border border-gray-300 bg-white text-gray-600"
                }`}
              >
                DAY {day}
                {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-600">
          선택한 DAY에 새 장소가 추가돼요. 아래에서 각 장소를 다른 DAY로 옮기거나 순서를 바꿀 수 있어요.
        </p>
      </div>

      {view === "schedule" && stops.length > 0 && (
        <section className="mt-4 px-5">
          {Array.from({ length: durationDays }, (_, i) => i + 1).map((day) => {
            const dayStops = stops
              .filter((s) => (s.day ?? 1) === day)
              .sort((a, b) => a.order - b.order);
            if (dayStops.length === 0) return null;
            return (
              <div key={day} className="mb-5">
                <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  DAY {day}
                </span>
                <ol className="mt-2 flex flex-col gap-2">
                  {dayStops.map((stop, i) => (
                    <li
                      key={stop.place.id}
                      className="relative flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-2.5"
                    >
                      <GripVertical size={16} className="shrink-0 text-gray-300" />
                      <div className="flex shrink-0 flex-col">
                        <button
                          onClick={() => moveStopWithinDay(stop.place.id, "up")}
                          disabled={i === 0}
                          aria-label="위로 이동"
                          className="tap-scale text-gray-600 disabled:opacity-20"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveStopWithinDay(stop.place.id, "down")}
                          disabled={i === dayStops.length - 1}
                          aria-label="아래로 이동"
                          className="tap-scale text-gray-600 disabled:opacity-20"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                        {stop.place.name}
                      </span>

                      {durationDays > 1 && (
                        <button
                          onClick={() =>
                            setOpenMoveMenuFor((cur) => (cur === stop.place.id ? null : stop.place.id))
                          }
                          aria-label="다른 DAY로 이동"
                          className="tap-scale text-gray-600"
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                      {openMoveMenuFor === stop.place.id && (
                        <div className="absolute right-8 top-10 z-10 w-32 rounded-xl border border-gray-300 bg-white p-1 shadow-card">
                          {Array.from({ length: durationDays }, (_, d) => d + 1)
                            .filter((d) => d !== day)
                            .map((d) => (
                              <button
                                key={d}
                                onClick={() => moveStopToDay(stop.place.id, d)}
                                className="tap-scale block w-full rounded-lg px-3 py-2 text-left text-xs text-gray-800 hover:bg-primary-light"
                              >
                                DAY {d}로 이동
                              </button>
                            ))}
                        </div>
                      )}

                      <button
                        onClick={() => removeStop(stop.place.id)}
                        aria-label="제거"
                        className="tap-scale text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </section>
      )}

      <div className="route-divider mx-5 my-6" />

      <section className="px-5">
        <p className="text-xs font-semibold text-secondary">STEP 3 · 장소 추가</p>
        <h2 className="mt-1 text-base font-semibold text-gray-800">장소를 더 담아보세요</h2>
        <p className="mt-1 text-xs text-gray-600">
          지도 탭에서 검색해 담은 장소가 자동으로 이어붙어요. 여기서 직접 검색해서 추가할 수도 있어요.
        </p>
        <div className="mt-3">
          <SearchBar placeholder="추가할 장소를 검색하세요" onSearch={handleSearch} />
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {searching && (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" />
              검색 중...
            </div>
          )}

          {!searching && searchError && (
            <p className="py-6 text-center text-sm text-gray-600">{searchError}</p>
          )}

          {!searching && !searchError && !hasSearched && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-gray-600">
              <Search size={20} />
              <p className="text-sm">위 검색창에서 장소를 검색해 코스에 추가해보세요</p>
            </div>
          )}

          {!searching &&
            !searchError &&
            searchResults.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onAdd={toggleStop}
                added={stops.some((s) => s.place.id === place.id)}
              />
            ))}
        </div>
      </section>

      <div className="fixed bottom-16 left-1/2 w-full max-w-[480px] -translate-x-1/2 px-5 pb-3">
        {publishError && (
          <p className="mb-2 rounded-lg bg-white px-3 py-2 text-center text-xs text-red-500 shadow-card">
            {publishError}
          </p>
        )}
        {!user && (
          <p className="mb-2 rounded-lg bg-white px-3 py-2 text-center text-xs text-gray-600 shadow-card">
            로그인 후 코스를 발행할 수 있어요.
          </p>
        )}
        <button
          onClick={handlePublish}
          disabled={!canPublish}
          className="tap-scale flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-40"
        >
          {publishing ? "저장 중..." : "코스 저장하기"}
        </button>
      </div>

      {completedCourse && user && (
        <CourseCompleteSheet
          course={completedCourse}
          authorId={user.uid}
          authorName={profile?.displayName ?? user.displayName ?? "여행자"}
          authorAvatarUrl={profile?.avatarUrl ?? user.photoURL ?? undefined}
          onClose={resetForm}
          onViewCourses={() => {
            if (onViewCourses) {
              setCompletedCourse(null);
              onViewCourses();
              return;
            }
            resetForm();
          }}
        />
      )}
    </div>
  );
}
