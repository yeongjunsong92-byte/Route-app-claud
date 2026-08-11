// src/lib/firestore.ts
// 코스 / 피드 / 댓글 / 좋아요·저장 관련 Firestore 데이터 접근 함수

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  increment,
  serverTimestamp,
  runTransaction,
  writeBatch,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { CATEGORY_META } from "./types";
import type {
  AppNotification,
  Comment,
  Course,
  CourseStop,
  FeedPost,
  Place,
  TravelLog,
  UserProfile,
} from "./types";

export function toMillis(ts: Timestamp | number | undefined): number {
  if (!ts) return Date.now();
  return typeof ts === "number" ? ts : ts.toMillis();
}

/**
 * Firestore courses 문서의 stops 필드를 검증/정제합니다.
 *
 * 실제 운영 데이터는 언제든 예상과 다른 모양일 수 있습니다 (수동으로 만든 테스트 문서,
 * 이전 버전 코드로 저장된 문서, 마이그레이션 누락 등). 화면 컴포넌트들은 stop.place.id,
 * stop.place.category 같은 필드가 항상 존재한다고 믿고 그대로 접근하기 때문에, 이 검증 없이
 * 잘못된 문서 하나만 들어와도 HomeScreen/CourseDetailSheet 등이 렌더링 도중 그대로 죽습니다.
 *
 * 여기서 한 번 걸러서, 형태가 안 맞는 stop은 화면까지 못 가게 하고 콘솔에 경고만 남깁니다.
 * (전체 코스 하나가 통째로 안 보이는 것보다, 이상한 stop 하나만 조용히 빠지는 게 낫습니다.)
 */
function sanitizeStops(raw: unknown, courseId: string): CourseStop[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) {
      console.warn(`[firestore] courses/${courseId}.stops가 배열이 아니에요:`, raw);
    }
    return [];
  }

  const result: CourseStop[] = [];

  raw.forEach((rawStop, index) => {
    const stop = rawStop as Record<string, unknown> | null | undefined;
    const place = stop?.place as Record<string, unknown> | null | undefined;

    // place가 없거나, place.id/place.name처럼 화면에서 반드시 필요한 필드가 없으면 건너뜁니다.
    if (!place || typeof place.id !== "string" || typeof place.name !== "string") {
      console.warn(
        `[firestore] courses/${courseId}.stops[${index}]에 유효한 place가 없어 건너뜁니다:`,
        rawStop
      );
      return;
    }

    const category = typeof place.category === "string" && place.category in CATEGORY_META
      ? (place.category as Place["category"])
      : "culture"; // 알 수 없는 카테고리는 안전한 기본값으로

    const safePlace: Place = {
      id: place.id,
      name: place.name,
      category,
      address: typeof place.address === "string" ? place.address : "",
      region: typeof place.region === "string" ? place.region : "",
      lat: typeof place.lat === "number" ? place.lat : 0,
      lng: typeof place.lng === "number" ? place.lng : 0,
      imageUrl: typeof place.imageUrl === "string" ? place.imageUrl : "",
      rating: typeof place.rating === "number" ? place.rating : 0,
      reviewCount: typeof place.reviewCount === "number" ? place.reviewCount : 0,
      description: typeof place.description === "string" ? place.description : undefined,
      tags: Array.isArray(place.tags) ? (place.tags as string[]) : undefined,
    };

    result.push({
      order: typeof stop?.order === "number" ? stop.order : result.length + 1,
      place: safePlace,
      day: typeof stop?.day === "number" ? stop.day : undefined,
      time: typeof stop?.time === "string" ? stop.time : undefined,
      memo: typeof stop?.memo === "string" ? stop.memo : undefined,
      stayMinutes: typeof stop?.stayMinutes === "number" ? stop.stayMinutes : undefined,
    });
  });

  return result;
}

/**
 * Firestore에는 createdAt/updatedAt을 serverTimestamp()(Timestamp 객체)로 저장하지만,
 * 앱의 타입(Course/FeedPost/Comment/UserProfile)은 전부 createdAt을 number로 선언하고 있습니다.
 * 문서를 읽을 때마다 여기서 한 번에 number로 변환해서, 화면 쪽에서 Date.now() - createdAt 같은
 * 산술 연산을 해도 항상 안전하도록 통일합니다. (변환을 안 하면 FeedCard/CommentsSheet의
 * "n분 전" 표시가 NaN으로 깨집니다.)
 */
