import { and, count, desc, eq, like, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  courseItems,
  courseSaves,
  courses,
  follows,
  InsertUser,
  savedPlaces,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "bio", "avatarUrl", "avatarKey", "travelStyle"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type SavedPlaceInput = {
  placeId: string;
  name: string;
  category?: string;
  address?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  hours?: string;
  note?: string;
};

export type SavedPlaceRecordInput = {
  customTitle?: string | null;
  category?: string | null;
  note?: string | null;
  personalPhotoUrl?: string | null;
  personalPhotoKey?: string | null;
};

export async function listSavedPlaces(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedPlaces).where(eq(savedPlaces.userId, userId)).orderBy(desc(savedPlaces.createdAt));
}

export async function toggleSavedPlace(userId: number, input: SavedPlaceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ id: savedPlaces.id }).from(savedPlaces).where(and(eq(savedPlaces.userId, userId), eq(savedPlaces.placeId, input.placeId))).limit(1);
  if (existing[0]) {
    await db.delete(savedPlaces).where(eq(savedPlaces.id, existing[0].id));
    return { saved: false };
  }
  await db.insert(savedPlaces).values({ ...input, userId });
  return { saved: true };
}

export async function updateSavedPlaceRecord(userId: number, savedPlaceId: number, input: SavedPlaceRecordInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const owned = await db.select({ id: savedPlaces.id }).from(savedPlaces).where(and(eq(savedPlaces.id, savedPlaceId), eq(savedPlaces.userId, userId))).limit(1);
  if (!owned[0]) throw new Error("Saved place not found or not owned by user");
  await db.update(savedPlaces).set(input).where(eq(savedPlaces.id, savedPlaceId));
  return { updated: true } as const;
}

export type CourseInput = {
  title: string;
  region?: string;
  description?: string;
  coverImage?: string;
  shareImageUrl?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: "planned" | "active" | "completed";
  isPublic?: boolean;
  items: Array<SavedPlaceInput & { orderIndex: number; dayNumber?: number; visitTime?: string; durationMinutes?: number; estimatedCost?: number }>;
};

function toCourseDate(value?: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function createCourse(userId: number, input: CourseInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(courses).values({ ownerId: userId, title: input.title, region: input.region, description: input.description, coverImage: input.coverImage, shareImageUrl: input.shareImageUrl, startDate: toCourseDate(input.startDate), endDate: toCourseDate(input.endDate), status: input.status ?? "planned", isPublic: input.isPublic ?? false });
    const courseId = Number(result[0].insertId);
    if (input.items.length > 0) {
      await tx.insert(courseItems).values(input.items.map((item) => ({ ...item, courseId })));
    }
    return courseId;
  });
}

export async function listCoursesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.ownerId, ownerId)).orderBy(desc(courses.updatedAt));
}

export async function listPublicCourses() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: courses.id, ownerId: courses.ownerId, title: courses.title, region: courses.region, description: courses.description,
      coverImage: courses.coverImage, shareImageUrl: courses.shareImageUrl, startDate: courses.startDate, endDate: courses.endDate, status: courses.status,
      isPublic: courses.isPublic, sourceCourseId: courses.sourceCourseId, createdAt: courses.createdAt, updatedAt: courses.updatedAt,
      authorName: users.name, authorAvatarUrl: users.avatarUrl,
    })
    .from(courses)
    .innerJoin(users, eq(courses.ownerId, users.id))
    .where(eq(courses.isPublic, true))
    .orderBy(desc(courses.updatedAt));
}

export async function getCourseDetails(courseId: number, viewerId?: number) {
  const db = await getDb();
  if (!db) return null;
  const course = (await db
    .select({
      id: courses.id, ownerId: courses.ownerId, title: courses.title, region: courses.region, description: courses.description,
      coverImage: courses.coverImage, shareImageUrl: courses.shareImageUrl, startDate: courses.startDate, endDate: courses.endDate, status: courses.status,
      isPublic: courses.isPublic, sourceCourseId: courses.sourceCourseId, createdAt: courses.createdAt, updatedAt: courses.updatedAt,
      authorName: users.name, authorAvatarUrl: users.avatarUrl,
    })
    .from(courses)
    .innerJoin(users, eq(courses.ownerId, users.id))
    .where(eq(courses.id, courseId))
    .limit(1))[0];
  if (!course) return null;
  if (!course.isPublic && course.ownerId !== viewerId) return null;
  const items = await db.select().from(courseItems).where(eq(courseItems.courseId, courseId)).orderBy(courseItems.orderIndex);
  return { ...course, items };
}

