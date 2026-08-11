// functions/src/index.ts
// Route 앱의 AI 여행 코스 추천 Cloud Function.
//
// 이 함수가 존재하는 이유: Anthropic API Secret Key는 절대로 브라우저(React/Vite) 코드나
// VITE_ 접두사 환경변수에 둘 수 없습니다. 그래서 클라이언트는 이 콜러블 함수만 호출하고,
// 실제 AI API 키와 fetch 호출은 여기(Cloud Functions, 서버 측)에서만 이루어집니다.
//
// 배포 전 1회, Firebase Secret Manager에 키를 등록하세요 (터미널에서, 저장소에는 절대 커밋하지 않음):
//   firebase functions:secrets:set ANTHROPIC_API_KEY
//
// 배포: firebase deploy --only functions

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

interface RecommendCourseRequest {
  region: string;
  travelerType: string;
  duration: string;
  interests: string[];
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content?: AnthropicContentBlock[];
}

function isRecommendCourseRequest(data: unknown): data is RecommendCourseRequest {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.region === "string" &&
    typeof d.travelerType === "string" &&
    typeof d.duration === "string" &&
    Array.isArray(d.interests) &&
    d.interests.every((v) => typeof v === "string")
  );
}

function buildPrompt(input: RecommendCourseRequest): string {
  return `당신은 한국 여행 코스를 추천하는 여행 전문가입니다.
아래 조건에 맞는 여행 코스를 추천해주세요.

- 지역: ${input.region}
- 여행 유형: ${input.travelerType}
- 여행 기간: ${input.duration}
- 여행 스타일: ${input.interests.join(", ") || "특별한 선호 없음"}

반드시 아래 JSON 형식으로만 답변하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON 객체만 출력하세요.
{
  "title": "코스 제목 (15자 이내)",
  "description": "코스에 대한 짧은 설명 (1~2문장)",
  "reason": "이 코스를 추천하는 이유 (2~3문장)",
  "stops": [
    {
      "name": "실제 존재하는 장소명",
      "category": "nature|cafe|restaurant|culture|activity|stay|shopping 중 하나",
      "reason": "이 장소를 방문하면 좋은 이유 (1문장)",
      "estimatedMinutes": 60
    }
  ],
  "estimatedDurationMinutes": 360
}
stops는 4~6개, "${input.region}" 지역에 실제로 존재할 법한 장소 이름으로 방문 순서대로 작성하세요.
estimatedDurationMinutes는 전체 코스의 예상 소요 시간(분)입니다.`;
}

export const recommendCourse = onCall(
  { secrets: [ANTHROPIC_API_KEY], cors: true },
  async (request) => {
    // 로그인한 사용자만 호출 가능 (기존 Firebase Authentication 그대로 사용)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!isRecommendCourseRequest(request.data)) {
      throw new HttpsError("invalid-argument", "요청 형식이 올바르지 않습니다.");
    }

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "AI_NOT_CONFIGURED");
    }

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          messages: [{ role: "user", content: buildPrompt(request.data) }],
        }),
      });
    } catch (err) {
      console.error("Anthropic API 호출 실패:", err);
      throw new HttpsError("unavailable", "AI_REQUEST_FAILED");
    }

    if (!response.ok) {
      console.error("Anthropic API 오류 응답:", response.status, await response.text());
      throw new HttpsError("internal", `AI_REQUEST_FAILED_${response.status}`);
    }

    const json = (await response.json()) as AnthropicMessagesResponse;
    const textBlock = json.content?.find((block) => block.type === "text" && block.text);
    if (!textBlock?.text) {
      throw new HttpsError("internal", "AI_EMPTY_RESPONSE");
    }

    // 여기서는 원문 텍스트만 돌려주고, JSON 파싱/필드 검증은 클라이언트의
    // parseAIRecommendation()에서 한 번 더 엄격하게 수행합니다(방어적 이중 검증).
    return { raw: textBlock.text };
  }
);
