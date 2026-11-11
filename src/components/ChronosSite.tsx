// ═══════════════════════════════════════════════════════════════
//  STUDIO CHRONOS — Archival Screening Room & Reference Suite
//  Video.js v10 Design Challenge Submission
//  License: Apache-2.0
// ═══════════════════════════════════════════════════════════════
import React, { useState, useCallback, useMemo } from 'react';
import { ChronosPlayer, type VideoMetadata } from '../skin/ChronosPlayer';
import {
  ARCHIVE_REELS,
  ARCHIVE_METADATA,
  getDynamicChapters,
  type ArchiveReel,
  type DynamicChapter,
} from '../config';

// ── Full 8-digit SMPTE Time Formatting (HH:MM:SS:FF) ─────────
function formatSMPTE8Parts(seconds: number, fps = 24): { hours: string; main: string; frames: string } {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return { hours: '00:', main: '00:00', frames: ':00' };
  }
  const totalFrames = Math.floor(seconds * fps);
  const ff = totalFrames % fps;
  const totalSeconds = Math.floor(seconds);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hours: `${pad(hh)}:`,
    main: `${pad(mm)}:${pad(ss)}`,
    frames: `:${pad(ff)}`,
  };
}

function formatDisplaySMPTE(seconds: number, fps = 24): string {
  const parts = formatSMPTE8Parts(seconds, fps);
  return `${parts.hours}${parts.main}${parts.frames}`;
}

type ViewMode = 'suite' | 'standalone';
type AspectRatioMode = '16/9' | '21/9' | '4/3' | 'fill';

