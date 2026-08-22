// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ loading: false, isAuthenticated: true }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Route Tester" },
    loading: authState.loading,
    isAuthenticated: authState.isAuthenticated,
    logout: vi.fn(),
  }),
}));

vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/components/Map", () => ({
  MapView: ({ fallback, onMapReady, onMapClick }: { fallback?: React.ReactNode; onMapReady?: (map: any) => void; onMapClick?: () => void }) => {
    React.useEffect(() => {
      onMapReady?.({ panTo: () => undefined, setZoom: () => undefined, getZoom: () => 15 });
    }, []);
    return <div data-testid="map-view">{onMapClick && <button aria-label="지도 빈 영역" onClick={onMapClick} />}{fallback}</div>;
  },
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => <div {...props}>{children}</div>,
    section: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLElement> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => <section {...props}>{children}</section>,
  },
}));

vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  const query = () => ({ data: [], isLoading: false, isError: false });
  const ownedCourse = { id: 101, title: "성수 하루 코스", region: "서울", coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", startDate: null, endDate: null, status: "active", completedPlaceIds: "[\"p1\"]" };
  const ownedCourseDetail = { ...ownedCourse, items: [
    { placeId: "p1", name: "성수 식당", category: "맛집", address: "서울 성동구 연무장7길 5", lat: 37.544, lng: 127.056, hours: null, durationMinutes: 60, dayNumber: 1, visitTime: "14:00", estimatedCost: 10000 },
    { placeId: "p2", name: "오븐 성수", category: "카페", address: "서울 성동구 연무장길 7", lat: 37.545, lng: 127.057, durationMinutes: 60, dayNumber: 1, visitTime: "15:40", estimatedCost: 15000 },
    { placeId: "p3", name: "성수동 스테이크", category: "맛집", address: "서울 성동구 아차산로 403", lat: 37.547, lng: 127.058, durationMinutes: 90, dayNumber: 1, visitTime: "17:00", estimatedCost: 50000 },
  ] };
  const publishedCourse = { id: 201, ownerId: 2, title: "제주 2박 3일 힐링 코스", region: "제주", coverImage: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054", startDate: null, endDate: null, status: "planned", isPublic: true, authorName: "Route 여행자" };
  const publishedCourseDetail = { ...publishedCourse, items: [
    { placeId: "jeju-1", name: "협재 해수욕장", category: "관광지", address: "제주 제주시 한림읍 협재리", lat: 33.394, lng: 126.239, durationMinutes: 60, dayNumber: 1, visitTime: "10:00", estimatedCost: 0 },
    { placeId: "jeju-2", name: "애월 카페거리", category: "카페", address: "제주 제주시 애월읍", lat: 33.463, lng: 126.31, durationMinutes: 90, dayNumber: 1, visitTime: "12:30", estimatedCost: 15000 },
    { placeId: "jeju-3", name: "오설록 티 뮤지엄", category: "관광지", address: "제주 서귀포시 안덕면", lat: 33.306, lng: 126.289, durationMinutes: 60, dayNumber: 2, visitTime: "15:00", estimatedCost: 12000 },
    { placeId: "jeju-4", name: "애월 해안도로", category: "관광지", address: "제주 제주시 애월읍", lat: 33.461, lng: 126.309, durationMinutes: 60, dayNumber: 2, visitTime: "17:30", estimatedCost: 0 },
  ] };
  const savedPlacesQuery = () => ({ data: [{ id: 1, placeId: "saved-test-place", name: "테스트 저장 장소", category: "카페", address: "서울 성동구 테스트길 1", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", lat: 37.546, lng: 127.059 }], isLoading: false, isError: false });
  return {
    trpc: {
      places: { toggleSaved: { useMutation: mutation }, updateRecord: { useMutation: mutation }, uploadPersonalPhoto: { useMutation: mutation }, saved: { useQuery: savedPlacesQuery } },
      people: { discover: { useQuery: query }, following: { useQuery: query }, profile: { useQuery: query }, toggleFollow: { useMutation: mutation } },
      courses: { create: { useMutation: mutation }, update: { useMutation: mutation }, start: { useMutation: mutation }, updateProgress: { useMutation: () => ({ mutateAsync: vi.fn().mockResolvedValue({ courseId: 101, completedPlaceIds: ["p1", "p2", "p3"], status: "completed", completedAt: new Date("2026-08-22T00:00:00.000Z") }), isPending: false }) }, updateTravelRecord: { useMutation: mutation }, uploadTravelPhoto: { useMutation: mutation }, appendPlace: { useMutation: mutation }, uploadPhoto: { useMutation: mutation }, clonePublic: { useMutation: mutation }, mine: { useQuery: () => ({ data: [ownedCourse], isLoading: false, isError: false }) }, saved: { useQuery: query }, public: { useQuery: () => ({ data: [publishedCourse], isLoading: false, isError: false }) }, followingPublic: { useQuery: () => ({ data: [publishedCourse], isLoading: false, isError: false }) }, get: { useQuery: (input: { courseId: number }) => ({ data: input.courseId === 101 ? ownedCourseDetail : input.courseId === 201 ? publishedCourseDetail : null, isLoading: false, isError: false }) } },
      auth: { updateProfile: { useMutation: mutation } },
      useUtils: () => ({ courses: { mine: { invalidate: vi.fn() }, get: { invalidate: vi.fn() }, public: { invalidate: vi.fn() }, followingPublic: { invalidate: vi.fn() } }, people: { discover: { invalidate: vi.fn() }, following: { invalidate: vi.fn() }, profile: { invalidate: vi.fn() } }, places: { saved: { invalidate: vi.fn() } } }),
    },
  };
});

import Home from "./Home";

beforeEach(() => {
  window.localStorage.setItem("route-map-tutorial-completed", "true");
});

afterEach(() => {
  cleanup();
  authState.loading = false;
  authState.isAuthenticated = true;
  window.localStorage.removeItem("route-recent-place-searches");
  window.localStorage.removeItem("route-recent-map-regions");
  window.localStorage.removeItem("route-navigation-origin-favorites");
  window.localStorage.removeItem("route-navigation-recent-destinations");
  window.localStorage.removeItem("route-map-tutorial-completed");
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

function getPlaceMainButton(name: string) {
  const placeRow = screen.getByRole("group", { name: `${name} 장소 작업` });
  const button = placeRow.querySelector<HTMLButtonElement>(".route-place-main");
  if (!button) throw new Error(`${name} 장소 행의 상세 버튼을 찾을 수 없습니다.`);
  return button;
}

describe("home place search flow", () => {
  it("keeps the Home hook order stable and shows a map transition loader when authentication loading finishes", () => {
    authState.loading = true;
    const { rerender } = render(<Home />);
    expect(screen.getByText("Route를 준비하고 있습니다.")).toBeTruthy();

    authState.loading = false;
    rerender(<Home />);

    expect(screen.getByTestId("map-view")).toBeTruthy();
    expect(screen.getByRole("status", { name: "지도를 준비하고 있습니다" })).toBeTruthy();
  });

  it("opens the map search screen when the home search bar is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(await screen.findByRole("button", { name: "장소 검색" }));

    expect(screen.getByRole("heading", { name: "장소 검색" })).toBeTruthy();
    expect(screen.getByPlaceholderText("성수 맛집")).toBeTruthy();
  });

  it("opens place navigation safely when the map emits a navigation event", async () => {
    render(<Home />);

    window.dispatchEvent(new CustomEvent("route:navigate-place", {
      detail: { id: "event-place", name: "이벤트 목적지", category: "관광지", address: "서울 성동구 테스트길 1", image: "", description: "", lat: 37.544, lng: 127.056, hours: "", phone: "" },
    }));

    expect(await screen.findByRole("heading", { name: "길찾기" })).toBeTruthy();
    expect(screen.getByText("이벤트 목적지")).toBeTruthy();
  });

  it("opens the place detail directly when a map pin is selected", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    expect(container.querySelector(".route-map-marker.is-selected")).toBeTruthy();
    expect(container.querySelector(".route-map-place-preview")).toBeNull();
    expect(await screen.findByRole("heading", { name: "성수 식당" })).toBeTruthy();
  });

  it("opens navigation directly from a place result without visiting the detail screen", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "성수 식당 길찾기" }));
    expect(screen.getByRole("heading", { name: "길찾기" })).toBeTruthy();
    expect(screen.getByText("네이버 내비에서 길안내를 시작하세요")).toBeTruthy();
  });

  it("keeps navigation available from the detail page opened by a map pin", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    expect(container.querySelector(".route-map-place-preview")).toBeNull();
    expect(await screen.findByRole("heading", { name: "성수 식당" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "성수 식당 네이버 내비" }));
    expect(screen.getByRole("dialog", { name: "네이버 내비 출발 확인" })).toBeTruthy();
  });

  it("expands and fully collapses the nearby-place sheet with vertical drags", () => {
    const { container } = render(<Home />);
    const dragZone = container.querySelector(".route-sheet-drag-zone") as HTMLDivElement;

    fireEvent.pointerDown(dragZone, { pointerId: 1, clientY: 420 });
    fireEvent.pointerUp(dragZone, { pointerId: 1, clientY: 350 });
    expect(container.querySelector(".route-map-sheet")?.className).toContain("is-expanded");

    fireEvent.pointerDown(dragZone, { pointerId: 2, clientY: 350 });
    fireEvent.pointerUp(dragZone, { pointerId: 2, clientY: 420 });
    expect(container.querySelector(".route-map-sheet")?.className).toContain("is-peek");

    const secondDragZone = container.querySelector(".route-sheet-drag-zone") as HTMLDivElement;
    fireEvent.pointerDown(secondDragZone, { pointerId: 3, clientY: 420 });
    fireEvent.pointerUp(secondDragZone, { pointerId: 3, clientY: 500 });
    expect(container.querySelector(".route-map-sheet")).toBeNull();
  });

  it("collapses and expands the top map category controls without changing the selected category", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "지도 카테고리 접기" }));
    expect(screen.getByRole("button", { name: "지도 카테고리 펼치기" })).toBeTruthy();
    expect(container.querySelector("#map-category-filter")).toBeNull();

    await user.click(screen.getByRole("button", { name: "지도 카테고리 펼치기" }));
    const categoryFilter = container.querySelector("#map-category-filter") as HTMLElement;
    expect(categoryFilter).toBeTruthy();
    expect(within(categoryFilter).getByRole("button", { name: "전체" }).className).toContain("active");
  });

  it("collapses and expands nearby-sheet categories while preserving the selected category", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "주변 추천 카테고리 접기" }));
    expect(screen.getByRole("button", { name: "주변 추천 카테고리 펼치기" })).toBeTruthy();
    expect(container.querySelector("#nearby-category-tabs")).toBeNull();

    await user.click(screen.getByRole("button", { name: "주변 추천 카테고리 펼치기" }));
    const nearbyTabs = container.querySelector("#nearby-category-tabs") as HTMLElement;
    expect(nearbyTabs).toBeTruthy();
    expect(within(nearbyTabs).getByRole("tab", { name: "추천" }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens the detail page from a map pin without restoring the removed floating card", async () => {
    const { container } = render(<Home />);
    const marker = () => screen.getAllByRole("button", { name: "성수 식당" })[0];

    fireEvent.click(marker());
    expect(container.querySelector(".route-map-place-preview")).toBeNull();
    expect(await screen.findByRole("heading", { name: "성수 식당" })).toBeTruthy();
  });

  it("restores the full-map category state after returning from a pin detail", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "지도 빈 영역" }));
    const categoryFilter = container.querySelector(".route-map-screen.is-map-fullscreen #map-category-filter") as HTMLElement;
    await user.click(within(categoryFilter).getByRole("button", { name: "맛집" }));
    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    await screen.findByRole("heading", { name: "성수 식당" });

    await user.click(screen.getByRole("button", { name: "지도 화면으로 돌아가기" }));
    const restoredCategoryFilter = container.querySelector(".route-map-screen.is-map-fullscreen #map-category-filter") as HTMLElement;
    expect(restoredCategoryFilter).toBeTruthy();
    expect(within(restoredCategoryFilter).getByRole("button", { name: "맛집" }).className).toContain("active");
  });

  it("shows the redesigned travel management page and opens saved places", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "마이" }));
    expect(screen.getByText("MY ROUTE")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "내 여행 관리" })).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: /내 장소/ })[0]);
    expect(screen.getByRole("heading", { name: "내 장소" })).toBeTruthy();
  });

  it("opens my courses, saved courses, and profile management from my page", async () => {
    const user = userEvent.setup();
    let view = render(<Home />);

    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getAllByRole("button", { name: /내 코스/ })[0]);
    expect(screen.getByRole("heading", { name: "내 코스" })).toBeTruthy();

    view.unmount();
    view = render(<Home />);
    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getByRole("button", { name: /저장한 코스/ }));
    expect(screen.getByRole("heading", { name: "저장 코스" })).toBeTruthy();

    view.unmount();
    view = render(<Home />);
    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getByRole("button", { name: "프로필 수정" }));
    expect(screen.getByRole("heading", { name: "프로필" })).toBeTruthy();
  });

  it("shows recent searches and applies a selected term to the search input", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("route-recent-place-searches", JSON.stringify(["성수 카페", "서울숲"]));
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "장소 검색" })[0]);
    expect(screen.getByRole("heading", { name: "최근 검색어" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^성수 카페$/ }));
    expect((screen.getByPlaceholderText("성수 맛집") as HTMLInputElement).value).toBe("성수 카페");
  });

  it("removes individual and all recent searches while syncing local storage", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("route-recent-place-searches", JSON.stringify(["성수 카페", "서울숲"]));
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "장소 검색" })[0]);
    await user.click(screen.getByRole("button", { name: "성수 카페 삭제" }));
    expect(JSON.parse(window.localStorage.getItem("route-recent-place-searches") || "[]")).toEqual(["서울숲"]);
    expect(screen.queryByRole("button", { name: /^성수 카페$/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "최근 검색어 전체 삭제" }));
    expect(window.localStorage.getItem("route-recent-place-searches")).toBe("[]");
    expect(screen.queryByRole("heading", { name: "최근 검색어" })).toBeNull();
  });

  it("does not reveal saved-place quick actions above the map sheet", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "테스트 저장 장소" }));
    expect(container.querySelector(".route-map-place-preview")).toBeNull();
    expect(screen.queryByRole("button", { name: "현재 코스에 담기" })).toBeNull();
  });

  it("opens the detail page instead of expanding the map sheet after a pin is selected", async () => {
    const { container } = render(<Home />);
    fireEvent.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);

    expect(await screen.findByRole("heading", { name: "성수 식당" })).toBeTruthy();
    expect(container.querySelector(".route-map-sheet")).toBeNull();
  });

  it("separates the place-detail map, photos, and Korean information sections", async () => {
    render(<Home />);
    fireEvent.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);

    expect(await screen.findByRole("region", { name: "장소 위치 지도" })).toBeTruthy();
    expect(screen.getByText("지도 위치")).toBeTruthy();
    expect(screen.getByRole("region", { name: "장소 사진" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "사진" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "장소 소개" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "지도 화면으로 돌아가기" })).toBeTruthy();
    expect(screen.getByText("네이버 지도에서 장소 보기")).toBeTruthy();
  });

  it("opens location-permission guidance when the browser denies current location", async () => {
    const user = userEvent.setup();
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1, PERMISSION_DENIED: 1 } as never),
      },
    });

    try {
      render(<Home />);
      expect(await screen.findByRole("heading", { name: "현재 위치 권한이 필요합니다" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "지역 선택" }));
      expect(screen.getByRole("region", { name: "지역 직접 선택" })).toBeTruthy();
      expect(screen.getByRole("textbox", { name: "지역 검색" })).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeolocation });
    }
  });

  it("automatically replaces the bottom sheet with distance-sorted nearby recommendations after current location is allowed", async () => {
    const user = userEvent.setup();
    const originalGeolocation = navigator.geolocation;
    const originalGoogle = (window as typeof window & { google?: unknown }).google;
    class Marker {
      setMap = vi.fn();
      addListener = vi.fn();
    }
    class PlacesService {
      nearbySearch = vi.fn((_request: unknown, callback: (results: unknown[], status: string) => void) => callback([
        { place_id: "near-far", name: "조금 먼 카페", types: ["cafe"], vicinity: "서울 성동구", geometry: { location: { lat: () => 37.570, lng: () => 127.080 } } },
        { place_id: "near-close", name: "가까운 카페", types: ["cafe"], vicinity: "서울 성동구", geometry: { location: { lat: () => 37.566, lng: () => 127.078 } } },
      ], "OK"));
      getDetails = vi.fn((request: { placeId?: string }, callback: (result: unknown, status: string) => void) => callback(request.placeId === "near-close" ? { opening_hours: { isOpen: () => true, weekday_text: ["월요일: 09:00–20:00", "화요일: 09:00–20:00", "수요일: 09:00–20:00", "목요일: 09:00–20:00", "금요일: 09:00–20:00", "토요일: 10:00–18:00", "일요일: 휴무"] }, rating: 4.6, user_ratings_total: 235 } : { opening_hours: { isOpen: () => true }, rating: 4.6, user_ratings_total: 235 }, "OK"));
    }
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 37.565, longitude: 127.077 } } as GeolocationPosition) },
    });
    Object.defineProperty(window, "google", {
      configurable: true,
      value: { maps: { Marker, Size: class {}, Point: class {}, places: { PlacesService, PlacesServiceStatus: { OK: "OK" } } } },
    });
    try {
      render(<Home />);
      await waitFor(() => expect(screen.getByText("현재 위치 주변 여행지·음식점·카페 추천")).toBeTruthy());
      const recommendationRows = screen.getAllByRole("group", { name: /장소 작업/ });
      expect(recommendationRows.map((row) => row.getAttribute("aria-label"))).toEqual(["가까운 카페 장소 작업", "조금 먼 카페 장소 작업"]);
      expect(screen.getAllByText(/리뷰 235/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/09:00–20:00/)).toBeNull();
      expect(within(screen.getByRole("group", { name: "조금 먼 카페 장소 작업" })).queryByText(/영업 중/)).toBeNull();
      expect(screen.getByRole("tablist", { name: "주변 장소 카테고리" })).toBeTruthy();
      await user.click(screen.getByRole("tab", { name: "여행지" }));
      await waitFor(() => expect(screen.getByText("현재 위치 주변 여행지 추천")).toBeTruthy());
      expect(screen.getByRole("tab", { name: "여행지" }).getAttribute("aria-selected")).toBe("true");
    } finally {
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeolocation });
      Object.defineProperty(window, "google", { configurable: true, value: originalGoogle });
    }
  });

  it("toggles distance and open-now discovery controls from the map sheet", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /거리순/ }));
    expect(screen.getByRole("button", { name: /거리순 ON/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "현재 영업 중" }));
    expect(screen.getByRole("button", { name: "현재 영업 중" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("현재 영업 중인 장소가 없습니다")).toBeTruthy();
  });

  it("opens the place photo gallery and exposes the Naver reservation and inquiry link", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(getPlaceMainButton("성수 식당"));
    expect(screen.getByRole("link", { name: /네이버에서 예약 찾기/ }).getAttribute("href")).toContain("https://search.naver.com/search.naver");
    expect(screen.getByRole("link", { name: /네이버 지도에서 장소 보기/ }).getAttribute("href")).toContain("https://map.naver.com/p/search/");

    await user.click(screen.getByRole("button", { name: "성수 식당 사진 1 확대" }));
    expect(screen.getByRole("dialog", { name: "성수 식당 사진 갤러리" })).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다음 사진" }));
    expect(screen.getByText("2 / 3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "이전 사진" }));
    expect(screen.getByText("1 / 3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "사진 갤러리 닫기" }));
    expect(screen.queryByRole("dialog", { name: "성수 식당 사진 갤러리" })).toBeNull();
  });

  it("opens a distance-only overview and prioritizes Naver navigation with a website fallback", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(getPlaceMainButton("성수 식당"));
    await user.click(screen.getByRole("button", { name: "성수 식당 네이버 내비" }));

    expect(screen.getByRole("dialog", { name: "네이버 내비 출발 확인" })).toBeTruthy();
    expect(screen.getByText("교통수단별 예상 시간")).toBeTruthy();
    expect(screen.getByRole("link", { name: /네이버 내비로 출발/ }).getAttribute("href")).toContain("nmap://navigation");
    expect(screen.queryByRole("link", { name: /Google Maps/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /카카오맵/ })).toBeNull();
  });

  it("sets a direct navigation origin, saves it as a favorite, and updates external directions", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "성수 식당 길찾기" }));
    await user.click(screen.getByRole("button", { name: "출발지 변경" }));
    await user.type(screen.getByRole("textbox", { name: "출발지 입력" }), "오븐 성수");
    await user.click(screen.getByRole("button", { name: "적용" }));

    expect(screen.getAllByText("오븐 성수").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("link", { name: /네이버 내비 열기/ }));
    expect(screen.getByRole("link", { name: /네이버 내비로 출발/ }).getAttribute("href")).toContain("slat=37.545&slng=127.0565");
    await user.click(screen.getByRole("button", { name: "출발지 변경" }));
    await user.click(screen.getByRole("button", { name: "현재 출발지 즐겨찾기 추가" }));

    expect(JSON.parse(window.localStorage.getItem("route-navigation-origin-favorites") || "[]")).toHaveLength(1);
    expect(container.querySelector(".route-navigation-favorites")).toBeTruthy();
  });

  it("opens the fixed place-detail Naver button into a destination confirmation sheet with travel-mode estimates", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(getPlaceMainButton("성수 식당"));
    await user.click(screen.getByRole("button", { name: "성수 식당 네이버 내비" }));

    expect(screen.getByRole("dialog", { name: "네이버 내비 출발 확인" })).toBeTruthy();
    expect(screen.getAllByText("서울 성동구 연무장7길 5").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /대중교통/ }));
    expect(screen.getByRole("button", { name: /대중교통/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: /네이버 내비로 출발/ }).textContent).toContain("대중교통 기준 선택됨");
  });

  it("offers Naver web directions in unsupported browser environments", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "성수 식당 길찾기" }));
    await user.click(screen.getByRole("link", { name: /네이버 내비 열기/ }));
    await user.click(screen.getByRole("button", { name: "네이버 내비 앱이 설치되어 있지 않나요?" }));

    expect(screen.getByRole("dialog", { name: "네이버 내비 설치 안내" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /네이버지도 웹에서 길찾기/ }).getAttribute("href")).toContain("map.naver.com/p/search/");
  });

  it("opens the Google Play installation page for Android navigation users", async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36" });
    const user = userEvent.setup();
    const toastMessage = vi.spyOn(toast, "message");
    try {
      render(<Home />);
      await user.click(screen.getByRole("button", { name: "성수 식당 길찾기" }));
      await user.click(screen.getByRole("link", { name: /네이버 내비 열기/ }));
      await user.click(screen.getByRole("button", { name: "네이버 내비 앱이 설치되어 있지 않나요?" }));

      expect(screen.getByRole("link", { name: /Google Play에서 네이버지도 설치/ }).getAttribute("href")).toContain("play.google.com/store/apps/details?id=com.nhn.android.nmap");
      fireEvent.click(screen.getByRole("link", { name: /Google Play에서 네이버지도 설치/ }));
      expect(toastMessage).toHaveBeenCalledWith("Google Play로 이동합니다.", expect.objectContaining({ description: expect.stringContaining("네이버지도를 설치한 뒤") }));
    } finally {
      Object.defineProperty(navigator, "userAgent", { configurable: true, value: originalUserAgent });
    }
  });

  it("stores a Naver destination for reuse and exposes map-based origin selection in the confirmation sheet", async () => {
    const user = userEvent.setup();
    const openNaverMap = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "성수 식당 길찾기" }));
    await user.click(screen.getByRole("link", { name: /네이버 내비 열기/ }));
    await user.click(screen.getByRole("button", { name: "지도에서 출발지 선택" }));

    expect(screen.getByRole("region", { name: "지도에서 출발지 선택" })).toBeTruthy();
    expect(screen.getByText("지도의 위치를 눌러 출발지를 선택하세요.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "네이버 내비 출발 확인 닫기" }));

    await user.click(screen.getByRole("link", { name: /네이버 내비 열기/ }));
    fireEvent.click(screen.getByRole("link", { name: /네이버 내비로 출발/ }));
    const storedDestinations = JSON.parse(window.localStorage.getItem("route-navigation-recent-destinations") || "[]");
    expect(storedDestinations[0].name).toBe("성수 식당");
    expect(storedDestinations[0].lastStartedAt).toEqual(expect.any(Number));
    expect(openNaverMap).toHaveBeenCalledWith(expect.stringContaining("map.naver.com/p/search/"), "_blank", "noopener,noreferrer");
    openNaverMap.mockRestore();

    await user.click(screen.getByRole("link", { name: /네이버 내비 열기/ }));
    expect(screen.getByRole("region", { name: "최근 목적지" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "성수 식당 최근 목적지 선택" })).toBeTruthy();
    expect(screen.getByText(/마지막 출발/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "성수 식당 최근 목적지 즐겨찾기 등록" }));
    expect(JSON.parse(window.localStorage.getItem("route-navigation-recent-destinations") || "[]")[0].isFavorite).toBe(true);
    expect(screen.getByRole("button", { name: "성수 식당 최근 목적지 즐겨찾기 해제" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "최근 목적지 관리" }));
    const managerDialog = screen.getByRole("dialog", { name: "최근 목적지 관리" });
    expect(managerDialog).toBeTruthy();
    await user.click(within(managerDialog).getByRole("button", { name: "성수 식당 최근 목적지 삭제" }));
    expect(JSON.parse(window.localStorage.getItem("route-navigation-recent-destinations") || "[]")).toHaveLength(0);
  });

  it("opens the direction-sharing sheet with link copy and KakaoTalk share actions", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "성수 식당 길찾기" }));
    await user.click(screen.getAllByRole("button", { name: "길찾기 공유" })[0]);

    expect(screen.getByRole("region", { name: "길찾기 공유" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "길찾기 링크 복사" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "카카오톡으로 길찾기 공유" })).toBeTruthy();
  });

  it("keeps the home screen free of the removed scheduled-course card", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    expect(screen.queryByText("지금 여행을 이어가세요.")).toBeNull();
    expect(screen.queryByRole("button", { name: "코스 보기" })).toBeNull();
  });

  it("keeps the home card free of the removed duplicate active-trip message", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    expect(screen.queryByText("진행 중인 코스를 이어가세요")).toBeNull();
  });

  it("opens the active route from the home card and lets a traveler create a place record", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(screen.getByRole("button", { name: /코스 이어가기/ }));

    expect(screen.getByText("시간, 순서, 실제 메모까지")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /성수 식당 기록 남기기/ }));
    expect(screen.getByRole("heading", { name: "성수 식당 기록" })).toBeTruthy();
  });

  it("returns to the active route instead of the map after using directions from an active course", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(screen.getByRole("button", { name: /코스 이어가기/ }));
    await user.click(screen.getByRole("button", { name: "길안내" }));
    expect(screen.getByRole("heading", { name: "길찾기" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "뒤로" }));
    expect(await screen.findByText("시간, 순서, 실제 메모까지")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "길찾기" })).toBeNull();
  });

  it("opens the completion celebration when the server confirms every place is complete", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(screen.getByRole("button", { name: /코스 이어가기/ }));
    await user.click(screen.getByRole("button", { name: "완료" }));

    expect(await screen.findByRole("dialog", { name: "코스 완료 축하" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /여행을 완주했어요/ })).toBeTruthy();
  });

  it("manages course dates and status while surfacing schedule conflicts", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(getPlaceMainButton("성수 식당"));
    await user.click(screen.getByRole("button", { name: "코스에 추가" }));
    await user.click(screen.getByRole("button", { name: /새 코스 만들기/ }));

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-03" } });
    await user.selectOptions(screen.getByLabelText("여행 상태"), "active");
    expect((screen.getByLabelText("여행 상태") as HTMLSelectElement).value).toBe("active");

    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.change(screen.getByLabelText("방문 시간"), { target: { value: "22:00" } });
    expect((screen.getByLabelText("방문 시간") as HTMLInputElement).value).toBe("22:00");
  });

  it("assigns a day and duration to a place while calculating the itinerary total", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(getPlaceMainButton("성수 식당"));
    await user.click(screen.getByRole("button", { name: "코스에 추가" }));
    await user.click(screen.getByRole("button", { name: /새 코스 만들기/ }));
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-03" } });
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    await user.selectOptions(screen.getByLabelText("성수 식당 일차"), "2");
    await user.selectOptions(screen.getByLabelText("성수 식당 체류 시간"), "90");
    expect(screen.getByText("전체 예상 소요시간")).toBeTruthy();
    expect(screen.getByText("Day 2 · 1시간 30분")).toBeTruthy();
  });

  it("recalculates travel time and applies a route recommendation after a mobile create-flow drag", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "+ 새 코스" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    const rows = Array.from(container.querySelectorAll<HTMLElement>(".route-draggable-place"));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows[0].textContent).toContain("성수 식당");
    const targetRow = rows[1];
    const elementFromPoint = vi.spyOn(document, "elementFromPoint").mockReturnValue(targetRow);

    fireEvent.pointerDown(rows[3].querySelector(".route-drag-handle") as SVGElement, { pointerId: 17, clientX: 120, clientY: 380 });
    fireEvent.pointerMove(document, { pointerId: 17, clientX: 120, clientY: 500 });
    fireEvent.pointerUp(document, { pointerId: 17, clientX: 120, clientY: 500 });

    expect(screen.getAllByRole("region", { name: "순서 변경에 따른 예상 이동시간" }).length).toBeGreaterThan(0);
    const applyButtons = screen.queryAllByRole("button", { name: /추천 순서 적용/ });
    if (applyButtons.length) await user.click(applyButtons[0]);
    expect(screen.getAllByText("현재 순서가 추천 동선과 같습니다.").length).toBeGreaterThan(0);
    elementFromPoint.mockRestore();
  });

  it("compares the current and recommended route before sharing or applying it", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "+ 새 코스" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(screen.getAllByRole("region", { name: "추천 동선 전후 비교" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("현재 순서").length).toBeGreaterThan(0);
    expect(screen.getAllByText("추천 순서").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "추천 동선 공유" }).length).toBeGreaterThan(0);
  });

  it("recalculates travel time and applies a route recommendation after a mobile edit-flow drag", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "코스 수정" }));
    await screen.findByText("일정 장소 3곳");

    const rows = Array.from(container.querySelectorAll<HTMLElement>(".route-edit-place-row"));
    const elementFromPoint = vi.spyOn(document, "elementFromPoint").mockReturnValue(rows[1]);
    fireEvent.pointerDown(rows[2].querySelector("b") as HTMLElement, { pointerId: 19, clientX: 120, clientY: 380 });
    fireEvent.pointerMove(document, { pointerId: 19, clientX: 120, clientY: 500 });
    fireEvent.pointerUp(document, { pointerId: 19, clientX: 120, clientY: 500 });

    expect(screen.getAllByRole("region", { name: "순서 변경에 따른 예상 이동시간" }).length).toBeGreaterThan(0);
    const applyButtons = screen.queryAllByRole("button", { name: /추천 순서 적용/ });
    if (applyButtons.length) await user.click(applyButtons[0]);
    expect(screen.getAllByText("현재 순서가 추천 동선과 같습니다.").length).toBeGreaterThan(0);
    elementFromPoint.mockRestore();
  });

  it("separates a public course itinerary into day tabs", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));
    expect(screen.getByRole("tab", { name: /Day 1/ })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /Day 2/ }));
    expect(screen.getByText("오설록 티 뮤지엄")).toBeTruthy();
    expect(screen.queryByText("협재 해수욕장")).toBeNull();
    expect(screen.getByRole("region", { name: "장소 간 예상 이동시간" })).toBeTruthy();
    expect(screen.getByText("Day 2 이동 경로만 지도에 강조하고 있어요.")).toBeTruthy();
  });

  it("opens the course sharing sheet with link copy and image export actions", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));
    await user.click(screen.getByRole("button", { name: "코스 공유" }));

    expect(screen.getByRole("region", { name: "코스 공유" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "공유 링크 복사" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Instagram Story용 이미지 다운로드" })).toBeTruthy();
  });

  it("copies a public course through the OG preview sharing URL", async () => {
    const user = userEvent.setup();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));
    await user.click(screen.getByRole("button", { name: "코스 공유" }));
    await user.click(screen.getByRole("button", { name: "공유 링크 복사" }));

    expect(prompt).toHaveBeenCalledWith("공유 링크를 복사하세요.", expect.stringContaining("/share/course/201"));
  });

  it("shows the expected travel time inside the selected day timeline", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));

    expect(screen.getByLabelText("협재 해수욕장에서 다음 장소까지 예상 이동시간").textContent).toContain("이동");
  });

  it("opens a shared saved course from a course query link", async () => {
    window.history.replaceState({}, "", "/?course=101");
    render(<Home />);

    expect((await screen.findAllByRole("heading", { name: "성수 하루 코스" })).length).toBeGreaterThan(0);
    expect(screen.getByText("Day 1 이동 경로만 지도에 강조하고 있어요.")).toBeTruthy();
  });

  it("opens a shared public course from its course query link", async () => {
    window.history.replaceState({}, "", "/?course=201");
    render(<Home />);

    expect((await screen.findAllByRole("heading", { name: "제주 2박 3일 힐링 코스" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "코스 공유" })).toBeTruthy();
  });

  it("exports a shared course as a 9:16 Story PNG image", async () => {
    const user = userEvent.setup();
    class FailedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 0;
      height = 0;
      crossOrigin = "";
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    }
    vi.stubGlobal("Image", FailedImage);
    const drawContext = { fillStyle: "", font: "", fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), fillText: vi.fn(), arc: vi.fn(), drawImage: vi.fn(), createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })) } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(drawContext);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,route");
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(null));
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));
    await user.click(screen.getByRole("button", { name: "코스 공유" }));
    await user.click(screen.getByRole("button", { name: "Instagram Story용 이미지 다운로드" }));

    await waitFor(() => expect(anchorClick).toHaveBeenCalled());
    expect(drawContext.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1920);
    vi.unstubAllGlobals();
  });

  it("does not restore the removed scheduled-course summary after editing a draft", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(getPlaceMainButton("성수 식당"));
    await user.click(screen.getByRole("button", { name: "코스에 추가" }));
    await user.click(screen.getByRole("button", { name: /새 코스 만들기/ }));

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-03" } });
    await user.selectOptions(screen.getByLabelText("여행 상태"), "active");
    await user.click(screen.getByRole("button", { name: "뒤로" }));
    await user.click(screen.getByRole("button", { name: "홈" }));

    expect(screen.queryByText("지금 여행을 이어가세요.")).toBeNull();
  });

  it("opens the personal place record editor from a saved place", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getAllByRole("button", { name: /내 장소/ })[0]);
    await user.click(screen.getByRole("button", { name: /기록 관리/ }));

    expect(screen.getByRole("dialog", { name: "내 장소 기록 관리" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "테스트 저장 장소" })).toBeTruthy();
    expect(screen.getByText("직접 촬영한 사진")).toBeTruthy();
  });

  it("lets a creator choose the public visibility scope before saving a course", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: /새 코스/ }));

    const visibility = screen.getByRole("group", { name: "공개 범위" });
    expect(within(visibility).getByRole("button", { name: /비공개/ })).toBeTruthy();
    await user.click(within(visibility).getByRole("button", { name: /전체 공개/ }));
    expect(within(visibility).getByRole("button", { name: /전체 공개/ }).className).toContain("active");
    const shareImagePicker = screen.getByRole("region", { name: "공유 미리보기 대표 사진" });
    await user.click(within(shareImagePicker).getByRole("button", { name: "오븐 성수 공유 미리보기 대표 사진" }));
    expect(within(shareImagePicker).getByRole("button", { name: "오븐 성수 공유 미리보기 대표 사진" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("opens a full map view when the map canvas is tapped", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "지도 빈 영역" }));
    expect(screen.getByRole("button", { name: "전체 지도 닫기" })).toBeTruthy();
    const fullscreenSearch = container.querySelector(".route-map-screen.is-map-fullscreen .route-map-search") as HTMLButtonElement;
    expect(fullscreenSearch).toBeTruthy();
    const fullscreenCategories = container.querySelector(".route-map-screen.is-map-fullscreen #map-category-filter") as HTMLElement;
    expect(fullscreenCategories).toBeTruthy();
    await user.click(within(fullscreenCategories).getByRole("button", { name: "맛집" }));
    expect(within(fullscreenCategories).getByRole("button", { name: "맛집" }).className).toContain("active");
    expect(container.querySelector(".route-map-screen.is-map-fullscreen")).toBeTruthy();
    expect(container.querySelector(".route-map-sheet")).toBeNull();
    await user.click(fullscreenSearch);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("shows and manages recent map regions in the region picker", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("route-recent-map-regions", JSON.stringify([
      { label: "제주", lat: 33.4996, lng: 126.5312 },
      { label: "부산 해운대", lat: 35.1587, lng: 129.1604 },
    ]));
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "지역 선택" }));
    const recentRegions = screen.getByRole("region", { name: "최근 탐색 지역" });
    expect(within(recentRegions).getByText("제주")).toBeTruthy();
    expect(within(recentRegions).getByText("부산 해운대")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "부산 해운대 즐겨찾기 고정" }));
    expect(screen.getByRole("button", { name: "부산 해운대 즐겨찾기 해제" })).toBeTruthy();
    expect(within(recentRegions).getAllByRole("article")[0]?.textContent).toContain("부산 해운대");

    await user.click(screen.getByRole("button", { name: "제주 최근 탐색 지역 삭제" }));
    expect(within(recentRegions).queryByText("제주")).toBeNull();
    await user.click(screen.getByRole("button", { name: "최근 탐색 지역 전체 삭제" }));
    expect(screen.queryByRole("region", { name: "최근 탐색 지역" })).toBeNull();
  });

  it("opens the data and public-sharing guide from my page", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getByRole("button", { name: /데이터·공개 범위 안내/ }));

    expect(screen.getByRole("heading", { name: "데이터·공개 범위 안내" })).toBeTruthy();
    expect(screen.getByText("내 여행 기록은 내가 관리해요")).toBeTruthy();
    expect(screen.getByText("공유 링크와 사진")).toBeTruthy();
  });

  it("opens X and Facebook share pages with a public course link", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));
    await user.click(screen.getByRole("button", { name: "코스 공유" }));
    await user.click(screen.getByRole("button", { name: "X에 코스 공유" }));
    await user.click(screen.getByRole("button", { name: "페이스북에 코스 공유" }));

    expect(open).toHaveBeenCalledWith(expect.stringContaining("twitter.com/intent/tweet"), "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("/share/course/201")), "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("facebook.com/sharer/sharer.php"), "_blank", "noopener,noreferrer");
  });

  it("shows course photo upload and representative-photo controls in course edit", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getAllByRole("button", { name: /내 코스/ })[0]);
    await user.click(screen.getByRole("button", { name: "코스 수정" }));

    expect(screen.getByRole("region", { name: "공유 미리보기 대표 사진" })).toBeTruthy();
    expect(screen.getByText("코스 사진과 대표 사진")).toBeTruthy();
    expect(screen.getByText("사진 추가 (0/8)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "성수 식당 공유 미리보기 대표 사진" })).toBeTruthy();
  });

  it("adds a saved place in course edit while initializing its schedule defaults", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "코스 수정" }));
    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    await user.click(screen.getByRole("button", { name: /테스트 저장 장소/ }));

    expect(await screen.findByText("일정 장소 4곳")).toBeTruthy();
    expect((screen.getByLabelText("테스트 저장 장소 일차") as HTMLSelectElement).value).toBe("1");
    expect((screen.getByLabelText("테스트 저장 장소 체류 시간") as HTMLSelectElement).value).toBe("60");
  });

  it("shows completed-file progress and a retry control when a selected course photo cannot upload", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "코스 수정" }));
    const imageInput = screen.getByRole("region", { name: "공유 미리보기 대표 사진" }).querySelector<HTMLInputElement>('input[type="file"]');
    if (!imageInput) throw new Error("사진 선택 입력을 찾을 수 없습니다.");
    fireEvent.change(imageInput, { target: { files: [new File(["photo"], "story-photo.jpg", { type: "image/jpeg" })] } });

    expect(await screen.findByText("업로드 진행")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("실패")).toBeTruthy());
    expect(screen.getByRole("button", { name: "재시도" })).toBeTruthy();
  });

  it("shows direct Instagram Story download and X share controls in course detail", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));

    expect(screen.getByRole("region", { name: "코스 빠른 공유" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "X에 공유" })).toBeTruthy();
    expect(screen.getByText("9:16 이미지 다운로드")).toBeTruthy();
  });

  it("opens map place search from course creation and returns after adding the selected place", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "+ 새 코스" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    const existingRow = Array.from(container.querySelectorAll<HTMLElement>(".route-draggable-place")).find((row) => row.textContent?.includes("서울숲"));
    if (!existingRow) throw new Error("서울숲 일정 행을 찾을 수 없습니다.");
    fireEvent.click(existingRow.querySelector("button") as HTMLButtonElement);
    expect(screen.getByText("추가한 장소 3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "지도에서 장소 검색하기" }));

    expect(screen.getByRole("heading", { name: "장소 검색" })).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: "서울숲" })[0]);

    expect(await screen.findByRole("heading", { name: "코스 만들기" })).toBeTruthy();
    expect(screen.getByText("추가한 장소 4")).toBeTruthy();
  });

  it("shows the first-map tutorial, stores completion, and lets users reopen it from my page", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("route-map-tutorial-completed");
    render(<Home />);

    const tutorial = screen.getByRole("dialog", { name: "지도 사용 안내" });
    expect(within(tutorial).getByText("지도를 움직여 여행지를 찾아보세요")).toBeTruthy();
    expect(within(tutorial).getByText("성수 오후 산책")).toBeTruthy();
    expect(within(tutorial).getByText("장소 저장 → 코스에 추가 → 시간순 일정 완성")).toBeTruthy();
    await user.click(within(tutorial).getByRole("button", { name: "다음" }));
    expect(within(screen.getByRole("dialog", { name: "지도 사용 안내" })).getByText("장소 핀을 누르면 간단한 정보를 확인해요")).toBeTruthy();
    await user.click(within(screen.getByRole("dialog", { name: "지도 사용 안내" })).getByRole("button", { name: "다음" }));
    await user.click(within(screen.getByRole("dialog", { name: "지도 사용 안내" })).getByRole("button", { name: "지도 시작하기" }));
    expect(window.localStorage.getItem("route-map-tutorial-completed")).toBe("true");
    expect(screen.queryByRole("dialog", { name: "지도 사용 안내" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "마이" }));
    await user.click(screen.getByRole("button", { name: "지도 사용 가이드 다시 보기" }));
    expect(screen.getByRole("dialog", { name: "지도 사용 안내" })).toBeTruthy();
  });
});
