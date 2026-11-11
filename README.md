# Chronos — Industrial Archival & Cinema Reference Skin

> A Video.js v10 skin submission for the **Mux/Plyr Skins Design Challenge**.  
> Aesthetic DNA: **Dieter Rams / Braun**, **Teenage Engineering**, and **Criterion Collection**.  
> License: **Apache-2.0**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Video.js](https://img.shields.io/badge/videojs-v10.3-orange.svg)](https://videojs.com)
[![Built with Vite](https://img.shields.io/badge/built%20with-vite-646cff.svg)](https://vitejs.dev)

---

## Design Philosophy

Chronos was designed as an authentic piece of **precision optical laboratory equipment**.

Rather than treating playback controls as disposable floating glass cards, Chronos builds an industrial control deck directly into the viewing apparatus:
- **Calibrated Film Ruler (`height: 28px`):** Replaces generic horizontal scrubber bars with millimeter-style focus-ring tick marks and major chapter boundary markers.
- **International Orange (`#FF4F00`) Playhead Needle:** A razor-sharp vertical needle with a triangular indicator cap that glides across the ruler.
- **Recessed Timecode Drum:** Full SMPTE timecode (`00:00:23:12`) in tabular monospace with instant toggle between `SMPTE`, `REM`, and `FRM`.
- **10-Segment Discrete Decibel Meter:** Hardware audio ladder with bone-white (`#F4F1EA`), phosphor amber (`#FFB800`), and peak orange (`#FF4F00`) LEDs.
- **Machined Button Cells:** Transport, single-frame step micro-buttons (`-1F` / `+1F`), speed cycling, and chapter drawers separated by 1px hairlines.

---

## Color System

- **Canvas Background:** `#0A0A09` (Warm carbon black)
- **Control Surface:** `rgba(18, 18, 16, 0.94)` with `backdrop-filter: blur(24px)` and `1px solid rgba(244, 241, 234, 0.14)`
- **Primary Glyphs & Text:** `#F4F1EA` (Archival bone white)
- **Technical Telemetry:** `#8E8B82` (Warm pewter)
- **Accent Indicator:** `#FF4F00` (Braun / Leica International Orange)
- **Warning & Focus:** `#FFB800` (Phosphor Amber)

---

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
```

## Mux Playback ID

Open [`src/config.ts`](src/config.ts) and set `MUX_PLAYBACK_ID`:

```ts
export const MUX_PLAYBACK_ID = 'YOUR_PLAYBACK_ID_HERE';
```

---

## Reference Calibration Reels

1. **Reel 01 — Mux Master Stream:** Primary entry target for HLS playback.
2. **Reel 02 — High-Luminance Optical Test:** Daylight exterior scene to test legibility over pure white highlights.
3. **Reel 03 — Low-Key Nocturne:** 2.39:1 anamorphic shadow calibration.

---

## Deployment

```bash
# Vercel
npx vercel --prod

# Netlify
npx netlify deploy --prod --dir=dist
```

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
