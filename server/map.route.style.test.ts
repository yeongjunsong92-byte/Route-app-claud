import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("Route map styling", () => {
  it("uses custom numbered markers and time labels for the real Google course map", () => {
    expect(homeSource).toContain("suppressMarkers: true");
    expect(homeSource).toContain("routeFallbackLineRef");
    expect(homeSource).toContain("renderRouteDecorations(map)");
    expect(homeSource).toContain("label: { text: String(index + 1)");
    expect(homeSource).toContain("label: { text: `${minutes}분`");
  });
});
