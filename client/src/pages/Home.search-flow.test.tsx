// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Route Tester" },
    loading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/components/Map", () => ({
  MapView: ({ fallback, onMapReady }: { fallback?: React.ReactNode; onMapReady?: (map: any) => void }) => {
    React.useEffect(() => {
      onMapReady?.({ panTo: () => undefined, setZoom: () => undefined, getZoom: () => 15 });
    }, []);
    return <div data-testid="map-view">{fallback}</div>;
  },
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  const query = () => ({ data: [], isLoading: false, isError: false });
  const ownedCourse = { id: 101, title: "성수 하루 코스", region: "서울", coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", startDate: null, endDate: null, status: "planned" };
  const ownedCourseDetail = { ...ownedCourse, items: [
    { placeId: "p1", name: "성수 식당", category: "맛집", address: "서울 성동구 연무장7길 5", lat: 37.544, lng: 127.056, durationMinutes: 60, dayNumber: 1, visitTime: "14:00", estimatedCost: 10000 },
    { placeId: "p2", name: "오븐 성수", category: "카페", address: "서울 성동구 연무장길 7", lat: 37.545, lng: 127.057, durationMinutes: 60, dayNumber: 1, visitTime: "15:40", estimatedCost: 15000 },
    { placeId: "p3", name: "성수동 스테이크", category: "맛집", address: "서울 성동구 아차산로 403", lat: 37.547, lng: 127.058, durationMinutes: 90, dayNumber: 1, visitTime: "17:00", estimatedCost: 50000 },
  ] };
  const savedPlacesQuery = () => ({ data: [{ id: 1, placeId: "saved-test-place", name: "테스트 저장 장소", category: "카페", address: "서울 성동구 테스트길 1", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", lat: 37.546, lng: 127.059 }], isLoading: false, isError: false });
  return {
    trpc: {
      places: { toggleSaved: { useMutation: mutation }, saved: { useQuery: savedPlacesQuery } },
      courses: { create: { useMutation: mutation }, update: { useMutation: mutation }, appendPlace: { useMutation: mutation }, mine: { useQuery: () => ({ data: [ownedCourse], isLoading: false, isError: false }) }, saved: { useQuery: query }, get: { useQuery: (input: { courseId: number }) => ({ data: input.courseId === 101 ? ownedCourseDetail : null, isLoading: false, isError: false }) } },
      auth: { updateProfile: { useMutation: mutation } },
      useUtils: () => ({ courses: { mine: { invalidate: vi.fn() } } }),
    },
  };
});

import Home from "./Home";

afterEach(() => {
  cleanup();
  window.localStorage.removeItem("route-recent-place-searches");
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("home place search flow", () => {
  it("opens the map search screen when the home search bar is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(await screen.findByRole("button", { name: "장소 검색" }));

    expect(screen.getByRole("heading", { name: "장소 검색" })).toBeTruthy();
    expect(screen.getByPlaceholderText("성수 맛집")).toBeTruthy();
  });

  it("shows the selected-place preview from a map marker and opens the course picker", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    expect(screen.getByRole("button", { name: "코스 선택" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "코스 선택" }));
    expect(screen.getByRole("heading", { name: "성수 식당" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /새 코스 만들기/ }));
    expect(screen.getByRole("heading", { name: "코스 만들기" })).toBeTruthy();
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

  it("keeps map pin selection available across peek, expanded, and hidden sheet states", () => {
    const { container } = render(<Home />);
    const marker = () => screen.getAllByRole("button", { name: "성수 식당" })[0];
    const dragZone = () => container.querySelector(".route-sheet-drag-zone") as HTMLDivElement;

    fireEvent.click(marker());
    expect(screen.getByRole("button", { name: "코스 선택" })).toBeTruthy();

    fireEvent.pointerDown(dragZone(), { pointerId: 1, clientY: 420 });
    fireEvent.pointerUp(dragZone(), { pointerId: 1, clientY: 350 });
    expect(container.querySelector(".route-map-sheet")?.className).toContain("is-expanded");
    fireEvent.click(marker());
    expect(screen.getByRole("button", { name: "코스 선택" })).toBeTruthy();

    fireEvent.pointerDown(dragZone(), { pointerId: 2, clientY: 420 });
    fireEvent.pointerUp(dragZone(), { pointerId: 2, clientY: 500 });
    expect(container.querySelector(".route-map-sheet")).toBeNull();
    fireEvent.click(marker());
    expect(screen.getByRole("button", { name: "코스 선택" })).toBeTruthy();
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

  it("adds a selected saved place to the current course without leaving the map", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "테스트 저장 장소" }));
    await user.click(screen.getByRole("button", { name: "현재 코스에 담기" }));
    expect(screen.getByRole("button", { name: "현재 코스에 담김" })).toBeTruthy();
  });

  it("reveals operating hours and photos for a selected place in the expanded sheet", () => {
    const { container } = render(<Home />);
    fireEvent.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);

    const dragZone = container.querySelector(".route-sheet-drag-zone") as HTMLDivElement;
    fireEvent.pointerDown(dragZone, { pointerId: 4, clientY: 420 });
    fireEvent.pointerUp(dragZone, { pointerId: 4, clientY: 350 });

    expect(screen.getByText("영업시간")).toBeTruthy();
    expect(screen.getByRole("button", { name: /사진 3장과 상세 정보 보기/ })).toBeTruthy();
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
      await user.click(screen.getByRole("button", { name: "현재 위치" }));
      expect(await screen.findByRole("heading", { name: "현재 위치 권한이 필요합니다" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeolocation });
    }
  });

  it("toggles distance and open-now discovery controls from the map sheet", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /거리순/ }));
    expect(screen.getByRole("button", { name: /거리순 ON/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "영업 중" }));
    expect(screen.getByText("현재 영업 중인 장소가 없습니다")).toBeTruthy();
  });

  it("opens the place photo gallery and exposes the Naver reservation and inquiry link", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    await user.click(container.querySelector(".route-map-place-preview-main") as HTMLButtonElement);
    expect(screen.getByRole("link", { name: /네이버에서 예약 찾기/ }).getAttribute("href")).toContain("https://search.naver.com/search.naver");
    expect(screen.getByRole("link", { name: /네이버 지도에서 장소만 검색하기/ }).getAttribute("href")).toContain("https://map.naver.com/p/search/");

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

  it("opens the active trip page from the home screen", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(screen.getByRole("button", { name: "코스 보기" }));
    expect(screen.getByRole("heading", { name: "진행 중인 코스" })).toBeTruthy();
    expect(screen.getByText("오늘의 일정")).toBeTruthy();
  });

  it("manages course dates and status while surfacing schedule conflicts", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    await user.click(screen.getByRole("button", { name: "코스 선택" }));
    await user.click(screen.getByRole("button", { name: /새 코스 만들기/ }));

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-03" } });
    await user.selectOptions(screen.getByLabelText("여행 상태"), "active");
    expect((screen.getByLabelText("여행 상태") as HTMLSelectElement).value).toBe("active");

    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.change(screen.getByLabelText("방문 시간"), { target: { value: "22:00" } });
    expect(screen.getByRole("region", { name: "일정 경고" })).toBeTruthy();
    expect(screen.getByText(/성수 식당의 영업시간/)).toBeTruthy();
  });

  it("assigns a day and duration to a place while calculating the itinerary total", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    await user.click(screen.getByRole("button", { name: "코스 선택" }));
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

  it("reorders added course places with a mobile pointer drag", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "+ 새 코스" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    const rows = Array.from(container.querySelectorAll<HTMLElement>(".route-draggable-place"));
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0].textContent).toContain("성수 식당");
    const targetRow = rows[2];
    const elementFromPoint = vi.spyOn(document, "elementFromPoint").mockReturnValue(targetRow);

    fireEvent.pointerDown(rows[0].querySelector(".route-drag-handle") as SVGElement, { pointerId: 17, clientX: 120, clientY: 380 });
    fireEvent.pointerMove(document, { pointerId: 17, clientX: 120, clientY: 500 });
    fireEvent.pointerUp(document, { pointerId: 17, clientX: 120, clientY: 500 });

    expect(container.querySelectorAll<HTMLElement>(".route-draggable-place")[2].textContent).toContain("성수 식당");
    elementFromPoint.mockRestore();
  });

  it("reorders saved course places from the edit screen with a mobile pointer drag", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "코스" }));
    await user.click(screen.getByRole("button", { name: "코스 수정" }));
    await screen.findByText("일정 장소 3곳");

    const rows = Array.from(container.querySelectorAll<HTMLElement>(".route-edit-place-row"));
    const elementFromPoint = vi.spyOn(document, "elementFromPoint").mockReturnValue(rows[2]);
    fireEvent.pointerDown(rows[0].querySelector("b") as HTMLElement, { pointerId: 19, clientX: 120, clientY: 380 });
    fireEvent.pointerMove(document, { pointerId: 19, clientX: 120, clientY: 500 });
    fireEvent.pointerUp(document, { pointerId: 19, clientX: 120, clientY: 500 });

    expect(container.querySelectorAll<HTMLElement>(".route-edit-place-row")[2].textContent).toContain("성수 식당");
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
    expect(screen.getByRole("button", { name: "코스 이미지 저장" })).toBeTruthy();
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
    window.history.replaceState({}, "", "/?course=c1");
    render(<Home />);

    expect((await screen.findAllByRole("heading", { name: "제주 2박 3일 힐링 코스" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "코스 공유" })).toBeTruthy();
  });

  it("exports a shared course as a PNG image", async () => {
    const user = userEvent.setup();
    const drawContext = { fillStyle: "", font: "", fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), fillText: vi.fn(), arc: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(drawContext);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,route");
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "친구" }));
    await user.click(screen.getByRole("button", { name: /제주 2박 3일 힐링 코스/ }));
    await user.click(screen.getByRole("button", { name: "코스 공유" }));
    await user.click(screen.getByRole("button", { name: "코스 이미지 저장" }));

    expect(anchorClick).toHaveBeenCalled();
  });

  it("shows the selected course lifecycle on the home active-trip card", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    await user.click(screen.getByRole("button", { name: "코스 선택" }));
    await user.click(screen.getByRole("button", { name: /새 코스 만들기/ }));

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-03" } });
    await user.selectOptions(screen.getByLabelText("여행 상태"), "active");
    await user.click(screen.getByRole("button", { name: "뒤로" }));
    await user.click(screen.getByRole("button", { name: "홈" }));

    expect(screen.getByText("진행 중")).toBeTruthy();
    expect(screen.getByText(/2026\.09\.01 ~ 2026\.09\.03/)).toBeTruthy();
  });
});
