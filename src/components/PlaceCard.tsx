// src/components/PlaceCard.tsx
// 장소 카드 — 시안 디자인 시스템 적용
// variant: "row"(기본, 지도 바텀시트/AI추천 리스트) | "compact"(홈 화면 가로 스크롤용 미니 카드)
// addStyle: "icon"(원형 +/체크 버튼) | "pill"("추가" 텍스트 버튼, AI 추천 리스트용)

import { Star, Plus, Check } from "lucide-react";
import { CATEGORY_META } from "../lib/types";
import type { Place } from "../lib/types";

interface PlaceCardProps {
  place: Place;
  onAdd?: (place: Place) => void;
  added?: boolean;
  order?: number;
  distanceLabel?: string; // 예: "260m", "도보 5분"
  variant?: "row" | "compact";
  addStyle?: "icon" | "pill";
}

export default function PlaceCard({
  place,
  onAdd,
  added,
  order,
  distanceLabel,
  variant = "row",
  addStyle = "icon",
}: PlaceCardProps) {
  const meta = CATEGORY_META[place.category];

  if (variant === "compact") {
    return (
      <div className="w-[136px] shrink-0">
        <div className="relative h-24 w-full overflow-hidden rounded-2xl">
          <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" />
          <span
            className="absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        <h4 className="mt-2 truncate text-sm font-medium text-gray-800">{place.name}</h4>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-600">
          {distanceLabel && <span>{distanceLabel}</span>}
          <span className="flex items-center gap-0.5">
            <Star size={10} className="fill-primary text-primary" />
            {place.rating.toFixed(1)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-white p-2.5">
      {order !== undefined && (
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: meta.color }}
        >
          {order}
        </div>
      )}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
          {distanceLabel && <span className="text-[11px] text-gray-600">{distanceLabel}</span>}
        </div>
        <h4 className="mt-1 truncate text-sm font-medium text-gray-800">{place.name}</h4>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
          <span className="flex items-center gap-0.5">
            <Star size={11} className="fill-primary text-primary" />
            {place.rating.toFixed(1)}
          </span>
          <span className="truncate">{place.address}</span>
        </div>
      </div>
      {onAdd &&
        (addStyle === "pill" ? (
          <button
            onClick={() => onAdd(place)}
            className={`tap-scale shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              added ? "bg-primary-light text-primary" : "bg-primary text-white"
            }`}
          >
            {added ? "추가됨" : "추가"}
          </button>
        ) : (
          <button
            onClick={() => onAdd(place)}
            aria-label={added ? "코스에서 제거" : "코스에 추가"}
            className={`tap-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              added ? "bg-primary text-white" : "border border-gray-300 text-primary"
            }`}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
          </button>
        ))}
    </div>
  );
}
