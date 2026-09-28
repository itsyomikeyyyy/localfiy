import { Track, FolderNode } from '../types';

export function buildFolderTree(tracks: Track[], rootFolderName: string): FolderNode {
  const root: FolderNode = {
    name: rootFolderName || 'Music',
    path: '',
    trackCount: tracks.length,
    subFolders: [],
  };

  const folderMap = new Map<string, FolderNode>();
  folderMap.set('', root);

  // Group track counts by folder path
  for (const track of tracks) {
    const parts = track.relativePath.split('/');
    if (parts.length <= 1) continue; // Track in root

    // Directory parts excluding the filename
    const dirParts = parts.slice(0, parts.length - 1);
    let currentPath = '';

    for (let i = 0; i < dirParts.length; i++) {
      const part = dirParts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let node = folderMap.get(currentPath);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          trackCount: 0,
          subFolders: [],
        };
        folderMap.set(currentPath, node);

        const parentNode = folderMap.get(parentPath);
        if (parentNode && !parentNode.subFolders.some((f) => f.path === currentPath)) {
          parentNode.subFolders.push(node);
        }
      }
      node.trackCount++;
    }
  }

  // Sort subfolders alphabetically
  function sortTree(node: FolderNode) {
    node.subFolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    node.subFolders.forEach(sortTree);
  }
  sortTree(root);

  return root;
}

export function filterTracksByFolder(tracks: Track[], folderPath: string): Track[] {
  if (!folderPath) return tracks;
  return tracks.filter((t) => {
    // Exact or subfolder match: relativePath starts with folderPath + '/'
    return t.relativePath === folderPath || t.relativePath.startsWith(`${folderPath}/`);
  });
}
