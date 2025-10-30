# videostil

**Videos are large. LLM context windows are small.** You need a way to "compress" videos so they fit. We've got you.

videostil extracts and deduplicates video frames, converting videos into LLM-friendly formats that fit within context windows.

## Features

- 🎬 Extract frames at configurable FPS (default: 25)
- 🔍 Smart deduplication (3 algorithms: greedy, dynamic programming, sliding window)
- 📦 Simple API and CLI
- ⚡ Fast processing with caching
- 🎯 Absolute frame indexing preserves video timeline
- 🖼️ Automatic scaling and padding to 1280x720
- 🌐 Built-in analysis viewer server
- 📊 Frame similarity analysis and visualization
- 🤖 Optional LLM-powered video analysis (supports Anthropic, Google, OpenAI)

## Installation

```bash
npm install videostil
```

**Requirements:** ffmpeg and ffprobe must be installed on your system.

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## Quick Start

### CLI Usage

```bash
# Extract frames from a video (automatically opens viewer)
npx videostil https://example.com/video.mp4

# With custom parameters
npx videostil video.mp4 --fps 20 --threshold 0.01 --algo dp

# Extract without opening viewer
npx videostil video.mp4 --no-serve

# Start viewer server for existing analyses
npx videostil serve
npx videostil serve --port 8080 --no-open
```

### API Usage

```typescript
import { extractUniqueFrames, startAnalysisServer, analyseFrames } from 'videostil';

// Extract and deduplicate frames
const result = await extractUniqueFrames({
  videoUrl: 'https://example.com/video.mp4',
  fps: 25,
  threshold: 0.001,
  algo: 'gd' // greedy (default), or 'dp', 'sw'
});

console.log(`Extracted ${result.uniqueFrames.length} unique frames`);
console.log(`Video duration: ${result.videoDurationSeconds}s`);

// Access frame data
for (const frame of result.uniqueFrames) {
  console.log(`Frame ${frame.index} at ${frame.timestamp}`);
  console.log(`Path: ${frame.path}`);
  console.log(`Base64: ${frame.base64.substring(0, 50)}...`);
}

// Optional: Analyze frames with LLM
const analysisResult = await analyseFrames({
  selectedModel: 'claude-sonnet-4-20250514',
  workingDirectory: result.uniqueFramesDir,
  frameBatch: result.uniqueFrames.map(frame => ({
    name: frame.fileName,
    contentType: 'image/png',
    base64Data: frame.base64
  })),
  systemPrompt: 'You are a video analysis assistant.',
  initialUserPrompt: 'Analyze these video frames and provide insights.',
  apiKeys: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  }
});

console.log(analysisResult.analysis);

// Start analysis viewer server
const server = await startAnalysisServer({
  port: 63745,
  openBrowser: true
});

console.log(`Server running at ${server.url}`);
```

## API Reference

### `extractUniqueFrames(options)`

Extract and deduplicate frames from a video.

**Options:**
- `videoUrl` (string, required): Video URL or local file path
- `fps` (number, default: 25): Frames per second to extract
- `threshold` (number, default: 0.001): Deduplication similarity threshold (0.0-1.0)
- `startTime` (string | number, optional): Start extraction at specified time in MM:SS format (e.g., "1:30") or seconds as number
- `duration` (number, optional): Extract only specified duration in seconds
- `algo` (string, default: "gd"): Deduplication algorithm
  - `"gd"` - Greedy (fastest, compares with previous frame only)
  - `"dp"` - Dynamic Programming (looks back at N frames, default 5)
  - `"sw"` - Sliding Window (maintains rolling window, default 3 frames)
- `workingDir` (string, optional): Absolute path for output directory (default: `~/.videostil/{hash}`)

**Returns:** `ExtractResult`
- `totalFramesCount` (number): Total frames before deduplication
- `uniqueFrames` (FrameInfo[]): Array of unique frames
- `videoDurationSeconds` (number): Video duration in seconds
- `uniqueFramesDir` (string): Path to unique frames directory

### `startAnalysisServer(options)`

Start analysis viewer server to browse and visualize extracted frames.

**Options:**
- `port` (number, default: 63745): Server port
- `host` (string, default: "127.0.0.1"): Server host
- `openBrowser` (boolean, default: true): Automatically open browser
- `workingDir` (string, optional): Custom directory to serve analyses from (default: `~/.videostil/`)

**Returns:** `ServerHandle`
- `url` (string): Server URL
- `port` (number): Server port
- `host` (string): Server host
- `server` (http.Server): Node.js HTTP server instance
- `close` (() => Promise<void>): Function to close the server

### `analyseFrames(options)`

Analyze video frames using AI models from Anthropic, Google, or OpenAI.

**Options:**
- `selectedModel` (string, required): Model to use (e.g., "claude-sonnet-4-20250514", "gpt-5-2025-08-07", "gemini-2.5-pro")
- `workingDirectory` (string, required): Directory containing the frames
- `frameBatch` (Attachment[], required): Array of frame attachments with base64 data
- `systemPrompt` (string, required): System prompt for the AI
- `initialUserPrompt` (string, required): User prompt for the AI
- `apiKeys` (object, optional): API keys object with ANTHROPIC_API_KEY, GOOGLE_API_KEY, and/or OPENAI_API_KEY

**Returns:** `AnalyseFramesResult`
- `analysis` (string): Raw analysis text from the AI
- `allMessages` (CanonicalMessage[]): All messages in the conversation
- `parsedXml` (VideoAnalysisSection[]): Parsed XML sections from analysis
- `keyFrameImagesMap` (Map): Map of key frame images

