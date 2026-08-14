import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  Heart,
  ListFilter,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Search,
  Share2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";

const coverImages = {
  coast: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
  cafe: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
  city: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=85",
};

type Tab = "home" | "map" | "courses" | "profile";
type Place = {
  id: string;
  name: string;
  category: string;
  address: string;
  image: string;
  description: string;
  rating?: number;
  lat: number;
  lng: number;
};

type CourseDraft = {
  title: string;
  region: string;
  places: Place[];
  notes: Record<string, string>;
  times: Record<string, string>;
  costs: Record<string, string>;
};

const places: Place[] = [
  {
    id: "seoul-forest",
    name: "서울숲",
    category: "공원",
    address: "서울 성동구 뚝섬로 273",
    image: coverImages.mountain,
    description: "도심의 속도를 잠시 낮추고 걷기 좋은 넓은 공원입니다.",
    lat: 37.5446,
    lng: 127.0374,
  },
  {
    id: "seongsu-cafe",
    name: "성수 카페 오르",
    category: "카페",
    address: "서울 성동구 연무장길 13",
    image: coverImages.cafe,
    description: "낮은 조도와 질감 있는 재료가 인상적인 성수의 카페입니다.",
    lat: 37.545,
    lng: 127.0557,
  },
  {
    id: "seongsu-diner",
    name: "온더보더 성수점",
    category: "다이닝",
    address: "서울 성동구 아차산로17길 48",
    image: coverImages.city,
    description: "하루의 마지막을 편안하게 마무리하기 좋은 다이닝 공간입니다.",
    lat: 37.5441,
    lng: 127.0574,
  },
];

const regions = ["전체", "서울", "제주", "부산", "강릉", "경주"];

function AppHeader({ onProfile }: { onProfile: () => void }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">TRAVEL NOTES / 2026</p>
        <h1 className="brand-wordmark">Route</h1>
      </div>
      <button className="icon-button" aria-label="프로필" onClick={onProfile}>
        <UserRound size={18} strokeWidth={1.5} />
      </button>
    </header>
  );
}

