# 🏗️ Localify Architecture Audit & Tech Debt Report

This report outlines the current architectural state of Localify, identifies areas of tech debt, and proposes a concrete plan for modernizing the codebase for better scalability, performance, and developer experience (especially for open-source contributors).

## 🚨 1. The "God Hook" Anti-Pattern
**Current State:**
`src/hooks/useLocalify.ts` is a massive ~900-line hook. It is currently responsible for *everything*: file system scanning, ID3 metadata extraction orchestration, playback state, queue management, UI modal visibility, and database persistence.
**Why it's a problem:** 
- It creates massive re-renders across the entire app whenever *any* state changes (e.g., toggling the queue panel re-renders the track list).
- It's intimidating for beginners to navigate.
**Proposed Fix:**
Adopt a lightweight global state manager like **Zustand**. Split the monolithic state into specialized slices:
- `usePlaybackStore`: Handles playing, pausing, current track, volume.
- `useLibraryStore`: Handles the tracks array, scanning progress, and folders.
- `useQueueStore`: Handles the next/previous tracks and user queue.
- `useUIStore`: Handles modal open/close states (Queue, Video, Shortcuts).

## 🍝 2. Severe Prop Drilling in App Layout
**Current State:**
`src/App.tsx` is nearly 500 lines long. Because all state lives in `useLocalify` at the top level, `App.tsx` passes dozens of props down to its children. For example, `NowPlayingModal` takes 14 props.
**Why it's a problem:** 
- Adding a new feature requires threading a new prop through multiple layers of components.
- It makes the JSX extremely verbose and hard to read.
**Proposed Fix:**
With the transition to Zustand (or React Context), components like `NowPlayingModal` and `PlayerBar` can subscribe directly to the specific state they need. `App.tsx` will become a clean layout shell devoid of complex prop passing.

## 🧭 3. Lack of True Routing
**Current State:**
Navigation is handled by a manual `activeTab` string state (`'home'`, `'songs'`, `'folders'`, `'favorites'`).
**Why it's a problem:**
- Users cannot use the browser's Back/Forward buttons to navigate.
- You cannot share a link to a specific view (e.g., opening directly to a specific folder).
**Proposed Fix:**
Implement **React Router (`react-router-dom`)**. Map the tabs to actual URLs (`/`, `/songs`, `/folders/:path`, `/favorites`). This brings native web behavior to the PWA.

## 🐢 4. List Rendering Performance
**Current State:**
If a user imports a folder with 5,000 songs, `TrackList.tsx` renders 5,000 DOM nodes simultaneously.
**Why it's a problem:**
- This will cause massive memory spikes and UI freezing on lower-end devices or large libraries.
**Proposed Fix:**
Implement **DOM Virtualization**. Use a library like `@tanstack/react-virtual` or `react-virtuoso` inside `TrackList`. This ensures only the ~20 items currently visible on the screen are rendered in the DOM, maintaining 60fps scrolling regardless of library size.

## ⌨️ 5. Mixed Concerns (Keyboard Shortcuts)
**Current State:**
`App.tsx` contains a massive `useEffect` block dedicated to catching keystrokes for playback control.
**Why it's a problem:**
- It bloats the layout component with non-layout logic.
**Proposed Fix:**
Extract this logic into a dedicated custom hook: `useGlobalShortcuts()`.

---

## 🛠️ Recommended Action Plan (Phase 1)
If you agree with this audit, we can begin the cleanup in this order:
1. **Refactor State:** Install `zustand` and migrate `useLocalify.ts` into modular stores.
2. **Clean up App.tsx:** Remove prop drilling by connecting components directly to the new stores.
3. **Extract Hooks:** Move keyboard shortcuts and other standalone logic out of the UI components.

*Note: Doing this refactor will make the codebase infinitely easier for your new Gen-Z open source contributors to work on!*
