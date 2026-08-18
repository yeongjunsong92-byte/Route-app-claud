import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  courseItems,
  courseSaves,
  courses,
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
  const textFields = ["name", "email", "loginMethod"] as const;
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
  note?: string;
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

export type CourseInput = {
  title: string;
  region?: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
  items: Array<SavedPlaceInput & { orderIndex: number; visitTime?: string; durationMinutes?: number; estimatedCost?: number }>;
};

export async function createCourse(userId: number, input: CourseInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(courses).values({ ownerId: userId, title: input.title, region: input.region, description: input.description, coverImage: input.coverImage, isPublic: input.isPublic ?? false });
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
  return db.select().from(courses).where(eq(courses.isPublic, true)).orderBy(desc(courses.updatedAt));
}

export async function getCourseDetails(courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const course = (await db.select().from(courses).where(eq(courses.id, courseId)).limit(1))[0];
  if (!course) return null;
  const items = await db.select().from(courseItems).where(eq(courseItems.courseId, courseId)).orderBy(courseItems.orderIndex);
  return { ...course, items };
}

export async function updateCourse(userId: number, courseId: number, input: CourseInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const owned = await tx.select({ id: courses.id }).from(courses).where(and(eq(courses.id, courseId), eq(courses.ownerId, userId))).limit(1);
    if (!owned[0]) throw new Error("Course not found or not owned by user");
    await tx.update(courses).set({ title: input.title, region: input.region, description: input.description, coverImage: input.coverImage, isPublic: input.isPublic ?? false }).where(eq(courses.id, courseId));
    await tx.delete(courseItems).where(eq(courseItems.courseId, courseId));
    if (input.items.length > 0) await tx.insert(courseItems).values(input.items.map((item) => ({ ...item, courseId })));
    return courseId;
  });
}

export async function saveCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(courseSaves).values({ userId, courseId }).onDuplicateKeyUpdate({ set: { courseId } });
  return { saved: true };
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
