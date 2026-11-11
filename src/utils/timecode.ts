// ═══════════════════════════════════════════════════════════════
//  STUDIO CHRONOS — SMPTE Precision Timecode Utility
//  Frame-accurate calculations for film & video archival
//  SMPTE 12M Compliant (NDF & Drop-Frame)
//  License: Apache-2.0
// ═══════════════════════════════════════════════════════════════

export type SupportedFPS = 23.976 | 24 | 25 | 29.97 | 30 | 60;
export type DrumMode = 'smpte' | 'remaining' | 'frames';

const pad2 = (n: number) => String(Math.floor(Math.max(0, n))).padStart(2, '0');
const pad6 = (n: number) => String(Math.floor(Math.max(0, n))).padStart(6, '0');

/**
 * SMPTE 12M standard drop-frame calculation for 29.97 fps (30000/1001).
 * In 29.97 DF:
 * Frames 00 and 01 are dropped at the start of every minute EXCEPT minutes 00, 10, 20, 30, 40, 50.
 * A 10-minute block has 17,982 frames (18,000 - 18).
 * A regular minute has 1,798 frames (1,800 - 2).
 */
export function framesToSMPTEDropFrame(frameNumber: number): {
  hh: number;
  mm: number;
  ss: number;
  ff: number;
} {
  const safeFrames = Math.max(0, Math.floor(frameNumber));
  const framesPer10Minutes = 17982;
  const framesPerRegularMinute = 1798;
  const dropFrames = 2;

  const d = Math.floor(safeFrames / framesPer10Minutes);
  const m = safeFrames % framesPer10Minutes;

  let f = safeFrames + 18 * d;
  if (m >= 1800) {
    f += dropFrames * (Math.floor((m - 1800) / framesPerRegularMinute) + 1);
  }

  const ff = f % 30;
  const ss = Math.floor(f / 30) % 60;
  const mm = Math.floor(f / 1800) % 60;
  const hh = Math.floor(f / 108000);

  return { hh, mm, ss, ff };
}

/**
 * Non-drop-frame calculation with exact frame rollover for 24, 25, 30, 60, and 23.976 fps.
 */
export function framesToSMPTENonDropFrame(
  frameNumber: number,
  timebase: number
): {
  hh: number;
  mm: number;
  ss: number;
  ff: number;
} {
  const safeFrames = Math.max(0, Math.floor(frameNumber));
  const ff = safeFrames % timebase;
  const totalSeconds = Math.floor(safeFrames / timebase);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  return { hh, mm, ss, ff };
}

/**
 * Convert seconds into absolute frame count based on exact FPS cadence.
 */
export function secondsToFrameCount(seconds: number, fps: SupportedFPS = 24): number {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return 0;
  if (fps === 23.976) {
    // 24000 / 1001 exact
    return Math.floor(seconds * (24000 / 1001) + 0.000001);
  }
  if (fps === 29.97) {
    // 30000 / 1001 exact
    return Math.floor(seconds * (30000 / 1001) + 0.000001);
  }
  return Math.floor(seconds * fps + 0.000001);
}

/**
 * Format seconds to SMPTE timecode string (HH:MM:SS:FF or HH:MM:SS;FF)
 * Accurately supports 24, 25, 30, 60, 23.976, and 29.97 (with true SMPTE 12M drop-frame).
 */
export function formatSMPTE(seconds: number, fps: SupportedFPS = 24, dropFrame?: boolean): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '--:--:--:--';
  }

  const isDF = dropFrame !== undefined ? dropFrame : fps === 29.97;
  const totalFrames = secondsToFrameCount(seconds, fps);

  if (isDF) {
    const { hh, mm, ss, ff } = framesToSMPTEDropFrame(totalFrames);
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)};${pad2(ff)}`;
  }

  const timebase = fps === 23.976 ? 24 : Math.round(fps);
  const { hh, mm, ss, ff } = framesToSMPTENonDropFrame(totalFrames, timebase);
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
}

/**
 * Format remaining SMPTE timecode (−HH:MM:SS:FF or −HH:MM:SS;FF)
 */
export function formatRemainingSMPTE(
  currentTime: number,
  duration: number,
  fps: SupportedFPS = 24,
  dropFrame?: boolean
): string {
  if (!isFinite(duration) || isNaN(duration) || duration <= 0) {
    return '−--:--:--:--';
  }
  const remaining = Math.max(0, duration - currentTime);
  return `−${formatSMPTE(remaining, fps, dropFrame)}`;
}

/**
 * Format absolute frame count (F#000000)
 */
export function formatFrameCount(seconds: number, fps: SupportedFPS = 24): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return 'F#------';
  }
  const totalFrames = secondsToFrameCount(seconds, fps);
  return `F#${pad6(totalFrames)}`;
}

