// src/screens/MapScreen.tsx
// 지도 화면: 실제 Google Maps 기반 장소 검색 → 마커 표시 → 장소 선택 → 코스에 추가 → 경로 표시

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { X, Plus, Check, ArrowRight, Loader2, RefreshCw } from "lucide-react";
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

  const handleSearch = useCallback(
    (keyword: string) => {
      if (!keyword || !isLoaded) return;
      setSearching(true);
      setSearchError("");
      setSelectedPlace(null);

      // PlacesService는 지도 인스턴스 없이도 더미 div로 동작합니다 (Text Search API).
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
    [isLoaded, mapCenter, region]
  );

  const visibleMarkers = searchResults.length > 0 ? searchResults : draftPlaces;
  const isDraft = (place: Place) => draftPlaces.some((p) => p.id === place.id);

  return (
    <div className="pb-24">
      <header className="px-5 pt-6">
        <h1 className="text-xl font-bold text-gray-800">지도로 찾기</h1>
        <p className="mt-1 text-sm text-gray-600">
          장소를 검색하고 마음에 드는 곳을 코스에 담아보세요
        </p>
      </header>

      <div className="px-5 pt-4">
        <SearchBar placeholder="장소, 카페, 맛집을 검색해보세요" onSearch={handleSearch} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => {
              setRegion(r);
              setSearchResults([]);
              setSelectedPlace(null);
            }}
            className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              region === r ? "bg-primary text-white" : "border border-gray-300 bg-white text-gray-600"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="px-5 pt-3">
        <PlaceMap
          places={visibleMarkers}
          selectedPlaceId={selectedPlace?.id}
          onSelectPlace={setSelectedPlace}
          routeStops={draftPlaces.length >= 2 ? draftPlaces : undefined}
          center={selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : mapCenter}
        />
        {searching && <p className="mt-2 text-center text-xs text-gray-600">검색 중...</p>}
        {searchError && <p className="mt-2 text-center text-xs text-gray-600">{searchError}</p>}
      </div>

      {/* 선택된 장소 상세 카드 */}
      {selectedPlace && (
        <div className="px-5 pt-3">
          <div className="relative">
            <PlaceCard
              place={selectedPlace}
              onAdd={onToggleDraftPlace}
              added={isDraft(selectedPlace)}
              addStyle="pill"
            />
            <button
              onClick={() => setSelectedPlace(null)}
              aria-label="선택 해제"
              className="tap-scale absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* 검색 결과 리스트 */}
      {searchResults.length > 0 && (
        <section className="mt-4 px-5">
          <h2 className="text-base font-semibold text-gray-800">검색 결과 {searchResults.length}곳</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {searchResults.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onAdd={onToggleDraftPlace}
                added={isDraft(place)}
                addStyle="icon"
              />
            ))}
          </div>
        </section>
      )}

      {/* 담은 장소 → 코스 만들기로 이동 */}
      {draftPlaces.length > 0 && (
        <div className="fixed bottom-16 left-1/2 w-full max-w-[480px] -translate-x-1/2 px-5 pb-3">
          <button
            onClick={onGoToCreate}
            className="tap-scale flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-[0_6px_16px_rgba(255,104,145,0.35)]"
          >
            <Check size={16} />
            담은 장소 {draftPlaces.length}곳으로 코스 만들기
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {searchResults.length === 0 && (
        <section className="mt-5 px-5">
          <h2 className="text-base font-semibold text-gray-800">{region} 코스</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {coursesLoading && (
              <div className="flex items-center gap-2 py-6 text-sm text-gray-600">
                <Loader2 size={16} className="animate-spin" />
                불러오는 중...
              </div>
            )}

            {!coursesLoading && coursesError && (
              <div className="flex flex-col items-start gap-2 py-6">
                <p className="text-sm text-gray-600">{coursesError}</p>
                <button
                  onClick={loadCoursesInRegion}
                  className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <RefreshCw size={12} />
                  다시 시도
                </button>
              </div>
            )}

            {!coursesLoading && !coursesError && coursesInRegion.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-600">
                아직 {region} 지역의 코스가 없어요.
              </p>
            )}

            {!coursesLoading &&
              !coursesError &&
              coursesInRegion.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="horizontal"
                  onClick={(c) => onOpenCourse(c.id)}
                />
              ))}
          </div>
        </section>
      )}

      {draftPlaces.length > 0 && (
        <section className="mt-5 px-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">담은 장소</h2>
            <span className="text-xs text-gray-600">{draftPlaces.length}곳</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {draftPlaces.map((place, i) => (
              <div
                key={place.id}
                className="tap-scale flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white py-1.5 pl-3 pr-1.5"
              >
                <span className="text-xs font-semibold text-primary">{i + 1}</span>
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
              className="tap-scale flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Plus size={12} />
              코스로 만들기
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
