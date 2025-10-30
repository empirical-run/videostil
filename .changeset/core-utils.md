---
"videostil": patch
---

feat: add reusable utility modules for banner, version, and time conversion

- Add `banner.ts` for consistent CLI branding display
- Add `version.ts` for centralized package version access
- Add `time-converter.ts` with utilities to convert time strings (HH:MM:SS, MM:SS) to seconds
- Refactor `ffmpeg.ts` to use time conversion utilities instead of hardcoded seconds
- Update parameter names in `extractFrames` from `startTime`/`duration` to `startTimeSeconds`/`durationSeconds` for clarity