function mapCourseDoc(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    ...(data as Omit<Course, "id" | "createdAt" | "updatedAt" | "stops">),
    stops: sanitizeStops(data.stops, id),
    createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
    updatedAt: toMillis(data.updatedAt as Timestamp | number | undefined),
  };
}

function mapPostDoc(id: string, data: Record<string, unknown>): FeedPost {
  return {
    id,
    ...(data as Omit<FeedPost, "id" | "createdAt">),
    createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
  };
}

function mapCommentDoc(id: string, data: Record<string, unknown>): Comment {
  return {
    id,
    ...(data as Omit<Comment, "id" | "createdAt">),
    createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
  };
}

// ---------- Courses ----------

const coursesCol = collection(db, "courses");

export async function createCourse(
  course: Omit<Course, "id" | "createdAt" | "updatedAt" | "likeCount" | "saveCount">
): Promise<string> {
  const docRef = await addDoc(coursesCol, {
    ...course,
    likeCount: 0,
    saveCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, "courses", courseId));
  if (!snap.exists()) return null;
  return mapCourseDoc(snap.id, snap.data());
}

export async function getCoursesByRegion(region: string, take = 20): Promise<Course[]> {
  const q = query(
    coursesCol,
    where("region", "==", region),
    where("isPublic", "==", true),
    orderBy("createdAt", "desc"),
    fbLimit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCourseDoc(d.id, d.data()));
}

/** 지역 필터 없이 공개 코스를 최신순으로 가져옵니다 (홈 화면 "전체" 탭용). */
export async function getAllPublicCourses(take = 20): Promise<Course[]> {
  const q = query(coursesCol, where("isPublic", "==", true), orderBy("createdAt", "desc"), fbLimit(take));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCourseDoc(d.id, d.data()));
}

export async function getCoursesByAuthor(authorId: string): Promise<Course[]> {
  const q = query(coursesCol, where("authorId", "==", authorId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCourseDoc(d.id, d.data()));
}

/** 다른 사용자의 프로필에서 보여줄 공개 코스만 가져옵니다 (본인이 아니면 비공개 코스는 규칙상 조회 자체가 막힙니다). */
export async function getPublicCoursesByAuthor(authorId: string, take = 50): Promise<Course[]> {
  const q = query(
    coursesCol,
    where("authorId", "==", authorId),
    where("isPublic", "==", true),
    orderBy("createdAt", "desc"),
    fbLimit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCourseDoc(d.id, d.data()));
}

export async function updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
  await updateDoc(doc(db, "courses", courseId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await deleteDoc(doc(db, "courses", courseId));
}

// ---------- Feed ----------

const postsCol = collection(db, "posts");

/** 최신 피드 게시물 목록을 가져옵니다. FeedCard가 코스 제목을 보여줄 수 있도록,
 * 게시물에 연결된 Course 문서를 함께 조회해 `post.course`에 채워 넣습니다. */
export async function getFeedPosts(take = 20): Promise<FeedPost[]> {
  const q = query(postsCol, orderBy("createdAt", "desc"), fbLimit(take));
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => mapPostDoc(d.id, d.data()));

  const uniqueCourseIds = Array.from(new Set(posts.map((p) => p.courseId)));
  const courses = await Promise.all(uniqueCourseIds.map((id) => getCourse(id).catch(() => null)));
  const courseById = new Map(
    courses.filter((c): c is Course => c !== null).map((c) => [c.id, c] as const)
  );

  return posts.map((post) => ({ ...post, course: courseById.get(post.courseId) }));
}

/** "팔로잉" 탭용: 지정한 작성자들(내가 팔로우하는 사람들)의 게시물만 최신순으로 가져옵니다.
 * Firestore 'in' 쿼리는 최대 30개 값까지만 지원하므로 30개 단위로 잘라서 조회합니다. */
export async function getFeedPostsByAuthors(authorIds: string[], take = 20): Promise<FeedPost[]> {
  if (authorIds.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < authorIds.length; i += 30) chunks.push(authorIds.slice(i, i + 30));

  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(
        query(postsCol, where("authorId", "in", chunk), orderBy("createdAt", "desc"), fbLimit(take))
      )
    )
  );
  const posts = results
    .flatMap((snap) => snap.docs.map((d) => mapPostDoc(d.id, d.data())))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, take);

  const uniqueCourseIds = Array.from(new Set(posts.map((p) => p.courseId)));
  const courses = await Promise.all(uniqueCourseIds.map((id) => getCourse(id).catch(() => null)));
  const courseById = new Map(
    courses.filter((c): c is Course => c !== null).map((c) => [c.id, c] as const)
  );

  return posts.map((post) => ({ ...post, course: courseById.get(post.courseId) }));
}

