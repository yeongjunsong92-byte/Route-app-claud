import {
  boolean,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  avatarKey: varchar("avatarKey", { length: 512 }),
  travelStyle: varchar("travelStyle", { length: 100 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const savedPlaces = mysqlTable(
  "saved_places",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    placeId: varchar("placeId", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    address: text("address"),
    imageUrl: text("imageUrl"),
    lat: double("lat"),
    lng: double("lng"),
    hours: varchar("hours", { length: 255 }),
    note: text("note"),
    customTitle: varchar("customTitle", { length: 255 }),
    personalPhotoUrl: text("personalPhotoUrl"),
    personalPhotoKey: varchar("personalPhotoKey", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    ownerIndex: index("saved_places_user_idx").on(table.userId),
    placeIndex: uniqueIndex("saved_places_user_place_unique").on(table.userId, table.placeId),
  }),
);

export const follows = mysqlTable(
  "follows",
  {
    id: int("id").autoincrement().primaryKey(),
    followerId: int("followerId").notNull(),
    followingId: int("followingId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    followerIndex: index("follows_follower_idx").on(table.followerId),
    followingIndex: index("follows_following_idx").on(table.followingId),
    followerFollowingUnique: uniqueIndex("follows_follower_following_unique").on(table.followerId, table.followingId),
  }),
);

export const courses = mysqlTable(
  "courses",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    region: varchar("region", { length: 100 }),
    description: text("description"),
    coverImage: text("coverImage"),
    shareImageUrl: text("shareImageUrl"),
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    status: mysqlEnum("status", ["planned", "active", "completed"]).default("planned").notNull(),
    isPublic: boolean("isPublic").default(false).notNull(),
    sourceCourseId: int("sourceCourseId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    ownerIndex: index("courses_owner_idx").on(table.ownerId),
    publicIndex: index("courses_public_idx").on(table.isPublic),
  }),
);

export const courseItems = mysqlTable(
  "course_items",
  {
    id: int("id").autoincrement().primaryKey(),
    courseId: int("courseId").notNull(),
    placeId: varchar("placeId", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    address: text("address"),
    imageUrl: text("imageUrl"),
    lat: double("lat"),
    lng: double("lng"),
    hours: varchar("hours", { length: 255 }),
    orderIndex: int("orderIndex").notNull(),
    dayNumber: int("dayNumber").default(1).notNull(),
    visitTime: varchar("visitTime", { length: 10 }),
    durationMinutes: int("durationMinutes"),
    estimatedCost: int("estimatedCost"),
    note: text("note"),
  },
  (table) => ({
    courseIndex: index("course_items_course_idx").on(table.courseId),
  }),
);

export const courseSaves = mysqlTable(
  "course_saves",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    courseId: int("courseId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userCourseUnique: uniqueIndex("course_saves_user_course_unique").on(table.userId, table.courseId),
    userIndex: index("course_saves_user_idx").on(table.userId),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type SavedPlace = typeof savedPlaces.$inferSelect;
export type InsertSavedPlace = typeof savedPlaces.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type CourseItem = typeof courseItems.$inferSelect;
export type InsertCourseItem = typeof courseItems.$inferInsert;
export type CourseSave = typeof courseSaves.$inferSelect;
