// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { estimateRouteSegments, getRouteEfficiencyWarnings } from "./Home";

describe("route efficiency guidance", () => {
  it("calculates an expected time and distance for each adjacent stop", () => {
    const segments = estimateRouteSegments([
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "다음 장소", lat: 37.51, lng: 127.01 },
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0].from).toBe("출발");
    expect(segments[0].to).toBe("다음 장소");
    expect(segments[0].minutes).toBeGreaterThanOrEqual(5);
    expect(segments[0].distanceMeters).toBeGreaterThan(0);
  });

  it("warns when an intermediate stop creates a meaningful detour", () => {
    const warnings = getRouteEfficiencyWarnings([
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "우회 장소", lat: 37.56, lng: 127.0 },
      { name: "도착", lat: 37.5, lng: 127.01 },
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].placeName).toBe("우회 장소");
    expect(warnings[0].message).toContain("방문 순서");
  });

  it("warns when a two-stop day has a long travel leg", () => {
    const warnings = getRouteEfficiencyWarnings([
      { name: "오설록 티 뮤지엄", lat: 37.5435, lng: 127.0582 },
      { name: "애월 해안도로", lat: 37.5447, lng: 127.0374 },
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("이동 수단");
  });
});