function BottomNav({ active, onChange, onCreate }: { active: Tab; onChange: (tab: Tab) => void; onCreate: () => void }) {
  const items: Array<{ id: Tab; label: string; icon: typeof Compass }> = [
    { id: "home", label: "홈", icon: Compass },
    { id: "map", label: "지도", icon: MapPin },
    { id: "courses", label: "내 코스", icon: CalendarDays },
    { id: "profile", label: "마이", icon: UserRound },
  ];

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {items.slice(0, 2).map(({ id, label, icon: Icon }) => (
        <button key={id} className={`nav-item ${active === id ? "is-active" : ""}`} onClick={() => onChange(id)}>
          <Icon size={18} strokeWidth={active === id ? 2 : 1.5} />
          <span>{label}</span>
        </button>
      ))}
      <button className="create-button" aria-label="코스 만들기" onClick={onCreate}>
        <Plus size={21} strokeWidth={1.7} />
      </button>
      {items.slice(2).map(({ id, label, icon: Icon }) => (
        <button key={id} className={`nav-item ${active === id ? "is-active" : ""}`} onClick={() => onChange(id)}>
          <Icon size={18} strokeWidth={active === id ? 2 : 1.5} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionHeading({ kicker, title, action, onAction }: { kicker?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h2>{title}</h2>
      </div>
      {action && <button onClick={onAction} className="text-button">{action}<ArrowRight size={14} /></button>}
    </div>
  );
}

function HomeTab({ onOpenMap, onOpenPlace, onOpenCourses, onOpenCourse }: { onOpenMap: () => void; onOpenPlace: (place: Place) => void; onOpenCourses: () => void; onOpenCourse: (courseId: number) => void }) {
  const publicCoursesQuery = trpc.courses.public.useQuery();
  const publicCourses = publicCoursesQuery.data ?? [];
  return (
    <>
      <AppHeader onProfile={() => {}} />
      <main className="page-content home-content">
        <section className="hero-copy">
          <p className="eyebrow">YOUR NEXT ROUTE</p>
          <h2>여행을<br /><em>수집하는</em> 방법</h2>
          <p className="body-copy">발견한 장소를 저장하고, 시간이 흐르는 순서대로 나만의 여행을 편집해보세요.</p>
          <button className="outline-cta" onClick={onOpenMap}>지도에서 장소 찾기 <ArrowRight size={15} /></button>
        </section>

        {publicCourses.length > 0 ? <section className="home-feature-card" onClick={() => onOpenCourse(publicCourses[0].id)} role="button" tabIndex={0}>
          <img src={publicCourses[0].coverImage || coverImages.coast} alt="" />
          <div className="feature-overlay" />
          <div className="feature-meta"><span>PUBLIC ROUTE / 01</span><span>{publicCourses[0].region || "ROUTE"}</span></div>
          <div className="feature-title"><p>다른 여행자가 만든</p><h3>{publicCourses[0].title}</h3></div>
          <ArrowRight className="feature-arrow" size={18} />
        </section> : <section className="home-feature-card" onClick={onOpenMap} role="button" tabIndex={0}>
          <img src={coverImages.coast} alt="바다 풍경" />
          <div className="feature-overlay" />
          <div className="feature-meta"><span>START WITH A PLACE</span><span>MAP</span></div>
          <div className="feature-title"><p>나만의 첫 장소부터</p><h3>Route를 시작하세요</h3></div>
          <ArrowRight className="feature-arrow" size={18} />
        </section>}

        <SectionHeading kicker="PLACES TO KEEP" title="이번 주에 발견한 곳" action="전체 보기" onAction={onOpenMap} />
        <div className="horizontal-cards">
          {places.slice(0, 2).map((place) => (
            <button className="place-card" key={place.id} onClick={() => onOpenPlace(place)}>
              <img src={place.image} alt={place.name} />
              <div className="place-card-copy"><span>{place.category}</span><strong>{place.name}</strong><small>{place.address}</small></div>
            </button>
          ))}
        </div>

        <SectionHeading kicker="PUBLIC ROUTES" title="다른 사람의 경험" action="공개 코스" onAction={onOpenCourses} />
        {publicCourses.length > 0 ? <div className="public-route-list">{publicCourses.slice(0, 2).map((course) => <button className="public-route-row" key={course.id} onClick={() => onOpenCourse(course.id)}><img src={course.coverImage || coverImages.coast} alt="" /><span><small>{course.region || "PUBLIC ROUTE"}</small><strong>{course.title}</strong><em>{course.description || "공개된 여행 코스"}</em></span><ArrowRight size={16} /></button>)}</div> : <div className="empty-editorial-card"><Sparkles size={18} strokeWidth={1.5} /><div><strong>아직 공개된 Route가 없어요</strong><p>첫 번째 코스를 공개하면 이곳에서 함께 발견할 수 있어요.</p></div><ArrowRight size={16} /></div>}
      </main>
    </>
  );
}

function GoogleRouteMap({ mapPlaces, showRoute = false }: { mapPlaces: Place[]; showRoute?: boolean }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const routeRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = mapPlaces.map((place) => {
      const marker = new window.google!.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
      });
      return marker;
    });
    if (mapPlaces[0]) map.setCenter({ lat: mapPlaces[0].lat, lng: mapPlaces[0].lng });
    if (mapPlaces.length > 1) {
      const bounds = new window.google!.maps.LatLngBounds();
      mapPlaces.forEach((place) => bounds.extend({ lat: place.lat, lng: place.lng }));
      map.fitBounds(bounds, 48);
    }
    if (showRoute && mapPlaces.length > 1) {
      routeRendererRef.current?.setMap(null);
      const renderer = new window.google!.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#6554c0", strokeOpacity: 0.85, strokeWeight: 4 },
      });
      routeRendererRef.current = renderer;
      new window.google!.maps.DirectionsService().route({
        origin: { lat: mapPlaces[0].lat, lng: mapPlaces[0].lng },
        destination: { lat: mapPlaces[mapPlaces.length - 1].lat, lng: mapPlaces[mapPlaces.length - 1].lng },
        waypoints: mapPlaces.slice(1, -1).map((place) => ({ location: { lat: place.lat, lng: place.lng }, stopover: true })),
        travelMode: window.google!.maps.TravelMode.WALKING,
      }, (result, status) => {
        if (status === "OK" && result) renderer.setDirections(result);
      });
    }
  };

  useEffect(() => () => {
    markersRef.current.forEach((marker) => { marker.map = null; });
    routeRendererRef.current?.setMap(null);
  }, []);

  return <MapView className="route-google-map" initialCenter={{ lat: 37.5446, lng: 127.0374 }} initialZoom={14} onMapReady={handleMapReady} />;
}

