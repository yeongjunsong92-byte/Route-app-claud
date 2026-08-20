import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Route course procedures", () => {
  it("rejects an invalid course id before hitting the database", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.courses.get({ courseId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an invalid update course id before hitting the database", async () => {
    const caller = appRouter.createCaller({
      ...publicContext(),
      user: {
        id: 1,
        openId: "route-test-user",
        name: "Route Test",
        email: "route@test.local",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
    await expect(caller.courses.update({ courseId: 0, title: "수정 코스", items: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a blank profile name before hitting the database", async () => {
    const caller = appRouter.createCaller({
      ...publicContext(),
      user: {
        id: 1,
        openId: "route-test-user",
        name: "Route Test",
        email: "route@test.local",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
    await expect(caller.auth.updateProfile({ name: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a blank course title before hitting the database", async () => {
    const caller = appRouter.createCaller({
      ...publicContext(),
      user: {
        id: 1,
        openId: "route-test-user",
        name: "Route Test",
        email: "route@test.local",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
    await expect(caller.courses.create({ title: "", items: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a course whose end date is earlier than its start date", async () => {
    const caller = appRouter.createCaller({
      ...publicContext(),
      user: {
        id: 1,
        openId: "route-test-user",
        name: "Route Test",
        email: "route@test.local",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
    await expect(caller.courses.create({ title: "기간 테스트", startDate: "2026-09-03", endDate: "2026-09-01", items: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects invalid social and personal-place inputs before hitting the database", async () => {
    const caller = appRouter.createCaller({
      ...publicContext(),
      user: {
        id: 1,
        openId: "route-test-user",
        name: "Route Test",
        email: "route@test.local",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    await expect(caller.people.discover({ query: "x".repeat(101) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.people.toggleFollow({ userId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.courses.clonePublic({ courseId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.places.updateRecord({ savedPlaceId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
