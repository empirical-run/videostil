#!/usr/bin/env node

import { extractUniqueFrames, serve } from "./index.js";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
videostil - Extract and deduplicate video frames for LLMs

Usage:
  videostil <video-url> [options]
  videostil serve [options]

Commands:
  <video-url>           Extract frames from video (default command)
  serve                 Start analysis viewer (browses all analyses from ~/.videostil/)

Extraction Options:
  --fps <number>        Frames per second (default: 30)
  --threshold <number>  Deduplication threshold (default: 0.001)
  --algo <string>       Algorithm: gd|dp|sw (default: gd)
  --start <seconds>     Start time in video
  --duration <seconds>  Duration to extract
  --output <dir>        Output directory
  --no-serve           Don't start viewer after extraction

Server Options:
  --port <number>       Server port (default: 63745)
  --host <string>       Server host (default: 127.0.0.1)
  --no-open            Don't open browser automatically

Global Options:
  --help, -h           Show this help
  --version, -v        Show version

Examples:
  videostil https://example.com/video.mp4
  videostil video.mp4 --fps 20 --threshold 0.01 --algo dp
  videostil video.mp4 --start 30 --duration 60 --no-serve
  videostil serve
  videostil serve --port 8080 --no-open

Requirements:
  ffmpeg and ffprobe must be installed on your system
  `);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  const pkg = require("../package.json");
  console.log(`videostil v${pkg.version}`);
  process.exit(0);
}

// Handle serve command
if (args[0] === "serve") {
  // Parse serve options
  const serveOptions: any = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--port" && next) {
      serveOptions.port = parseInt(next, 10);
      i++;
    } else if (arg === "--host" && next) {
      serveOptions.host = next;
      i++;
    } else if (arg === "--no-open") {
      serveOptions.openBrowser = false;
    }
  }

  serve(serveOptions)
    .then((handle) => {
      console.log("Press Ctrl+C to stop the server\n");

      // Keep process alive
      process.on("SIGINT", async () => {
        console.log("\n\nStopping server...");
        await handle.close();
        console.log("Server stopped");
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error("\n✗ Error:", error.message);
      process.exit(1);
    });
} else {
  // Handle extract command (default)
  const videoUrl = args[0];
  if (!videoUrl) {
    console.error("Error: Video URL or path is required");
    process.exit(1);
  }

  // Parse extract options
  const options: any = { videoUrl };
  let shouldServe = true;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--fps" && next) {
      options.fps = parseInt(next, 10);
      i++;
    } else if (arg === "--threshold" && next) {
      options.threshold = parseFloat(next);
      i++;
    } else if (arg === "--algo" && next) {
      options.algo = next;
      i++;
    } else if (arg === "--start" && next) {
      options.startTime = parseInt(next, 10);
      i++;
    } else if (arg === "--duration" && next) {
      options.duration = parseInt(next, 10);
      i++;
    } else if (arg === "--output" && next) {
      options.workingDir = next;
      i++;
    } else if (arg === "--no-serve") {
      shouldServe = false;
    }
  }

  console.log("Starting videostil...\n");

  extractUniqueFrames(options)
    .then(async (result) => {
      console.log("\n✓ Frame extraction complete!\n");
      console.log(`Total frames extracted: ${result.totalFramesCount}`);
      console.log(
        `Unique frames after deduplication: ${result.uniqueFrames.length}`,
      );
      console.log(`Video duration: ${result.videoDurationSeconds.toFixed(2)}s`);
      console.log(`Output directory: ${result.uniqueFramesDir}\n`);

      console.log("Sample frames:");
      result.uniqueFrames.slice(0, 5).forEach((frame) => {
        console.log(
          `  - Frame ${frame.index} (${frame.timestamp}): ${frame.fileName}`,
        );
      });

      if (result.uniqueFrames.length > 5) {
        console.log(`  ... and ${result.uniqueFrames.length - 5} more frames`);
      }

      // Start server if requested
      if (shouldServe) {
        console.log("\nStarting analysis viewer...");

        try {
          const handle = await serve();
          console.log("Press Ctrl+C to stop the server\n");

          process.on("SIGINT", async () => {
            console.log("\n\nStopping server...");
            await handle.close();
            console.log("Server stopped");
            process.exit(0);
          });
        } catch (error: any) {
          console.error("Could not start server:", error.message);
          console.log("You can manually start the server later with:");
          console.log(`  videostil serve`);
        }
      }
    })
    .catch((error) => {
      console.error("\n✗ Error:", error.message);
      process.exit(1);
    });
}
