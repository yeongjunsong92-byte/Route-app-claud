import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Bookmark,
  CarFront,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Footprints,
  GripVertical,
  Heart,
  LocateFixed,
  Link2,
  MapPin,
  MoreHorizontal,
  Navigation,
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  TrainFront,
  User,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { getScheduleWarnings } from "@/lib/courseSchedule";
import { toast } from "sonner";

type Screen = "home" | "map" | "my-courses" | "friends" | "mypage" | "search" | "place-detail" | "place-navigation" | "my-places" | "course-create" | "course-detail" | "user-search" | "profile" | "public-courses" | "public-course-detail" | "saved-courses" | "edit-course" | "active-course";
type Tab = "home" | "map" | "courses" | "friends" | "mypage";
export type TravelMode = "driving" | "transit" | "walking";

type Place = {
  id: string;
  name: string;
  category: string;
  address: string;
  image: string;
  description: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  hours: string;
  phone: string;
  photos?: string[];
  openNow?: boolean;
  website?: string;
};

type CourseItem = { name: string; time: string; duration: string; cost: number; image: string; address?: string; dayNumber?: number; durationMinutes?: number };
type CourseStatus = "planned" | "active" | "completed";
type Course = { id: string; title: string; region: string; author: string; image: string; likes: number; days: number; items: CourseItem[]; startDate?: string | Date | null; endDate?: string | Date | null; status?: CourseStatus };

const mockPlaces: Place[] = [
  { id: "p1", name: "성수 식당", category: "맛집", address: "서울 성동구 연무장7길 5", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85", photos: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85"], description: "성수에서 오래 사랑받은 따뜻한 한식 공간입니다.", rating: 4.6, reviewCount: 1245, lat: 37.5446, lng: 127.0557, hours: "11:30 - 22:00", phone: "02-1234-5678" },
  { id: "p2", name: "오븐 성수", category: "카페", address: "서울 성동구 연무장길 7", image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=85", description: "매일 구워내는 베이커리와 스페셜티 커피.", rating: 4.4, reviewCount: 892, lat: 37.545, lng: 127.0565, hours: "10:00 - 21:00", phone: "02-2345-6789" },
  { id: "p3", name: "성수동 스테이크", category: "맛집", address: "서울 성동구 아차산로 403", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85", description: "부드러운 육질과 와인이 어우러지는 다이닝.", rating: 4.5, reviewCount: 2100, lat: 37.5435, lng: 127.0582, hours: "12:00 - 23:00", phone: "02-3456-7890" },
  { id: "p4", name: "서울숲", category: "관광지", address: "서울 성동구 뚝섬로 273", image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=85", description: "도심 속에서 산책과 휴식을 즐길 수 있는 공원.", rating: 4.8, reviewCount: 4530, lat: 37.5447, lng: 127.0374, hours: "24시간", phone: "02-460-2905" },
];

const publicCourse: Course = {
  id: "c1", title: "제주 2박 3일 힐링 코스", region: "제주", author: "여행하는 지훈", image: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?auto=format&fit=crop&w=1200&q=85", likes: 24, days: 3,
  items: [
    { name: "협재 해수욕장", time: "10:00", duration: "1시간", durationMinutes: 60, dayNumber: 1, cost: 0, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=85" },
    { name: "애월 카페거리", time: "12:30", duration: "1시간 30분", durationMinutes: 90, dayNumber: 1, cost: 15000, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=500&q=85" },
    { name: "오설록 티 뮤지엄", time: "15:00", duration: "1시간", durationMinutes: 60, dayNumber: 2, cost: 12000, image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=500&q=85" },
    { name: "애월 해안도로", time: "17:30", duration: "1시간", durationMinutes: 60, dayNumber: 2, cost: 0, image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=85" },
  ],
};

const sampleCourses: Course[] = [publicCourse, { ...publicCourse, id: "c2", title: "부산 1박 2일 맛집 투어", region: "부산", author: "여행의 기록", image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85", likes: 18 }];
const RECENT_SEARCHES_KEY = "route-recent-place-searches";
const DEFAULT_MAP_CENTER = { lat: 37.5446, lng: 127.0557 };
const travelModeMeta: Record<TravelMode, { label: string; summary: string; speedKmh: number; googleMode: keyof typeof google.maps.TravelMode; icon: typeof CarFront }> = {
  driving: { label: "자동차", summary: "차량 이동", speedKmh: 25, googleMode: "DRIVING", icon: CarFront },
  transit: { label: "대중교통", summary: "대중교통 예상", speedKmh: 18, googleMode: "TRANSIT", icon: TrainFront },
  walking: { label: "도보", summary: "도보 이동", speedKmh: 4.5, googleMode: "WALKING", icon: Footprints },
};
const TravelModeContext = createContext<TravelMode>("driving");

function getPlacePhotos(place: Place) {
  return place.photos?.length ? place.photos : [place.image];
}

function distanceInMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latitudeDistance = radians(to.lat - from.lat);
  const longitudeDistance = radians(to.lng - from.lng);
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDistance / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)}m` : `${(meters / 1000).toFixed(1)}km`;
}

function naverMapSearchUrl(place: Place) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${place.name} ${place.address}`)}`;
}

function googleNavigationUrl(place: Place, mode: TravelMode, origin?: { lat: number; lng: number } | null) {
  const params = new URLSearchParams({ api: "1", destination: `${place.lat},${place.lng}`, travelmode: mode === "driving" ? "driving" : mode === "transit" ? "transit" : "walking", dir_action: "navigate" });
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function naverNavigationUrl(place: Place, origin?: { lat: number; lng: number } | null) {
  const params = new URLSearchParams({ dlat: String(place.lat), dlng: String(place.lng), dname: place.name, appname: "route.manus" });
  if (origin) {
    params.set("slat", String(origin.lat));
    params.set("slng", String(origin.lng));
    params.set("sname", "현재 위치");
  }
  return `nmap://navigation?${params.toString()}`;
}

function kakaoNavigationUrl(place: Place) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
}

const courseStatusLabel: Record<CourseStatus, string> = { planned: "예정", active: "진행 중", completed: "완료" };

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCourseDateRange(startDate?: string | Date | null, endDate?: string | Date | null) {
  const start = toDateInputValue(startDate);
  const end = toDateInputValue(endDate);
  if (!start && !end) return "날짜 미정";
  const pretty = (value: string) => value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1.$2.$3");
  return start && end ? `${pretty(start)} ~ ${pretty(end)}` : pretty(start || end);
}

function naverReservationUrl(place: Place) {
  if (place.website && /(?:booking\.naver\.com|(?:m\.)?place\.naver\.com)/i.test(place.website)) return place.website;
  return `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(`${place.name} ${place.address} 네이버 예약`)}`;
}

function naverReservationLabel(place: Place) {
  return place.website && /(?:booking\.naver\.com|(?:m\.)?place\.naver\.com)/i.test(place.website) ? "네이버 예약 열기" : "네이버에서 예약 찾기";
}

function categoryPinColor(category: string) {
  if (category === "맛집") return "#e978a5";
  if (category === "카페") return "#6351dd";
  if (category === "관광지") return "#2f9e7d";
  if (category === "숙소") return "#4f83e8";
  return "#6351dd";
}

function MapFallback({ markers = mockPlaces, selectedId, onSelect }: { markers?: Place[]; selectedId?: string; onSelect?: (place: Place) => void }) {
  const markerPositions = [
    { top: "27%", left: "31%" }, { top: "42%", left: "53%" }, { top: "58%", right: "23%" }, { top: "66%", left: "24%" },
    { top: "34%", right: "17%" }, { top: "75%", right: "37%" }, { top: "49%", left: "14%" }, { top: "20%", right: "36%" },
  ];
  return (
    <div className="route-map-fallback">
      <div className="route-map-water" />
      <div className="route-map-road road-a" /><div className="route-map-road road-b" /><div className="route-map-road road-c" /><div className="route-map-road road-d" />
      {markers.slice(0, 8).map((place, index) => <button key={place.id} style={{ ...markerPositions[index], color: categoryPinColor(place.category) }} className={`route-map-marker ${selectedId === place.id ? "is-selected" : ""}`} onClick={() => onSelect?.(place)} aria-label={place.name}><MapPin size={selectedId === place.id ? 22 : 18} fill="currentColor" /></button>)}
      <div className="route-map-attribution">Google Maps preview</div>
    </div>
  );
}

function StatusBar() { return <div className="route-status-bar"><span>9:41</span><span className="route-status-icons">● ● ●</span></div>; }

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string; icon: typeof Compass }> = [
    { id: "home", label: "홈", icon: Compass }, { id: "map", label: "지도", icon: MapPin }, { id: "courses", label: "코스", icon: Calendar }, { id: "friends", label: "친구", icon: Users }, { id: "mypage", label: "마이", icon: User },
  ];
  return <nav className="route-bottom-nav">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => onChange(id)}><Icon size={18} /><span>{label}</span></button>)}</nav>;
}

function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return <header className="route-screen-header">{onBack ? <button onClick={onBack} aria-label="뒤로"><ArrowLeft size={18} /></button> : <span className="route-header-spacer" />}<h1>{title}</h1><div>{right || <span className="route-header-spacer" />}</div></header>;
}

function PlaceRow({ place, onClick, onSave, distanceLabel = "350m" }: { place: Place; onClick: () => void; onSave: () => void; distanceLabel?: string }) {
  const dispatchNavigation = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent<Place>("route:navigate-place", { detail: place }));
  };
  return <button className="route-place-row" onClick={onClick}><img src={place.image} alt="" /><span className="route-place-copy"><strong>{place.name}</strong><small>★ {place.rating} ({place.reviewCount}) · {place.category}</small><em>{place.address}</em></span><span className="route-place-distance">{distanceLabel}</span><span className="route-place-navigate" role="button" tabIndex={0} aria-label={`${place.name} 길찾기`} onClick={dispatchNavigation} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") dispatchNavigation(event); }}><Navigation size={15} /></span><span className="route-place-save" onClick={(event) => { event.stopPropagation(); onSave(); }}><Bookmark size={16} /></span></button>;
}

function StepIndicator({ step }: { step: number }) { return <div className="route-step-indicator">{[1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? "active" : ""}>{item}</span>)}</div>; }

type RouteStop = { name: string; lat: number; lng: number };

type RouteSegment = { from: string; to: string; minutes: number; distanceMeters: number };

function getModeRouteDistanceMeters(from: RouteStop, to: RouteStop, mode: TravelMode) {
  const directDistance = distanceInMeters(from, to);
  if (mode === "walking") return directDistance;
  const latitude = ((from.lat + to.lat) / 2) * (Math.PI / 180);
  const northSouthMeters = Math.abs(to.lat - from.lat) * 111000;
  const eastWestMeters = Math.abs(to.lng - from.lng) * 111000 * Math.cos(latitude);
  const cityGridMeters = northSouthMeters + eastWestMeters;
  return Math.max(directDistance, Math.round(cityGridMeters * (mode === "driving" ? 1.12 : 1.04)));
}

function getModeSegmentMinutes(from: RouteStop, to: RouteStop, mode: TravelMode) {
  const modeDistance = getModeRouteDistanceMeters(from, to, mode);
  return Math.max(mode === "walking" ? 1 : 5, Math.round((modeDistance / 1000 / travelModeMeta[mode].speedKmh) * 60));
}

function getModeSegmentTravelCost(from: RouteStop, to: RouteStop, mode: TravelMode) {
  return (getModeRouteDistanceMeters(from, to, mode) / 1000 / travelModeMeta[mode].speedKmh) * 60;
}

function getRouteTravelCost(stops: RouteStop[], mode: TravelMode) {
  return stops.slice(1).reduce((total, stop, index) => total + getModeSegmentTravelCost(stops[index], stop, mode), 0);
}

function estimateRouteMinutes(stops: RouteStop[], mode: TravelMode = "driving") {
  return stops.slice(1).reduce((total, stop, index) => total + getModeSegmentMinutes(stops[index], stop, mode), 0);
}

export function estimateRouteSegments(stops: RouteStop[], mode: TravelMode = "driving"): RouteSegment[] {
  return stops.slice(1).map((stop, index) => {
    const previous = stops[index];
    const distanceMeters = distanceInMeters(previous, stop);
    return { from: previous.name, to: stop.name, distanceMeters, minutes: getModeSegmentMinutes(previous, stop, mode) };
  });
}

export function getRouteDistanceMeters(stops: RouteStop[]) {
  return estimateRouteSegments(stops).reduce((total, segment) => total + segment.distanceMeters, 0);
}

export function getRouteTravelMinutes(stops: RouteStop[], mode: TravelMode = "driving") {
  return estimateRouteSegments(stops, mode).reduce((total, segment) => total + segment.minutes, 0);
}

export function getOptimalRouteOrder<T extends RouteStop>(stops: T[], mode: TravelMode = "driving"): T[] {
  if (stops.length < 3) return [...stops];
  const origin = stops[0];
  const remaining = stops.slice(1);
  if (stops.length > 8) {
    const route = [origin];
    const candidates = [...remaining];
    while (candidates.length) {
      const current = route[route.length - 1];
      const nextIndex = candidates.reduce((bestIndex, candidate, index) => getModeSegmentTravelCost(current, candidate, mode) < getModeSegmentTravelCost(current, candidates[bestIndex], mode) ? index : bestIndex, 0);
      route.push(candidates.splice(nextIndex, 1)[0]);
    }
    return route;
  }
  let bestRoute = [...stops];
  let bestDuration = getRouteTravelCost(bestRoute, mode);
  const visit = (route: T[], available: T[]) => {
    if (!available.length) {
      const candidateDuration = getRouteTravelCost(route, mode);
      if (candidateDuration < bestDuration) {
        bestRoute = [...route];
        bestDuration = candidateDuration;
      }
      return;
    }
    available.forEach((stop, index) => visit([...route, stop], [...available.slice(0, index), ...available.slice(index + 1)]));
  };
  visit([origin], remaining);
  return bestRoute;
}

