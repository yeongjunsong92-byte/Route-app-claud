import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  MapPin,
  Menu,
  Plus,
  Search,
  Share2,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapView } from "@/components/Map";

type Tab = "home" | "map" | "courses" | "mypage";

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
  hours?: string;
  priceRange?: string;
};

const mockPlaces: Place[] = [
  {
    id: "p1",
    name: "성수 식당",
    category: "한식",
    address: "서울 성동구 연무장7길 5",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85",
    description: "정갈한 한식과 편안한 분위기가 있는 성수의 대표 맛집입니다.",
    rating: 4.6,
    reviewCount: 1248,
    lat: 37.5446,
    lng: 127.0557,
    hours: "11:30 - 22:00",
    priceRange: "10,000 - 30,000원",
  },
  {
    id: "p2",
    name: "오븐 성수",
    category: "카페",
    address: "서울 성동구 연무장길 7",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=85",
    description: "매일 구워내는 베이커리와 스페셜티 커피가 있는 공간.",
    rating: 4.4,
    reviewCount: 892,
    lat: 37.545,
    lng: 127.0565,
    hours: "10:00 - 21:00",
    priceRange: "6,000 - 15,000원",
  },
  {
    id: "p3",
    name: "성수동 스테이크",
    category: "양식",
    address: "서울 성동구 아차산로403",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85",
    description: "부드러운 육질과 와인이 어우러지는 다이닝 레스토랑.",
    rating: 4.5,
    reviewCount: 2100,
    lat: 37.5435,
    lng: 127.0582,
    hours: "12:00 - 23:00",
    priceRange: "30,000 - 60,000원",
  },
];

