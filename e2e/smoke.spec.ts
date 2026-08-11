// e2e/smoke.spec.ts
// Route 앱 스모크 테스트.
//
// 필요한 환경변수 (이 파일에는 실제 값을 하드코딩하지 않습니다):
//   E2E_TEST_EMAIL     - 로그인 테스트에 사용할 계정 이메일
//   E2E_TEST_PASSWORD  - 위 계정의 비밀번호
//
// 위 두 변수가 설정되어 있지 않으면 로그인이 필요한 테스트는 자동으로 skip 처리됩니다
// (실패가 아니라 skip으로 표시되므로, 러너 콘솔/리포트에서 이유를 바로 확인할 수 있습니다).
//
// 이 테스트는 실제 Firestore 데이터를 생성/삭제하지 않습니다 — 조회/이동만 검증합니다.

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;

// 개발 환경에서 흔히 발생하지만 "심각한 런타임 에러"로 취급하면 안 되는 메시지 패턴.
// (예: Firestore long-polling 폴백 경고, 소스맵 404, 브라우저 확장 프로그램 관련 로그 등)
const BENIGN_CONSOLE_PATTERNS = [
  /favicon/i,
  /source ?map/i,
  /Download the React DevTools/i,
  /Fetch API cannot load.*firestore/i, // firebase.ts 주석에 설명된 long-polling 폴백 경고
  /WebChannelConnection/i,
  /\[HMR\]/i,
  /Failed to load resource.*404.*firestore\.googleapis/i,
];

function isBenignConsoleMessage(text: string): boolean {
  return BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * 현재 페이지에 console error / pageerror(uncaught exception) 리스너를 붙이고,
 * 수집된 "심각한" 에러 목록을 담은 배열을 반환합니다.
 * 테스트 마지막에 이 배열이 비어있는지 확인하면 됩니다.
 */
function collectSeriousConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isBenignConsoleMessage(text)) return;
    errors.push(`[console.error] ${text}`);
  });

  page.on("pageerror", (err: Error) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  return errors;
}

/** 로그인 화면에서 이메일/비밀번호를 입력하고 로그인 버튼을 누른 뒤 Home 진입을 기다립니다. */
async function loginAndWaitForHome(page: Page, email: string, password: string) {
  await expect(page.getByPlaceholder("이메일")).toBeVisible();
  await page.getByPlaceholder("이메일").fill(email);
  await page.getByPlaceholder("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();

  // AuthContext 로딩 스피너("Route를 불러오는 중...")가 사라질 때까지 대기 후,
  // 하단 네비게이션의 "홈" 탭이 나타나는지로 Home 화면 진입을 확인합니다.
  await expect(page.getByText("Route를 불러오는 중...")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "홈" })).toBeVisible({ timeout: 15_000 });
}

test.describe("Route 스모크 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. 앱 접속 및 로그인 화면 표시 확인", async ({ page }) => {
    const consoleErrors = collectSeriousConsoleErrors(page);

    // Route 로고/타이틀과 이메일·비밀번호 입력창이 보이면 로그인 화면이 정상 렌더링된 것.
    await expect(page.getByRole("heading", { name: "Route" })).toBeVisible();
    await expect(page.getByPlaceholder("이메일")).toBeVisible();
    await expect(page.getByPlaceholder("비밀번호")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();

    expect(consoleErrors, `콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("2. 이메일/비밀번호 로그인 → Home 화면 진입", async ({ page }) => {
    test.skip(
      !E2E_EMAIL || !E2E_PASSWORD,
      "E2E_TEST_EMAIL / E2E_TEST_PASSWORD 환경변수가 설정되어 있지 않아 skip합니다."
    );

    const consoleErrors = collectSeriousConsoleErrors(page);

    await loginAndWaitForHome(page, E2E_EMAIL!, E2E_PASSWORD!);

    // Home 화면 고유 요소(지역 필터, 오늘의 추천 코스 섹션 등)가 있는지 최소 확인.
    await expect(page.getByRole("button", { name: "홈" })).toHaveAttribute("aria-current", "true");

    expect(consoleErrors, `로그인 플로우 중 콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`).toEqual(
      []
    );
  });

  test("3. Home → Feed → 마이(Profile) 순서로 주요 화면 렌더링 확인", async ({ page }) => {
    test.skip(
      !E2E_EMAIL || !E2E_PASSWORD,
      "E2E_TEST_EMAIL / E2E_TEST_PASSWORD 환경변수가 설정되어 있지 않아 skip합니다."
    );

    const consoleErrors = collectSeriousConsoleErrors(page);

    await loginAndWaitForHome(page, E2E_EMAIL!, E2E_PASSWORD!);

    // Home -> Feed
    await page.getByRole("button", { name: "피드" }).click();
    await expect(page.getByRole("button", { name: "피드" })).toHaveAttribute("aria-current", "true");
    // Feed 탭(추천/팔로잉/최신)이 보이면 Feed 화면이 정상 렌더링된 것.
    await expect(page.getByRole("button", { name: "추천", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Feed -> 마이(Profile)
    await page.getByRole("button", { name: "마이" }).click();
    await expect(page.getByRole("button", { name: "마이" })).toHaveAttribute("aria-current", "true");
    // 마이페이지 탭("내 코스" / "저장한 코스")이 보이면 정상 렌더링된 것.
    await expect(page.getByRole("button", { name: "내 코스" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "저장한 코스" })).toBeVisible();

    expect(
      consoleErrors,
      `Home→Feed→Profile 이동 중 콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`
    ).toEqual([]);
  });

  test("4. Home → Feed → 코스 상세 화면 진입 확인", async ({ page }) => {
    test.skip(
      !E2E_EMAIL || !E2E_PASSWORD,
      "E2E_TEST_EMAIL / E2E_TEST_PASSWORD 환경변수가 설정되어 있지 않아 skip합니다."
    );

    const consoleErrors = collectSeriousConsoleErrors(page);

    await loginAndWaitForHome(page, E2E_EMAIL!, E2E_PASSWORD!);

    await page.getByRole("button", { name: "피드" }).click();
    await expect(page.getByRole("button", { name: "추천", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // 피드에 게시물이 없을 수 있으므로(실 데이터 상태에 따라 다름), 코스 카드가 있을 때만 클릭해서 검증하고
    // 없으면 "테스트 데이터 없음"으로 skip 처리합니다 — Firestore 데이터를 임의로 만들지 않습니다.
    const anyCourseTrigger = page.getByRole("img").first(); // 코스 카드는 커버 이미지를 포함
    const hasContent = await anyCourseTrigger.isVisible().catch(() => false);

    test.skip(!hasContent, "피드에 표시할 게시물/코스 데이터가 없어 코스 상세 진입을 검증하지 못합니다.");

    await anyCourseTrigger.click();

    // 코스 상세 화면의 뒤로가기 버튼(aria-label="뒤로")과 제목(h1)이 보이면 정상 진입.
    await expect(page.getByRole("button", { name: "뒤로" })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toBeVisible();

    expect(
      consoleErrors,
      `코스 상세 진입 중 콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`
    ).toEqual([]);
  });
});