export function optimizePlacesByDay(places: Place[], dayByPlace: Record<string, number>, mode: TravelMode = "driving") {
  const days = Array.from(new Set(places.map((place) => dayByPlace[place.id] || 1))).sort((a, b) => a - b);
  return days.flatMap((day) => getOptimalRouteOrder(places.filter((place) => (dayByPlace[place.id] || 1) === day), mode));
}

export function getRouteEfficiencyWarnings(stops: RouteStop[]) {
  if (stops.length === 2) {
    const directDistance = distanceInMeters(stops[0], stops[1]);
    if (directDistance >= 1500) return [{ placeName: stops[1].name, extraDistance: directDistance, message: `${stops[0].name}에서 ${stops[1].name}까지 약 ${formatDistance(directDistance)} 이동합니다. 이동 수단이나 방문 순서를 한 번 확인해보세요.` }];
  }
  return stops.slice(1, -1).flatMap((stop, index) => {
    const previous = stops[index];
    const next = stops[index + 2];
    const viaDistance = distanceInMeters(previous, stop) + distanceInMeters(stop, next);
    const directDistance = distanceInMeters(previous, next);
    if (!directDistance || viaDistance < directDistance * 1.55 || viaDistance - directDistance < 600) return [];
    return [{ placeName: stop.name, extraDistance: viaDistance - directDistance, message: `${stop.name} 경유로 약 ${formatDistance(viaDistance - directDistance)} 더 이동합니다. 방문 순서를 한 번 확인해보세요.` }];
  });
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `약 ${hours}시간 ${remainder}분` : `약 ${hours}시간`;
}

