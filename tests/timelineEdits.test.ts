import { describe, expect, it } from 'vitest';
import { joinClips, nudgeClips, splitClip, trimLatter } from '../src/domain/timelineEdits';
import type { TimelineClip } from '../src/types';

const clip = (overrides: Partial<TimelineClip> = {}): TimelineClip => ({
  id: 'a', mediaId: 'media', track: 0, startFrame: 0, endFrame: 30,
  srcIn: 0, srcOut: 30, fades: { in: 0, out: 0 }, name: 'clip', type: 'video', ...overrides,
});

describe('timeline edit invariants', () => {
  it('rejects nudging a clip before frame zero', () => {
    const result = nudgeClips([clip()], ['a'], -1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-frame');
  });

  it('rejects trims that create invalid durations', () => {
    const result = trimLatter([clip()], 'a', 0, false);
    expect(result.ok).toBe(false);
  });

  it('splits while preserving source continuity', () => {
    const result = splitClip([clip()], 'a', 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clips).toHaveLength(2);
      expect(result.clips[0].srcOut).toBe(result.clips[1].srcIn);
    }
  });

  it('requires ordered adjacent clips with continuous sources to join', () => {
    const first = clip({ id: 'a', endFrame: 30, srcOut: 30 });
    const second = clip({ id: 'b', startFrame: 30, endFrame: 60, srcIn: 30, srcOut: 60 });
    expect(joinClips([first, second], 'a', 'b').ok).toBe(true);
    expect(joinClips([first, second], 'b', 'a').ok).toBe(false);
    expect(joinClips([first, { ...second, srcIn: 31 }], 'a', 'b').ok).toBe(false);
  });
});
