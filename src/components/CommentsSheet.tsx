// src/components/CommentsSheet.tsx
// 피드 게시물의 댓글 목록/작성/삭제를 담당하는 바텀시트.

import { useEffect, useState } from "react";
import { X, Send, Trash2, Loader2 } from "lucide-react";
import { getComments, createComment, deleteComment, createNotification } from "../lib/firestore";
import type { Comment, FeedPost } from "../lib/types";

interface CommentsSheetProps {
  post: FeedPost;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatarUrl?: string;
  onClose: () => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
}

function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 60) return `${Math.max(diffMin, 1)}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export default function CommentsSheet({
  post,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  onClose,
  onCommentCountChange,
}: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getComments(post.id);
      setComments(list);
    } catch (err) {
      console.error(err);
      setError("댓글을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || !currentUserId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const id = await createComment({
        postId: post.id,
        authorId: currentUserId,
        authorName: currentUserName ?? "여행자",
        authorAvatarUrl: currentUserAvatarUrl,
        content: trimmed,
      });
      setComments((prev) => [
        ...prev,
        { id, postId: post.id, authorId: currentUserId, authorName: currentUserName ?? "여행자", authorAvatarUrl: currentUserAvatarUrl, content: trimmed, createdAt: Date.now() },
      ]);
      onCommentCountChange?.(post.id, 1);
      setContent("");
      // 게시물 작성자에게 댓글 알림을 보냅니다. 본인 게시물에 본인이 댓글을 단 경우는
      // createNotification 내부에서 자동으로 무시됩니다.
      createNotification({
        recipientId: post.authorId,
        actorId: currentUserId,
        actorName: currentUserName ?? "여행자",
        actorPhotoURL: currentUserAvatarUrl ?? "",
        type: "comment",
        targetId: post.courseId,
        targetType: "course",
        message: "회원님의 게시물에 댓글을 남겼습니다",
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
      setError("댓글 등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    try {
      await deleteComment(comment.id, post.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      onCommentCountChange?.(post.id, -1);
    } catch (err) {
      console.error(err);
      setError("댓글 삭제에 실패했어요.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-[480px] items-end justify-center bg-gray-800/40">
      <div className="animate-sheet-up flex h-[75vh] w-full flex-col rounded-t-3xl bg-white">
        <div className="flex items-center justify-between border-b border-gray-300 px-5 py-3.5">
          <h2 className="text-base font-semibold text-gray-800">댓글 {comments.length > 0 && comments.length}</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="tap-scale flex h-8 w-8 items-center justify-center rounded-full bg-paper text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" />
              불러오는 중...
            </div>
          )}

          {!loading && error && <p className="py-6 text-center text-sm text-gray-600">{error}</p>}

          {!loading && !error && comments.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-600">
              아직 댓글이 없어요. 첫 댓글을 남겨보세요!
            </p>
          )}

          {!loading &&
            !error &&
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5 py-2.5">
                <img
                  src={comment.authorAvatarUrl || "https://api.dicebear.com/9.x/initials/svg?seed=" + comment.authorName}
                  alt={comment.authorName}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800">
                    {comment.authorName}
                    <span className="ml-1.5 text-[11px] font-normal text-gray-600">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-gray-800">{comment.content}</p>
                </div>
                {currentUserId === comment.authorId && (
                  <button
                    onClick={() => handleDelete(comment)}
                    aria-label="댓글 삭제"
                    className="tap-scale shrink-0 text-gray-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-300 px-5 py-3 safe-bottom">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={currentUserId ? "댓글을 남겨보세요" : "로그인 후 댓글을 남길 수 있어요"}
            disabled={!currentUserId}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-600 focus:border-primary focus:outline-none disabled:bg-paper"
          />
          <button
            onClick={handleSubmit}
            disabled={!currentUserId || !content.trim() || submitting}
            aria-label="댓글 등록"
            className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
