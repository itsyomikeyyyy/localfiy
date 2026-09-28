import { Track, ScanProgress } from '../../types';
import { getMediaTypeAndFormat, cleanTrackTitle } from '../../utils/formatters';
import { extractMetadataFromFile, parseFilenameHeuristics } from '../metadata/extractor';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickMusicDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('FileSystemAccessNotSupported');
  }
  try {
    const handle = await (window as any).showDirectoryPicker({
      id: 'localify_music_folder',
      mode: 'read',
    });
    return handle;
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

export async function verifyFolderPermission(
  handle: FileSystemDirectoryHandle,
  requestIfNeeded = false
): Promise<'granted' | 'prompt' | 'denied'> {
  try {
    const status = await (handle as any).queryPermission({ mode: 'read' });
    if (status === 'granted') {
      return 'granted';
    }
    if (requestIfNeeded) {
      const requestedStatus = await (handle as any).requestPermission({ mode: 'read' });
      return requestedStatus;
    }
    return status;
  } catch (err) {
    console.warn('Error checking folder permission:', err);
    return 'denied';
  }
}

export async function scanDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  existingTracksMap?: Map<string, Track>,
  onProgress?: (progress: ScanProgress) => void
): Promise<Track[]> {
  const tracks: Track[] = [];
  let filesFound = 0;
  let filesSinceLastYield = 0;
  const now = Date.now();

  async function traverse(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    folderName: string
  ): Promise<void> {
    try {
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          const fileName = entry.name;
          if (fileName.startsWith('.')) continue;

          const typeInfo = getMediaTypeAndFormat(fileName);
          if (typeInfo) {
            const fileHandle = entry as FileSystemFileHandle;
            const relativePath = currentPath ? `${currentPath}/${fileName}` : fileName;
            const trackId = `${rootHandle.name}::${relativePath}`;

            const existing = existingTracksMap?.get(trackId);

            let size = existing ? existing.size : 0;
            let lastModified = existing ? existing.lastModified : now;
            let fileObj: File | null = null;

            try {
              fileObj = await fileHandle.getFile();
              size = fileObj.size;
              lastModified = fileObj.lastModified;
            } catch {
              // Ignore stats error
            }

            // Metadata extraction: if existing had metadata, reuse; otherwise extract
            let artist = existing?.artist || '';
            let album = existing?.album || '';
            let genre = existing?.genre;
            let year = existing?.year;
            let trackNumber = existing?.trackNumber;
            let coverArt = existing?.coverArt;

            if (!existing && fileObj) {
              try {
                const meta = await extractMetadataFromFile(fileObj, relativePath);
                artist = meta.artist || '';
                album = meta.album || '';
                genre = meta.genre;
                year = meta.year;
                trackNumber = meta.trackNumber;
                coverArt = meta.coverArt;
              } catch {
                const heuristics = parseFilenameHeuristics(relativePath, fileName);
                artist = heuristics.artist || '';
                album = heuristics.album || '';
              }
            } else if (!existing) {
              const heuristics = parseFilenameHeuristics(relativePath, fileName);
              artist = heuristics.artist || '';
              album = heuristics.album || '';
            }

            tracks.push({
              id: trackId,
              title: cleanTrackTitle(fileName),
              artist: artist || folderName || 'Unknown Artist',
              album: album || folderName || 'Unknown Album',
              genre,
              year,
              trackNumber,
              coverArt,
              fileName,
              relativePath,
              parentFolder: folderName || rootHandle.name,
              format: typeInfo.format,
              type: typeInfo.type,
              size,
              lastModified,
              duration: existing?.duration || null,
              dateAdded: existing?.dateAdded || now,
              lastPlayed: existing?.lastPlayed || null,
              playCount: existing?.playCount || 0,
              isFavorite: existing?.isFavorite || false,
              handle: fileHandle,
            });

            filesFound++;
            filesSinceLastYield++;

            if (filesSinceLastYield >= 25) {
              filesSinceLastYield = 0;
              if (onProgress) {
                onProgress({
                  isScanning: true,
                  filesFound,
                  currentFolder: folderName || rootHandle.name,
                });
              }
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }
        } else if (entry.kind === 'directory') {
          if (entry.name.startsWith('.')) continue;

          const subDirPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          await traverse(entry as FileSystemDirectoryHandle, subDirPath, entry.name);
        }
      }
    } catch (err) {
      console.warn(`Could not read directory ${currentPath}:`, err);
    }
  }

  if (onProgress) {
    onProgress({
      isScanning: true,
      filesFound: 0,
      currentFolder: rootHandle.name,
    });
  }

  await traverse(rootHandle, '', rootHandle.name);

  // Sort initially by track title
  tracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));

  if (onProgress) {
    onProgress({
      isScanning: false,
      filesFound: tracks.length,
      currentFolder: rootHandle.name,
    });
  }

  return tracks;
}

export async function scanFileList(
  fileList: FileList | File[],
  existingTracksMap?: Map<string, Track>,
  onProgress?: (progress: ScanProgress) => void
): Promise<Track[]> {
  const tracks: Track[] = [];
  const files = Array.from(fileList);
  let filesFound = 0;
  const now = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.name.startsWith('.')) continue;

    const typeInfo = getMediaTypeAndFormat(file.name);
    if (typeInfo) {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Files';
      const trackId = `file::${relativePath}`;

      const existing = existingTracksMap?.get(trackId);

      let artist = existing?.artist || '';
      let album = existing?.album || '';
      let genre = existing?.genre;
      let year = existing?.year;
      let trackNumber = existing?.trackNumber;
      let coverArt = existing?.coverArt;

      if (!existing) {
        try {
          const meta = await extractMetadataFromFile(file, relativePath);
          artist = meta.artist || '';
          album = meta.album || '';
          genre = meta.genre;
          year = meta.year;
          trackNumber = meta.trackNumber;
          coverArt = meta.coverArt;
        } catch {
          const heuristics = parseFilenameHeuristics(relativePath, file.name);
          artist = heuristics.artist || '';
          album = heuristics.album || '';
        }
      }

      tracks.push({
        id: trackId,
        title: cleanTrackTitle(file.name),
        artist: artist || parentFolder || 'Unknown Artist',
        album: album || parentFolder || 'Unknown Album',
        genre,
        year,
        trackNumber,
        coverArt,
        fileName: file.name,
        relativePath,
        parentFolder,
        format: typeInfo.format,
        type: typeInfo.type,
        size: file.size,
        lastModified: file.lastModified,
        duration: existing?.duration || null,
        dateAdded: existing?.dateAdded || now,
        lastPlayed: existing?.lastPlayed || null,
        playCount: existing?.playCount || 0,
        isFavorite: existing?.isFavorite || false,
        file,
      });

      filesFound++;
      if (filesFound % 25 === 0) {
        if (onProgress) {
          onProgress({
            isScanning: true,
            filesFound,
            currentFolder: parentFolder,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  tracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));

  if (onProgress) {
    onProgress({
      isScanning: false,
      filesFound: tracks.length,
      currentFolder: 'Local Files',
    });
  }

  return tracks;
}

export async function getFileFromTrack(track: Track): Promise<File | null> {
  if (track.file) {
    return track.file;
  }
  if (track.handle) {
    try {
      const file = await track.handle.getFile();
      return file;
    } catch (err) {
      console.warn('File missing or handle inaccessible on disk:', err);
      return null;
    }
  }
  return null;
}
