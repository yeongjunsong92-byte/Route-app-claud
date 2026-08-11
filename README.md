# Route — 여행 코스 SNS 앱

여행 장소를 찾고, 나만의 여행 코스를 만들고, 다른 사람들과 공유하는 여행 SNS 앱입니다.

## 기술 스택

- Vite + React 18 + TypeScript
- Tailwind CSS (핑크 프라이머리 #FF6891 디자인 시스템)
- Firebase (Auth / Firestore / Storage)
- Google Maps Platform (Maps JavaScript API / Places API / Directions API)
- lucide-react

## 현재 진행 상태

- [x] Vite + React + TypeScript 실행 환경
- [x] Firebase Authentication (이메일/비밀번호, Google)
- [x] Google Maps 지도 표시 / 장소 검색 / 마커 / 경로 표시
- [x] 디자인 시스템 통일 (전 화면 핑크 팔레트 + Pretendard)
- [x] Firestore 보안 규칙 (`firestore.rules`) 작성
- [x] 홈/피드/마이페이지가 `data/dummy.ts` 대신 실제 Firestore 데이터를 조회
- [x] 코스 발행 → "내 코스로 저장 / 피드에 게시 / 링크 공유" 완료 화면
- [x] 이미지 업로드 연결 (코스 커버, 게시물 사진, 프로필 아바타)
- [x] 댓글 작성/목록/삭제(본인만)
- [x] 좋아요·저장이 실제 Firestore에 저장되어 새로고침 후에도 유지 (게시물 + 코스 모두)
- [x] dummy 데이터 전면 제거 (Home/Feed/Map/CourseDetail/MyPage 전부 실제 Firestore)
- [x] Firestore 문서 구조 검증/정제 (`sanitizeStops`) — 잘못된 형태의 문서가 와도 앱이 죽지 않고 해당 항목만 건너뜀
- [x] 코스에 여행 날짜(startDate/endDate) 입력 → 홈 배너 D-day 실제 동작
- [ ] 아래 "알려진 이슈" 정리

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env.local
```

| 변수 | 발급 위치 |
|---|---|
| `VITE_FIREBASE_API_KEY` 등 6개 | Firebase Console → 프로젝트 설정 → 일반 |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console → 사용자 인증 정보 |

### 3. Firebase 콘솔 체크리스트
- Authentication → 이메일/비밀번호, Google 제공업체 활성화
- Firestore Database 생성 후 **보안 규칙 배포** (아래 참고)
- Storage 버킷 활성화 (코스 커버 / 게시물 사진 / 아바타 업로드용)

### 4. Firestore 규칙·인덱스 배포
Firebase CLI가 있다면:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
CLI가 없다면 Firebase Console → Firestore Database → 규칙 탭에 `firestore.rules` 내용을 직접 붙여넣고,
Firestore가 "이 쿼리는 인덱스가 필요합니다" 에러를 콘솔에 출력할 때 그 링크를 눌러 인덱스를 만들어도 됩니다
(어떤 인덱스가 필요한지는 `firestore.indexes.json`에 미리 정리해뒀습니다).

### 5. 개발 서버 실행
```bash
npm run dev        # http://localhost:5173
npm run build      # 타입체크 + 프로덕션 빌드
npm run lint        # ESLint 검사
```

## 폴더 구조

```
route-app/
├── firestore.rules          Firestore 보안 규칙
├── firestore.indexes.json   Firestore 복합 인덱스 정의
├── firebase.json            위 두 파일 배포 설정
├── src/
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CourseCard.tsx           grid/list/horizontal 3변형
│   │   ├── CourseDetailSheet.tsx    코스 상세 + 좋아요/저장(courseLikes/courseSaves)
│   │   ├── CourseCompleteSheet.tsx  코스 발행 완료 후 선택 화면 (신규)
│   │   ├── CommentsSheet.tsx        댓글 목록/작성/삭제 (신규)
│   │   ├── FeedCard.tsx
│   │   ├── PlaceMap.tsx             Google Maps 마커/경로
│   │   └── PlaceCard.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── data/
│   │   └── dummy.ts                 이제 CreateScreen 장소검색 등 일부 화면만 사용
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts             코스/피드/댓글/좋아요·저장 CRUD (트랜잭션 기반)
│   │   ├── storage.ts               이미지 업로드
│   │   ├── googleMaps.ts
│   │   └── types.ts
│   ├── screens/
│   │   ├── HomeScreen.tsx           실제 Firestore courses
│   │   ├── MapScreen.tsx            Google Places 실검색 (코스 리스트는 아직 dummy)
│   │   ├── CreateScreen.tsx         커버 업로드 + 발행 완료 플로우
│   │   ├── FeedScreen.tsx           실제 Firestore posts + 좋아요/저장/댓글
│   │   ├── MyPageScreen.tsx         아바타 업로드 + 내 코스/저장한 코스 실데이터
│   │   └── LoginScreen.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
```

## Firestore 데이터 구조

```
users/{uid}              — displayName, email, avatarUrl, bio, followerCount...
courses/{courseId}        — title, region, authorId, stops[], likeCount, saveCount, isPublic...
posts/{postId}            — courseId, authorId, images[], caption, likeCount, commentCount...
comments/{commentId}      — postId, authorId, content, createdAt
likes/{postId_uid}        — 게시물 좋아요 (문서 ID로 중복 방지)
saves/{postId_uid}        — 게시물 저장
courseLikes/{courseId_uid} — 코스 좋아요
courseSaves/{courseId_uid} — 코스 저장
```

`likes`/`saves`/`courseLikes`/`courseSaves`는 문서 ID를 `{targetId}_{uid}` 형태로 고정해서
같은 유저가 같은 대상에 중복 좋아요 문서를 만드는 것 자체가 구조적으로 불가능합니다.
좋아요/저장 토글은 `runTransaction`으로 "문서 존재 확인 + 카운트 증감"을 원자적으로 처리합니다.

## 알려진 이슈 (아직 해결 안 됨)

- `lib/auth.ts`의 `createUserProfileDoc`이 Google 로그인 시마다 `bio`/`followerCount`/`followingCount`/`courseCount`를 기본값으로 덮어씁니다. 최초 가입 때만 기본값을 쓰고, 이후 로그인부터는 기존 값을 유지하도록 분기 필요.
- `package.json`에 `react-router-dom`이 설치돼 있지만 미사용 (탭 전환은 `App.tsx` 로컬 상태). 라우팅을 도입하지 않을 거라면 제거 검토.
- `CourseCompleteSheet`의 "링크로 공유하기"가 생성하는 URL(`/course/{id}`)은 라우터가 없어서 실제로 그 주소로 들어가면 아무것도 뜨지 않습니다. React Router 등을 도입해 코스 상세 페이지 라우트를 만들어야 링크가 실제로 동작합니다.
- 댓글/게시물 목록에 페이지네이션이 없습니다 (`limit`만 있고 커서 없음).
- `src/data/dummy.ts`는 이제 어디에서도 import되지 않습니다. 필요 없으면 삭제해도 되지만, 임의로 지우지 않고 남겨뒀습니다.
- `sanitizeStops`가 잘못된 stop을 조용히 걸러내기 때문에, Firestore에 실제로 이상한 형태의 문서가 있어도 화면에서는 티가 안 날 수 있습니다. 브라우저 콘솔에 `[firestore] courses/...` 경고가 찍히니, 데이터 정합성을 점검할 땐 콘솔을 꼭 확인하세요.
- Firestore 보안 규칙에서 `courses`/`posts`의 좋아요·저장 카운트를 "본인이 아닌 로그인 사용자도 수정 가능"하게 열어뒀는데, 이건 클라이언트가 임의로 `likeCount`를 아무 값으로나 바꿔치기하는 것까지 막지는 못합니다 (증감폭 검증까지 규칙에 넣거나, 장기적으로는 Cloud Functions로 옮기는 걸 권장).

## 다음 개발 순서 (제안)

**우선순위 높음**
1. 위 "알려진 이슈" 정리 (특히 Google 로그인 프로필 덮어쓰기 버그)
2. `MapScreen` 코스 목록 실데이터 연결
3. 코스 상세 페이지를 위한 라우팅 도입 (react-router-dom을 실제로 쓰거나 제거)

**중요**
4. 팔로우/팔로워 기능 (현재 `UserProfile`에 필드만 있고 동작 없음)
5. 알림 (좋아요/댓글/팔로우 알림)
6. 페이지네이션 / 무한스크롤

**다듬기**
7. 코드 스플리팅 (현재 빌드 결과물 900KB↑ 경고)
8. 이미지 업로드 전 리사이즈/압축, 업로드 진행률 표시
9. `tsconfig`에 `strict: true` 적용
10. 배포 파이프라인 (Firebase Hosting / Vercel), 스테이징·프로덕션 프로젝트 분리
11. 테스트 코드 (unit/e2e)

## Google Maps 관련 참고사항

- `PlaceMap.tsx`는 지도 표시 / 카테고리별 컬러 마커 / 마커·리스트 클릭 선택 / `routeStops` prop으로 경로(Directions) 표시를 모두 지원합니다.
- 장소 검색은 `google.maps.places.PlacesService.textSearch`를 사용합니다 (`MapScreen.tsx`).
- Google Cloud 콘솔에서 API 키에 도메인 리퍼러 제한을 걸고, 사용량 알림(예산 알림)을 설정하는 것을 권장합니다.
