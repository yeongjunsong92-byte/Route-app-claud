import { describe, expect, it } from "vitest";
import { buildMapMarkerGroups } from "./mapClustering";

const places = [
  { id: "near-a", lat: 37.5446, lng: 127.0557 },
  { id: "near-b", lat: 37.5452, lng: 127.0557 },
  { id: "far", lat: 37.552, lng: 127.0557 },
];

describe("map marker clustering", () => {
  it("groups nearby pins at a map overview zoom while retaining distant places", () => {
    const groups = buildMapMarkerGroups(places, 14);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.isCluster)?.points.map((point) => point.id)).toEqual(["near-a", "near-b"]);
    expect(groups.find((group) => !group.isCluster)?.points[0]?.id).toBe("far");
  });

  it("splits a cluster into individual pins after zooming in", () => {
    const groups = buildMapMarkerGroups(places, 18);

    expect(groups).toHaveLength(3);
    expect(groups.every((group) => !group.isCluster)).toBe(true);
  });
});
