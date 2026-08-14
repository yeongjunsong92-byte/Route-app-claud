# Route 시안 재현 검증 기록

2026-08-14 기준으로 `pnpm check`와 `pnpm test`를 실행했다. TypeScript 검사는 오류 없이 통과했으며 Vitest는 2개 테스트 파일에서 총 4개 테스트가 통과했다.

모바일 412×900 뷰포트에서 Route 홈 화면을 캡처해 시안 기준의 모바일 프레임, 보라색 추천 코스 카드, 공개 코스 카드, 하단 4탭 네비게이션을 확인했다. 지도 화면은 `MapView`에 Google Maps API를 연결하고, 검색어·카테고리 필터에 따라 장소 목록과 `AdvancedMarkerElement` 마커를 갱신하도록 구성했다. Google Maps API가 준비되지 않은 경우에는 템플릿 MapView의 로딩/오류 처리 영역을 사용한다.

검증 시나리오는 다음과 같다. 지도 탭에서 검색창과 필터를 조작하면 목록과 마커 데이터가 동일한 `filteredPlaces`를 사용한다. 장소 카드의 저장 버튼은 바텀시트를 열고 실제 `places.toggleSaved` mutation을 호출한다. 코스 생성 4단계에서는 장소별 방문 시간과 비용 상태를 사용해 저장 payload와 최종 총액을 구성한다. 공개 코스 상세 타임라인의 장소 카드는 장소 상세 화면으로 이동하고, 장소 상세의 저장 버튼은 동일한 저장 바텀시트로 연결된다. 마이페이지 닉네임 저장은 `auth.updateProfile` mutation을 호출한다.
