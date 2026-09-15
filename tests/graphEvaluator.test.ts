import { describe, expect, it } from 'vitest';
import { evaluateGraph, evaluateSegment } from '../src/domain/graphEvaluator';

describe('graph evaluator', () => {
  it('clamps segment progress and uses linear interpolation by default', () => {
    expect(evaluateSegment(-1, 0)).toBe(0);
    expect(evaluateSegment(2, 0)).toBe(1);
    expect(evaluateGraph(0.5, [{ time: 0, size: 0 }, { time: 1, size: 1 }])).toBe(0.5);
  });

  it('applies the configured segment handle', () => {
    expect(evaluateGraph(0.5, [{ time: 0, size: 0 }, { time: 1, size: 1 }], [-1])).toBeLessThan(0.5);
    expect(evaluateGraph(0.5, [{ time: 0, size: 0 }, { time: 1, size: 1 }], [1])).toBeGreaterThan(0.5);
  });
});
