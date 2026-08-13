// src/lib/types.ts
// Route 앱 전역에서 사용하는 타입 정의

export type PlaceCategory =
  | "cafe"
  | "restaurant"
  | "nature"
  | "culture"
  | "activity"
  | "stay"
  | "shopping";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  region: string; // 예: "제주", "부산", "서울"
  lat: number;
  lng: number;
  imageUrl: string;
  rating: number; // 0 ~ 5
  reviewCount: number;
  description?: string;
  tags?: string[];
}

export interface CourseStop {
  order: number;
  place: Place;
  day?: number; // 몇째 날 일정인지 (1부터 시작). 없으면 1일차로 취급합니다.
  time?: string; // 예: "09:00" — 일정표에 표시되는 방문 시각
  memo?: string;
  stayMinutes?: number;
}

export type TransportMode = "car" | "walk" | "transit" | "bicycle";

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  region: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  stops: CourseStop[];
  durationDays: number;
  startDate?: string; // ISO date, 예: "2026-08-10"
  endDate?: string; // ISO date
  budgetWon?: number; // 예상 비용(원)
  totalDistanceKm?: number; // 예상 이동 거리
  transportMode?: TransportMode;
  tags: string[];
  likeCount: number;
  saveCount: number;
  isPublic: boolean;
  createdAt: number; // epoch millis
  updatedAt: number;
}

export interface FeedPost {
  id: string;
  courseId: string;
  course?: Course;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  location?: string; // 예: "부산" — 헤더에 표시되는 지역
  images: string[];
  caption: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  courseCount: number;
  createdAt: number;
}

export type BottomNavKey = "home" | "map" | "courses" | "mypage";

// ---------- 알림(Notification) ----------
export type NotificationType = "like" | "comment" | "follow" | "course" | "travel";
export type NotificationTargetType = "course" | "post" | "user";

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  actorPhotoURL: string;
  type: NotificationType;
  targetId: string;
  targetType: NotificationTargetType;
  message: string;
  isRead: boolean;
  createdAt: number; // epoch millis
}

// ---------- 여행 기록(Travel Log) ----------
// TravelNavigator(지도 따라가기)에서 여행을 완료하면 자동으로 하나씩 쌓이는 기록.
export interface TravelLogStop {
  order: number;
  place: Place;
  day?: number; // 몇 일차 방문인지 (CourseStop.day와 동일한 의미). 없으면 1일차로 취급합니다.
}

export interface TravelLog {
  id: string;
  courseId: string;
  courseTitle: string;
  coverImageUrl: string;
  authorId: string;
  startedAt: number; // epoch millis — 여행 시작 시각
  endedAt: number | null; // epoch millis — 여행 종료(완료) 시각
  distanceMeters: number; // 실시간 위치 추적으로 누적된 실제 이동 거리
  visitedPlaceCount: number;
  totalPlaceCount: number;
  memo: string;
  photoUrls: string[];
  isCompleted: boolean;
  stops: TravelLogStop[]; // 타임라인 표시용, 방문 순서(order)대로
  createdAt: number;
}

// ---------- 디자인 시스템: 카테고리별 컬러 ----------
// PlaceCard, CourseDetailSheet의 일정 타임라인 등에서 카테고리 아이콘 색상을 통일하기 위한 메타데이터.
// 아이콘 자체(lucide-react)는 사용하는 컴포넌트에서 지정합니다.
export interface CategoryMeta {
  label: string;
  color: string; // 아이콘/포인트 컬러
  bg: string; // 아이콘 배경(연한 톤)
}

export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  stay: { label: "숙소", color: "#FF6891", bg: "#FFE8EF" },
  restaurant: { label: "음식", color: "#FF9F5A", bg: "#FFF1E6" },
  cafe: { label: "카페", color: "#4CB88F", bg: "#E8F7F1" },
  nature: { label: "자연", color: "#6BCCFF", bg: "#EAF7FF" },
  culture: { label: "관광", color: "#8C7CFF", bg: "#F1EEFF" },
  activity: { label: "액티비티", color: "#FFC542", bg: "#FFF7E3" },
  shopping: { label: "쇼핑", color: "#B892FF", bg: "#F5EFFF" },
};

// ---------- 여행 상태(진행 예정 / 여행 중 / 완료) ----------
export type TripStatus = "upcoming" | "ongoing" | "done";

export function getTripStatus(course: Pick<Course, "startDate" | "endDate">): TripStatus {
  if (!course.startDate) return "upcoming";
  const today = new Date().toISOString().slice(0, 10);
  const start = course.startDate;
  const end = course.endDate ?? course.startDate;
  if (today < start) return "upcoming";
  if (today > end) return "done";
  return "ongoing";
}

export function getDDayLabel(course: Pick<Course, "startDate" | "endDate">): string {
  if (!course.startDate) return "";
  const status = getTripStatus(course);
  if (status === "ongoing") return "여행 중";
  if (status === "done") return "완료";
  const diffDays = Math.ceil(
    (new Date(course.startDate).getTime() - new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  return diffDays === 0 ? "D-DAY" : `D-${diffDays}`;
}
