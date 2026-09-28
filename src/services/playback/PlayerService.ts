import { Track } from '../../types';
import { getFileFromTrack } from '../filesystem/scanner';

export interface PlayerListeners {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: (errorMessage: string | null) => void;
  onEnded?: () => void;
  onTrackLoaded?: (track: Track, duration: number) => void;
  onNextTrackRequested?: () => void;
  onPreviousTrackRequested?: () => void;
}

class PlayerService {
  private audioElement: HTMLAudioElement;
  private videoElement: HTMLVideoElement | null = null;
  private currentObjectUrl: string | null = null;
  private currentTrack: Track | null = null;
  private listeners: PlayerListeners = {};
  private volume: number = 0.85;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private isLoading: boolean = false;

  // Web Audio Visualizer API
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private videoSourceNode: MediaElementAudioSourceNode | null = null;
  private frequencyDataArray: Uint8Array | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'metadata';
    this.audioElement.volume = this.volume;
    this.setupMediaListeners(this.audioElement);
    this.initMediaSession();
  }

  public initAudioContext(): void {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128; // 64 frequency bins, lightweight and fast
      this.analyser.smoothingTimeConstant = 0.82;
      this.frequencyDataArray = new Uint8Array(this.analyser.frequencyBinCount);

      if (!this.audioSourceNode) {
        this.audioSourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        this.audioSourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch (err) {
      console.warn('AudioContext / Analyser init error:', err);
    }
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.frequencyDataArray) {
      return null;
    }
    this.analyser.getByteFrequencyData(this.frequencyDataArray as any);
    return this.frequencyDataArray;
  }

  public registerListeners(listeners: PlayerListeners) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  public bindVideoElement(videoEl: HTMLVideoElement | null) {
    if (this.videoElement === videoEl) return;

    if (this.videoElement) {
      this.removeMediaListeners(this.videoElement);
    }
    this.videoElement = videoEl;
    if (this.videoElement) {
      this.videoElement.volume = this.isMuted ? 0 : this.volume;
      this.videoElement.muted = this.isMuted;
      this.setupMediaListeners(this.videoElement);

      if (this.currentTrack?.type === 'video' && this.currentObjectUrl) {
        const currentTime = this.audioElement.currentTime;
        this.videoElement.src = this.currentObjectUrl;
        this.videoElement.currentTime = currentTime;
        if (this.isPlaying) {
          this.videoElement.play().catch((e) => console.warn('Video resume error:', e));
        }
      }
    }
  }

  private getActiveElement(): HTMLMediaElement {
    if (this.currentTrack?.type === 'video' && this.videoElement) {
      return this.videoElement;
    }
    return this.audioElement;
  }

  private setupMediaListeners(media: HTMLMediaElement) {
    media.addEventListener('timeupdate', this.handleTimeUpdate);
    media.addEventListener('durationchange', this.handleDurationChange);
    media.addEventListener('play', this.handlePlay);
    media.addEventListener('pause', this.handlePause);
    media.addEventListener('ended', this.handleEnded);
    media.addEventListener('waiting', this.handleWaiting);
    media.addEventListener('canplay', this.handleCanPlay);
    media.addEventListener('error', this.handleError);
  }

  private removeMediaListeners(media: HTMLMediaElement) {
    media.removeEventListener('timeupdate', this.handleTimeUpdate);
    media.removeEventListener('durationchange', this.handleDurationChange);
    media.removeEventListener('play', this.handlePlay);
    media.removeEventListener('pause', this.handlePause);
    media.removeEventListener('ended', this.handleEnded);
    media.removeEventListener('waiting', this.handleWaiting);
    media.removeEventListener('canplay', this.handleCanPlay);
    media.removeEventListener('error', this.handleError);
  }

  private handleTimeUpdate = (e: Event) => {
    const el = e.target as HTMLMediaElement;
    const currentTime = el.currentTime;
    const duration = isFinite(el.duration) ? el.duration : 0;
    this.listeners.onTimeUpdate?.(currentTime, duration);
    this.updateMediaSessionPosition(currentTime, duration);
  };

  private handleDurationChange = (e: Event) => {
    const el = e.target as HTMLMediaElement;
    const duration = isFinite(el.duration) ? el.duration : 0;
    if (duration > 0 && this.currentTrack) {
      this.listeners.onTrackLoaded?.(this.currentTrack, duration);
      this.updateMediaSessionPosition(el.currentTime, duration);
    }
  };

  private handlePlay = () => {
    this.isPlaying = true;
    this.listeners.onPlayStateChange?.(true);
    this.updateMediaSessionState('playing');
  };

  private handlePause = () => {
    this.isPlaying = false;
    this.listeners.onPlayStateChange?.(false);
    this.updateMediaSessionState('paused');
  };

  private handleEnded = () => {
    this.isPlaying = false;
    this.listeners.onPlayStateChange?.(false);
    this.updateMediaSessionState('paused');
    this.listeners.onEnded?.();
  };

  private handleWaiting = () => {
    this.isLoading = true;
    this.listeners.onLoadingChange?.(true);
  };

  private handleCanPlay = () => {
    this.isLoading = false;
    this.listeners.onLoadingChange?.(false);
  };

  private handleError = (e: Event) => {
    const el = e.target as HTMLMediaElement;
    let message = 'Unable to play this file';
    if (el.error) {
      switch (el.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          message = 'Playback was aborted.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          message = 'A network error occurred while reading the file.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          message = 'Unable to play this file. The media format or codec may be corrupt or unsupported by your browser.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          message = 'Unable to play this file. Your browser may not support this audio/video format or the file was moved.';
          break;
        default:
          message = el.error.message || 'An error occurred during media playback.';
      }
    }
    this.isLoading = false;
    this.isPlaying = false;
    this.listeners.onError?.(message);
    this.listeners.onLoadingChange?.(false);
    this.listeners.onPlayStateChange?.(false);
    this.updateMediaSessionState('none');
  };

  public async loadTrack(track: Track, autoPlay = true, startPosition = 0): Promise<void> {
    this.currentTrack = track;
    this.listeners.onError?.(null);
    this.listeners.onLoadingChange?.(true);

    // Stop current media & release previous URL to avoid memory leaks
    this.audioElement.pause();
    this.audioElement.removeAttribute('src');
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    try {
      const file = await getFileFromTrack(track);
      if (!file) {
        throw new Error(`File "${track.title}" is missing or moved from disk.`);
      }

      this.currentObjectUrl = URL.createObjectURL(file);
      const activeEl = this.getActiveElement();

      activeEl.src = this.currentObjectUrl;
      activeEl.load();

      if (startPosition > 0) {
        activeEl.currentTime = startPosition;
      }

      this.updateMediaSessionMetadata(track);

      if (autoPlay) {
        try {
          await activeEl.play();
          this.isPlaying = true;
          this.listeners.onPlayStateChange?.(true);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Autoplay failed:', err);
            this.listeners.onError?.('Playback was blocked by the browser. Click Play to start.');
          }
        }
      }
    } catch (err: any) {
      console.error('Track load error:', err);
      this.listeners.onError?.(err?.message || 'Could not load media file.');
      this.isPlaying = false;
      this.listeners.onPlayStateChange?.(false);
    } finally {
      this.listeners.onLoadingChange?.(false);
    }
  }

  public async play(): Promise<void> {
    this.initAudioContext();
    const el = this.getActiveElement();
    if (!el.src && this.currentTrack) {
      await this.loadTrack(this.currentTrack, true);
      return;
    }
    try {
      await el.play();
      this.isPlaying = true;
      this.listeners.onPlayStateChange?.(true);
      this.listeners.onError?.(null);
      this.updateMediaSessionState('playing');
    } catch (err: any) {
      console.warn('Play error:', err);
      this.listeners.onError?.('Could not play media: ' + (err?.message || 'unknown error'));
    }
  }

  public pause(): void {
    const el = this.getActiveElement();
    el.pause();
    this.isPlaying = false;
    this.listeners.onPlayStateChange?.(false);
    this.updateMediaSessionState('paused');
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(timeInSeconds: number): void {
    const el = this.getActiveElement();
    if (isFinite(timeInSeconds) && timeInSeconds >= 0) {
      el.currentTime = timeInSeconds;
      this.updateMediaSessionPosition(timeInSeconds, el.duration);
    }
  }

  public seekRelative(deltaSeconds: number): void {
    const el = this.getActiveElement();
    const newTime = Math.max(0, Math.min(el.currentTime + deltaSeconds, el.duration || 0));
    this.seek(newTime);
  }

  public setVolume(newVolume: number): void {
    const clamped = Math.max(0, Math.min(1, newVolume));
    this.volume = clamped;
    this.audioElement.volume = this.isMuted ? 0 : clamped;
    if (this.videoElement) {
      this.videoElement.volume = this.isMuted ? 0 : clamped;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.audioElement.muted = muted;
    if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // --- Browser Media Session API Integration ---
  private initMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        this.seekRelative(-(details.seekOffset || 5));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        this.seekRelative(details.seekOffset || 5);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.listeners.onPreviousTrackRequested?.();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.listeners.onNextTrackRequested?.();
      });
    } catch (e) {
      console.debug('MediaSession action handler error:', e);
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const artwork = track.coverArt
        ? [{ src: track.coverArt, sizes: '512x512', type: 'image/jpeg' }]
        : [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Local Music',
        album: track.album || track.parentFolder || '',
        artwork,
      });
    } catch (e) {
      console.debug('MediaMetadata error:', e);
    }
  }

  private updateMediaSessionState(state: 'none' | 'paused' | 'playing') {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch {
      // Ignore
    }
  }

  private updateMediaSessionPosition(currentTime: number, duration: number) {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession)
    ) {
      return;
    }
    try {
      if (isFinite(duration) && duration > 0 && isFinite(currentTime)) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1.0,
          position: Math.max(0, Math.min(currentTime, duration)),
        });
      }
    } catch {
      // Ignore invalid position updates
    }
  }

  public destroy(): void {
    this.audioElement.pause();
    this.removeMediaListeners(this.audioElement);
    if (this.videoElement) {
      this.videoElement.pause();
      this.removeMediaListeners(this.videoElement);
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}

export const playerService = new PlayerService();
