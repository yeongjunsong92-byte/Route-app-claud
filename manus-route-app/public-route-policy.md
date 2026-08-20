# 공개 Route 데이터 정책

Route는 별도의 `public_courses` 테이블을 만들지 않고 `courses.isPublic` 필드를 공개 여부의 단일 기준으로 사용한다. 공개 코스 피드는 `listPublicCourses()`를 통해 `isPublic = true`인 코스를 조회하며, 코스 상세와 저장 기능은 해당 코스의 실제 `courses` 및 `course_items` 데이터를 참조한다.

이 구조는 코스의 작성자·공개 상태·장소 일정을 하나의 도메인 모델 안에서 유지하기 위한 결정이다. UI에서 `PUBLIC` 배지가 표시되는 코스는 이 필드가 true인 경우이며, 기본 코스 생성은 비공개 상태로 저장된다.
