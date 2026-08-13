// src/screens/PlaceDetailScreen.tsx
// 장소 상세 화면. 기존 Place 데이터만 사용하며, 1차 MVP에서는 코스 추가와 위치 확인에 집중합니다.

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Map as MapIcon,
  MapPin,
  Navigation2,
  Plus,
  Share,
  Star,
} from "lucide-react";
import PlaceMap from "../components/PlaceMap";
import { useAuth } from "../context/AuthContext";
import { getSavedPlaceStatus, toggleSavedPlace } from "../lib/firestore";
import { CATEGORY_META } from "../lib/types";
import type { Place } from "../lib/types";

interface PlaceDetailScreenProps {
  place: Place | null;
  onClose: () => void;
  onAddToCourse?: (place: Place) => void;
}

type Tab = "소개" | "리뷰" | "사진";
const TABS: Tab[] = ["소개", "리뷰", "사진"];

// 저장·공유·리뷰·사진 탭은 확장 기능으로 보존하고 1차 MVP 화면에서는 비노출 처리합니다.
const LEGACY_SOCIAL_ACTIONS_ENABLED = false;
const LEGACY_CONTENT_TABS_ENABLED = false;

export default function PlaceDetailScreen({ place, onClose, onAddToCourse }: PlaceDetailScreenProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("소개");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setTab("소개");
    setSaved(false);
    setShowMap(false);
    if (!place || !user) return;
    getSavedPlaceStatus(place.id, user.uid)
      .then(setSaved)
      .catch((err) => console.error(err));
  }, [place, user]);

  if (!place) return null;

  const meta = CATEGORY_META[place.category];

  // 저장과 공유 코드는 추후 확장용으로 유지합니다. 1차 MVP UI에서는 호출하지 않습니다.
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
        // 사용자가 공유를 취소하거나 실패하면 링크 복사를 시도합니다.
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
    <div className="fixed inset-0 z-[75] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper pb-28 safe-bottom">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={onClose}
          aria-label="뒤로"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-card"
        >
          <ArrowLeft size={16} className="text-gray-800" />
        </button>
        <p className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-card">장소 정보</p>
        <span className="h-9 w-9" aria-hidden="true" />
      </header>

      <div className="relative h-60 w-full shrink-0 bg-primary-light">
        <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-800/35 to-transparent" />
        {LEGACY_SOCIAL_ACTIONS_ENABLED && toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800/85 px-3 py-1.5 text-xs text-white">
            {toast}
          </div>
        )}
      </div>

      <main className="px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span
              className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-800">{place.name}</h1>
            {place.rating > 0 && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {place.rating.toFixed(1)} <span className="text-gray-600">({place.reviewCount})</span>
              </p>
            )}
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary-light text-secondary shadow-card">
            <MapPin size={18} />
          </span>
        </div>

        <section className="mt-5 rounded-2xl border border-gray-300 bg-white p-4 shadow-card">
          <div className="flex items-start gap-3">
            <MapPin size={17} className="mt-0.5 shrink-0 text-primary-dark" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800">위치</p>
              <p className="mt-1 text-sm leading-5 text-gray-600">{place.address}</p>
            </div>
          </div>
          <button
            onClick={() => setShowMap((current) => !current)}
            className="tap-scale mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary-light text-sm font-semibold text-primary-dark"
          >
            <MapIcon size={15} />
            {showMap ? "지도 접기" : "지도에서 보기"}
          </button>
        </section>

        {showMap && (
          <section className="mt-3 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-card">
            <PlaceMap
              places={[place]}
              selectedPlaceId={place.id}
              center={{ lat: place.lat, lng: place.lng }}
              heightClassName="h-[260px]"
            />
          </section>
        )}

        <section className="mt-5">
          <p className="text-xs font-semibold text-secondary">ABOUT THIS PLACE</p>
          <h2 className="mt-1 text-base font-semibold text-gray-800">장소 소개</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {place.description || "아직 등록된 소개글이 없어요. 지도에서 위치를 확인하고 코스에 담아보세요."}
          </p>
          {place.tags && place.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {place.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium text-primary-dark"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {LEGACY_CONTENT_TABS_ENABLED && (
          <section className="mt-5">
            <div className="flex border-b border-gray-300">
              {TABS.map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
                    tab === item ? "border-b-2 border-primary text-primary" : "text-gray-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="py-4">
              {tab === "소개" && <p className="text-sm text-gray-600">{place.description}</p>}
              {tab === "리뷰" && <p className="py-6 text-center text-sm text-gray-600">아직 리뷰 기능은 준비 중이에요.</p>}
              {tab === "사진" && (
                <div className="grid grid-cols-3 gap-1.5">
                  <img src={place.imageUrl} alt={place.name} className="aspect-square rounded-lg object-cover" />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-1/2 z-[76] flex w-full max-w-[480px] -translate-x-1/2 gap-2 border-t border-gray-300 bg-paper px-5 pb-6 pt-3 safe-bottom">
        {LEGACY_SOCIAL_ACTIONS_ENABLED && (
          <div className="hidden">
            <button onClick={handleToggleSave} disabled={!user || pending} aria-label="저장">
              <Bookmark size={1} className={saved ? "fill-primary text-primary" : ""} />
            </button>
            <button onClick={handleShare} aria-label="공유"><Share size={1} /></button>
          </div>
        )}
        <button
          onClick={handleDirections}
          className="tap-scale flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800"
          aria-label="외부 길찾기"
        >
          <Navigation2 size={17} />
        </button>
        <button
          onClick={() => onAddToCourse?.(place)}
          disabled={!onAddToCourse}
          className="tap-scale flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary-dark text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus size={17} />
          코스에 추가
          <Check size={15} className="opacity-75" />
        </button>
      </footer>
    </div>
  );
}
