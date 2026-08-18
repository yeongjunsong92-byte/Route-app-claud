import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("map sheet spacing", () => {
  it("extends the place sheet behind the bottom navigation without a map gap", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain(".route-map-sheet { position: absolute; z-index: 11; right: 0; bottom: 0;");
    expect(css).toContain(".route-map-sheet.is-peek { height: 322px; }");
    expect(css).toContain(".route-map-sheet.is-expanded { height: calc(min(52vh, 460px) + 72px); }");
  });
});
