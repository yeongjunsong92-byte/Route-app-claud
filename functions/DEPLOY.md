# AI 여행 추천 Cloud Function 배포 가이드

`functions/src/index.ts`의 `recommendCourse` 함수를 실제 Firebase 프로젝트에 배포하는 절차입니다.
이 문서는 안내용이며, 실제 배포는 Firebase 프로젝트 소유자(사용자님)의 터미널에서 진행해야 합니다
(이 환경에서는 Firebase 로그인/프로젝트 자격증명이 없어 대신 배포할 수 없습니다).

---

## 0. 사전 준비물

- Firebase 프로젝트가 **Blaze(종량제) 요금제**여야 합니다. Cloud Functions 2세대는 Spark(무료) 요금제에서 배포되지 않습니다.
  - Firebase 콘솔 → 프로젝트 설정 → 사용량 및 결제 → Blaze로 업그레이드
- Anthropic API 키 (Anthropic Console에서 발급, `sk-ant-...` 형태)
- Node.js 20 (functions/package.json의 `engines.node`와 일치)
- Firebase CLI: `npm install -g firebase-tools` (이미 설치돼 있다면 생략)

---

## 1. Firebase CLI 로그인 & 프로젝트 연결

```bash
firebase login
firebase use --add   # Route 앱과 연결된 Firebase 프로젝트 선택
```

프로젝트 루트에 `.firebaserc`가 없다면 이 단계에서 자동 생성됩니다.

---

## 2. Secret 등록 (API 키는 여기에만 저장됩니다)

**중요: 아래 명령은 키 값을 프롬프트로 입력받으며, 저장소나 배포 산출물 어디에도 평문으로 남지 않습니다.**

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

- 프롬프트가 뜨면 Anthropic API 키 값을 붙여넣고 Enter
- 등록 확인: `firebase functions:secrets:access ANTHROPIC_API_KEY`
- `functions/src/index.ts`는 `defineSecret("ANTHROPIC_API_KEY")`로 이 시크릿을 런타임에만 주입받습니다. 코드에는 실제 키 값이 전혀 없습니다.

---

## 3. 함수 빌드 확인 (선택, 배포 전 로컬 검증)

```bash
cd functions
npm install
npm run build   # tsc — 오류 없이 끝나야 합니다
cd ..
```

---

## 4. 배포

```bash
firebase deploy --only functions
```

배포가 끝나면 터미널에 함수 URL/이름(`recommendCourse`)이 출력됩니다. 클라이언트(`src/lib/aiRecommend.ts`)는 이미 `httpsCallable(functions, "recommendCourse")`로 이 함수를 호출하도록 구현되어 있으므로, **배포만 되면 별도의 클라이언트 코드 수정 없이 바로 동작합니다.**

---

## 5. 로컬(에뮬레이터)에서 먼저 테스트하고 싶다면

```bash
cd functions
cp .env.example .env.local
# .env.local 파일을 열어 ANTHROPIC_API_KEY=실제키 로 채워넣기
# (.env.local은 functions/.gitignore에 의해 Git에서 자동 제외됩니다)
npm run serve   # build 후 firebase emulators:start --only functions
```

에뮬레이터 실행 중, 앱의 `src/lib/firebase.ts`에서 `getFunctions(app)` 호출 뒤에 아래를 임시로 추가하면 로컬 함수를 바라보게 할 수 있습니다 (테스트 후 반드시 제거):

```ts
import { connectFunctionsEmulator } from "firebase/functions";
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

---

## 6. 배포 후 확인 방법

1. 앱에서 로그인 후 마이페이지 → AI 여행 추천 진입
2. 지역/여행유형/기간/스타일 선택 후 "AI로 코스 추천받기" 클릭
3. "여행 코스를 만들고 있어요..." 로딩 후 결과가 뜨면 성공
4. 문제가 있다면 로그 확인: `firebase functions:log --only recommendCourse`

흔한 오류:
| 증상 | 원인 | 조치 |
|---|---|---|
| "추천을 받아오지 못했어요" (요청 즉시 실패) | Blaze 요금제 미적용 / 함수 미배포 | 0, 4단계 확인 |
| `unauthenticated` 오류 | 로그인 안 된 상태에서 호출 | 앱에 로그인 후 재시도 |
| `AI_NOT_CONFIGURED` | Secret 미등록 | 2단계 재확인 후 재배포 |
| AI 응답을 이해하지 못했어요 (자주 발생) | 모델이 JSON 형식을 벗어난 답변을 자주 함 | `functions/src/index.ts`의 프롬프트 문구 조정 후 재배포 |

---

## 7. 비용 참고

- Cloud Functions 호출당 과금 (Blaze 요금제, 무료 할당량 내에서는 비용 없음)
- Anthropic API 토큰 사용량에 따른 과금 (Anthropic 콘솔에서 사용량 확인)
- 추천마다 Google Places Text Search가 최대 4~6회 추가로 호출됩니다 (기존 코스 만들기 화면과 동일한 방식)