function MapTab({ onOpenPlace, onSave }: { onOpenPlace: (place: Place) => void; onSave: (place: Place) => void }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("전체");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const baseFiltered = useMemo(() => {
    const list = query.trim().length >= 2 ? searchResults : places;
    if (region === "전체") return list;
    return list.filter((p) => p.address.includes(region) || p.name.includes(region));
  }, [query, searchResults, region]);
  const filteredPlaces = baseFiltered;

  useEffect(() => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const placesApi = (window.google?.maps as any)?.places;
      if (!placesApi) return;
      const service = new placesApi.AutocompleteService();
      service.getPlacePredictions({ input: searchTerm, componentRestrictions: { country: "kr" }, locationBias: { center: { lat: 37.5446, lng: 127.0374 }, radius: 20000 } }, async (predictions: any[], status: string) => {
        if (status !== "OK" || !predictions?.length) {
          setSearchResults([]);
          return;
        }
        const resolved = await Promise.all(predictions.slice(0, 6).map(async (prediction) => {
          try {
            const place = new placesApi.Place({ id: prediction.place_id });
            await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "photos", "types", "rating", "userRatingCount"] });
            const geo = place.location as any;
            if (!geo) return null;
            const lat = typeof geo.lat === "function" ? geo.lat() : geo.lat;
            const lng = typeof geo.lng === "function" ? geo.lng() : geo.lng;
            return { id: prediction.place_id, name: place.displayName || prediction.structured_formatting?.main_text || prediction.description, category: place.types?.[0]?.replaceAll("_", " ") || "PLACE", address: place.formattedAddress || prediction.description, image: place.photos?.[0]?.getURI?.({ maxWidth: 800, maxHeight: 800 }) || coverImages.city, description: prediction.description, rating: typeof place.rating === "number" ? place.rating : undefined, lat, lng } as Place;
          } catch {
            return null;
          }
        }));
        setSearchResults(resolved.filter(Boolean) as Place[]);
      });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <>
      <header className="map-topbar"><button className="icon-button"><Menu size={18} /></button><p className="eyebrow">EXPLORE / MAP</p><button className="icon-button"><ListFilter size={18} /></button></header>
      <main className="map-page">
        <div className="map-search-wrap"><Search size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소, 지역 또는 분위기 검색" /></div>
        <div className="filter-row">{regions.map((item) => <button key={item} className={`filter-chip ${region === item ? "is-selected" : ""}`} onClick={() => setRegion(item)}>{item}</button>)}</div>
        <div className="map-canvas" aria-label="Google Maps 지도 영역">
          <GoogleRouteMap mapPlaces={filteredPlaces} />
          <div className="map-credit">Google Maps</div>
        </div>
        <div className="map-list-heading"><div><p className="eyebrow">AROUND YOU</p><h2>지금 저장할 만한 곳</h2></div><span>{filteredPlaces.length} places</span></div>
        <div className="map-place-list">{filteredPlaces.map((place) => <button className="map-place-row" key={place.id} onClick={() => onOpenPlace(place)}><img src={place.image} alt="" /><span><small>{place.category}</small><strong>{place.name}</strong><em>{place.address}</em></span><Bookmark size={17} strokeWidth={1.5} onClick={(event) => { event.stopPropagation(); onSave(place); }} /></button>)}</div>
      </main>
    </>
  );
}