export async function createFeedPost(
  post: Omit<FeedPost, "id" | "createdAt" | "likeCount" | "commentCount" | "saveCount">
): Promise<string> {
  const docRef = await addDoc(postsCol, {
    ...post,
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ---------- Like / Save (게시물) ----------
// likes/{postId_userId}, saves/{postId_userId} 형태의 문서로 여부를 관리합니다.
// 문서 ID를 결정적으로(postId_userId) 만들어서, 같은 유저가 같은 글에 두 번 좋아요 문서를
// 만드는 것 자체가 구조적으로 불가능합니다 (firestore.rules에서도 이 ID 형식을 강제).
//
// 트랜잭션으로 "좋아요 문서 존재 여부 확인 + 카운트 증감"을 원자적으로 처리해서,
// 빠르게 연타해도(중복 클릭) 카운트가 어긋나지 않습니다.

function toggleId(targetId: string, userId: string) {
  return `${targetId}_${userId}`;
}

/** 게시물 좋아요를 토글합니다. 반환값은 토글 이후의 좋아요 상태(true=좋아요 됨)입니다. */
export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  const likeRef = doc(db, "likes", toggleId(postId, userId));
  const postRef = doc(db, "posts", postId);

  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: increment(-1) });
      return false;
    }
    tx.set(likeRef, { postId, userId, createdAt: serverTimestamp() });
    tx.update(postRef, { likeCount: increment(1) });
    return true;
  });
}

/** 게시물 저장을 토글합니다. 반환값은 토글 이후의 저장 상태입니다. */
export async function toggleSave(postId: string, userId: string): Promise<boolean> {
  const saveRef = doc(db, "saves", toggleId(postId, userId));
  const postRef = doc(db, "posts", postId);

  return runTransaction(db, async (tx) => {
    const saveSnap = await tx.get(saveRef);
    if (saveSnap.exists()) {
      tx.delete(saveRef);
      tx.update(postRef, { saveCount: increment(-1) });
      return false;
    }
    tx.set(saveRef, { postId, userId, createdAt: serverTimestamp() });
    tx.update(postRef, { saveCount: increment(1) });
    return true;
  });
}

/**
 * 여러 게시물에 대해 현재 유저가 좋아요한 postId 집합을 한 번의 쿼리로 가져옵니다.
 * 새로고침 후에도 하트가 채워진 상태를 유지하려면, 피드를 불러올 때 이 함수로
 * 초기 isLiked 상태를 채워줘야 합니다.
 * Firestore 'in' 쿼리는 최대 30개 값까지만 지원하므로 30개 단위로 잘라서 조회합니다.
 */
export async function getUserLikedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  return getUserFlaggedIds("likes", userId, postIds, "postId");
}

export async function getUserSavedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  return getUserFlaggedIds("saves", userId, postIds, "postId");
}

async function getUserFlaggedIds(
  collectionName: string,
  userId: string,
  ids: string[],
  idField: string
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(
        query(
          collection(db, collectionName),
          where("userId", "==", userId),
          where(idField, "in", chunk)
        )
      )
    )
  );

  const set = new Set<string>();
  for (const snap of results) {
    for (const d of snap.docs) set.add((d.data() as Record<string, string>)[idField]!);
  }
  return set;
}

// ---------- Like / Save (코스) ----------
// courseLikes/{courseId_userId}, courseSaves/{courseId_userId} — 게시물과 동일한 패턴.

export async function toggleCourseLike(courseId: string, userId: string): Promise<boolean> {
  const likeRef = doc(db, "courseLikes", toggleId(courseId, userId));
  const courseRef = doc(db, "courses", courseId);

  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(courseRef, { likeCount: increment(-1) });
      return false;
    }
    tx.set(likeRef, { courseId, userId, createdAt: serverTimestamp() });
    tx.update(courseRef, { likeCount: increment(1) });
    return true;
  });
}

