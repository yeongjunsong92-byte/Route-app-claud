// src/screens/FollowListScreen.tsx
// 팔로워/팔로잉 목록 화면. 각 사용자를 누르면 해당 사용자 프로필로 이동합니다.

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, RefreshCw, UserRound } from "lucide-react";
import { getFollowers, getFollowing } from "../lib/firestore";
import type { UserProfile } from "../lib/types";

interface FollowListScreenProps {
  userId: string;
  kind: "followers" | "following";
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export default function FollowListScreen({
  userId,
  kind,
  onClose,
  onOpenProfile,
}: FollowListScreenProps) {
  const [list, setList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = kind === "followers" ? await getFollowers(userId) : await getFollowing(userId);
      setList(result);
    } catch (err) {
      console.error(err);
      setError("목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, kind]);

  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-paper pb-10 safe-bottom">
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
        >
          <X size={16} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-800">{kind === "followers" ? "팔로워" : "팔로잉"}</h1>
        <div className="h-9 w-9" />
      </header>

      <div className="mt-4 px-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
            <Loader2 size={16} className="animate-spin" />
            불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-16">
            <AlertCircle size={20} className="text-gray-600" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={load}
              className="tap-scale flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <RefreshCw size={12} />
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-600">
            {kind === "followers" ? "아직 팔로워가 없어요." : "아직 팔로우한 사용자가 없어요."}
          </p>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="flex flex-col gap-2">
            {list.map((p) => (
              <button
                key={p.uid}
                onClick={() => onOpenProfile(p.uid)}
                className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white p-3 text-left"
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.displayName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                    <UserRound size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{p.displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-600">{p.bio || "아직 소개가 없어요"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
