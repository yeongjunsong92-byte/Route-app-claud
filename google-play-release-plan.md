# Route Google Play 첫 무료 출시 계획

> **결론부터:** Route를 Google Play에서 **무료 앱**으로 배포할 수 있습니다. 다만 무료는 앱 가격·구독·인앱 결제를 받지 않는다는 뜻이며, Play Console 개발자 계정 등록은 별도의 일회성 등록비와 신원 확인이 필요합니다.[1] 현재 Route는 React·Express 웹앱이므로, 먼저 Android 앱 번들(AAB)로 전환해야 합니다.

> **2026-08-22 현재 상태:** Route는 매니페스트, 서비스 워커, 홈 화면 설치 안내를 갖춘 **PWA**로 구성되어 비용 없이 URL 배포·홈 화면 설치가 가능합니다. 다만 Android/Capacitor 프로젝트, AAB, 확정 운영 도메인, Android용 OAuth 복귀 설정은 아직 없으므로 Play Console에 제출할 단계는 아닙니다. PWA는 Play 스토어 AAB를 대체하지 않습니다.

## 1. 가장 먼저 알아둘 기준

| 항목 | Route 기준 결정 |
|---|---|
| 배포 가격 | **무료**로 설정합니다. 첫 출시에서는 광고, 구독, 인앱 결제를 넣지 않습니다. |
| 개발자 계정 | 대학생 개인 출시라면 **Personal account**로 시작할 수 있습니다. 본인 신원 확인과 개인 계정 테스트 조건을 충족해야 합니다.[1] |
| 등록 비용 | 무료 앱이어도 Play Console 등록 절차에는 **일회성 등록비**가 있습니다. Google의 최신 결제 화면에서 실제 원화 청구 금액과 사용 가능한 카드 조건을 확인한 뒤 결제합니다.[1] |
| 첫 프로덕션 출시 | 신규 개인 계정은 최소 **12명**이 **14일 연속** 참여한 비공개 테스트를 완료한 뒤 프로덕션 액세스를 신청해야 합니다.[2] |
| Android 형식 | Google Play에는 서명된 **Android App Bundle(AAB)** 을 올립니다. Google Play가 기기별 APK를 생성·배포합니다.[3] |
| 최신 SDK | 2026년 8월 31일부터 새 앱은 **Android 16 / API 36 이상**을 target SDK로 제출해야 합니다.[4] |

## 2. Route를 Android 앱으로 전환하는 작업

현재 Route는 웹앱이므로 Play Console에 바로 올릴 수 없습니다. 기존 화면과 API를 최대한 유지하는 현실적인 경로는 **Capacitor 기반 Android 컨테이너**입니다. React UI는 재사용하고, Android 프로젝트와 네이티브 권한·외부 앱 전환만 추가합니다.

| 순서 | 구현할 작업 | Route에서 확인할 결과 |
|---|---|---|
| 1 | 운영 환경 확정 | HTTPS 운영 웹 주소, Express/tRPC API 주소, Google Maps 도메인 제한과 OAuth 콜백을 확정합니다. 로컬 Manus 미리보기 URL은 출시 앱의 운영 API로 사용하지 않습니다. |
| 2 | Capacitor Android 추가 | `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`을 추가하고 Android Studio 프로젝트를 생성합니다. |
| 3 | 앱 식별자 결정 | 예: `com.routeapp.route` 같은 고유 package name을 정합니다. package name은 Play에서 영구적이므로 신중히 확정합니다.[3] |
| 4 | 네이티브 권한 연결 | 현재 위치에는 Android 위치 권한, 방문 사진에는 Camera/Photos 권한을 연결합니다. 권한 거부 시에도 지역 검색·코스 탐색은 계속 가능해야 합니다. |
| 5 | 외부 앱 연결 | 네이버 길안내와 링크 공유는 WebView의 임시 동작에 의존하지 않고 Capacitor Browser·App URL 열기·Share 방식으로 실기기 검증합니다. |
| 6 | 인증 전환 | 현재 OAuth 로그인 결과가 Android 앱으로 안정적으로 복귀하도록 HTTPS App Link 또는 custom scheme과 운영 콜백 URL을 구성합니다. |
| 7 | AAB 생성 | Android Studio에서 `versionCode`를 매 업로드마다 증가시키고, API 36 target으로 signed release AAB를 생성합니다.[3] [4] |

### Android 전환 착수 전 확정할 값

| 항목 | 현재 상태 | 출시 전 필요한 결정 |
|---|---|---|
| 운영 도메인 | PWA는 현재 HTTPS 웹 배포 구조를 사용 | Publish 후 고정 운영 도메인을 확정하고 API·OAuth 허용 목록에 반영 |
| Android 패키지명 | 미생성 | 예: `com.routeapp.route`처럼 Play에서 재사용하지 않을 식별자 확정 |
| Android 프로젝트 | 미생성 | Capacitor Android 프로젝트와 서명 키 생성 |
| AAB | 미생성 | API 36 이상 target의 signed release AAB 생성 |
| Play Console | 로그인·등록 미확인 | 개인 계정 등록·신원 확인·테스트 기기 인증 완료 |

## 3. Play Console 최초 설정

