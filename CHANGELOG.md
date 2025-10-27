# videostil

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