function PlaceDetail({ place, onBack, onSave, onCreate }: { place: Place; onBack: () => void; onSave: () => void; onCreate: () => void }) {
  return (
    <div className="overlay-page">
      <header className="detail-topbar"><button className="icon-button light" onClick={onBack} aria-label="뒤로"><ArrowLeft size={18} /></button><p className="eyebrow">PLACE NOTE</p><button className="icon-button light"><Share2 size={17} /></button></header>
      <div className="detail-image"><img src={place.image} alt={place.name} /><span className="detail-category">{place.category}</span></div>
      <main className="detail-content"><p className="eyebrow">A PLACE TO KEEP</p><h1>{place.name}</h1><div className="detail-address"><MapPin size={16} /><span>{place.address}</span></div><p className="detail-description">{place.description}</p><div className="detail-info-line"><span>Google Maps 장소 정보</span>{place.rating && <span>★ {place.rating.toFixed(1)}</span>}</div><div className="detail-map-mini"><GoogleRouteMap mapPlaces={[place]} /></div></main>
      <div className="detail-actions"><button className="secondary-action" onClick={onSave}><Bookmark size={18} /> 저장</button><button className="primary-action" onClick={onCreate}><Plus size={18} /> 코스에 추가</button></div>
    </div>
  );
}

function SaveSheet({ place, onClose, onSaved, onCreate }: { place: Place; onClose: () => void; onSaved: () => void; onCreate: () => void }) {
  return <div className="sheet-backdrop" onClick={onClose}><div className="save-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-header"><div><p className="eyebrow">SAVE THIS PLACE</p><h2>{place.name}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><p className="sheet-copy">어디에 담아둘까요?</p><button className="sheet-option" onClick={onSaved}><span className="sheet-icon"><Bookmark size={18} /></span><span><strong>내 장소에 저장</strong><small>다음 여행을 위해 장소만 보관합니다.</small></span><ArrowRight size={16} /></button><button className="sheet-option" onClick={onCreate}><span className="sheet-icon"><Plus size={18} /></span><span><strong>새 코스에 추가</strong><small>이 장소로 4단계 Route를 시작합니다.</small></span><ArrowRight size={16} /></button><button className="sheet-cancel" onClick={onClose}>취소</button></div></div>;
}

function CoursesTab({ onCreate, onOpenDetail }: { onCreate: () => void; onOpenDetail: (courseId: number) => void }) {
  const [view, setView] = useState<"mine" | "saved">("mine");
  const mineQuery = trpc.courses.mine.useQuery(undefined, { enabled: view === "mine" });
  const publicQuery = trpc.courses.public.useQuery();
  const savedIdsQuery = trpc.courses.savedIds.useQuery(undefined, { enabled: view === "saved" });
  const savedCourses = (publicQuery.data ?? []).filter((course) => savedIdsQuery.data?.some((item) => item.courseId === course.id));
  const activeCourses = view === "mine" ? (mineQuery.data ?? []) : savedCourses;
  const isLoading = view === "mine" ? mineQuery.isLoading : publicQuery.isLoading || savedIdsQuery.isLoading;
  return <><AppHeader onProfile={() => {}} /><main className="page-content"><div className="page-intro"><p className="eyebrow">MY ROUTES</p><h1>나의 여행을<br /><em>편집합니다.</em></h1><p>저장한 장소를 시간과 거리의 흐름으로 바꿔보세요.</p></div><div className="segmented-control"><button className={view === "mine" ? "is-active" : ""} onClick={() => setView("mine")}>내 코스</button><button className={view === "saved" ? "is-active" : ""} onClick={() => setView("saved")}>저장 코스</button></div>{isLoading ? <div className="large-empty"><p>Route를 불러오는 중입니다.</p></div> : activeCourses.length > 0 ? <div className="course-card-list">{activeCourses.map((course) => <button className="course-summary-card" key={course.id} onClick={() => onOpenDetail(course.id)}><div className="course-summary-image"><img src={course.coverImage || coverImages.coast} alt="" /><span>{course.isPublic ? "PUBLIC" : "PRIVATE"}</span></div><div className="course-summary-copy"><p className="eyebrow">{course.region || "ROUTE"}</p><h2>{course.title}</h2><span>{course.description || "저장된 여행 코스"}</span></div><ArrowRight size={17} /></button>)}</div> : <div className="large-empty"><Bookmark size={20} /><h2>{view === "mine" ? "아직 만든 Route가 없습니다" : "저장한 공개 Route가 없습니다"}</h2><p>{view === "mine" ? "장소를 저장하고 첫 번째 Route를 만들어보세요." : "다른 여행자의 Route를 발견하면 이곳에 저장할 수 있어요."}</p></div>}<button className="new-route-card" onClick={onCreate}><span><Plus size={18} /><strong>새로운 Route 만들기</strong></span><ArrowRight size={16} /></button></main></>;
}