export async function updateCourse(userId: number, courseId: number, input: CourseInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const owned = await tx.select({ id: courses.id }).from(courses).where(and(eq(courses.id, courseId), eq(courses.ownerId, userId))).limit(1);
    if (!owned[0]) throw new Error("Course not found or not owned by user");
    await tx.update(courses).set({ title: input.title, region: input.region, description: input.description, coverImage: input.coverImage, shareImageUrl: input.shareImageUrl, startDate: toCourseDate(input.startDate), endDate: toCourseDate(input.endDate), status: input.status ?? "planned", isPublic: input.isPublic ?? false }).where(eq(courses.id, courseId));
    await tx.delete(courseItems).where(eq(courseItems.courseId, courseId));
    if (input.items.length > 0) await tx.insert(courseItems).values(input.items.map((item) => ({ ...item, courseId })));
    return courseId;
  });
}

export async function appendPlaceToCourse(userId: number, courseId: number, place: SavedPlaceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const owned = await tx.select({ id: courses.id }).from(courses).where(and(eq(courses.id, courseId), eq(courses.ownerId, userId))).limit(1);
    if (!owned[0]) throw new Error("Course not found or not owned by user");

    const existing = await tx.select({ id: courseItems.id }).from(courseItems).where(and(eq(courseItems.courseId, courseId), eq(courseItems.placeId, place.placeId))).limit(1);
    if (existing[0]) return { added: false } as const;

    const items = await tx.select({ orderIndex: courseItems.orderIndex }).from(courseItems).where(eq(courseItems.courseId, courseId));
    const orderIndex = items.reduce((highest, item) => Math.max(highest, item.orderIndex), -1) + 1;
    await tx.insert(courseItems).values({ ...place, courseId, orderIndex, dayNumber: 1, visitTime: "10:00", durationMinutes: 60, estimatedCost: 0 });
    await tx.update(courses).set({ updatedAt: new Date() }).where(eq(courses.id, courseId));
    return { added: true } as const;
  });
}

export async function saveCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(courseSaves).values({ userId, courseId }).onDuplicateKeyUpdate({ set: { courseId } });
  return { saved: true };
}

export async function clonePublicCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const source = (await tx.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.isPublic, true))).limit(1))[0];
    if (!source) throw new Error("Public course not found");
    const sourceItems = await tx.select().from(courseItems).where(eq(courseItems.courseId, courseId)).orderBy(courseItems.orderIndex);
    const result = await tx.insert(courses).values({
      ownerId: userId,
      title: `${source.title} 복제본`,
      region: source.region,
      description: source.description,
      coverImage: source.coverImage,
      shareImageUrl: source.shareImageUrl,
      startDate: source.startDate,
      endDate: source.endDate,
      status: "planned",
      isPublic: false,
      sourceCourseId: source.sourceCourseId ?? source.id,
    });
    const clonedCourseId = Number(result[0].insertId);
    if (sourceItems.length) {
      await tx.insert(courseItems).values(sourceItems.map(({ id: _id, courseId: _courseId, ...item }) => ({ ...item, courseId: clonedCourseId })));
    }
    return { courseId: clonedCourseId, sourceCourseId: source.sourceCourseId ?? source.id } as const;
  });
}

export async function listSavedCourseIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ courseId: courseSaves.courseId }).from(courseSaves).where(eq(courseSaves.userId, userId)).orderBy(desc(courseSaves.createdAt));
}

