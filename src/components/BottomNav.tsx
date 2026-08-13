// src/components/BottomNav.tsx
// Route 1차 MVP 하단 내비게이션 — 4개 목적지와 코스 만들기 보조 동작을 분리합니다.

import { BookOpen, CircleUserRound, Home, MapIcon, PlusIcon } from "lucide-react";
import type { BottomNavKey } from "../lib/types";

interface BottomNavProps {
  active: BottomNavKey;
  onChange: (key: BottomNavKey) => void;
  onCreateCourse: () => void;
}

const TABS: { key: BottomNavKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "홈", icon: Home },
  { key: "map", label: "지도", icon: MapIcon },
  { key: "courses", label: "내 코스", icon: BookOpen },
  { key: "mypage", label: "마이", icon: CircleUserRound },
];

export default function BottomNav({ active, onChange, onCreateCourse }: BottomNavProps) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-gray-300 bg-white/95 backdrop-blur">
      <button
        onClick={onCreateCourse}
        aria-label="코스 만들기"
        className="tap-scale absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_rgba(190,135,155,0.35)]"
      >
        <PlusIcon size={26} strokeWidth={2.4} />
      </button>

      <ul className="grid grid-cols-4 px-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;

          return (
            <li key={key}>
              <button
                onClick={() => onChange(key)}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className="tap-scale flex w-full flex-col items-center gap-1 py-2.5"
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={isActive ? "text-primary-dark" : "text-gray-600"}
                />
                <span className={`text-[11px] ${isActive ? "font-semibold text-primary-dark" : "text-gray-600"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
