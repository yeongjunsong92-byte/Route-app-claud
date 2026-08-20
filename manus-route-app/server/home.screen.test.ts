import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const styleSource = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("Route home screen", () => {
  it("removes the recommended-course hero and provides a map search entry", () => {
    expect(homeSource).not.toContain('className="route-home-hero"');
    expect(homeSource).toContain('className="route-home-search"');
    expect(homeSource).toContain('setScreen("search")');
    expect(homeSource).toContain('setSelectedTab("map")');
  });

  it("uses compact 12px content gutters on the home and my screens", () => {
    expect(styleSource).toContain(".route-home { background: #fff; padding: 0 12px 30px; }");
    expect(styleSource).toContain(".route-my-page { padding: 0 12px 108px; }");
  });
});