export async function toggleCourseSave(courseId: string, userId: string): Promise<boolean> {
  const saveRef = doc(db, "courseSaves", toggleId(courseId, userId));
  const courseRef = doc(db, "courses", courseId);

  return runTransaction(db, async (tx) => {
    const saveSnap = await tx.get(saveRef);
    if (saveSnap.exists()) {
      tx.delete(saveRef);
      tx.update(courseRef, { saveCount: increment(-1) });
      return false;
    }
    tx.set(saveRef, { courseId, userId, createdAt: serverTimestamp() });
    tx.update(courseRef, { saveCount: increment(1) });
    return true;
  });
}

/** 특정 코스에 대한 현재 유저의 좋아요/저장 여부를 확인합니다 (코스 상세 진입 시 1회 호출). */
export async function getCourseLikeSaveStatus(
  courseId: string,
  userId: string
): Promise<{ liked: boolean; saved: boolean }> {
  const [likeSnap, saveSnap] = await Promise.all([
    getDoc(doc(db, "courseLikes", toggleId(courseId, userId))),
    getDoc(doc(db, "courseSaves", toggleId(courseId, userId))),
  ]);
  return { liked: likeSnap.exists(), saved: saveSnap.exists() };
}

/** 내가 저장한 코스 목록. courseSaves에서 courseId를 모은 뒤 각 코스를 조회합니다. */
export async function getSavedCourses(userId: string, take = 20): Promise<Course[]> {
  const q = query(
    collection(db, "courseSaves"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    fbLimit(take)
  );
  const snap = await getDocs(q);
  const courseIds = snap.docs.map((d) => (d.data() as { courseId: string }).courseId);
  const courses = await Promise.all(courseIds.map((id) => getCourse(id)));
  return courses.filter((c): c is Course => c !== null);
}

// ---------- Comments ----------

const commentsCol = collection(db, "comments");

export async function getComments(postId: string, take = 50): Promise<Comment[]> {
  const q = query(
    commentsCol,
    where("postId", "==", postId),
    orderBy("createdAt", "asc"),
    fbLimit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCommentDoc(d.id, d.data()));
}

export async function createComment(
  comment: Omit<Comment, "id" | "createdAt">
): Promise<string> {
  const postRef = doc(db, "posts", comment.postId);
  const newCommentRef = doc(commentsCol);

  await runTransaction(db, async (tx) => {
    tx.set(newCommentRef, { ...comment, createdAt: serverTimestamp() });
    tx.update(postRef, { commentCount: increment(1) });
  });

  return newCommentRef.id;
}

/** 댓글을 삭제합니다. 작성자 본인 확인은 firestore.rules에서도 강제되지만,
 * 클라이언트에서도 authorId를 넘겨받아 잘못된 삭제 시도를 사전에 막습니다. */
export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const commentRef = doc(db, "comments", commentId);
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(commentRef);
    if (!snap.exists()) return;
    tx.delete(commentRef);
    tx.update(postRef, { commentCount: increment(-1) });
  });
}

// ---------- Users ----------

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...(data as Omit<UserProfile, "createdAt">),
    createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
  };
}

/** 프로필 일부 필드만 수정합니다 (예: 아바타 업로드 후 avatarUrl 갱신). */
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "bio" | "avatarUrl">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

// ---------- Travel Logs (여행 기록) ----------
// TravelNavigator(지도 따라가기)에서 여행을 완료하면 자동으로 생성되는 개인 기록.
// 기존 courses/posts 등과는 별개의 새 컬렉션이며, 다른 컬렉션 구조는 건드리지 않습니다.

const travelLogsCol = collection(db, "travelLogs");

/**
 * travelLogs 문서의 stops 필드를 검증/정제합니다. courses의 sanitizeStops와 동일한 이유로,
 * 오래된 문서나 필드가 일부 빠진 문서가 들어와도 화면이 죽지 않도록 방어합니다.
 */