function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState<"courses" | "saved" | "places">("courses");
  const mineQuery = trpc.courses.mine.useQuery();
  const savedIdsQuery = trpc.courses.savedIds.useQuery();
  const savedPlacesQuery = trpc.places.saved.useQuery();
  const publicCoursesQuery = trpc.courses.public.useQuery();
  const savedCourses = (publicCoursesQuery.data ?? []).filter((course) => savedIdsQuery.data?.some((item) => item.courseId === course.id));
  return <><AppHeader onProfile={() => {}} /><main className="page-content"><div className="profile-intro"><div className="profile-avatar"><UserRound size={24} strokeWidth={1.4} /></div><div><p className="eyebrow">YOUR PROFILE</p><h1>여행자</h1><p>장소를 모으고, Route를 편집하는 사람</p></div><button className="icon-button"><Menu size={18} /></button></div><div className="profile-stats"><span><strong>{mineQuery.data?.length ?? 0}</strong><small>내 코스</small></span><span><strong>{savedIdsQuery.data?.length ?? 0}</strong><small>저장 코스</small></span><span><strong>{savedPlacesQuery.data?.length ?? 0}</strong><small>저장 장소</small></span></div><div className="profile-tabs">{([['courses','내 코스'],['saved','저장 코스'],['places','저장 장소']] as const).map(([id, label]) => <button key={id} className={active === id ? "is-active" : ""} onClick={() => setActive(id)}>{label}</button>)}</div>{active === "courses" && mineQuery.data && mineQuery.data.length > 0 ? <div className="profile-list">{mineQuery.data.map((course) => <button className="profile-list-row" key={course.id}><img src={course.coverImage || coverImages.coast} alt="" /><span><small>{course.region || "ROUTE"}</small><strong>{course.title}</strong></span><ArrowRight size={15} /></button>)}</div> : active === "saved" && savedCourses.length > 0 ? <div className="profile-list">{savedCourses.map((course) => <button className="profile-list-row" key={course.id}><img src={course.coverImage || coverImages.coast} alt="" /><span><small>{course.region || "PUBLIC ROUTE"}</small><strong>{course.title}</strong></span><ArrowRight size={15} /></button>)}</div> : active === "places" && savedPlacesQuery.data && savedPlacesQuery.data.length > 0 ? <div className="profile-list">{savedPlacesQuery.data.map((place) => <button className="profile-list-row" key={place.id}><img src={place.imageUrl || coverImages.city} alt="" /><span><small>{place.category || "PLACE"}</small><strong>{place.name}</strong></span><ArrowRight size={15} /></button>)}</div> : <div className="profile-empty"><Compass size={21} /><h2>{active === "places" ? "저장한 장소가 없습니다" : active === "saved" ? "저장한 코스가 없습니다" : "만든 코스가 없습니다"}</h2><p>지도에서 마음에 드는 장소를 발견해보세요.</p></div>}<button className="logout-link" onClick={onLogout}>로그아웃 <ArrowRight size={14} /></button></main></>;
}

