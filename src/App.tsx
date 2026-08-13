// src/App.tsx
// Route 앱의 루트 컴포넌트. 인증 상태, MVP 하단 목적지, 상세 오버레이를 관리합니다.
// 지도에서 담은 장소(draftPlaces)는 코스 만들기 화면으로 전달합니다.

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import BottomNav from "./components/BottomNav";
import CourseDetailScreen from "./screens/CourseDetailScreen";
import PlaceDetailScreen from "./screens/PlaceDetailScreen";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import CreateScreen from "./screens/CreateScreen";
import MyPageScreen from "./screens/MyPageScreen";
import LoginScreen from "./screens/LoginScreen";
import TravelNavigatorScreen from "./screens/TravelNavigatorScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import FollowListScreen from "./screens/FollowListScreen";
import type { BottomNavKey, Place } from "./lib/types";
import { MapPin } from "lucide-react";

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<BottomNavKey>("home");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [draftPlaces, setDraftPlaces] = useState<Place[]>([]);
  const [travelCourseId, setTravelCourseId] = useState<string | null>(null);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [followListRequest, setFollowListRequest] = useState<{
    userId: string;
    kind: "followers" | "following";
  } | null>(null);

  const openCourse = (courseId: string) => setSelectedCourseId(courseId);
  const startTravel = (courseId: string) => setTravelCourseId(courseId);
  const openProfile = (userId: string) => setViewingProfileUserId(userId);
  const openFollowList = (userId: string, kind: "followers" | "following") =>
    setFollowListRequest({ userId, kind });

  const selectTab = (nextTab: BottomNavKey) => {
    setIsCreateOpen(false);
    setTab(nextTab);
  };

  const openCreate = () => setIsCreateOpen(true);

  // 공유 링크(`/course/{courseId}`)로 들어왔을 때, 해당 코스 상세 화면으로 바로 이동시킵니다.
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
      {!isCreateOpen && tab === "home" && (
        <HomeScreen
          userName={profile?.displayName}
          onOpenCourse={openCourse}
          onOpenProfile={openProfile}
        />
      )}
      {!isCreateOpen && tab === "map" && (
        <MapScreen
          onOpenCourse={openCourse}
          draftPlaces={draftPlaces}
          onToggleDraftPlace={toggleDraftPlace}
          onGoToCreate={openCreate}
        />
      )}
      {!isCreateOpen && tab === "courses" && (
        <MyPageScreen mode="courses" onOpenCourse={openCourse} />
      )}
      {!isCreateOpen && tab === "mypage" && (
        <MyPageScreen mode="profile" onOpenCourse={openCourse} />
      )}
      {isCreateOpen && (
        <CreateScreen
          draftPlaces={draftPlaces}
          onViewCourses={() => {
            setIsCreateOpen(false);
            setTab("courses");
          }}
        />
      )}

      <BottomNav active={tab} onChange={selectTab} onCreateCourse={openCreate} />

      <CourseDetailScreen
        courseId={selectedCourseId}
        onClose={() => setSelectedCourseId(null)}
        onStartTravel={startTravel}
        onOpenProfile={openProfile}
        onOpenPlace={(place) => setSelectedPlace(place)}
      />

      <PlaceDetailScreen
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        onAddToCourse={(place) => {
          setDraftPlaces((prev) =>
            prev.some((item) => item.id === place.id) ? prev : [...prev, place]
          );
          setSelectedPlace(null);
          setIsCreateOpen(true);
        }}
      />

      {travelCourseId && (
        <TravelNavigatorScreen courseId={travelCourseId} onClose={() => setTravelCourseId(null)} />
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
