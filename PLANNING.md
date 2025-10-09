# VideoStil - Project Planning Document

## Overview
VideoStil (working name: videodice) is a standalone NPM package for converting videos into LLM-friendly formats by extracting and deduplicating frames. The tool addresses the fundamental problem: **Videos are large, LLM context windows are small** - we need intelligent video compression.

**Source Code Base:** `/Users/aashishwork/empirical/test-generator/packages/test-gen/src/video-core` (~3,271 lines of TypeScript)

---

## Core Functionality Analysis

### 1. Frame Extraction Pipeline
**Primary Module:** `LocalFFmpegClient` ([ffmpeg/index.ts](file:///Users/aashishwork/empirical/test-generator/packages/test-gen/src/utils/ffmpeg/index.ts))

**Core Workflow:**
1. `extractUniqueFramesFromVideo()` - Main entry point
2. `downloadVideo()` - Downloads video with progress tracking
3. `getVideoDuration()` - Validates video length via ffprobe
4. `extractFrames()` - Runs ffmpeg to extract frames
5. `deduplicateImageFiles()` - Calls deduplication system
6. `storeUniqueFrames()` - Copies unique frames to separate directory

**Key Features:**
- FFmpeg/FFprobe availability check on instantiation
- Video download with progress tracking (speed indicators, progress bars)
- Video duration validation via ffprobe (max 15 minutes / 900 seconds)
- Time-range extraction support with validation:
  - `startTime` parameter: Extract from X seconds into video
  - `duration` parameter: Extract only X seconds of content
  - Validates startTime < videoDuration
  - Auto-truncates duration if it exceeds available video time
- Frame extraction at configurable FPS (default: 30 in client, 25 in docs)
- Automatic frame scaling and padding to 1280x720
- Absolute frame indexing based on video timestamp (not relative to extraction start)
- Append mode support: Can add frames to existing directories without clearing

**FFmpeg Command Details:**
- Base command: `ffmpeg -y -nostdin -i "input.webm"`
- Arguments for time extraction:
  - `-ss <startTime>` - Seek to start time (if > 0)
  - `-t <duration>` - Limit duration (if specified)
- Video filter chain: `fps=X,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2`
  - `fps=X` - Set frame rate
  - `scale=1280:720:force_original_aspect_ratio=decrease` - Scale maintaining aspect ratio
  - `pad=1280:720:(ow-iw)/2:(oh-ih)/2` - Center-pad to exact 1280x720
- Quality setting: `-q:v 2` (high quality JPEG)
- Output pattern: `frame_%06d.png` (6-digit zero-padded, sequential)

**Frame Naming & Indexing:**
- Extracted frames initially: `frame_000001.png`, `frame_000002.png`, etc.
- Renamed to absolute indices: `frame_${startTime * fps + i}.png`
- Example: If startTime=10s and fps=30, first frame is `frame_000300.png`
- Preserves video position even for partial extractions
- 6-digit zero-padding via `FRAME_INDEX_PADDING` constant

**Storage Structure:**
```
{workingDir}/
├── video_{hash}.webm           # Downloaded video (hash from URL)
├── frames/                     # All extracted frames
│   └── frame_000000.png        # With absolute indices
├── unique_frames/              # Deduplicated frames only
│   └── frame_000000.png        # Preserves original indices
```

**Configuration:**
- Default FPS: 30 (client code), but 25 mentioned in CLI docs
- Default threshold: 0.001 (client code), but 0.01 in docs
- Fixed frame dimension: 1280x720 (`FRAME_DIMENSION` constant)
- Max video duration: 900 seconds (15 minutes)
- Supports both HTTP URLs and local file paths
- Video caching via SHA-256 hash (first 16 chars) from URL

### 2. Frame Deduplication System
**Primary Modules:** Multiple algorithm implementations in `utils/dedup/`

**Core Files:**
- `dedup-image-fs.ts` - File system-based entry point, processes image paths
- `dedup-image.ts` - Main orchestrator, handles algorithm selection and performance tracking
- `dedup-image-loader.ts` - Caching image loader for optimized buffer loading
- `find-threshold.ts` - Image comparison utilities using pixelmatch and sharp
- `config.ts` - Configuration constants for all algorithms

**Available Algorithms:**
1. **Greedy Dedup** (`gd`, default) - [dedup-greedy.ts](file:///Users/aashishwork/empirical/test-generator/packages/test-gen/src/utils/dedup/dedup-greedy.ts)
   - Compares each frame only with the previous unique frame
   - Fastest algorithm, lowest memory usage
   - Best for videos with gradual scene changes

2. **Dynamic Programming** (`dp`) - [dedup-dp.ts](file:///Users/aashishwork/empirical/test-generator/packages/test-gen/src/utils/dedup/dedup-dp.ts)
   - Compares each frame with previous N unique frames (lookback window)
   - Default lookback: 5 frames (configurable via `DP_MAX_LOOKBACK`)
   - Optimizes for maximum unique frame coverage
   - Better for detecting duplicates with brief scene interruptions

3. **Sliding Window** (`sw`) - [dedup-sliding-window.ts](file:///Users/aashishwork/empirical/test-generator/packages/test-gen/src/utils/dedup/dedup-sliding-window.ts)
   - Maintains a rolling window of recent unique frames
   - Default window size: 3 frames (configurable via `SLIDING_WINDOW_SIZE`)
   - Compares each frame against all frames in the window
   - Good balance between accuracy and performance

**Dedup Process Flow:**
1. `deduplicateImageFiles` reads file paths and creates `UniqueFrameInfos` objects
2. Extracts frame indices from filenames (`frame_XXXXXX.png`)
3. Calculates timestamps based on FPS (format: `XmYYs`)
4. Generates R2 URLs if hash and getter provided
5. Calls `deduplicateFrames` with chosen algorithm
6. Loads frame buffers (with caching via `ImageLoader`)
7. Compares frames using selected algorithm
8. Converts unique frames to base64 for final output
9. Logs performance metrics (execution time, memory usage, reduction stats)

**Image Comparison Details:**
- Uses `sharp` for image processing (metadata extraction, color conversion)
- Uses `pixelmatch` for pixel-by-pixel comparison
- Fixed pixelmatch threshold: 0.1 (hardcoded in `find-threshold.ts`)
- User-configurable similarity threshold (default: 0.001 in ffmpeg client, 0.01 in docs)
- `diffFraction` = diffPixels / totalPixels
- Images are duplicates if `diffFraction <= threshold`
- All images must have identical dimensions (enforced by ffmpeg: 1280x720)

**Performance Optimizations:**
- `ImageLoader` class caches loaded buffers to avoid redundant disk reads
- Cache is explicitly cleared after deduplication completes
- Progress logging every 50 frames during processing
- Performance tracking with `performance.mark/measure` API
- Memory usage monitoring (heap before/after)

### 3. LLM Video Analysis Agent
**Primary Module:** `VideoAnalysisAgent` ([agent/video-analysis/index.ts](file:///Users/aashishwork/empirical/test-generator/packages/test-gen/src/agent/video-analysis/index.ts))

**Agent Capabilities:**
- Specialized system prompt for UI/screen recording analysis
- Frame-by-frame sequential analysis
- XML-structured output format with key frames and descriptions
- Multi-modal input handling (text + images)
- Model support: Claude (Sonnet 4), OpenAI (GPT-4o)

**Output Format:**
```xml
<summary>
  <section>
    <key_frame>frame_000000</key_frame>
    <description>Detailed frame analysis</description>
  </section>
  ...
</summary>
```

**Model Limits:**
- Claude: 100 images/batch, 32MB max request size
- OpenAI: 500 images/batch, 50MB max request size
- Automatic batch size calculation based on frame sizes

### 4. Analysis Server & Viewer
**Primary Module:** `analysis-server.ts` + `analysis-viewer.html`

**Server Features:**
- HTTP server on port 63745 (fallback to ephemeral)
- Auto-opens browser for analysis viewing
- REST API endpoints:
  - `GET /api/analyses` - List all available analyses
  - `GET /api/data?id={hash}` - Get specific analysis data
  - `GET /api/unique-frames` - List unique frames
  - `GET /api/frame/{filename}` - Serve frame images
  - `GET /api/similarity?frame1=X&frame2=Y` - Calculate similarity
  - `GET /api/frame-diff-data` - Frame difference visualization data

**Viewer Features:**
- Multi-analysis browser/selector
- Interactive frame timeline
- Frame similarity comparison
- Graph visualization of frame differences
- Cached computation results
- Security: Path traversal protection, PNG-only enforcement

### 5. Storage & Caching
**Working Directory Structure:**
```
video-analysis/{videoUrlHash}/
├── video_{hash}.webm          # Downloaded video
├── frames/                    # All extracted frames
│   └── frame_XXXXXX.png
├── unique_frames/             # Deduplicated frames
│   └── frame_XXXXXX.png
├── analysis-result.json       # Final analysis output
├── chat-state.json           # LLM conversation history
└── frame-diff-cache.json     # Pre-computed similarity data
```

**R2 Upload (Optional):**
- Cloudflare R2 storage integration for frame hosting
- Uploads frames, summary, and chat state
- Queue-based concurrent uploads
- Public URL generation for hosted frames

### 6. CLI Interface
**Primary Module:** `runVideoAnalysisForCli` in [video-core/index.ts](file:///Users/aashishwork/empirical/test-generator/packages/test-gen/src/video-core/index.ts)

**Current Commands:**
```bash
# Basic usage
npx test-gen video-analysis <url> [params]

# With parameters
npx test-gen video-analysis <url> "fps=20,threshold=0.01,model=claude-sonnet-4"

# With algorithm selection
npx test-gen video-analysis <url> "fps=25" --algo=dp
```

**Supported Parameters:**
- `fps` - Frames per second (default: 25)
- `threshold` - Dedup similarity threshold (default: 0.01)
- `model` - LLM model (default: claude-sonnet-4-20250514)
- `startTime` / `start_time` - Start extraction at X seconds
- `duration` - Extract only X seconds of video
- `--algo` - Dedup algorithm: gd (greedy), dp (dynamic programming), sw (sliding window)

---

## Package Architecture Plan

### Package Name Options
1. **videostil** (current repo name) - "stills from video"
2. **videodice** (mentioned in README) - "dice up videos"
3. **vidframes** - straightforward
4. **llmvideo** - purpose-focused

**Recommendation:** `videodice` - memorable, action-oriented, implies precision

### Package Structure
```
videodice/
├── src/
│   ├── cli/                   # CLI entry point
│   │   ├── index.ts          # Commander.js CLI
│   │   └── commands/
│   │       ├── extract.ts    # Frame extraction command
│   │       ├── analyze.ts    # LLM analysis command
│   │       └── serve.ts      # Viewer server command
│   ├── core/
│   │   ├── ffmpeg.ts         # FFmpeg client
│   │   ├── dedup/            # Deduplication algorithms
│   │   │   ├── greedy.ts
│   │   │   ├── dynamic.ts
│   │   │   ├── sliding.ts
│   │   │   └── similarity.ts
│   │   ├── agent.ts          # LLM analysis agent
│   │   ├── orchestrator.ts   # Analysis orchestration
│   │   └── storage.ts        # Storage management
│   ├── server/
│   │   ├── server.ts         # HTTP server
│   │   ├── viewer.html       # Analysis viewer UI
│   │   └── api.ts            # API endpoints
│   ├── utils/
│   │   ├── hash.ts
│   │   ├── xml-parser.ts
│   │   └── validators.ts
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── index.ts              # Main API export
├── bin/
│   └── videodice             # CLI executable
├── test/
│   └── ...
├── examples/
│   ├── basic-usage.ts
│   ├── api-integration.ts
│   └── custom-dedup.ts
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### API Design

#### Primary API
```typescript
import { dice } from 'videodice';

// Full analysis with LLM
const result = await dice.analyze({
  videoUrl: 'https://example.com/video.mp4',
  fps: 25,
  threshold: 0.01,
  model: 'claude-sonnet-4',
  apiKey: process.env.ANTHROPIC_API_KEY,
  dedupAlgo: 'greedy',
  startTime: 10,    // optional: start at 10 seconds
  duration: 30,     // optional: analyze 30 seconds
});

// Just frame extraction (no LLM)
const frames = await dice.extract({
  videoUrl: 'https://example.com/video.mp4',
  fps: 25,
  threshold: 0.01,
  dedupAlgo: 'dp',
  outputDir: './frames',
});

// Serve existing analysis
await dice.serve({
  analysisDir: './video-analysis',
  port: 63745,
  openBrowser: true,
});

// Custom deduplication
const uniqueFrames = await dice.dedup({
  framePaths: ['frame1.png', 'frame2.png'],
  threshold: 0.01,
  algo: 'sliding-window',
});
```

#### Type Definitions
```typescript
export interface DiceAnalyzeOptions {
  videoUrl: string;
  fps?: number;                    // default: 25
  threshold?: number;              // default: 0.01
  model?: SupportedModel;          // default: 'claude-sonnet-4'
  apiKey?: string;                 // from env if not provided
  dedupAlgo?: 'greedy' | 'dp' | 'sw'; // default: 'greedy'
  startTime?: number;              // seconds
  duration?: number;               // seconds
  workingDir?: string;             // default: './video-analysis'
  skipUpload?: boolean;            // default: true (no R2)
  openViewer?: boolean;            // default: true
}

export interface DiceExtractOptions {
  videoUrl: string;
  fps?: number;
  threshold?: number;
  dedupAlgo?: 'greedy' | 'dp' | 'sw';
  startTime?: number;
  duration?: number;
  outputDir?: string;
  returnBase64?: boolean;          // return base64 or file paths
}

export interface DiceAnalysisResult {
  analysisId: string;              // hash identifier
  videoUrl: string;
  totalFrames: number;             // before dedup
  uniqueFrames: number;            // after dedup
  videoDuration: number;           // seconds
  analysis: string;                // LLM analysis text
  frames: FrameInfo[];
  parsedSections: AnalysisSection[];
  viewerUrl?: string;              // if server started
}

export interface FrameInfo {
  index: number;                   // original position in video
  fileName: string;                // frame_XXXXXX.png
  path: string;                    // local file path
  base64?: string;                 // optional base64 data
  url?: string;                    // optional hosted URL
  timestamp: string;               // "XmYYs" format
}
```

### CLI Design

```bash
# Main command
videodice <video-url> [options]

# Sub-commands
videodice extract <video-url> [options]    # Extract frames only
videodice analyze <video-url> [options]    # Full LLM analysis
videodice serve [analysis-dir]             # Start viewer server

# Options
--fps <number>              # Frame rate (default: 25)
--threshold <number>        # Dedup threshold (default: 0.01)
--algo <string>             # Algorithm: greedy|dp|sw (default: greedy)
--model <string>            # LLM model (default: claude-sonnet-4)
--api-key <string>          # API key (or use env vars)
--start <seconds>           # Start time in video
--duration <seconds>        # Duration to extract
--output <dir>              # Output directory
--no-viewer                 # Don't open viewer
--port <number>             # Server port (default: 63745)
--help                      # Show help
--version                   # Show version

# Examples
videodice https://example.com/demo.mp4
videodice extract ./video.mp4 --fps 20 --threshold 0.005
videodice analyze ./video.mp4 --model gpt-4o --start 30 --duration 60
videodice serve ./video-analysis/abc123
```

### Dependencies

**Core:**
- `@anthropic-ai/sdk` - Claude API
- `openai` - OpenAI API
- `commander` - CLI framework
- `express` or native `http` - Server
- `open` - Browser opening
- `sharp` - Image processing (for similarity)
- `pixelmatch` - Image comparison

**Dev:**
- `typescript` - TypeScript compiler
- `@types/node` - Node.js types
- `vitest` - Testing framework
- `tsup` or `esbuild` - Building
- `prettier` - Code formatting
- `eslint` - Linting

**System Requirements:**
- `ffmpeg` and `ffprobe` must be installed
- Node.js >= 18.0.0

---

## Implementation Phases

### Phase 1: Core Extraction (MVP)
**Goal:** Extract and deduplicate frames without LLM

**Tasks:**
1. Set up package structure and build system
2. Port FFmpeg client with video download
3. Implement all 3 dedup algorithms (greedy, DP, sliding window)
4. Add image similarity utilities
5. Create basic CLI for extraction
6. Write comprehensive tests
7. Add validation and error handling

**Deliverable:** `videodice extract <url>` works end-to-end

### Phase 2: LLM Integration
**Goal:** Add AI-powered video analysis

**Tasks:**
1. Port VideoAnalysisAgent
2. Implement model batch size calculation
3. Add XML parsing utilities
4. Integrate Claude and OpenAI APIs
5. Add chat state management
6. Implement orchestration logic
7. Extend CLI with `analyze` command

**Deliverable:** `videodice analyze <url>` produces LLM analysis

### Phase 3: Viewer & Server
**Goal:** Interactive analysis visualization

**Tasks:**
1. Port HTTP server with API endpoints
2. Migrate analysis viewer HTML/JS
3. Add multi-analysis browsing
4. Implement frame similarity API
5. Add caching for performance
6. Create `serve` CLI command
7. Polish UI/UX

**Deliverable:** `videodice serve` opens interactive viewer

### Phase 4: API Polish & Documentation
**Goal:** Production-ready package

**Tasks:**
1. Finalize public API surface
2. Write API documentation
3. Create usage examples
4. Add JSDoc comments
5. Write README with badges
6. Set up CI/CD (GitHub Actions)
7. Publish to NPM

**Deliverable:** Published NPM package with docs

### Phase 5: Advanced Features (Future)
**Optional enhancements:**
- Streaming analysis for long videos
- Custom LLM prompts
- Video format conversion
- Frame annotation tools
- Webhook/API integrations
- Cloud storage options (S3, Azure)
- Performance benchmarking suite
- GPU acceleration for similarity
- Plugin system for custom dedup algorithms

---

## Key Technical Decisions

### 1. Frame Storage Strategy
**Decision:** Store frames locally in working directory, optional R2 upload

**Rationale:**
- Local storage enables offline analysis
- R2 integration optional for sharing/hosting
- Working directory structure preserves all artifacts
- Hash-based IDs prevent collisions

### 2. Deduplication Approach
**Decision:** Multiple algorithms with configurable threshold

**Rationale:**
- Different videos benefit from different algorithms
- Greedy is fast for simple cases
- DP optimizes for quality with lookback
- Sliding window good for smooth transitions
- User can benchmark and choose

### 3. Model Support
**Decision:** Support both Claude and OpenAI, default to Claude

**Rationale:**
- Claude Sonnet 4 has excellent vision capabilities
- OpenAI GPT-4o is widely used
- Allow users to choose based on preference/cost
- Detect API keys from environment

### 4. CLI vs API First
**Decision:** API-first design, CLI wraps API

**Rationale:**
- Better for programmatic integration
- Easier to test
- CLI becomes thin wrapper
- Enables library usage without CLI

### 5. Viewer Architecture
**Decision:** Single-file HTML served from local HTTP server

**Rationale:**
- No build step for viewer
- Easy to update/customize
- Works offline
- No external dependencies

---

## Testing Strategy

### Unit Tests
- FFmpeg command generation
- Deduplication algorithms accuracy
- Similarity calculation correctness
- XML parsing edge cases
- Hash generation consistency

### Integration Tests
- End-to-end frame extraction
- Full analysis pipeline
- Server API endpoints
- Multi-video handling
- Error scenarios

### Performance Tests
- Large video handling (15 min max)
- Memory usage during batch processing
- Dedup algorithm benchmarks
- Server response times

### Manual Testing Checklist
- [ ] Extract frames from HTTP video URL
- [ ] Extract frames from local file path
- [ ] All 3 dedup algorithms produce valid results
- [ ] LLM analysis with Claude
- [ ] LLM analysis with OpenAI
- [ ] Viewer displays frames correctly
- [ ] Similarity comparison works
- [ ] Multiple analyses can be browsed
- [ ] Time range extraction works
- [ ] Graceful handling of missing ffmpeg
- [ ] API usage in Node.js project

---

## Documentation Plan

### README.md Sections
1. **Hero** - One-liner + demo GIF
2. **Installation** - `npm install videodice`
3. **Quick Start** - 3 examples (CLI, API, both)
4. **Requirements** - ffmpeg installation
5. **CLI Reference** - All commands and options
6. **API Reference** - TypeScript examples
7. **How It Works** - Architecture diagram
8. **Configuration** - All parameters explained
9. **Examples** - Real-world use cases
10. **Contributing** - Guidelines
11. **License** - MIT

### Additional Docs
- `CONTRIBUTING.md` - Developer setup
- `CHANGELOG.md` - Version history
- `API.md` - Detailed API reference
- `ALGORITHMS.md` - Dedup algorithm comparison
- `examples/` - Runnable example scripts

---

## Performance Considerations

### Memory Management
- Batch processing prevents OOM errors
- Garbage collection hints between batches
- Stream-based video download
- Base64 encoding only when needed

### Speed Optimizations
- Parallel frame comparison within batches
- FFmpeg hardware acceleration (when available)
- Cached similarity calculations
- Pre-computed frame diffs

### Resource Limits
- 15-minute max video duration (900 seconds)
- Configurable batch sizes
- Request size limits per model
- Concurrent upload queue for R2

---

## Security Considerations

### Input Validation
- Path traversal prevention in server
- PNG-only frame serving
- URL validation before download
- Parameter sanitization

### API Keys
- Environment variable support
- No key logging/exposure
- Secure key storage recommendations

### Network Safety
- HTTPS enforcement for downloads
- Timeout limits on video downloads
- Progress tracking with abort capability

---

## Open Questions & Decisions Needed

1. **Package Name:** `videodice` vs `videostil` vs other?
2. **R2 Upload:** Keep optional R2 integration or remove entirely?
3. **Viewer UI:** Port existing HTML or rebuild with React/Vue?
4. **Model Defaults:** Claude or OpenAI as primary default?
5. **Frame Quality:** Current uses `-q:v 2`, should this be configurable?
6. **Async Operations:** Should API use callbacks, promises, or event emitters for progress?
7. **Configuration Files:** Support config file (videodice.config.js) or CLI-only?
8. **Output Format:** Support JSON, CSV, or just analysis text?

---

## Success Metrics

### For MVP (Phase 1-2)
- [ ] Successfully process 10 different video types
- [ ] Dedup reduces frames by 60-90%
- [ ] Process 15-min video in < 5 minutes
- [ ] Zero crashes on valid inputs
- [ ] Clear error messages for invalid inputs

### For Release (Phase 3-4)
- [ ] 100+ NPM downloads in first week
- [ ] < 5 GitHub issues opened
- [ ] All tests passing
- [ ] Documentation complete
- [ ] 3+ example use cases

### Long-term
- [ ] 1000+ weekly NPM downloads
- [ ] Community contributions
- [ ] Integration into other projects
- [ ] Positive feedback on API ergonomics

---

## Migration Notes

**Code to Port:** ~3,271 lines from test-generator
**Primary Files:**
- `video-core/index.ts` - Main orchestration (341 lines)
- `video-core/agent-orchestrator.ts` - LLM integration (116 lines)
- `video-core/analysis-server.ts` - Server (748 lines)
- `video-core/utils.ts` - Utilities (291 lines)
- `utils/ffmpeg/index.ts` - FFmpeg client (386 lines)
- `utils/dedup/*.ts` - Dedup algorithms (~400 lines)
- Agent and types (~200 lines)

**Dependencies to Review:**
- `@empiricalrun/shared-types` - May need to inline types
- `@empiricalrun/llm` - Replace with direct SDK usage
- `@empiricalrun/r2-uploader` - Optional, may remove
- Other internal utilities - Extract what's needed

**Breaking Changes:**
- New package name
- Different API surface
- Simplified configuration
- Removed test-gen specific features

---

## Timeline Estimate

**Phase 1:** 1-2 weeks (Core extraction)
**Phase 2:** 1 week (LLM integration)
**Phase 3:** 1 week (Viewer & server)
**Phase 4:** 3-5 days (Polish & docs)
**Total:** 3-4 weeks for full release

**Quick MVP:** Phase 1 only (1-2 weeks) for frame extraction tool

---

## Next Steps

1. **Finalize package name** - Decide on `videodice` or alternative
2. **Set up repository** - Initialize proper package structure
3. **Choose build tooling** - tsup vs esbuild vs tsc
4. **Start Phase 1** - Port FFmpeg and dedup code
5. **Create initial tests** - Test extraction pipeline
6. **Draft initial README** - Get feedback on API design

---

**Document Version:** 1.0
**Created:** 2025-10-09
**Last Updated:** 2025-10-09
**Status:** Draft - Awaiting Approval