function formatTotalDuration(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function calculateCourseDayCount(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const difference = Math.round((end.getTime() - start.getTime()) / 86400000);
  return difference >= 0 ? Math.max(1, difference + 1) : 1;
}

function RouteMapFallback({ stops }: { stops: RouteStop[] }) {
  const segments = estimateRouteSegments(stops);
  return <div className="route-map-fallback route-route-fallback"><div className="route-map-water" /><div className="route-map-road road-a" /><div className="route-map-road road-b" /><div className="route-map-road road-c" /><div className="route-route-line-fallback" />{stops.map((stop, index) => <span className={`route-route-stop-fallback stop-${index + 1}`} key={`${stop.name}-${index}`}>{index + 1}</span>)}{segments.map((segment, index) => <span className={`route-route-time-fallback time-${index + 1}`} key={`${segment.to}-time`}>{segment.minutes}분</span>)}<div className="route-map-attribution">Route route preview</div></div>;
}

function CourseRouteMap({ stops, compact = false, travelMode: requestedTravelMode }: { stops: RouteStop[]; compact?: boolean; travelMode?: TravelMode }) {
  const travelMode = requestedTravelMode || useContext(TravelModeContext);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const routeDecorationRefs = useRef<google.maps.Marker[]>([]);
  const routeFallbackLineRef = useRef<google.maps.Polyline | null>(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState("");
  const [isRealRoute, setIsRealRoute] = useState(false);
  const fallbackMinutes = useMemo(() => estimateRouteMinutes(stops, travelMode), [stops, travelMode]);
  const fallbackSegments = useMemo(() => estimateRouteSegments(stops, travelMode), [stops, travelMode]);
  const [segments, setSegments] = useState<RouteSegment[]>(fallbackSegments);
  useEffect(() => setSegments(fallbackSegments), [fallbackSegments]);
  const clearRouteDecorations = useCallback(() => {
    routeDecorationRefs.current.forEach((marker) => marker.setMap(null));
    routeDecorationRefs.current = [];
    routeFallbackLineRef.current?.setMap(null);
    routeFallbackLineRef.current = null;
  }, []);
  const renderRouteDecorations = useCallback((map: google.maps.Map, legs?: google.maps.DirectionsLeg[]) => {
    clearRouteDecorations();
    const decorations: google.maps.Marker[] = [];
    stops.forEach((stop, index) => {
      decorations.push(new google.maps.Marker({
        map,
        position: { lat: stop.lat, lng: stop.lng },
        label: { text: String(index + 1), color: "#ffffff", fontSize: "12px", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#6351dd", fillOpacity: 1, strokeColor: "#ffffff", strokeOpacity: 1, strokeWeight: 2, scale: 14 },
        zIndex: 20 + index,
      }));
    });
    if (!legs?.length && stops.length > 1) {
      routeFallbackLineRef.current = new google.maps.Polyline({
        map,
        path: stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        strokeColor: "#6351dd",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
    }
    stops.slice(1).forEach((stop, index) => {
      const leg = legs?.[index];
      const previousStop = stops[index];
      const midpoint = leg ? { lat: (leg.start_location.lat() + leg.end_location.lat()) / 2, lng: (leg.start_location.lng() + leg.end_location.lng()) / 2 } : { lat: (previousStop.lat + stop.lat) / 2, lng: (previousStop.lng + stop.lng) / 2 };
      const minutes = leg?.duration?.value ? Math.max(1, Math.round(leg.duration.value / 60)) : estimateRouteMinutes([previousStop, stop], travelMode);
      decorations.push(new google.maps.Marker({
        map,
        position: midpoint,
        label: { text: `${minutes}분`, color: "#6351dd", fontSize: "10px", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#ffffff", fillOpacity: 0.97, strokeColor: "#e8e4f5", strokeOpacity: 1, strokeWeight: 1, scale: 19 },
        clickable: false,
        zIndex: 10 + index,
      }));
    });
    routeDecorationRefs.current = decorations;
  }, [clearRouteDecorations, stops, travelMode]);
  const handleMapReady = useCallback((map: google.maps.Map) => {
    if (stops.length < 2 || !window.google?.maps) return;
    rendererRef.current?.setMap(null);
    clearRouteDecorations();
    setIsRealRoute(false);
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#6351dd", strokeOpacity: 0.9, strokeWeight: 4 },
    });
    rendererRef.current = renderer;
    renderRouteDecorations(map);
    if (stops.length > 25 || (travelMode === "transit" && stops.length > 2)) return;
    const service = new google.maps.DirectionsService();
    service.route({
      origin: { lat: stops[0].lat, lng: stops[0].lng },
      destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
      waypoints: stops.slice(1, -1).map((stop) => ({ location: { lat: stop.lat, lng: stop.lng }, stopover: true })),
      travelMode: google.maps.TravelMode[travelModeMeta[travelMode].googleMode],
      optimizeWaypoints: false,
    }, (result, status) => {
      if (status !== "OK" || !result?.routes[0]) return;
      renderer.setDirections(result);
      const legs = result.routes[0].legs || [];
      renderRouteDecorations(map, legs);
      setSegments(legs.map((leg, index) => ({ from: stops[index]?.name || "출발", to: stops[index + 1]?.name || "다음 장소", minutes: leg.duration?.value ? Math.max(1, Math.round(leg.duration.value / 60)) : fallbackSegments[index]?.minutes || 0, distanceMeters: leg.distance?.value || fallbackSegments[index]?.distanceMeters || 0 })));
      setDuration(Math.round(legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) / 60));
      setDistance(legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000 < 10 ? `${(legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000).toFixed(1)}km` : `${Math.round(legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000)}km`);
      setIsRealRoute(true);
    });
  }, [clearRouteDecorations, fallbackSegments, renderRouteDecorations, stops, travelMode]);
  useEffect(() => () => {
    rendererRef.current?.setMap(null);
    clearRouteDecorations();
  }, [clearRouteDecorations]);

  return <div className={`route-course-route-wrap ${compact ? "compact" : ""}`}><div className="route-course-route-map"><MapView className="route-real-map" initialCenter={stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : undefined} initialZoom={13} onMapReady={handleMapReady} fallback={<RouteMapFallback stops={stops} />} /></div><div className="route-route-meta"><span><MapPin size={13} /> {stops.length}곳 연결</span><span><Clock3 size={13} /> {formatMinutes(duration || fallbackMinutes)}</span><span>{travelModeMeta[travelMode].label}</span>{distance && <span>{distance}</span>}{!isRealRoute && <small>{travelMode === "transit" && stops.length > 2 ? "대중교통 다중 구간은 예상 경로로 안내합니다." : "지도 연결 후 실제 경로로 계산됩니다."}</small>}</div>{segments.length > 0 && <div className="route-leg-summary" role="region" aria-label="장소 간 예상 이동시간">{segments.map((segment, index) => <div key={`${segment.from}-${segment.to}-${index}`}><span>{index + 1} → {index + 2}</span><strong>{formatMinutes(segment.minutes)}</strong><small>{formatDistance(segment.distanceMeters)} · {segment.from}에서 {segment.to}</small></div>)}</div>}</div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const savePlaceMutation = trpc.places.toggleSaved.useMutation();
  const createCourseMutation = trpc.courses.create.useMutation();
  const appendPlaceMutation = trpc.courses.appendPlace.useMutation();
  const updateCourseMutation = trpc.courses.update.useMutation();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const savedPlacesQuery = trpc.places.saved.useQuery(undefined, { enabled: isAuthenticated });
  const myCoursesQuery = trpc.courses.mine.useQuery(undefined, { enabled: isAuthenticated });
  const savedCoursesQuery = trpc.courses.saved.useQuery(undefined, { enabled: isAuthenticated });
  const trpcUtils = trpc.useUtils();
  const [screen, setScreen] = useState<Screen>("map");
  const [selectedTab, setSelectedTab] = useState<Tab>("map");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [sortByDistance, setSortByDistance] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [navigationPlace, setNavigationPlace] = useState<Place | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");
  const [mapPreviewPlace, setMapPreviewPlace] = useState<Place | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course>(publicCourse);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [courseStep, setCourseStep] = useState(1);
  const [courseTitle, setCourseTitle] = useState("서울 데이트 코스");
  const [courseStartDate, setCourseStartDate] = useState("");
  const [courseEndDate, setCourseEndDate] = useState("");
  const [courseStatus, setCourseStatus] = useState<CourseStatus>("planned");
  const [coursePlaces, setCoursePlaces] = useState<Place[]>(mockPlaces);
  const [courseTimes, setCourseTimes] = useState<Record<string, string>>({ p1: "14:00", p2: "15:40", p3: "17:00", p4: "19:00" });
  const [courseCosts, setCourseCosts] = useState<Record<string, string>>({ p1: "10000", p2: "15000", p3: "50000", p4: "0" });
  const [courseItemDays, setCourseItemDays] = useState<Record<string, number>>({ p1: 1, p2: 1, p3: 1, p4: 1 });
  const [courseDurations, setCourseDurations] = useState<Record<string, string>>({ p1: "60", p2: "60", p3: "60", p4: "60" });
  const [courseMemos, setCourseMemos] = useState<Record<string, string>>({});
  const [draggedCourseIndex, setDraggedCourseIndex] = useState<number | null>(null);
  const [activeDetailDay, setActiveDetailDay] = useState(1);
  const [profileName, setProfileName] = useState(user?.name || "여행자");
  const [livePlaces, setLivePlaces] = useState<Place[]>([]);
  const [hasLiveSearch, setHasLiveSearch] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placePredictions, setPlacePredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [mapReadyTick, setMapReadyTick] = useState(0);
  const [sheetMode, setSheetMode] = useState<"expanded" | "peek" | "hidden">("peek");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]") as string[]; } catch { return []; }
  });
  const [isLocationPermissionHelpOpen, setIsLocationPermissionHelpOpen] = useState(false);
  const [coursePickerPlace, setCoursePickerPlace] = useState<Place | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCourseShareOpen, setIsCourseShareOpen] = useState(false);
  const [sharedCourseToken] = useState(() => new URLSearchParams(window.location.search).get("course"));
  const mainMapRef = useRef<google.maps.Map | null>(null);
  const placeMarkerRefs = useRef<google.maps.Marker[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const sheetDragStartRef = useRef<number | null>(null);
  const galleryDragStartRef = useRef<number | null>(null);
  const courseDragStartRef = useRef<number | null>(null);
  const draggedCourseIndexRef = useRef<number | null>(null);
  const selectedCourseId = Number(selectedCourse.id);
  const selectedCourseInput = useMemo(() => ({ courseId: selectedCourseId > 0 ? selectedCourseId : 1 }), [selectedCourseId]);
  const selectedCourseQuery = trpc.courses.get.useQuery(selectedCourseInput, { enabled: isAuthenticated && ["edit-course", "course-detail"].includes(screen) && selectedCourseId > 0 });

  useEffect(() => {
    if (!sharedCourseToken) return;
    const sharedCourseId = Number(sharedCourseToken);
    const sharedPublicCourse = sharedCourseToken === publicCourse.id ? publicCourse : null;
    if (!sharedPublicCourse && (!Number.isInteger(sharedCourseId) || sharedCourseId <= 0)) return;
    setSelectedCourse((current) => current.id === sharedCourseToken ? current : sharedPublicCourse || { id: sharedCourseToken, title: "공유 코스", region: "여행", author: "Route 여행자", image: mockPlaces[0].image, likes: 0, days: 1, items: [] });
    setSelectedTab("friends");
    setScreen("course-detail");
  }, [sharedCourseToken]);

  const savedMapPlaces = useMemo<Place[]>(() => (savedPlacesQuery.data || []).flatMap((place: any) => {
    if (typeof place.lat !== "number" || typeof place.lng !== "number") return [];
    return [{
      id: place.placeId,
      name: place.name,
      category: place.category || "관광지",
      address: place.address || "주소 정보 없음",
      image: place.imageUrl || mockPlaces[0].image,
      description: "내 장소에 저장한 여행 장소입니다.",
      rating: 0,
      reviewCount: 0,
      lat: place.lat,
      lng: place.lng,
      hours: place.hours || "영업시간 확인",
      phone: "",
    }];
  }), [savedPlacesQuery.data]);
  const savedPlaceIds = useMemo(() => new Set((savedPlacesQuery.data || []).map((place: any) => place.placeId)), [savedPlacesQuery.data]);
  const filteredPlaces = useMemo(() => mockPlaces.filter((place) => {
    const matchesQuery = !query.trim() || `${place.name} ${place.category} ${place.address}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "전체" || (filter === "맛집" && place.category === "맛집") || place.category === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query]);
  const mapPlaces = useMemo(() => {
    const source = hasLiveSearch ? livePlaces : [...filteredPlaces, ...savedMapPlaces];
    const filtered = filter === "전체" ? source : source.filter((place) => place.category === filter);
    return filtered.filter((place, index, items) => items.findIndex((candidate) => candidate.id === place.id) === index);
  }, [filter, filteredPlaces, hasLiveSearch, livePlaces, savedMapPlaces]);
  const distanceOrigin = userLocation || DEFAULT_MAP_CENTER;
  const getPlaceDistance = useCallback((place: Place) => distanceInMeters(distanceOrigin, place), [distanceOrigin]);
  const visibleMapPlaces = useMemo(() => {
    const next = mapPlaces.filter((place) => !openNowOnly || place.openNow === true);
    return sortByDistance ? [...next].sort((a, b) => getPlaceDistance(a) - getPlaceDistance(b)) : next;
  }, [getPlaceDistance, mapPlaces, openNowOnly, sortByDistance]);
  const getPlaceDistanceLabel = useCallback((place: Place) => formatDistance(getPlaceDistance(place)), [getPlaceDistance]);
  const focusMapPlace = useCallback((place: Place) => {
    const map = mainMapRef.current;
    if (map) {
      map.panTo({ lat: place.lat, lng: place.lng });
      if ((map.getZoom() || 0) < 16) map.setZoom(16);
    }
    setMapPreviewPlace(place);
    setSheetMode("peek");
  }, []);
  const clearMapMarkers = useCallback(() => {
    placeMarkerRefs.current.forEach((marker) => marker.setMap(null));
    placeMarkerRefs.current = [];
  }, []);
  const syncMapMarkers = useCallback((map: google.maps.Map, places: Place[]) => {
    if (!window.google?.maps) return;
    clearMapMarkers();
    placeMarkerRefs.current = places.map((place, index) => {
      const pinColor = categoryPinColor(place.category);
      const pinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M17 1C8.72 1 2 7.47 2 15.45c0 10.54 15 24.55 15 24.55s15-14.01 15-24.55C32 7.47 25.28 1 17 1Z" fill="${pinColor}" stroke="white" stroke-width="2"/><circle cx="17" cy="15.5" r="5" fill="white" fill-opacity=".96"/></svg>`)}`;
      const marker = new google.maps.Marker({
        map,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        icon: { url: pinSvg, scaledSize: new google.maps.Size(34, 42), anchor: new google.maps.Point(17, 41) },
        zIndex: 10 + index,
      });
      marker.addListener("click", () => {
        focusMapPlace(place);
      });
      return marker;
    });
  }, [clearMapMarkers, focusMapPlace]);
  const handleMainMapReady = useCallback((map: google.maps.Map) => {
    mainMapRef.current = map;
    syncMapMarkers(map, visibleMapPlaces);
    setMapReadyTick((tick) => tick + 1);
  }, [syncMapMarkers, visibleMapPlaces]);
  useEffect(() => {
    if (mainMapRef.current) syncMapMarkers(mainMapRef.current, visibleMapPlaces);
  }, [syncMapMarkers, visibleMapPlaces]);
  useEffect(() => {
    if (mapPreviewPlace && !visibleMapPlaces.some((place) => place.id === mapPreviewPlace.id)) setMapPreviewPlace(visibleMapPlaces[0] || null);
  }, [mapPreviewPlace, visibleMapPlaces]);
  useEffect(() => () => {
    clearMapMarkers();
    currentLocationMarkerRef.current?.setMap(null);
  }, [clearMapMarkers]);
  useEffect(() => {
    const keyword = query.trim();
    if (screen !== "search" || keyword.length < 2 || !window.google?.maps?.places?.AutocompleteService) {
      setPlacePredictions([]);
      return;
    }
    let active = true;
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: keyword, componentRestrictions: { country: "kr" } }, (predictions, status) => {
      if (!active) return;
      setPlacePredictions(status === google.maps.places.PlacesServiceStatus.OK && predictions ? predictions.slice(0, 5) : []);
    });
    return () => { active = false; };
  }, [mapReadyTick, query, screen]);
  const totalCost = coursePlaces.reduce((total, place) => total + (Number(courseCosts[place.id]) || 0), 0);
  const courseDayCount = calculateCourseDayCount(courseStartDate, courseEndDate);
  const totalDurationMinutes = coursePlaces.reduce((total, place) => total + (Number(courseDurations[place.id]) || 60), 0);
  const dayDurationMinutes = useMemo(() => Object.fromEntries(Array.from({ length: courseDayCount }, (_, index) => {
    const day = index + 1;
    return [day, coursePlaces.filter((place) => (courseItemDays[place.id] || 1) === day).reduce((total, place) => total + (Number(courseDurations[place.id]) || 60), 0)];
  })), [courseDayCount, courseDurations, courseItemDays, coursePlaces]);
  const courseScheduleWarnings = useMemo(() => getScheduleWarnings(coursePlaces, courseTimes), [coursePlaces, courseTimes]);
  const courseStops = useMemo<RouteStop[]>(() => coursePlaces.map((place) => ({ name: place.name, lat: place.lat, lng: place.lng })), [coursePlaces]);
  const courseRouteSegments = useMemo(() => estimateRouteSegments(courseStops, travelMode), [courseStops, travelMode]);
  const courseTravelMinutes = useMemo(() => courseRouteSegments.reduce((total, segment) => total + segment.minutes, 0), [courseRouteSegments]);
  const courseTravelDistanceMeters = useMemo(() => courseRouteSegments.reduce((total, segment) => total + segment.distanceMeters, 0), [courseRouteSegments]);
  const navigationOrigin = userLocation || DEFAULT_MAP_CENTER;
  const navigationStops = useMemo<RouteStop[]>(() => navigationPlace ? [{ name: userLocation ? "현재 위치" : "출발 위치 확인 중", lat: navigationOrigin.lat, lng: navigationOrigin.lng }, { name: navigationPlace.name, lat: navigationPlace.lat, lng: navigationPlace.lng }] : [], [navigationOrigin.lat, navigationOrigin.lng, navigationPlace, userLocation]);
  const navigationSegments = useMemo(() => estimateRouteSegments(navigationStops, travelMode), [navigationStops, travelMode]);
  const navigationMinutes = useMemo(() => navigationSegments.reduce((total, segment) => total + segment.minutes, 0), [navigationSegments]);
  const navigationDistanceMeters = useMemo(() => navigationSegments.reduce((total, segment) => total + segment.distanceMeters, 0), [navigationSegments]);
  const recommendedCoursePlaces = useMemo(() => optimizePlacesByDay(coursePlaces, courseItemDays, travelMode), [courseItemDays, coursePlaces, travelMode]);
  const recommendedCourseStops = useMemo<RouteStop[]>(() => recommendedCoursePlaces.map((place) => ({ name: place.name, lat: place.lat, lng: place.lng })), [recommendedCoursePlaces]);
  const recommendedTravelDistanceMeters = useMemo(() => getRouteDistanceMeters(recommendedCourseStops), [recommendedCourseStops]);
  const recommendedTravelMinutes = useMemo(() => estimateRouteSegments(recommendedCourseStops, travelMode).reduce((total, segment) => total + segment.minutes, 0), [recommendedCourseStops, travelMode]);
  const routeRecommendationChanged = useMemo(() => recommendedCoursePlaces.some((place, index) => place.id !== coursePlaces[index]?.id), [coursePlaces, recommendedCoursePlaces]);
  const courseDetailItems = useMemo<CourseItem[]>(() => {
    const detailItems = selectedCourseQuery.data?.items as Array<any> | undefined;
    if (detailItems?.length) return detailItems.map((item) => ({ name: item.name, time: item.visitTime || "10:00", duration: formatTotalDuration(item.durationMinutes || 60), durationMinutes: item.durationMinutes || 60, dayNumber: item.dayNumber || 1, cost: item.estimatedCost || 0, image: item.imageUrl || mockPlaces[0].image, address: item.address || undefined }));
    return selectedCourse.items.map((item) => ({ ...item, durationMinutes: item.durationMinutes || 60, dayNumber: item.dayNumber || 1 }));
  }, [selectedCourse.items, selectedCourseQuery.data]);
  const detailDayNumbers = useMemo(() => Array.from(new Set(courseDetailItems.map((item) => item.dayNumber || 1))).sort((a, b) => a - b), [courseDetailItems]);
  const activeDetailItems = useMemo(() => courseDetailItems.filter((item) => (item.dayNumber || 1) === activeDetailDay), [activeDetailDay, courseDetailItems]);
  const activeDetailDuration = activeDetailItems.reduce((total, item) => total + (item.durationMinutes || 60), 0);
  const selectedCourseStopDetails = useMemo(() => courseDetailItems.map((item, index) => {
    const fallback = mockPlaces.find((place) => place.name.includes(item.name) || item.name.includes(place.name)) || mockPlaces[index % mockPlaces.length];
    return { name: item.name, lat: fallback.lat, lng: fallback.lng, dayNumber: item.dayNumber || 1 };
  }), [courseDetailItems]);
  const selectedCourseStops = useMemo<RouteStop[]>(() => selectedCourseStopDetails.map(({ dayNumber: _dayNumber, ...stop }) => stop), [selectedCourseStopDetails]);
  const activeDetailStops = useMemo<RouteStop[]>(() => selectedCourseStopDetails.filter((stop) => stop.dayNumber === activeDetailDay).map(({ dayNumber: _dayNumber, ...stop }) => stop), [activeDetailDay, selectedCourseStopDetails]);
  const activeDetailSegments = useMemo(() => estimateRouteSegments(activeDetailStops), [activeDetailStops]);
  const activeDetailRouteWarnings = useMemo(() => getRouteEfficiencyWarnings(activeDetailStops), [activeDetailStops]);
  const selectedCourseScheduleWarnings = useMemo(() => {
    const detail = selectedCourseQuery.data;
    if (!detail?.items?.length) return [];
    const detailPlaces = detail.items.map((item: any, index: number) => {
      const fallback = mockPlaces.find((place) => place.id === item.placeId || place.name === item.name) || mockPlaces[index % mockPlaces.length];
      return { ...fallback, id: item.placeId, name: item.name, hours: item.hours || "영업시간 확인" };
    });
    return getScheduleWarnings(detailPlaces, Object.fromEntries(detail.items.map((item: any) => [item.placeId, item.visitTime || "10:00"])));
  }, [selectedCourseQuery.data]);
  useEffect(() => {
    if (detailDayNumbers.length && !detailDayNumbers.includes(activeDetailDay)) setActiveDetailDay(detailDayNumbers[0]);
  }, [activeDetailDay, detailDayNumbers]);
  useEffect(() => {
    const handleNavigatePlace = (event: Event) => {
      const place = (event as CustomEvent<Place>).detail;
      if (!place) return;
      setNavigationPlace(place);
      setScreen("place-navigation");
      if (!userLocation) moveToCurrentLocation();
    };
    window.addEventListener("route:navigate-place", handleNavigatePlace);
    return () => window.removeEventListener("route:navigate-place", handleNavigatePlace);
  }, [userLocation]);
  useEffect(() => {
    const getCourseRows = () => Array.from(document.querySelectorAll<HTMLElement>(".route-draggable-place, .route-edit-place-row"));
    const getCourseRow = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(".route-draggable-place, .route-edit-place-row") : null;
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!(event.target instanceof Element) || !event.target.closest(".route-drag-handle, .route-edit-place-row > b")) return;
      const row = getCourseRow(event.target);
      const index = row ? getCourseRows().indexOf(row) : -1;
      if (index < 0) return;
      row?.classList.add("is-dragging");
      courseDragStartRef.current = index;
      draggedCourseIndexRef.current = index;
      setDraggedCourseIndex(index);
      row?.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const currentIndex = draggedCourseIndexRef.current;
      if (currentIndex === null) return;
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".route-draggable-place, .route-edit-place-row");
      const nextIndex = row ? getCourseRows().indexOf(row) : -1;
      if (nextIndex < 0 || nextIndex === currentIndex) return;
      setCoursePlaces((items) => {
        const next = [...items];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(nextIndex, 0, moved);
        return next;
      });
      draggedCourseIndexRef.current = nextIndex;
      setDraggedCourseIndex(nextIndex);
    };
    const pointerUp = () => {
      courseDragStartRef.current = null;
      draggedCourseIndexRef.current = null;
      getCourseRows().forEach((row) => row.classList.remove("is-dragging"));
      setDraggedCourseIndex(null);
    };
    document.addEventListener("pointerdown", pointerDown);
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerup", pointerUp);
    document.addEventListener("pointercancel", pointerUp);
    return () => {
      document.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerup", pointerUp);
      document.removeEventListener("pointercancel", pointerUp);
    };
  }, [draggedCourseIndex]);

  useEffect(() => {
    const detail = selectedCourseQuery.data;
    if (screen !== "edit-course" || !detail?.items?.length) return;
    const normalizedPlaces = detail.items.map((item: any) => {
      const fallback = mockPlaces.find((place) => place.id === item.placeId || place.name === item.name) || mockPlaces[0];
      return { ...fallback, id: item.placeId, name: item.name, category: item.category || fallback.category, address: item.address || fallback.address, image: item.imageUrl || fallback.image, lat: item.lat || fallback.lat, lng: item.lng || fallback.lng, hours: item.hours || "영업시간 확인" };
    });
    setCoursePlaces(normalizedPlaces);
    setCourseTitle(detail.title);
    setCourseStartDate(toDateInputValue(detail.startDate));
    setCourseEndDate(toDateInputValue(detail.endDate));
    setCourseStatus(detail.status || "planned");
    setCourseTimes(Object.fromEntries(detail.items.map((item: any) => [item.placeId, item.visitTime || "10:00"])));
    setCourseCosts(Object.fromEntries(detail.items.map((item: any) => [item.placeId, String(item.estimatedCost || 0)])));
    setCourseItemDays(Object.fromEntries(detail.items.map((item: any) => [item.placeId, item.dayNumber || 1])));
    setCourseDurations(Object.fromEntries(detail.items.map((item: any) => [item.placeId, String(item.durationMinutes || 60)])));
    setCourseMemos(Object.fromEntries(detail.items.map((item: any) => [item.placeId, item.note || ""])));
  }, [screen, selectedCourseQuery.data]);

  const ownedCourses = useMemo<Course[]>(() => (myCoursesQuery.data || []).map((course: any) => ({ id: String(course.id), title: course.title, region: course.region || "서울", author: user?.name || "나의 Route", image: course.coverImage || mockPlaces[0].image, likes: 0, days: 1, items: [], startDate: course.startDate, endDate: course.endDate, status: course.status || "planned" })), [myCoursesQuery.data, user?.name]);
  const hasDbCourses = ownedCourses.length > 0;
  const courseList = ownedCourses;

  if (loading) return <div className="route-loading">Route를 준비하고 있습니다.</div>;
  if (!isAuthenticated) return <div className="route-login"><div><Compass size={38} /><h1>Route</h1><p>발견한 장소를 저장하고<br />나만의 여행으로 만들어보세요.</p><Button onClick={startLogin}>Manus로 시작하기</Button></div></div>;

  const setTab = (tab: Tab) => {
    setSelectedTab(tab);
    const next: Record<Tab, Screen> = { home: "home", map: "map", courses: "my-courses", friends: "friends", mypage: "mypage" };
    setScreen(next[tab]);
  };
  const hydrateGooglePlaceDetails = (place: Place) => {
    const map = mainMapRef.current;
    if (!map || !window.google?.maps?.places || !place.description.includes("실제 Google Maps 검색 결과")) return;
    const service = new google.maps.places.PlacesService(map);
    service.getDetails({ placeId: place.id, fields: ["name", "formatted_address", "formatted_phone_number", "opening_hours", "photos", "website"] }, (details, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !details) return;
      const photos = details.photos?.slice(0, 5).map((photo) => photo.getUrl({ maxWidth: 1200, maxHeight: 900 })) || [];
      const enriched: Place = {
        ...place,
        name: details.name || place.name,
        address: details.formatted_address || place.address,
        phone: details.formatted_phone_number || place.phone,
        hours: details.opening_hours?.open_now === true ? "현재 영업 중" : details.opening_hours?.open_now === false ? "현재 영업 종료" : place.hours,
        openNow: details.opening_hours?.open_now ?? place.openNow,
        photos: photos.length ? photos : place.photos,
        image: photos[0] || place.image,
        website: details.website || place.website,
      };
      setSelectedPlace((current) => current?.id === place.id ? enriched : current);
      setMapPreviewPlace((current) => current?.id === place.id ? enriched : current);
      setLivePlaces((current) => current.map((item) => item.id === place.id ? enriched : item));
    });
  };
  const openPlace = (place: Place) => { setGalleryIndex(0); setSelectedPlace(place); setScreen("place-detail"); hydrateGooglePlaceDetails(place); };
  const openPlaceNavigation = (place: Place) => {
    setNavigationPlace(place);
    setScreen("place-navigation");
    if (!userLocation) moveToCurrentLocation();
  };
  const openSaveSheet = (place: Place) => { setSelectedPlace(place); setSaveSheetOpen(true); };
  const savePlace = async () => {
    if (!selectedPlace) return;
    try { await savePlaceMutation.mutateAsync({ placeId: selectedPlace.id, name: selectedPlace.name, category: selectedPlace.category, address: selectedPlace.address, imageUrl: selectedPlace.image, lat: selectedPlace.lat, lng: selectedPlace.lng, hours: selectedPlace.hours }); setSaveSheetOpen(false); toast.success("내 장소에 저장했습니다."); } catch { toast.error("저장하지 못했습니다."); }
  };
  const saveCourse = async () => {
    try {
      await createCourseMutation.mutateAsync({ title: courseTitle, region: "서울", coverImage: coursePlaces[0]?.image, startDate: courseStartDate || null, endDate: courseEndDate || null, status: courseStatus, items: coursePlaces.map((place, index) => ({ placeId: place.id, name: place.name, category: place.category, address: place.address, imageUrl: place.image, lat: place.lat, lng: place.lng, hours: place.hours, orderIndex: index, dayNumber: courseItemDays[place.id] || 1, visitTime: courseTimes[place.id] || "10:00", durationMinutes: Number(courseDurations[place.id]) || 60, estimatedCost: Number(courseCosts[place.id]) || 0, note: courseMemos[place.id] })) });
      await trpcUtils.courses.mine.invalidate();
      toast.success("코스를 저장했습니다."); setScreen("my-courses"); setSelectedTab("courses");
    } catch { toast.error("코스를 저장하지 못했습니다."); }
  };
  const saveEditedCourse = async () => {
    const numericCourseId = Number(selectedCourse.id);
    if (!Number.isInteger(numericCourseId) || numericCourseId <= 0) {
      toast.error("먼저 저장된 내 코스를 선택해 주세요.");
      return;
    }
    try {
      await updateCourseMutation.mutateAsync({ courseId: numericCourseId, title: courseTitle, region: selectedCourse.region, coverImage: coursePlaces[0]?.image, startDate: courseStartDate || null, endDate: courseEndDate || null, status: courseStatus, items: coursePlaces.map((place, index) => ({ placeId: place.id, name: place.name, category: place.category, address: place.address, imageUrl: place.image, lat: place.lat, lng: place.lng, hours: place.hours, orderIndex: index, dayNumber: courseItemDays[place.id] || 1, visitTime: courseTimes[place.id] || "10:00", durationMinutes: Number(courseDurations[place.id]) || 60, estimatedCost: Number(courseCosts[place.id]) || 0, note: courseMemos[place.id] })) });
      await trpcUtils.courses.mine.invalidate();
      toast.success("코스 수정 내용을 저장했습니다."); setScreen("my-courses"); setSelectedTab("courses");
    } catch { toast.error("코스 수정 내용을 저장하지 못했습니다."); }
  };

  const sharedCourseTitle = (selectedCourseQuery.data as any)?.title || selectedCourse.title;
  const sharedCourseDateRange = formatCourseDateRange((selectedCourseQuery.data as any)?.startDate || selectedCourse.startDate, (selectedCourseQuery.data as any)?.endDate || selectedCourse.endDate);
  const courseShareLink = `${window.location.origin}${window.location.pathname}?course=${encodeURIComponent(selectedCourse.id)}`;
  const supportsNativeShare = typeof (navigator as Navigator & { share?: unknown }).share === "function";
  const copyCourseShareLink = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(courseShareLink);
      else window.prompt("공유 링크를 복사하세요.", courseShareLink);
      toast.success("코스 공유 링크를 복사했습니다.");
    } catch { toast.error("공유 링크를 복사하지 못했습니다."); }
  };
  const shareCourse = async () => {
    try {
      if (navigator.share) await navigator.share({ title: sharedCourseTitle, text: `${sharedCourseTitle} 여행 코스를 Route에서 확인해보세요.`, url: courseShareLink });
      else await copyCourseShareLink();
    } catch { /* 사용자가 기기 공유 시트를 닫은 경우 별도 알림을 표시하지 않습니다. */ }
  };
  const exportCourseImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return;
    const text = (value: string, max = 27) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
    context.fillStyle = "#F8F7FC";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#6351DD";
    context.fillRect(0, 0, canvas.width, 390);
    context.fillStyle = "rgba(255,255,255,.78)";
    context.font = "700 28px sans-serif";
    context.fillText("ROUTE  ·  TRAVEL ITINERARY", 76, 100);
    context.fillStyle = "#FFFFFF";
    context.font = "700 64px sans-serif";
    context.fillText(text(sharedCourseTitle, 18), 76, 196);
    context.fillStyle = "rgba(255,255,255,.82)";
    context.font = "500 32px sans-serif";
    context.fillText(`${sharedCourseDateRange}  ·  장소 ${courseDetailItems.length}곳`, 76, 258);
    context.fillStyle = "#EDEAFE";
    context.beginPath();
    context.roundRect(76, 300, 360, 58, 29);
    context.fill();
    context.fillStyle = "#4B3D9B";
    context.font = "700 26px sans-serif";
    context.fillText(`총 ${formatTotalDuration(courseDetailItems.reduce((total, item) => total + (item.durationMinutes || 60), 0))}`, 105, 339);
    let y = 480;
    courseDetailItems.slice(0, 6).forEach((item, index) => {
      context.fillStyle = "#FFFFFF";
      context.beginPath();
      context.roundRect(64, y - 48, 952, 122, 24);
      context.fill();
      context.fillStyle = "#6351DD";
      context.beginPath();
      context.arc(112, y + 11, 22, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#FFFFFF";
      context.font = "700 20px sans-serif";
      context.fillText(String(index + 1), 106, y + 18);
      context.fillStyle = "#4B4653";
      context.font = "700 34px sans-serif";
      context.fillText(text(item.name, 28), 160, y + 5);
      context.fillStyle = "#8A8493";
      context.font = "500 24px sans-serif";
      context.fillText(`Day ${item.dayNumber || 1} · ${item.time} · ${formatTotalDuration(item.durationMinutes || 60)}`, 160, y + 45);
      y += 146;
    });
    context.fillStyle = "#807A88";
    context.font = "500 24px sans-serif";
    context.fillText("여행의 동선을 기록하고 나눠보세요 · Route", 76, 1255);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `Route_${sharedCourseTitle.replace(/[\\/:*?\"<>|]/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("코스 이미지를 저장했습니다.");
  };

  const moveCoursePlace = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= coursePlaces.length || toIndex >= coursePlaces.length) return;
    setCoursePlaces((items) => {
      const next = [...items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };
  const applyRouteRecommendation = () => {
    if (!routeRecommendationChanged) {
      toast.message("현재 장소 순서가 추천 동선과 같습니다.");
      return;
    }
    setCoursePlaces(recommendedCoursePlaces);
    const savedDistance = Math.max(0, courseTravelDistanceMeters - recommendedTravelDistanceMeters);
    toast.success(savedDistance > 0 ? `${formatDistance(savedDistance)} 이동을 줄이는 추천 순서를 적용했습니다.` : "추천 순서를 적용했습니다.");
  };
  const handleCoursePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (draggedCourseIndex === null) return;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-course-index]");
    const nextIndex = Number(row?.dataset.courseIndex);
    if (!Number.isInteger(nextIndex) || nextIndex === draggedCourseIndex) return;
    moveCoursePlace(draggedCourseIndex, nextIndex);
    setDraggedCourseIndex(nextIndex);
  };
  const clearCourseDrag = () => {
    courseDragStartRef.current = null;
    setDraggedCourseIndex(null);
  };
  const addPlaceToCourse = (place: Place) => {
    setCoursePlaces((items) => items.some((item) => item.id === place.id) ? items : [...items, place]);
    setCourseItemDays((current) => ({ ...current, [place.id]: current[place.id] || 1 }));
    setCourseDurations((current) => ({ ...current, [place.id]: current[place.id] || "60" }));
    setCourseStep(2);
    setScreen("course-create");
  };
  const addSavedPlaceToCurrentCourse = (place: Place) => {
    if (!savedPlaceIds.has(place.id)) return;
    if (coursePlaces.some((item) => item.id === place.id)) {
      toast.message("이미 현재 여행 코스에 담긴 장소입니다.");
      return;
    }
    setCoursePlaces((items) => [...items, place]);
    toast.success("현재 여행 코스에 장소를 추가했습니다.");
  };
  const openCoursePicker = (place: Place) => {
    setCoursePickerPlace(place);
  };
  const createCourseFromPicker = () => {
    if (!coursePickerPlace) return;
    setCoursePlaces([coursePickerPlace]);
    setCourseTitle(`${coursePickerPlace.name} 여행 코스`);
    setCourseStartDate("");
    setCourseEndDate("");
    setCourseStatus("planned");
    setCourseTimes({ [coursePickerPlace.id]: "10:00" });
    setCourseCosts({ [coursePickerPlace.id]: "0" });
    setCourseItemDays({ [coursePickerPlace.id]: 1 });
    setCourseDurations({ [coursePickerPlace.id]: "60" });
    setCoursePickerPlace(null);
    setCourseStep(1);
    setSelectedTab("courses");
    setScreen("course-create");
  };
  const appendPlaceToOwnedCourse = async (course: Course) => {
    if (!coursePickerPlace) return;
    const courseId = Number(course.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      toast.error("저장된 여행 코스를 선택해 주세요.");
      return;
    }
    try {
      const result = await appendPlaceMutation.mutateAsync({
        courseId,
        place: {
          placeId: coursePickerPlace.id,
          name: coursePickerPlace.name,
          category: coursePickerPlace.category,
          address: coursePickerPlace.address,
          imageUrl: coursePickerPlace.image,
          lat: coursePickerPlace.lat,
          lng: coursePickerPlace.lng,
          hours: coursePickerPlace.hours,
        },
      });
      await trpcUtils.courses.mine.invalidate();
      if (result.added) toast.success(`${course.title}에 장소를 추가했습니다.`);
      else toast.message("이 장소는 이미 선택한 코스에 있습니다.");
      setCoursePickerPlace(null);
    } catch {
      toast.error("코스에 장소를 추가하지 못했습니다.");
    }
  };
  const persistRecentSearches = (items: string[]) => {
    try { window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items)); } catch { /* 저장소 접근이 제한된 환경에서는 현재 세션에만 유지 */ }
  };
  const removeRecentSearch = (term: string) => {
    setRecentSearches((current) => {
      const next = current.filter((item) => item !== term);
      persistRecentSearches(next);
      return next;
    });
  };
  const clearRecentSearches = () => {
    setRecentSearches([]);
    persistRecentSearches([]);
  };
  const categoryFromPlaceTypes = (types?: string[]) => {
    if (types?.some((type) => ["cafe", "bakery", "coffee_shop"].includes(type))) return "카페";
    if (types?.some((type) => ["restaurant", "meal_takeaway", "food"].includes(type))) return "맛집";
    if (types?.some((type) => ["lodging", "hotel"].includes(type))) return "숙소";
    return "관광지";
  };
  const searchPlaces = (keywordOverride = query) => {
    const keyword = keywordOverride.trim();
    if (!keyword) {
      setHasLiveSearch(false);
      setLivePlaces([]);
      setPlacePredictions([]);
      setSheetMode("peek");
      return;
    }
    const map = mainMapRef.current;
    if (!map || !window.google?.maps?.places) {
      toast.error("지도가 준비된 후 다시 검색해주세요.");
      return;
    }
    setPlacesLoading(true);
    setPlacePredictions([]);
    const service = new google.maps.places.PlacesService(map);
    service.textSearch({ query: keyword, location: map.getCenter() || { lat: 37.5446, lng: 127.0557 }, radius: 7000 }, (results, status) => {
      setPlacesLoading(false);
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
        setHasLiveSearch(true);
        setLivePlaces([]);
        setSheetMode("expanded");
        toast.message("검색 결과가 없습니다. 다른 키워드로 검색해보세요.");
        return;
      }
      const normalized = results.slice(0, 12).flatMap((result, index): Place[] => {
        const lat = result.geometry?.location?.lat();
        const lng = result.geometry?.location?.lng();
        if (lat === undefined || lng === undefined) return [];
        return [{
          id: result.place_id || `google-place-${index}`,
          name: result.name || keyword,
          category: categoryFromPlaceTypes(result.types),
          address: result.formatted_address || result.vicinity || "주소 정보 없음",
          image: result.photos?.[0]?.getUrl({ maxWidth: 720, maxHeight: 480 }) || mockPlaces[index % mockPlaces.length].image,
          description: `${result.name || keyword}의 실제 Google Maps 검색 결과입니다.`,
          rating: result.rating || 0,
          reviewCount: result.user_ratings_total || 0,
          lat,
          lng,
          hours: result.opening_hours?.open_now === true ? "현재 영업 중" : result.opening_hours?.open_now === false ? "현재 영업 종료" : "영업시간은 Google Maps에서 확인",
          phone: "",
          photos: result.photos?.slice(0, 3).map((photo) => photo.getUrl({ maxWidth: 720, maxHeight: 480 })) || [],
          openNow: result.opening_hours?.open_now,
        }];
      });
      setHasLiveSearch(true);
      setLivePlaces(normalized);
      setMapPreviewPlace(normalized[0] || null);
      setSheetMode("expanded");
      setRecentSearches((current) => {
        const next = [keyword, ...current.filter((item) => item !== keyword)].slice(0, 6);
        persistRecentSearches(next);
        return next;
      });
      if (normalized.length === 1) map.panTo({ lat: normalized[0].lat, lng: normalized[0].lng });
      else if (normalized.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        normalized.forEach((place) => bounds.extend({ lat: place.lat, lng: place.lng }));
        map.fitBounds(bounds, 48);
      }
    });
  };
  const choosePrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    setQuery(prediction.description);
    setPlacePredictions([]);
    searchPlaces(prediction.description);
  };
  const moveToCurrentLocation = () => {
    const map = mainMapRef.current;
    if (!map) {
      toast.message("지도를 불러오는 중입니다.");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("이 브라우저에서는 현재 위치를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const location = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(location);
      map.panTo(location);
      map.setZoom(15);
      currentLocationMarkerRef.current?.setMap(null);
      currentLocationMarkerRef.current = new google.maps.Marker({
        map,
        position: location,
        title: "현재 위치",
        icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#2f80ed", fillOpacity: 1, strokeColor: "#ffffff", strokeOpacity: 1, strokeWeight: 3, scale: 9 },
        zIndex: 99,
      });
      toast.success("현재 위치로 이동했습니다.");
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) setIsLocationPermissionHelpOpen(true);
      else toast.error("현재 위치를 가져오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  const handleSheetPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    sheetDragStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleSheetPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (sheetDragStartRef.current === null) return;
    const distance = event.clientY - sheetDragStartRef.current;
    sheetDragStartRef.current = null;
    if (distance < -40) setSheetMode("expanded");
    else if (distance > 55) setSheetMode((mode) => mode === "expanded" ? "peek" : "hidden");
  };
  const renderDiscoveryControls = () => <div className="route-discovery-controls"><button className={sortByDistance ? "active" : ""} onClick={() => setSortByDistance((value) => !value)}><ArrowUpDown size={14} /> 거리순 {sortByDistance ? "ON" : ""}</button><button className={openNowOnly ? "active" : ""} onClick={() => setOpenNowOnly((value) => !value)}><Clock3 size={14} /> 영업 중</button></div>;
  const renderScheduleWarnings = (warnings = courseScheduleWarnings) => <>{screen === "course-create" && courseStep >= 3 && <><section className="route-duration-summary"><div><Clock3 size={17} /><span><small>전체 예상 소요시간</small><strong>{formatTotalDuration(totalDurationMinutes)}</strong></span></div><div>{Array.from({ length: courseDayCount }, (_, index) => <span key={index + 1}>Day {index + 1} · {formatTotalDuration(dayDurationMinutes[index + 1] || 0)}</span>)}</div></section>{courseStep === 3 && <section className="route-course-day-planner"><div><span>DAY PLANNING</span><h3>일차와 체류시간</h3></div>{coursePlaces.map((place) => <div key={place.id}><strong>{place.name}</strong>{renderPlanningFields(place)}</div>)}</section>}</>}{warnings.length > 0 && <section className="route-schedule-warnings" aria-label="일정 경고"><div><AlertTriangle size={17} /><span><strong>일정 확인이 필요해요</strong><small>방문 시간과 장소 영업시간을 다시 확인하세요.</small></span></div>{warnings.slice(0, 3).map((warning) => <p key={`${warning.placeId}-${warning.message}`}>{warning.message}</p>)}</section>}</>;
  const renderPlanningFields = (place: Place) => <div className="route-planning-fields"><label>일차<select aria-label={`${place.name} 일차`} value={courseItemDays[place.id] || 1} onChange={(event) => setCourseItemDays((current) => ({ ...current, [place.id]: Number(event.target.value) }))}>{Array.from({ length: courseDayCount }, (_, index) => <option key={index + 1} value={index + 1}>Day {index + 1}</option>)}</select></label><label>체류 시간<select aria-label={`${place.name} 체류 시간`} value={courseDurations[place.id] || "60"} onChange={(event) => setCourseDurations((current) => ({ ...current, [place.id]: event.target.value }))}>{[30, 60, 90, 120, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{formatTotalDuration(minutes)}</option>)}</select></label></div>;
  const renderDurationSummary = () => <><section className="route-duration-summary"><div><Clock3 size={17} /><span><small>전체 예상 소요시간</small><strong>{formatTotalDuration(totalDurationMinutes)}</strong></span></div><div>{Array.from({ length: courseDayCount }, (_, index) => <span key={index + 1}>Day {index + 1} · {formatTotalDuration(dayDurationMinutes[index + 1] || 0)}</span>)}</div></section>{renderCourseTravelSummary()}{screen === "edit-course" && <><CourseRouteMap key={`edit-course-route-${coursePlaces.map((place) => place.id).join("-")}`} stops={courseStops} compact />{renderRouteRecommendation()}</>}</>;
  const renderTravelModeSelector = () => <section className="route-travel-mode-selector" aria-label="이동 수단 선택"><div><span>TRAVEL MODE</span><strong>이동 수단</strong></div><div role="radiogroup" aria-label="코스 이동 수단">{(Object.keys(travelModeMeta) as TravelMode[]).map((mode) => { const Icon = travelModeMeta[mode].icon; return <button key={mode} role="radio" aria-checked={travelMode === mode} className={travelMode === mode ? "active" : ""} onClick={() => setTravelMode(mode)}><Icon size={15} />{travelModeMeta[mode].label}</button>; })}</div></section>;
  const renderCourseTravelSummary = () => coursePlaces.length > 1 ? <><>{renderTravelModeSelector()}</><section className="route-course-travel-summary" aria-live="polite" aria-label="순서 변경에 따른 예상 이동시간"><div className="route-course-travel-heading"><div><Navigation size={17} /><span><small>{travelModeMeta[travelMode].summary} · 현재 순서 예상 이동</small><strong>{formatMinutes(courseTravelMinutes)} · {formatDistance(courseTravelDistanceMeters)}</strong></span></div><small>장소 순서를 바꾸면 즉시 갱신됩니다.</small></div>{courseRouteSegments.map((segment, index) => <div className="route-course-travel-leg" key={`${segment.from}-${segment.to}-${index}`}><span>{index + 1} → {index + 2}</span><strong>{formatMinutes(segment.minutes)}</strong><small>{formatDistance(segment.distanceMeters)} · {segment.from}에서 {segment.to}</small></div>)}</section></> : null;
  const renderRouteRecommendation = () => coursePlaces.length > 2 ? <section className="route-optimization-card" aria-label="효율 경로 추천"><div className="route-optimization-heading"><span className="route-optimization-icon"><WandSparkles size={17} /></span><div><span>ROUTE RECOMMENDATION</span><h3>이동이 적은 순서를 추천해요</h3></div></div>{routeRecommendationChanged ? <><p>현재 순서보다 <strong>{formatDistance(Math.max(0, courseTravelDistanceMeters - recommendedTravelDistanceMeters))}</strong>, 약 <strong>{Math.max(0, courseTravelMinutes - recommendedTravelMinutes)}분</strong> 이동을 줄일 수 있어요.</p><div className="route-optimization-order">{recommendedCoursePlaces.map((place, index) => <span key={place.id}><b>{index + 1}</b>{place.name}</span>)}</div><button onClick={applyRouteRecommendation}><WandSparkles size={15} /> 추천 순서 적용</button></> : <p className="is-current"><Navigation size={15} /> 현재 순서가 추천 동선과 같습니다.</p>}</section> : null;
  const renderCourseMapPlanner = () => coursePlaces.length > 1 ? <section className="route-course-map-planner"><CourseRouteMap key={`draft-course-route-${coursePlaces.map((place) => place.id).join("-")}`} stops={courseStops} compact />{renderCourseTravelSummary()}{renderRouteRecommendation()}</section> : null;
  const renderMap = (compact = false, enablePlacePreview = false) => <div className={`${compact ? "route-map-box compact" : "route-map-box"} route-map-box-with-fallback`}><MapView className="route-real-map" initialCenter={DEFAULT_MAP_CENTER} initialZoom={15} onMapReady={enablePlacePreview ? handleMainMapReady : undefined} fallback={<MapFallback markers={enablePlacePreview ? visibleMapPlaces : filteredPlaces} selectedId={enablePlacePreview ? mapPreviewPlace?.id : undefined} onSelect={enablePlacePreview ? (place) => { setMapPreviewPlace(place); setSheetMode("peek"); } : undefined} />}/>{enablePlacePreview && <><div className="route-map-floating-controls"><button aria-label="현재 위치" onClick={moveToCurrentLocation}><LocateFixed size={18} /></button><button aria-label="장소 검색" onClick={() => setScreen("search")}><SlidersHorizontal size={18} /></button></div>{mapPreviewPlace && sheetMode !== "hidden" && <motion.div className="route-map-place-preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}><button className="route-map-place-preview-main" onClick={() => openPlace(mapPreviewPlace)}><img src={mapPreviewPlace.image} alt={`${mapPreviewPlace.name} 대표 사진`} /><span><small>{mapPreviewPlace.category}</small><strong>{mapPreviewPlace.name}</strong><em>★ {mapPreviewPlace.rating || "평점 정보 없음"} · {getPlaceDistanceLabel(mapPreviewPlace)}</em></span><ChevronRight size={17} /></button><div className="route-map-place-preview-actions"><button onClick={() => openSaveSheet(mapPreviewPlace)}><Bookmark size={15} /> 저장</button><button aria-label={`${mapPreviewPlace.name} 길찾기`} onClick={() => openPlaceNavigation(mapPreviewPlace)}><Navigation size={15} /> 길찾기</button><button onClick={() => openCoursePicker(mapPreviewPlace)}><Plus size={15} /> 코스 선택</button>{savedPlaceIds.has(mapPreviewPlace.id) && <button className="route-map-current-course-add" onClick={() => addSavedPlaceToCurrentCourse(mapPreviewPlace)}><Plus size={15} /> {coursePlaces.some((place) => place.id === mapPreviewPlace.id) ? "현재 코스에 담김" : "현재 코스에 담기"}</button>}</div></motion.div>}</>}{compact && screen === "course-create" && courseStep === 2 && <section className="route-course-map-planner"><CourseRouteMap key={`draft-course-route-${coursePlaces.map((place) => place.id).join("-")}`} stops={courseStops} compact />{renderCourseTravelSummary()}{renderRouteRecommendation()}</section>}</div>;

  const renderLocationPermissionHelp = () => <Dialog open={isLocationPermissionHelpOpen} onOpenChange={setIsLocationPermissionHelpOpen}><DialogContent className="route-location-permission-dialog"><DialogHeader><DialogTitle>현재 위치 권한이 필요합니다</DialogTitle><DialogDescription>주변 장소와 거리를 정확히 보여주려면 위치 접근을 허용해 주세요.</DialogDescription></DialogHeader><div className="route-location-permission-steps"><div><b>1</b><span>브라우저 주소창 왼쪽의 자물쇠 또는 사이트 정보 아이콘을 누르세요.</span></div><div><b>2</b><span><strong>위치</strong> 권한을 <strong>허용</strong>으로 변경한 뒤 Route를 새로고침하세요.</span></div><div><b>3</b><span>모바일에서는 기기 설정의 앱 권한에서 위치 접근을 허용할 수 있습니다.</span></div></div><DialogFooter><button className="route-dialog-secondary" onClick={() => setIsLocationPermissionHelpOpen(false)}>나중에</button><button className="route-dialog-primary" onClick={() => { setIsLocationPermissionHelpOpen(false); moveToCurrentLocation(); }}>다시 시도</button></DialogFooter></DialogContent></Dialog>;
  const renderCourseShareSheet = () => isCourseShareOpen && <div className="route-overlay route-course-share-overlay" onClick={() => setIsCourseShareOpen(false)}><section className="route-course-share-sheet" aria-label="코스 공유" onClick={(event) => event.stopPropagation()}><div className="route-sheet-handle" /><div className="route-course-share-heading"><div><span>SHARE THIS ROUTE</span><h3>{sharedCourseTitle}</h3><p>여행 일정을 링크나 이미지로 친구에게 전달하세요.</p></div><button aria-label="코스 공유 닫기" onClick={() => setIsCourseShareOpen(false)}><X size={17} /></button></div><button aria-label="공유 링크 복사" onClick={() => void copyCourseShareLink()}><span className="link"><Link2 size={19} /></span><div><strong>공유 링크 복사</strong><small>친구에게 바로 보낼 수 있는 코스 링크입니다.</small></div><Copy size={16} /></button><button aria-label="코스 이미지 저장" onClick={exportCourseImage}><span className="image"><Download size={19} /></span><div><strong>코스 이미지 저장</strong><small>한 장의 여행 일정 이미지로 저장합니다.</small></div><ChevronRight size={16} /></button>{supportsNativeShare && <button aria-label="기기 공유" onClick={() => void shareCourse()}><span className="native"><Share2 size={19} /></span><div><strong>다른 앱으로 공유</strong><small>설치된 메신저나 SNS를 선택할 수 있습니다.</small></div><ChevronRight size={16} /></button>}</section></div>;

  const renderCoursePicker = () => coursePickerPlace && <div className="route-overlay route-course-picker-overlay" onClick={() => setCoursePickerPlace(null)}><div className="route-course-picker" onClick={(event) => event.stopPropagation()}><div className="route-sheet-handle" /><div className="route-course-picker-heading"><div><span>ADD TO TRIP</span><h3>{coursePickerPlace.name}</h3><p>추가할 여행 코스를 선택하세요.</p></div><button aria-label="코스 선택 닫기" onClick={() => setCoursePickerPlace(null)}><X size={17} /></button></div><button className="route-course-picker-create" onClick={createCourseFromPicker}><span><Plus size={18} /></span><div><strong>새 코스 만들기</strong><small>이 장소부터 새 여행을 시작합니다.</small></div><ChevronRight size={16} /></button>{courseList.length ? <div className="route-course-picker-list"><p>내 여행 코스</p>{courseList.map((course) => <button key={course.id} onClick={() => void appendPlaceToOwnedCourse(course)} disabled={appendPlaceMutation.isPending}><img src={course.image} alt="" /><span><strong>{course.title}</strong><small>{courseStatusLabel[course.status || "planned"]} · {formatCourseDateRange(course.startDate, course.endDate)}</small></span><Plus size={16} /></button>)}</div> : <div className="route-course-picker-empty"><Calendar size={19} /><span><strong>선택할 저장 코스가 없습니다.</strong><small>새 코스를 만들어 이 장소부터 일정에 담아보세요.</small></span></div>}<button className="route-course-picker-cancel" onClick={() => setCoursePickerPlace(null)}>취소</button></div></div>;
  const renderMapScreen = () => <div className={`route-screen route-map-screen sheet-${sheetMode}`}>
    <button className="route-map-search" onClick={() => setScreen("search")} aria-label="장소 검색"><Search size={17} /><span>{query || "장소를 검색해보세요"}</span><ChevronRight size={15} /></button>
    <div className="route-filter-row">{["전체", "맛집", "카페", "관광지", "숙소"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {renderMap(false, true)}
    {sheetMode !== "hidden" && <div className={`route-map-sheet is-${sheetMode}`}><div className="route-sheet-drag-zone" onPointerDown={handleSheetPointerDown} onPointerUp={handleSheetPointerUp}><div className="route-sheet-handle" /></div><div className="route-sheet-title"><strong>{hasLiveSearch ? "검색 결과" : "주변 장소"}</strong><span>{visibleMapPlaces.length}곳</span></div>{renderDiscoveryControls()}{mapPreviewPlace && sheetMode === "expanded" && <section className="route-sheet-place-glance"><div className="route-sheet-place-glance-heading"><span>선택한 장소</span><button onClick={() => openPlace(mapPreviewPlace)}>상세 보기 <ChevronRight size={13} /></button></div><div className="route-sheet-hours"><Clock3 size={16} /><span><small>영업시간</small><strong>{mapPreviewPlace.hours}</strong></span></div><div className="route-sheet-photo-strip">{getPlacePhotos(mapPreviewPlace).slice(0, 3).map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${mapPreviewPlace.name} 사진 ${index + 1}`} />)}</div><button className="route-sheet-photo-more" onClick={() => openPlace(mapPreviewPlace)}>사진 {getPlacePhotos(mapPreviewPlace).length}장과 상세 정보 보기 <ChevronRight size={14} /></button></section>}{placesLoading ? <div className="route-empty"><Search size={20} /><strong>장소를 찾고 있습니다</strong><span>Google Maps 검색 결과를 불러오는 중입니다.</span></div> : visibleMapPlaces.length ? (sheetMode === "expanded" ? visibleMapPlaces : visibleMapPlaces.slice(0, 3)).map((place) => <PlaceRow key={place.id} place={place} distanceLabel={getPlaceDistanceLabel(place)} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />) : <div className="route-empty"><Search size={20} /><strong>{openNowOnly ? "현재 영업 중인 장소가 없습니다" : "검색 결과가 없습니다"}</strong><span>필터를 해제하거나 다른 키워드로 찾아보세요.</span></div>}</div>}
  </div>;

  const renderSearchScreen = () => <div className="route-screen route-search-screen"><ScreenHeader title="장소 검색" onBack={() => setScreen("map")} /><div className="route-search-composer"><div className="route-search-input"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchPlaces(); }} placeholder="성수 맛집" /><button aria-label="검색" onClick={() => searchPlaces()}>{placesLoading ? "…" : <Search size={15} />}</button><button aria-label="입력 지우기" onClick={() => { setQuery(""); setHasLiveSearch(false); setLivePlaces([]); setPlacePredictions([]); }}><X size={15} /></button></div>{placePredictions.length > 0 && <div className="route-autocomplete-list">{placePredictions.map((prediction) => <button key={prediction.place_id} onClick={() => choosePrediction(prediction)}><MapPin size={15} /><span><strong>{prediction.structured_formatting.main_text}</strong><small>{prediction.structured_formatting.secondary_text || prediction.description}</small></span><ChevronRight size={15} /></button>)}</div>}{!query.trim() && !hasLiveSearch && recentSearches.length > 0 && <section className="route-recent-searches"><div className="route-recent-searches-heading"><div><span>RECENT</span><h2>최근 검색어</h2></div><button aria-label="최근 검색어 전체 삭제" onClick={clearRecentSearches}>전체 삭제</button></div>{recentSearches.map((term) => <div className="route-recent-search-row" key={term}><button className="route-recent-search-run" onClick={() => { setQuery(term); searchPlaces(term); }}><Clock3 size={15} /><span>{term}</span><ChevronRight size={15} /></button><button className="route-recent-search-delete" aria-label={`${term} 삭제`} onClick={() => removeRecentSearch(term)}><X size={14} /></button></div>)}</section>}</div><div className="route-filter-row inner">{["전체", "맛집", "카페", "관광지", "숙소"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>{renderDiscoveryControls()}{renderMap(true, true)}<div className="route-search-list">{visibleMapPlaces.map((place) => <PlaceRow key={place.id} place={place} distanceLabel={getPlaceDistanceLabel(place)} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />)}</div></div>;

  const renderPlaceDetail = () => selectedPlace && <div className="route-screen route-detail-screen"><div className="route-detail-map">{renderMap(true)}<button className="route-floating-back" onClick={() => setScreen("map")}><ArrowLeft size={18} /></button><button className="route-floating-share"><Share2 size={16} /></button></div><div className="route-place-detail-card"><div className="route-detail-images">{getPlacePhotos(selectedPlace).slice(0, 3).map((photo, index) => <button key={`${photo}-${index}`} aria-label={`${selectedPlace.name} 사진 ${index + 1} 확대`} onClick={() => { setGalleryIndex(index); setIsGalleryOpen(true); }}><img src={photo} alt={`${selectedPlace.name} 사진 ${index + 1}`} />{index === 2 && getPlacePhotos(selectedPlace).length > 3 && <span>+{getPlacePhotos(selectedPlace).length - 3}</span>}</button>)}</div><div className="route-detail-body"><div className="route-detail-title-row"><div><h2>{selectedPlace.name}</h2><p>★ {selectedPlace.rating} ({selectedPlace.reviewCount}) · {selectedPlace.category}</p></div><button onClick={() => openSaveSheet(selectedPlace)}><Bookmark size={18} /></button></div><p className="route-detail-description">{selectedPlace.description}</p><p><MapPin size={14} /> {selectedPlace.address}</p><p><Clock3 size={14} /> {selectedPlace.hours}</p><p><Users size={14} /> {selectedPlace.phone}</p><a className="route-naver-link" href={naverReservationUrl(selectedPlace)} target="_blank" rel="noreferrer"><ExternalLink size={15} /><span><strong>{naverReservationLabel(selectedPlace)}</strong><small>{selectedPlace.website ? "실제 네이버 예약·플레이스 페이지로 이동합니다." : "네이버 검색 결과에서 예약·문의 가능 여부를 확인합니다."}</small></span><ChevronRight size={15} /></a><a className="route-naver-sub-link" href={naverMapSearchUrl(selectedPlace)} target="_blank" rel="noreferrer">네이버 지도에서 장소만 검색하기 <ChevronRight size={13} /></a></div><div className="route-detail-actions"><button className="secondary" onClick={() => openSaveSheet(selectedPlace)}>저장</button><button onClick={() => openCoursePicker(selectedPlace)}>코스 선택</button></div></div>{saveSheetOpen && renderSaveSheet()}</div>;

  const renderPlaceDetailWithNavigation = () => <>{renderPlaceDetail()}{selectedPlace && <button className="route-place-navigation-fab" aria-label={`${selectedPlace.name} 길찾기`} onClick={() => openPlaceNavigation(selectedPlace)}><Navigation size={17} />길찾기</button>}</>;
  const renderPlaceNavigation = () => {
    if (!navigationPlace) return <div className="route-screen route-empty"><ScreenHeader title="길찾기" onBack={() => setScreen("map")} /><strong>목적지를 선택해 주세요.</strong></div>;
    const Icon = travelModeMeta[travelMode].icon;
    return <div className="route-screen route-place-navigation"><ScreenHeader title="길찾기" onBack={() => setScreen(selectedPlace ? "place-detail" : "map")} /><section className="route-navigation-destination"><div className="route-navigation-origin"><LocateFixed size={15} /><span><small>출발</small><strong>{userLocation ? "현재 위치" : "현재 위치 확인 중"}</strong></span></div><div className="route-navigation-line" /><div className="route-navigation-arrival"><MapPin size={16} /><span><small>도착</small><strong>{navigationPlace.name}</strong><em>{navigationPlace.address}</em></span></div></section>{renderTravelModeSelector()}<CourseRouteMap key={`place-navigation-${navigationPlace.id}-${travelMode}`} stops={navigationStops} travelMode={travelMode} /><section className="route-navigation-summary"><Icon size={20} /><div><small>{travelModeMeta[travelMode].summary}</small><strong>{formatMinutes(navigationMinutes)} · {formatDistance(navigationDistanceMeters)}</strong><span>{userLocation ? "현재 위치에서 목적지까지의 예상 이동입니다." : "현재 위치 권한을 허용하면 출발지 기준으로 정확해집니다."}</span></div></section><section className="route-external-navigation" aria-label="외부 네비게이션 열기"><div><span>OPEN NAVIGATION</span><h3>원하는 지도 앱에서 출발하세요</h3></div><a href={googleNavigationUrl(navigationPlace, travelMode, userLocation)} target="_blank" rel="noreferrer"><span className="google">G</span><div><strong>Google Maps</strong><small>{travelModeMeta[travelMode].label} 길찾기 열기</small></div><ExternalLink size={16} /></a><a href={naverNavigationUrl(navigationPlace, userLocation)}><span className="naver">N</span><div><strong>네이버지도</strong><small>현재 위치에서 네비게이션 시작</small></div><ExternalLink size={16} /></a><a href={kakaoNavigationUrl(navigationPlace)} target="_blank" rel="noreferrer"><span className="kakao">K</span><div><strong>카카오맵</strong><small>목적지 길찾기 열기</small></div><ExternalLink size={16} /></a></section></div>;
  };

  const renderSaveSheet = () => <div className="route-overlay" onClick={() => setSaveSheetOpen(false)}><div className="route-save-sheet" onClick={(event) => event.stopPropagation()}><div className="route-sheet-handle" /><h3>다음 중 선택하세요</h3><button onClick={savePlace}><Bookmark size={20} /><span><strong>내 장소에 저장</strong><small>나중에 다시 확인할 장소를 저장합니다.</small></span><ChevronRight size={16} /></button><button onClick={() => { if (!selectedPlace) return; setSaveSheetOpen(false); openCoursePicker(selectedPlace); }}><Plus size={20} /><span><strong>코스 선택 또는 새 코스</strong><small>여러 여행 코스 중 선택하거나 새로 만듭니다.</small></span><ChevronRight size={16} /></button><button className="cancel" onClick={() => setSaveSheetOpen(false)}>취소</button></div></div>;
  const renderPhotoGallery = () => {
    if (!selectedPlace || !isGalleryOpen) return null;
    const photos = getPlacePhotos(selectedPlace);
    const showPhoto = (offset: number) => setGalleryIndex((current) => (current + offset + photos.length) % photos.length);
    return <div className="route-photo-gallery-overlay" role="dialog" aria-modal="true" aria-label={`${selectedPlace.name} 사진 갤러리`} onClick={() => setIsGalleryOpen(false)}><div className="route-photo-gallery" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { galleryDragStartRef.current = event.clientX; }} onPointerUp={(event) => { if (galleryDragStartRef.current === null) return; const distance = event.clientX - galleryDragStartRef.current; galleryDragStartRef.current = null; if (distance < -40) showPhoto(1); else if (distance > 40) showPhoto(-1); }}><div className="route-photo-gallery-topbar"><span>{galleryIndex + 1} / {photos.length}</span><button aria-label="사진 갤러리 닫기" onClick={() => setIsGalleryOpen(false)}><X size={20} /></button></div><img src={photos[galleryIndex]} alt={`${selectedPlace.name} 사진 ${galleryIndex + 1}`} /><button className="route-photo-gallery-nav previous" aria-label="이전 사진" disabled={photos.length < 2} onClick={() => showPhoto(-1)}><ChevronRight size={22} /></button><button className="route-photo-gallery-nav next" aria-label="다음 사진" disabled={photos.length < 2} onClick={() => showPhoto(1)}><ChevronRight size={22} /></button><div className="route-photo-gallery-dots">{photos.map((photo, index) => <button key={`${photo}-${index}`} aria-label={`${index + 1}번 사진`} className={index === galleryIndex ? "active" : ""} onClick={() => setGalleryIndex(index)} />)}</div></div></div>;
  };

  const renderMyPlaces = () => <div className="route-screen route-list-screen"><ScreenHeader title="내 장소" onBack={() => setScreen("map")} right={<button><MoreHorizontal size={18} /></button>} /><div className="route-list-tabs"><button className="active">전체</button><button>맛집</button><button>카페</button><button>관광지</button></div><div className="route-list-content">{(savedPlacesQuery.data?.length ? savedPlacesQuery.data : mockPlaces).map((place: any) => <PlaceRow key={place.id} place={{ ...place, image: place.imageUrl || place.image, rating: place.rating || 4.6, reviewCount: place.reviewCount || 0, hours: place.hours || "영업시간 확인", phone: place.phone || "" }} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />)}</div></div>;

  const renderMyCourses = () => <div className="route-screen route-list-screen"><ScreenHeader title="내 코스" onBack={() => setTab("map")} right={<button className="route-header-add" onClick={() => { setCourseStep(1); setScreen("course-create"); }}>+ 새 코스</button>} /><div className="route-list-tabs"><button className="active">내 코스</button><button>저장 코스</button></div><div className="route-course-list">{courseList.length ? courseList.map((course) => <div className="route-large-course-card" key={course.id}><button className="route-course-card-main" onClick={() => { setSelectedCourse(course); setScreen("course-detail"); }}><img src={course.image} alt="" /><span><em className={`route-course-status ${course.status || "planned"}`}>{courseStatusLabel[course.status || "planned"]}</em><strong>{course.title}</strong><small>{formatCourseDateRange(course.startDate, course.endDate)} · 장소 {course.items.length}곳</small></span><ChevronRight size={16} /></button>{hasDbCourses && <button className="route-course-edit-button" aria-label="코스 수정" onClick={() => { setSelectedCourse(course); setCourseTitle(course.title); setCourseStartDate(toDateInputValue(course.startDate)); setCourseEndDate(toDateInputValue(course.endDate)); setCourseStatus(course.status || "planned"); setCoursePlaces(mockPlaces); setCourseStep(1); setScreen("edit-course"); }}><Pencil size={15} /></button>}</div>) : <div className="route-empty"><Calendar size={22} /><strong>저장된 내 코스가 없습니다</strong><span>새 코스를 만들어 여행 일정을 기록해보세요.</span></div>}</div></div>;

  const renderEditCourse = () => <div className="route-screen route-course-create"><ScreenHeader title="내 버전 코스" onBack={() => setScreen("my-courses")} right={<span>수정</span>} /><div className="route-create-step"><h2>코스 정보를 수정하세요</h2><p>여행 기간·상태와 장소별 Day, 체류시간, 방문 순서를 관리할 수 있습니다.</p><label className="route-edit-label">코스 이름<Input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} /></label><div className="route-course-lifecycle-fields"><label>시작일<input type="date" value={courseStartDate} onChange={(event) => setCourseStartDate(event.target.value)} /></label><label>종료일<input type="date" value={courseEndDate} min={courseStartDate || undefined} onChange={(event) => setCourseEndDate(event.target.value)} /></label><label>여행 상태<select value={courseStatus} onChange={(event) => setCourseStatus(event.target.value as CourseStatus)}><option value="planned">예정</option><option value="active">진행 중</option><option value="completed">완료</option></select></label></div>{renderDurationSummary()}{renderScheduleWarnings()}<div className="route-edit-place-list"><h3>일정 장소 {coursePlaces.length}곳</h3>{coursePlaces.map((place, index) => <div className="route-edit-place-block" key={place.id}><div className="route-edit-place-row"><b>{index + 1}</b><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>{place.address}</small></span><div className="route-edit-place-actions"><button disabled={index === 0} onClick={() => setCoursePlaces((items) => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</button><button disabled={index === coursePlaces.length - 1} onClick={() => setCoursePlaces((items) => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}>↓</button></div></div><div className="route-edit-fields">{renderPlanningFields(place)}<label>방문 시간<input type="time" value={courseTimes[place.id] || "10:00"} onChange={(event) => setCourseTimes((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label>예상 비용<input type="number" value={courseCosts[place.id] || "0"} onChange={(event) => setCourseCosts((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label className="memo">메모<textarea value={courseMemos[place.id] || ""} onChange={(event) => setCourseMemos((current) => ({ ...current, [place.id]: event.target.value }))} placeholder="이 장소에 대한 메모" /></label></div></div>)}</div></div><div className="route-bottom-action"><button className="secondary" onClick={() => setScreen("my-courses")}>취소</button><button onClick={() => void saveEditedCourse()} disabled={updateCourseMutation.isPending}>저장하기</button></div></div>;

  const renderCourseCreate = () => <div className="route-screen route-course-create"><ScreenHeader title="코스 만들기" onBack={() => courseStep > 1 ? setCourseStep(courseStep - 1) : setScreen("map")} right={<span>{courseStep}/4</span>} /><StepIndicator step={courseStep} />{courseStep === 1 && <div className="route-create-step route-create-name"><Compass size={34} className="route-step-icon" /><h2>코스 정보를 정해주세요</h2><Input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} placeholder="서울 데이트 코스" /><div className="route-course-lifecycle-fields"><label>시작일<input type="date" value={courseStartDate} onChange={(event) => setCourseStartDate(event.target.value)} /></label><label>종료일<input type="date" value={courseEndDate} min={courseStartDate || undefined} onChange={(event) => setCourseEndDate(event.target.value)} /></label><label>여행 상태<select value={courseStatus} onChange={(event) => setCourseStatus(event.target.value as CourseStatus)}><option value="planned">예정</option><option value="active">진행 중</option><option value="completed">완료</option></select></label></div><small>예) 부산 1박 2일 여행, 제주 힐링 코스</small></div>}{courseStep === 2 && <div className="route-create-step"><h2>장소 추가하기</h2><p>지도에서 장소를 검색하거나 내 장소에서 추가해보세요.</p><div className="route-inline-search"><Search size={15} /><input placeholder="장소 검색" onChange={(event) => setQuery(event.target.value)} /></div>{renderMap(true)}{renderCourseMapPlanner()}<div className="route-added-places"><strong>추가한 장소 {coursePlaces.length}</strong>{coursePlaces.slice(0, 8).map((place, index) => <div key={place.id} className={`route-draggable-place ${draggedCourseIndex === index ? "is-dragging" : ""}`} draggable onDragStart={() => setDraggedCourseIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedCourseIndex !== null) moveCoursePlace(draggedCourseIndex, index); setDraggedCourseIndex(null); }} onDragEnd={() => setDraggedCourseIndex(null)}><GripVertical size={15} className="route-drag-handle" /><b>{index + 1}</b><span>{place.name}<small>{place.address}</small></span><button onClick={() => setCoursePlaces((items) => items.filter((item) => item.id !== place.id))}>×</button></div>)}</div></div>}{courseStep === 3 && <div className="route-create-step"><h2>세부사항 설정하기</h2><p>각 장소의 시간, 예상 비용, 메모를 설정해보세요.</p>{renderScheduleWarnings()}{coursePlaces.slice(0, 4).map((place, index) => <details key={place.id} open={index === 0} className="route-place-detail-accordion"><summary><b>{index + 1}</b>{place.name}<ChevronDown size={15} /></summary><div><label>방문 시간<input type="time" value={courseTimes[place.id] || "10:00"} onChange={(event) => setCourseTimes((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label>예상 비용<input type="number" value={courseCosts[place.id] || "0"} onChange={(event) => setCourseCosts((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label>메모<textarea placeholder="메모를 입력해보세요" /></label></div></details>)}</div>}{courseStep === 4 && <div className="route-create-step"><h2>코스 전체 확인</h2><p>코스의 전체 일정과 예상 비용을 확인하고 저장합니다.</p>{renderScheduleWarnings()}<CourseRouteMap stops={courseStops} compact /><div className="route-review-timeline">{coursePlaces.slice(0, 4).map((place, index) => <div key={place.id}><time>{courseTimes[place.id] || "10:00"}<small>도착</small></time><b>{index + 1}</b><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>1시간 · {(Number(courseCosts[place.id]) || 0).toLocaleString()}원</small></span></div>)}</div><div className="route-total-cost"><span>예상 총 비용</span><strong>{totalCost.toLocaleString()}원</strong></div></div>}<div className="route-bottom-action"><button className="secondary" disabled={courseStep === 1} onClick={() => setCourseStep((step) => Math.max(1, step - 1))}>이전</button><button onClick={() => courseStep < 4 ? setCourseStep((step) => step + 1) : void saveCourse()}>{courseStep === 4 ? "저장하기" : "다음"}</button></div></div>;
  const renderCourseCreateAllPlaces = () => {
    if (courseStep !== 2) return renderCourseCreate();
    return <div className="route-screen route-course-create"><ScreenHeader title="코스 만들기" onBack={() => setCourseStep(1)} right={<span>2/4</span>} /><StepIndicator step={2} /><div className="route-create-step"><h2>장소 추가하기</h2><p>지도에서 장소를 검색하거나 내 장소에서 추가해보세요.</p><div className="route-inline-search"><Search size={15} /><input placeholder="장소 검색" onChange={(event) => setQuery(event.target.value)} /></div>{renderMap(true)}{renderCourseMapPlanner()}<div className="route-added-places"><strong>추가한 장소 {coursePlaces.length}</strong>{coursePlaces.map((place, index) => <div key={place.id} className={`route-draggable-place ${draggedCourseIndex === index ? "is-dragging" : ""}`} draggable onDragStart={() => setDraggedCourseIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedCourseIndex !== null) moveCoursePlace(draggedCourseIndex, index); setDraggedCourseIndex(null); }} onDragEnd={() => setDraggedCourseIndex(null)}><GripVertical size={15} className="route-drag-handle" /><b>{index + 1}</b><span>{place.name}<small>{place.address}</small></span><button onClick={() => setCoursePlaces((items) => items.filter((item) => item.id !== place.id))}>×</button></div>)}</div></div><div className="route-bottom-action"><button className="secondary" onClick={() => setCourseStep(1)}>이전</button><button onClick={() => setCourseStep(3)}>다음</button></div></div>;
  };

  const renderCourseDetail = () => <div className="route-screen route-course-detail"><ScreenHeader title={sharedCourseTitle} onBack={() => setScreen("friends")} right={<button aria-label="코스 공유" onClick={() => setIsCourseShareOpen(true)}><Share2 size={17} /></button>} /><div className="route-course-cover"><img src={selectedCourse.image} alt="" /><div><span>{courseStatusLabel[selectedCourse.status || "planned"]} · {sharedCourseDateRange}</span><h2>{sharedCourseTitle}</h2><p>by {selectedCourse.author}</p></div></div><div className="route-course-summary"><span><Heart size={14} /> {selectedCourse.likes}</span><span><MapPin size={14} /> 장소 {courseDetailItems.length}곳</span><span><Clock3 size={14} /> 총 {formatTotalDuration(courseDetailItems.reduce((total, item) => total + (item.durationMinutes || 60), 0))}</span></div>{renderScheduleWarnings(selectedCourseScheduleWarnings)}<CourseRouteMap key={`course-day-route-${activeDetailDay}`} stops={activeDetailStops} /><div className="route-day-map-context"><Navigation size={14} /><span>Day {activeDetailDay} 이동 경로만 지도에 강조하고 있어요.</span></div>{activeDetailRouteWarnings.length > 0 && <section className="route-route-efficiency-warning" aria-label="동선 효율 경고"><AlertTriangle size={16} /><div><strong>동선을 한 번 확인해보세요</strong><p>{activeDetailRouteWarnings[0].message}</p></div></section>}<div className="route-detail-timeline"><div className="route-day-timeline-heading"><div><span>ITINERARY</span><h3>일차별 일정</h3></div><strong>{formatTotalDuration(activeDetailDuration)}</strong></div><div className="route-day-tabs" role="tablist" aria-label="일차별 일정">{detailDayNumbers.map((day) => <button key={day} role="tab" aria-selected={activeDetailDay === day} className={activeDetailDay === day ? "active" : ""} onClick={() => setActiveDetailDay(day)}>Day {day}<small>{formatTotalDuration(courseDetailItems.filter((item) => (item.dayNumber || 1) === day).reduce((total, item) => total + (item.durationMinutes || 60), 0))}</small></button>)}</div>{activeDetailItems.map((item, index) => <Fragment key={`${item.name}-${index}`}><button onClick={() => { const place = mockPlaces.find((candidate) => candidate.name.includes(item.name) || item.name.includes(candidate.name)); if (place) openPlace(place); }}><time>{item.time}<small>도착</small></time><b>{index + 1}</b><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{formatTotalDuration(item.durationMinutes || 60)} · {item.cost.toLocaleString()}원</small></span></button>{activeDetailSegments[index] && <div className="route-timeline-travel" aria-label={`${item.name}에서 다음 장소까지 예상 이동시간`}><Navigation size={12} /><span>{formatMinutes(activeDetailSegments[index].minutes)} 이동</span><small>{formatDistance(activeDetailSegments[index].distanceMeters)} · 다음 장소</small></div>}</Fragment>)}</div><div className="route-bottom-action single"><button onClick={() => { setCoursePlaces(mockPlaces); setCourseStep(1); setScreen("course-create"); }}>내 코스로 저장</button></div></div>;
  const renderActiveCourse = () => {
    const nextPlace = coursePlaces[0];
    return <div className="route-screen route-active-course"><ScreenHeader title="진행 중인 코스" onBack={() => setTab("home")} /><section className="route-active-course-hero" style={{ backgroundImage: `linear-gradient(130deg, rgba(35,27,72,.46), rgba(21,19,32,.82)), url(${nextPlace?.image || mockPlaces[0].image})` }}><span>{courseStatusLabel[courseStatus].toUpperCase()}</span><h2>{courseTitle || "나의 여행 코스"}</h2><p>{formatCourseDateRange(courseStartDate, courseEndDate)} · 장소 {coursePlaces.length}곳</p><button onClick={() => { if (nextPlace) focusMapPlace(nextPlace); setSelectedTab("map"); setScreen("map"); }}><Navigation size={15} /> 지도에서 이어가기</button></section><section className="route-active-course-summary"><div><small>NEXT PLACE</small><strong>{nextPlace?.name || "다음 장소를 추가해보세요"}</strong><span>{nextPlace ? `${courseTimes[nextPlace.id] || "10:00"} · ${nextPlace.address}` : "여행 코스에 장소를 추가하면 다음 일정이 표시됩니다."}</span></div><b>{coursePlaces.length}</b></section>{renderScheduleWarnings()}<section className="route-active-course-timeline"><div className="route-home-section-heading"><div><span>ITINERARY</span><h3>오늘의 일정</h3></div><button onClick={() => { setCourseStep(2); setSelectedTab("courses"); setScreen("course-create"); }}>수정 <Pencil size={13} /></button></div>{coursePlaces.map((place, index) => <div key={place.id} className={index === 0 ? "is-next" : ""}><time>{courseTimes[place.id] || "10:00"}</time><b>{index + 1}</b><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>{place.address}</small></span></div>)}</section></div>;
  };

  const renderFriends = () => <div className="route-screen route-friends"><div className="route-map-topbar"><div className="route-brand">친구·팔로우</div><button onClick={() => setScreen("user-search")}><Search size={18} /></button></div><div className="route-friends-search" onClick={() => setScreen("user-search")}><Search size={15} />사용자나 친구를 검색해보세요</div><h3>팔로잉</h3><div className="route-avatar-row">{["여행하는 지훈", "jane_park", "travel_ve", "summer", "june"].map((name, i) => <button key={name} onClick={() => setScreen("profile")}><img src={`https://i.pravatar.cc/100?img=${i + 12}`} alt="" /><span>{name}</span></button>)}</div><div className="route-friend-section-title"><h3>추천 여행자</h3><button onClick={() => setScreen("user-search")}>더보기 <ChevronRight size={13} /></button></div>{["여행하는 지훈", "여행의 아카이브", "오늘도 여행중"].map((name, i) => <button key={name} className="route-user-row" onClick={() => setScreen("profile")}><img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="" /><span><strong>{name}</strong><small>새로운 여행을 기록하는 사람</small></span><b>팔로우</b></button>)}<h3 className="route-recent-heading">최근 업데이트된 코스</h3><button className="route-large-course-card compact" onClick={() => { setSelectedCourse(publicCourse); setScreen("course-detail"); }}><img src={publicCourse.image} alt="" /><span><strong>{publicCourse.title}</strong><small>{publicCourse.author} · ♥ {publicCourse.likes}</small></span><ChevronRight size={16} /></button></div>;

  const renderUserSearch = () => <div className="route-screen route-list-screen"><ScreenHeader title="사용자 검색" onBack={() => setScreen("friends")} /><div className="route-search-input"><Search size={16} /><input autoFocus placeholder="이름이나 아이디 검색" /></div>{["여행하는 지훈", "여행이 좋아요", "여행의 기록", "오늘도 여행중", "여행을 말하다"].map((name, i) => <button className="route-user-row" key={name} onClick={() => setScreen("profile")}><img src={`https://i.pravatar.cc/100?img=${i + 30}`} alt="" /><span><strong>{name}</strong><small>@route_user_{i + 1}</small></span><b>팔로우</b></button>)}</div>;

  const renderProfile = () => <div className="route-screen route-profile"><ScreenHeader title="프로필" onBack={() => setScreen("friends")} right={<button><MoreHorizontal size={18} /></button>} /><div className="route-profile-cover" style={{ backgroundImage: `url(${publicCourse.image})` }} /><div className="route-profile-main"><img className="route-profile-avatar" src="https://i.pravatar.cc/160?img=12" alt="" /><div className="route-profile-name-row"><div><h2>{user?.name || "여행하는 지훈"}</h2><p>여행을 기록하고 코스를 만드는 사람</p></div><button>팔로우</button></div><div className="route-profile-stats"><span><strong>12</strong> 코스</span><span><strong>342</strong> 팔로워</span><span><strong>18</strong> 팔로잉</span></div><div className="route-profile-tabs"><button className="active">공개 코스</button><button>저장한 코스</button></div><div className="route-profile-grid">{sampleCourses.map((course) => <button key={course.id} onClick={() => { setSelectedCourse(course); setScreen("public-course-detail"); }}><img src={course.image} alt="" /><strong>{course.title}</strong><small>♥ {course.likes}</small></button>)}</div></div></div>;

  const renderPublicCourses = () => <div className="route-screen route-list-screen"><ScreenHeader title="공개 코스" onBack={() => setScreen("friends")} right={<button><Search size={17} /></button>} /><div className="route-list-tabs"><button className="active">팔로잉</button><button>저장한 코스</button></div>{sampleCourses.map((course) => <button className="route-public-course-row" key={course.id} onClick={() => { setSelectedCourse(course); setScreen("public-course-detail"); }}><img src={course.image} alt="" /><span><strong>{course.title}</strong><small>{course.region} · {course.author}</small><em>♥ {course.likes}　○ 5</em></span><ChevronRight size={16} /></button>)}</div>;

  const renderSavedCourses = () => <div className="route-screen route-list-screen"><ScreenHeader title="저장 코스" onBack={() => setScreen("mypage")} /><div className="route-saved-course-intro"><Bookmark size={17} /><span><strong>저장한 여행 코스</strong><small>나중에 참고할 여행 경험을 모아보세요.</small></span></div><div className="route-list-content">{savedCoursesQuery.isLoading ? <div className="route-empty"><Bookmark size={21} /><strong>저장 코스를 불러오는 중입니다</strong></div> : savedCoursesQuery.data?.length ? savedCoursesQuery.data.map((course: any) => <button className="route-saved-course-row" key={course.id} onClick={() => { setSelectedCourse({ id: String(course.id), title: course.title, region: course.region || "여행", author: "공개 코스", image: course.coverImage || mockPlaces[0].image, likes: 0, days: 1, items: [] }); setScreen("public-course-detail"); }}><img src={course.coverImage || mockPlaces[0].image} alt="" /><span><strong>{course.title}</strong><small>{course.region || "지역 정보 없음"}</small><em>저장됨</em></span><ChevronRight size={16} /></button>) : <div className="route-empty"><Bookmark size={22} /><strong>저장한 코스가 없습니다</strong><span>공개 코스에서 마음에 드는 여행 코스를 저장해보세요.</span></div>}</div></div>;

  const renderMyPage = () => {
    const displayName = user?.name || profileName || "여행자";
    const savedPlaceCount = savedPlacesQuery.data?.length || 0;
    const myCourseCount = courseList.length;
    return <div className="route-screen route-my-page"><div className="route-my-page-topbar"><span>MY ROUTE</span><button aria-label="프로필 수정" onClick={() => setScreen("profile")}><Pencil size={17} /></button></div><section className="route-my-profile-hero"><div className="route-my-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div className="route-my-profile-copy"><span>TRAVEL ARCHIVE</span><h1>{displayName}</h1><p>{user?.email || "나만의 여행 기록을 모아보세요."}</p></div><button className="route-my-profile-edit" onClick={() => setScreen("profile")}>프로필 편집</button></section><section className="route-my-summary-grid"><button onClick={() => setScreen("my-places")}><MapPin size={18} /><strong>{savedPlaceCount}</strong><span>저장 장소</span></button><button onClick={() => setScreen("my-courses")}><Calendar size={18} /><strong>{myCourseCount}</strong><span>내 코스</span></button><button onClick={() => setScreen("saved-courses")}><Bookmark size={18} /><strong>{savedCoursesQuery.data?.length || "보기"}</strong><span>저장 코스</span></button></section><section className="route-my-page-section"><div className="route-my-section-heading"><div><span>TRAVEL MANAGEMENT</span><h2>내 여행 관리</h2></div><button onClick={() => { setCourseStep(1); setScreen("course-create"); }}>새 코스 <Plus size={15} /></button></div><div className="route-my-management-card"><button onClick={() => setScreen("my-places")}><span className="route-my-management-icon places"><MapPin size={19} /></span><span><strong>내 장소</strong><small>저장한 장소를 보고 코스에 추가하세요.</small></span><em>{savedPlaceCount}곳</em><ChevronRight size={16} /></button><button onClick={() => setScreen("my-courses")}><span className="route-my-management-icon courses"><Calendar size={19} /></span><span><strong>내 코스</strong><small>만든 여행 일정을 관리하세요.</small></span><em>{myCourseCount}개</em><ChevronRight size={16} /></button><button onClick={() => setScreen("saved-courses")}><span className="route-my-management-icon saves"><Bookmark size={19} /></span><span><strong>저장한 코스</strong><small>다른 여행자의 코스를 다시 확인하세요.</small></span><ChevronRight size={16} /></button></div></section><section className="route-my-page-section route-my-account-section"><div className="route-my-section-heading"><div><span>PROFILE</span><h2>계정과 설정</h2></div></div><div className="route-my-nickname-card"><label>닉네임<input value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label><button onClick={async () => { try { await updateProfileMutation.mutateAsync({ name: profileName }); toast.success("프로필을 저장했습니다."); } catch { toast.error("프로필 저장에 실패했습니다."); } }}>저장</button></div><div className="route-my-settings-card"><button onClick={() => setScreen("profile")}><span><User size={17} />프로필 관리</span><ChevronRight size={16} /></button><button onClick={() => void logout()}><span><Compass size={17} />로그아웃</span><ChevronRight size={16} /></button></div></section></div>;
  };

  let content: ReactNode;
  if (screen === "map") content = renderMapScreen();
  else if (screen === "search") content = renderSearchScreen();
  else if (screen === "place-detail") content = renderPlaceDetailWithNavigation();
  else if (screen === "place-navigation") content = renderPlaceNavigation();
  else if (screen === "my-places") content = renderMyPlaces();
  else if (screen === "my-courses") content = renderMyCourses();
  else if (screen === "course-create") content = renderCourseCreateAllPlaces();
  else if (screen === "course-detail" || screen === "public-course-detail") content = renderCourseDetail();
  else if (screen === "edit-course") content = renderEditCourse();
  else if (screen === "friends") content = renderFriends();
  else if (screen === "user-search") content = renderUserSearch();
  else if (screen === "profile") content = renderProfile();
  else if (screen === "public-courses") content = renderPublicCourses();
  else if (screen === "saved-courses") content = renderSavedCourses();
  else if (screen === "mypage") content = renderMyPage();
  else if (screen === "active-course") content = renderActiveCourse();
  else content = <div className="route-screen route-home"><ScreenHeader title="Route" right={<button onClick={() => setTab("mypage")} aria-label="마이페이지"><User size={18} /></button>} /><button className="route-home-search" onClick={() => { setSelectedTab("map"); setScreen("search"); }} aria-label="장소 검색"><Search size={18} /><span>어디로 떠나볼까요?</span><ChevronRight size={16} /></button><section className="route-home-active-trip"><div><span>{courseStatusLabel[courseStatus].toUpperCase()}</span><h2>{courseTitle || "나의 여행 코스"}</h2><p>{formatCourseDateRange(courseStartDate, courseEndDate)} · 다음 일정 {courseTimes[coursePlaces[0]?.id] || "10:00"}</p><small>{courseStatusLabel[courseStatus]} · 장소 {coursePlaces.length}곳 · 지금 여행을 이어가세요.</small></div><button onClick={() => setScreen("active-course")}>코스 보기 <ChevronRight size={15} /></button></section><section className="route-home-places"><div className="route-home-section-heading"><div><span>MY PLACES</span><h3>최근 저장한 장소</h3></div><button onClick={() => { setSelectedTab("mypage"); setScreen("my-places"); }}>전체보기 <ChevronRight size={14} /></button></div>{mockPlaces.slice(0, 3).map((place) => <PlaceRow key={place.id} place={place} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />)}</section></div>;

  return <TravelModeContext.Provider value={travelMode}><div className="route-app-shell"><div className="route-phone"><StatusBar /><AnimatePresence mode="wait" initial={false}><motion.div key={screen} className="route-screen-transition" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>{content}</motion.div></AnimatePresence>{saveSheetOpen && screen !== "place-detail" && renderSaveSheet()}{renderCoursePicker()}{renderCourseShareSheet()}{renderPhotoGallery()}{renderLocationPermissionHelp()}{!["course-create", "place-detail", "place-navigation", "course-detail", "public-course-detail", "edit-course", "profile", "user-search", "search", "my-places", "active-course"].includes(screen) && <BottomNav active={selectedTab} onChange={setTab} />}</div></div></TravelModeContext.Provider>;
}
