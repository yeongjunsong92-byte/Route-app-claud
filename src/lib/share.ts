// src/lib/share.ts
// 코스 공유 유틸리티.
// - Web Share API(지원 브라우저)로 공유 시트를 띄우고, 미지원/실패 시 자동으로 링크를 클립보드에 복사합니다.
// - 공유 링크 구조: 웹에서는 `${origin}/course/{courseId}`, 네이티브 앱용 딥링크는 `route://course/{courseId}`.
// - 공유 미리보기(코스명/대표사진/설명/작성자)를 위해 페이지의 Open Graph 메타 태그를 갱신합니다.
//   (이 프로젝트는 순수 클라이언트 SPA라, JS를 실행하지 않는 일부 링크 미리보기 봇에는 반영되지
//   않을 수 있습니다 — 완전한 서버사이드 렌더링 없이 가능한 최선의 처리입니다.)

export interface ShareCourseInput {
  courseId: string;
  title: string;
  description?: string;
  authorName?: string;
  imageUrl?: string;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** 웹에서 공유/딥링크 처리에 사용하는 공유 링크. `/course/{courseId}` 형태. */
export function getCourseShareUrl(courseId: string): string {
  return `${window.location.origin}/course/${courseId}`;
}

/** 네이티브 앱(딥링크 처리기 등)을 위한 커스텀 스킴 링크. `route://course/{courseId}` 형태. */
export function getCourseDeepLink(courseId: string): string {
  return `route://course/${courseId}`;
}

/**
 * 코스를 공유합니다. Web Share API가 있으면 그걸로 공유 시트를 띄우고,
 * 없거나 실패하면 자동으로 공유 링크를 클립보드에 복사합니다.
 */
export async function shareCourse(input: ShareCourseInput): Promise<ShareResult> {
  const url = getCourseShareUrl(input.courseId);
  const title = input.authorName ? `${input.title} - ${input.authorName}의 여행 코스` : input.title;
  const text = input.description || "Route에서 이 여행 코스를 확인해보세요";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // Web Share API가 있지만 호출이 실패한 경우엔 아래에서 링크 복사로 자동 대체합니다.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

function setMetaTag(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** 코스 상세 화면 등에 진입했을 때, 공유 미리보기(og:*) 메타 태그를 해당 코스 정보로 갱신합니다. */
export function setCourseShareMeta(input: ShareCourseInput): void {
  setMetaTag("og:title", input.title);
  setMetaTag("og:description", input.description || "Route에서 이 여행 코스를 확인해보세요");
  setMetaTag("og:url", getCourseShareUrl(input.courseId));
  if (input.imageUrl) setMetaTag("og:image", input.imageUrl);
  if (input.authorName) setMetaTag("og:site_name", `Route · ${input.authorName}`);
}

/** 코스 상세 화면을 벗어날 때, 기본(Route 앱) 메타 태그로 되돌립니다. */
export function resetShareMeta(): void {
  setMetaTag("og:title", "Route");
  setMetaTag("og:description", "여행 코스를 만들고 공유하는 앱, Route");
  setMetaTag("og:url", window.location.origin);
  setMetaTag("og:image", "");
}
