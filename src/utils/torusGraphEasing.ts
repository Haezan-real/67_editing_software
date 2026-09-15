//torusGraphEasing.ts
import type { SizeGraphPoint } from '../components/graph';
import { evaluateGraph } from '../domain/graphEvaluator';

export function evaluateGraphWithHandles(
  time: number,
  graphPoints: SizeGraphPoint[],
  segmentHandleValues: number[] = [],
  logEasing = false,
): number {
  const result = evaluateGraph(time, graphPoints, segmentHandleValues);
  if (logEasing) console.log('Evaluated graph value:', result);
  return result;
}

export function getSavedSegmentHandleValues(): number[] {
  try {
    const raw = window.localStorage.getItem('juicecut.settings.torusSegmentHandleValues');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v: unknown) => Number(v)).filter((n: number) => !Number.isNaN(n));
      }
    }
  } catch {}
  return [];
}

export function saveSegmentHandleValues(values: number[]): void {
  try {
    window.localStorage.setItem('juicecut.settings.torusSegmentHandleValues', JSON.stringify(values));
  } catch {}
}