export function ChronosSite() {
  // Mode: Archival Suite vs Standalone Skin Testbed
  const [viewMode, setViewMode] = useState<ViewMode>('suite');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('16/9');
  const [standaloneWidth, setStandaloneWidth] = useState<string>('100%');

  // Selected archival reel
  const [activeReel, setActiveReel] = useState<ArchiveReel>(ARCHIVE_REELS[0]);
  const [playerTime, setPlayerTime] = useState(0);

  // Live video metadata reported by loadedmetadata
  const [videoMeta, setVideoMeta] = useState<VideoMetadata>({
    duration: 634,
    videoWidth: 1920,
    videoHeight: 1080,
    resolution: '1920 × 1080 (1080p Master)',
  });

  const handleMetadataLoaded = useCallback((meta: VideoMetadata) => {
    setVideoMeta(meta);
  }, []);

  // Compute dynamic chapters synchronized to current video duration
  const dynamicChapters: DynamicChapter[] = useMemo(() => {
    return getDynamicChapters(videoMeta.duration);
  }, [videoMeta.duration]);

  // Active chapter based on playhead position
  const currentChapter = useMemo(() => {
    return (
      [...dynamicChapters].reverse().find((c) => playerTime >= c.time) ||
      dynamicChapters[0]
    );
  }, [dynamicChapters, playerTime]);

  // Seek video element to exact chapter time
  const handleSeekToChapter = useCallback((time: number) => {
    const videoEl = document.querySelector('.chronos-video') as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.currentTime = time;
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090A08',
        color: '#E8E6DF',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ════════════════════════════════════════════════════════
          EDITORIAL MASTHEAD (Dieter Rams / Swiss Typography)
          ════════════════════════════════════════════════════════ */}
      <header
        style={{
          borderBottom: '1px solid #292A25',
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: '#0D0E0C',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div
              style={{
                width: 10,
                height: 10,
                background: '#FF5A1F',
                borderRadius: 1,
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#E8E6DF',
              }}
            >
              Studio Chronos
            </h1>
            <span style={{ color: '#8E8B82', fontSize: 13 }}>/</span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: '#8E8B82',
                letterSpacing: '0.06em',
              }}
            >
              ARCH-2026-V10
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#8E8B82',
              letterSpacing: '0.02em',
            }}
          >
            Archival Screening Room &amp; Optical Reference Monitoring Suite — Built on Video.js v10
          </p>
        </div>

        {/* View Mode Toggle & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View Mode Switcher: Archival Suite vs Standalone Skin */}
          <div
            style={{
              display: 'inline-flex',
              background: '#10110F',
              border: '1px solid #292A25',
              borderRadius: 3,
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('suite')}
              style={{
                background: viewMode === 'suite' ? '#FF5A1F' : 'transparent',
                color: viewMode === 'suite' ? '#0A0A09' : '#8E8B82',
                border: 'none',
                borderRadius: 2,
                padding: '6px 12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ARCHIVAL SUITE
            </button>
            <button
              type="button"
              onClick={() => setViewMode('standalone')}
              style={{
                background: viewMode === 'standalone' ? '#FF5A1F' : 'transparent',
                color: viewMode === 'standalone' ? '#0A0A09' : '#8E8B82',
                border: 'none',
                borderRadius: 2,
                padding: '6px 12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              STANDALONE SKIN
            </button>
          </div>

          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '5px 10px',
              border: '1px solid rgba(255, 90, 31, 0.4)',
              background: 'rgba(255, 90, 31, 0.1)',
              color: '#FF5A1F',
              borderRadius: 2,
            }}
          >
            VIDEO.JS v10 NATIVE
          </span>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          STANDALONE SKIN TESTING RIG (WHEN IN STANDALONE MODE)
          ════════════════════════════════════════════════════════ */}
      {viewMode === 'standalone' ? (
        <section
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '24px 20px 48px',
          }}
        >
          {/* Standalone Control Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              background: '#10110F',
              border: '1px solid #292A25',
              borderRadius: 4,
              padding: '12px 18px',
              marginBottom: 20,
            }}
          >
            {/* Aspect Ratio Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#8E8B82', fontWeight: 700 }}>
                ASPECT RATIO:
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { label: '16:9 (Standard)', value: '16/9' },
                  { label: '21:9 (Cinema)', value: '21/9' },
                  { label: '4:3 (Academy)', value: '4/3' },
                ].map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    onClick={() => setAspectRatio(ar.value as AspectRatioMode)}
                    style={{
                      background: aspectRatio === ar.value ? 'rgba(255, 90, 31, 0.18)' : '#181916',
                      border: aspectRatio === ar.value ? '1px solid #FF5A1F' : '1px solid #292A25',
                      color: aspectRatio === ar.value ? '#FF5A1F' : '#8E8B82',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Container Width Preset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#8E8B82', fontWeight: 700 }}>
                CHASSIS WIDTH:
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {['100%', '1100px', '800px', '420px'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setStandaloneWidth(w)}
                    style={{
                      background: standaloneWidth === w ? 'rgba(255, 90, 31, 0.18)' : '#181916',
                      border: standaloneWidth === w ? '1px solid #FF5A1F' : '1px solid #292A25',
                      color: standaloneWidth === w ? '#FF5A1F' : '#8E8B82',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Reel Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#8E8B82', fontWeight: 700 }}>
                REEL:
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {ARCHIVE_REELS.map((reel) => (
                  <button
                    key={reel.id}
                    type="button"
                    onClick={() => setActiveReel(reel)}
                    style={{
                      background: activeReel.id === reel.id ? 'rgba(255, 90, 31, 0.18)' : '#181916',
                      border: activeReel.id === reel.id ? '1px solid #FF5A1F' : '1px solid #292A25',
                      color: activeReel.id === reel.id ? '#FF5A1F' : '#8E8B82',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                  >
                    {reel.reelNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Standalone Player Container */}
          <div
            style={{
              width: standaloneWidth,
              margin: '0 auto',
              transition: 'width 0.25s ease',
            }}
          >
            <ChronosPlayer
              src={activeReel.url}
              poster={activeReel.poster}
              autoCueTime={activeReel.autoCueTime}
              aspectRatio={aspectRatio}
              onTimeUpdate={setPlayerTime}
              onMetadataLoaded={handleMetadataLoaded}
            />
          </div>

          <div
            style={{
              marginTop: 20,
              padding: '12px 16px',
              background: '#10110F',
              border: '1px solid #292A25',
              borderRadius: 3,
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#8E8B82',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              STATUS: STANDALONE SKIN HARNESS ACTIVE · TESTING ISOLATED CONTROLS &amp; DOCK
            </span>
            <span style={{ color: '#FF5A1F' }}>
              CURRENT REEL: {activeReel.label} ({activeReel.specs})
            </span>
          </div>
        </section>
      ) : (
        /* ════════════════════════════════════════════════════════
            ARCHIVAL SUITE VIEW (FULL CURATED SCREENING ROOM)
            ════════════════════════════════════════════════════════ */
        <>
          {/* Primary Screening Frame */}
          <section
            style={{
              maxWidth: 1240,
              margin: '0 auto',
              padding: '28px 24px 0',
            }}
          >
            {/* Screening Frame Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                padding: '0 4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#FF5A1F',
                    letterSpacing: '0.08em',
                  }}
                >
                  // {activeReel.reelNumber}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E6DF' }}>
                  {activeReel.label}
                </span>
              </div>

              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10.5,
                  color: '#8E8B82',
                }}
              >
                {activeReel.specs}
              </div>
            </div>

            {/* ── THE CHRONOS VIDEO.JS v10 PLAYER ── */}
            <ChronosPlayer
              src={activeReel.url}
              poster={activeReel.poster}
              autoCueTime={activeReel.autoCueTime}
              aspectRatio="16/9"
              onTimeUpdate={setPlayerTime}
              onMetadataLoaded={handleMetadataLoaded}
            />
          </section>

          {/* Reference Footage Calibration Reels (03) */}
          <section
            style={{
              maxWidth: 1240,
              margin: '20px auto 0',
              padding: '0 24px',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#8E8B82',
                marginBottom: 8,
              }}
            >
              Reference Footage Calibration Reels (03)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 12,
              }}
            >
              {ARCHIVE_REELS.map((reel) => {
                const isSelected = activeReel.id === reel.id;

                return (
                  <button
                    key={reel.id}
                    type="button"
                    onClick={() => setActiveReel(reel)}
                    aria-pressed={isSelected}
                    style={{
                      background: isSelected ? '#121210' : '#0E0E0C',
                      border: isSelected ? '1px solid #FF5A1F' : '1px solid #222220',
                      borderRadius: 3,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 10,
                          fontWeight: 700,
                          color: isSelected ? '#FF5A1F' : '#8E8B82',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {reel.reelNumber}
                      </span>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 1,
                          background: isSelected ? '#FF5A1F' : 'rgba(244, 241, 234, 0.15)',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected ? '#E8E6DF' : '#CBC7BD',
                        marginBottom: 4,
                      }}
                    >
                      {reel.label}
                    </div>

                    <div style={{ fontSize: 11, color: '#8E8B82', lineHeight: 1.45, marginBottom: 8 }}>
                      {reel.description}
                    </div>

                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 9.5,
                        color: isSelected ? '#E5A52C' : '#5E5C56',
                      }}
                    >
                      {reel.specs}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Swiss Editorial Grid (Chapters Index & Preservation Ledger) */}
          <main
            style={{
              maxWidth: 1240,
              margin: '36px auto',
              padding: '0 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 24,
            }}
          >
            {/* LEFT: Chronometer Chapters Matrix (05 Acts) */}
            <section
              style={{
                background: '#0E0E0C',
                border: '1px solid #222220',
                borderRadius: 3,
                padding: '20px 22px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #222220',
                  paddingBottom: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#FF5A1F', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11 }}>
                    //
                  </span>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#E8E6DF',
                    }}
                  >
                    Chronometer Index (05 Acts)
                  </span>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8E8B82' }}>
                  SYNCED • 24 FPS
                </span>
              </div>

              <nav aria-label="Archive Chapter Ledger">
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {dynamicChapters.map((ch) => {
                    const isActive = currentChapter.time === ch.time;

                    return (
                      <li key={ch.time}>
                        <button
                          type="button"
                          onClick={() => handleSeekToChapter(ch.time)}
                          aria-current={isActive ? 'true' : undefined}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '10px 12px',
                            background: isActive ? '#141412' : 'transparent',
                            border: isActive ? '1px solid rgba(255, 90, 31, 0.4)' : '1px solid transparent',
                            borderRadius: 2,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#121210';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 11,
                              fontWeight: 700,
                              color: isActive ? '#FF5A1F' : '#8E8B82',
                              marginTop: 1,
                              flexShrink: 0,
                            }}
                          >
                            {String(ch.index).padStart(2, '0')}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: isActive ? '#E8E6DF' : '#CBC7BD',
                                marginBottom: 2,
                              }}
                            >
                              {ch.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#8E8B82', lineHeight: 1.4 }}>
                              {ch.description}
                            </div>
                          </div>

                          {(() => {
                            const smpte = formatSMPTE8Parts(ch.time);
                            return (
                              <div
                                style={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  fontSize: 11,
                                  flexShrink: 0,
                                  marginTop: 1,
                                  letterSpacing: '0.04em',
                                }}
                              >
                                <span style={{ color: '#8E8B82', opacity: 0.6 }}>{smpte.hours}</span>
                                <span style={{ color: isActive ? '#FF5A1F' : '#E8E6DF', fontWeight: 700 }}>
                                  {smpte.main}
                                </span>
                                <span style={{ color: '#8E8B82', opacity: 0.6 }}>{smpte.frames}</span>
                              </div>
                            );
                          })()}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </section>

            {/* RIGHT: Technical Preservation Ledger & Design Thinking */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Technical Specs Table */}
              <div
                style={{
                  background: '#0E0E0C',
                  border: '1px solid #222220',
                  borderRadius: 3,
                  padding: '20px 22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid #222220',
                    paddingBottom: 10,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: '#FF5A1F', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11 }}>
                    //
                  </span>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#E8E6DF',
                    }}
                  >
                    Technical Preservation Ledger
                  </span>
                </div>

                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 0', fontSize: 11 }}>
                  {[
                    ['Transfer Std.', ARCHIVE_METADATA.transferStandard],
                    ['Color Matrix', ARCHIVE_METADATA.colorMatrix],
                    ['Audio Encoding', ARCHIVE_METADATA.audioEncoding],
                    ['Raster Format', videoMeta.resolution],
                    ['Frame Cadence', '24.000 fps (Cine Exact)'],
                    ['Active Playhead', `${formatDisplaySMPTE(playerTime)} (F#${Math.floor(playerTime * 24)})`],
                    ['Core Engine', ARCHIVE_METADATA.engine],
                  ].map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt style={{ color: '#8E8B82', fontFamily: 'JetBrains Mono, monospace' }}>{k}</dt>
                      <dd style={{ margin: 0, color: '#E8E6DF', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        {v}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>

              {/* Design Rationale */}
              <div
                style={{
                  background: '#0E0E0C',
                  border: '1px solid #222220',
                  borderRadius: 3,
                  padding: '20px 22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid #222220',
                    paddingBottom: 10,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: '#FF5A1F', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11 }}>
                    //
                  </span>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#E8E6DF',
                    }}
                  >
                    Hardware Philosophy &amp; Design Rationale
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: '#8E8B82', lineHeight: 1.65 }}>
                  {ARCHIVE_METADATA.directorNotes}
                </p>
              </div>
            </section>
          </main>
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          EDITORIAL FOOTER (Swiss Archival Style)
          ════════════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: '1px solid #292A25',
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#5E5C56',
          background: '#0D0E0C',
        }}
      >
        <div>© 2026 STUDIO CHRONOS · OPEN ARCHIVAL INITIATIVE · APACHE-2.0</div>
        <div>VIDEO.JS v10 SKINS CHALLENGE ENTRY · SPONSORED BY MUX &amp; PLYR</div>
      </footer>
    </div>
  );
}
