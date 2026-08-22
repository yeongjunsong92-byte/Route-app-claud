# Route 코드 인계 메모

## 현재 기준

- 인계 브랜치에는 React 19, TypeScript, Tailwind 4, Express, tRPC, Drizzle/MySQL 기반의 Route 앱 전체 코드가 들어 있습니다.
- 최신 완료 항목은 코스 진행 상태 저장, 장소별 여행 사진·메모, 전체 완료 축하 UI, 네이버 내비 현재 위치 전달, 진행 코스에서 길찾기 뒤로가기 복귀입니다.
- 데이터베이스 마이그레이션 `drizzle/0008_dark_dragon_lord.sql`, `drizzle/0009_tan_lightspeed.sql`은 현재 서비스 DB에 적용된 상태입니다.

## 로컬 실행

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

기본 환경 변수는 Manus 프로젝트 런타임에서 주입됩니다. 다른 환경으로 옮길 경우에는 `DATABASE_URL`, OAuth 관련 변수, S3/저장소 설정, Google Maps 키를 별도로 구성해야 합니다. 비밀 값은 저장소에 커밋하지 않습니다.

## 다음 개발 시 우선 확인할 파일

| 목적 | 파일 |
|---|---|
| 화면·상태·사용자 흐름 | `client/src/pages/Home.tsx` |
| 모바일 디자인 토큰·화면 스타일 | `client/src/index.css` |
| tRPC API 계약 | `server/routers.ts` |
| 코스·장소 데이터 계층 | `server/db.ts` |
| DB 스키마·마이그레이션 | `drizzle/schema.ts`, `drizzle/` |
| 주요 회귀 테스트 | `client/src/pages/Home.search-flow.test.tsx`, `server/route.features.test.ts` |
| 작업 이력·후속 TODO | `todo.md`, `verification-notes.md` |

## 검증 기준

변경 후에는 `pnpm check && pnpm test && pnpm build`를 실행합니다. 화면 흐름을 바꾸는 경우 390×844 모바일 기준으로 지도, 진행 코스, 네이버 내비 진입·복귀를 함께 확인합니다.
