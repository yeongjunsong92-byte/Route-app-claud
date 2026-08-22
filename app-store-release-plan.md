# Route iOS 앱스토어 출시 실행 계획

> **현재 결론:** Route는 React·Express 기반의 웹앱이므로, 지금 상태의 웹 배포본을 그대로 App Store Connect에 올릴 수는 없습니다. 먼저 iOS 앱 번들(Xcode 프로젝트)을 만들고 실제 아이폰에서 지도·로그인·사진·네이버 내비 동작을 검증해야 합니다. 가장 빠른 전환 경로는 기존 웹 UI를 **Capacitor iOS 컨테이너**에 넣고, API·인증·지도는 HTTPS 운영 환경으로 분리하는 방식입니다.

## 1. 출시 전 반드시 해결할 Route 항목

| 우선순위 | Route에서 할 일 | 이유와 완료 기준 |
|---|---|---|
| 출시 차단 | **운영 API·인증 환경 분리** | 현재 Manus OAuth·상대 경로 tRPC는 iOS WebView에서 그대로 동작한다고 보장할 수 없습니다. 정식 도메인의 API URL, iOS 로그인 콜백, 세션·딥링크를 실기기에서 검증해야 합니다. |
| 출시 차단 | **계정 삭제 기능 추가** | Apple은 계정 생성을 지원하는 앱이 앱 안에서 계정 삭제를 시작할 수 있어야 한다고 안내합니다. 마이페이지에 삭제 요청·확인·완료 처리를 추가합니다.[1] |
| 출시 차단 | **공개 코스 신고·차단 정책** | 공개 코스·프로필은 사용자 생성 콘텐츠에 해당할 수 있습니다. Apple은 UGC 서비스에 부적절한 콘텐츠 신고와 악성 사용자 차단 수단을 요구합니다.[1] |
| 출시 차단 | **개인정보 처리방침 URL** | iOS 앱은 공개 HTTPS 개인정보 처리방침 URL이 필요하며, App Store Connect에서 실제 수집·사용 데이터를 정확히 답해야 합니다.[2] |
| 출시 차단 | **실기기 권한·외부 링크 검증** | 위치, 사진 접근, 네이버 내비 전환, Google 지도, 파일 선택, 로그인·로그아웃을 최신 iPhone에서 각각 검증합니다. |
| 출시 권장 | **네이티브 지도·공유 보완** | WebView 안의 Google Maps JS와 `window.open` 기반 네이버 이동은 iOS에서 제약될 수 있습니다. Capacitor Browser·Share·Geolocation 플러그인 또는 네이티브 SDK 방식으로 보완합니다. |

## 2. 권장 기술 전환 순서

| 단계 | 담당 작업 | Route에 적용할 구체적 내용 |
|---|---|---|
| 1 | 운영 환경 확정 | Route 프론트엔드와 Express/tRPC API를 HTTPS 도메인에 배포합니다. 앱에서 사용할 운영 API URL과 OAuth 콜백 URL을 확정합니다. |
| 2 | Capacitor 도입 | 프로젝트에 `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`를 추가하고 iOS 프로젝트를 생성합니다. 앱 ID는 예를 들어 `com.routeapp.route`처럼 Apple Developer에서 사용 가능한 고유 값으로 확정합니다. |
| 3 | 네이티브 브리지 설정 | 위치는 Capacitor Geolocation, 외부 네이버 링크는 Capacitor Browser/App URL 열기, 사진 선택은 Camera 또는 Files/Photos 플러그인으로 전환합니다. |
| 4 | API·인증 수정 | 네이티브 번들에서 상대 URL `/api/trpc` 대신 운영 API 기반 URL을 사용하도록 설정하고, OAuth 결과가 앱으로 복귀하도록 Universal Link 또는 커스텀 URL scheme을 구성합니다. |
| 5 | Xcode 빌드 | iOS 프로젝트에서 서명 팀, Bundle Identifier, 최소 iOS 버전, 앱 아이콘, 권한 설명 문구를 설정한 뒤 실제 iPhone에서 실행합니다. |
| 6 | TestFlight | 내부 테스트 후 외부 테스트 그룹을 만들고, 테스트 항목을 명시해 베타 심사를 제출합니다.[3] |

### iOS 권한 문구 초안

| Info.plist 키 | Route 권장 문구 |
|---|---|
| `NSLocationWhenInUseUsageDescription` | `현재 위치 주변의 여행지와 저장한 코스를 지도에서 보여드리기 위해 위치를 사용합니다.` |
| `NSPhotoLibraryUsageDescription` | `방문한 장소의 여행 기록에 사진을 추가하기 위해 사진 보관함 접근 권한이 필요합니다.` |
| `NSCameraUsageDescription` | `여행 기록에 현장에서 찍은 사진을 추가하기 위해 카메라 권한이 필요합니다.` |

