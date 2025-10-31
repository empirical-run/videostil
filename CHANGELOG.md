# videostil

## 0.3.1

### Patch Changes

- f95c89e: fix: frame collision, add CLI e2e tests

## 0.3.0

### Minor Changes

- 8c765e8: feat: analysis viewer converted to React app

### Patch Changes

- 842606f: feat: add build and test workflow
- 842606f: feat: update timestamp format to MM:SS and support MM:SS input for startTime

  - Change timestamp display format from "1m23s" to "1:23" (MM:SS) for better readability
  - Add support for MM:SS format in `startTime` parameter (e.g., "1:30" for 1 minute 30 seconds)
  - `startTime` now accepts both MM:SS string format and seconds as number
  - `duration` parameter remains seconds-only for simplicity
  - Update CLI help text and documentation to reflect new format
  - Affects frame timestamps in deduplication output and diff data collection

## 0.2.3

### Patch Changes

- ce4e48e: feat: extended max video duration to 3 hours

## 0.2.2

### Patch Changes

- 12d7ed4: feat: frame diff calculation on 1st pass only
- 12d7ed4: feat: graph zoom scroll & vim navigation
- 12d7ed4: fix: show params, disable algo, fix hash issue

## 0.2.1

### Patch Changes

- 17af35e: feat: progress bars for download and de-dupe, instructions for missing deps

## 0.2.0

### Minor Changes

- 9992c3c: feat: LLM based frame analysis, README.md update

### Patch Changes

- 9992c3c: chore: add Husky pre-commit hook to prevent direct commits to main branch

  Added Husky configuration with a pre-commit hook that prevents developers from accidentally committing directly to the main branch, enforcing the use of feature branches and pull requests.

- 3409f66: ci: add build step to release workflow and fix bin path
- 9992c3c: fix: ensure unique_frames directory is created before copying frames

  Fixed a bug where the unique_frames directory was only created if it already existed, causing ENOENT errors on first run. Now the directory is always ensured to exist before storing unique frames.

## 0.1.2

### Patch Changes

- 4b2f585: chore: publish config access set to public

## 0.1.1

### Patch Changes

- 7d12312: chore: add Vitest testing infrastructure with GitHub Actions CI
- c1f9df2: chore: add changeset and release workflow
