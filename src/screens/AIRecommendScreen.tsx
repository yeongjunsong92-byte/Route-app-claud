// src/screens/AIRecommendScreen.tsx
// AI 여행 추천 화면: 여행 유형/기간/스타일/지역을 선택하면 Cloud Function을 통해 AI가 코스
// (제목/설명/추천 이유/장소 목록/예상 소요시간)를 추천하고, 추천 장소는 기존 Google Places
// 검색으로 실제 좌표를 가진 Place로 변환한 뒤 "내 코스로 저장" 시 기존 Course/CourseStop
// 구조 그대로 Firestore에 저장합니다.
//
// AI 응답은 lib/aiRecommend.ts의 parseAIRecommendation()으로 반드시 검증된 것만 여기로 들어오며,
// Google Places에서 실제로 검색되지 않는 장소는 화면에 표시하지 않고 안내만 남깁니다.

import { useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { X, Loader2, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";
import PlaceCard from "../components/PlaceCard";
import { useAuth } from "../context/AuthContext";
import { createCourse } from "../lib/firestore";
import { requestAIRecommendation } from "../lib/aiRecommend";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  REGION_COORDS,
  REGIONS,
  toAppPlace,
} from "../lib/googleMaps";
import type { AIRecommendation } from "../lib/aiRecommend";
import type { CourseStop, Place } from "../lib/types";

interface AIRecommendScreenProps {
  onClose: () => void;
}

const TRAVELER_TYPE_OPTIONS = ["혼자", "커플", "가족", "친구"];
const DURATION_OPTIONS = ["당일치기", "1박2일", "2박3일"];
const INTEREST_OPTIONS = ["맛집", "카페", "자연", "문화", "야경", "드라이브", "액티비티", "힐링"];
const DURATION_TO_DAYS: Record<string, number> = { "당일치기": 1, "1박2일": 2, "2박3일": 3 };

type Phase = "select" | "loading" | "result" | "saved";
type ErrorKind = "" | "request-failed" | "invalid-response" | "no-places-found";

/** Google Places Text Search로 AI가 제안한 장소 이름을 실제 Place(좌표 포함)로 변환합니다.
 * AI가 지어낸 장소일 수 있으므로, 검색 결과가 없으면 null을 반환해 화면에 표시하지 않습니다. */
function searchPlace(
  query: string,
  region: string,
  center: { lat: number; lng: number }
): Promise<Place | null> {
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    service.textSearch(
      {
        query: `${query} ${region}`,
        location: new google.maps.LatLng(center.lat, center.lng),
        radius: 20000,
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
          resolve(toAppPlace(results[0], region));
        } else {
          resolve(null);
        }
      }
    );
  });
}

