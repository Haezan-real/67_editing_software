import type { MediaType } from '../types';

const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', 'mov', 'webm']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'ogg', 'wav', 'aac']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'avif', 'gif', 'webp']);

export function getMediaType(fileName: string): MediaType | null {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  return null;
}
