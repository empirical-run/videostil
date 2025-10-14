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


# Test Failure Investigation Guide

## When Tests Fail: Investigation Protocol

### ❌ DON'T: Immediately update tests to match new behavior
### ✅ DO: Investigate root cause first

## Step-by-Step Process

### 1. **Understand the Failure**
- Read the test assertion that's failing
- Understand what the test expects vs what it's getting
- Identify which code change caused the failure

### 2. **Check Code History**
```bash
# See recent changes to the file
git log -p --follow <file-path>

# See what changed in the last commit
git show HEAD:<file-path>

# Compare current vs previous version
git diff HEAD~1 <file-path>
```

### 3. **Determine: Bug or Stale Test?**

#### Signs of a **BUG in new code**:
- Test was passing before
- Test logic is sound and tests valid behavior
- New code changed expected behavior unintentionally
- Error messages indicate logic errors (ENOENT, type errors, etc.)
- Multiple related tests fail in the same way

#### Signs of a **STALE TEST**:
- Code intentionally changed API/behavior
- Test uses deprecated patterns
- Test expectations don't match documented behavior
- Test was written for old implementation

### 4. **Investigation Checklist**

Before updating ANY test, answer these questions:

- [ ] What was the original intention of this test?
- [ ] What behavior is it validating?
- [ ] Is that behavior still important?
- [ ] Did my code change break valid functionality?
- [ ] Is the test revealing a regression?
- [ ] Should the code be fixed instead of the test?

### 5. **Decision Tree**

```
Test Failing
    ├─> Is this expected behavior?
    │   ├─> NO → Fix the CODE, not the test
    │   └─> YES → Is the test still valid?
    │       ├─> YES → Update test expectations
    │       └─> NO → Remove or rewrite test
    │
    └─> Does this reveal a bug?
        ├─> YES → Fix the CODE
        └─> NO → Check if refactor broke valid behavior
            ├─> YES → Fix the CODE
            └─> NO → Update test
```

### 6. **Common Scenarios**

#### Scenario A: Return type changed
```typescript
// Old: function returns Array
// New: function returns { items: Array, metadata: Object }
```
**Action**: Update tests to access `.items` property

#### Scenario B: Files not found (ENOENT)
```
Error: ENOENT: no such file or directory
```
**Action**: Investigate WHY files don't exist:
- Were they deleted prematurely?
- Are paths incorrect (relative vs absolute)?
- Is timing/sequencing wrong?
**Fix the code that creates/manages these files**

#### Scenario C: Logic changed
```typescript
// Old: threshold > value
// New: threshold >= value
```
**Action**: Determine which is correct based on requirements, fix the wrong one

### 7. **Red Flags** 🚩

**STOP and investigate deeper if you see:**
- Changing test expectations to match errors
- Making assertions less strict
- Commenting out failing assertions
- Adding try-catch to hide failures
- Multiple unrelated tests failing

### 8. **Example: Good Investigation**

```markdown
Test Failed: "expect(result.uniqueFramesDir).toBeTruthy()"

❌ BAD Response:
- Comment out the assertion
- Change to .toBeFalsy()

✅ GOOD Response:
1. Check: Why is uniqueFramesDir undefined/false?
2. Trace: Where should it be set?
3. History: Did it work before? What changed?
4. Root cause: `ensureEmptyDir()` is deleting directory after creation
5. Fix: Move `ensureEmptyDir()` to BEFORE file operations
6. Verify: Test now passes with correct behavior
```

### 9. **Documentation Requirements**

When you DO need to update tests, document:
```typescript
// Updated test expectations because:
// - Changed return type from Array to { uniqueFrames: Array, diffData: Object }
// - This is an intentional API change to support diff caching
// - Previous behavior: returned FrameInfo[]
// - New behavior: returns DeduplicateFilesResult
```

## Summary

**Golden Rule**: Tests are the specification. If they fail, assume the code is wrong until proven otherwise.

Only update tests after confirming:
1. The failure is due to an intentional API/behavior change
2. The new behavior is correct and better
3. The test needs to be updated to match new contract
4. No regression or bug is being hidden