function CourseBuilder({ initialPlace, onClose, onComplete }: { initialPlace?: Place; onClose: () => void; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const createCourse = trpc.courses.create.useMutation();
  const [draft, setDraft] = useState<CourseDraft>({ title: "", region: "서울", places: initialPlace ? [initialPlace] : [], notes: {}, times: {}, costs: {} });
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlace?.id ?? places[0].id);
  const activePlace = draft.places.find((place) => place.id === selectedPlaceId) ?? draft.places[0];
  const addPlace = () => { const candidate = places.find((place) => !draft.places.some((item) => item.id === place.id)); if (candidate) setDraft((current) => ({ ...current, places: [...current.places, candidate] })); };
  const saveDraft = async () => {
    try {
      await createCourse.mutateAsync({
        title: draft.title || "이름 없는 Route",
        region: draft.region,
        coverImage: draft.places[0]?.image,
          items: draft.places.map((place, index) => ({
            placeId: place.id,
            name: place.name,
            category: place.category,
            address: place.address,
            imageUrl: place.image,
            lat: place.lat,
            lng: place.lng,
            orderIndex: index,
            visitTime: draft.times[place.id] ?? "10:00",
            estimatedCost: Number(draft.costs[place.id] ?? "0"),
            note: draft.notes[place.id],
          })),
      });
      onComplete();
    } catch {
      toast.error("Route를 저장하지 못했습니다.");
    }
  };
  return <div className="overlay-page builder-page"><header className="builder-topbar"><button className="icon-button" onClick={onClose}><ArrowLeft size={18} /></button><div><p className="eyebrow">CREATE ROUTE</p><strong>코스 만들기</strong></div><span>{step} / 4</span></header><div className="stepper">{[1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? "is-active" : ""}>{item}</span>)}</div><main className="builder-content">{step === 1 && <section className="builder-step"><div className="builder-icon"><Compass size={25} /></div><p className="eyebrow">STEP 01 / NAME</p><h1>이번 여행의<br /><em>이름을 정해주세요.</em></h1><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="예: 서울의 느린 하루" /><label className="field-label">지역</label><div className="select-like"><span>{draft.region}</span><ChevronDown size={16} /></div></section>}{step === 2 && <section className="builder-step"><p className="eyebrow">STEP 02 / PLACES</p><h1>장소를<br /><em>담아보세요.</em></h1><div className="builder-map"><div className="mini-map-grid" />{draft.places.map((place, index) => <span className={`builder-marker bm-${index}`} key={place.id}><MapPin size={15} fill="currentColor" /></span>)}</div><div className="builder-place-list">{draft.places.map((place, index) => <button key={place.id} className="builder-place-row" onClick={() => setSelectedPlaceId(place.id)}><span className="number-badge">{index + 1}</span><span><strong>{place.name}</strong><small>{place.address}</small></span><Check size={16} /></button>)}</div><button className="add-place-link" onClick={addPlace}><Plus size={16} /> 장소 추가</button></section>}{step === 3 && <section className="builder-step"><p className="eyebrow">STEP 03 / DETAILS</p><h1>하루의 리듬을<br /><em>설정하세요.</em></h1>{activePlace ? <div className="detail-form-card"><div className="form-place-title"><img src={activePlace.image} alt="" /><div><strong>{activePlace.name}</strong><small>{activePlace.category}</small></div></div><label className="field-label">방문 시간</label><Input type="time" value={draft.times[activePlace.id] ?? "10:00"} onChange={(event) => setDraft({ ...draft, times: { ...draft.times, [activePlace.id]: event.target.value } })} /><label className="field-label">예상 비용 (원)</label><Input type="number" value={draft.costs[activePlace.id] ?? ""} onChange={(event) => setDraft({ ...draft, costs: { ...draft.costs, [activePlace.id]: event.target.value } })} placeholder="예: 15000" /><label className="field-label">메모</label><textarea value={draft.notes[activePlace.id] ?? ""} onChange={(event) => setDraft({ ...draft, notes: { ...draft.notes, [activePlace.id]: event.target.value } })} placeholder="이 장소에서 하고 싶은 일을 적어보세요." /></div> : <div className="large-empty">먼저 장소를 추가해주세요.</div>}</section>}{step === 4 && <section className="builder-step"><p className="eyebrow">STEP 04 / REVIEW</p><h1>이 Route를<br /><em>저장할까요?</em></h1><div className="review-cover"><img src={draft.places[0]?.image ?? coverImages.coast} alt="" /><div><p className="eyebrow">{draft.region}</p><h2>{draft.title || "이름 없는 Route"}</h2><span>{draft.places.length} places · 총 {Object.values(draft.costs).reduce((acc, v) => acc + (Number(v) || 0), 0).toLocaleString()}원</span></div></div><div className="review-list">{draft.places.map((place, index) => <div key={place.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{place.name}</strong><small>{draft.times[place.id] ?? "10:00"} {draft.costs[place.id] ? `· ${Number(draft.costs[place.id]).toLocaleString()}원` : ""}</small></div>)}</div></section>}</main><div className="builder-actions">{step > 1 && <button className="secondary-action" onClick={() => setStep(step - 1)}>이전</button>}<button className="primary-action" disabled={(step === 1 && !draft.title.trim()) || createCourse.isPending} onClick={() => step < 4 ? setStep(step + 1) : saveDraft()}>{createCourse.isPending ? "저장 중" : step === 4 ? "저장하기" : "다음"}<ArrowRight size={17} /></button></div></div>;
}

