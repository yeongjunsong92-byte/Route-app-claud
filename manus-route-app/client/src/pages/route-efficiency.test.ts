// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { estimateRouteSegments, getOptimalRouteOrder, getRouteDistanceMeters, getRouteEfficiencyWarnings, getRouteTravelMinutes } from "./Home";

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

  it("adjusts estimated travel time for driving, transit, and walking", () => {
    const stops = [
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "도착", lat: 37.55, lng: 127.0 },
    ];

    const driving = estimateRouteSegments(stops, "driving")[0].minutes;
    const transit = estimateRouteSegments(stops, "transit")[0].minutes;
    const walking = estimateRouteSegments(stops, "walking")[0].minutes;

    expect(driving).toBeLessThan(transit);
    expect(transit).toBeLessThan(walking);
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

  it("recalculates adjacent travel legs when the stop order changes", () => {
    const before = [
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "우회 장소", lat: 37.56, lng: 127.0 },
      { name: "도착", lat: 37.5, lng: 127.01 },
    ];
    const after = [before[0], before[2], before[1]];

    expect(estimateRouteSegments(before)[0].to).toBe("우회 장소");
    expect(estimateRouteSegments(after)[0].to).toBe("도착");
    expect(getRouteDistanceMeters(after)).not.toBe(getRouteDistanceMeters(before));
  });

  it("keeps every travel leg when a course contains more than eight stops", () => {
    const stops = Array.from({ length: 10 }, (_, index) => ({
      name: `장소 ${index + 1}`,
      lat: 37.5 + index * 0.001,
      lng: 127 + index * 0.001,
    }));

    const segments = estimateRouteSegments(stops);
    expect(segments).toHaveLength(9);
    expect(segments.at(-1)?.from).toBe("장소 9");
    expect(segments.at(-1)?.to).toBe("장소 10");
  });

  it("recommends the shortest order while preserving the first stop", () => {
    const places = [
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "우회 장소", lat: 37.56, lng: 127.0 },
      { name: "도착", lat: 37.5, lng: 127.01 },
    ];
    const recommended = getOptimalRouteOrder(places);

    expect(recommended[0].name).toBe("출발");
    expect(recommended.map((place) => place.name)).toEqual(["출발", "도착", "우회 장소"]);
    expect(getRouteDistanceMeters(recommended)).toBeLessThan(getRouteDistanceMeters(places));
  });

  it("recalculates optimized travel time using the selected travel mode", () => {
    const places = [
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "북쪽", lat: 37.55, lng: 127.0 },
      { name: "동쪽", lat: 37.5, lng: 127.06 },
      { name: "중간", lat: 37.53, lng: 127.03 },
    ];
    const drivingRecommendation = getOptimalRouteOrder(places, "driving");
    const transitRecommendation = getOptimalRouteOrder(places, "transit");
    const walkingRecommendation = getOptimalRouteOrder(places, "walking");

    expect(getRouteTravelMinutes(drivingRecommendation, "driving")).toBeLessThanOrEqual(getRouteTravelMinutes(places, "driving"));
    expect(getRouteTravelMinutes(transitRecommendation, "transit")).toBeLessThanOrEqual(getRouteTravelMinutes(places, "transit"));
    expect(getRouteTravelMinutes(walkingRecommendation, "walking")).toBeLessThanOrEqual(getRouteTravelMinutes(places, "walking"));
    expect(getRouteTravelMinutes(drivingRecommendation, "driving")).not.toBe(getRouteTravelMinutes(walkingRecommendation, "walking"));
  });

  it("can recommend a different order for driving and walking", () => {
    const places = [
      { name: "출발", lat: 37.5, lng: 127.0 },
      { name: "대각선 장소", lat: 37.522, lng: 127.022 },
      { name: "직선 장소", lat: 37.529, lng: 127.0 },
    ];

    expect(getOptimalRouteOrder(places, "walking").map((place) => place.name)).toEqual(["출발", "대각선 장소", "직선 장소"]);
    expect(getOptimalRouteOrder(places, "driving").map((place) => place.name)).toEqual(["출발", "직선 장소", "대각선 장소"]);
  });

  it("changes the recommended order for the default Seongsu course when the mode changes", () => {
    const places = [
      { name: "성수 식당", lat: 37.5446, lng: 127.0557 },
      { name: "오븐 성수", lat: 37.545, lng: 127.0565 },
      { name: "성수동 스테이크", lat: 37.5435, lng: 127.0582 },
      { name: "서울숲", lat: 37.5447, lng: 127.0374 },
    ];

    expect(getOptimalRouteOrder(places, "walking").map((place) => place.name)).toEqual(["성수 식당", "오븐 성수", "성수동 스테이크", "서울숲"]);
    expect(getOptimalRouteOrder(places, "driving").map((place) => place.name)).toEqual(["성수 식당", "성수동 스테이크", "오븐 성수", "서울숲"]);
  });
});
