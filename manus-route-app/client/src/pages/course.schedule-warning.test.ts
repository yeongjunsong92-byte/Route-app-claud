import { describe, expect, it } from "vitest";
import { getScheduleWarnings } from "@/lib/courseSchedule";

describe("stored course opening-hours warnings", () => {
  it("uses the course item's stored opening hours instead of a catalog fallback", () => {
    const places = [{ id: "saved-opening-hours", name: "저장된 실제 장소", hours: "12:00 - 20:00" }] as never[];
    const warnings = getScheduleWarnings(places, { "saved-opening-hours": "10:30" });

    expect(warnings).toEqual([{ placeId: "saved-opening-hours", message: "저장된 실제 장소의 영업시간(12:00 - 20:00)을 벗어납니다." }]);
  });

  it("detects a time conflict using stored course-item visit times", () => {
    const places = [
      { id: "first", name: "첫 장소", hours: "09:00 - 22:00" },
      { id: "second", name: "둘째 장소", hours: "09:00 - 22:00" },
    ] as never[];
    const warnings = getScheduleWarnings(places, { first: "14:00", second: "14:30" });

    expect(warnings.some((warning) => warning.message.includes("방문 시간이 이전 일정과 겹칩니다"))).toBe(true);
  });
});
