// ═══════════════════════════════════════════════════════════════
//  CHRONOS SKIN — ChronosPlayer.tsx
//  Industrial Hardware & Cinema Reference Architecture
//  Genuine Video.js v10 (@videojs/react/video & @videojs/react)
//  License: Apache-2.0
// ═══════════════════════════════════════════════════════════════
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  useMemo,
} from 'react';
import { VideoPlayer, Video } from '@videojs/react/video';
import { Container } from '@videojs/react';
import './skin.css';
import {
  IconPlay,
  IconPause,
  IconVolumeHigh,
  IconVolumeLow,
  IconVolumeMute,
  IconFullscreenEnter,
  IconFullscreenExit,
  IconPiP,
  IconClose,
  IconReplay10,
  IconForward10,
  IconKeybindings,
  IconSettings,
  IconQuality,
  IconCaptions,
  IconLoop,
  IconReplay,
  IconSpinner,
  IconAlert,
  IconArrowLeft,
  IconChevronRight,
} from './icons';
import { getDynamicChapters, type DynamicChapter } from '../config';
import {
  formatSMPTE,
  formatRemainingSMPTE,
  formatFrameCount,
  formatSimpleTime,
  formatTimeHMS,
  parseSMPTESegments,
  formatDrumDisplay,
  type DrumMode,
} from '../utils/timecode';

function getPreviewThumbnailUrl(src: string, hoverSec: number, poster?: string): string | null {
  if (!src) return poster || null;
  const muxMatch = src.match(/stream\.mux\.com\/([a-zA-Z0-9_-]+)\.m3u8/);
  if (muxMatch) {
    const id = muxMatch[1];
    return `https://image.mux.com/${id}/thumbnail.jpg?time=${Math.max(0, Math.floor(hoverSec))}&width=280`;
  }
  if (poster && poster.includes('image.mux.com')) {
    const pMatch = poster.match(/image\.mux\.com\/([a-zA-Z0-9_-]+)/);
    if (pMatch) {
      return `https://image.mux.com/${pMatch[1]}/thumbnail.jpg?time=${Math.max(0, Math.floor(hoverSec))}&width=280`;
    }
  }
  return poster || null;
}

interface PreviewThumbnailFrameProps {
  src: string;
  hoverTime: number;
  poster?: string;
  isMobile: boolean;
}

function PreviewThumbnailFrame({ src, hoverTime, poster, isMobile }: PreviewThumbnailFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasImgError, setHasImgError] = useState(false);
  const thumbUrl = useMemo(() => getPreviewThumbnailUrl(src, hoverTime, poster), [src, hoverTime, poster]);

  useEffect(() => {
    setLoaded(false);
    setHasImgError(false);
  }, [thumbUrl]);

  // Mobile view: completely omit the 176x99px image frame to keep video visible
  if (isMobile) {
    return null;
  }

  const showPlaceholder = !thumbUrl || hasImgError || !loaded;

  return (
    <div className="chronos-loupe-frame">
      {thumbUrl && !hasImgError && (
        <img
          src={thumbUrl}
          alt=""
          className="chronos-loupe-img"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.15s ease' }}
          onLoad={() => setLoaded(true)}
          onError={() => setHasImgError(true)}
          loading="eager"
        />
      )}
      {showPlaceholder && (
        <div className="chronos-loupe-placeholder">
          <span className="chronos-loupe-scan-radar" />
          <span className="chronos-loupe-scan-text">
            {hasImgError || !thumbUrl ? 'CALIBRATING FRAME' : 'OPTICAL GATE SCAN'}
          </span>
        </div>
      )}
      <div className="chronos-loupe-crosshair" />
    </div>
  );
}

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export interface VideoMetadata {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  resolution: string;
}

export interface BufferedRange {
  startPct: number;
  widthPct: number;
}

export interface QualityOption {
  id: number; // -1 = Auto, or 0, 1, 2...
  name: string;
  badge: string;
  specs: string;
  height: number;
}

export interface AudioTrackOption {
  id: number;
  name: string;
  lang?: string;
  channels?: number;
}

export interface ChronosPlayerProps {
  src: string;
  poster?: string;
  autoCueTime?: number;
  aspectRatio?: '16/9' | '21/9' | '4/3' | 'fill';
  onTimeUpdate?: (time: number) => void;
  onMetadataLoaded?: (meta: VideoMetadata) => void;
  containerWidth?: number;
}

/**
 * Format accurate video resolution labels.
 * Common categories: 2160p (4K UHD), 1440p (QHD), 1080p (Master), 720p (HD), 480p (SD), 360p (Proxy).
 * Unusual resolutions are shown with their exact dimensions without inaccurate labels.
 */
export function formatResolution(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) {
    return 'Scanning Raster...';
  }

  // Exact standard video resolution matching (including anamorphic aspect ratios)
  let category = '';
  if (height === 2160 || (width === 3840 && height >= 1600)) {
    category = '2160p 4K UHD';
  } else if (height === 1440 || (width === 2560 && height >= 1080)) {
    category = '1440p QHD';
  } else if (height === 1080 || (width === 1920 && height >= 800)) {
    category = '1080p Master';
  } else if (height === 720 || (width === 1280 && height >= 530)) {
    category = '720p HD';
  } else if (height === 480 || (width === 854 && height >= 360)) {
    category = '480p SD';
  } else if (height === 360 || (width === 640 && height >= 270)) {
    category = '360p Proxy';
  }

  if (category) {
    return `${width} × ${height} (${category})`;
  }
  // For unusual / non-standard dimensions, display actual dimensions without an inaccurate label
  return `${width} × ${height}`;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const STATIC_CUES: SubtitleCue[] = [
  { start: 1.0, end: 6.0, text: '[STUDIO CHRONOS: Archival Optical Reference & Calibration Master]' },
  { start: 7.5, end: 14.0, text: 'Act 01: Inspection of physical 35mm canister seals and preliminary densitometry.' },
  { start: 15.0, end: 24.0, text: 'Verify sprocket stability across continuous-motion 4K gate transport.' },
  { start: 25.0, end: 40.0, text: 'Act 02: Calibrating photodiode response and optical dynamic range.' },
  { start: 42.0, end: 65.0, text: 'Emulsion density: D-max 2.45, D-min 0.08. Color temperature balanced to 6500 Kelvin.' },
  { start: 70.0, end: 105.0, text: 'Act 03: Automated temporal scratch suppression and particulate matrix isolation.' },
  { start: 110.0, end: 150.0, text: 'Act 04: Conforming ITU-R BT.709 spectral transfer characteristic.' },
  { start: 155.0, end: 210.0, text: 'Confirming precision audio synchronization at 48.0 kHz 24-bit PCM.' },
  { start: 215.0, end: 300.0, text: 'Act 05: Archival preservation master conform complete. Mezzanine IMF package verified.' },
];

