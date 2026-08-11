// playwright.config.ts
// Route 앱 E2E 테스트 설정.
//
// 실행 전 준비:
//   - .env(.local)에 VITE_FIREBASE_*, VITE_GOOGLE_MAPS_API_KEY 등 기존 앱 실행에 필요한 값
//   - E2E_TEST_EMAIL / E2E_TEST_PASSWORD 환경변수 (실제 값은 이 저장소에 커밋하지 않습니다)
//
// 실행:
//   npx playwright install chromium   (최초 1회, 브라우저 바이너리 다운로드)
//   npm run test:e2e

import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 5173;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // 같은 테스트 계정으로 로그인하므로 동시 실행 시 세션 충돌을 피하기 위해 직렬 실행
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],

  // vite dev 서버가 이미 떠 있지 않으면 테스트 실행 시 자동으로 띄웁니다.
  // 기존 .env 값을 그대로 사용하므로 별도 설정이 필요 없습니다.
  webServer: {
    command: "npm run dev -- --port " + PORT,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
