export type ClusterableMapPoint = { lat: number; lng: number };

export type MapMarkerGroup<T extends ClusterableMapPoint> = {
  center: { lat: number; lng: number };
  points: T[];
  isCluster: boolean;
};

function distanceInMeters(from: ClusterableMapPoint, to: ClusterableMapPoint) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latitudeDistance = radians(to.lat - from.lat);
  const longitudeDistance = radians(to.lng - from.lng);
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDistance / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterRadiusForZoom(zoom: number) {
  return Math.max(45, 600 * 2 ** (12 - zoom));
}

export function buildMapMarkerGroups<T extends ClusterableMapPoint>(points: T[], zoom: number): MapMarkerGroup<T>[] {
  const radius = clusterRadiusForZoom(zoom);
  const groups: Array<{ center: { lat: number; lng: number }; points: T[] }> = [];

  points.forEach((point) => {
    const existing = groups.find((group) => distanceInMeters(point, group.center) <= radius);
    if (!existing) {
      groups.push({ center: { lat: point.lat, lng: point.lng }, points: [point] });
      return;
    }
    existing.points.push(point);
    const count = existing.points.length;
    existing.center = {
      lat: existing.center.lat + (point.lat - existing.center.lat) / count,
      lng: existing.center.lng + (point.lng - existing.center.lng) / count,
    };
  });

  return groups.map((group) => ({ ...group, isCluster: group.points.length > 1 }));
}
