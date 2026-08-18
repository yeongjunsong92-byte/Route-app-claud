// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
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
vi.mock("@/components/Map", () => ({ MapView: () => <div data-testid="map-view" /> }));
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
      courses: { create: { useMutation: mutation }, update: { useMutation: mutation }, mine: { useQuery: query }, get: { useQuery: query } },
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
});
