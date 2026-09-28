import { TrackMetadata } from '../../types';

export function parseFilenameHeuristics(relativePath: string, fileName: string): TrackMetadata {
  // Strip extension
  const lastDot = fileName.lastIndexOf('.');
  const baseName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;

  let title = baseName;
  let artist = '';
  let album = '';
  let trackNumber: number | undefined;

  // Path parts: e.g. "Coldplay/Parachutes/02 - Yellow.mp3"
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length >= 3) {
    artist = parts[parts.length - 3];
    album = parts[parts.length - 2];
  } else if (parts.length === 2) {
    album = parts[0];
  }

  // Check if filename starts with track number: e.g. "01 - Song" or "01. Song" or "01 Song"
  const trackNumMatch = baseName.match(/^(\d{1,3})[\s._-]+(.+)$/);
  if (trackNumMatch) {
    trackNumber = parseInt(trackNumMatch[1], 10);
    title = trackNumMatch[2].trim();
  }

  // Check if filename contains "Artist - Title"
  if (title.includes(' - ')) {
    const splitParts = title.split(' - ');
    if (splitParts.length === 2) {
      if (!artist) {
        artist = splitParts[0].trim();
      }
      title = splitParts[1].trim();
    }
  }

  return {
    artist: artist || undefined,
    album: album || undefined,
    trackNumber,
  };
}

export async function extractMetadataFromFile(file: File, relativePath: string): Promise<TrackMetadata> {
  const heuristics = parseFilenameHeuristics(relativePath, file.name);

  // If not MP3 or similar audio that might have ID3 tags, return heuristics
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'mp3') {
    return heuristics;
  }

  try {
    // Read only first 128KB for ID3v2 header and tags (fast and non-blocking)
    const headerSlice = file.slice(0, Math.min(131072, file.size));
    const arrayBuffer = await headerSlice.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Check "ID3"
    if (data.length > 10 && data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
      const version = data[3]; // 3 for ID3v2.3, 4 for ID3v2.4
      // Syncsafe size
      const tagSize = ((data[6] & 0x7f) << 21) |
                      ((data[7] & 0x7f) << 14) |
                      ((data[8] & 0x7f) << 7) |
                      (data[9] & 0x7f);

      const maxPos = Math.min(tagSize + 10, data.length);
      let pos = 10;
      const extracted: Partial<TrackMetadata> & { title?: string } = {};

      while (pos + 10 < maxPos) {
        // Frame ID (4 chars)
        const frameId = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3]);
        if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

        let frameSize: number;
        if (version === 4) {
          // Syncsafe in v2.4
          frameSize = ((data[pos + 4] & 0x7f) << 21) |
                      ((data[pos + 5] & 0x7f) << 14) |
                      ((data[pos + 6] & 0x7f) << 7) |
                      (data[pos + 7] & 0x7f);
        } else {
          // Normal 32-bit int in v2.3
          frameSize = (data[pos + 4] << 24) |
                      (data[pos + 5] << 16) |
                      (data[pos + 6] << 8) |
                      data[pos + 7];
        }

        pos += 10;
        if (frameSize <= 0 || pos + frameSize > maxPos) break;

        const frameData = data.subarray(pos, pos + frameSize);

        try {
          if (frameId === 'TIT2') {
            extracted.title = decodeTextFrame(frameData);
          } else if (frameId === 'TPE1') {
            extracted.artist = decodeTextFrame(frameData);
          } else if (frameId === 'TALB') {
            extracted.album = decodeTextFrame(frameData);
          } else if (frameId === 'TCON') {
            extracted.genre = decodeTextFrame(frameData);
          } else if (frameId === 'TYER' || frameId === 'TDRC') {
            extracted.year = decodeTextFrame(frameData);
          } else if (frameId === 'TRCK') {
            const tr = decodeTextFrame(frameData);
            const num = parseInt(tr, 10);
            if (!isNaN(num)) extracted.trackNumber = num;
          } else if (frameId === 'APIC' && !extracted.coverArt && frameSize < 500000) {
            // Extract attached picture
            const cover = parseApicFrame(frameData);
            if (cover) extracted.coverArt = cover;
          }
        } catch {
          // Ignore individual frame decode errors
        }

        pos += frameSize;
      }

      return {
        artist: extracted.artist || heuristics.artist,
        album: extracted.album || heuristics.album,
        genre: extracted.genre,
        year: extracted.year,
        trackNumber: extracted.trackNumber || heuristics.trackNumber,
        coverArt: extracted.coverArt,
      };
    }
  } catch (err) {
    console.debug('ID3 parse skipped for file:', err);
  }

  return heuristics;
}

function decodeTextFrame(data: Uint8Array): string {
  if (data.length <= 1) return '';
  const encoding = data[0];
  const bytes = data.subarray(1);

  if (encoding === 0) {
    // ISO-8859-1
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      str += String.fromCharCode(bytes[i]);
    }
    return str.trim();
  } else if (encoding === 1 || encoding === 2) {
    // UTF-16 with BOM
    try {
      const decoder = new TextDecoder(encoding === 1 ? 'utf-16' : 'utf-16be');
      const text = decoder.decode(bytes);
      return text.replace(/\0.*$/g, '').trim();
    } catch {
      return '';
    }
  } else if (encoding === 3) {
    // UTF-8
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(bytes);
      return text.replace(/\0.*$/g, '').trim();
    } catch {
      return '';
    }
  }
  return '';
}

function parseApicFrame(data: Uint8Array): string | undefined {
  if (data.length < 10) return undefined;
  const encoding = data[0];
  let offset = 1;

  // Read MIME type (null-terminated ISO-8859-1 string)
  let mimeType = '';
  while (offset < data.length && data[offset] !== 0) {
    mimeType += String.fromCharCode(data[offset]);
    offset++;
  }
  offset++; // skip null terminator

  if (!mimeType) mimeType = 'image/jpeg';
  if (offset >= data.length) return undefined;

  // Picture type (1 byte, e.g. 0x03 for cover front)
  const picType = data[offset];
  offset++;

  // Description (null-terminated string with specified encoding)
  if (encoding === 0 || encoding === 3) {
    while (offset < data.length && data[offset] !== 0) offset++;
    offset++; // skip null
  } else {
    // 2-byte null for utf-16
    while (offset + 1 < data.length && !(data[offset] === 0 && data[offset + 1] === 0)) {
      offset += 2;
    }
    offset += 2;
  }

  if (offset >= data.length) return undefined;

  // Remaining bytes are the image data
  const imgData = data.subarray(offset);
  if (imgData.length < 16) return undefined;

  // Convert image bytes to base64
  let binary = '';
  const len = imgData.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(imgData[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}
