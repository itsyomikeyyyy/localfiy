import { Track, SortOption } from '../types';

export function sortTracks(tracks: Track[], sortOption: SortOption): Track[] {
  const { field, direction } = sortOption;
  const modifier = direction === 'asc' ? 1 : -1;

  return [...tracks].sort((a, b) => {
    switch (field) {
      case 'title':
        return modifier * a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      case 'artist':
        return modifier * (a.artist || '').localeCompare(b.artist || '', undefined, { numeric: true, sensitivity: 'base' });
      case 'album':
        return modifier * (a.album || '').localeCompare(b.album || '', undefined, { numeric: true, sensitivity: 'base' });
      case 'duration': {
        const durA = a.duration || 0;
        const durB = b.duration || 0;
        return modifier * (durA - durB);
      }
      case 'dateAdded': {
        const dateA = a.dateAdded || 0;
        const dateB = b.dateAdded || 0;
        return modifier * (dateA - dateB);
      }
      case 'recentlyPlayed': {
        const playedA = a.lastPlayed || 0;
        const playedB = b.lastPlayed || 0;
        return modifier * (playedA - playedB);
      }
      default:
        return 0;
    }
  });
}
