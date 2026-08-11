// src/lib/aiRecommend.ts
// AI 여행 코스 추천 연동.
//
// 보안: AI API Secret Key는 절대 브라우저 코드/Vite 환경변수(VITE_*)에 두지 않습니다.
// 이 파일은 Firebase Cloud Functions의 콜러블 함수(recommendCourse)만 호출하고,
// 실제 Anthropic API 키와 호출은 서버(functions/src/index.ts)에서만 이루어집니다.
//
// AI 응답에는 장소의 실제 좌표/주소가 없으므로, 여기서는 "장소 이름 제안"까지만 담당하고,
// 실제 Place 데이터(좌표 포함)로의 변환은 화면(AIRecommendScreen)에서 기존 Google Places 검색으로 처리합니다.
//
// AI가 잘못된 형식으로 응답하더라도 화면이 깨지지 않도록, 여기서 받은 원문(raw)을 반드시
// parseAIRecommendation()으로 검증한 뒤에만 사용해야 합니다 (검증 실패 시 null 반환).

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { PlaceCategory } from "./types";

// ---------- 추천 요청 입력 ----------
// Course/Place 타입과 필드명이 겹치지 않도록 별도 타입으로 정의합니다.
export interface AIRecommendInput {
  region: string;
  travelerType: string; // 혼자 / 커플 / 가족 / 친구
  duration: string; // 당일치기 / 1박2일 / 2박3일
  interests: string[]; // 맛집/카페/자연/문화/야경/드라이브/액티비티/힐링 중 선택
}

// ---------- AI 응답(검증 후) ----------
export interface AIRecommendedStop {
  name: string;
  category: PlaceCategory;
  reason: string;
  estimatedMinutes: number;
}

export interface AIRecommendation {
  title: string;
  description: string;
  reason: string;
  stops: AIRecommendedStop[];
  estimatedDurationMinutes: number;
}

const VALID_CATEGORIES: readonly PlaceCategory[] = [
  "cafe",
  "restaurant",
  "nature",
  "culture",
  "activity",
  "stay",
  "shopping",
];

function isPlaceCategory(value: unknown): value is PlaceCategory {
  return typeof value === "string" && (VALID_CATEGORIES as string[]).includes(value);
}

/**
 * Cloud Function이 돌려준 원문(raw AI 텍스트)을 안전하게 파싱/검증합니다.
 * 형식이 조금이라도 어긋나면(필드 누락, 타입 불일치 등) null을 반환하며,
 * 이 경우 호출부는 반드시 fallback(오류 안내) 처리를 해야 합니다 — 절대 그대로 화면에 출력하지 않습니다.
 */
export function parseAIRecommendation(raw: string): AIRecommendation | null {
  let json: unknown;
  try {
    const match = raw.match(/\{[\s\S]*\}/); // 잡담/코드블록이 섞여 와도 첫 JSON 객체만 추출
    json = JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }

  if (typeof json !== "object" || json === null) return null;
  const obj = json as Record<string, unknown>;

  if (typeof obj.title !== "string" || !obj.title.trim()) return null;
  if (!Array.isArray(obj.stops) || obj.stops.length === 0) return null;

  const stops: AIRecommendedStop[] = [];
  for (const rawStop of obj.stops) {
    if (typeof rawStop !== "object" || rawStop === null) continue;
    const s = rawStop as Record<string, unknown>;
    if (typeof s.name !== "string" || !s.name.trim()) continue;
    stops.push({
      name: s.name.trim(),
      category: isPlaceCategory(s.category) ? s.category : "culture",
      reason: typeof s.reason === "string" ? s.reason : "",
      estimatedMinutes:
        typeof s.estimatedMinutes === "number" && s.estimatedMinutes > 0 ? s.estimatedMinutes : 60,
    });
  }
  if (stops.length === 0) return null;

  return {
    title: obj.title.trim(),
    description: typeof obj.description === "string" ? obj.description : "",
    reason: typeof obj.reason === "string" ? obj.reason : "",
    stops,
    estimatedDurationMinutes:
      typeof obj.estimatedDurationMinutes === "number" && obj.estimatedDurationMinutes > 0
        ? obj.estimatedDurationMinutes
        : stops.reduce((sum, s) => sum + s.estimatedMinutes, 0),
  };
}

interface RecommendCourseResponse {
  raw: string;
}

/**
 * 선택 정보를 바탕으로 Cloud Function(recommendCourse)에 AI 추천을 요청합니다.
 * 로그인하지 않은 상태로 호출하면 함수 쪽에서 "unauthenticated" 오류를 던집니다.
 */
export async function requestAIRecommendation(input: AIRecommendInput): Promise<AIRecommendation> {
  const call = httpsCallable<AIRecommendInput, RecommendCourseResponse>(functions, "recommendCourse");

  let response;
  try {
    response = await call(input);
  } catch (err) {
    console.error(err);
    throw new Error("AI_REQUEST_FAILED");
  }

  const parsed = parseAIRecommendation(response.data.raw);
  if (!parsed) throw new Error("AI_INVALID_RESPONSE");
  return parsed;
}