function sanitizeTravelLogStops(raw: unknown): TravelLog["stops"] {
  if (!Array.isArray(raw)) return [];
  const result: TravelLog["stops"] = [];
  raw.forEach((rawStop, index) => {
    const stop = rawStop as Record<string, unknown> | null | undefined;
    const place = stop?.place as Record<string, unknown> | null | undefined;
    if (!place || typeof place.id !== "string" || typeof place.name !== "string") return;

    const category = typeof place.category === "string" && place.category in CATEGORY_META
      ? (place.category as Place["category"])
      : "culture";

    result.push({
      order: typeof stop?.order === "number" ? stop.order : index + 1,
      day: typeof stop?.day === "number" ? stop.day : undefined,
      place: {
        id: place.id,
        name: place.name,
        category,
        address: typeof place.address === "string" ? place.address : "",
        region: typeof place.region === "string" ? place.region : "",
        lat: typeof place.lat === "number" ? place.lat : 0,
        lng: typeof place.lng === "number" ? place.lng : 0,
        imageUrl: typeof place.imageUrl === "string" ? place.imageUrl : "",
        rating: typeof place.rating === "number" ? place.rating : 0,
        reviewCount: typeof place.reviewCount === "number" ? place.reviewCount : 0,
      },
    });
  });
  return result;
}

function mapTravelLogDoc(id: string, data: Record<string, unknown>): TravelLog {
  return {
    id,
    courseId: typeof data.courseId === "string" ? data.courseId : "",
    courseTitle: typeof data.courseTitle === "string" ? data.courseTitle : "",
    coverImageUrl: typeof data.coverImageUrl === "string" ? data.coverImageUrl : "",
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    startedAt: toMillis(data.startedAt as Timestamp | number | undefined),
    endedAt: data.endedAt ? toMillis(data.endedAt as Timestamp | number) : null,
    distanceMeters: typeof data.distanceMeters === "number" ? data.distanceMeters : 0,
    visitedPlaceCount: typeof data.visitedPlaceCount === "number" ? data.visitedPlaceCount : 0,
    totalPlaceCount: typeof data.totalPlaceCount === "number" ? data.totalPlaceCount : 0,
    memo: typeof data.memo === "string" ? data.memo : "",
    photoUrls: Array.isArray(data.photoUrls) ? (data.photoUrls as string[]) : [],
    isCompleted: typeof data.isCompleted === "boolean" ? data.isCompleted : false,
    stops: sanitizeTravelLogStops(data.stops),
    createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
  };
}

