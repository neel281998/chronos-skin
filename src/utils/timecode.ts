// ═══════════════════════════════════════════════════════════════
//  STUDIO CHRONOS — SMPTE Precision Timecode Utility
//  Frame-accurate calculations for film & video archival
//  License: Apache-2.0
// ═══════════════════════════════════════════════════════════════

export type SupportedFPS = 23.976 | 24 | 25 | 29.97 | 30 | 60;
export type DrumMode = 'smpte' | 'remaining' | 'frames';

const pad2 = (n: number) => String(Math.floor(Math.max(0, n))).padStart(2, '0');
const pad6 = (n: number) => String(Math.floor(Math.max(0, n))).padStart(6, '0');

/**
 * Format seconds to SMPTE timecode string (HH:MM:SS:FF or HH:MM:SS;FF)
 */
export function formatSMPTE(seconds: number, fps: SupportedFPS = 24, dropFrame = false): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '--:--:--:--';
  }

  const roundedFps = Math.round(fps);
  const totalFrames = Math.floor(seconds * fps);
  const ff = totalFrames % roundedFps;
  const totalSeconds = Math.floor(seconds);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  const sep = dropFrame ? ';' : ':';
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}${sep}${pad2(ff)}`;
}

/**
 * Format remaining SMPTE timecode (−HH:MM:SS:FF)
 */
export function formatRemainingSMPTE(
  currentTime: number,
  duration: number,
  fps: SupportedFPS = 24,
  dropFrame = false
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
  const totalFrames = Math.floor(seconds * fps);
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
 * Split an 8-digit SMPTE string into dimmed hours, active MM:SS, and dimmed frames
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
  const parts = clean.split(/[:;]/);

  if (parts.length === 4) {
    return {
      hours: `${isNegative ? '−' : ''}${parts[0]}:`,
      minutesSeconds: `${parts[1]}:${parts[2]}`,
      frames: `:${parts[3]}`,
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
 * Compute the complete drum screen text for desktop or mobile
 */
export function formatDrumDisplay(
  current: number,
  total: number,
  mode: DrumMode,
  fps: SupportedFPS = 24,
  isMobile = false
): { currentText: string; totalText: string; isLive: boolean } {
  const isLive = !isFinite(total) || total === Infinity;

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
    const fCur = Math.floor(current * fps);
    const fTot = Math.floor(total * fps);
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
