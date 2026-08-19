import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  ExternalLink,
  GripVertical,
  Heart,
  LocateFixed,
  MapPin,
  MoreHorizontal,
  Navigation,
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Screen = "home" | "map" | "my-courses" | "friends" | "mypage" | "search" | "place-detail" | "my-places" | "course-create" | "course-detail" | "user-search" | "profile" | "public-courses" | "public-course-detail" | "saved-courses" | "edit-course" | "active-course";
type Tab = "home" | "map" | "courses" | "friends" | "mypage";

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
};

type CourseItem = { name: string; time: string; duration: string; cost: number; image: string; address?: string };
type Course = { id: string; title: string; region: string; author: string; image: string; likes: number; days: number; items: CourseItem[] };

const mockPlaces: Place[] = [
  { id: "p1", name: "성수 식당", category: "맛집", address: "서울 성동구 연무장7길 5", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85", photos: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85"], description: "성수에서 오래 사랑받은 따뜻한 한식 공간입니다.", rating: 4.6, reviewCount: 1245, lat: 37.5446, lng: 127.0557, hours: "11:30 - 22:00", phone: "02-1234-5678" },
  { id: "p2", name: "오븐 성수", category: "카페", address: "서울 성동구 연무장길 7", image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=85", description: "매일 구워내는 베이커리와 스페셜티 커피.", rating: 4.4, reviewCount: 892, lat: 37.545, lng: 127.0565, hours: "10:00 - 21:00", phone: "02-2345-6789" },
  { id: "p3", name: "성수동 스테이크", category: "맛집", address: "서울 성동구 아차산로 403", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85", description: "부드러운 육질과 와인이 어우러지는 다이닝.", rating: 4.5, reviewCount: 2100, lat: 37.5435, lng: 127.0582, hours: "12:00 - 23:00", phone: "02-3456-7890" },
  { id: "p4", name: "서울숲", category: "관광지", address: "서울 성동구 뚝섬로 273", image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=85", description: "도심 속에서 산책과 휴식을 즐길 수 있는 공원.", rating: 4.8, reviewCount: 4530, lat: 37.5447, lng: 127.0374, hours: "24시간", phone: "02-460-2905" },
];

const publicCourse: Course = {
  id: "c1", title: "제주 2박 3일 힐링 코스", region: "제주", author: "여행하는 지훈", image: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?auto=format&fit=crop&w=1200&q=85", likes: 24, days: 3,
  items: [
    { name: "협재 해수욕장", time: "10:00", duration: "1시간", cost: 0, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=85" },
    { name: "애월 카페거리", time: "12:30", duration: "1시간 30분", cost: 15000, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=500&q=85" },
    { name: "오설록 티 뮤지엄", time: "15:00", duration: "1시간", cost: 12000, image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=500&q=85" },
    { name: "애월 해안도로", time: "17:30", duration: "1시간", cost: 0, image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=85" },
  ],
};

const sampleCourses: Course[] = [publicCourse, { ...publicCourse, id: "c2", title: "부산 1박 2일 맛집 투어", region: "부산", author: "여행의 기록", image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85", likes: 18 }];
const RECENT_SEARCHES_KEY = "route-recent-place-searches";
const DEFAULT_MAP_CENTER = { lat: 37.5446, lng: 127.0557 };

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
  return <button className="route-place-row" onClick={onClick}><img src={place.image} alt="" /><span className="route-place-copy"><strong>{place.name}</strong><small>★ {place.rating} ({place.reviewCount}) · {place.category}</small><em>{place.address}</em></span><span className="route-place-distance">{distanceLabel}</span><span className="route-place-save" onClick={(event) => { event.stopPropagation(); onSave(); }}><Bookmark size={16} /></span></button>;
}

function StepIndicator({ step }: { step: number }) { return <div className="route-step-indicator">{[1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? "active" : ""}>{item}</span>)}</div>; }

type RouteStop = { name: string; lat: number; lng: number };

function estimateRouteMinutes(stops: RouteStop[]) {
  if (stops.length < 2) return 0;
  let kilometers = 0;
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const current = stops[index];
    const latitude = ((previous.lat + current.lat) / 2) * (Math.PI / 180);
    const deltaLat = (current.lat - previous.lat) * 111;
    const deltaLng = (current.lng - previous.lng) * 111 * Math.cos(latitude);
    kilometers += Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
  }
  return Math.max(5, Math.round((kilometers / 25) * 60));
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `약 ${hours}시간 ${remainder}분` : `약 ${hours}시간`;
}

function RouteMapFallback({ stops }: { stops: RouteStop[] }) {
  const segmentMinutes = stops.length > 1 ? Math.max(5, Math.round(estimateRouteMinutes(stops) / (stops.length - 1))) : 0;
  return <div className="route-map-fallback route-route-fallback"><div className="route-map-water" /><div className="route-map-road road-a" /><div className="route-map-road road-b" /><div className="route-map-road road-c" /><div className="route-route-line-fallback" />{stops.map((stop, index) => <span className={`route-route-stop-fallback stop-${index + 1}`} key={`${stop.name}-${index}`}>{index + 1}</span>)}{stops.slice(1).map((stop, index) => <span className={`route-route-time-fallback time-${index + 1}`} key={`${stop.name}-time`}>{segmentMinutes}분</span>)}<div className="route-map-attribution">Route route preview</div></div>;
}

function CourseRouteMap({ stops, compact = false }: { stops: RouteStop[]; compact?: boolean }) {
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const routeDecorationRefs = useRef<google.maps.Marker[]>([]);
  const routeFallbackLineRef = useRef<google.maps.Polyline | null>(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState("");
  const [isRealRoute, setIsRealRoute] = useState(false);
  const fallbackMinutes = useMemo(() => estimateRouteMinutes(stops), [stops]);
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
      const minutes = leg?.duration?.value ? Math.max(1, Math.round(leg.duration.value / 60)) : estimateRouteMinutes([previousStop, stop]);
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
  }, [clearRouteDecorations, stops]);
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
    const service = new google.maps.DirectionsService();
    service.route({
      origin: { lat: stops[0].lat, lng: stops[0].lng },
      destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
      waypoints: stops.slice(1, -1).map((stop) => ({ location: { lat: stop.lat, lng: stop.lng }, stopover: true })),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
    }, (result, status) => {
      if (status !== "OK" || !result?.routes[0]) return;
      renderer.setDirections(result);
      const legs = result.routes[0].legs || [];
      renderRouteDecorations(map, legs);
      setDuration(Math.round(legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) / 60));
      setDistance(legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000 < 10 ? `${(legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000).toFixed(1)}km` : `${Math.round(legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000)}km`);
      setIsRealRoute(true);
    });
  }, [clearRouteDecorations, renderRouteDecorations, stops]);
  useEffect(() => () => {
    rendererRef.current?.setMap(null);
    clearRouteDecorations();
  }, [clearRouteDecorations]);

  return <div className={`route-course-route-wrap ${compact ? "compact" : ""}`}><div className="route-course-route-map"><MapView className="route-real-map" initialCenter={stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : undefined} initialZoom={13} onMapReady={handleMapReady} fallback={<RouteMapFallback stops={stops} />} /></div><div className="route-route-meta"><span><MapPin size={13} /> {stops.length}곳 연결</span><span><Clock3 size={13} /> {formatMinutes(duration || fallbackMinutes)}</span>{distance && <span>{distance}</span>}{!isRealRoute && <small>지도 연결 후 실제 경로로 계산됩니다.</small>}</div></div>;
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
  const [mapPreviewPlace, setMapPreviewPlace] = useState<Place | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course>(publicCourse);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [courseStep, setCourseStep] = useState(1);
  const [courseTitle, setCourseTitle] = useState("서울 데이트 코스");
  const [coursePlaces, setCoursePlaces] = useState<Place[]>(mockPlaces);
  const [courseTimes, setCourseTimes] = useState<Record<string, string>>({ p1: "14:00", p2: "15:40", p3: "17:00", p4: "19:00" });
  const [courseCosts, setCourseCosts] = useState<Record<string, string>>({ p1: "10000", p2: "15000", p3: "50000", p4: "0" });
  const [courseMemos, setCourseMemos] = useState<Record<string, string>>({});
  const [draggedCourseIndex, setDraggedCourseIndex] = useState<number | null>(null);
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
  const mainMapRef = useRef<google.maps.Map | null>(null);
  const placeMarkerRefs = useRef<google.maps.Marker[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const sheetDragStartRef = useRef<number | null>(null);
  const galleryDragStartRef = useRef<number | null>(null);
  const selectedCourseId = Number(selectedCourse.id);
  const selectedCourseInput = useMemo(() => ({ courseId: selectedCourseId > 0 ? selectedCourseId : 1 }), [selectedCourseId]);
  const selectedCourseQuery = trpc.courses.get.useQuery(selectedCourseInput, { enabled: isAuthenticated && screen === "edit-course" && selectedCourseId > 0 });

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
      hours: "영업시간 확인",
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
  const courseStops = useMemo<RouteStop[]>(() => coursePlaces.slice(0, 8).map((place) => ({ name: place.name, lat: place.lat, lng: place.lng })), [coursePlaces]);
  const selectedCourseStops = useMemo<RouteStop[]>(() => selectedCourse.items.map((item, index) => {
    const fallback = mockPlaces.find((place) => place.name.includes(item.name) || item.name.includes(place.name)) || mockPlaces[index % mockPlaces.length];
    return { name: item.name, lat: fallback.lat, lng: fallback.lng };
  }), [selectedCourse.items]);

  useEffect(() => {
    const detail = selectedCourseQuery.data;
    if (screen !== "edit-course" || !detail?.items?.length) return;
    const normalizedPlaces = detail.items.map((item: any) => {
      const fallback = mockPlaces.find((place) => place.id === item.placeId || place.name === item.name) || mockPlaces[0];
      return { ...fallback, id: item.placeId, name: item.name, category: item.category || fallback.category, address: item.address || fallback.address, image: item.imageUrl || fallback.image, lat: item.lat || fallback.lat, lng: item.lng || fallback.lng };
    });
    setCoursePlaces(normalizedPlaces);
    setCourseTitle(detail.title);
    setCourseTimes(Object.fromEntries(detail.items.map((item: any) => [item.placeId, item.visitTime || "10:00"])));
    setCourseCosts(Object.fromEntries(detail.items.map((item: any) => [item.placeId, String(item.estimatedCost || 0)])));
    setCourseMemos(Object.fromEntries(detail.items.map((item: any) => [item.placeId, item.note || ""])));
  }, [screen, selectedCourseQuery.data]);

  const ownedCourses = useMemo<Course[]>(() => (myCoursesQuery.data || []).map((course: any) => ({ id: String(course.id), title: course.title, region: course.region || "서울", author: user?.name || "나의 Route", image: course.coverImage || mockPlaces[0].image, likes: 0, days: 1, items: [] })), [myCoursesQuery.data, user?.name]);
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
    service.getDetails({ placeId: place.id, fields: ["name", "formatted_address", "formatted_phone_number", "opening_hours", "photos"] }, (details, status) => {
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
      };
      setSelectedPlace((current) => current?.id === place.id ? enriched : current);
      setMapPreviewPlace((current) => current?.id === place.id ? enriched : current);
      setLivePlaces((current) => current.map((item) => item.id === place.id ? enriched : item));
    });
  };
  const openPlace = (place: Place) => { setGalleryIndex(0); setSelectedPlace(place); setScreen("place-detail"); hydrateGooglePlaceDetails(place); };
  const openSaveSheet = (place: Place) => { setSelectedPlace(place); setSaveSheetOpen(true); };
  const savePlace = async () => {
    if (!selectedPlace) return;
    try { await savePlaceMutation.mutateAsync({ placeId: selectedPlace.id, name: selectedPlace.name, category: selectedPlace.category, address: selectedPlace.address, imageUrl: selectedPlace.image, lat: selectedPlace.lat, lng: selectedPlace.lng }); setSaveSheetOpen(false); toast.success("내 장소에 저장했습니다."); } catch { toast.error("저장하지 못했습니다."); }
  };
  const saveCourse = async () => {
    try {
      await createCourseMutation.mutateAsync({ title: courseTitle, region: "서울", coverImage: coursePlaces[0]?.image, items: coursePlaces.map((place, index) => ({ placeId: place.id, name: place.name, category: place.category, address: place.address, imageUrl: place.image, lat: place.lat, lng: place.lng, orderIndex: index, visitTime: courseTimes[place.id] || "10:00", estimatedCost: Number(courseCosts[place.id]) || 0, note: courseMemos[place.id] })) });
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
      await updateCourseMutation.mutateAsync({ courseId: numericCourseId, title: courseTitle, region: selectedCourse.region, coverImage: coursePlaces[0]?.image, items: coursePlaces.map((place, index) => ({ placeId: place.id, name: place.name, category: place.category, address: place.address, imageUrl: place.image, lat: place.lat, lng: place.lng, orderIndex: index, visitTime: courseTimes[place.id] || "10:00", estimatedCost: Number(courseCosts[place.id]) || 0, note: courseMemos[place.id] })) });
      await trpcUtils.courses.mine.invalidate();
      toast.success("코스 수정 내용을 저장했습니다."); setScreen("my-courses"); setSelectedTab("courses");
    } catch { toast.error("코스 수정 내용을 저장하지 못했습니다."); }
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
  const addPlaceToCourse = (place: Place) => {
    setCoursePlaces((items) => items.some((item) => item.id === place.id) ? items : [...items, place]);
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
    setCourseTimes({ [coursePickerPlace.id]: "10:00" });
    setCourseCosts({ [coursePickerPlace.id]: "0" });
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
  const renderMap = (compact = false, enablePlacePreview = false) => <div className={`${compact ? "route-map-box compact" : "route-map-box"} route-map-box-with-fallback`}><MapView className="route-real-map" initialCenter={DEFAULT_MAP_CENTER} initialZoom={15} onMapReady={enablePlacePreview ? handleMainMapReady : undefined} fallback={<MapFallback markers={enablePlacePreview ? visibleMapPlaces : filteredPlaces} selectedId={enablePlacePreview ? mapPreviewPlace?.id : undefined} onSelect={enablePlacePreview ? (place) => { setMapPreviewPlace(place); setSheetMode("peek"); } : undefined} />}/>{enablePlacePreview && <><div className="route-map-floating-controls"><button aria-label="현재 위치" onClick={moveToCurrentLocation}><LocateFixed size={18} /></button><button aria-label="장소 검색" onClick={() => setScreen("search")}><SlidersHorizontal size={18} /></button></div>{mapPreviewPlace && sheetMode !== "hidden" && <motion.div className="route-map-place-preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}><button className="route-map-place-preview-main" onClick={() => openPlace(mapPreviewPlace)}><img src={mapPreviewPlace.image} alt={`${mapPreviewPlace.name} 대표 사진`} /><span><small>{mapPreviewPlace.category}</small><strong>{mapPreviewPlace.name}</strong><em>★ {mapPreviewPlace.rating || "평점 정보 없음"} · {getPlaceDistanceLabel(mapPreviewPlace)}</em></span><ChevronRight size={17} /></button><div className="route-map-place-preview-actions"><button onClick={() => openSaveSheet(mapPreviewPlace)}><Bookmark size={15} /> 저장</button><button onClick={() => openCoursePicker(mapPreviewPlace)}><Plus size={15} /> 코스 선택</button>{savedPlaceIds.has(mapPreviewPlace.id) && <button className="route-map-current-course-add" onClick={() => addSavedPlaceToCurrentCourse(mapPreviewPlace)}><Plus size={15} /> {coursePlaces.some((place) => place.id === mapPreviewPlace.id) ? "현재 코스에 담김" : "현재 코스에 담기"}</button>}</div></motion.div>}</>}</div>;

  const renderLocationPermissionHelp = () => <Dialog open={isLocationPermissionHelpOpen} onOpenChange={setIsLocationPermissionHelpOpen}><DialogContent className="route-location-permission-dialog"><DialogHeader><DialogTitle>현재 위치 권한이 필요합니다</DialogTitle><DialogDescription>주변 장소와 거리를 정확히 보여주려면 위치 접근을 허용해 주세요.</DialogDescription></DialogHeader><div className="route-location-permission-steps"><div><b>1</b><span>브라우저 주소창 왼쪽의 자물쇠 또는 사이트 정보 아이콘을 누르세요.</span></div><div><b>2</b><span><strong>위치</strong> 권한을 <strong>허용</strong>으로 변경한 뒤 Route를 새로고침하세요.</span></div><div><b>3</b><span>모바일에서는 기기 설정의 앱 권한에서 위치 접근을 허용할 수 있습니다.</span></div></div><DialogFooter><button className="route-dialog-secondary" onClick={() => setIsLocationPermissionHelpOpen(false)}>나중에</button><button className="route-dialog-primary" onClick={() => { setIsLocationPermissionHelpOpen(false); moveToCurrentLocation(); }}>다시 시도</button></DialogFooter></DialogContent></Dialog>;
  const renderCoursePicker = () => coursePickerPlace && <div className="route-overlay route-course-picker-overlay" onClick={() => setCoursePickerPlace(null)}><div className="route-course-picker" onClick={(event) => event.stopPropagation()}><div className="route-sheet-handle" /><div className="route-course-picker-heading"><div><span>ADD TO TRIP</span><h3>{coursePickerPlace.name}</h3><p>추가할 여행 코스를 선택하세요.</p></div><button aria-label="코스 선택 닫기" onClick={() => setCoursePickerPlace(null)}><X size={17} /></button></div><button className="route-course-picker-create" onClick={createCourseFromPicker}><span><Plus size={18} /></span><div><strong>새 코스 만들기</strong><small>이 장소부터 새 여행을 시작합니다.</small></div><ChevronRight size={16} /></button>{courseList.length ? <div className="route-course-picker-list"><p>내 여행 코스</p>{courseList.map((course) => <button key={course.id} onClick={() => void appendPlaceToOwnedCourse(course)} disabled={appendPlaceMutation.isPending}><img src={course.image} alt="" /><span><strong>{course.title}</strong><small>{course.region} · 장소 추가</small></span><Plus size={16} /></button>)}</div> : <div className="route-course-picker-empty"><Calendar size={19} /><span><strong>선택할 저장 코스가 없습니다.</strong><small>새 코스를 만들어 이 장소부터 일정에 담아보세요.</small></span></div>}<button className="route-course-picker-cancel" onClick={() => setCoursePickerPlace(null)}>취소</button></div></div>;
  const renderMapScreen = () => <div className={`route-screen route-map-screen sheet-${sheetMode}`}>
    <button className="route-map-search" onClick={() => setScreen("search")} aria-label="장소 검색"><Search size={17} /><span>{query || "장소를 검색해보세요"}</span><ChevronRight size={15} /></button>
    <div className="route-filter-row">{["전체", "맛집", "카페", "관광지", "숙소"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {renderMap(false, true)}
    {sheetMode !== "hidden" && <div className={`route-map-sheet is-${sheetMode}`}><div className="route-sheet-drag-zone" onPointerDown={handleSheetPointerDown} onPointerUp={handleSheetPointerUp}><div className="route-sheet-handle" /></div><div className="route-sheet-title"><strong>{hasLiveSearch ? "검색 결과" : "주변 장소"}</strong><span>{visibleMapPlaces.length}곳</span></div>{renderDiscoveryControls()}{mapPreviewPlace && sheetMode === "expanded" && <section className="route-sheet-place-glance"><div className="route-sheet-place-glance-heading"><span>선택한 장소</span><button onClick={() => openPlace(mapPreviewPlace)}>상세 보기 <ChevronRight size={13} /></button></div><div className="route-sheet-hours"><Clock3 size={16} /><span><small>영업시간</small><strong>{mapPreviewPlace.hours}</strong></span></div><div className="route-sheet-photo-strip">{getPlacePhotos(mapPreviewPlace).slice(0, 3).map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${mapPreviewPlace.name} 사진 ${index + 1}`} />)}</div><button className="route-sheet-photo-more" onClick={() => openPlace(mapPreviewPlace)}>사진 {getPlacePhotos(mapPreviewPlace).length}장과 상세 정보 보기 <ChevronRight size={14} /></button></section>}{placesLoading ? <div className="route-empty"><Search size={20} /><strong>장소를 찾고 있습니다</strong><span>Google Maps 검색 결과를 불러오는 중입니다.</span></div> : visibleMapPlaces.length ? (sheetMode === "expanded" ? visibleMapPlaces : visibleMapPlaces.slice(0, 3)).map((place) => <PlaceRow key={place.id} place={place} distanceLabel={getPlaceDistanceLabel(place)} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />) : <div className="route-empty"><Search size={20} /><strong>{openNowOnly ? "현재 영업 중인 장소가 없습니다" : "검색 결과가 없습니다"}</strong><span>필터를 해제하거나 다른 키워드로 찾아보세요.</span></div>}</div>}
  </div>;

  const renderSearchScreen = () => <div className="route-screen route-search-screen"><ScreenHeader title="장소 검색" onBack={() => setScreen("map")} /><div className="route-search-composer"><div className="route-search-input"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchPlaces(); }} placeholder="성수 맛집" /><button aria-label="검색" onClick={() => searchPlaces()}>{placesLoading ? "…" : <Search size={15} />}</button><button aria-label="입력 지우기" onClick={() => { setQuery(""); setHasLiveSearch(false); setLivePlaces([]); setPlacePredictions([]); }}><X size={15} /></button></div>{placePredictions.length > 0 && <div className="route-autocomplete-list">{placePredictions.map((prediction) => <button key={prediction.place_id} onClick={() => choosePrediction(prediction)}><MapPin size={15} /><span><strong>{prediction.structured_formatting.main_text}</strong><small>{prediction.structured_formatting.secondary_text || prediction.description}</small></span><ChevronRight size={15} /></button>)}</div>}{!query.trim() && !hasLiveSearch && recentSearches.length > 0 && <section className="route-recent-searches"><div className="route-recent-searches-heading"><div><span>RECENT</span><h2>최근 검색어</h2></div><button aria-label="최근 검색어 전체 삭제" onClick={clearRecentSearches}>전체 삭제</button></div>{recentSearches.map((term) => <div className="route-recent-search-row" key={term}><button className="route-recent-search-run" onClick={() => { setQuery(term); searchPlaces(term); }}><Clock3 size={15} /><span>{term}</span><ChevronRight size={15} /></button><button className="route-recent-search-delete" aria-label={`${term} 삭제`} onClick={() => removeRecentSearch(term)}><X size={14} /></button></div>)}</section>}</div><div className="route-filter-row inner">{["전체", "맛집", "카페", "관광지", "숙소"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>{renderDiscoveryControls()}{renderMap(true, true)}<div className="route-search-list">{visibleMapPlaces.map((place) => <PlaceRow key={place.id} place={place} distanceLabel={getPlaceDistanceLabel(place)} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />)}</div></div>;

  const renderPlaceDetail = () => selectedPlace && <div className="route-screen route-detail-screen"><div className="route-detail-map">{renderMap(true)}<button className="route-floating-back" onClick={() => setScreen("map")}><ArrowLeft size={18} /></button><button className="route-floating-share"><Share2 size={16} /></button></div><div className="route-place-detail-card"><div className="route-detail-images">{getPlacePhotos(selectedPlace).slice(0, 3).map((photo, index) => <button key={`${photo}-${index}`} aria-label={`${selectedPlace.name} 사진 ${index + 1} 확대`} onClick={() => { setGalleryIndex(index); setIsGalleryOpen(true); }}><img src={photo} alt={`${selectedPlace.name} 사진 ${index + 1}`} />{index === 2 && getPlacePhotos(selectedPlace).length > 3 && <span>+{getPlacePhotos(selectedPlace).length - 3}</span>}</button>)}</div><div className="route-detail-body"><div className="route-detail-title-row"><div><h2>{selectedPlace.name}</h2><p>★ {selectedPlace.rating} ({selectedPlace.reviewCount}) · {selectedPlace.category}</p></div><button onClick={() => openSaveSheet(selectedPlace)}><Bookmark size={18} /></button></div><p className="route-detail-description">{selectedPlace.description}</p><p><MapPin size={14} /> {selectedPlace.address}</p><p><Clock3 size={14} /> {selectedPlace.hours}</p><p><Users size={14} /> {selectedPlace.phone}</p><a className="route-naver-link" href={naverMapSearchUrl(selectedPlace)} target="_blank" rel="noreferrer"><ExternalLink size={15} /><span><strong>네이버에서 예약·문의</strong><small>장소 상세·예약 가능 여부를 네이버에서 확인</small></span><ChevronRight size={15} /></a></div><div className="route-detail-actions"><button className="secondary" onClick={() => openSaveSheet(selectedPlace)}>저장</button><button onClick={() => openCoursePicker(selectedPlace)}>코스 선택</button></div></div>{saveSheetOpen && renderSaveSheet()}</div>;

  const renderSaveSheet = () => <div className="route-overlay" onClick={() => setSaveSheetOpen(false)}><div className="route-save-sheet" onClick={(event) => event.stopPropagation()}><div className="route-sheet-handle" /><h3>다음 중 선택하세요</h3><button onClick={savePlace}><Bookmark size={20} /><span><strong>내 장소에 저장</strong><small>나중에 다시 확인할 장소를 저장합니다.</small></span><ChevronRight size={16} /></button><button onClick={() => { if (!selectedPlace) return; setSaveSheetOpen(false); openCoursePicker(selectedPlace); }}><Plus size={20} /><span><strong>코스 선택 또는 새 코스</strong><small>여러 여행 코스 중 선택하거나 새로 만듭니다.</small></span><ChevronRight size={16} /></button><button className="cancel" onClick={() => setSaveSheetOpen(false)}>취소</button></div></div>;
  const renderPhotoGallery = () => {
    if (!selectedPlace || !isGalleryOpen) return null;
    const photos = getPlacePhotos(selectedPlace);
    const showPhoto = (offset: number) => setGalleryIndex((current) => (current + offset + photos.length) % photos.length);
    return <div className="route-photo-gallery-overlay" role="dialog" aria-modal="true" aria-label={`${selectedPlace.name} 사진 갤러리`} onClick={() => setIsGalleryOpen(false)}><div className="route-photo-gallery" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { galleryDragStartRef.current = event.clientX; }} onPointerUp={(event) => { if (galleryDragStartRef.current === null) return; const distance = event.clientX - galleryDragStartRef.current; galleryDragStartRef.current = null; if (distance < -40) showPhoto(1); else if (distance > 40) showPhoto(-1); }}><div className="route-photo-gallery-topbar"><span>{galleryIndex + 1} / {photos.length}</span><button aria-label="사진 갤러리 닫기" onClick={() => setIsGalleryOpen(false)}><X size={20} /></button></div><img src={photos[galleryIndex]} alt={`${selectedPlace.name} 사진 ${galleryIndex + 1}`} /><button className="route-photo-gallery-nav previous" aria-label="이전 사진" disabled={photos.length < 2} onClick={() => showPhoto(-1)}><ChevronRight size={22} /></button><button className="route-photo-gallery-nav next" aria-label="다음 사진" disabled={photos.length < 2} onClick={() => showPhoto(1)}><ChevronRight size={22} /></button><div className="route-photo-gallery-dots">{photos.map((photo, index) => <button key={`${photo}-${index}`} aria-label={`${index + 1}번 사진`} className={index === galleryIndex ? "active" : ""} onClick={() => setGalleryIndex(index)} />)}</div></div></div>;
  };

  const renderMyPlaces = () => <div className="route-screen route-list-screen"><ScreenHeader title="내 장소" onBack={() => setScreen("map")} right={<button><MoreHorizontal size={18} /></button>} /><div className="route-list-tabs"><button className="active">전체</button><button>맛집</button><button>카페</button><button>관광지</button></div><div className="route-list-content">{(savedPlacesQuery.data?.length ? savedPlacesQuery.data : mockPlaces).map((place: any) => <PlaceRow key={place.id} place={{ ...place, image: place.imageUrl || place.image, rating: place.rating || 4.6, reviewCount: place.reviewCount || 0, hours: place.hours || "영업시간 확인", phone: place.phone || "" }} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />)}</div></div>;

  const renderMyCourses = () => <div className="route-screen route-list-screen"><ScreenHeader title="내 코스" onBack={() => setTab("map")} right={<button className="route-header-add" onClick={() => { setCourseStep(1); setScreen("course-create"); }}>+ 새 코스</button>} /><div className="route-list-tabs"><button className="active">내 코스</button><button>저장 코스</button></div><div className="route-course-list">{courseList.length ? courseList.map((course) => <div className="route-large-course-card" key={course.id}><button className="route-course-card-main" onClick={() => { setSelectedCourse(course); setScreen("course-detail"); }}><img src={course.image} alt="" /><span><strong>{course.title}</strong><small>{course.region} · 장소 {course.items.length}곳 · 좋아요 {course.likes}</small></span><ChevronRight size={16} /></button>{hasDbCourses && <button className="route-course-edit-button" aria-label="코스 수정" onClick={() => { setSelectedCourse(course); setCourseTitle(course.title); setCoursePlaces(mockPlaces); setCourseStep(1); setScreen("edit-course"); }}><Pencil size={15} /></button>}</div>) : <div className="route-empty"><Calendar size={22} /><strong>저장된 내 코스가 없습니다</strong><span>새 코스를 만들어 여행 일정을 기록해보세요.</span></div>}</div></div>;

  const renderEditCourse = () => <div className="route-screen route-course-create"><ScreenHeader title="내 버전 코스" onBack={() => setScreen("my-courses")} right={<span>수정</span>} /><div className="route-create-step"><h2>코스 정보를 수정하세요</h2><p>장소 순서와 방문 시간, 예상 비용을 바꿀 수 있습니다.</p><label className="route-edit-label">코스 이름<Input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} /></label><div className="route-edit-place-list"><h3>일정 장소 {coursePlaces.length}곳</h3>{coursePlaces.slice(0, 4).map((place, index) => <div className="route-edit-place-block" key={place.id}><div className="route-edit-place-row"><b>{index + 1}</b><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>{place.address}</small></span><div className="route-edit-place-actions"><button disabled={index === 0} onClick={() => setCoursePlaces((items) => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</button><button disabled={index === coursePlaces.length - 1} onClick={() => setCoursePlaces((items) => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}>↓</button></div></div><div className="route-edit-fields"><label>방문 시간<input type="time" value={courseTimes[place.id] || "10:00"} onChange={(event) => setCourseTimes((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label>예상 비용<input type="number" value={courseCosts[place.id] || "0"} onChange={(event) => setCourseCosts((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label className="memo">메모<textarea value={courseMemos[place.id] || ""} onChange={(event) => setCourseMemos((current) => ({ ...current, [place.id]: event.target.value }))} placeholder="이 장소에 대한 메모" /></label></div></div>)}</div></div><div className="route-bottom-action"><button className="secondary" onClick={() => setScreen("my-courses")}>취소</button><button onClick={() => void saveEditedCourse()} disabled={updateCourseMutation.isPending}>저장하기</button></div></div>;

  const renderCourseCreate = () => <div className="route-screen route-course-create"><ScreenHeader title="코스 만들기" onBack={() => courseStep > 1 ? setCourseStep(courseStep - 1) : setScreen("map")} right={<span>{courseStep}/4</span>} /><StepIndicator step={courseStep} />{courseStep === 1 && <div className="route-create-step route-create-name"><Compass size={34} className="route-step-icon" /><h2>코스 이름을 정해주세요</h2><Input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} placeholder="서울 데이트 코스" /><small>예) 부산 1박 2일 여행, 제주 힐링 코스</small></div>}{courseStep === 2 && <div className="route-create-step"><h2>장소 추가하기</h2><p>지도에서 장소를 검색하거나 내 장소에서 추가해보세요.</p><div className="route-inline-search"><Search size={15} /><input placeholder="장소 검색" onChange={(event) => setQuery(event.target.value)} /></div>{renderMap(true)}<div className="route-added-places"><strong>추가한 장소 {coursePlaces.length}</strong>{coursePlaces.slice(0, 8).map((place, index) => <div key={place.id} className={`route-draggable-place ${draggedCourseIndex === index ? "is-dragging" : ""}`} draggable onDragStart={() => setDraggedCourseIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedCourseIndex !== null) moveCoursePlace(draggedCourseIndex, index); setDraggedCourseIndex(null); }} onDragEnd={() => setDraggedCourseIndex(null)}><GripVertical size={15} className="route-drag-handle" /><b>{index + 1}</b><span>{place.name}<small>{place.address}</small></span><button onClick={() => setCoursePlaces((items) => items.filter((item) => item.id !== place.id))}>×</button></div>)}</div></div>}{courseStep === 3 && <div className="route-create-step"><h2>세부사항 설정하기</h2><p>각 장소의 시간, 예상 비용, 메모를 설정해보세요.</p>{coursePlaces.slice(0, 4).map((place, index) => <details key={place.id} open={index === 0} className="route-place-detail-accordion"><summary><b>{index + 1}</b>{place.name}<ChevronDown size={15} /></summary><div><label>방문 시간<input type="time" value={courseTimes[place.id] || "10:00"} onChange={(event) => setCourseTimes((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label>예상 비용<input type="number" value={courseCosts[place.id] || "0"} onChange={(event) => setCourseCosts((current) => ({ ...current, [place.id]: event.target.value }))} /></label><label>메모<textarea placeholder="메모를 입력해보세요" /></label></div></details>)}</div>}{courseStep === 4 && <div className="route-create-step"><h2>코스 전체 확인</h2><p>코스의 전체 일정과 예상 비용을 확인하고 저장합니다.</p><CourseRouteMap stops={courseStops} compact /><div className="route-review-timeline">{coursePlaces.slice(0, 4).map((place, index) => <div key={place.id}><time>{courseTimes[place.id] || "10:00"}<small>도착</small></time><b>{index + 1}</b><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>1시간 · {(Number(courseCosts[place.id]) || 0).toLocaleString()}원</small></span></div>)}</div><div className="route-total-cost"><span>예상 총 비용</span><strong>{totalCost.toLocaleString()}원</strong></div></div>}<div className="route-bottom-action"><button className="secondary" disabled={courseStep === 1} onClick={() => setCourseStep((step) => Math.max(1, step - 1))}>이전</button><button onClick={() => courseStep < 4 ? setCourseStep((step) => step + 1) : void saveCourse()}>{courseStep === 4 ? "저장하기" : "다음"}</button></div></div>;

  const renderCourseDetail = () => <div className="route-screen route-course-detail"><ScreenHeader title={selectedCourse.title} onBack={() => setScreen("friends")} right={<button><Share2 size={17} /></button>} /><div className="route-course-cover"><img src={selectedCourse.image} alt="" /><div><span>{selectedCourse.region} · {selectedCourse.days}일</span><h2>{selectedCourse.title}</h2><p>by {selectedCourse.author}</p></div></div><div className="route-course-summary"><span><Heart size={14} /> {selectedCourse.likes}</span><span><MapPin size={14} /> 장소 {selectedCourse.items.length}곳</span><span><Clock3 size={14} /> 1일 일정</span></div><CourseRouteMap stops={selectedCourseStops} /><div className="route-detail-timeline"><h3>코스 일정</h3>{selectedCourse.items.map((item, index) => <button key={item.name} onClick={() => { const place = mockPlaces.find((candidate) => candidate.name.includes(item.name) || item.name.includes(candidate.name)); if (place) openPlace(place); }}><time>{item.time}<small>도착</small></time><b>{index + 1}</b><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.duration} · {item.cost.toLocaleString()}원</small></span></button>)}</div><div className="route-bottom-action single"><button onClick={() => { setCoursePlaces(mockPlaces); setCourseStep(1); setScreen("course-create"); }}>내 코스로 저장</button></div></div>;
  const renderActiveCourse = () => {
    const nextPlace = coursePlaces[0];
    return <div className="route-screen route-active-course"><ScreenHeader title="진행 중인 코스" onBack={() => setTab("home")} /><section className="route-active-course-hero" style={{ backgroundImage: `linear-gradient(130deg, rgba(35,27,72,.46), rgba(21,19,32,.82)), url(${nextPlace?.image || mockPlaces[0].image})` }}><span>IN PROGRESS</span><h2>{courseTitle || "나의 여행 코스"}</h2><p>오늘의 여정 · 장소 {coursePlaces.length}곳</p><button onClick={() => { if (nextPlace) focusMapPlace(nextPlace); setSelectedTab("map"); setScreen("map"); }}><Navigation size={15} /> 지도에서 이어가기</button></section><section className="route-active-course-summary"><div><small>NEXT PLACE</small><strong>{nextPlace?.name || "다음 장소를 추가해보세요"}</strong><span>{nextPlace ? `${courseTimes[nextPlace.id] || "10:00"} · ${nextPlace.address}` : "여행 코스에 장소를 추가하면 다음 일정이 표시됩니다."}</span></div><b>{coursePlaces.length}</b></section><section className="route-active-course-timeline"><div className="route-home-section-heading"><div><span>ITINERARY</span><h3>오늘의 일정</h3></div><button onClick={() => { setCourseStep(2); setSelectedTab("courses"); setScreen("course-create"); }}>수정 <Pencil size={13} /></button></div>{coursePlaces.map((place, index) => <div key={place.id} className={index === 0 ? "is-next" : ""}><time>{courseTimes[place.id] || "10:00"}</time><b>{index + 1}</b><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>{place.address}</small></span></div>)}</section></div>;
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
  else if (screen === "place-detail") content = renderPlaceDetail();
  else if (screen === "my-places") content = renderMyPlaces();
  else if (screen === "my-courses") content = renderMyCourses();
  else if (screen === "course-create") content = renderCourseCreate();
  else if (screen === "course-detail" || screen === "public-course-detail") content = renderCourseDetail();
  else if (screen === "edit-course") content = renderEditCourse();
  else if (screen === "friends") content = renderFriends();
  else if (screen === "user-search") content = renderUserSearch();
  else if (screen === "profile") content = renderProfile();
  else if (screen === "public-courses") content = renderPublicCourses();
  else if (screen === "saved-courses") content = renderSavedCourses();
  else if (screen === "mypage") content = renderMyPage();
  else if (screen === "active-course") content = renderActiveCourse();
  else content = <div className="route-screen route-home"><ScreenHeader title="Route" right={<button onClick={() => setTab("mypage")} aria-label="마이페이지"><User size={18} /></button>} /><button className="route-home-search" onClick={() => { setSelectedTab("map"); setScreen("search"); }} aria-label="장소 검색"><Search size={18} /><span>어디로 떠나볼까요?</span><ChevronRight size={16} /></button><section className="route-home-active-trip"><div><span>IN PROGRESS</span><h2>{courseTitle || "나의 여행 코스"}</h2><p>다음 일정 · {courseTimes[coursePlaces[0]?.id] || "10:00"} {coursePlaces[0]?.name || "장소를 추가해보세요"}</p><small>장소 {coursePlaces.length}곳 · 지금 여행을 이어가세요.</small></div><button onClick={() => setScreen("active-course")}>코스 보기 <ChevronRight size={15} /></button></section><section className="route-home-places"><div className="route-home-section-heading"><div><span>MY PLACES</span><h3>최근 저장한 장소</h3></div><button onClick={() => { setSelectedTab("mypage"); setScreen("my-places"); }}>전체보기 <ChevronRight size={14} /></button></div>{mockPlaces.slice(0, 3).map((place) => <PlaceRow key={place.id} place={place} onClick={() => openPlace(place)} onSave={() => openSaveSheet(place)} />)}</section></div>;

  return <div className="route-app-shell"><div className="route-phone"><StatusBar /><AnimatePresence mode="wait" initial={false}><motion.div key={screen} className="route-screen-transition" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>{content}</motion.div></AnimatePresence>{saveSheetOpen && screen !== "place-detail" && renderSaveSheet()}{renderCoursePicker()}{renderPhotoGallery()}{renderLocationPermissionHelp()}{!["course-create", "place-detail", "course-detail", "public-course-detail", "edit-course", "profile", "user-search", "search", "my-places", "active-course"].includes(screen) && <BottomNav active={selectedTab} onChange={setTab} />}</div></div>;
}
