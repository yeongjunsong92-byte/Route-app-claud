# Route — 나만의 여행 코스 만들기

Route는 지도에서 장소를 탐색하고, 선택한 장소를 나만의 여행 Route로 만들어 저장·확인·실행하는 웹 MVP입니다. 1차 출시에서는 SNS가 아닌 **개인 여행 계획 경험**에 집중합니다.

> 지도 탐색 → 장소 발견 → 장소 선택 → 코스 생성 → 저장 → 내 코스 확인 → 여행 시작

## 1차 MVP 기능

| 사용자 흐름 | 제공 기능 |
|---|---|
| 로그인 | Firebase Authentication 기반 이메일/비밀번호 및 Google 로그인 |
| 장소 탐색 | Google Maps 지도, 지역 선택, 장소 검색, Marker 선택 |
| 장소 확인 | 장소명·주소·카테고리·평점·대표 이미지·인앱 지도·외부 길찾기 |
| 코스 생성 | 장소 추가, 코스 정보, 여행 날짜, DAY별 순서·이동, 지도 미리보기, 저장 |
| 내 코스 | 생성한 코스·저장한 코스 목록 및 코스 상세 이동 |
| 코스 상세 | 커버·기간·DAY별 일정·일정/지도 전환·Travel Navigator 진입 |
| 여행 실행 | Travel Navigator를 통한 코스 진행 |

피드·좋아요·댓글·팔로우·공유·AI 추천 등 SNS 확장 기능은 코드와 데이터 구조를 보존하되 1차 MVP UI에서는 노출하지 않습니다.

## 기술 스택

| 영역 | 구성 |
|---|---|
| 프론트엔드 | Vite, React, TypeScript, Tailwind CSS |
| 인증·데이터 | Firebase Authentication, Firestore, Storage |
| 지도·장소 | Maps JavaScript API, Places API, Directions API |
| UI | Pretendard, lucide-react, Route 디자인 토큰 |

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 아래 값을 설정합니다. 이 파일은 비밀 정보이므로 저장소에 커밋하지 않습니다.

| 변수 | 발급 위치 |
|---|---|
| `VITE_FIREBASE_API_KEY` 등 Firebase 6개 변수 | Firebase Console → 프로젝트 설정 → 일반 |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console → API 및 서비스 → 사용자 인증 정보 |

Google Maps API 키에는 실제 배포 도메인에 대한 HTTP 리퍼러 제한을 설정해야 합니다. 개발 환경에는 `http://localhost:5173/*`을 별도로 허용합니다.

### 3. Firebase Console 체크리스트

Firebase Console에서 이메일/비밀번호와 Google 로그인 제공업체를 활성화합니다. Firestore Database와 Storage 버킷을 활성화하고, 배포 전에는 반드시 현재 `firestore.rules`와 `firestore.indexes.json`을 적용합니다.

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. 개발·검증 명령

```bash
npm run dev
npm run build
npm run lint
npm run test:e2e
```

E2E 로그인 흐름을 실행하려면 환경 변수에 아래 테스트 계정을 추가합니다. 테스트는 Firestore 데이터를 생성하거나 삭제하지 않습니다.

```bash
E2E_TEST_EMAIL=
E2E_TEST_PASSWORD=
```

최초 E2E 실행 전에는 Playwright Chromium을 설치합니다.

```bash
npx playwright install chromium
```

## 배포 전 체크리스트

| 항목 | 확인 내용 |
|---|---|
| 프로덕션 빌드 | `npm run build` 성공 |
| 정적 검사 | `npm run lint` 오류 0건 |
| Firebase 환경 변수 | 호스팅 서비스의 프로덕션 환경 변수에 모두 설정 |
| Firebase 인증 | 배포 도메인을 Authorized domains에 등록 |
| Firestore 규칙·인덱스 | 최신 파일 배포 완료 |
| Storage 규칙 | 코스 커버·프로필 이미지 업로드 정책 확인 |
| Google Maps 키 | 배포 도메인 리퍼러 제한 및 사용량 예산 경보 설정 |
| Google API 활성화 | Maps JavaScript API, Places API, Directions API 활성화 |
| E2E 테스트 | 테스트 계정으로 로그인·지도·내 코스·코스 생성 흐름 확인 |

## Google Places 정보 강화 정책

현재 Place Detail은 기존 검색 결과의 이미지·평점·주소·좌표를 사용합니다. 영업시간·전화번호·웹사이트는 Place Details 요청이 필요할 수 있으며, 추가 비용과 Google Places attribution·캐싱 정책이 적용됩니다. 따라서 해당 기능은 API·비용·정책 검토와 별도 승인 후 도입합니다.

## 프로젝트 구조

```text
src/
├── components/       공통 카드, 하단 내비게이션, 지도
├── context/          인증 상태
├── lib/              Firebase, Firestore, Storage, Google Maps, 타입
├── screens/          Home, Map, Create, Course Detail, Place Detail, My, Travel Navigator
├── App.tsx           탭·상세 오버레이·코스 초안 상태
└── index.css         Route 전역 디자인 토큰
```

## 현재 QA 제약

로컬 브라우저·E2E QA에는 Firebase·Google Maps 환경 변수와 테스트 계정이 필요합니다. 이 값이 없는 환경에서는 앱이 인증 초기화를 완료할 수 없으므로, 정적 Build/Lint 검증만 가능합니다. 자세한 확인 결과는 `QA_BROWSER_INITIAL_RENDERING.md`를 참고합니다.