카메라 촬영을 실제로 제공하지 않으면 `NSCameraUsageDescription`과 카메라 접근 코드는 포함하지 않습니다. 권한을 거부해도 지역 검색, 장소 탐색, 코스 확인이 계속 가능해야 합니다.

## 3. Apple Developer 및 App Store Connect 설정

| 순서 | 설정 위치 | 해야 할 일 |
|---|---|---|
| 1 | Apple Developer Program | 개인 또는 조직 팀으로 가입하고, 조직 명의·세금·은행 정보를 실제 사업 형태에 맞게 완료합니다. |
| 2 | Certificates, Identifiers & Profiles | `com.routeapp.route` Bundle ID를 등록하고 App ID에 필요한 기능만 활성화합니다. 푸시 알림을 아직 쓰지 않으면 활성화하지 않습니다. |
| 3 | App Store Connect → Agreements | Account Holder가 최신 계약을 수락합니다. 계약 미수락 상태에서는 새 앱 레코드를 만들 수 없습니다.[4] |
| 4 | App Store Connect → New App | 플랫폼 iOS, 앱 이름 `Route`, 기본 언어 `한국어`, Bundle ID, SKU(예: `route-ios-001`), 사용자 접근 범위를 입력합니다.[4] |
| 5 | App Information | 카테고리는 **Travel**을 우선 검토하고, 연령 등급 설문·저작권·지원 URL·개인정보 처리방침 URL을 입력합니다. |
| 6 | App Privacy | 계정 정보, 대략적 위치/정확한 위치, 사용자 콘텐츠(사진·메모·공개 코스), 식별자, Google Maps 등 제3자 SDK의 실제 데이터 처리를 데이터 흐름 기준으로 답합니다. 추정으로 “수집 안 함”을 선택하면 안 됩니다.[2] |
| 7 | Pricing and Availability | 무료/유료, 판매 국가·지역, 출시 방식(자동/수동)을 설정합니다. 유료 기능·구독을 도입할 경우 별도 In-App Purchase 검토가 필요합니다. |

Apple은 새 앱 레코드에 앱 이름, 기본 언어, Bundle ID, SKU, 사용자 접근 설정이 필요하다고 안내합니다.[4] App Store Connect에 업로드하는 2026년 빌드는 **Xcode 26 이상과 iOS 26 SDK**로 빌드해야 합니다.[5]

## 4. 제출용 자산·문구 준비

| 자산 | 준비 기준 | Route 권장 내용 |
|---|---|---|
| 앱 아이콘 | Xcode Asset Catalog용 정식 아이콘 | 현재 매트 Route 로고를 1024×1024 원본으로 정리하고, 텍스트·투명 여백 없이 시스템 마스킹을 고려해 제작합니다. |
| 스크린샷 | 실제 iOS 앱 화면 | ① 현재 위치 기반 지도 ② 장소 상세·저장 ③ 코스 제작 ④ 진행 지도·시간축 ⑤ 장소별 여행 기록·완료 축하의 5장 구성을 권장합니다. |
| 앱 이름 | App Store 표시 이름 | `Route` 또는 상표 충돌 확인 후 `Route - 여행 코스`를 사용합니다. 최종 이름은 등록 전 검색으로 확정합니다. |
| 부제·설명 | 기능을 과장 없이 설명 | `발견한 장소를 저장하고, 나만의 여행 코스를 완성하세요.`를 중심 문구로 사용합니다. |
| 키워드 | 검색 보조 | `여행,지도,코스,일정,장소저장,여행기록`처럼 실제 기능만 사용합니다. |
| 지원 URL | 사용자 문의 경로 | Route 웹사이트 내 지원·문의 페이지 또는 공개 이메일/폼을 HTTPS URL로 준비합니다. |
| 개인정보 처리방침 | 공개 HTTPS 페이지 | 수집 목적, 보관, 제3자(Google Maps·저장소), 위치·사진 권한, 공개 코스, 문의·삭제 요청 방법을 명시합니다. |
| 심사 메모 | App Review 정보 | 테스트 계정, 로그인 방법, 위치 권한 흐름, 네이버 외부 이동, 공개 코스 신고·차단 경로를 한국어와 영어로 명확히 제공합니다. |

## 5. TestFlight 운영 순서

