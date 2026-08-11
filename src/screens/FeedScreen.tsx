// src/screens/FeedScreen.tsx
// 피드 화면: 다른 여행자들의 게시물을 둘러보는 SNS 피드.
// [2단계] dummy → 실제 Firestore(getFeedPosts) 연동 + 좋아요/저장이 새로고침 후에도 유지되도록 처리 + 댓글 연결

import { useEffect, useState } from "react";
import { Compass, Loader2, RefreshCw } from "lucide-react";
import FeedCard from "../components/FeedCard";
import CommentsSheet from "../components/CommentsSheet";
import { useAuth } from "../context/AuthContext";
import {
  getFeedPosts,
  getFeedPostsByAuthors,
  getFollowingIds,
  getUserLikedPostIds,
  getUserSavedPostIds,
  toggleLike,
  toggleSave,
  createNotification,
} from "../lib/firestore";
import type { FeedPost } from "../lib/types";

type FeedTab = "추천" | "팔로잉" | "최신";
const TABS: FeedTab[] = ["추천", "팔로잉", "최신"];

interface FeedScreenProps {
  onOpenCourse: (courseId: string) => void;
  onGoToMap?: () => void;
}

export default function FeedScreen({ onOpenCourse, onGoToMap }: FeedScreenProps) {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<FeedTab>("추천");

  // 좋아요/저장 버튼 연타 방지용: 지금 Firestore 요청이 진행 중인 postId 집합
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeCommentPost, setActiveCommentPost] = useState<FeedPost | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // "팔로잉" 탭: 실제 팔로우한 사람들의 게시물만.
      // "최신" 탭: 기존 그대로 최신순(getFeedPosts는 createdAt desc로 이미 정렬됨).
      // "추천" 탭: 별도 추천 알고리즘/컬렉션 없이, 최근 게시물 중 좋아요+댓글이 많은 순으로
      //   정렬해서 보여줍니다(단순 인기순 근사치). 추가 Firestore 쿼리/인덱스 없이
      //   기존 getFeedPosts 결과를 그대로 재사용합니다.
      let list: FeedPost[];
      if (tab === "팔로잉") {
        if (!user) {
          setPosts([]);
          return;
        }
        const followingIds = await getFollowingIds(user.uid);
        list = await getFeedPostsByAuthors(followingIds, 20);
      } else if (tab === "추천") {
        const latest = await getFeedPosts(30);
        list = latest
          .slice()
          .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
          .slice(0, 20);
      } else {
        list = await getFeedPosts(20);
      }

      // 현재 로그인 사용자가 이미 좋아요/저장한 게시물인지 한 번에 조회해서
      // 새로고침 후에도 하트/북마크가 채워진 상태로 보이게 합니다.
      if (user && list.length > 0) {
        const postIds = list.map((p) => p.id);
        const [likedIds, savedIds] = await Promise.all([
          getUserLikedPostIds(user.uid, postIds),
          getUserSavedPostIds(user.uid, postIds),
        ]);
        setPosts(
          list.map((p) => ({
            ...p,
            isLiked: likedIds.has(p.id),
            isSaved: savedIds.has(p.id),
          }))
        );
      } else {
        setPosts(list.map((p) => ({ ...p, isLiked: false, isSaved: false })));
      }
    } catch (err) {
      console.error(err);
      setError("피드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, tab]);

  const withPendingGuard = (id: string, fn: () => Promise<void>) => {
    if (pendingIds.has(id)) return; // 이미 요청 중이면 무시 (연타 방지)
    setPendingIds((prev) => new Set(prev).add(id));
    fn().finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };

  const handleToggleLike = (post: FeedPost) => {
    if (!user) return;
    withPendingGuard(post.id, async () => {
      try {
        const result = await toggleLike(post.id, user.uid);
        // 좋아요가 눌린 경우에만(취소가 아니라) 알림을 생성합니다. 자기 게시물에 자기가
        // 좋아요를 누른 경우는 createNotification 내부에서 자동으로 무시됩니다.
        if (result) {
          createNotification({
            recipientId: post.authorId,
            actorId: user.uid,
            actorName: profile?.displayName ?? user.displayName ?? "여행자",
            actorPhotoURL: profile?.avatarUrl ?? user.photoURL ?? "",
            type: "like",
            targetId: post.courseId,
            targetType: "course",
            message: "회원님의 게시물을 좋아합니다",
          }).catch((err) => console.error(err));
        }
      } catch (err) {
        console.error(err);
        // 실패 시 목록을 다시 불러와서 실제 서버 상태로 UI를 맞춥니다.
        load();
      }
    });
  };

  const handleToggleSave = (post: FeedPost) => {
    if (!user) return;
    withPendingGuard(`save-${post.id}`, async () => {
      try {
        await toggleSave(post.id, user.uid);
      } catch (err) {
        console.error(err);
        load();
      }
    });
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + delta } : p))
    );
  };

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold text-gray-800">피드</h1>
        <button
          onClick={onGoToMap}
          disabled={!onGoToMap}
          className="tap-scale flex items-center gap-1 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-40"
        >
          <Compass size={14} />
          둘러보기
        </button>
      </header>

      <div className="flex border-b border-gray-300 px-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
          <Loader2 size={16} className="animate-spin" />
          피드를 불러오는 중...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
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

      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-24 text-center">
          <p className="text-sm text-gray-600">
            {tab === "팔로잉"
              ? "아직 팔로우한 사용자의 게시물이 없어요."
              : "아직 피드에 게시물이 없어요."}
          </p>
          <p className="text-xs text-gray-600">
            {tab === "팔로잉" ? "관심있는 여행자를 팔로우해보세요." : "여행 코스를 만들고 첫 게시물을 남겨보세요."}
          </p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="flex flex-col">
          {posts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              onCourseClick={onOpenCourse}
              onToggleLike={() => handleToggleLike(post)}
              onToggleSave={() => handleToggleSave(post)}
              onCommentClick={() => setActiveCommentPost(post)}
            />
          ))}
        </div>
      )}

      {activeCommentPost && (
        <CommentsSheet
          post={activeCommentPost}
          currentUserId={user?.uid}
          currentUserName={profile?.displayName ?? user?.displayName ?? undefined}
          currentUserAvatarUrl={profile?.avatarUrl ?? user?.photoURL ?? undefined}
          onClose={() => setActiveCommentPost(null)}
          onCommentCountChange={handleCommentCountChange}
        />
      )}
    </div>
  );
}
