// src/components/PlaceMap.tsx
// Google Maps Platform 기반 지도 컴포넌트.
// 기존 KoreaMap.tsx(스타일라이즈 SVG)를 대체합니다. 카드 외형(rounded-2xl, border)은 기존 디자인을 유지하고
// 내부만 실제 Google 지도로 교체했습니다.
//
// 기능: 지도 표시 / 장소 마커 표시(카테고리별 색상) / 마커·리스트 클릭으로 장소 선택 / 코스 스탑 경로 표시
//
// 필요 환경변수: VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript API, Places API 활성화 필요)

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { CATEGORY_META } from "../lib/types";
import type { Place } from "../lib/types";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, DEFAULT_MAP_CENTER } from "../lib/googleMaps";

// 지도 위 불필요한 기본 POI 아이콘/라벨을 줄여 우리 마커가 잘 보이도록 하는 최소 스타일
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

interface PlaceMapProps {
  places: Place[];
  selectedPlaceId?: string;
  onSelectPlace?: (place: Place) => void;
  routeStops?: Place[]; // 2개 이상이면 순서대로 경로를 그립니다
  travelMode?: "DRIVING" | "WALKING"; // 기본 자동차. 코스 상세의 자동차/도보 토글에서 사용
  center?: { lat: number; lng: number };
  zoom?: number;
  heightClassName?: string; // 기본 h-[380px]
  userLocation?: { lat: number; lng: number } | null;
}

function markerIcon(color: string, big = false): google.maps.Symbol | undefined {
  if (typeof window === "undefined" || !window.google) return undefined;
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
    scale: big ? 12 : 9,
    labelOrigin: new window.google.maps.Point(0, 0),
  };
}

export default function PlaceMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  routeStops,
  travelMode = "DRIVING",
  center,
  zoom = 13,
  heightClassName = "h-[380px]",
  userLocation,
}: PlaceMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const mapCenter = useMemo(() => {
    if (center) return center;
    if (places[0]) return { lat: places[0].lat, lng: places[0].lng };
    return DEFAULT_MAP_CENTER;
  }, [center, places]);

  // 선택된 장소가 바뀌면 지도를 그 위치로 이동
  useEffect(() => {
    if (!map || !selectedPlaceId) return;
    const target = places.find((p) => p.id === selectedPlaceId);
    if (target) map.panTo({ lat: target.lat, lng: target.lng });
  }, [map, selectedPlaceId, places]);

  // 코스 스탑이 2개 이상이면 경로(directions) 요청
  useEffect(() => {
    if (!isLoaded || !routeStops || routeStops.length < 2) {
      setDirections(null);
      return;
    }
    const service = new google.maps.DirectionsService();
    const [origin, ...rest] = routeStops;
    const destination = rest[rest.length - 1]!;
    const waypoints = rest.slice(0, -1).map((stop) => ({
      location: { lat: stop.lat, lng: stop.lng },
      stopover: true,
    }));

    service.route(
      {
        origin: { lat: origin!.lat, lng: origin!.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints,
        travelMode: google.maps.TravelMode[travelMode],
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
        } else {
          setDirections(null);
        }
      }
    );
  }, [isLoaded, routeStops, travelMode]);

  if (loadError) {
    return (
      <div
        className={`flex ${heightClassName} w-full flex-col items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-primary-light text-center`}
      >
        <MapPin size={24} className="text-primary" />
        <p className="px-6 text-sm text-gray-600">
          지도를 불러오지 못했어요. Google Maps API 키 설정을 확인해주세요.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`${heightClassName} w-full animate-pulse rounded-2xl border border-gray-300 bg-primary-light`}
      />
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-300 ${heightClassName}`}>
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        }}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={markerIcon("#6D9EEB", false)}
            zIndex={1}
          />
        )}

        {places.map((place) => {
          const isSelected = place.id === selectedPlaceId;
          const meta = CATEGORY_META[place.category];
          const stopIndex = routeStops?.findIndex((s) => s.id === place.id);
          const label =
            stopIndex !== undefined && stopIndex >= 0 ? String(stopIndex + 1) : undefined;

          return (
            <Marker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => onSelectPlace?.(place)}
              icon={markerIcon(isSelected ? "#E6B7C7" : meta.color, isSelected)}
              label={
                label
                  ? { text: label, color: "#FFFFFF", fontSize: "11px", fontWeight: "700" }
                  : undefined
              }
              zIndex={isSelected ? 10 : 2}
            />
          );
        })}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#E6B7C7",
                strokeOpacity: 0.9,
                strokeWeight: 4,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