function CourseDetail({ courseId, onBack }: { courseId: number; onBack: () => void }) {
  const courseQuery = trpc.courses.get.useQuery({ courseId });
  const course = courseQuery.data;
  const routePlaces: Place[] = (course?.items ?? []).filter((item) => typeof item.lat === "number" && typeof item.lng === "number").map((item) => ({ id: item.placeId, name: item.name, category: item.category || "PLACE", address: item.address || "", image: item.imageUrl || coverImages.coast, description: item.note || "", lat: item.lat as number, lng: item.lng as number }));
  const items = course?.items ?? [];
  const totalCost = items.reduce((acc, item) => acc + (item.estimatedCost ?? 0), 0);
  return <div className="overlay-page"><header className="detail-topbar"><button className="icon-button light" onClick={onBack}><ArrowLeft size={18} /></button><p className="eyebrow">ROUTE DETAIL</p><button className="icon-button light"><Share2 size={17} /></button></header><div className="course-detail-hero"><img src={course?.coverImage || coverImages.coast} alt="" /><div><p className="eyebrow">{course?.region || "ROUTE"} / {course?.isPublic ? "PUBLIC" : "PRIVATE"}</p><h1>{course?.title || "Route 상세"}</h1><p>{courseQuery.isLoading ? "불러오는 중" : `장소 ${items.length}곳 · 총 ${totalCost.toLocaleString()}원`}</p></div></div><main className="timeline-content">{routePlaces.length > 1 && <div className="route-detail-map"><GoogleRouteMap mapPlaces={routePlaces} showRoute /></div>}<div className="route-stat-row"><span><strong>{String(items.length).padStart(2, "0")}</strong><small>places</small></span><span><strong>{totalCost ? `${totalCost.toLocaleString()}원` : "—"}</strong><small>estimated</small></span><span><strong>1</strong><small>day</small></span></div><SectionHeading kicker="DAY 01 / ROUTE" title="하루의 흐름" /><div className="timeline">{items.map((item, index) => <div className="timeline-item" key={item.id}><div className="timeline-time"><strong>{item.visitTime || "10:00"}</strong><small>{index === 0 ? "START" : "NEXT"}</small></div><div className="timeline-line"><span>{index + 1}</span></div><button className="timeline-card"><img src={item.imageUrl || coverImages.coast} alt="" /><span><small>{item.category || "PLACE"}</small><strong>{item.name}</strong><em>{item.address || "주소 정보 없음"} {item.estimatedCost ? `· ${item.estimatedCost.toLocaleString()}원` : ""}</em></span></button></div>)}</div><div className="route-note"><Navigation size={17} /><span>장소 사이의 이동 경로는 Google Maps 기준으로 계산됩니다.</span></div></main></div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [saveTarget, setSaveTarget] = useState<Place | null>(null);
  const [builderPlace, setBuilderPlace] = useState<Place | undefined>();
  const [showBuilder, setShowBuilder] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const savePlaceMutation = trpc.places.toggleSaved.useMutation();

  if (loading) return <div className="loading-screen"><span className="loading-mark">R</span><p>Route를 준비하고 있어요.</p></div>;
  if (!isAuthenticated) return <div className="auth-screen"><p className="eyebrow">TRAVEL NOTES / 2026</p><div className="auth-wordmark">Route</div><p className="auth-copy">발견한 장소를 저장하고<br />나만의 여행으로 편집하세요.</p><Button className="auth-button" onClick={startLogin}>Manus로 시작하기 <ArrowRight size={16} /></Button><small>로그인하면 저장한 장소와 코스가 모든 기기에서 이어집니다.</small></div>;

  const openBuilder = (place?: Place) => { setBuilderPlace(place); setShowBuilder(true); setSelectedPlace(null); setSaveTarget(null); };
  const completeBuilder = () => { setShowBuilder(false); setTab("courses"); toast.success("Route가 저장되었습니다."); };
  const openSaveSheet = (place: Place) => setSaveTarget(place);
  const savedPlace = async () => {
    if (!saveTarget) return;
    try {
      await savePlaceMutation.mutateAsync({ placeId: saveTarget.id, name: saveTarget.name, category: saveTarget.category, address: saveTarget.address, imageUrl: saveTarget.image, lat: saveTarget.lat, lng: saveTarget.lng });
      setSaveTarget(null);
      toast.success("내 장소에 저장했습니다.");
    } catch {
      toast.error("장소를 저장하지 못했습니다.");
    }
  };

  return <div className="route-shell"><div className="mobile-canvas">{tab === "home" && <HomeTab onOpenMap={() => setTab("map")} onOpenPlace={setSelectedPlace} onOpenCourses={() => setTab("courses")} onOpenCourse={(courseId) => { setSelectedCourseId(courseId); setShowDetail(true); }} />}{tab === "map" && <MapTab onOpenPlace={setSelectedPlace} onSave={openSaveSheet} />}{tab === "courses" && <CoursesTab onCreate={() => openBuilder()} onOpenDetail={(courseId) => { setSelectedCourseId(courseId); setShowDetail(true); }} />}{tab === "profile" && <ProfileTab onLogout={logout} />}<BottomNav active={tab} onChange={(next) => { setTab(next); setSelectedPlace(null); setShowDetail(false); }} onCreate={() => openBuilder()} />{selectedPlace && <PlaceDetail place={selectedPlace} onBack={() => setSelectedPlace(null)} onSave={() => openSaveSheet(selectedPlace)} onCreate={() => openBuilder(selectedPlace)} />}{saveTarget && <SaveSheet place={saveTarget} onClose={() => setSaveTarget(null)} onSaved={savedPlace} onCreate={() => openBuilder(saveTarget)} />}{showBuilder && <CourseBuilder initialPlace={builderPlace} onClose={() => setShowBuilder(false)} onComplete={completeBuilder} />}{showDetail && selectedCourseId && <CourseDetail courseId={selectedCourseId} onBack={() => { setShowDetail(false); setSelectedCourseId(null); }} />}</div></div>;
}