| 순서 | Play Console에서 할 일 | Route 입력값 |
|---|---|---|
| 1 | 개발자 계정 생성 | 개인 Google 계정으로 가입하고 Developer Distribution Agreement에 동의합니다. |
| 2 | 계정 유형·신원 확인 | 개인(Personal) 계정을 선택하고 요청되는 신원·기기 인증을 완료합니다.[1] |
| 3 | 앱 만들기 | **Create app**에서 기본 언어 `한국어`, 이름 `Route`, 유형 `App`, 가격 `Free`, 지원 이메일을 입력합니다.[3] |
| 4 | App signing | 첫 AAB 업로드에서 **Play App Signing**을 구성합니다. Android 앱은 서명되어야 합니다.[3] |
| 5 | 앱 콘텐츠 | 개인정보 처리방침, Data safety, 광고 여부, 콘텐츠 등급, 앱 액세스(심사용 로그인), 타깃 연령을 실제 기능 기준으로 답합니다. |
| 6 | 스토어 등록정보 | 설명, 아이콘, 스크린샷, 기능 그래픽, 지원 이메일, 웹사이트를 채웁니다. 앱 이름은 30자, 짧은 설명은 80자, 전체 설명은 4,000자 제한입니다.[3] |

## 4. Route에 필요한 정책·심사 보완

| 항목 | 출시 전 준비할 내용 |
|---|---|
| 개인정보 처리방침 | 위치, 계정 정보, 저장 장소·코스·메모·사진, Google Maps, 저장소, 공개 코스 데이터를 어떤 목적으로 다루는지 공개 HTTPS 페이지로 작성합니다. |
| Data safety | 앱 코드와 모든 제3자 SDK 기준으로 수집·공유·암호화·삭제 가능 여부를 정확하게 선언합니다. “수집하지 않음”으로 추정 응답하면 안 됩니다. |
| 계정 삭제 | 계정 생성 기능이 있는 Route는 앱 안에서 계정 삭제 요청과 처리 결과를 제공하는 것이 안전합니다. |
| 공개 코스 | 공개 코스·프로필을 운영한다면 신고와 사용자 차단, 운영 문의 채널을 마련합니다. |
| 심사자 접근 | 로그인 화면이 있으면 심사자가 사용할 테스트 계정, 로그인 순서, 지도·현재 위치·네이버 외부 전환 설명을 App access에 제공합니다. |
| 권한 | 위치·사진은 기능을 실행할 때만 요청하고, 거부 시에도 대체 탐색 흐름을 제공합니다. |

## 5. 테스트부터 프로덕션까지의 실제 순서

1. **Android 내부 테스트:** 개발자 본인 휴대폰에서 로그인, 위치 권한 허용·거부, 지도, 장소 저장, 코스 생성, 사진 기록, 네이버 길안내, 로그아웃을 점검합니다.
2. **Internal testing:** 소수의 팀원에게 AAB를 배포해 설치·업데이트·충돌을 확인합니다.
3. **Closed testing:** 신규 개인 계정이라면 최소 12명의 실제 테스터를 모집해 14일 연속 opt-in 상태를 유지합니다. 이 기간에 버그를 수정해 새 빌드를 배포할 수 있습니다.[2]
4. **Production access 신청:** 14일 조건을 충족하면 Dashboard에서 **Apply for production**을 선택하고, 테스트·앱·출시 준비도에 관한 질문에 답합니다.[2]
5. **Production release:** 사전 점검을 통과한 AAB를 프로덕션 트랙에 넣고, 무료·배포 국가·출시 방식을 최종 확인한 뒤 게시합니다.

## 6. Route 첫 출시용 스토어 문구 초안

| 항목 | 초안 |
|---|---|
| 앱 이름 | `Route` |
| 짧은 설명 | `발견한 장소를 저장하고 나만의 여행 코스로 완성하세요.` |
| 핵심 스크린샷 구성 | ① 현재 위치 기반 지도 ② 장소 상세·저장 ③ 코스 제작 ④ 진행 지도·시간축 ⑤ 여행 기록·완료 화면 |
| 지원 이메일 | 출시 전 실제로 확인 가능한 Route 문의 이메일을 사용합니다. Play Console에서 지원 이메일은 필수입니다.[3] |
| 카테고리 | `Travel & Local`을 우선 검토합니다. |

## 7. 최소 일정과 지금 해야 할 일

| 기간 | 목표 | 현재 사용자 행동 |
|---|---|---|
| 1주차 | Android 전환 시작 | Play Console 개인 계정을 만들고, Android package name과 운영 API 도메인을 확정합니다. |
| 2주차 | 실기기 기능 완료 | Capacitor Android 빌드에서 지도·로그인·위치·사진·네이버 전환을 점검합니다. |
| 3주차 | 정책·스토어 자산 | 개인정보 처리방침, Data safety 초안, 아이콘·스크린샷·설명문을 준비합니다. |
| 4~5주차 | Closed testing | 12명 이상에게 비공개 테스트 참여를 요청하고 14일을 채웁니다.[2] |
| 6주차 이후 | 프로덕션 신청 | 테스트 결과를 정리하고 Production access 및 무료 출시를 신청합니다. |

## 참고 자료

[1]: https://support.google.com/googleplay/android-developer/answer/6112435?hl=en "Get started with Play Console"
[2]: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en "App testing requirements for new personal developer accounts"
[3]: https://support.google.com/googleplay/android-developer/answer/9859152?hl=en "Create and set up your app"
[4]: https://developer.android.com/google/play/requirements/target-sdk "Meet Google Play's target API level requirement"