**Note:** At least one API key must be provided either in the `apiKeys` parameter or as environment variables.

### Frame Information

Each frame in `uniqueFrames` contains:
- `index` (number): Absolute frame position in original video
- `path` (string): Local file path to frame image
- `fileName` (string): Normalized filename (e.g., "frame_000123.png")
- `base64` (string): Base64-encoded PNG image data
- `timestamp` (string): Human-readable timestamp (e.g., "1m23s")

## CLI Reference

### Extract Command

```bash
videostil <video-url> [options]

Options:
  --fps <number>          Frames per second (default: 25)
  --threshold <number>    Deduplication threshold (default: 0.01)
  --algo <string>         Algorithm: gd|dp|sw (default: gd)
  --start <MM:SS>         Start time in video (format: MM:SS, e.g., 1:30)
  --duration <seconds>    Duration to extract in seconds
  --output <dir>          Output directory
  --no-serve              Don't start viewer after extraction
  --model <string>        LLM model for analysis (e.g., claude-sonnet-4-20250514)
  --system-prompt <str>   System prompt for LLM analysis
  --user-prompt <str>     User prompt for LLM analysis
  --help                  Show help
  --version               Show version
```

**Note:** LLM analysis requires API keys. Set `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, or `OPENAI_API_KEY` environment variables to enable automatic frame analysis.

### Serve Command

```bash
videostil serve [options]

Options:
  --port <number>       Server port (default: 63745)
  --host <string>       Server host (default: 127.0.0.1)
  --no-open             Don't open browser automatically
  --help                Show help
```

## How It Works

1. **Download/Copy Video**: Fetches video from URL or copies local file
2. **Extract Frames**: Uses ffmpeg to extract frames at specified FPS
3. **Scale & Pad**: Normalizes all frames to 1280x720 (maintains aspect ratio)
4. **Deduplicate**: Removes duplicate frames using selected algorithm
5. **Store Results**: Saves unique frames and metadata
6. **Analyze (Optional)**: If API keys are available, analyzes frames using LLM

### Deduplication Algorithms

**Greedy (`gd`)**
- Compares each frame only with the previous unique frame
- Fastest, lowest memory usage
- Best for videos with gradual scene changes

**Dynamic Programming (`dp`)**
- Compares each frame with previous N unique frames (lookback window)
- Default lookback: 5 frames
- Better for detecting duplicates with brief scene interruptions

**Sliding Window (`sw`)**
- Maintains a rolling window of recent unique frames
- Default window size: 3 frames
- Good balance between accuracy and performance

## Output Structure

```
~/.videostil/{hash}/
├── video_{hash}.webm          # Downloaded video
├── frames/                    # All extracted frames
│   └── frame_000000.png
├── unique_frames/             # Deduplicated frames only
│   └── frame_000000.png
├── analysis-result.json       # Analysis metadata
└── frame-diff-data.json      # Cached similarity data
```

## Examples

### Extract Specific Time Range

```typescript
import { extractUniqueFrames } from 'videostil';

// Extract 30 seconds starting at 1 minute
const result = await extractUniqueFrames({
  videoUrl: 'video.mp4',
  startTime: 60,
  duration: 30,
  fps: 30
});
```

### Use Different Algorithms

```typescript
import { extractUniqueFrames } from 'videostil';

// Try each algorithm and compare results
const algorithms = ['gd', 'dp', 'sw'] as const;

for (const algo of algorithms) {
  const result = await extractUniqueFrames({
    videoUrl: 'video.mp4',
    algo,
    threshold: 0.01
  });

  console.log(`${algo}: ${result.uniqueFrames.length} unique frames`);
}
```

### Custom Working Directory

```typescript
import { extractUniqueFrames } from 'videostil';
import path from 'path';

const result = await extractUniqueFrames({
  videoUrl: 'video.mp4',
  workingDir: path.join(process.cwd(), 'my-frames')
});
```

### Analysis Viewer Server

```typescript
import { startAnalysisServer } from 'videostil';

// Start server with custom options
const server = await startAnalysisServer({
  port: 8080,
  host: '0.0.0.0',
  openBrowser: false
});

console.log(`Analysis viewer: ${server.url}`);

// Close server when done
await server.close();
```

### LLM Frame Analysis

```typescript
import { extractUniqueFrames, analyseFrames } from 'videostil';

// First extract frames
const result = await extractUniqueFrames({
  videoUrl: 'video.mp4',
  fps: 25,
  threshold: 0.01
});

// Analyze with Claude
const analysis = await analyseFrames({
  selectedModel: 'claude-sonnet-4-20250514',
  workingDirectory: result.uniqueFramesDir,
  frameBatch: result.uniqueFrames.map(frame => ({
    name: frame.fileName,
    contentType: 'image/png',
    base64Data: frame.base64
  })),
  systemPrompt: 'Analyze these video frames for key events and transitions.',
  initialUserPrompt: 'What are the main scenes in this video?'
});

console.log(analysis.analysis);
```

## Contributing

Contributions are welcome! Please see the [GitHub repository](https://github.com/empirical-run/videostil) for guidelines.

## License

MIT

## Links

- [GitHub Repository](https://github.com/empirical-run/videostil)
- [Issue Tracker](https://github.com/empirical-run/videostil/issues)
- [NPM Package](https://www.npmjs.com/package/videostil)
