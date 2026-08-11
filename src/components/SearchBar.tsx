// src/components/SearchBar.tsx
// 검색 바 — 홈/지도 화면 공용, 시안 디자인 시스템 적용

import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (keyword: string) => void;
  onFilterClick?: () => void;
}

export default function SearchBar({
  placeholder = "어디로 가볼까요?",
  onSearch,
  onFilterClick,
}: SearchBarProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    onSearch?.(value.trim());
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5">
        <Search size={18} className="shrink-0 text-gray-600" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-600 focus:outline-none"
        />
      </div>
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          aria-label="필터"
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white"
        >
          <SlidersHorizontal size={18} className="text-primary" />
        </button>
      )}
    </div>
  );
}