export async function createTravelLog(
  log: Omit<TravelLog, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(travelLogsCol, {
    ...log,
    startedAt: Timestamp.fromMillis(log.startedAt),
    endedAt: log.endedAt !== null ? Timestamp.fromMillis(log.endedAt) : null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** 메모/사진처럼 여행 완료 이후에 추가로 채워 넣는 필드만 수정합니다. */
export async function updateTravelLog(
  logId: string,
  data: Partial<Pick<TravelLog, "memo" | "photoUrls">>
): Promise<void> {
  await updateDoc(doc(db, "travelLogs", logId), data);
}

/** 내 여행 기록 목록을 시작 날짜 최신순으로 가져옵니다. */
export async function getMyTravelLogs(userId: string, take = 50): Promise<TravelLog[]> {
  const q = query(
    travelLogsCol,
    where("authorId", "==", userId),
    orderBy("startedAt", "desc"),
    fbLimit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapTravelLogDoc(d.id, d.data()));
}

export async function getTravelLog(logId: string): Promise<TravelLog | null> {
  const snap = await getDoc(doc(db, "travelLogs", logId));
  if (!snap.exists()) return null;
  return mapTravelLogDoc(snap.id, snap.data());
}

// ---------- Notifications (알림) ----------
// 좋아요/댓글/팔로우 등 행동이 일어나면 생성되는 알림. 새 컬렉션이며 기존 컬렉션은 건드리지 않습니다.

const notificationsCol = collection(db, "notifications");

function mapNotificationDoc(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    ...(data as Omit<AppNotification, "id" | "createdAt">),
    createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
  };
}

/** 알림을 생성합니다. 자기 자신의 행동(recipientId === actorId)에는 알림을 만들지 않습니다. */
export async function createNotification(
  notification: Omit<AppNotification, "id" | "createdAt" | "isRead">
): Promise<void> {
  if (notification.recipientId === notification.actorId) return;
  await addDoc(notificationsCol, {
    ...notification,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

/** 내가 받은 알림 목록을 최신순으로 가져옵니다. */
export async function getMyNotifications(userId: string, take = 50): Promise<AppNotification[]> {
  const q = query(
    notificationsCol,
    where("recipientId", "==", userId),
    orderBy("createdAt", "desc"),
    fbLimit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapNotificationDoc(d.id, d.data()));
}

/** 읽지 않은 알림 개수 (알림 아이콘의 숫자 표시용). */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    notificationsCol,
    where("recipientId", "==", userId),
    where("isRead", "==", false)
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
}

/** 안 읽은 알림을 한 번에 모두 읽음 처리합니다. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    notificationsCol,
    where("recipientId", "==", userId),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
  await batch.commit();
}

// ---------- Follow (팔로우) ----------
// follows/{followerId_followingId} 형태의 문서로 여부를 관리합니다 (likes/saves와 동일한 중복 방지 패턴).
// 팔로우/언팔로우 시 트랜잭션으로 관계 문서 생성·삭제와 함께 두 유저의
// followingCount(팔로우 하는 사람)/followerCount(팔로우 받는 사람)를 함께 갱신합니다.

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) throw new Error("자기 자신은 팔로우할 수 없어요.");

  const followRef = doc(db, "follows", `${followerId}_${followingId}`);
  const followerRef = doc(db, "users", followerId);
  const followingRef = doc(db, "users", followingId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(followRef);
    if (snap.exists()) {
      tx.delete(followRef);
      tx.update(followerRef, { followingCount: increment(-1) });
      tx.update(followingRef, { followerCount: increment(-1) });
      return false;
    }
    tx.set(followRef, { followerId, followingId, createdAt: serverTimestamp() });
    tx.update(followerRef, { followingCount: increment(1) });
    tx.update(followingRef, { followerCount: increment(1) });
    return true;
  });
}

export async function getFollowStatus(followerId: string, followingId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "follows", `${followerId}_${followingId}`));
  return snap.exists();
}

/** followerId 목록으로 프로필을 모아 반환하는 공용 헬퍼. */
async function getProfilesByIds(ids: string[]): Promise<UserProfile[]> {
  const profiles = await Promise.all(ids.map((id) => getUserProfile(id)));
  return profiles.filter((p): p is UserProfile => p !== null);
}

/** userId를 팔로우하는 사람들(팔로워) 목록. */
export async function getFollowers(userId: string, take = 50): Promise<UserProfile[]> {
  const q = query(collection(db, "follows"), where("followingId", "==", userId), fbLimit(take));
  const snap = await getDocs(q);
  return getProfilesByIds(snap.docs.map((d) => (d.data() as { followerId: string }).followerId));
}

/** userId가 팔로우하는 사람들(팔로잉) 목록. */
export async function getFollowing(userId: string, take = 50): Promise<UserProfile[]> {
  const q = query(collection(db, "follows"), where("followerId", "==", userId), fbLimit(take));
  const snap = await getDocs(q);
  return getProfilesByIds(snap.docs.map((d) => (d.data() as { followingId: string }).followingId));
}

/** userId가 팔로우하는 사람들의 uid만 가져옵니다 (피드 "팔로잉" 탭 필터링용). */
export async function getFollowingIds(userId: string, take = 200): Promise<string[]> {
  const q = query(collection(db, "follows"), where("followerId", "==", userId), fbLimit(take));
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as { followingId: string }).followingId);
}

// ---------- Saved Places (개별 장소 저장) ----------
// 코스 저장(courseSaves)과는 별개로, 장소 상세 화면에서 장소 하나만 저장하는 기능.
// 문서 ID를 "{placeId}_{uid}"로 고정해 중복 저장을 구조적으로 방지합니다(likes/saves와 동일 패턴).

export async function toggleSavedPlace(place: Place, userId: string): Promise<boolean> {
  const saveRef = doc(db, "savedPlaces", toggleId(place.id, userId));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(saveRef);
    if (snap.exists()) {
      tx.delete(saveRef);
      return false;
    }
    tx.set(saveRef, { userId, place, createdAt: serverTimestamp() });
    return true;
  });
}

export async function getSavedPlaceStatus(placeId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "savedPlaces", toggleId(placeId, userId)));
  return snap.exists();
}
