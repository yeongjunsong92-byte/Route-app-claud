// e2e/global.d.ts
// e2e/ 폴더의 .ts 파일들은 Playwright 테스트 러너(Node.js 런타임)에서 실행되므로
// `process.env`를 사용합니다.
//
// VS Code가 e2e/tsconfig.json을 활성 프로젝트로 인식하지 못하는 경우에도, 같은 폴더에 있는
// ambient .d.ts 선언 파일은 VS Code의 "설정 없는" 기본(inferred) 프로젝트에서도 항상 함께
// 로드되기 때문에, tsconfig 인식 여부와 무관하게 `process` 관련 빨간줄을 없애줍니다.
//
// @types/node 전체를 끌어오는 대신, 실제로 사용하는 최소한의 형태만 선언합니다.
declare const process: {
  env: Record<string, string | undefined>;
};
