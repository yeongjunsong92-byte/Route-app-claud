import type { Express, Request } from "express";
import { getCourseDetails } from "./db";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function escapeXml(value: string) {
  return escapeHtml(value);
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value;
}

function getPublicOrigin(req: Request) {
  const forwardedProto = String(req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
  return `${forwardedProto}://${host}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(date);
}

function courseSummary(course: Awaited<ReturnType<typeof getCourseDetails>>) {
  if (!course) return "";
  const dateStart = formatDate(course.startDate);
  const dateEnd = formatDate(course.endDate);
  const dateRange = dateStart ? (dateEnd && dateEnd !== dateStart ? `${dateStart}–${dateEnd}` : dateStart) : "일정 미정";
  const placeNames = course.items.slice(0, 3).map((item) => item.name).filter(Boolean).join(" · ");
  const places = course.items.length ? `${course.items.length}곳` : "장소를 준비 중";
  return `${course.region || "여행"} · ${dateRange} · ${places}${placeNames ? ` · ${placeNames}` : ""}`;
}

function renderPreviewSvg(course: NonNullable<Awaited<ReturnType<typeof getCourseDetails>>>) {
  const summary = courseSummary(course);
  const title = truncate(course.title, 26);
  const author = truncate(course.authorName || "Route 여행자", 24);
  const places = course.items.slice(0, 3).map((item: typeof course.items[number], index: number) => `${index + 1}. ${truncate(item.name || "여행 장소", 20)}`);
  const itemRows = places.length ? places : ["여행 코스를 준비하고 있어요"];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(title)} Route 공유 미리보기">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#352a6f"/><stop offset=".55" stop-color="#6351dd"/><stop offset="1" stop-color="#9a8ef0"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="38"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1090" cy="100" r="170" fill="#f5cb76" opacity=".28" filter="url(#blur)"/>
  <circle cx="120" cy="620" r="220" fill="#9fe4df" opacity=".2" filter="url(#blur)"/>
  <rect x="70" y="62" width="1060" height="506" rx="38" fill="#ffffff" fill-opacity=".94"/>
  <text x="126" y="143" fill="#6351dd" font-family="Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="4">ROUTE · TRAVEL PLAN</text>
  <text x="126" y="230" fill="#24212d" font-family="Arial, sans-serif" font-size="58" font-weight="700">${escapeXml(title)}</text>
  <text x="126" y="285" fill="#696472" font-family="Arial, sans-serif" font-size="28">${escapeXml(truncate(summary, 60))}</text>
  <line x1="126" y1="334" x2="1074" y2="334" stroke="#e7e2f4" stroke-width="2"/>
  ${itemRows.map((item: string) => `<circle cx="145" cy="397" r="9" fill="#6351dd"/><text x="174" y="407" fill="#3f3948" font-family="Arial, sans-serif" font-size="30">${escapeXml(item)}</text>`).map((row: string, index: number) => row.replaceAll('cy="397"', `cy="${397 + index * 56}"`).replaceAll('y="407"', `y="${407 + index * 56}"`)).join("\n  ")}
  <text x="126" y="522" fill="#847c94" font-family="Arial, sans-serif" font-size="24">${escapeXml(author)}님의 여행 기록</text>
  <circle cx="1042" cy="488" r="48" fill="#6351dd"/><path d="M1023 488h38M1042 469v38" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
</svg>`;
}

export function registerCourseSharePreviewRoutes(app: Express) {
  app.get("/share/course/:courseId/preview.svg", async (req, res) => {
    const courseId = Number(req.params.courseId);
    const course = Number.isInteger(courseId) && courseId > 0 ? await getCourseDetails(courseId) : null;
    if (!course?.isPublic) {
      res.status(404).type("text/plain").send("공개 코스를 찾을 수 없습니다.");
      return;
    }
    res.type("image/svg+xml").set("Cache-Control", "public, max-age=600").send(renderPreviewSvg(course));
  });

  app.get("/share/course/:courseId", async (req, res) => {
    const courseId = Number(req.params.courseId);
    const course = Number.isInteger(courseId) && courseId > 0 ? await getCourseDetails(courseId) : null;
    if (!course?.isPublic) {
      res.status(404).type("text/html").send("<!doctype html><html lang=\"ko\"><head><title>공개 코스를 찾을 수 없습니다 | Route</title></head><body>공개 코스를 찾을 수 없습니다.</body></html>");
      return;
    }
    const origin = getPublicOrigin(req);
    const shareUrl = `${origin}/share/course/${course.id}`;
    const imageUrl = `${shareUrl}/preview.svg`;
    const title = `${course.title} | Route`;
    const description = truncate(courseSummary(course), 180);
    const destination = `/?course=${encodeURIComponent(course.id)}`;
    res.type("text/html").set("Cache-Control", "public, max-age=300").send(`<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="Route"/>
<meta property="og:title" content="${escapeHtml(title)}"/><meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(shareUrl)}"/><meta property="og:image" content="${escapeHtml(imageUrl)}"/>
<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${escapeHtml(title)}"/><meta name="twitter:description" content="${escapeHtml(description)}"/><meta name="twitter:image" content="${escapeHtml(imageUrl)}"/>
<meta http-equiv="refresh" content="0;url=${escapeHtml(destination)}"/>
</head><body><p>Route에서 <strong>${escapeHtml(course.title)}</strong> 코스를 여는 중입니다.</p><p><a href="${escapeHtml(destination)}">코스 열기</a></p><script>location.replace(${JSON.stringify(destination)});</script></body></html>`);
  });
}
