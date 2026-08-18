import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("Route map interactions", () => {
  it("connects place search, current location, and sheet states to the map screen", () => {
    expect(homeSource).toContain("new google.maps.places.PlacesService(map)");
    expect(homeSource).toContain("service.textSearch");
    expect(homeSource).toContain("navigator.geolocation.getCurrentPosition");
    expect(homeSource).toContain('setSheetMode("expanded")');
    expect(homeSource).toContain('setSheetMode((mode) => mode === "expanded" ? "peek" : "hidden")');
    expect(homeSource).toContain('sheetMode !== "hidden"');
    expect(homeSource).toContain("const pinSvg");
    expect(homeSource).toContain('route-map-screen sheet-${sheetMode}');
  });
});
