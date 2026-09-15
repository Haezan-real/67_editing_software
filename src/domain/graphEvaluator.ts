export interface GraphPoint {
  time: number;
  size: number;
}

const EASING_STRENGTH = 3;

export function evaluateSegment(localTime: number, handleValue: number): number {
  const t = Math.max(0, Math.min(1, localTime));
  if (handleValue < 0) return Math.pow(t, 1 - handleValue * EASING_STRENGTH);
  if (handleValue > 0) return 1 - Math.pow(1 - t, 1 + handleValue * EASING_STRENGTH);
  return t;
}

export function evaluateGraph(
  time: number,
  points: readonly GraphPoint[],
  segmentHandleValues: readonly number[] = [],
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].size;

  const sorted = points.slice().sort((a, b) => a.time - b.time);
  const clampedTime = Math.max(0, Math.min(1, time));
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (clampedTime < start.time || clampedTime > end.time) continue;
    const duration = end.time - start.time;
    const localTime = duration > 0 ? (clampedTime - start.time) / duration : 0;
    const easedTime = evaluateSegment(localTime, segmentHandleValues[index] ?? 0);
    return start.size + (end.size - start.size) * easedTime;
  }
  return sorted[sorted.length - 1].size;
}
