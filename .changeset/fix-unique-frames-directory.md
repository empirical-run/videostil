---
"videostil": patch
---

fix: ensure unique_frames directory is created before copying frames

Fixed a bug where the unique_frames directory was only created if it already existed, causing ENOENT errors on first run. Now the directory is always ensured to exist before storing unique frames.