export default function AIRecommendScreen({ onClose }: AIRecommendScreenProps) {
  const { user, profile } = useAuth();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [region, setRegion] = useState(REGIONS[0]!);
  const [travelerType, setTravelerType] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("select");
  const [errorKind, setErrorKind] = useState<ErrorKind>("");

  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [resolvedStops, setResolvedStops] = useState<CourseStop[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const canSubmit = !!travelerType && !!duration && interests.length > 0 && isLoaded;

  const handleSubmit = async () => {
    if (!canSubmit || !travelerType || !duration) return;
    setPhase("loading");
    setErrorKind("");

    let result: AIRecommendation;
    try {
      result = await requestAIRecommendation({ region, travelerType, duration, interests });
    } catch (err) {
      console.error(err);
      // AI_INVALID_RESPONSE: 서버 호출은 성공했지만 AI가 이상한 형식으로 답한 경우 → fallback 안내.
      // 그 외(AI_REQUEST_FAILED 등): 네트워크/서버/API 오류 → 재시도 안내.
      const message = err instanceof Error ? err.message : "";
      setErrorKind(message === "AI_INVALID_RESPONSE" ? "invalid-response" : "request-failed");
      setPhase("select");
      return;
    }

    try {
      const center = REGION_COORDS[region] ?? REGION_COORDS[REGIONS[0]!]!;
      const resolved = await Promise.all(
        result.stops.map(async (s) => {
          const place = await searchPlace(s.name, region, center);
          return place ? { place, memo: s.reason, stayMinutes: s.estimatedMinutes } : null;
        })
      );

      const stops: CourseStop[] = resolved
        .filter((r): r is { place: Place; memo: string; stayMinutes: number } => r !== null)
        .map((r, i) => ({ order: i + 1, place: r.place, memo: r.memo, stayMinutes: r.stayMinutes }));

      if (stops.length === 0) {
        setErrorKind("no-places-found");
        setPhase("select");
        return;
      }

      setSkippedCount(result.stops.length - stops.length);
      setRecommendation(result);
      setResolvedStops(stops);
      setPhase("result");
    } catch (err) {
      // Google Places 검색 자체가 실패한 경우(네트워크 등)도 흰 화면 대신 안내로 처리합니다.
      console.error(err);
      setErrorKind("no-places-found");
      setPhase("select");
    }
  };

  const handleSave = async () => {
    if (!user || !recommendation || resolvedStops.length === 0 || !duration) return;
    setSaving(true);
    setSaveError("");
    try {
      const authorName = profile?.displayName ?? user.displayName ?? "여행자";
      const authorAvatarUrl = profile?.avatarUrl || user.photoURL || undefined;
      await createCourse({
        title: recommendation.title,
        description: recommendation.description || recommendation.reason,
        coverImageUrl: resolvedStops[0]?.place.imageUrl ?? "",
        region,
        authorId: user.uid,
        authorName,
        ...(authorAvatarUrl ? { authorAvatarUrl } : {}),
        stops: resolvedStops,
        durationDays: DURATION_TO_DAYS[duration] ?? 1,
        tags: interests,
        isPublic: false,
      });
      setPhase("saved");
    } catch (err) {
      console.error(err);
      setSaveError("저장 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setPhase("select");
    setRecommendation(null);
    setResolvedStops([]);
    setSkippedCount(0);
    setSaveError("");
  };

  const errorMessage =
    errorKind === "request-failed"
      ? "추천을 받아오지 못했어요. 잠시 후 다시 시도해주세요."
      : errorKind === "invalid-response"
        ? "AI 응답을 이해하지 못했어요. 다시 시도해주세요."
        : errorKind === "no-places-found"
          ? "추천 장소를 지도에서 찾지 못했어요. 다른 조건으로 다시 시도해주세요."
          : "";

  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper safe-bottom">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
        >
          <X size={16} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-800">AI 여행 추천</h1>
        <div className="h-9 w-9" />
      </header>

      {phase === "select" && (
        <>
          <div className="flex-1 px-5 pb-32">
            <section>
              <h2 className="text-base font-semibold text-gray-800">지역</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      region === r
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>

            <div className="route-divider my-5" />

            <section>
              <h2 className="text-base font-semibold text-gray-800">누구와 함께 떠나요?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRAVELER_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setTravelerType(option)}
                    className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      travelerType === option
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <div className="route-divider my-5" />

            <section>
              <h2 className="text-base font-semibold text-gray-800">여행 기간</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setDuration(option)}
                    className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      duration === option
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <div className="route-divider my-5" />

            <section>
              <h2 className="text-base font-semibold text-gray-800">여행 스타일 (여러 개 선택 가능)</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleInterest(option)}
                    className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      interests.includes(option)
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-paper px-5 pb-6 pt-3 safe-bottom">
            {errorMessage && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-card">
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle size={13} className="shrink-0" />
                  {errorMessage}
                </p>
                <button
                  onClick={handleSubmit}
                  aria-label="다시 시도"
                  className="tap-scale flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  <RefreshCw size={11} />
                  재시도
                </button>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="tap-scale flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-40"
            >
              <Sparkles size={16} />
              AI로 코스 추천받기
            </button>
          </div>
        </>
      )}

      {phase === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-gray-600">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm">여행 코스를 만들고 있어요...</p>
          <p className="text-xs text-gray-600">{region} · AI가 어울리는 장소를 고르는 중이에요</p>
        </div>
      )}

      {phase === "result" && recommendation && (
        <>
          <div className="flex-1 px-5 pb-32">
            <p className="text-xs font-medium text-secondary">
              {region} · 약 {Math.round(recommendation.estimatedDurationMinutes / 60)}시간
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-800">{recommendation.title}</h2>
            {recommendation.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {recommendation.description}
              </p>
            )}
            {recommendation.reason && (
              <p className="mt-1 text-xs leading-relaxed text-primary">{recommendation.reason}</p>
            )}

            <div className="route-divider my-5" />

            <h3 className="text-base font-semibold text-gray-800">
              추천 장소 ({resolvedStops.length})
            </h3>
            {skippedCount > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-600">
                <AlertCircle size={12} className="shrink-0" />
                {skippedCount}곳은 지도에서 찾을 수 없어 제외했어요.
              </p>
            )}
            <div className="mt-3 flex flex-col gap-3">
              {resolvedStops.map((stop, i) => (
                <div key={stop.place.id}>
                  <PlaceCard place={stop.place} order={i + 1} variant="row" />
                  {stop.memo && <p className="mt-1.5 pl-2 text-xs text-primary">{stop.memo}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-paper px-5 pb-6 pt-3 safe-bottom">
            {saveError && (
              <p className="mb-2 rounded-lg bg-white px-3 py-2 text-center text-xs text-red-500 shadow-card">
                {saveError}
              </p>
            )}
            {!user && (
              <p className="mb-2 rounded-lg bg-white px-3 py-2 text-center text-xs text-gray-600 shadow-card">
                로그인 후 저장할 수 있어요.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleRestart}
                className="tap-scale flex h-12 flex-1 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-800"
              >
                다시 선택
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !user}
                className="tap-scale flex h-12 flex-[2] items-center justify-center rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "이 코스를 내 코스로 저장"}
              </button>
            </div>
          </div>
        </>
      )}

      {phase === "saved" && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Check size={30} className="text-white" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-800">코스로 저장했어요!</h2>
          <p className="mt-1 text-sm text-gray-600">마이페이지 &gt; 내 코스에서 확인할 수 있어요.</p>
          <button
            onClick={onClose}
            className="tap-scale mt-6 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
          >
            확인
          </button>
        </div>
      )}

      {phase === "select" && !isLoaded && (
        <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl bg-primary-light px-3 py-2 text-xs text-primary">
          <AlertCircle size={14} className="shrink-0" />
          지도를 불러오는 중이에요. 잠시만 기다려주세요.
        </div>
      )}
    </div>
  );
}