export async function listSavedCourses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: courses.id,
      title: courses.title,
      region: courses.region,
      description: courses.description,
      coverImage: courses.coverImage,
      shareImageUrl: courses.shareImageUrl,
      startDate: courses.startDate,
      endDate: courses.endDate,
      status: courses.status,
      isPublic: courses.isPublic,
      ownerId: courses.ownerId,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      savedAt: courseSaves.createdAt,
    })
    .from(courseSaves)
    .innerJoin(courses, eq(courseSaves.courseId, courses.id))
    .where(eq(courseSaves.userId, userId))
    .orderBy(desc(courseSaves.createdAt));
}

export async function listUsersForDiscovery(viewerId: number, query?: string) {
  const db = await getDb();
  if (!db) return [];
  const keyword = query?.trim();
  const condition = keyword
    ? and(ne(users.id, viewerId), or(like(users.name, `%${keyword}%`), like(users.travelStyle, `%${keyword}%`)))
    : ne(users.id, viewerId);
  const results = await db
    .select({ id: users.id, name: users.name, bio: users.bio, avatarUrl: users.avatarUrl, travelStyle: users.travelStyle })
    .from(users)
    .where(condition)
    .orderBy(desc(users.lastSignedIn))
    .limit(24);
  const followRows = await db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId));
  const followingIds = new Set(followRows.map((row) => row.followingId));
  return results.map((profile) => ({ ...profile, isFollowing: followingIds.has(profile.id) }));
}

export async function listFollowingUsers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, bio: users.bio, avatarUrl: users.avatarUrl, travelStyle: users.travelStyle, followedAt: follows.createdAt })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function toggleFollow(userId: number, targetUserId: number) {
  if (userId === targetUserId) throw new Error("Cannot follow yourself");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target[0]) throw new Error("User not found");
  const existing = await db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, userId), eq(follows.followingId, targetUserId))).limit(1);
  if (existing[0]) {
    await db.delete(follows).where(eq(follows.id, existing[0].id));
    return { following: false } as const;
  }
  await db.insert(follows).values({ followerId: userId, followingId: targetUserId });
  return { following: true } as const;
}

export async function getUserProfile(viewerId: number | undefined, profileUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const profile = (await db
    .select({ id: users.id, name: users.name, bio: users.bio, avatarUrl: users.avatarUrl, travelStyle: users.travelStyle })
    .from(users)
    .where(eq(users.id, profileUserId))
    .limit(1))[0];
  if (!profile) return null;
  const [followerResult, followingResult, publicCourseResult] = await Promise.all([
    db.select({ value: count() }).from(follows).where(eq(follows.followingId, profileUserId)),
    db.select({ value: count() }).from(follows).where(eq(follows.followerId, profileUserId)),
    db.select({ value: count() }).from(courses).where(and(eq(courses.ownerId, profileUserId), eq(courses.isPublic, true))),
  ]);
  const follow = viewerId
    ? (await db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, viewerId), eq(follows.followingId, profileUserId))).limit(1))[0]
    : undefined;
  return {
    ...profile,
    followerCount: followerResult[0]?.value ?? 0,
    followingCount: followingResult[0]?.value ?? 0,
    publicCourseCount: publicCourseResult[0]?.value ?? 0,
    isFollowing: Boolean(follow),
    isSelf: viewerId === profileUserId,
  };
}

export async function listFollowingPublicCourses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: courses.id, ownerId: courses.ownerId, title: courses.title, region: courses.region, description: courses.description,
      coverImage: courses.coverImage, shareImageUrl: courses.shareImageUrl, startDate: courses.startDate, endDate: courses.endDate, status: courses.status,
      isPublic: courses.isPublic, sourceCourseId: courses.sourceCourseId, createdAt: courses.createdAt, updatedAt: courses.updatedAt,
      authorName: users.name, authorAvatarUrl: users.avatarUrl,
    })
    .from(follows)
    .innerJoin(courses, eq(follows.followingId, courses.ownerId))
    .innerJoin(users, eq(courses.ownerId, users.id))
    .where(and(eq(follows.followerId, userId), eq(courses.isPublic, true)))
    .orderBy(desc(courses.updatedAt));
}
