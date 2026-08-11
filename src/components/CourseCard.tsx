// src/components/CourseCard.tsx
// 코스 카드 — 시안 디자인 시스템 적용
// variant: "grid"(홈 "오늘의 추천 코스" 그리드형) | "list"(마이페이지 "내 코스" 리스트형)
//          | "horizontal"(지도 화면 등 가로 리스트형)

import { Heart, MapPin, Calendar } from "lucide-react";
import { getDDayLabel, getTripStatus } from "../lib/types";
import type { Course } from "../lib/types";

interface CourseCardProps {
  course: Course;
  onClick?: (course: Course) => void;
  variant?: "grid" | "list" | "horizontal";
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return "";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };
  return end && end !== start ? `${fmt(start)} ~ ${fmt(end)}` : fmt(start);
}

function formatWon(won?: number): string {
  if (!won) return "";
  return `${won.toLocaleString("ko-KR")}원`;
}

export default function CourseCard({ course, onClick, variant = "grid" }: CourseCardProps) {
  if (variant === "horizontal") {
    return (
      <button
        onClick={() => onClick?.(course)}
        className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white p-2.5 text-left"
      >
        <img
          src={course.coverImageUrl}
          alt={course.title}
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-800">{course.title}</h3>
          <p className="mt-0.5 truncate text-xs text-gray-600">by {course.authorName}</p>
        </div>
      </button>
    );
  }

  if (variant === "list") {
    const status = getTripStatus(course);
    const ddayLabel = getDDayLabel(course);
    const statusStyle =
      status === "ongoing"
        ? "bg-primary text-white"
        : status === "done"
          ? "bg-gray-300 text-gray-600"
          : "bg-primary-light text-primary";

    return (
      <button
        onClick={() => onClick?.(course)}
        className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {ddayLabel && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}>
                {ddayLabel}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-gray-800">{course.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
            <Calendar size={12} />
            {formatDateRange(course.startDate, course.endDate) || `${course.durationDays}일 코스`}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {course.stops.length}곳 · 예상 {formatWon(course.budgetWon) || "비용 미정"}
          </p>
        </div>
        <img
          src={course.coverImageUrl}
          alt={course.title}
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      </button>
    );
  }

  // grid (기본): 홈 화면 "오늘의 추천 코스"
  return (
    <button
      onClick={() => onClick?.(course)}
      className="tap-scale relative h-[220px] w-[168px] shrink-0 overflow-hidden rounded-2xl text-left"
    >
      <img src={course.coverImageUrl} alt={course.title} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-800">
        <MapPin size={10} className="text-primary" />
        {course.region}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-white">
          {course.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/85">
          <span>{course.durationDays}일 · {course.stops.length}곳</span>
          <span className="flex items-center gap-0.5">
            <Heart size={11} className="fill-white text-white" />
            {course.likeCount}
          </span>
        </div>
      </div>
    </button>
  );
}
