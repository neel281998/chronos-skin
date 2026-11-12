// ═══════════════════════════════════════════════════════════════
//  CHRONOS SKIN — icons.tsx
//  Bespoke 1.5px/1.75px optical industrial SVG iconography
//  Precision geometric strokes using currentColor
// ═══════════════════════════════════════════════════════════════
import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  'aria-hidden'?: boolean;
}

// ── Play / Pause ──────────────────────────────────────────────
export function IconPlay({ className = '', size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 4L16 10L6 16V4Z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ className = '', size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect x="5.5" y="4" width="3" height="12" fill="currentColor" rx="0.5" />
      <rect x="11.5" y="4" width="3" height="12" fill="currentColor" rx="0.5" />
    </svg>
  );
}

// ── Volume Icons ──────────────────────────────────────────────
export function IconVolumeHigh({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M4 7.5H7L11.5 4V16L7 12.5H4V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" fill="currentColor" fillOpacity="0.15" />
      <path d="M14 7C14.8 7.8 15.3 8.9 15.3 10C15.3 11.1 14.8 12.2 14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M16 5C17.4 6.4 18.3 8.1 18.3 10C18.3 11.9 17.4 13.6 16 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function IconVolumeLow({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M4 7.5H7L11.5 4V16L7 12.5H4V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" fill="currentColor" fillOpacity="0.15" />
      <path d="M14 7C14.8 7.8 15.3 8.9 15.3 10C15.3 11.1 14.8 12.2 14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function IconVolumeMute({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M4 7.5H7L11.5 4V16L7 12.5H4V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" fill="currentColor" fillOpacity="0.15" />
      <line x1="14" y1="7.5" x2="18" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <line x1="18" y1="7.5" x2="14" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

// ── Fullscreen Icons ──────────────────────────────────────────
export function IconFullscreenEnter({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M3 8V3H8M17 8V3H12M3 12V17H8M17 12V17H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function IconFullscreenExit({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M8 3V8H3M12 3V8H17M8 17V12H3M12 17V12H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

// ── Picture-in-Picture ────────────────────────────────────────
export function IconPiP({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="9.5" width="5.5" height="4.5" rx="0.5" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// ── Frame Stepping Micro-icons (-1f / +1f) ────────────────────
export function IconStepBack({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <line x1="3.5" y1="3" x2="3.5" y2="13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 3.5L5.5 8L12.5 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconStepForward({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <line x1="12.5" y1="3" x2="12.5" y2="13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 3.5L10.5 8L3.5 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

// ── Replay / Forward 10s Shuttle ──────────────────────────────
export function IconReplay10({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M4.5 7.5A6.5 6.5 0 1 1 3.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M4.5 3.5V7.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
      <text x="6" y="13" fontFamily="JetBrains Mono, monospace" fontSize="5.5" fontWeight="700" fill="currentColor">10</text>
    </svg>
  );
}

export function IconForward10({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M15.5 7.5A6.5 6.5 0 1 0 16.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M15.5 3.5V7.5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
      <text x="6" y="13" fontFamily="JetBrains Mono, monospace" fontSize="5.5" fontWeight="700" fill="currentColor">10</text>
    </svg>
  );
}

// ── Settings / Hardware Configuration [SETTINGS] ───────────────────
export function IconSettings({ className = '', size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="10" cy="10" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.8 2.5h2.4l.4 1.8 1.4.6 1.6-1 1.7 1.7-1 1.6.6 1.4 1.8.4v2.4l-1.8.4-.6 1.4 1 1.6-1.7 1.7-1.6-1-1.4.6-.4 1.8H8.8l-.4-1.8-1.4-.6-1.6 1-1.7-1.7 1-1.6-.6-1.4-1.8-.4V8.8l1.8-.4.6-1.4-1-1.6 1.7-1.7 1.6 1 1.4-.6.4-1.8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Quality / Resolution Conform [HD / QUAL] ──────────────────
export function IconQuality({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8V12M6 10H8.5M8.5 8V12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
      <path d="M11.5 8V12H13C14 12 14.5 11.2 14.5 10C14.5 8.8 14 8 13 8H11.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}

// ── Rotary Jog Wheel / Thumbwheel ─────────────────────────────
export function IconDial({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="3" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <line x1="17" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <line x1="10" y1="17" x2="10" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <line x1="3" y1="10" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

// ── Captions / Subtitles [CC] ─────────────────────────────────
export function IconCaptions({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 8.5C8 8 7 8 6.5 8.5C6 9 6 11 6.5 11.5C7 12 8 12 8.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M13.5 8.5C13 8 12 8 11.5 8.5C11 9 11 11 11.5 11.5C12 12 13 12 13.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

// ── Loop Toggle ───────────────────────────────────────────────
export function IconLoop({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M14 6H6C4.34 6 3 7.34 3 9C3 10.66 4.34 12 6 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M6 14H14C15.66 14 17 12.66 17 11C17 9.34 15.66 8 14 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M13 4L15.5 6L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M7 16L4.5 14L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

// ── Replay Master ─────────────────────────────────────────────
export function IconReplay({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M4.5 7.5A6.5 6.5 0 1 1 3.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M4.5 3.5V7.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

// ── Spinner / Waiting ─────────────────────────────────────────
export function IconSpinner({ className = '', size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`chronos-spin ${className}`}
    >
      <circle cx="10" cy="10" r="7" stroke="rgba(244, 241, 234, 0.15)" strokeWidth="2" />
      <path d="M10 3A7 7 0 0 1 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

// ── Alert / Error ─────────────────────────────────────────────
export function IconAlert({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M10 3L18 17H2L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
      <line x1="10" y1="8" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="10" cy="14.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

// ── Keyboard / Help Modal ─────────────────────────────────────
export function IconKeybindings({ className = '', size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <rect x="2" y="3.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <line x1="4" y1="6" x2="5.5" y2="6" stroke="currentColor" strokeWidth="1.25" />
      <line x1="7.25" y1="6" x2="8.75" y2="6" stroke="currentColor" strokeWidth="1.25" />
      <line x1="10.5" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.25" />
      <line x1="4" y1="8" x2="5.5" y2="8" stroke="currentColor" strokeWidth="1.25" />
      <line x1="7.25" y1="8" x2="8.75" y2="8" stroke="currentColor" strokeWidth="1.25" />
      <line x1="10.5" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.25" />
      <line x1="5.5" y1="10" x2="10.5" y2="10" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

// ── Close / X ─────────────────────────────────────────────────
export function IconClose({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

// ── Navigation Chevrons ───────────────────────────────────────
export function IconArrowLeft({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M10 3.5L5.5 8L10 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function IconChevronRight({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}