1. Xcode Organizer에서 Archive를 만들고 App Store Connect에 업로드합니다. 버전은 `1.0.0`, 빌드 번호는 매 업로드마다 증가시킵니다.
2. 먼저 개발팀을 **내부 테스터** 그룹에 추가해 로그인, 지도, 저장, 코스 생성, 진행, 사진, 로그아웃·계정 삭제를 점검합니다.
3. 외부 테스트는 내부 테스트 그룹을 먼저 만든 뒤 외부 그룹에 빌드를 연결하고 이메일 또는 공개 링크로 초대합니다.[3]
4. 외부 테스터에게는 “확인할 항목”을 명확히 제공합니다. Route는 위치 권한 허용/거부, 사진 첨부, 네이버 전환 및 복귀, 앱 재실행 후 진행 상태 복원, 공개 코스 신고 흐름을 중점으로 봅니다.
5. Apple은 앱당 최대 10,000명의 외부 테스터를 허용하며, 외부 TestFlight 심사는 24시간에 최대 6개 빌드를 제출할 수 있다고 안내합니다.[3]

## 6. App Review 제출 체크리스트

- [ ] 최신 TestFlight 빌드에서 치명적 오류 없이 로그인·지도·코스·사진·길찾기·계정 삭제가 동작한다.
- [ ] 개인정보 처리방침 URL, 지원 URL, App Privacy 답변, 연령 등급, 콘텐츠 권한 응답을 모두 입력했다.
- [ ] 심사자가 바로 로그인할 수 있는 테스트 계정 또는 심사 전용 접근 수단을 제공했다.
- [ ] Google Maps, 네이버, 저장소, 분석 도구 등 제3자 데이터 흐름을 개인정보 공개에 반영했다.
- [ ] 공개 코스·프로필의 신고와 사용자 차단 기능, 운영 대응 이메일을 제공했다.
- [ ] 권한 거부 상태에서도 앱이 멈추지 않고 지역 선택·장소 탐색 등 대체 흐름을 제공한다.
- [ ] 위치·사진 목적 설명은 실제 사용 기능과 일치하며, 필요할 때만 권한을 요청한다.
- [ ] App Store 화면의 스크린샷·설명·키워드가 실제 Route 기능과 일치한다.
- [ ] App Review 정보에 로그인·외부 네이버 이동·데모 데이터 접근 방법을 적었다.

Apple은 제출 전에 앱·메타데이터·테스트 계정·백엔드 서비스 정보를 완전하고 정확하게 제공해야 한다고 명시합니다.[1] 공개 사용자 콘텐츠를 다룰 경우 부적절한 콘텐츠 필터링, 신고, 악성 사용자 차단 수단도 요구합니다.[1]

## 7. Route 기준 권장 일정

| 기간 | 목표 | 완료 산출물 |
|---|---|---|
| 1주차 | 네이티브 전환 설계 | 운영 API·OAuth·Bundle ID 확정, Capacitor iOS 프로젝트 생성, 권한·딥링크 설계 |
| 2주차 | iOS 기능 보완 | 위치·사진·네이버 외부 이동·로그인 실기기 테스트, 계정 삭제·신고/차단 기능 개발 |
| 3주차 | 메타데이터·TestFlight | 정책 페이지, 아이콘·스크린샷, App Privacy 답변, 내부 TestFlight 테스트 |
| 4주차 | 외부 베타·심사 | 외부 테스트 피드백 반영, 심사 메모·테스트 계정 정리, App Review 제출 |

## 8. 지금 바로 할 일

1. **App Store용 iOS 전환 작업을 별도 브랜치에서 시작합니다.** 현재 앱은 웹앱이므로 Capacitor·iOS 프로젝트·운영 API 환경을 먼저 추가해야 합니다.
2. **개인정보 처리방침과 지원 페이지를 Route 웹사이트에 먼저 공개합니다.** 이후 App Privacy 데이터 표를 실제 코드·외부 SDK 기준으로 채웁니다.
3. **계정 삭제와 공개 코스 신고·차단 기능을 다음 개발 우선순위로 구현합니다.** 이는 기능 정리보다 앱 심사 통과 가능성에 직접 영향을 줍니다.

## 참고 자료

[1]: https://developer.apple.com/app-store/review/guidelines/ "Apple App Review Guidelines"
[2]: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/ "Manage app privacy — App Store Connect Help"
[3]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/ "Invite external testers — App Store Connect Help"
[4]: https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/ "Add a new app — App Store Connect Help"
[5]: https://developer.apple.com/news/upcoming-requirements/ "Upcoming Requirements — Apple Developer"
