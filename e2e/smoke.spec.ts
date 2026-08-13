// e2e/smoke.spec.ts
// Route 1차 MVP 스모크 테스트.
//
// 필요한 환경변수 (이 파일에는 실제 값을 하드코딩하지 않습니다):
//   E2E_TEST_EMAIL     - 로그인 테스트에 사용할 계정 이메일
//   E2E_TEST_PASSWORD  - 로그인 테스트에 사용할 계정 비밀번호
//   VITE_FIREBASE_* / VITE_GOOGLE_MAPS_API_KEY - 앱 실행 환경 변수
//
// 로그인 계정이 없으면 인증 후 흐름 테스트는 skip 처리됩니다.
// 이 테스트는 Firestore 데이터를 생성·삭제하지 않고, 조회·이동만 검증합니다.

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { getE2ECredentials } from "./env.ts";

// 개발 환경에서 심각한 런타임 오류로 분류하지 않는 콘솔 메시지입니다.
const BENIGN_CONSOLE_PATTERNS = [
  /favicon/i,
  /source ?map/i,
  /Download the React DevTools/i,
  /Fetch API cannot load.*firestore/i,
  /WebChannelConnection/i,
  /\[HMR\]/i,
  /Failed to load resource.*404.*firestore\.googleapis/i,
  /Failed to load resource.*403/i,
];

function isBenignConsoleMessage(text: string): boolean {
  return BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

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

const AUTH_TIMEOUT_MS = 20_000;
const NAV_TIMEOUT_MS = 15_000;

async function loginAndWaitForHome(page: Page, email: string, password: string) {
  await expect(page.getByPlaceholder("이메일")).toBeVisible();
  await page.getByPlaceholder("이메일").fill(email);
  await page.getByPlaceholder("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByText("Route를 불러오는 중...")).toHaveCount(0, { timeout: AUTH_TIMEOUT_MS });

  const homeTabButton = page.getByRole("button", { name: "홈" });
  await expect(homeTabButton).toBeVisible({ timeout: AUTH_TIMEOUT_MS });
  await expect(homeTabButton).toHaveAttribute("aria-current", "page", { timeout: NAV_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Route" })).toBeVisible({ timeout: AUTH_TIMEOUT_MS });
}

function requireCredentials() {
  const credentials = getE2ECredentials();
  test.skip(!credentials, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD 환경변수가 설정되어 있지 않아 skip합니다.");
  return credentials;
}

test.describe("Route MVP 스모크 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. 앱 접속 및 로그인 화면 표시 확인", async ({ page }) => {
    const consoleErrors = collectSeriousConsoleErrors(page);

    await expect(page.getByRole("heading", { name: "Route" })).toBeVisible();
    await expect(page.getByPlaceholder("이메일")).toBeVisible();
    await expect(page.getByPlaceholder("비밀번호")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();

    expect(consoleErrors, `콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("2. 이메일/비밀번호 로그인 후 Home 화면 진입", async ({ page }) => {
    const credentials = requireCredentials();
    if (!credentials) return;

    const consoleErrors = collectSeriousConsoleErrors(page);
    await loginAndWaitForHome(page, credentials.email, credentials.password);

    expect(consoleErrors, `로그인 플로우 중 콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("3. Home → 지도 → 내 코스 → 마이 화면 렌더링 확인", async ({ page }) => {
    const credentials = requireCredentials();
    if (!credentials) return;

    const consoleErrors = collectSeriousConsoleErrors(page);
    await loginAndWaitForHome(page, credentials.email, credentials.password);

    await page.getByRole("button", { name: "지도" }).click();
    await expect(page.getByRole("button", { name: "지도" })).toHaveAttribute("aria-current", "page", {
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "지도로 장소 찾기" })).toBeVisible({
      timeout: NAV_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: "내 코스" }).click();
    await expect(page.getByRole("button", { name: "내 코스" })).toHaveAttribute("aria-current", "page", {
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "내 코스" })).toBeVisible({ timeout: NAV_TIMEOUT_MS });
    await expect(page.getByRole("button", { name: /생성한 코스/ })).toBeVisible();

    await page.getByRole("button", { name: "마이" }).click();
    await expect(page.getByRole("button", { name: "마이" })).toHaveAttribute("aria-current", "page", {
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "마이" })).toBeVisible({ timeout: NAV_TIMEOUT_MS });

    expect(consoleErrors, `MVP 내비게이션 이동 중 콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("4. 지도 → 코스 만들기 화면 진입 확인", async ({ page }) => {
    const credentials = requireCredentials();
    if (!credentials) return;

    const consoleErrors = collectSeriousConsoleErrors(page);
    await loginAndWaitForHome(page, credentials.email, credentials.password);

    await page.getByRole("button", { name: "지도" }).click();
    await expect(page.getByRole("heading", { name: "지도로 장소 찾기" })).toBeVisible({
      timeout: NAV_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: "코스 만들기" }).click();
    await expect(page.getByRole("heading", { name: "내 코스 만들기" })).toBeVisible({
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "코스 저장하기" })).toBeVisible();

    expect(consoleErrors, `코스 생성 화면 진입 중 콘솔 런타임 에러 발생:\n${consoleErrors.join("\n")}`).toEqual([]);
  });
});
