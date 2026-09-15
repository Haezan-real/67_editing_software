import { describe, expect, it } from 'vitest';
import { getMediaType } from '../src/domain/mediaIngestion';

describe('media ingestion classification', () => {
  it('classifies supported media case-insensitively', () => {
    expect(getMediaType('clip.MP4')).toBe('video');
    expect(getMediaType('voice.WAV')).toBe('audio');
    expect(getMediaType('photo.JpEg')).toBe('image');
  });

  it('rejects unsupported or extensionless files', () => {
    expect(getMediaType('project.txt')).toBeNull();
    expect(getMediaType('README')).toBeNull();
  });
});
