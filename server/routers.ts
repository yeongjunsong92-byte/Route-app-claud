import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  appendPlaceToCourse,
  createCourse,
  getCourseDetails,
  listCoursesByOwner,
  listSavedCourses,
  listPublicCourses,
  listSavedCourseIds,
  listSavedPlaces,
  saveCourse,
  toggleSavedPlace,
  updateCourse,
  upsertUser,
} from "./db";

const placeInput = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  address: z.string().optional(),
  imageUrl: z.string().url().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  hours: z.string().max(255).optional(),
  note: z.string().optional(),
});

const courseItemInput = placeInput.extend({
  orderIndex: z.number().int().min(0),
  dayNumber: z.number().int().min(1).default(1),
  visitTime: z.string().max(10).optional(),
  durationMinutes: z.number().int().positive().optional(),
  estimatedCost: z.number().int().nonnegative().optional(),
});

const courseLifecycleInput = {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["planned", "active", "completed"]).optional(),
};

const hasValidCourseDates = (input: { startDate?: string | null; endDate?: string | null }) => !input.startDate || !input.endDate || input.startDate <= input.endDate;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(100) })).mutation(async ({ ctx, input }) => {
      await upsertUser({ openId: ctx.user.openId, name: input.name });
      return { success: true, name: input.name } as const;
    }),
  }),
  places: router({
    saved: protectedProcedure.query(({ ctx }) => listSavedPlaces(ctx.user.id)),
    toggleSaved: protectedProcedure.input(placeInput).mutation(({ ctx, input }) => toggleSavedPlace(ctx.user.id, input)),
  }),
  courses: router({
    mine: protectedProcedure.query(({ ctx }) => listCoursesByOwner(ctx.user.id)),
    saved: protectedProcedure.query(({ ctx }) => listSavedCourses(ctx.user.id)),
    savedIds: protectedProcedure.query(({ ctx }) => listSavedCourseIds(ctx.user.id)),
    public: publicProcedure.query(() => listPublicCourses()),
    get: publicProcedure.input(z.object({ courseId: z.number().int().positive() })).query(({ input }) => getCourseDetails(input.courseId)),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1).max(255),
      region: z.string().max(100).optional(),
      description: z.string().optional(),
      coverImage: z.string().url().optional(),
      ...courseLifecycleInput,
      isPublic: z.boolean().optional(),
      items: z.array(courseItemInput),
    }).refine(hasValidCourseDates, { message: "종료일은 시작일보다 빠를 수 없습니다.", path: ["endDate"] })).mutation(({ ctx, input }) => createCourse(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({
      courseId: z.number().int().positive(),
      title: z.string().min(1).max(255),
      region: z.string().max(100).optional(),
      description: z.string().optional(),
      coverImage: z.string().url().optional(),
      ...courseLifecycleInput,
      isPublic: z.boolean().optional(),
      items: z.array(courseItemInput),
    }).refine(hasValidCourseDates, { message: "종료일은 시작일보다 빠를 수 없습니다.", path: ["endDate"] })).mutation(({ ctx, input }) => updateCourse(ctx.user.id, input.courseId, input)),
    appendPlace: protectedProcedure.input(z.object({
      courseId: z.number().int().positive(),
      place: placeInput,
    })).mutation(({ ctx, input }) => appendPlaceToCourse(ctx.user.id, input.courseId, input.place)),
    save: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).mutation(({ ctx, input }) => saveCourse(ctx.user.id, input.courseId)),
  }),
});

export type AppRouter = typeof appRouter;
