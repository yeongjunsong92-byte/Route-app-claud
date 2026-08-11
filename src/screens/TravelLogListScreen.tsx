// src/screens/TravelLogListScreen.tsx
// 여행 기록(Travel Log) 목록 화면.
// TravelNavigator에서 여행을 완료할 때마다 자동으로 쌓인 기록을 리스트형/카드형으로,
// 시작 날짜 최신순(Firestore 쿼리 orderBy startedAt desc)으로 보여줍니다.

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, RefreshCw, CalendarDays, List, LayoutGrid } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyTravelLogs } from "../lib/firestore";
import { formatDistance } from "../lib/googleMaps";
import type { TravelLog } from "../lib/types";

interface TravelLogListScreenProps {
  onClose: () => void;
  onOpenLog: (logId: string) => void;
}

type ViewMode = "list" | "card";

function formatLogDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function TravelLogListScreen({ onClose, onOpenLog }: TravelLogListScreenProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [logs, setLogs] = useState<TravelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await getMyTravelLogs(user.uid);
      setLogs(result);
    } catch (err) {
      console.error(err);
      setError("여행 기록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

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
        <h1 className="text-base font-bold text-gray-800">여행 기록</h1>
        <div className="flex h-9 items-center gap-0.5 rounded-full bg-primary-light p-1">
          <button
            onClick={() => setViewMode("list")}
            aria-label="리스트형으로 보기"
            className={`tap-scale flex h-7 w-7 items-center justify-center rounded-full ${
              viewMode === "list" ? "bg-primary text-white" : "text-primary"
            }`}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setViewMode("card")}
            aria-label="카드형으로 보기"
            className={`tap-scale flex h-7 w-7 items-center justify-center rounded-full ${
              viewMode === "card" ? "bg-primary text-white" : "text-primary"
            }`}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
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

        {!loading && !error && logs.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-600">
            아직 완료한 여행 기록이 없어요. 코스를 따라 여행을 완료하면 여기에 자동으로 기록돼요.
          </p>
        )}

        {!loading && !error && logs.length > 0 && viewMode === "list" && (
          <div className="flex flex-col gap-2.5">
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => onOpenLog(log.id)}
                className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      log.isCompleted ? "bg-primary text-white" : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {log.isCompleted ? "완료" : "진행중"}
                  </span>
                  <h3 className="mt-1.5 truncate text-base font-semibold text-gray-800">
                    {log.courseTitle}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <CalendarDays size={12} />
                    {formatLogDate(log.startedAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {log.visitedPlaceCount}곳 방문 · {formatDistance(log.distanceMeters)}
                  </p>
                </div>
                {log.coverImageUrl && (
                  <img
                    src={log.coverImageUrl}
                    alt={log.courseTitle}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {!loading && !error && logs.length > 0 && viewMode === "card" && (
          <div className="grid grid-cols-2 gap-3">
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => onOpenLog(log.id)}
                className="tap-scale relative h-[180px] w-full overflow-hidden rounded-2xl text-left"
              >
                {log.coverImageUrl && (
                  <img
                    src={log.coverImageUrl}
                    alt={log.courseTitle}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-800">
                  {log.isCompleted ? "완료" : "진행중"}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-white">
                    {log.courseTitle}
                  </h3>
                  <p className="mt-1 text-[10px] text-white/85">
                    {formatLogDate(log.startedAt)} · {log.visitedPlaceCount}곳
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