const mockCourses = [
  {
    id: "c1",
    title: "서울 데이트 코스",
    region: "서울",
    author: "여행하는 지훈",
    days: 1,
    placesCount: 4,
    likes: 31,
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=85",
    items: [
      { name: "서울숲", time: "14:00", duration: "1시간 30분", cost: 10000, image: mockPlaces[0].image },
      { name: "성수 카페 오르", time: "15:40", duration: "1시간", cost: 15000, image: mockPlaces[1].image },
      { name: "온더보더 성수점", time: "17:00", duration: "1시간 30분", cost: 50000, image: mockPlaces[2].image },
      { name: "한강공원", time: "19:00", duration: "1시간", cost: 0, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=85" },
    ],
  },
];

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string; icon: typeof Compass }> = [
    { id: "home", label: "홈", icon: Compass },
    { id: "map", label: "지도", icon: MapPin },
    { id: "courses", label: "내 코스", icon: Calendar },
    { id: "mypage", label: "마이", icon: User },
  ];

  return (
    <nav className="gpt-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} className={`gpt-nav-item ${isActive ? "active" : ""}`}>
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("home");

  // 시안 기준 모달 상태들
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("전체");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [saveSheetPlace, setSaveSheetPlace] = useState<Place | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  // 코스 만들기 4단계 상태
  const [builderStep, setBuilderStep] = useState(1);
  const [builderTitle, setBuilderTitle] = useState("서울 데이트 코스");
  const [builderPlaces, setBuilderPlaces] = useState<Place[]>(mockPlaces);

  if (loading) return <div className="gpt-loading">로딩 중...</div>;

  if (!isAuthenticated) {
    return (
      <div className="gpt-auth-screen">
        <div className="gpt-auth-box">
          <h1 className="gpt-logo">Route</h1>
          <p className="gpt-auth-desc">여행 중 발견한 장소를 저장하고,<br />나만의 코스를 만들어보세요.</p>
          <Button onClick={startLogin} className="gpt-auth-btn">Manus로 시작하기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gpt-shell">
      <div className="gpt-mobile-frame">
        {/* 상단 타이틀바 (시안 1, 2, 3 공통 9:41 헤더) */}
        <div className="gpt-status-bar">
          <span>9:41</span>
          <div className="gpt-status-icons"><span /><span /><span /></div>
        </div>

        {/* 탭 내용 */}
        {tab === "home" && (
          <div className="gpt-page">
            <header className="gpt-header">
              <h2>Route</h2>
              <button className="gpt-profile-btn" onClick={() => setTab("mypage")}>
                <User size={16} />
              </button>
            </header>
            <div className="gpt-home-content">
              <div className="gpt-banner-card" onClick={() => setSelectedCourse(mockCourses[0])}>
                <span className="gpt-badge">추천 코스</span>
                <h3>서울 데이트 코스</h3>
                <p>성수동의 핫플레이스와 한강 야경을 잇는 코스</p>
              </div>
              <h3 className="gpt-section-title">공개 코스 둘러보기</h3>
              <div className="gpt-course-list">
                {mockCourses.map((c) => (
                  <div key={c.id} className="gpt-course-card" onClick={() => setSelectedCourse(c)}>
                    <img src={c.image} alt={c.title} />
                    <div className="gpt-course-info">
                      <h4>{c.title}</h4>
                      <p>{c.author} · 좋아요 {c.likes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "map" && (
          <div className="gpt-page gpt-map-page">
            <div className="gpt-search-bar-wrap">
              <Search size={16} />
              <input
                type="text"
                placeholder="장소를 검색해보세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} /></button>}
            </div>
            <div className="gpt-filters">
              {["전체", "맛집", "카페", "관광지", "숙소"].map((f) => (
                <button
                  key={f}
                  className={`gpt-filter-chip ${selectedFilter === f ? "active" : ""}`}
                  onClick={() => setSelectedFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* 지도 영역 */}
            <div className="gpt-map-area">
              <MapView
                className="w-full h-full"
                initialCenter={{ lat: 37.5446, lng: 127.0557 }}
                initialZoom={15}
                onMapReady={(map) => {
                  mockPlaces.forEach((p) => {
                    new window.google!.maps.marker.AdvancedMarkerElement({
                      map,
                      position: { lat: p.lat, lng: p.lng },
                      title: p.name,
                    });
                  });
                }}
              />
            </div>

            {/* 하단 장소 리스트 (시안 2의 2번 화면) */}
            <div className="gpt-place-drawer">
              {mockPlaces.map((p) => (
                <div key={p.id} className="gpt-place-row" onClick={() => setSelectedPlace(p)}>
                  <img src={p.image} alt={p.name} />
                  <div className="gpt-place-texts">
                    <h4>{p.name}</h4>
                    <p>★ {p.rating} ({p.reviewCount}) · {p.category}</p>
                    <span>{p.address}</span>
                  </div>
                  <button className="gpt-bookmark-sm" onClick={(e) => { e.stopPropagation(); setSaveSheetPlace(p); }}>
                    <Bookmark size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "courses" && (
          <div className="gpt-page gpt-courses-page">
            <div className="gpt-page-header">
              <h2>내 코스</h2>
              <button className="gpt-add-btn" onClick={() => { setBuilderStep(1); setIsBuilderOpen(true); }}>
                <Plus size={18} /> 새 코스
              </button>
            </div>
            <div className="gpt-my-courses">
              {mockCourses.map((c) => (
                <div key={c.id} className="gpt-my-course-card" onClick={() => setSelectedCourse(c)}>
                  <img src={c.image} alt="" />
                  <div>
                    <h4>{c.title}</h4>
                    <p>{c.days}일 일정 · 장소 {c.placesCount}곳</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "mypage" && (
          <div className="gpt-page gpt-mypage">
            <div className="gpt-profile-header">
              <div className="gpt-avatar"><User size={24} /></div>
              <div>
                <h3>{user?.name || "여행자"}</h3>
                <p>{user?.email || "route@user.com"}</p>
              </div>
            </div>
            <div className="gpt-menu-list">
              <button onClick={() => setTab("courses")}>내 코스 관리 <ChevronRight size={16} /></button>
              <button onClick={() => setTab("map")}>저장한 장소 <ChevronRight size={16} /></button>
              <button onClick={() => { window.location.href = "/api/auth/logout"; }}>로그아웃 <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        <BottomNav active={tab} onChange={setTab} />

        {/* 장소 상세 모달 (시안 2의 3번 화면) */}
        {selectedPlace && (
          <div className="gpt-modal-overlay">
            <div className="gpt-modal">
              <button className="gpt-modal-close" onClick={() => setSelectedPlace(null)}><X size={18} /></button>
              <img src={selectedPlace.image} alt="" className="gpt-modal-img" />
              <div className="gpt-modal-body">
                <h3>{selectedPlace.name}</h3>
                <p className="gpt-rating">★ {selectedPlace.rating} ({selectedPlace.reviewCount}) · {selectedPlace.category}</p>
                <p className="gpt-addr"><MapPin size={14} /> {selectedPlace.address}</p>
                {selectedPlace.hours && <p className="gpt-info-row"><Clock size={14} /> 영업시간: {selectedPlace.hours}</p>}
                <p className="gpt-desc">{selectedPlace.description}</p>
              </div>
              <div className="gpt-modal-actions">
                <button className="gpt-btn-outline" onClick={() => { setSelectedPlace(null); setSaveSheetPlace(selectedPlace); }}>
                  저장
                </button>
                <button className="gpt-btn-primary" onClick={() => { setSelectedPlace(null); setBuilderStep(1); setIsBuilderOpen(true); }}>
                  코스에 추가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 장소 저장 바텀시트 (시안 2의 4번 화면) */}
        {saveSheetPlace && (
          <div className="gpt-sheet-overlay" onClick={() => setSaveSheetPlace(null)}>
            <div className="gpt-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gpt-sheet-handle" />
              <h3>어디에 담아둘까요?</h3>
              <button className="gpt-sheet-item" onClick={() => { setSaveSheetPlace(null); toast.success("내 장소에 저장되었습니다."); }}>
                <Bookmark size={18} />
                <div>
                  <strong>내 장소에 저장</strong>
                  <p>내 장소 목록에 저장됩니다.</p>
                </div>
              </button>
              <button className="gpt-sheet-item" onClick={() => { setSaveSheetPlace(null); setBuilderStep(1); setIsBuilderOpen(true); }}>
                <Plus size={18} />
                <div>
                  <strong>새 코스 만들기</strong>
                  <p>이 장소로 새로운 코스를 시작합니다.</p>
                </div>
              </button>
              <button className="gpt-sheet-cancel" onClick={() => setSaveSheetPlace(null)}>취소</button>
            </div>
          </div>
        )}

        {/* 4단계 코스 생성 모달 (시안 3) */}
        {isBuilderOpen && (
          <div className="gpt-modal-overlay">
            <div className="gpt-builder-modal">
              <div className="gpt-builder-header">
                <button onClick={() => setBuilderStep(Math.max(1, builderStep - 1))}><ArrowLeft size={18} /></button>
                <span>코스 만들기 ({builderStep}/4)</span>
                <button onClick={() => setIsBuilderOpen(false)}><X size={18} /></button>
              </div>

              {builderStep === 1 && (
                <div className="gpt-builder-step">
                  <h3>코스 이름을 정해주세요</h3>
                  <Input value={builderTitle} onChange={(e) => setBuilderTitle(e.target.value)} placeholder="예: 부산 1박 2일 맛집 투어" />
                </div>
              )}

              {builderStep === 2 && (
                <div className="gpt-builder-step">
                  <h3>장소를 확인하고 순서를 정하세요</h3>
                  <div className="gpt-builder-places">
                    {builderPlaces.map((p, idx) => (
                      <div key={p.id} className="gpt-builder-place-row">
                        <span>{idx + 1}</span>
                        <img src={p.image} alt="" />
                        <div><strong>{p.name}</strong><p>{p.address}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {builderStep === 3 && (
                <div className="gpt-builder-step">
                  <h3>방문 시간과 예산을 설정하세요</h3>
                  <div className="gpt-builder-time-card">
                    <strong>{builderPlaces[0]?.name}</strong>
                    <div className="gpt-time-row">
                      <span>방문 시간</span>
                      <input type="time" defaultValue="14:00" />
                    </div>
                    <div className="gpt-time-row">
                      <span>예상 비용</span>
                      <input type="text" defaultValue="10,000원" />
                    </div>
                  </div>
                </div>
              )}

              {builderStep === 4 && (
                <div className="gpt-builder-step">
                  <h3>코스 전체 확인</h3>
                  <div className="gpt-review-box">
                    <h4>{builderTitle}</h4>
                    <p>장소 {builderPlaces.length}곳 · 총 예상 비용 75,000원</p>
                  </div>
                </div>
              )}

              <div className="gpt-builder-footer">
                <button
                  className="gpt-btn-primary w-full"
                  onClick={() => {
                    if (builderStep < 4) setBuilderStep(builderStep + 1);
                    else {
                      setIsBuilderOpen(false);
                      setTab("courses");
                      toast.success("코스가 성공적으로 저장되었습니다!");
                    }
                  }}
                >
                  {builderStep === 4 ? "저장하기" : "다음"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 코스 상세 / 일정 보기 (시안 1, 3) */}
        {selectedCourse && (
          <div className="gpt-modal-overlay">
            <div className="gpt-detail-modal">
              <button className="gpt-modal-close" onClick={() => setSelectedCourse(null)}><X size={18} /></button>
              <div className="gpt-detail-hero" style={{ backgroundImage: `url(${selectedCourse.image})` }}>
                <div className="gpt-detail-hero-content">
                  <span>{selectedCourse.region} · {selectedCourse.days}일 일정</span>
                  <h2>{selectedCourse.title}</h2>
                  <p>by {selectedCourse.author}</p>
                </div>
              </div>
              <div className="gpt-timeline">
                <h3>하루의 흐름</h3>
                {selectedCourse.items.map((item: any, idx: number) => (
                  <div key={idx} className="gpt-timeline-row">
                    <div className="gpt-time-col">
                      <strong>{item.time}</strong>
                      <span>도착</span>
                    </div>
                    <div className="gpt-timeline-node">
                      <span className="node-num">{idx + 1}</span>
                      {idx < selectedCourse.items.length - 1 && <span className="node-line" />}
                    </div>
                    <div className="gpt-timeline-card">
                      <img src={item.image} alt="" />
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.duration} · {item.cost.toLocaleString()}원</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="gpt-detail-footer">
                <Button className="gpt-btn-primary w-full" onClick={() => { setSelectedCourse(null); toast.success("내 코스에 저장되었습니다."); }}>
                  내 코스로 저장
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
