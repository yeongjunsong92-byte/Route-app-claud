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
});
