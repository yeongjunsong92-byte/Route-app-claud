import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getCourseDetails: vi.fn() }));

import { getCourseDetails } from "./db";
import { registerCourseSharePreviewRoutes } from "./sharePreview";

const publicCourse = {
  id: 201,
  title: "제주 2박 3일 힐링 코스",
  region: "제주",
  isPublic: true,
  shareImageUrl: "https://images.example.com/preferred-share-image.jpg",
  authorName: "Route 여행자",
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  endDate: new Date("2026-09-03T00:00:00.000Z"),
  items: [
    { name: "협재 해수욕장", imageUrl: "https://images.example.com/hyeopjae.jpg" },
    { name: "애월 카페거리" },
  ],
} as Awaited<ReturnType<typeof getCourseDetails>> & { isPublic: boolean };

async function requestSharePath(path: string) {
  const app = express();
  registerCourseSharePreviewRoutes(app);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

afterEach(() => vi.clearAllMocks());

describe("public course share preview", () => {
  it("serves Open Graph metadata that points to the Route course preview image", async () => {
    vi.mocked(getCourseDetails).mockResolvedValue(publicCourse as never);

    const response = await requestSharePath("/share/course/201");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('property="og:title" content="제주 2박 3일 힐링 코스 | Route"');
    expect(html).toContain('property="og:image" content="http://127.0.0.1:');
    expect(html).toContain('/share/course/201/preview.svg"');
    expect(html).toContain('meta name="twitter:card" content="summary_large_image"');
  });

  it("serves a 1200 by 630 SVG preview only for a public course", async () => {
    vi.mocked(getCourseDetails).mockResolvedValue(publicCourse as never);

    const response = await requestSharePath("/share/course/201/preview.svg");
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain("제주 2박 3일 힐링 코스");
    expect(svg).toContain('href="https://images.example.com/preferred-share-image.jpg"');
    expect(svg).not.toContain('href="https://images.example.com/hyeopjae.jpg"');
    expect(svg).toContain("대표 장소 사진");
  });

  it("does not expose metadata for a private course", async () => {
    vi.mocked(getCourseDetails).mockResolvedValue({ ...publicCourse, isPublic: false } as never);

    const response = await requestSharePath("/share/course/201");

    expect(response.status).toBe(404);
  });
});
