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

export interface ChronosPlayerProps {
  src: string;
  poster?: string;
  autoCueTime?: number;
  aspectRatio?: '16/9' | '21/9' | '4/3' | 'fill';
  onTimeUpdate?: (time: number) => void;
  onMetadataLoaded?: (meta: VideoMetadata) => void;
  containerWidth?: number;
}

// Standard Archival Quality Presets
const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [
  { id: -1, name: 'AUTO', badge: 'AUTO', specs: 'Adaptive Dynamic Bitrate', height: 1080 },
  { id: 0, name: '1080p Master', badge: '1080p', specs: '1920×1080 · 4.8 Mbps · Rec.709', height: 1080 },
  { id: 1, name: '720p HD', badge: '720p', specs: '1280×720 · 2.4 Mbps', height: 720 },
  { id: 2, name: '480p SD', badge: '480p', specs: '854×480 · 1.2 Mbps', height: 480 },
  { id: 3, name: '360p Proxy', badge: '360p', specs: '640×360 · 650 kbps', height: 360 },
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

  // Ribs offset in pixels: shifts knurling ribs proportionally
  const ribsOffset = Math.round((playbackRate - 1.0) * 160);

  // Scroll wheel on the rotary drum
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.max(0.25, Math.min(3.0, Math.round((playbackRate + delta) * 20) / 20));
    onRateChange(next);
  };

  // Pointer drag on the rotary drum
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

      {/* 3D Knurled Cylindrical Drum (Wheel Scroll + Drag Supported) */}
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
        {/* Moving Knurled Graduation Ribs */}
        <div
          className="chronos-rotary-ribs"
          style={{ transform: `translateX(${ribsOffset}px)` }}
        />

        {/* Center Optical Hairline Needle with Arrow Reticles */}
        <div className="chronos-rotary-needle" aria-hidden="true" />
      </div>

      {/* Preset Detent Buttons */}
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

  // ── Live Video Media State ───────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(634); // Default 10:34 until loaded
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [volume, setVolume] = useState(0.8); // 80% default
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

  // Quality & Resolution Levels State
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>(DEFAULT_QUALITY_OPTIONS);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [audioTracksCount, setAudioTracksCount] = useState(1);

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

  const isLive = !isFinite(duration) || duration === Infinity;

  // Dynamic chapters synced to real duration
  const chapters = useMemo(() => getDynamicChapters(duration), [duration]);

  const currentChapter = useMemo(() => {
    return (
      [...chapters].reverse().find((c) => currentTime >= c.time) || chapters[0]
    );
  }, [chapters, currentTime]);

  // Mobile viewport detection
  useEffect(() => {
    const checkMobile = () => {
      const width = containerWidth ?? window.innerWidth;
      setIsMobile(width <= 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [containerWidth]);

  // Current Quality Label displayed on the dock
  const currentQualityLabel = useMemo(() => {
    const match = qualityOptions.find((q) => q.id === currentQuality);
    if (!match || match.id === -1) {
      // If Auto, show AUTO or detected resolution if known
      const video = videoRef.current;
      const h = video?.videoHeight;
      return h && h >= 1080 ? 'AUTO · 1080p' : h && h >= 720 ? 'AUTO · 720p' : 'AUTO';
    }
    return match.badge;
  }, [qualityOptions, currentQuality]);

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

  // ── Stream Ingest & HLS Connection ───────────────────────────
  const attachStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasError(false);
    setErrorMessage('');
    setEnded(false);

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    if (src.includes('.m3u8')) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
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
            if (data.levels && data.levels.length > 0) {
              const opts: QualityOption[] = [
                { id: -1, name: 'AUTO', badge: 'AUTO', specs: 'Adaptive Dynamic Bitrate', height: 1080 },
                ...data.levels.map((lvl: any, idx: number) => ({
                  id: idx,
                  name: `${lvl.height || 720}p`,
                  badge: `${lvl.height || 720}p`,
                  specs: `${lvl.width || 1280}×${lvl.height || 720} · ${Math.round((lvl.bitrate || 0) / 1000)} kbps`,
                  height: lvl.height || 720,
                })),
              ];
              setQualityOptions(opts);
            }
            if (hls.audioTracks && hls.audioTracks.length > 0) {
              setAudioTracksCount(hls.audioTracks.length);
            }
          });

          hls.on(Hls.Events.ERROR, (_: any, errorData: any) => {
            if (errorData.fatal) {
              console.warn('[Chronos] HLS fatal playback error:', errorData.type);
              setHasError(true);
              setErrorMessage(`Stream network error: ${errorData.details}`);
            }
          });

          hlsRef.current = hls;
        }).catch((err) => {
          video.src = src;
          console.warn('[Chronos] HLS load fallback:', err);
        });
      }
    } else {
      video.src = src;
    }
  }, [src]);

  useEffect(() => {
    attachStream();
    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
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

  // ── Video Events Synchronization ──────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onTimeUpdate?.(video.currentTime);
    updateBufferedRanges();
  }, [onTimeUpdate, updateBufferedRanges]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || 634;
    setDuration(dur);
    setEnded(false);
    setHasError(false);

    // Auto-cue to specified frame or daylight timestamp
    if (autoCueTime !== undefined && autoCueTime > 0 && video.currentTime < autoCueTime) {
      video.currentTime = autoCueTime;
    }

    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;
    const resolution = `${width} × ${height} (${height >= 1080 ? '1080p Master' : '720p HD'})`;
    onMetadataLoaded?.({
      duration: dur,
      videoWidth: width,
      videoHeight: height,
      resolution,
    });
    updateBufferedRanges();
  }, [autoCueTime, onMetadataLoaded, updateBufferedRanges]);

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
      updateBufferedRanges();
    }
  }, [updateBufferedRanges]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
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
  }, []);

  const handleCanPlay = useCallback(() => {
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
      video.play().catch(() => {});
      return;
    }
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetIdle();
  }, [ended, resetIdle]);

  const restartPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setEnded(false);
    video.play().catch(() => {});
    resetIdle();
  }, [resetIdle]);

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
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

  // Keyboard step (SMPTE 24 fps)
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

  // Quick cycle speed through standard presets
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

  const setQuality = useCallback((levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setCurrentQuality(levelId);
  }, []);

  // Cycle quality using mouse wheel
  const cycleQuality = useCallback(
    (direction: 1 | -1) => {
      const curIdx = qualityOptions.findIndex((q) => q.id === currentQuality);
      const nextIdx = (curIdx + direction + qualityOptions.length) % qualityOptions.length;
      setQuality(qualityOptions[nextIdx].id);
    },
    [qualityOptions, currentQuality, setQuality]
  );

  const toggleLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = !video.loop;
    setLoopEnabled(video.loop);
  }, []);

  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    if (tracks && tracks.length > 0) {
      const next = !captionsEnabled;
      tracks[0].mode = next ? 'showing' : 'hidden';
      setCaptionsEnabled(next);
    }
  }, [captionsEnabled]);

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
      if (!el || !duration || isLive) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * duration;
      setHoverTime(time);
      setHoverXPercent(pct * 100);

      const ch = [...chapters].reverse().find((c) => time >= c.time) || chapters[0];
      setHoverChapter(ch);

      if (scrubbing) seek(time);
    },
    [duration, isLive, chapters, scrubbing, seek]
  );

  const handleRulerMouseLeave = useCallback(() => {
    setHoverTime(null);
    setHoverChapter(null);
    setScrubbing(false);
  }, []);

  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const el = rulerRef.current;
      if (!el || !duration || isLive) return;
      setScrubbing(true);
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(pct * duration);
      resetIdle();
    },
    [duration, isLive, seek, resetIdle]
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

  // Cycle timecode drum mode: smpte -> remaining -> frames
  const cycleDrumMode = useCallback(() => {
    setDrumMode((m) => (m === 'smpte' ? 'remaining' : m === 'remaining' ? 'frames' : 'smpte'));
  }, []);

  const VolumeIcon =
    muted || volume === 0 ? IconVolumeMute : volume < 0.4 ? IconVolumeLow : IconVolumeHigh;

  const totalPlayedPct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const activeVolIndex = muted ? 0 : Math.round(volume * 10);

  // Timecode drum string rendering
  const drumData = useMemo(() => {
    return formatDrumDisplay(currentTime, duration, drumMode, 24, isMobile);
  }, [currentTime, duration, drumMode, isMobile]);

  const currentSegments = useMemo(() => {
    return parseSMPTESegments(drumData.currentText);
  }, [drumData.currentText]);

  const totalSegments = useMemo(() => {
    return parseSMPTESegments(drumData.totalText);
  }, [drumData.totalText]);

  // Telemetry status
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
      className="chronos-player media-container media-video media-skin"
      data-videojs-v10="true"
      data-skin="chronos"
      data-media-player=""
      data-media-container=""
      data-state={playing ? 'playing' : 'paused'}
      data-paused={!playing}
      data-can-play={canPlay}
      data-waiting={waiting}
      data-fullscreen={fullscreen}
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
            aria-label={currentTime === 0 ? 'Initialize Playback' : 'Resume Playback'}
          >
            <span className="chronos-reticle-bracket">[</span>
            <span className="chronos-reticle-icon">▶</span>
            <span className="chronos-reticle-label">
              {currentTime <= (autoCueTime || 1.5) ? 'INITIALIZE PLAYBACK' : 'RESUME PLAYBACK'}
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
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={`${formatSimpleTime(currentTime)} of ${formatSimpleTime(duration)} — ${currentChapter.title}`}
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
          {chapters.map((ch) => {
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
          {hoverTime !== null && hoverChapter && (
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
          {/* CELL 1: Transport (-1F / +1F removed as requested; clean shuttle) */}
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
                    {/* Current Timecode Segments with Dimmed Leading Hours and Frames */}
                    <span className="chronos-smpte-dim">{currentSegments.hours}</span>
                    <span className="chronos-smpte-bright">{currentSegments.minutesSeconds}</span>
                    <span className="chronos-smpte-dim">{currentSegments.frames}</span>

                    <span className="chronos-smpte-sep">/</span>

                    {/* Total Duration Segments */}
                    <span className="chronos-smpte-dim">{totalSegments.hours}</span>
                    <span className="chronos-smpte-dim">{totalSegments.minutesSeconds}</span>
                    <span className="chronos-smpte-dim">{totalSegments.frames}</span>
                  </>
                )}
              </div>
              <span className="chronos-drum-mode-badge">{drumMode}</span>
            </button>
          </div>

          {/* CELL 3: Decibel / 10-Segment Volume Meter */}
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

              {/* 10-Segment Discrete LED Ladder */}
              <div
                className="chronos-meter-ladder"
                role="slider"
                aria-label="Volume level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setVol(pct);
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

          {/* CELL 4: Quality Settings, Velocity Wheel, Auxiliary Triggers */}
          <div className="chronos-cell">
            {/* 1. Quality Settings Selector Button [1080p HD] */}
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
                </div>
              )}
            </div>

            {/* 2. Speed Quick Cycle Button (Also responds to Mouse Wheel) */}
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

            {/* 3. Chapters Index Drawer */}
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

            {/* 4. Industrial Settings Menu [CFG] with Hardware Rotary Wheel */}
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

                  {/* ── TACTILE ROTARY VELOCITY WHEEL (Image 2 Wheel Overhaul) ── */}
                  <HardwareVelocityWheel
                    playbackRate={playbackRate}
                    onRateChange={setRate}
                  />

                  {/* Quality Settings in Menu */}
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

                  {/* Audio Stream Info */}
                  <div
                    style={{
                      padding: '6px 8px',
                      fontSize: 10,
                      color: '#8E8B82',
                      fontFamily: 'JetBrains Mono',
                      borderTop: '1px solid rgba(244,241,234,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>AUDIO MONITOR</span>
                    <span style={{ color: '#E8E6DF' }}>
                      {audioTracksCount > 1 ? `${audioTracksCount} Tracks Available` : 'Stereo 48.0kHz 24-bit'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Fullscreen Toggle */}
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
