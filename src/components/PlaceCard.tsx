// src/components/PlaceCard.tsx
// 장소 카드 — row는 Map 등에서 optional 선택 콜백을 받을 수 있고, compact는 Home용 미니 카드입니다.

import { Check, Plus, Star } from "lucide-react";
import { CATEGORY_META } from "../lib/types";
import type { Place } from "../lib/types";

interface PlaceCardProps {
  place: Place;
  onAdd?: (place: Place) => void;
  onSelect?: (place: Place) => void;
  added?: boolean;
  selected?: boolean;
  order?: number;
  distanceLabel?: string;
  variant?: "row" | "compact";
  addStyle?: "icon" | "pill";
}

export default function PlaceCard({
  place,
  onAdd,
  onSelect,
  added,
  selected = false,
  order,
  distanceLabel,
  variant = "row",
  addStyle = "icon",
}: PlaceCardProps) {
  const meta = CATEGORY_META[place.category];
  const isSelectable = Boolean(onSelect);

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

  const handleSelect = () => onSelect?.(place);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-white p-2.5 transition-shadow ${
        selected ? "border-primary-dark ring-2 ring-primary/30" : "border-gray-300"
      } ${isSelectable ? "cursor-pointer shadow-card focus:outline-none" : ""}`}
      onClick={isSelectable ? handleSelect : undefined}
      onKeyDown={
        isSelectable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelect();
              }
            }
          : undefined
      }
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-pressed={isSelectable ? selected : undefined}
    >
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
            onClick={(event) => {
              event.stopPropagation();
              onAdd(place);
            }}
            className={`tap-scale shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              added ? "bg-primary-light text-primary-dark" : "bg-primary text-white"
            }`}
          >
            {added ? "추가됨" : "추가"}
          </button>
        ) : (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAdd(place);
            }}
            aria-label={added ? "코스에서 제거" : "코스에 추가"}
            className={`tap-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              added ? "bg-primary text-white" : "border border-gray-300 text-primary-dark"
            }`}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
          </button>
        ))}
    </div>
  );
}
