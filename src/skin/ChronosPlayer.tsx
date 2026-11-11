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
} from './icons';
import { getDynamicChapters, type DynamicChapter } from '../config';
import {
  formatSMPTE,
  formatRemainingSMPTE,
  formatFrameCount,
  formatSimpleTime,
  parseSMPTESegments,
  formatDrumDisplay,
  type DrumMode,
} from '../utils/timecode';

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
//  Tactile Hardware Rotary Velocity Wheel Component
//  Knurled cylindrical thumbwheel with wheel scroll & drag
// ═══════════════════════════════════════════════════════════════
interface HardwareVelocityWheelProps {
  playbackRate: number;
  onRateChange: (rate: number) => void;
}

function HardwareVelocityWheel({ playbackRate, onRateChange }: HardwareVelocityWheelProps) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startRate = useRef(playbackRate);

  const ribsOffset = Math.round((playbackRate - 1.0) * 160);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.max(0.25, Math.min(3.0, Math.round((playbackRate + delta) * 20) / 20));
    onRateChange(next);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startRate.current = playbackRate;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = moveEv.clientX - startX.current;
      const deltaRate = dx / 160;
      const next = Math.max(0.25, Math.min(3.0, Math.round((startRate.current + deltaRate) * 20) / 20));
      onRateChange(next);
    };

    const onPointerUp = () => {
      isDragging.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const nudge = (delta: number) => {
    const next = Math.max(0.25, Math.min(3.0, Math.round((playbackRate + delta) * 20) / 20));
    onRateChange(next);
  };

  return (
    <div className="chronos-rotary-wheel-container">
      <div className="chronos-rotary-header">
        <span className="chronos-rotary-label">ROTARY VELOCITY DRUM</span>
        <div className="chronos-rotary-controls">
          <button
            type="button"
            className="chronos-rotary-nudge-btn"
            onClick={() => nudge(-0.05)}
            title="Step down 0.05x"
            aria-label="Decrease velocity"
          >
            −
          </button>
          <span className="chronos-rotary-value tabular-nums">
            {playbackRate.toFixed(2)}×
          </span>
          <button
            type="button"
            className="chronos-rotary-nudge-btn"
            onClick={() => nudge(0.05)}
            title="Step up 0.05x"
            aria-label="Increase velocity"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="chronos-rotary-drum"
        role="slider"
        aria-label="Tactile playback velocity jog wheel"
        aria-valuemin={0.25}
        aria-valuemax={3.0}
        aria-valuenow={playbackRate}
        aria-valuetext={`${playbackRate.toFixed(2)}x playback velocity`}
        tabIndex={0}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(-0.05);
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            nudge(0.05);
          }
        }}
      >
        <div
          className="chronos-rotary-ribs"
          style={{ transform: `translateX(${ribsOffset}px)` }}
        />
        <div className="chronos-rotary-needle" aria-hidden="true" />
      </div>

      <div className="chronos-rotary-presets">
        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((r) => (
          <button
            key={r}
            type="button"
            className={`chronos-rotary-preset-btn${playbackRate === r ? ' active' : ''}`}
            onClick={() => onRateChange(r)}
          >
            {r === 1.0 ? '1.0×' : `${r}×`}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [indexMenuOpen, setIndexMenuOpen] = useState(false);
  const [keysModalOpen, setKeysModalOpen] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hover & Scrubbing State
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverXPercent, setHoverXPercent] = useState(0);
  const [hoverChapter, setHoverChapter] = useState<DynamicChapter | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const isLive = !isFinite(duration) || duration === Infinity || duration <= 0;

  // Dynamic chapters synced to real duration
  const chapters = useMemo(() => getDynamicChapters(duration), [duration]);

  const currentChapter = useMemo(() => {
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

    // Auto-cue to specified frame or daylight timestamp
    if (autoCueTime !== undefined && autoCueTime > 0 && video.currentTime < autoCueTime) {
      try {
        video.currentTime = autoCueTime;
        setCurrentTime(autoCueTime);
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
  }, [autoCueTime, src, onMetadataLoaded, updateBufferedRanges]);

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
      const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const curIdx = SPEEDS.findIndex((s) => Math.abs(s - playbackRate) < 0.05);
      const nextIdx =
        curIdx === -1
          ? 2
          : (curIdx + direction + SPEEDS.length) % SPEEDS.length;
      setRate(SPEEDS[nextIdx]);
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
          e.preventDefault();
          setKeysModalOpen((o) => !o);
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
    setDrumMode((m) => (m === 'smpte' ? 'remaining' : m === 'remaining' ? 'frames' : 'smpte'));
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
      className={`chronos-player media-container media-video media-skin${isMobile ? ' is-mobile' : ''}`}
      data-videojs-v10="true"
      data-skin="chronos"
      data-media-player=""
      data-media-container=""
      data-state={playing ? 'playing' : 'paused'}
      data-paused={!playing}
      data-can-play={canPlay}
      data-waiting={waiting}
      data-fullscreen={fullscreen}
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
            {currentChapter.code} : {currentChapter.title}
          </span>
          <span className="chronos-hud-sep">|</span>
          <span className="chronos-hud-tech">
            {videoRef.current?.videoWidth || 1920}×{videoRef.current?.videoHeight || 1080} • 24.00 FPS • REC.709
          </span>
        </div>

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
              : `${formatSimpleTime(currentTime)} of ${formatSimpleTime(duration)} — ${currentChapter.title}`
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
                  key={ch.time}
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

          {/* Floating Loupe Tooltip on Hover */}
          {hoverTime !== null && hoverChapter && !isLive && (
            <div
              className="chronos-loupe"
              style={{ left: `${Math.max(8, Math.min(92, hoverXPercent))}%` }}
              aria-hidden="true"
            >
              <span className="chronos-loupe-chapter">{hoverChapter.code}</span>
              <span className="chronos-loupe-time">{formatSMPTE(hoverTime)}</span>
              <span className="chronos-loupe-frames">F#{Math.floor(hoverTime * 24)}</span>
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
                  className="chronos-hw-btn"
                  onClick={() => seekRelative(-10)}
                  aria-label="Rewind 10 seconds (-10s)"
                  title="Rewind 10s"
                >
                  <IconReplay10 size={16} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 2 }}>-10s</span>
                </button>
                <button
                  type="button"
                  className="chronos-hw-btn"
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
              aria-label={`Time display: ${drumData.currentText} of ${drumData.totalText} (${drumMode} mode). Click to cycle mode`}
              title="Click to cycle SMPTE / Remaining / Frames"
            >
              <div className="chronos-drum-timecode">
                {drumMode === 'frames' || isMobile ? (
                  <>
                    <span className="chronos-smpte-bright">{drumData.currentText}</span>
                    <span className="chronos-smpte-sep">/</span>
                    <span className="chronos-smpte-dim">{drumData.totalText}</span>
                  </>
                ) : (
                  <>
                    <span className="chronos-smpte-dim">{currentSegments.hours}</span>
                    <span className="chronos-smpte-bright">{currentSegments.minutesSeconds}</span>
                    <span className="chronos-smpte-dim">{currentSegments.frames}</span>

                    <span className="chronos-smpte-sep">/</span>

                    <span className="chronos-smpte-dim">{totalSegments.hours}</span>
                    <span className="chronos-smpte-dim">{totalSegments.minutesSeconds}</span>
                    <span className="chronos-smpte-dim">{totalSegments.frames}</span>
                  </>
                )}
              </div>
              <span className="chronos-drum-mode-badge">{drumMode}</span>
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

          {/* CELL 4: Quality, Speed, Index, Dedicated CC, CFG, Fullscreen */}
          <div className="chronos-cell">
            {/* 1. Genuine Quality Settings Selector Button */}
            <div style={{ position: 'relative' }}>
              <button
                ref={qualityBtnRef}
                type="button"
                className={`chronos-hw-btn${qualityMenuOpen ? ' active' : ''}`}
                onClick={() => {
                  setQualityMenuOpen((o) => !o);
                  setCfgMenuOpen(false);
                  setIndexMenuOpen(false);
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  cycleQuality(e.deltaY > 0 ? 1 : -1);
                }}
                aria-label={`Resolution Conform: ${currentQualityLabel}. Click to open menu or scroll mouse wheel to cycle`}
                title="Click to open Quality menu or scroll mouse wheel to cycle"
                aria-expanded={qualityMenuOpen}
              >
                <IconQuality size={13} />
                <span style={{ marginLeft: 4, fontWeight: 700 }}>
                  [{currentQualityLabel}]
                </span>
              </button>

              {qualityMenuOpen && (
                <div
                  className="chronos-popover"
                  role="menu"
                  aria-label="Quality and Resolution Conform"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="chronos-popover-header">
                    <span>Raster &amp; Quality Conform</span>
                    <button
                      type="button"
                      onClick={() => setQualityMenuOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer' }}
                      aria-label="Close quality menu"
                    >
                      <IconClose size={12} />
                    </button>
                  </div>

                  {isAdaptiveHls && qualityOptions.length > 1 ? (
                    <>
                      <div
                        style={{
                          padding: '4px 8px',
                          fontSize: 9.5,
                          color: '#FF5A1F',
                          fontFamily: 'JetBrains Mono',
                          background: 'rgba(255, 90, 31, 0.08)',
                          borderRadius: 2,
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>[ WHEEL OVER BUTTON TO QUICK-CYCLE ]</span>
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
                            setQualityMenuOpen(false);
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, marginRight: 8 }}>{opt.name}</span>
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
                  ) : (
                    <div style={{ padding: '8px 10px', fontSize: 11, color: '#8E8B82', lineHeight: 1.5 }}>
                      <div style={{ color: '#E8E6DF', fontWeight: 600, marginBottom: 4 }}>
                        {src.includes('.m3u8') ? 'Adaptive Native Stream' : 'Progressive Fixed Media'}
                      </div>
                      <div>
                        {src.includes('.m3u8')
                          ? 'Media is delivered via system adaptive HLS. Quality is dynamically managed by the browser engine.'
                          : `Single resolution source (${videoRef.current?.videoWidth || 1920}×${videoRef.current?.videoHeight || 1080}). Resolution conform switching is not applicable.`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Speed Quick Cycle Button */}
            {!isMobile && (
              <button
                ref={speedBtnRef}
                type="button"
                className="chronos-hw-btn"
                onClick={() => cycleSpeed(1)}
                onWheel={(e) => {
                  e.preventDefault();
                  cycleSpeed(e.deltaY > 0 ? -1 : 1);
                }}
                aria-label={`Playback speed: ${playbackRate}x. Click to cycle or scroll mouse wheel to adjust`}
                title="Click to cycle or scroll mouse wheel to adjust speed"
              >
                [{playbackRate === 1 ? '1.0×' : `${playbackRate.toFixed(2).replace(/\.00$/, '')}×`}]
              </button>
            )}

            {/* 3. Chapters Index Drawer */}
            {!isMobile && (
              <div style={{ position: 'relative' }}>
                <button
                  ref={indexBtnRef}
                  type="button"
                  className={`chronos-hw-btn${indexMenuOpen ? ' active' : ''}`}
                  onClick={() => {
                    setIndexMenuOpen((o) => !o);
                    setQualityMenuOpen(false);
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
                    {chapters.map((ch) => (
                      <button
                        key={ch.time}
                        type="button"
                        role="menuitem"
                        className={`chronos-popover-item${currentChapter.time === ch.time ? ' active' : ''}`}
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. FIX 6: Dedicated Subtitles / Captions Button [CC] */}
            <button
              ref={captionsBtnRef}
              type="button"
              className={`chronos-hw-btn${captionsEnabled ? ' active' : ''}`}
              onClick={toggleCaptions}
              aria-label={captionsEnabled ? 'Disable Subtitles [CC]' : 'Enable Subtitles [CC]'}
              title="Toggle Subtitles / Captions [CC] (C)"
              aria-pressed={captionsEnabled}
            >
              <IconCaptions size={14} />
              <span style={{ marginLeft: 3, fontWeight: 700 }}>[CC]</span>
            </button>

            {/* 5. Industrial Settings Menu [CFG] with Hardware Rotary Wheel & Audio Tracks */}
            <div style={{ position: 'relative' }}>
              <button
                ref={cfgBtnRef}
                type="button"
                className={`chronos-hw-btn${cfgMenuOpen ? ' active' : ''}`}
                onClick={() => {
                  setCfgMenuOpen((o) => !o);
                  setQualityMenuOpen(false);
                  setIndexMenuOpen(false);
                }}
                aria-label="Industrial configuration menu"
                aria-expanded={cfgMenuOpen}
              >
                <IconSettings size={14} />
                <span style={{ marginLeft: 3 }}>[CFG]</span>
              </button>

              {cfgMenuOpen && (
                <div
                  className="chronos-popover"
                  role="menu"
                  aria-label="Player Configuration"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="chronos-popover-header">
                    <span>Precision Configuration</span>
                    <button
                      type="button"
                      onClick={() => setCfgMenuOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#8E8B82', cursor: 'pointer' }}
                      aria-label="Close configuration menu"
                    >
                      <IconClose size={12} />
                    </button>
                  </div>

                  {/* Tactile Rotary Velocity Wheel */}
                  <HardwareVelocityWheel
                    playbackRate={playbackRate}
                    onRateChange={setRate}
                  />

                  {/* Quality Settings in Menu */}
                  {isAdaptiveHls && qualityOptions.length > 1 && (
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(244,241,234,0.06)' }}>
                      <div style={{ fontSize: 9.5, color: '#8E8B82', marginBottom: 4, fontFamily: 'JetBrains Mono' }}>
                        RESOLUTION CONFORM
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {qualityOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`chronos-hw-btn${currentQuality === opt.id ? ' active' : ''}`}
                            style={{ minWidth: 'auto', height: 24, fontSize: 9.5, padding: '0 6px' }}
                            onClick={() => setQuality(opt.id)}
                          >
                            {opt.badge}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FIX 4: Genuine Audio Track Selection */}
                  <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(244,241,234,0.06)' }}>
                    <div style={{ fontSize: 9.5, color: '#8E8B82', marginBottom: 4, fontFamily: 'JetBrains Mono' }}>
                      AUDIO MONITOR &amp; TRACKS
                    </div>
                    {audioTracks.length > 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {audioTracks.map((tr) => (
                          <button
                            key={tr.id}
                            type="button"
                            className={`chronos-popover-item${activeAudioTrack === tr.id ? ' active' : ''}`}
                            style={{ padding: '4px 6px', fontSize: 10 }}
                            onClick={() => setAudioTrack(tr.id)}
                          >
                            <span>
                              {tr.name} {tr.lang ? `(${tr.lang.toUpperCase()})` : ''}
                            </span>
                            {activeAudioTrack === tr.id && (
                              <span style={{ color: '#FF5A1F', fontWeight: 700, fontSize: 9.5 }}>
                                ● ACTIVE
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: '#E8E6DF', fontFamily: 'JetBrains Mono' }}>
                        {audioTracks.length === 1
                          ? `Primary Stereo Track (${audioTracks[0].name})`
                          : 'Stereo 48.0kHz 24-bit PCM / AAC'}
                      </div>
                    )}
                  </div>

                  {/* Subtitles / Captions Toggle */}
                  <button
                    type="button"
                    className={`chronos-popover-item${captionsEnabled ? ' active' : ''}`}
                    onClick={toggleCaptions}
                    role="menuitemcheckbox"
                    aria-checked={captionsEnabled}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconCaptions size={14} />
                      <span>Subtitles / Captions [CC]</span>
                    </div>
                    <span style={{ fontSize: 10, color: captionsEnabled ? '#FF5A1F' : '#8E8B82' }}>
                      {captionsEnabled ? 'ENGLISH' : 'OFF'}
                    </span>
                  </button>

                  {/* Loop Toggle */}
                  <button
                    type="button"
                    className={`chronos-popover-item${loopEnabled ? ' active' : ''}`}
                    onClick={toggleLoop}
                    role="menuitemcheckbox"
                    aria-checked={loopEnabled}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconLoop size={14} />
                      <span>Continuous Reel Loop</span>
                    </div>
                    <span style={{ fontSize: 10, color: loopEnabled ? '#FF5A1F' : '#8E8B82' }}>
                      {loopEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {/* Picture in Picture */}
                  {'pictureInPictureEnabled' in document && (
                    <button
                      type="button"
                      className={`chronos-popover-item${pipActive ? ' active' : ''}`}
                      onClick={togglePiP}
                      role="menuitem"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconPiP size={14} />
                        <span>Picture in Picture</span>
                      </div>
                      <span style={{ fontSize: 10, color: pipActive ? '#FF5A1F' : '#8E8B82' }}>
                        {pipActive ? 'ACTIVE' : 'POP OUT'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 6. Fullscreen Toggle */}
            <button
              type="button"
              className="chronos-hw-btn"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title="Fullscreen toggle (F)"
            >
              {fullscreen ? <IconFullscreenExit size={16} /> : <IconFullscreenEnter size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── In-Player Keybindings Matrix Modal ── */}
      {keysModalOpen && (
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