/**
 * Format simple MM:SS or HH:MM:SS for compact/mobile view
 */
export function formatSimpleTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '--:--';
  }
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  if (h > 0) {
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }
  return `${pad2(m)}:${pad2(s)}`;
}

/**
 * Split an 8-digit SMPTE string into dimmed hours, active MM:SS, and dimmed frames.
 * Respects both non-drop-frame (:) and drop-frame (;) frame delimiters.
 */
export interface SMPTESegments {
  hours: string;
  minutesSeconds: string;
  frames: string;
  isNegative?: boolean;
}

export function parseSMPTESegments(smpteStr: string): SMPTESegments {
  if (!smpteStr || smpteStr.includes('--')) {
    return { hours: '--:', minutesSeconds: '--:--', frames: ':--' };
  }
  const isNegative = smpteStr.startsWith('−') || smpteStr.startsWith('-');
  const clean = isNegative ? smpteStr.slice(1) : smpteStr;

  const match = clean.match(/^(\d{2}):(\d{2}):(\d{2})([:;])(\d{2})$/);
  if (match) {
    const [, hh, mm, ss, sep, ff] = match;
    return {
      hours: `${isNegative ? '−' : ''}${hh}:`,
      minutesSeconds: `${mm}:${ss}`,
      frames: `${sep}${ff}`,
      isNegative,
    };
  }

  const parts = clean.split(/[:;]/);
  if (parts.length === 4) {
    const sep = clean.includes(';') ? ';' : ':';
    return {
      hours: `${isNegative ? '−' : ''}${parts[0]}:`,
      minutesSeconds: `${parts[1]}:${parts[2]}`,
      frames: `${sep}${parts[3]}`,
      isNegative,
    };
  }

  return {
    hours: '',
    minutesSeconds: clean,
    frames: '',
    isNegative,
  };
}

/**
 * Compute the complete drum screen text for desktop or mobile.
 * Accurately handles live streams (where total duration is Infinity or unknown).
 */
export function formatDrumDisplay(
  current: number,
  total: number,
  mode: DrumMode,
  fps: SupportedFPS = 24,
  isMobile = false
): { currentText: string; totalText: string; isLive: boolean } {
  const isLive = !isFinite(total) || total === Infinity || total <= 0;

  if (isLive) {
    return {
      currentText: isMobile ? formatSimpleTime(current) : formatSMPTE(current, fps),
      totalText: '[LIVE]',
      isLive: true,
    };
  }

  if (isMobile) {
    if (mode === 'smpte') {
      return {
        currentText: formatSimpleTime(current),
        totalText: formatSimpleTime(total),
        isLive: false,
      };
    }
    if (mode === 'remaining') {
      const rem = Math.max(0, total - current);
      return {
        currentText: `−${formatSimpleTime(rem)}`,
        totalText: formatSimpleTime(total),
        isLive: false,
      };
    }
    // frames mode mobile
    const fCur = secondsToFrameCount(current, fps);
    const fTot = secondsToFrameCount(total, fps);
    return {
      currentText: `F#${fCur}`,
      totalText: `${fTot}`,
      isLive: false,
    };
  }

  // Desktop modes (full 8-digit SMPTE + total duration)
  if (mode === 'smpte') {
    return {
      currentText: formatSMPTE(current, fps),
      totalText: formatSMPTE(total, fps),
      isLive: false,
    };
  }

  if (mode === 'remaining') {
    return {
      currentText: formatRemainingSMPTE(current, total, fps),
      totalText: formatSMPTE(total, fps),
      isLive: false,
    };
  }

  // Frames mode
  return {
    currentText: formatFrameCount(current, fps),
    totalText: formatFrameCount(total, fps),
    isLive: false,
  };
}
