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
vi.mock("@/components/Map", () => ({ MapView: ({ fallback }: { fallback?: React.ReactNode }) => <div data-testid="map-view">{fallback}</div> }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  const query = () => ({ data: [], isLoading: false, isError: false });
  return {
    trpc: {
      places: { toggleSaved: { useMutation: mutation }, saved: { useQuery: query } },
      courses: { create: { useMutation: mutation }, update: { useMutation: mutation }, mine: { useQuery: query }, saved: { useQuery: query }, get: { useQuery: query } },
      auth: { updateProfile: { useMutation: mutation } },
      useUtils: () => ({ courses: { mine: { invalidate: vi.fn() } } }),
    },
  };
});

import Home from "./Home";

afterEach(() => cleanup());

describe("home place search flow", () => {
  it("opens the map search screen when the home search bar is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "홈" }));
    await user.click(await screen.findByRole("button", { name: "장소 검색" }));

    expect(screen.getByRole("heading", { name: "장소 검색" })).toBeTruthy();
    expect(screen.getByPlaceholderText("성수 맛집")).toBeTruthy();
  });

  it("shows the selected-place preview from a map marker and opens course creation", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getAllByRole("button", { name: "성수 식당" })[0]);
    expect(screen.getByRole("button", { name: "코스에 추가" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "코스에 추가" }));
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
    expect(screen.getByRole("button", { name: "코스에 추가" })).toBeTruthy();

    fireEvent.pointerDown(dragZone(), { pointerId: 1, clientY: 420 });
    fireEvent.pointerUp(dragZone(), { pointerId: 1, clientY: 350 });
    expect(container.querySelector(".route-map-sheet")?.className).toContain("is-expanded");
    fireEvent.click(marker());
    expect(screen.getByRole("button", { name: "코스에 추가" })).toBeTruthy();

    fireEvent.pointerDown(dragZone(), { pointerId: 2, clientY: 420 });
    fireEvent.pointerUp(dragZone(), { pointerId: 2, clientY: 500 });
    expect(container.querySelector(".route-map-sheet")).toBeNull();
    fireEvent.click(marker());
    expect(screen.getByRole("button", { name: "코스에 추가" })).toBeTruthy();
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
});
