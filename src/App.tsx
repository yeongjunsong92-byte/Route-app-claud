// src/App.tsx
// Route 앱의 루트 컴포넌트. 인증 상태에 따라 로그인 화면 또는 메인 탭 화면을 렌더링합니다.
// 지도 화면에서 담은 장소(draftPlaces)를 코스 만들기 화면으로 전달하는 상태를 여기서 관리합니다.

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import BottomNav from "./components/BottomNav";
import CourseDetailScreen from "./screens/CourseDetailScreen";
import PlaceDetailScreen from "./screens/PlaceDetailScreen";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import CreateScreen from "./screens/CreateScreen";
import FeedScreen from "./screens/FeedScreen";
import MyPageScreen from "./screens/MyPageScreen";
import LoginScreen from "./screens/LoginScreen";
import TravelNavigatorScreen from "./screens/TravelNavigatorScreen";
import TravelLogListScreen from "./screens/TravelLogListScreen";
import TravelLogDetailScreen from "./screens/TravelLogDetailScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import FollowListScreen from "./screens/FollowListScreen";
import AIRecommendScreen from "./screens/AIRecommendScreen";
import type { BottomNavKey, Place } from "./lib/types";
import { MapPin } from "lucide-react";

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<BottomNavKey>("home");
  // 코스 상세는 항상 courseId만 들고 있고, CourseDetailSheet가 내부에서 직접 Firestore를 조회합니다.
  // (예전엔 화면마다 이미 로드된 Course 객체를 넘기거나, dummy 데이터에서 courseId를 찾는 식으로
  // 제각각이라 FeedScreen에서 열면 아무 반응이 없는 버그가 있었습니다.)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [draftPlaces, setDraftPlaces] = useState<Place[]>([]);
  // "이 코스로 여행 시작하기"로 진입한 지도 따라가기(TravelNavigator) 화면의 대상 코스 id
  const [travelCourseId, setTravelCourseId] = useState<string | null>(null);
  // 마이페이지 "여행 기록" 메뉴로 진입한 목록/상세 화면 상태
  const [travelLogListOpen, setTravelLogListOpen] = useState(false);
  const [selectedTravelLogId, setSelectedTravelLogId] = useState<string | null>(null);
  // 사용자 프로필 / 팔로워·팔로잉 목록 화면 상태
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [followListRequest, setFollowListRequest] = useState<{
    userId: string;
    kind: "followers" | "following";
  } | null>(null);
  // 마이페이지 "AI 여행 추천" 메뉴로 진입한 화면 상태
  const [aiRecommendOpen, setAiRecommendOpen] = useState(false);

  const openCourse = (courseId: string) => setSelectedCourseId(courseId);
  const startTravel = (courseId: string) => setTravelCourseId(courseId);
  const openProfile = (userId: string) => setViewingProfileUserId(userId);
  const openFollowList = (userId: string, kind: "followers" | "following") =>
    setFollowListRequest({ userId, kind });

  // 공유 링크(`/course/{courseId}`)로 들어왔을 때, 해당 코스 상세 화면으로 바로 이동시킵니다.
  // 별도 라우팅 라이브러리 없이 최초 진입 경로만 확인하는 최소한의 처리이며,
  // 기존 탭 기반 네비게이션 구조는 그대로 유지합니다.
  useEffect(() => {
    const match = window.location.pathname.match(/^\/course\/([^/]+)/);
    if (match) setSelectedCourseId(match[1]);
  }, []);

  // 공유 링크로 열었던 코스 상세를 닫으면, 주소를 다시 기본 경로로 되돌립니다.
  useEffect(() => {
    if (!selectedCourseId && window.location.pathname.startsWith("/course/")) {
      window.history.replaceState(null, "", "/");
    }
  }, [selectedCourseId]);

  const toggleDraftPlace = (place: Place) => {
    setDraftPlaces((prev) =>
      prev.some((p) => p.id === place.id)
        ? prev.filter((p) => p.id !== place.id)
        : [...prev, place]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary text-white">
          <MapPin size={22} />
        </div>
        <p className="text-sm text-gray-600">Route를 불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen">
      {tab === "home" && (
        <HomeScreen
          userName={profile?.displayName}
          onOpenCourse={openCourse}
          onOpenProfile={openProfile}
        />
      )}
      {tab === "map" && (
        <MapScreen
          onOpenCourse={openCourse}
          draftPlaces={draftPlaces}
          onToggleDraftPlace={toggleDraftPlace}
          onGoToCreate={() => setTab("create")}
        />
      )}
      {tab === "create" && <CreateScreen draftPlaces={draftPlaces} />}
      {tab === "feed" && <FeedScreen onOpenCourse={openCourse} onGoToMap={() => setTab("map")} />}
      {tab === "mypage" && (
        <MyPageScreen
          onOpenCourse={openCourse}
          onOpenTravelLogs={() => setTravelLogListOpen(true)}
          onOpenAIRecommend={() => setAiRecommendOpen(true)}
        />
      )}

      <BottomNav active={tab} onChange={setTab} />

      <CourseDetailScreen
        courseId={selectedCourseId}
        onClose={() => setSelectedCourseId(null)}
        onStartTravel={startTravel}
        onOpenProfile={openProfile}
        onOpenPlace={(place) => setSelectedPlace(place)}
      />

      <PlaceDetailScreen place={selectedPlace} onClose={() => setSelectedPlace(null)} />

      {travelCourseId && (
        <TravelNavigatorScreen courseId={travelCourseId} onClose={() => setTravelCourseId(null)} />
      )}

      {travelLogListOpen && (
        <TravelLogListScreen
          onClose={() => setTravelLogListOpen(false)}
          onOpenLog={(logId) => setSelectedTravelLogId(logId)}
        />
      )}

      {selectedTravelLogId && (
        <TravelLogDetailScreen
          logId={selectedTravelLogId}
          onClose={() => setSelectedTravelLogId(null)}
        />
      )}

      {viewingProfileUserId && (
        <UserProfileScreen
          userId={viewingProfileUserId}
          onClose={() => setViewingProfileUserId(null)}
          onOpenCourse={openCourse}
          onOpenFollowList={openFollowList}
        />
      )}

      {followListRequest && (
        <FollowListScreen
          userId={followListRequest.userId}
          kind={followListRequest.kind}
          onClose={() => setFollowListRequest(null)}
          onOpenProfile={(userId) => {
            setFollowListRequest(null);
            openProfile(userId);
          }}
        />
      )}

      {aiRecommendOpen && <AIRecommendScreen onClose={() => setAiRecommendOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
