---
"videostil": patch
---

feat: update timestamp format to MM:SS and support MM:SS input for startTime

- Change timestamp display format from "1m23s" to "1:23" (MM:SS) for better readability
- Add support for MM:SS format in `startTime` parameter (e.g., "1:30" for 1 minute 30 seconds)
- `startTime` now accepts both MM:SS string format and seconds as number
- `duration` parameter remains seconds-only for simplicity
- Update CLI help text and documentation to reflect new format
- Affects frame timestamps in deduplication output and diff data collection
