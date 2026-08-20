export type CourseSchedulePlace = {
  id: string;
  name: string;
  hours: string;
};

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
}

export function getScheduleWarnings(places: CourseSchedulePlace[], times: Record<string, string>) {
  const warnings: Array<{ placeId: string; message: string }> = [];
  let latestEnd = -1;
  places.forEach((place) => {
    const visitStart = timeToMinutes(times[place.id] || "10:00");
    if (visitStart === null) return;
    const visitEnd = visitStart + 60;
    const hours = place.hours.match(/(\d{1,2}:\d{2})\s*[-~–]\s*(\d{1,2}:\d{2})/);
    if (hours) {
      const opensAt = timeToMinutes(hours[1]);
      const closesAt = timeToMinutes(hours[2]);
      if (opensAt !== null && closesAt !== null && (visitStart < opensAt || visitEnd > closesAt)) warnings.push({ placeId: place.id, message: `${place.name}의 영업시간(${place.hours})을 벗어납니다.` });
    }
    if (latestEnd > visitStart) warnings.push({ placeId: place.id, message: `${place.name} 방문 시간이 이전 일정과 겹칩니다.` });
    latestEnd = Math.max(latestEnd, visitEnd);
  });
  return warnings;
}
