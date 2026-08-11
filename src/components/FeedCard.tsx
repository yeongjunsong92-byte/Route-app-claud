// src/components/FeedCard.tsx
// 피드 게시물 카드 — 시안 디자인 시스템 적용
// 헤더(아바타·유저명·지역·시간) + 코스 제목 + 캡션 + 이미지 그리드 + 좋아요/댓글/저장

import { useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import type { FeedPost } from "../lib/types";

interface FeedCardProps {
  post: FeedPost;
  onToggleLike?: (post: FeedPost, nextLiked: boolean) => void;
  onToggleSave?: (post: FeedPost, nextSaved: boolean) => void;
  onCommentClick?: (post: FeedPost) => void;
  onCourseClick?: (courseId: string) => void;
  onMoreClick?: (post: FeedPost) => void;
}

function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 60) return `${Math.max(diffMin, 1)}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export default function FeedCard({
  post,
  onToggleLike,
  onToggleSave,
  onCommentClick,
  onCourseClick,
  onMoreClick,
}: FeedCardProps) {
  const [liked, setLiked] = useState(!!post.isLiked);
  const [saved, setSaved] = useState(!!post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    onToggleLike?.(post, next);
  };

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    onToggleSave?.(post, next);
  };

  const visibleImages = post.images.slice(0, 3);
  const extraCount = post.images.length - visibleImages.length;

  return (
    <article className="border-b border-gray-300 bg-white px-4 py-4">
      <header className="flex items-center gap-2.5">
        <img
          src={post.authorAvatarUrl}
          alt={post.authorName}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800">{post.authorName}</p>
          <p className="truncate text-[11px] text-gray-600">
            {[post.location, timeAgo(post.createdAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {onMoreClick && (
          <button
            onClick={() => onMoreClick(post)}
            aria-label="더보기"
            className="tap-scale flex h-8 w-8 shrink-0 items-center justify-center text-gray-600"
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </header>

      {post.course && (
        <button
          onClick={() => onCourseClick?.(post.courseId)}
          className="mt-3 block text-left text-[15px] font-bold text-gray-800"
        >
          {post.course.title}
        </button>
      )}
      <p className="mt-1 text-sm leading-relaxed text-gray-800">{post.caption}</p>

      {visibleImages.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {visibleImages.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-xl">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === visibleImages.length - 1 && extraCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                  +{extraCount}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4">
        <button onClick={handleLike} className="tap-scale flex items-center gap-1.5" aria-label="좋아요">
          <Heart
            size={20}
            className={liked ? "fill-primary text-primary" : "text-gray-800"}
            strokeWidth={1.8}
          />
          <span className="text-sm text-gray-600">{likeCount}</span>
        </button>
        <button
          onClick={() => onCommentClick?.(post)}
          className="tap-scale flex items-center gap-1.5"
          aria-label="댓글"
        >
          <MessageCircle size={20} className="text-gray-800" strokeWidth={1.8} />
          <span className="text-sm text-gray-600">{post.commentCount}</span>
        </button>
        <button
          onClick={handleSave}
          className="tap-scale ml-auto flex items-center gap-1.5"
          aria-label={saved ? "저장 취소" : "저장"}
        >
          <Bookmark
            size={20}
            className={saved ? "fill-primary text-primary" : "text-gray-800"}
            strokeWidth={1.8}
          />
          <span className="text-sm text-gray-600">{post.saveCount}</span>
        </button>
      </div>
    </article>
  );
}
