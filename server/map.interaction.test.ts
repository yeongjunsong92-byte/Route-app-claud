import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("Route map interactions", () => {
  it("connects place search, current location, and sheet states to the map screen", () => {
    expect(homeSource).toContain("new google.maps.places.PlacesService(map)");
    expect(homeSource).toContain("service.textSearch");
    expect(homeSource).toContain("navigator.geolocation.getCurrentPosition");
    expect(homeSource).toContain("error.PERMISSION_DENIED");
    expect(homeSource).toContain("setIsLocationPermissionHelpOpen(true)");
    expect(homeSource).toContain("RECENT_SEARCHES_KEY");
    expect(homeSource).toContain("route-recent-searches");
    expect(homeSource).toContain("route-sheet-place-glance");
    expect(homeSource).toContain("mapPreviewPlace.hours");
    expect(homeSource).toContain('setSheetMode("expanded")');
    expect(homeSource).toContain('setSheetMode((mode) => mode === "expanded" ? "peek" : "hidden")');
    expect(homeSource).toContain('sheetMode !== "hidden"');
    expect(homeSource).toContain("const pinSvg");
    expect(homeSource).toContain('route-map-screen sheet-${sheetMode}');
    expect(homeSource).toContain("new google.maps.places.AutocompleteService()");
    expect(homeSource).toContain("service.getPlacePredictions");
    expect(homeSource).toContain("map.panTo({ lat: place.lat, lng: place.lng })");
    expect(homeSource).toContain("categoryPinColor(place.category)");
  });
});