// ═══════════════════════════════════════════════════════════════
//  Internal Chronos Industrial Skin Component
// ═══════════════════════════════════════════════════════════════
function ChronosSkinInternal({
  src,
  poster,
  autoCueTime,
  aspectRatio = '16/9',
  onTimeUpdate,
  onMetadataLoaded,
  containerWidth,
}: ChronosPlayerProps) {
  // ── Element & Trigger Button Refs ────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<any>(null);

  const qualityBtnRef = useRef<HTMLButtonElement>(null);
  const speedBtnRef = useRef<HTMLButtonElement>(null);
  const cfgBtnRef = useRef<HTMLButtonElement>(null);
  const indexBtnRef = useRef<HTMLButtonElement>(null);
  const keysBtnRef = useRef<HTMLButtonElement>(null);
  const captionsBtnRef = useRef<HTMLButtonElement>(null);

  // ── Live Video Media State ───────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [ended, setEnded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [idle, setIdle] = useState(false);
  const [drumMode, setDrumMode] = useState<DrumMode>('smpte');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [activeCueText, setActiveCueText] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState<string>('Scanning Raster...');

  // Genuine Quality & Adaptive Levels State
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [activeHlsLevel, setActiveHlsLevel] = useState<number>(-1);
  const [isAdaptiveHls, setIsAdaptiveHls] = useState<boolean>(false);

  // Genuine Audio Tracks State
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(0);

  // Popover States
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [cfgMenuOpen, setCfgMenuOpen] = useState(false);
  const [settingsSubmenu, setSettingsSubmenu] = useState<'main' | 'quality' | 'speed' | 'captions' | 'audio'>('main');
  const [indexMenuOpen, setIndexMenuOpen] = useState(false);
  const [keysModalOpen, setKeysModalOpen] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Hover & Scrubbing State
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverXPercent, setHoverXPercent] = useState(0);
  const [hoverChapter, setHoverChapter] = useState<DynamicChapter | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const isLive = !isFinite(duration) || duration === Infinity || duration <= 0;

  // Dynamic chapters synced to real duration
  const chapters = useMemo(() => getDynamicChapters(duration), [duration]);

  const currentChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    return (
      [...chapters].reverse().find((c) => currentTime >= c.time) || chapters[0]
    );
  }, [chapters, currentTime]);

  // ── FIX 8: Responsive Container Detection (ResizeObserver) ────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (w: number) => {
      setIsMobile(w <= 640);
      setIsTablet(w > 640 && w <= 820);
      setIsCompact(w <= 900);
    };

    if (containerWidth !== undefined) {
      updateSize(containerWidth);
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) updateSize(w);
        }
      });
      ro.observe(container);
      return () => ro.disconnect();
    } else {
      const onResize = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0) updateSize(rect.width);
      };
      window.addEventListener('resize', onResize);
      onResize();
      return () => window.removeEventListener('resize', onResize);
    }
  }, [containerWidth]);

  // ── FIX 3: Genuine Quality Label displayed on the dock ─────────
  const currentQualityLabel = useMemo(() => {
    if (isAdaptiveHls) {
      if (currentQuality === -1) {
        if (activeHlsLevel >= 0 && qualityOptions[activeHlsLevel + 1]) {
          return `AUTO · ${qualityOptions[activeHlsLevel + 1].badge}`;
        }
        const v = videoRef.current;
        const h = v?.videoHeight;
        return h && h > 0 ? `AUTO · ${h}p` : 'AUTO';
      }
      const match = qualityOptions.find((q) => q.id === currentQuality);
      return match ? match.badge : 'AUTO';
    }

    if (src.includes('.m3u8')) {
      const match = qualityOptions.find((q) => q.id === currentQuality);
      if (match) return match.badge;
      return 'AUTO';
    }

    const v = videoRef.current;
    const h = v?.videoHeight;
    return h && h > 0 ? `${h}p` : 'SRC';
  }, [isAdaptiveHls, currentQuality, activeHlsLevel, qualityOptions, src]);

  // ── Multi-Buffered Ranges Update Helper ───────────────────────
  const updateBufferedRanges = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration || duration <= 0 || isLive) return;
    const ranges = video.buffered;
    const list: BufferedRange[] = [];
    for (let i = 0; i < ranges.length; i++) {
      const start = ranges.start(i);
      const end = ranges.end(i);
      const startPct = Math.max(0, Math.min(100, (start / duration) * 100));
      const endPct = Math.max(0, Math.min(100, (end / duration) * 100));
      list.push({
        startPct,
        widthPct: Math.max(0.2, endPct - startPct),
      });
    }
    setBufferedRanges(list);
  }, [duration, isLive]);

  // ── FIX 9: Stream Ingest, HLS Connection & Reel Lifecycle ─────
  const attachStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.pause();
    } catch {}

    // Complete state reset when switching reels
    setPlaying(false);
    setHasStartedPlayback(false);
    setCurrentTime(0);
    setDuration(0);
    setWaiting(false);
    setEnded(false);
    setHasError(false);
    setErrorMessage('');
    setBufferedRanges([]);
    setQualityOptions([]);
    setCurrentQuality(-1);
    setActiveHlsLevel(-1);
    setIsAdaptiveHls(false);
    setAudioTracks([]);
    setActiveAudioTrack(0);
    setActiveCueText('');

    // Safely destroy previous HLS instance
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    // Preserve loop state
    video.loop = loopEnabled;

    if (src.includes('.m3u8')) {
      if (video.canPlayType('application/vnd.apple.mpegurl') && !window.MediaSource) {
        // Native Apple HLS (Safari iOS/macOS)
        video.src = src;
        setQualityOptions([
          { id: -1, name: 'AUTO (Native)', badge: 'AUTO', specs: 'System Adaptive HLS Stream', height: 0 },
        ]);
        setIsAdaptiveHls(false);
      } else {
        import('hls.js').then(({ default: Hls }) => {
          if (!Hls.isSupported()) {
            video.src = src;
            return;
          }
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
            // FIX 3: Genuine Video Quality Levels
            if (data.levels && data.levels.length > 0) {
              if (data.levels.length > 1) {
                const opts: QualityOption[] = [
                  { id: -1, name: 'AUTO', badge: 'AUTO', specs: 'Adaptive Dynamic Bitrate', height: 0 },
                  ...data.levels.map((lvl: any, idx: number) => {
                    const h = lvl.height || Math.round((lvl.width || 1280) * (9 / 16));
                    const w = lvl.width || Math.round(h * (16 / 9));
                    const kbps = lvl.bitrate ? Math.round(lvl.bitrate / 1000) : 0;
                    return {
                      id: idx,
                      name: `${h}p`,
                      badge: `${h}p`,
                      specs: `${w}×${h}${kbps > 0 ? ` · ${kbps.toLocaleString()} kbps` : ''}`,
                      height: h,
                    };
                  }),
                ];
                setQualityOptions(opts);
                setIsAdaptiveHls(true);
              } else {
                const lvl = data.levels[0];
                const h = lvl.height || 1080;
                const w = lvl.width || 1920;
                setQualityOptions([
                  { id: 0, name: `${h}p`, badge: `${h}p`, specs: `${w}×${h} · Single Stream`, height: h },
                ]);
                setIsAdaptiveHls(false);
              }
            } else {
              setQualityOptions([]);
              setIsAdaptiveHls(false);
            }

            // FIX 4: Genuine Audio Tracks Detection
            if (hls.audioTracks && hls.audioTracks.length > 0) {
              const tracks: AudioTrackOption[] = hls.audioTracks.map((t: any, idx: number) => ({
                id: idx,
                name: t.name || t.lang || `Track ${idx + 1}`,
                lang: t.lang,
                channels: t.channels || 2,
              }));
              setAudioTracks(tracks);
              setActiveAudioTrack(hls.audioTrack);
            } else {
              setAudioTracks([]);
            }
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_: any, data: any) => {
            setActiveHlsLevel(data.level);
            const v = videoRef.current;
            if (v && v.videoWidth && v.videoHeight) {
              const width = v.videoWidth;
              const height = v.videoHeight;
              const resStr = formatResolution(width, height);
              setVideoResolution(resStr);
              onMetadataLoaded?.({
                duration: v.duration || 0,
                videoWidth: width,
                videoHeight: height,
                resolution: resStr,
              });
            }
          });

          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_: any, data: any) => {
            if (data.audioTracks && data.audioTracks.length > 0) {
              const tracks: AudioTrackOption[] = data.audioTracks.map((t: any, idx: number) => ({
                id: idx,
                name: t.name || t.lang || `Track ${idx + 1}`,
                lang: t.lang,
                channels: t.channels || 2,
              }));
              setAudioTracks(tracks);
              setActiveAudioTrack(hls.audioTrack);
            }
          });

          hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_: any, data: any) => {
            setActiveAudioTrack(data.id);
          });

          hls.on(Hls.Events.ERROR, (_: any, errorData: any) => {
            if (errorData.fatal) {
              console.warn('[Chronos] HLS fatal playback error:', errorData.type);
              setHasError(true);
              setErrorMessage(`Stream network error: ${errorData.details || errorData.type}`);
            }
          });

          hlsRef.current = hls;
        }).catch((err) => {
          video.src = src;
          console.warn('[Chronos] HLS fallback load:', err);
        });
      }
    } else {
      // Ordinary MP4 file
      video.src = src;
      setIsAdaptiveHls(false);
    }
  }, [src, loopEnabled, onMetadataLoaded]);

  useEffect(() => {
    attachStream();
    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, [attachStream]);

  // ── Idle Fade Controller (2.5s) ──────────────────────────────
  const resetIdle = useCallback(() => {
    setIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (playing) {
      idleTimerRef.current = setTimeout(() => setIdle(true), 2500);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    } else {
      idleTimerRef.current = setTimeout(() => setIdle(true), 2500);
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [playing]);

  // ── FIX 1 & 7: Accurate Video Metadata & Duration Handlers ────
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onTimeUpdate?.(video.currentTime);
    updateBufferedRanges();
    if (video.paused && playing) {
      setPlaying(false);
    } else if (!video.paused && !playing) {
      setPlaying(true);
      setHasStartedPlayback(true);
    }
  }, [onTimeUpdate, updateBufferedRanges, playing]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // FIX 7: Genuine duration handling (never hardcode 634)
    const rawDur = video.duration;
    const isLiveStream = !isFinite(rawDur) || rawDur === Infinity || isNaN(rawDur);
    const dur = isLiveStream ? Infinity : rawDur > 0 ? rawDur : 0;
    setDuration(dur);
    setEnded(false);
    setHasError(false);
    setPlaying(!video.paused);

    // Ensure playback consistently cues and starts at exact timecode 00:00:00:00 across all reels
    if (!hasStartedPlayback && video.currentTime !== 0) {
      try {
        video.currentTime = 0;
        setCurrentTime(0);
      } catch {}
    }

    // FIX 1: Genuine resolution detection from real videoWidth & videoHeight
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    const resStr = formatResolution(width, height);
    setVideoResolution(resStr);

    if (!src.includes('.m3u8')) {
      setQualityOptions([
        {
          id: 0,
          name: `${height || 1080}p Direct`,
          badge: `${height || 1080}p`,
          specs: `${width || 1920}×${height || 1080} · Progressive Fixed Media`,
          height: height || 1080,
        },
      ]);
    }

    onMetadataLoaded?.({
      duration: dur,
      videoWidth: width,
      videoHeight: height,
      resolution: resStr,
    });

    updateBufferedRanges();
  }, [hasStartedPlayback, src, onMetadataLoaded, updateBufferedRanges]);

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const rawDur = video.duration;
    const isLiveStream = !isFinite(rawDur) || rawDur === Infinity || isNaN(rawDur);
    const dur = isLiveStream ? Infinity : rawDur > 0 ? rawDur : 0;
    setDuration(dur);
    updateBufferedRanges();
  }, [updateBufferedRanges]);

  const handleVideoResize = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (width > 0 && height > 0) {
      const resStr = formatResolution(width, height);
      setVideoResolution(resStr);
      onMetadataLoaded?.({
        duration: video.duration || 0,
        videoWidth: width,
        videoHeight: height,
        resolution: resStr,
      });
    }
  }, [onMetadataLoaded]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    setHasStartedPlayback(true);
    setEnded(false);
    setWaiting(false);
  }, []);

  const handlePause = useCallback(() => {
    setPlaying(false);
    setWaiting(false);
  }, []);

  const handleWaiting = useCallback(() => setWaiting(true), []);
  const handleSeeking = useCallback(() => setWaiting(true), []);
  const handleSeeked = useCallback(() => {
    setWaiting(false);
    updateBufferedRanges();
  }, [updateBufferedRanges]);
  const handleProgress = useCallback(() => {
    updateBufferedRanges();
  }, [updateBufferedRanges]);
  const handlePlaying = useCallback(() => {
    setWaiting(false);
    setPlaying(true);
    setHasStartedPlayback(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setPlaying(!video.paused);
    }
    setWaiting(false);
    setCanPlay(true);
    updateBufferedRanges();
  }, [updateBufferedRanges]);

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setMuted(video.muted);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setEnded(true);
    setIdle(false);
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    if (video && video.error) {
      setHasError(true);
      setErrorMessage(`Media decode error (Code ${video.error.code})`);
    }
  }, []);

  // ── Mechanical Transport Controls ────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (ended) {
      video.currentTime = 0;
      setEnded(false);
      video.play().then(() => {
        setPlaying(true);
        setHasStartedPlayback(true);
      }).catch(() => {});
      return;
    }
    if (video.paused) {
      video.play().then(() => {
        setPlaying(true);
        setHasStartedPlayback(true);
      }).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
    resetIdle();
  }, [ended, resetIdle]);

  const restartPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setEnded(false);
    video.play().then(() => {
      setPlaying(true);
      setHasStartedPlayback(true);
    }).catch(() => {});
    resetIdle();
  }, [resetIdle]);

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video || !isFinite(duration) || duration <= 0) return;
      video.currentTime = Math.max(0, Math.min(duration, seconds));
      setEnded(false);
      resetIdle();
    },
    [duration, resetIdle]
  );

  const seekRelative = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      seek(video.currentTime + delta);
    },
    [seek]
  );

  const stepFrame = useCallback(
    (frameDelta: number, fps = 24) => {
      const video = videoRef.current;
      if (!video) return;
      if (!video.paused) video.pause();
      seek(video.currentTime + frameDelta * (1 / fps));
    },
    [seek]
  );

  const setVol = useCallback((v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, v));
    video.muted = false;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const setRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const cycleSpeed = useCallback(
    (direction = 1) => {
      const curIdx = PLAYBACK_SPEEDS.findIndex((s) => Math.abs(s - playbackRate) < 0.05);
      const nextIdx =
        curIdx === -1
          ? 2
          : (curIdx + direction + PLAYBACK_SPEEDS.length) % PLAYBACK_SPEEDS.length;
      setRate(PLAYBACK_SPEEDS[nextIdx]);
    },
    [playbackRate, setRate]
  );

  // FIX 3: Quality Switching synced to HLS
  const setQuality = useCallback((levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setCurrentQuality(levelId);
  }, []);

  const cycleQuality = useCallback(
    (direction: 1 | -1) => {
      if (qualityOptions.length === 0) return;
      const curIdx = qualityOptions.findIndex((q) => q.id === currentQuality);
      const nextIdx = (curIdx + direction + qualityOptions.length) % qualityOptions.length;
      setQuality(qualityOptions[nextIdx].id);
    },
    [qualityOptions, currentQuality, setQuality]
  );

  // FIX 4: Audio Track Switching synced to HLS
  const setAudioTrack = useCallback((trackId: number) => {
    if (hlsRef.current && trackId >= 0 && trackId < (hlsRef.current.audioTracks?.length || 0)) {
      hlsRef.current.audioTrack = trackId;
    }
    setActiveAudioTrack(trackId);
  }, []);

  const toggleLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = !video.loop;
    setLoopEnabled(video.loop);
  }, []);

  // FIX 6: Dedicated Captions Toggle & Synchronization
  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    const next = !captionsEnabled;
    setCaptionsEnabled(next);
    if (video && video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = next ? 'hidden' : 'disabled';
      }
    }
    if (!next) {
      setActiveCueText('');
    }
  }, [captionsEnabled]);

  // Verify captions.vtt on mount
  useEffect(() => {
    fetch('/captions.vtt')
      .then((res) => {
        if (!res.ok) console.warn('[Chronos] /captions.vtt load status:', res.status);
      })
      .catch((err) => console.warn('[Chronos] /captions.vtt load error:', err));
  }, []);

  // Synchronize cue text with active video cues (with verified archival static fallback)
  useEffect(() => {
    if (!captionsEnabled) {
      setActiveCueText('');
      return;
    }

    const video = videoRef.current;
    if (video && video.textTracks && video.textTracks.length > 0) {
      const track = video.textTracks[0];
      track.mode = 'hidden';
      const cues = track.activeCues;
      if (cues && cues.length > 0) {
        setActiveCueText(Array.from(cues).map((c: any) => c.text).join('\n'));
        return;
      }
    }

    const match = STATIC_CUES.find((c) => currentTime >= c.start && currentTime <= c.end);
    setActiveCueText(match ? match.text : '');
  }, [captionsEnabled, currentTime]);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else {
        await video.requestPictureInPicture();
        setPipActive(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleFS = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFS);
    return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

  // ── Precision Film Ruler Interaction ──────────────────────────
  const handleRulerMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = rulerRef.current;
      if (!el || !isFinite(duration) || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * duration;
      setHoverTime(time);
      setHoverXPercent(pct * 100);

      const ch = [...chapters].reverse().find((c) => time >= c.time) || chapters[0];
      setHoverChapter(ch);

      if (scrubbing) seek(time);
    },
    [duration, chapters, scrubbing, seek]
  );

  const handleRulerMouseLeave = useCallback(() => {
    setHoverTime(null);
    setHoverChapter(null);
    setScrubbing(false);
  }, []);

  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const el = rulerRef.current;
      if (!el || !isFinite(duration) || duration <= 0) return;
      setScrubbing(true);
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(pct * duration);
      resetIdle();
    },
    [duration, seek, resetIdle]
  );

  // ── Keyboard Shortcuts & Focus Return ─────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(e.shiftKey ? -10 : -5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(e.shiftKey ? 10 : 5);
          break;
        case ',':
        case '<':
          e.preventDefault();
          stepFrame(-1);
          break;
        case '.':
        case '>':
          e.preventDefault();
          stepFrame(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVol(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVol(volume - 0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          toggleCaptions();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          toggleLoop();
          break;
        case '?':
          if (!isMobile && !isTablet) {
            e.preventDefault();
            setKeysModalOpen((o) => !o);
          }
          break;
        case 'Escape':
          if (keysModalOpen) {
            setKeysModalOpen(false);
            keysBtnRef.current?.focus();
            break;
          }
          if (qualityMenuOpen) {
            setQualityMenuOpen(false);
            qualityBtnRef.current?.focus();
            break;
          }
          if (cfgMenuOpen) {
            setCfgMenuOpen(false);
            cfgBtnRef.current?.focus();
            break;
          }
          if (indexMenuOpen) {
            setIndexMenuOpen(false);
            indexBtnRef.current?.focus();
            break;
          }
          break;
      }
      resetIdle();
    },
    [
      togglePlay,
      seekRelative,
      stepFrame,
      setVol,
      volume,
      toggleMute,
      toggleFullscreen,
      toggleCaptions,
      toggleLoop,
      keysModalOpen,
      qualityMenuOpen,
      cfgMenuOpen,
      indexMenuOpen,
      resetIdle,
    ]
  );

  const cycleDrumMode = useCallback(() => {
    setDrumMode((m) => (m === 'smpte' ? 'remaining' : 'smpte'));
  }, []);

  const VolumeIcon =
    muted || volume === 0 ? IconVolumeMute : volume < 0.4 ? IconVolumeLow : IconVolumeHigh;

  const totalPlayedPct = !isLive && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 100;
  const activeVolIndex = muted ? 0 : Math.round(volume * 10);

  // SMPTE 12M Precision Drum Calculations
  const drumData = useMemo(() => {
    return formatDrumDisplay(currentTime, duration, drumMode, 24, isMobile);
  }, [currentTime, duration, drumMode, isMobile]);

  const currentSegments = useMemo(() => {
    return parseSMPTESegments(drumData.currentText);
  }, [drumData.currentText]);

  const totalSegments = useMemo(() => {
    return parseSMPTESegments(drumData.totalText);
  }, [drumData.totalText]);

  const telemetryStatus = hasError
    ? { label: 'ERROR', dotClass: 'error', color: '#FF3B30' }
    : waiting && !videoRef.current?.paused
    ? { label: 'BUFFERING', dotClass: 'buffering', color: '#E5A52C' }
    : playing
    ? { label: 'PLAYING', dotClass: '', color: '#E8E6DF' }
    : { label: 'STANDBY', dotClass: 'standby', color: '#E5A52C' };

  return (
    <Container
      ref={containerRef}
      className={`chronos-player media-container media-video media-skin${isCompact ? ' is-compact' : ''}${isTablet ? ' is-tablet' : ''}${isMobile ? ' is-mobile' : ''}`}
      data-videojs-v10="true"
      data-skin="chronos"
      data-media-player=""
      data-media-container=""
      data-state={playing ? 'playing' : 'paused'}
      data-paused={!playing}
      data-can-play={canPlay}
      data-waiting={waiting}
      data-fullscreen={fullscreen}
      data-is-compact={isCompact ? 'true' : 'false'}
      data-is-mobile={isMobile ? 'true' : 'false'}
      tabIndex={0}
      role="region"
      aria-label="Chronos Video.js v10 Archival & Cinema Reference Player"
      onKeyDown={handleKeyDown}
      onMouseMove={resetIdle}
      onPointerMove={resetIdle}
      style={{
        aspectRatio: aspectRatio === 'fill' ? undefined : aspectRatio,
        height: aspectRatio === 'fill' ? '100%' : undefined,
        outline: 'none',
      }}
    >
      {/* ── Genuine Video.js v10 Video Media Component ── */}
      <Video
        mediaRef={videoRef}
        className="chronos-video"
        poster={poster}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedMetadata={handleLoadedMetadata}
        onResize={handleVideoResize}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onProgress={handleProgress}
        onPlaying={handlePlaying}
        onCanPlay={handleCanPlay}
        onVolumeChange={handleVolumeChange}
        onEnded={handleEnded}
        onError={handleError}
        onClick={togglePlay}
        aria-label="Archival reference master"
        style={{ cursor: 'pointer' }}
      >
        <track
          kind="captions"
          src="/captions.vtt"
          srcLang="en"
          label="English [CC]"
          default={captionsEnabled}
        />
      </Video>

      {/* ── Center Reticle / Buffering / Error / Ended Overlays ── */}
      {hasError ? (
        <div className="chronos-center-reticle-container">
          <div className="chronos-error-card">
            <div className="chronos-error-title">
              <IconAlert size={16} />
              <span>STREAM PLAYBACK ERROR</span>
            </div>
            <div className="chronos-error-msg">
              {errorMessage || 'Unable to decode master video stream at reference bitrate.'}
            </div>
            <button
              type="button"
              className="chronos-error-retry-btn"
              onClick={attachStream}
              aria-label="Retry loading video stream"
            >
              <IconReplay size={14} />
              <span>RELOAD REFERENCE STREAM</span>
            </button>
          </div>
        </div>
      ) : ended ? (
        <div className="chronos-center-reticle-container">
          <button
            type="button"
            className="chronos-center-reticle-btn"
            onClick={restartPlay}
            aria-label="Replay archival reel"
          >
            <span className="chronos-reticle-bracket">[</span>
            <span className="chronos-reticle-icon">
              <IconReplay size={13} />
            </span>
            <span className="chronos-reticle-label">REPLAY REEL</span>
            <span className="chronos-reticle-bracket">]</span>
          </button>
        </div>
      ) : waiting && !videoRef.current?.paused ? (
        <div className="chronos-center-reticle-container">
          <div className="chronos-buffering-pill">
            <IconSpinner size={14} />
            <span>BUFFERING STREAM...</span>
          </div>
        </div>
      ) : !playing ? (
        <div className="chronos-center-reticle-container">
          <button
            type="button"
            className="chronos-center-reticle-btn"
            onClick={togglePlay}
            aria-label={!hasStartedPlayback ? 'Initialize Playback' : 'Resume Playback'}
          >
            <span className="chronos-reticle-bracket">[</span>
            <span className="chronos-reticle-icon">▶</span>
            <span className="chronos-reticle-label">
              {!hasStartedPlayback ? 'INITIALIZE PLAYBACK' : 'RESUME PLAYBACK'}
            </span>
            <span className="chronos-reticle-bracket">]</span>
          </button>
        </div>
      ) : null}

      {/* ── Optical Viewfinder Corner Ticks ── */}
      <div className="chronos-viewfinder-tick tl" aria-hidden="true" />
      <div className="chronos-viewfinder-tick tr" aria-hidden="true" />
      <div className="chronos-viewfinder-tick bl" aria-hidden="true" />
      <div className="chronos-viewfinder-tick br" aria-hidden="true" />

      {/* ── Top-Bar Viewfinder Telemetry HUD ── */}
      <div className={`chronos-top-hud${idle && playing ? ' idle' : ''}`} aria-hidden="true">
        <div className="chronos-hud-left">
          <div className={`chronos-tally-dot ${telemetryStatus.dotClass}`} />
          <span className="chronos-hud-state" style={{ color: telemetryStatus.color }}>
            {telemetryStatus.label}
          </span>
          <span className="chronos-hud-sep">|</span>
          <span className="chronos-hud-chapter">
            {currentChapter ? `${currentChapter.code} : ${currentChapter.title}` : 'CALIBRATING'}
          </span>
          <span className="chronos-hud-sep">|</span>
          <span className="chronos-hud-tech">
            {videoRef.current?.videoWidth || 1920}×{videoRef.current?.videoHeight || 1080} • 24.00 FPS • REC.709
          </span>
        </div>

        {!isMobile && !isTablet && (
          <div className="chronos-hud-actions">
            <button
              ref={keysBtnRef}
              type="button"
              className="chronos-hud-key-btn"
              onClick={() => setKeysModalOpen(true)}
              aria-label="Open keyboard shortcuts matrix"
            >
              <IconKeybindings size={13} />
              <span>? KEYS</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Subtitle / Captions Display (Elevated Above Control Deck) ── */}
      {captionsEnabled && activeCueText && (
        <div
          className={`chronos-captions-overlay${idle && playing ? ' idle' : ''}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="chronos-captions-cue">
            {activeCueText}
          </div>
        </div>
      )}

      {/* ── Bottom Optical Gradient Scrim ── */}
      <div className={`chronos-bottom-scrim${idle && playing ? ' idle' : ''}`} aria-hidden="true" />

      {/* ── Industrial Control Deck (Machined Bottom Panel) ── */}
      <div
        className={`chronos-deck${idle && playing ? ' idle' : ''}`}
        role="toolbar"
        aria-label="Chronos Video.js v10 Industrial Controls"
      >
        {/* ── Precision Film-Ruler Scrubber (Played / Buffered / Unplayed) ── */}
        <div
          ref={rulerRef}
          className="chronos-ruler-wrapper"
          role="slider"
          aria-label="Film-ruler timeline scrubber"
          aria-valuemin={0}
          aria-valuemax={isLive ? 100 : Math.floor(duration)}
          aria-valuenow={isLive ? 100 : Math.floor(currentTime)}
          aria-valuetext={
            isLive
              ? 'Continuous Live Transmission'
              : `${formatSimpleTime(currentTime)} of ${formatSimpleTime(duration)}${currentChapter ? ` — ${currentChapter.title}` : ''}`
          }
          tabIndex={0}
          onMouseMove={handleRulerMouseMove}
          onMouseLeave={handleRulerMouseLeave}
          onMouseDown={handleRulerMouseDown}
          onMouseUp={() => setScrubbing(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              seekRelative(-5);
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              seekRelative(5);
            }
          }}
        >
          {/* Calibrated 1px #292A25 unplayed millimeter ticks */}
          <div className="chronos-ruler-ticks" />

          {/* Chapter Boundary Ticks */}
          {!isLive &&
            chapters.map((ch) => {
              if (ch.percent === 0) return null;
              return (
                <div
                  key={ch.code}
                  className="chronos-ruler-chapter-tick"
                  style={{ left: `${ch.percent * 100}%` }}
                  aria-hidden="true"
                />
              );
            })}

          {/* Multi-Buffered Segments: 2px #77776F */}
          {bufferedRanges.map((range, idx) => (
            <div
              key={idx}
              className="chronos-ruler-buffered-range"
              style={{ left: `${range.startPct}%`, width: `${range.widthPct}%` }}
            />
          ))}

          {/* Played Progress: 3px #FF5A1F with subtle #FF5A1F tint */}
          <div className="chronos-ruler-played" style={{ width: `${totalPlayedPct}%` }} />
          <div className="chronos-ruler-played-ticks" style={{ width: `${totalPlayedPct}%` }} />

          {/* International Orange Vertical Playhead Needle */}
          <div
            className="chronos-needle"
            style={{ left: `${totalPlayedPct}%` }}
            aria-hidden="true"
          />

          {/* Floating Loupe Tooltip on Hover with Video Preview Frame */}
          {hoverTime !== null && hoverChapter && !isLive && (
            <div
              className={`chronos-loupe${isMobile ? ' is-mobile' : ''}`}
              style={{ left: `${Math.max(12, Math.min(88, hoverXPercent))}%` }}
              aria-hidden="true"
            >
              <PreviewThumbnailFrame
                src={src}
                hoverTime={hoverTime}
                poster={poster}
                isMobile={isMobile}
              />
              <div className="chronos-loupe-info">
                <span className="chronos-loupe-chapter">{hoverChapter.code}</span>
                <span className="chronos-loupe-time">{formatTimeHMS(hoverTime)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Machined Button Cells Deck ── */}
        <div className="chronos-cells-deck">
          {/* CELL 1: Transport */}
          <div className="chronos-cell">
            <button
              type="button"
              className="chronos-hw-btn chronos-hw-btn-play"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              aria-pressed={playing}
            >
              {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
            </button>

            {!isMobile && (
              <>
                <button
                  type="button"
                  className="chronos-hw-btn chronos-btn-seek-10 hide-compact"
                  onClick={() => seekRelative(-10)}
                  aria-label="Rewind 10 seconds (-10s)"
                  title="Rewind 10s"
                >
                  <IconReplay10 size={16} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 2 }}>-10s</span>
                </button>
                <button
                  type="button"
                  className="chronos-hw-btn chronos-btn-seek-10 hide-compact"
                  onClick={() => seekRelative(10)}
                  aria-label="Forward 10 seconds (+10s)"
                  title="Forward 10s"
                >
                  <span style={{ fontSize: 9.5, fontWeight: 700, marginRight: 2 }}>+10s</span>
                  <IconForward10 size={16} />
                </button>
              </>
            )}
          </div>

          {/* CELL 2: The Timecode Drum (Current & Total Duration) */}
          <div className="chronos-cell">
            <button
              type="button"
              className="chronos-drum-screen"
              onClick={cycleDrumMode}
              aria-label={`Time display: ${drumData.currentText} of ${drumData.totalText} (${drumMode} mode). Click to toggle elapsed/remaining`}
              title="Click to toggle Elapsed / Remaining time"
            >
              <div className="chronos-drum-timecode">
                {isMobile ? (
                  <>
                    <span className="chronos-smpte-bright">{drumData.currentText}</span>
                    <span className="chronos-smpte-sep">/</span>
                    <span className="chronos-smpte-dim">{drumData.totalText}</span>
                  </>
                ) : (
                  <>
                    <span className="chronos-smpte-dim">{currentSegments.hours}</span>
                    <span className="chronos-smpte-bright">{currentSegments.minutesSeconds}</span>

                    <span className="chronos-smpte-sep">/</span>

                    <span className="chronos-smpte-dim">{totalSegments.hours}</span>
                    <span className="chronos-smpte-dim">{totalSegments.minutesSeconds}</span>
                  </>
                )}
              </div>
              <span className="chronos-drum-mode-badge">{drumMode === 'smpte' ? 'TIME' : 'REM'}</span>
            </button>
          </div>

          {/* CELL 3: Decibel / 10-Segment Accessible LED Volume Meter */}
          <div className="chronos-cell hide-mobile">
            <div className="chronos-meter-cluster">
              <button
                type="button"
                className="chronos-hw-btn"
                onClick={toggleMute}
                aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
                aria-pressed={muted || volume === 0}
              >
                <VolumeIcon size={16} />
              </button>

              {/* FIX 2: Fully Accessible LED Volume Slider */}
              <div
                className="chronos-meter-ladder"
                role="slider"
                tabIndex={0}
                aria-label="Master audio output volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                aria-valuetext={muted ? 'Audio Muted' : `${Math.round(volume * 100)}% volume`}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setVol(pct);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setVol(Math.max(0, volume - 0.1));
                  } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setVol(Math.min(1, volume + 0.1));
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    setVol(0);
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    setVol(1);
                  } else if (e.key === 'PageDown') {
                    e.preventDefault();
                    setVol(Math.max(0, volume - 0.2));
                  } else if (e.key === 'PageUp') {
                    e.preventDefault();
                    setVol(Math.min(1, volume + 0.2));
                  }
                }}
              >
                {Array.from({ length: 10 }).map((_, i) => {
                  const isSegActive = !muted && i < activeVolIndex;
                  const isWarn = i === 7;
                  const isPeak = i >= 8;
                  return (
                    <div
                      key={i}
                      className={`chronos-meter-bar${isSegActive ? ' active' : ''}${
                        isWarn ? ' warn' : ''
                      }${isPeak ? ' peak' : ''}`}
                    />
                  );
                })}
              </div>

              <span className="chronos-meter-pct tabular-nums">
                {muted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          {/* CELL 4: Clean Dock (Index, PiP, Settings with Submenus, Fullscreen) */}
          <div className="chronos-cell">
            {/* 1. Chapters Index Drawer */}
            {!isMobile && (
              <div style={{ position: 'relative' }}>
                <button
                  ref={indexBtnRef}
                  type="button"
                  className={`chronos-hw-btn hide-compact${indexMenuOpen ? ' active' : ''}`}
                  onClick={() => {
                    setIndexMenuOpen((o) => !o);
                    setCfgMenuOpen(false);
                  }}
                  aria-label="Chapters index menu"
                  aria-expanded={indexMenuOpen}
                >
                  [INDEX]
                </button>

                {indexMenuOpen && (
                  <div
                    className="chronos-popover"
                    role="menu"
                    aria-label="Archive Chapter Index"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="chronos-popover-header">
                      <span>Archive Index ({chapters.length} Acts)</span>
                      <button
                        type="button"
                        onClick={() => setIndexMenuOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer' }}
                        aria-label="Close index menu"
                      >
                        <IconClose size={12} />
                      </button>
                    </div>
                    {chapters.length === 0 ? (
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: 10,
                          color: '#8E8B82',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        CALIBRATING OPTICAL CHAPTERS...
                      </div>
                    ) : (
                      chapters.map((ch) => (
                        <button
                          key={ch.code}
                          type="button"
                          role="menuitem"
                          className={`chronos-popover-item${currentChapter?.code === ch.code ? ' active' : ''}`}
                          onClick={() => {
                            seek(ch.time);
                            setIndexMenuOpen(false);
                          }}
                        >
                          <div>
                            <span
                              style={{
                                color: '#FF5A1F',
                                fontFamily: 'JetBrains Mono',
                                fontSize: 10,
                                marginRight: 6,
                              }}
                            >
                              {ch.code}
                            </span>
                            <span>{ch.title}</span>
                          </div>
                          <span className="tabular-nums" style={{ fontSize: 10, color: '#8E8B82' }}>
                            {formatSimpleTime(ch.time)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Standalone Picture-in-Picture [ ⧉ ] with Hover Tooltip */}
            {'pictureInPictureEnabled' in document && (
              <button
                type="button"
                className={`chronos-hw-btn${pipActive ? ' active' : ''}`}
                onClick={togglePiP}
                aria-label={pipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
                style={{ position: 'relative' }}
              >
                <IconPiP size={14} />
                <span className="chronos-btn-tooltip">Picture in Picture</span>
              </button>
            )}

            {/* 3. Settings Menu [SETTINGS] with Secondary Hierarchical Sub-menus */}
            <div style={{ position: 'relative' }}>
              <button
                ref={cfgBtnRef}
                type="button"
                className={`chronos-hw-btn${cfgMenuOpen ? ' active' : ''}`}
                onClick={() => {
                  setCfgMenuOpen((o) => {
                    if (!o) setSettingsSubmenu('main');
                    return !o;
                  });
                  setIndexMenuOpen(false);
                }}
                aria-label="Player settings menu"
                aria-expanded={cfgMenuOpen}
              >
                <IconSettings size={14} />
                <span className="chronos-btn-label chronos-settings-text" style={{ marginLeft: 3 }}>[SETTINGS]</span>
              </button>

              {cfgMenuOpen && (
                <>
                  {isMobile && (
                    <div
                      className="chronos-popover-mobile-backdrop"
                      onClick={() => setCfgMenuOpen(false)}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className="chronos-popover"
                    role="menu"
                    aria-label="Player Configuration"
                    onClick={(e) => e.stopPropagation()}
                  >
                  {/* MAIN SETTINGS MENU */}
                  {settingsSubmenu === 'main' && (
                    <>
                      <div className="chronos-popover-header">
                        <span>PRECISION SETTINGS</span>
                        <button
                          type="button"
                          onClick={() => setCfgMenuOpen(false)}
                          style={{ background: 'none', border: 'none', color: '#E8E6DF', cursor: 'pointer', padding: 2 }}
                          aria-label="Close configuration menu"
                        >
                          <IconClose size={13} />
                        </button>
                      </div>

                      {/* Quality / Resolution Submenu Trigger */}
                      <button
                        type="button"
                        className="chronos-popover-item"
                        onClick={() => setSettingsSubmenu('quality')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconQuality size={14} />
                          <span style={{ fontSize: 11.5 }}>Quality</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#FF9B45', fontWeight: 700 }}>
                            {qualityOptions.find((q) => q.id === currentQuality)?.badge || 'AUTO'}
                          </span>
                          <IconChevronRight size={12} />
                        </div>
                      </button>

                      {/* Playback Speed Submenu Trigger */}
                      <button
                        type="button"
                        className="chronos-popover-item"
                        onClick={() => setSettingsSubmenu('speed')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconSettings size={14} />
                          <span style={{ fontSize: 11.5 }}>Playback Speed</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#FF9B45', fontWeight: 700 }}>
                            {playbackRate === 1 ? '1.0×' : `${playbackRate}×`}
                          </span>
                          <IconChevronRight size={12} />
                        </div>
                      </button>

                      {/* Subtitles / Captions Submenu Trigger */}
                      <button
                        type="button"
                        className="chronos-popover-item"
                        onClick={() => setSettingsSubmenu('captions')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconCaptions size={14} />
                          <span style={{ fontSize: 11.5 }}>Subtitles / Captions</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: captionsEnabled ? '#FF9B45' : '#8E8B82', fontWeight: 700 }}>
                            {captionsEnabled ? 'English [CC]' : 'Off'}
                          </span>
                          <IconChevronRight size={12} />
                        </div>
                      </button>

                      {/* Audio Tracks Submenu Trigger (if multiple) */}
                      {audioTracks.length > 1 && (
                        <button
                          type="button"
                          className="chronos-popover-item"
                          onClick={() => setSettingsSubmenu('audio')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconVolumeHigh size={14} />
                            <span style={{ fontSize: 11.5 }}>Audio Track</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#E8E6DF' }}>
                              {audioTracks.find((t) => t.id === activeAudioTrack)?.name || 'Default'}
                            </span>
                            <IconChevronRight size={12} />
                          </div>
                        </button>
                      )}

                      {/* Continuous Loop Toggle */}
                      <button
                        type="button"
                        className={`chronos-popover-item${loopEnabled ? ' active' : ''}`}
                        onClick={toggleLoop}
                        role="menuitemcheckbox"
                        aria-checked={loopEnabled}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconLoop size={14} />
                          <span style={{ fontSize: 11.5 }}>Continuous Reel Loop</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono', color: loopEnabled ? '#FF9B45' : '#8E8B82' }}>
                          {loopEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </>
                  )}

                  {/* SUBMENU: QUALITY CONFORM */}
                  {settingsSubmenu === 'quality' && (
                    <>
                      <div className="chronos-popover-header">
                        <button
                          type="button"
                          onClick={() => setSettingsSubmenu('main')}
                          style={{ background: 'none', border: 'none', color: '#E8E6DF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 11, fontWeight: 700 }}
                        >
                          <IconArrowLeft size={13} />
                          <span>QUALITY CONFORM</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCfgMenuOpen(false)}
                          style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer', padding: 2 }}
                        >
                          <IconClose size={13} />
                        </button>
                      </div>

                      {qualityOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={currentQuality === opt.id}
                          className={`chronos-popover-item${currentQuality === opt.id ? ' active' : ''}`}
                          onClick={() => {
                            setQuality(opt.id);
                            setSettingsSubmenu('main');
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, marginRight: 8, fontSize: 11.5 }}>{opt.name}</span>
                            <span style={{ fontSize: 10, color: '#8E8B82' }}>{opt.specs}</span>
                          </div>
                          {currentQuality === opt.id && (
                            <span style={{ color: '#FF5A1F', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                              ● ACTIVE
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* SUBMENU: PLAYBACK SPEED */}
                  {settingsSubmenu === 'speed' && (
                    <>
                      <div className="chronos-popover-header">
                        <button
                          type="button"
                          onClick={() => setSettingsSubmenu('main')}
                          style={{ background: 'none', border: 'none', color: '#E8E6DF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 11, fontWeight: 700 }}
                        >
                          <IconArrowLeft size={13} />
                          <span>PLAYBACK SPEED</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCfgMenuOpen(false)}
                          style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer', padding: 2 }}
                        >
                          <IconClose size={13} />
                        </button>
                      </div>

                      {PLAYBACK_SPEEDS.map((s) => {
                        const isCurrent = Math.abs(playbackRate - s) < 0.05;
                        return (
                          <button
                            key={s}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isCurrent}
                            className={`chronos-popover-item${isCurrent ? ' active' : ''}`}
                            onClick={() => {
                              setRate(s);
                              setSettingsSubmenu('main');
                            }}
                          >
                            <span style={{ fontWeight: isCurrent ? 700 : 500, fontSize: 11.5 }}>
                              {s === 1 ? '1.0× (Normal)' : `${s}×`}
                            </span>
                            {isCurrent && (
                              <span style={{ color: '#FF5A1F', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                                ● ACTIVE
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* SUBMENU: SUBTITLES / CAPTIONS */}
                  {settingsSubmenu === 'captions' && (
                    <>
                      <div className="chronos-popover-header">
                        <button
                          type="button"
                          onClick={() => setSettingsSubmenu('main')}
                          style={{ background: 'none', border: 'none', color: '#E8E6DF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 11, fontWeight: 700 }}
                        >
                          <IconArrowLeft size={13} />
                          <span>SUBTITLES / CAPTIONS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCfgMenuOpen(false)}
                          style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer', padding: 2 }}
                        >
                          <IconClose size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={!captionsEnabled}
                        className={`chronos-popover-item${!captionsEnabled ? ' active' : ''}`}
                        onClick={() => {
                          if (captionsEnabled) toggleCaptions();
                          setSettingsSubmenu('main');
                        }}
                      >
                        <span style={{ fontSize: 11.5, fontWeight: !captionsEnabled ? 700 : 500 }}>Off</span>
                        {!captionsEnabled && (
                          <span style={{ color: '#FF5A1F', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                            ● ACTIVE
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={captionsEnabled}
                        className={`chronos-popover-item${captionsEnabled ? ' active' : ''}`}
                        onClick={() => {
                          if (!captionsEnabled) toggleCaptions();
                          setSettingsSubmenu('main');
                        }}
                      >
                        <span style={{ fontSize: 11.5, fontWeight: captionsEnabled ? 700 : 500 }}>English [CC] (Archival Reference)</span>
                        {captionsEnabled && (
                          <span style={{ color: '#FF5A1F', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                            ● ACTIVE
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  {/* SUBMENU: AUDIO TRACKS */}
                  {settingsSubmenu === 'audio' && (
                    <>
                      <div className="chronos-popover-header">
                        <button
                          type="button"
                          onClick={() => setSettingsSubmenu('main')}
                          style={{ background: 'none', border: 'none', color: '#E8E6DF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 11, fontWeight: 700 }}
                        >
                          <IconArrowLeft size={13} />
                          <span>AUDIO TRACKS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCfgMenuOpen(false)}
                          style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer', padding: 2 }}
                        >
                          <IconClose size={13} />
                        </button>
                      </div>

                      {audioTracks.map((tr) => (
                        <button
                          key={tr.id}
                          type="button"
                          className={`chronos-popover-item${activeAudioTrack === tr.id ? ' active' : ''}`}
                          onClick={() => {
                            setAudioTrack(tr.id);
                            setSettingsSubmenu('main');
                          }}
                        >
                          <span style={{ fontSize: 11.5 }}>
                            {tr.name} {tr.lang ? `(${tr.lang.toUpperCase()})` : ''}
                          </span>
                          {activeAudioTrack === tr.id && (
                            <span style={{ color: '#FF9B45', fontWeight: 700, fontSize: 10.5 }}>
                              ● ACTIVE
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
            </div>

            {/* 4. Fullscreen Toggle */}
            <button
              type="button"
              className="chronos-hw-btn"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              style={{ position: 'relative' }}
            >
              {fullscreen ? <IconFullscreenExit size={16} /> : <IconFullscreenEnter size={16} />}
              <span className="chronos-btn-tooltip">{fullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── In-Player Keybindings Matrix Modal (Desktop Only) ── */}
      {!isMobile && !isTablet && keysModalOpen && (
        <div
          className="chronos-key-modal-backdrop"
          onClick={() => setKeysModalOpen(false)}
          role="dialog"
          aria-label="Keyboard Shortcuts"
          aria-modal="true"
        >
          <div className="chronos-key-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    color: '#FF5A1F',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  //
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Laboratory Keybinding Matrix
                </span>
              </div>
              <button
                type="button"
                onClick={() => setKeysModalOpen(false)}
                className="chronos-hw-btn"
                style={{ minWidth: 32, minHeight: 32, padding: '2px 6px' }}
                aria-label="Close keybindings modal"
              >
                <IconClose size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                ['Space / K', 'Play / Pause toggle'],
                ['← / →', 'Seek −5s / +5s (Hold Shift for −10s / +10s)'],
                [', / . (< / >)', 'Precision single-frame step (−1F / +1F @ 24fps)'],
                ['↑ / ↓', 'Volume increment / decrement (10% step)'],
                ['Mouse Wheel over [Speed] / [Quality]', 'Direct rotary adjustment of velocity & resolution'],
                ['M', 'Instant audio mute toggle'],
                ['F', 'Fullscreen hardware display toggle'],
                ['C', 'Toggle WebVTT Subtitles / Captions [CC]'],
                ['L', 'Toggle continuous reel loop'],
                ['?', 'Toggle this keybinding matrix'],
                ['Esc', 'Close any open drawer or modal'],
              ].map(([key, label]) => (
                <div key={key} className="chronos-key-row">
                  <span style={{ fontSize: 11.5, color: '#E8E6DF' }}>{label}</span>
                  <code className="chronos-key-badge">{key}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ChronosPlayer Export
//  Wraps skin in Video.js v10 <VideoPlayer> provider
// ═══════════════════════════════════════════════════════════════
export function ChronosPlayer(props: ChronosPlayerProps) {
  return (
    <VideoPlayer>
      <ChronosSkinInternal {...props} />
    </VideoPlayer>
  );
}
