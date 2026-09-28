import { MediaType } from '../types';

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'ogg',
  'oga',
  'm4a',
  'aac',
  'flac',
  'weba',
]);

export const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'm4v',
  'ogv',
  'mkv',
]);

export function getMediaTypeAndFormat(fileName: string): { type: MediaType; format: string } | null {
  const parts = fileName.split('.');
  if (parts.length <= 1) return null;
  const ext = parts.pop()!.toLowerCase();

  if (SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
    return { type: 'audio', format: ext };
  }
  if (SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
    return { type: 'video', format: ext };
  }
  return null;
}

export function cleanTrackTitle(fileName: string): string {
  // Strip extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
  
  // Optionally clean common leading numbers like "01 - Song" or "01. Song" for a cleaner title if appropriate,
  // but keep the full name readable:
  return nameWithoutExt.trim() || fileName;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '--:--';
  }
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedSecs = secs.toString().padStart(2, '0');
  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(1)} ${units[i]}`;
}
