// src/components/BottomNav.tsx
// 하단 탭 네비게이션 — 시안 디자인 시스템(Primary #FF6891) 적용

import { Home, MapIcon, PlusIcon, Rss, CircleUserRound } from "lucide-react";
import type { BottomNavKey } from "../lib/types";

interface BottomNavProps {
  active: BottomNavKey;
  onChange: (key: BottomNavKey) => void;
}

const TABS: { key: BottomNavKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "홈", icon: Home },
  { key: "map", label: "지도", icon: MapIcon },
  { key: "create", label: "코스 만들기", icon: PlusIcon },
  { key: "feed", label: "피드", icon: Rss },
  { key: "mypage", label: "마이", icon: CircleUserRound },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-gray-300 bg-white/95 backdrop-blur safe-bottom">
      <ul className="flex items-center justify-between px-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          const isCreate = key === "create";

          if (isCreate) {
            return (
              <li key={key} className="-mt-5 flex-1">
                <button
                  onClick={() => onChange(key)}
                  aria-label={label}
                  aria-current={isActive}
                  className="tap-scale mx-auto flex h-14 w-14 flex-col items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_16px_rgba(255,104,145,0.45)]"
                >
                  <Icon size={26} strokeWidth={2.5} />
                </button>
              </li>
            );
          }

          return (
            <li key={key} className="flex-1">
              <button
                onClick={() => onChange(key)}
                aria-label={label}
                aria-current={isActive}
                className="tap-scale flex w-full flex-col items-center gap-1 py-2.5"
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={isActive ? "text-primary" : "text-gray-600"}
                />
                <span
                  className={`text-[11px] ${
                    isActive ? "font-semibold text-primary" : "text-gray-600"
                  }`}
                >
                  {label === "코스 만들기" ? "만들기" : label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
