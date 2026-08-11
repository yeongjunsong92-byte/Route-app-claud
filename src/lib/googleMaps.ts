// src/lib/googleMaps.ts
// Google Maps Platform 연동 설정 및 유틸 함수
// 필요한 API: Maps JavaScript API, Places API — Google Cloud Console에서 활성화 후
// VITE_GOOGLE_MAPS_API_KEY 환경변수에 브라우저 키를 입력하세요. (HTTP 리퍼러 제한 권장)

import type { Libraries } from "@react-google-maps/api";
import type { Place, PlaceCategory } from "./types";

export const GOOGLE_MAPS_API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

// Places 라이브러리(자동완성/장소검색)를 함께 로드합니다. 컴포넌트 리렌더마다 새 배열이 생성되면
// @react-google-maps/api의 useLoadScript가 매번 리로드를 시도하므로 모듈 스코프 상수로 고정합니다.
export const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];

export const DEFAULT_MAP_CENTER = { lat: 33.4996, lng: 126.5312 }; // 제주 시청 근방 기본 좌표

// 코스 만들기/지도 화면의 지역 선택 칩에서 공통으로 쓰는 지역별 대표 좌표
export const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  제주: { lat: 33.4996, lng: 126.5312 },
  부산: { lat: 35.1796, lng: 129.0756 },
  서울: { lat: 37.5665, lng: 126.978 },
  강릉: { lat: 37.7519, lng: 128.8761 },
  경주: { lat: 35.8562, lng: 129.2247 },
};
export const REGIONS = Object.keys(REGION_COORDS);

// 구글 장소 타입(google place types) → 앱 카테고리 매핑
const TYPE_CATEGORY_MAP: Record<string, PlaceCategory> = {
  lodging: "stay",
  restaurant: "restaurant",
  meal_takeaway: "restaurant",
  meal_delivery: "restaurant",
  cafe: "cafe",
  bakery: "cafe",
  tourist_attraction: "culture",
  museum: "culture",
  art_gallery: "culture",
  park: "nature",
  natural_feature: "nature",
  campground: "nature",
  amusement_park: "activity",
  zoo: "activity",
  aquarium: "activity",
  shopping_mall: "shopping",
  store: "shopping",
  clothing_store: "shopping",
};

export function guessCategory(types?: string[]): PlaceCategory {
  if (!types) return "culture";
  for (const t of types) {
    const found = TYPE_CATEGORY_MAP[t];
    if (found) return found;
  }
  return "culture";
}

/** google.maps.places.PlaceResult(검색/자동완성 결과)를 앱의 Place 타입으로 변환합니다. */
export function toAppPlace(result: google.maps.places.PlaceResult, region = ""): Place | null {
  const location = result.geometry?.location;
  if (!location || !result.place_id) return null;

  const photoUrl = result.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 600 });

  return {
    id: result.place_id,
    name: result.name ?? "이름 없음",
    category: guessCategory(result.types),
    address: result.formatted_address ?? result.vicinity ?? "",
    region,
    lat: location.lat(),
    lng: location.lng(),
    imageUrl: photoUrl ?? `https://picsum.photos/seed/${result.place_id}/800/600`,
    rating: result.rating ?? 0,
    reviewCount: result.user_ratings_total ?? 0,
    description: undefined,
    tags: result.types?.slice(0, 3),
  };
}

/** 두 좌표 사이의 대략적인 거리를 미터 단위로 계산합니다 (Haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 특정 위치 주변의 인기 장소를 찾습니다 ("다음 장소 추천" 기능용).
 * 별도 AI 호출 없이 Google Places Nearby Search 결과를 평점 순으로 정렬해 근사치로 사용합니다.
 * excludeIds에 포함된 장소(이미 코스에 담긴 장소)는 제외합니다.
 */
export function searchNearbyPlaces(
  location: { lat: number; lng: number },
  region: string,
  excludeIds: Set<string>,
  take = 3
): Promise<Place[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.google) {
      resolve([]);
      return;
    }
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    service.nearbySearch(
      { location: new google.maps.LatLng(location.lat, location.lng), radius: 1500 },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          resolve([]);
          return;
        }
        const places = results
          .filter((r) => r.place_id && !excludeIds.has(r.place_id))
          .map((r) => toAppPlace(r, region))
          .filter((p): p is Place => p !== null)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, take);
        resolve(places);
      }
    );
  });
}
