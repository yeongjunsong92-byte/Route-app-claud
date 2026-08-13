// src/screens/MapScreen.tsx
// 지도 화면: 기존 Google Maps 검색·마커·장소 선택·코스 추가 로직을 유지하며 MVP 탐색 흐름을 제공합니다.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { ArrowRight, Check, ChevronRight, Loader2, MapPinned, Plus, RefreshCw, Search, X } from "lucide-react";
import SearchBar from "../components/SearchBar";
import PlaceMap from "../components/PlaceMap";
import PlaceCard from "../components/PlaceCard";
import CourseCard from "../components/CourseCard";
import { getCoursesByRegion } from "../lib/firestore";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  REGION_COORDS,
  REGIONS,
  toAppPlace,
} from "../lib/googleMaps";
import type { Course, Place } from "../lib/types";

interface MapScreenProps {
  onOpenCourse: (courseId: string) => void;
  draftPlaces: Place[];
  onToggleDraftPlace: (place: Place) => void;
  onGoToCreate: () => void;
}

export default function MapScreen({
  onOpenCourse,
  draftPlaces,
  onToggleDraftPlace,
  onGoToCreate,
}: MapScreenProps) {
  // Google Maps 로딩 설정은 기존과 동일하게 유지합니다.
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [region, setRegion] = useState("제주");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const mapCenter = useMemo(() => REGION_COORDS[region] ?? REGION_COORDS["제주"]!, [region]);

  const [coursesInRegion, setCoursesInRegion] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  // 기존 Firestore 지역 코스 조회를 유지합니다.
  const loadCoursesInRegion = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError("");
    try {
      const result = await getCoursesByRegion(region, 20);
      setCoursesInRegion(result);
    } catch (err) {
      console.error(err);
      setCoursesError("코스를 불러오지 못했어요.");
    } finally {
      setCoursesLoading(false);
    }
  }, [region]);

  useEffect(() => {
    loadCoursesInRegion();
  }, [loadCoursesInRegion]);

  // Google Places Text Search와 Place 변환 방식은 변경하지 않습니다.
  const handleSearch = useCallback(
    (keyword: string) => {
      if (!keyword || !isLoaded) return;
      setSearching(true);
      setSearchError("");
      setSelectedPlace(null);

      const service = new google.maps.places.PlacesService(document.createElement("div"));
      service.textSearch(
        {
          query: keyword,
          location: new google.maps.LatLng(mapCenter.lat, mapCenter.lng),
          radius: 20000,
        },
        (results, status) => {
          setSearching(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            const mapped = results
              .map((result) => toAppPlace(result, region))
              .filter((place): place is Place => place !== null);
            setSearchResults(mapped);
          } else {
            setSearchResults([]);
            setSearchError("검색 결과가 없어요. 다른 키워드로 시도해보세요.");
          }
        }
      );
    },
    [isLoaded, mapCenter, region]
  );

  const visibleMarkers = searchResults.length > 0 ? searchResults : draftPlaces;
  const isDraft = (place: Place) => draftPlaces.some((item) => item.id === place.id);

  return (
    <div className="pb-28">
      <header className="px-5 pt-6">
        <p className="text-xs font-medium text-secondary">MAP EXPLORE</p>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">지도로 장소 찾기</h1>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              장소를 선택하고 나만의 Route에 담아보세요.
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary-light text-secondary shadow-card">
            <MapPinned size={19} />
          </span>
        </div>
      </header>

      <div className="px-5 pt-4">
        <SearchBar placeholder="장소, 카페, 맛집을 검색해보세요" onSearch={handleSearch} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {REGIONS.map((item) => (
          <button
            key={item}
            onClick={() => {
              setRegion(item);
              setSearchResults([]);
              setSelectedPlace(null);
            }}
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

      <section className="px-5 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <MapPinned size={14} className="text-secondary" />
            지도를 움직이거나 마커를 선택하세요
          </span>
          {draftPlaces.length > 0 && (
            <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary-dark">
              담은 장소 {draftPlaces.length}
            </span>
          )}
        </div>
        <PlaceMap
          places={visibleMarkers}
          selectedPlaceId={selectedPlace?.id}
          onSelectPlace={setSelectedPlace}
          routeStops={draftPlaces.length >= 2 ? draftPlaces : undefined}
          center={selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : mapCenter}
        />
        {searching && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-gray-600">
            <Loader2 size={13} className="animate-spin" />
            장소를 찾는 중...
          </p>
        )}
        {searchError && <p className="mt-2 text-center text-xs text-gray-600">{searchError}</p>}
      </section>

      {selectedPlace && (
        <section className="mx-5 mt-4 rounded-2xl border border-primary/40 bg-primary-light p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] font-semibold text-primary-dark">STEP 2 · 선택한 장소</p>
              <h2 className="mt-0.5 text-sm font-semibold text-gray-800">장소 정보를 확인하고 코스에 담으세요</h2>
            </div>
            <button
              onClick={() => setSelectedPlace(null)}
              aria-label="선택 해제"
              className="tap-scale flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow-card"
            >
              <X size={14} />
            </button>
          </div>
          <PlaceCard
            place={selectedPlace}
            onAdd={onToggleDraftPlace}
            added={isDraft(selectedPlace)}
            addStyle="pill"
          />
          <p className="mt-2 px-1 text-[11px] leading-4 text-gray-600">
            {isDraft(selectedPlace)
              ? "코스에 담겼어요. 아래 버튼에서 일정 만들기로 이동할 수 있어요."
              : "‘추가’ 버튼을 누르면 이 장소가 코스 초안에 담겨요."}
          </p>
        </section>
      )}

      {searchResults.length > 0 && (
        <section className="mt-6 px-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary">SEARCH RESULTS</p>
              <h2 className="mt-0.5 text-base font-semibold text-gray-800">검색 결과 {searchResults.length}곳</h2>
            </div>
            <Search size={18} className="text-gray-600" />
          </div>
          <p className="mt-2 text-xs text-gray-600">카드를 눌러 정보를 확인한 뒤, + 버튼으로 코스에 추가하세요.</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {searchResults.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onSelect={setSelectedPlace}
                selected={selectedPlace?.id === place.id}
                onAdd={onToggleDraftPlace}
                added={isDraft(place)}
                addStyle="icon"
              />
            ))}
          </div>
        </section>
      )}

      {searchResults.length === 0 && (
        <section className="mt-6 px-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary">LOCAL ROUTES</p>
              <h2 className="mt-0.5 text-base font-semibold text-gray-800">{region} 추천 코스</h2>
            </div>
            <ChevronRight size={18} className="text-gray-600" />
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {coursesLoading && (
              <div className="flex items-center gap-2 py-6 text-sm text-gray-600">
                <Loader2 size={16} className="animate-spin" />
                코스를 불러오는 중...
              </div>
            )}

            {!coursesLoading && coursesError && (
              <div className="flex flex-col items-start gap-2 py-6">
                <p className="text-sm text-gray-600">{coursesError}</p>
                <button
                  onClick={loadCoursesInRegion}
                  className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark"
                >
                  <RefreshCw size={12} />
                  다시 시도
                </button>
              </div>
            )}

            {!coursesLoading && !coursesError && coursesInRegion.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-600">아직 {region} 지역의 코스가 없어요.</p>
            )}

            {!coursesLoading &&
              !coursesError &&
              coursesInRegion.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="horizontal"
                  onClick={(selectedCourse) => onOpenCourse(selectedCourse.id)}
                />
              ))}
          </div>
        </section>
      )}

      {draftPlaces.length > 0 && (
        <section className="mt-6 px-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary">MY ROUTE</p>
              <h2 className="mt-0.5 text-base font-semibold text-gray-800">코스에 담은 장소</h2>
            </div>
            <span className="text-xs text-gray-600">{draftPlaces.length}곳</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {draftPlaces.map((place, index) => (
              <div
                key={place.id}
                className="tap-scale flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white py-1.5 pl-3 pr-1.5 shadow-card"
              >
                <span className="text-xs font-semibold text-primary-dark">{index + 1}</span>
                <span className="max-w-[96px] truncate text-xs text-gray-800">{place.name}</span>
                <button
                  onClick={() => onToggleDraftPlace(place)}
                  aria-label="제거"
                  className="tap-scale flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-gray-600"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={onGoToCreate}
              className="tap-scale flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark"
            >
              <Plus size={12} />
              코스로 만들기
            </button>
          </div>
        </section>
      )}

      {draftPlaces.length > 0 && (
        <div className="fixed bottom-[72px] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-5 pb-3">
          <button
            onClick={onGoToCreate}
            className="tap-scale flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-dark text-sm font-semibold text-white shadow-[0_10px_22px_rgba(190,135,155,0.35)]"
          >
            <Check size={16} />
            담은 장소 {draftPlaces.length}곳으로 코스 만들기
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
