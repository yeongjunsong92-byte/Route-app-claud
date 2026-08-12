// e2e/env.ts
// Playwright E2E에서 사용하는 환경변수를 한 곳에서만 읽습니다.
// process.env 접근을 여러 테스트 파일에 흩어놓지 않기 위한 목적이며,
// 이 파일에는 실제 값을 하드코딩하지 않습니다 — 항상 런타임 환경변수에서 읽습니다.

export interface E2ECredentials {
  email: string;
  password: string;
}

/**
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD가 모두 설정되어 있으면 값을 반환하고,
 * 하나라도 비어있으면 null을 반환합니다.
 *
 * 사용하는 쪽에서는 아래처럼 early-return 패턴으로 사용하면
 * `credentials!.email` 같은 non-null assertion(!) 없이도 타입이 좁혀집니다:
 *
 *   const credentials = getE2ECredentials();
 *   if (!credentials) {
 *     test.skip(true, "...");
 *     return;
 *   }
 *   // 이 아래에서는 credentials가 E2ECredentials로 좁혀짐
 */
export function getE2ECredentials(): E2ECredentials | null {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) return null;
  return { email, password };
}
