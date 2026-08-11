// src/screens/PlaceDetailScreen.tsx
// 장소 상세 전체 화면. 코스 상세의 타임라인/지도 마커를 눌렀을 때 이동합니다.
// 사진은 Place 타입에 1장만 있어 캐러셀 대신 대표 사진 1장을 보여주고,
// 리뷰 데이터는 별도로 수집하지 않으므로 "리뷰" 탭은 준비 중 안내로 정직하게 표시합니다
// (실제로 없는 리뷰를 지어내지 않습니다).

import { useEffect, useState } from "react";
import { ArrowLeft, Star, Bookmark, Share, Navigation2, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toggleSavedPlace, getSavedPlaceStatus } from "../lib/firestore";
import { CATEGORY_META } from "../lib/types";
import type { Place } from "../lib/types";

interface PlaceDetailScreenProps {
  place: Place | null;
  onClose: () => void;
}

type Tab = "소개" | "리뷰" | "사진";
const TABS: Tab[] = ["소개", "리뷰", "사진"];

export default function PlaceDetailScreen({ place, onClose }: PlaceDetailScreenProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("소개");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setTab("소개");
    setSaved(false);
    if (!place || !user) return;
    getSavedPlaceStatus(place.id, user.uid)
      .then(setSaved)
      .catch((err) => console.error(err));
  }, [place, user]);

  if (!place) return null;

  const meta = CATEGORY_META[place.category];

  const handleToggleSave = async () => {
    if (!user || pending) return;
    setPending(true);
    const prev = saved;
    setSaved(!prev);
    try {
      const result = await toggleSavedPlace(place, user.uid);
      setSaved(result);
    } catch (err) {
      console.error(err);
      setSaved(prev);
    } finally {
      setPending(false);
    }
  };

  const handleShare = async () => {
    const url = `https://www.google.com/maps/place/?q=place_id:${place.id}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: place.name, text: place.address, url });
        return;
      } catch {
        // 취소되었거나 실패하면 아래에서 링크 복사로 대체합니다.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("링크가 복사되었어요");
    } catch {
      setToast("공유에 실패했어요");
    }
    setTimeout(() => setToast(null), 2000);
  };

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${place.id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[75] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper pb-8 safe-bottom">
      <div className="relative h-56 w-full shrink-0">
        <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={onClose}
            aria-label="뒤로"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-card"
          >
            <ArrowLeft size={16} className="text-gray-800" />
          </button>
          <button
            onClick={handleShare}
            aria-label="공유"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-card"
          >
            <Share size={16} className="text-gray-800" />
          </button>
        </div>
        {toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800/85 px-3 py-1.5 text-xs text-white">
            {toast}
          </div>
        )}
      </div>

      <div className="px-5 pt-4">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
        <h2 className="mt-2 text-xl font-bold text-gray-800">{place.name}</h2>
        {place.rating > 0 && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {place.rating.toFixed(1)} ({place.reviewCount})
          </p>
        )}
        <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-600">
          <MapPin size={12} />
          {place.address}
        </p>

        <div className="mt-4 flex border-b border-gray-300">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
                tab === t ? "border-b-2 border-primary text-primary" : "text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="py-4">
          {tab === "소개" && (
            <>
              <p className="text-sm leading-relaxed text-gray-800">
                {place.description || "아직 등록된 소개글이 없어요."}
              </p>
              {place.tags && place.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {place.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "리뷰" && (
            <p className="py-6 text-center text-sm text-gray-600">
              아직 리뷰 기능은 준비 중이에요.
            </p>
          )}
          {tab === "사진" && (
            <div className="grid grid-cols-3 gap-1.5">
              <img src={place.imageUrl} alt={place.name} className="aspect-square rounded-lg object-cover" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex gap-2 px-5 pt-3">
        <button
          onClick={handleToggleSave}
          disabled={!user || pending}
          className="tap-scale flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-800 disabled:opacity-40"
        >
          <Bookmark size={16} className={saved ? "fill-primary text-primary" : ""} />
          {saved ? "저장됨" : "저장"}
        </button>
        <button
          onClick={handleDirections}
          className="tap-scale flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-white"
        >
          <Navigation2 size={16} />
          길찾기
        </button>
      </div>
    </div>
  );
}
