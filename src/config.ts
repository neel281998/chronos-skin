// ═══════════════════════════════════════════════════════════════
//  STUDIO CHRONOS — ARCHIVAL MASTER CONFIGURATION
//  Video.js v10 Design Challenge Submission
//  License: Apache-2.0
// ═══════════════════════════════════════════════════════════════

/** ⚡ PRIMARY MUX PLAYBACK ID */
export const MUX_PLAYBACK_ID = 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe';

export const MUX_STREAM_URL = `https://stream.mux.com/${MUX_PLAYBACK_ID}.m3u8`;

/** Curated Archive Reels (03) for Reference Calibration */
export interface ArchiveReel {
  id: string;
  reelNumber: string;
  label: string;
  subLabel: string;
  description: string;
  url: string;
  specs: string;
  poster?: string;
  autoCueTime?: number;
}

export const ARCHIVE_REELS: ArchiveReel[] = [
  {
    id: 'reel-01-mux-master',
    reelNumber: 'REEL 01',
    label: 'Mux Master Stream',
    subLabel: 'Primary Reference Stream',
    description: 'High-bitrate HLS master stream encoded via Mux Video infrastructure. Reference target for color balance and timing.',
    url: MUX_STREAM_URL,
    specs: 'HLS · H.264 · 1080p24 · Rec.709 · AAC 48kHz',
    poster: `https://image.mux.com/${MUX_PLAYBACK_ID}/thumbnail.jpg?time=15&width=1920`,
    autoCueTime: 1.5,
  },
  {
    id: 'reel-02-high-luminance',
    reelNumber: 'REEL 02',
    label: 'High-Luminance Optical Test',
    subLabel: 'Bright Daylight Calibration',
    description: 'High-key cinematic exterior footage featuring intense solar luminance. Calibrates UI substrate density and contrast over pure highlights.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    specs: 'HLS · High-Key Daylight · 1080p · Rec.709',
    poster: 'https://image.mux.com/x36xhzz/thumbnail.jpg?time=35&width=1920',
    autoCueTime: 35.0, // Automatically jumps to bright daylight frame
  },
  {
    id: 'reel-03-low-key-nocturne',
    reelNumber: 'REEL 03',
    label: 'Low-Key Nocturne',
    subLabel: 'Shadow & Grain Master',
    description: '2.39:1 anamorphic low-key sequence featuring deep near-zero IRE black levels, optical flare reflections, and film emulsion grain.',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    specs: 'HLS · 2.39:1 Anamorphic · Low-Key Shadow Master',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
    autoCueTime: 2.0,
  },
];

/** Archival technical specifications */
export const ARCHIVE_METADATA = {
  title: 'Chronos: The Archival & Cinema Reference',
  ledgerId: 'ARCH-2026-V10',
  year: '2026',
  transferStandard: 'SMPTE ST 2067-21 (IMF Master)',
  colorMatrix: 'ITU-R BT.709-6 (Rec. 709 Full Range)',
  audioEncoding: 'Linear PCM / AAC 48.0 kHz 24-bit',
  emulsionFormat: '35mm 3-Perf Anamorphic Conform',
  engine: 'Video.js v10.3 Core Media Architecture',
  directorNotes: `Chronos draws its design DNA from mid-century optical benches, Dieter Rams / Braun precision laboratory instrumentation, and Teenage Engineering audio synthesizers.
Rather than treating video controls as disposable glass cards floating over an image, Chronos builds an industrial control deck directly into the viewing apparatus. 
Every millimeter of the film ruler is notched with calibrated tick marks; time is rendered on a dedicated recessed SMPTE drum; and audio decibels are displayed through a tactile discrete LED ladder. 
Over white snow or absolute black grain, the substrate maintains uncompromising physical legibility through progressive luminance absorption and zero-compromise typography.`,
};

/** Chapter Definitions (Relative milestones along duration) */
export interface ChapterDefinition {
  percent: number; // 0 to 1
  code: string;
  title: string;
  description: string;
}

export const CHAPTER_DEFINITIONS: ChapterDefinition[] = [
  { percent: 0, code: 'ACT 01', title: 'Prologue & Archive Ingest', description: 'Inspection of physical 35mm canister seals and preliminary densitometry' },
  { percent: 0.18, code: 'ACT 02', title: 'Source Reel Optical Scanning', description: 'Continuous-motion 4K gate transport with pin-registered sprocket stabilization' },
  { percent: 0.42, code: 'ACT 03', title: 'Frame Restoration & Dust Matrix', description: 'Automated temporal defect compensation and organic emulsion scratch removal' },
  { percent: 0.68, code: 'ACT 04', title: 'Spectral Timing & Rec.709 Grade', description: 'Photochemical color balance conform against original laboratory timing cards' },
  { percent: 0.88, code: 'ACT 05', title: 'Master Conform & Archival Epilogue', description: 'Lossless mezzanine package verification and final preservation sign-off' },
];

export interface DynamicChapter {
  index: number;
  code: string;
  time: number;
  endTime: number;
  duration: number;
  percent: number;
  endPercent: number;
  title: string;
  description: string;
}

/** Compute dynamic chapters synchronized to actual video duration */
export function getDynamicChapters(videoDuration: number): DynamicChapter[] {
  // Handle live media (Infinity)
  if (!isFinite(videoDuration) || videoDuration === Infinity) {
    return [
      {
        index: 1,
        code: 'LIVE',
        time: 0,
        endTime: 0,
        duration: 0,
        percent: 0,
        endPercent: 1,
        title: 'Continuous Live Transmission',
        description: 'Real-time archival broadcast stream with indeterminate duration',
      },
    ];
  }

  // If duration is not yet available, return empty array to prevent fake zero-time duplicates
  if (!videoDuration || isNaN(videoDuration) || videoDuration <= 0) {
    return [];
  }

  const dur = videoDuration;
  return CHAPTER_DEFINITIONS.map((def, idx, arr) => {
    const time = Math.round(dur * def.percent);
    const nextDef = arr[idx + 1];
    const endPercent = nextDef ? nextDef.percent : 1;
    const endTime = Math.round(dur * endPercent);
    return {
      index: idx + 1,
      code: def.code,
      time,
      endTime,
      duration: Math.max(0, endTime - time),
      percent: def.percent,
      endPercent,
      title: def.title,
      description: def.description,
    };
  });
}
