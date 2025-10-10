# Agent Documentation

This file contains conventions and patterns used in the videostil project for AI agents and contributors.

## Changeset Conventions

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation. All changeset descriptions should follow [Conventional Commits](https://www.conventionalcommits.org/) format.

### Changeset Format

```markdown
---
"videostil": patch
---

<type>: <description>
```

### Commit Types

**Core types:**
- `feat:` - A new feature (triggers MINOR version bump)
- `fix:` - A bug fix (triggers PATCH version bump)

**Supporting types:**
- `chore:` - Changes that don't modify src or test files (e.g., dependencies, config)
- `ci:` - Changes to CI/CD configuration files and scripts
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `perf:` - Performance improvements
- `test:` - Adding or correcting tests
- `build:` - Changes that affect the build system

### Examples

**Adding a new feature:**
```markdown
---
"videostil": minor
---

feat: add video trimming functionality
```

**Fixing a bug:**
```markdown
---
"videostil": patch
---

fix: correct frame extraction timestamp calculation
```

**Adding tests (this PR):**
```markdown
---
"videostil": patch
---

chore: add Vitest testing infrastructure with GitHub Actions CI
```

### Version Bump Guidelines

- `feat:` → **MINOR** version bump (0.1.0 → 0.2.0)
- `fix:` → **PATCH** version bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → **MAJOR** version bump (0.1.0 → 1.0.0)
- Other types (`chore:`, `ci:`, etc.) → **PATCH** version bump

## Git Commit Conventions

All git commits in this project should also follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Message Examples

```
feat(video): add support for MP4 format

Implements MP4 video processing using ffmpeg with the same
deduplication algorithms available for WebM format.

Closes #123
```

```
fix(dedup): prevent memory leak in greedy algorithm

The greedy deduplication algorithm was not clearing the image
cache properly, causing memory to grow unbounded for long videos.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Testing Conventions

### Test File Location
- Test files should be co-located with the source files they test
- Use `.test.ts` suffix for test files
- Example: `image-comparison.ts` → `image-comparison.test.ts`

### Test Structure
```typescript
import { describe, expect, it, beforeEach, afterEach } from "vitest";

describe("component/function name", () => {
  describe("specific functionality", () => {
    it("should do something specific", () => {
      // Test implementation
    });
  });
});
```

### Test Data
- Use `sharp` to generate test images dynamically (don't use base64 strings)
- Clean up test files in `afterEach` hooks
- Use unique directory names with timestamps to avoid conflicts

## GitHub Actions CI

The project uses GitHub Actions for continuous integration:

### Test Workflow (`.github/workflows/test.yml`)
- Runs on: Pull requests and pushes to `main`
- Node version: 20
- Required dependencies: `ffmpeg`
- Test command: `npm test`

### Workflow Triggers
- `pull_request`: `opened`, `synchronize`
- `push` to `main` branch

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
