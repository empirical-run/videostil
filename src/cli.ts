#!/usr/bin/env node

import { Command } from "commander";
import { extractUniqueFrames, serve } from ".";

const pkg = require("../package.json");

const program = new Command();

program
  .name("videostil")
  .description("Extract and deduplicate video frames for LLMs")
  .version(pkg.version, "-v, --version", "Show version")
  .addHelpText(
    "after",
    `
Requirements:
  ffmpeg and ffprobe must be installed on your system
  `,
  );

// Default extract command
program
  .argument("<video-url>", "Video URL or path to extract frames from")
  .option("--fps <number>", "Frames per second", "30")
  .option("--threshold <number>", "Deduplication threshold", "0.001")
  .option("--algo <string>", "Algorithm: gd|dp|sw", "gd")
  .option("--start <seconds>", "Start time in video")
  .option("--duration <seconds>", "Duration to extract")
  .option("--output <dir>", "Output directory")
  .option("--no-serve", "Don't start viewer after extraction")
  .action(async (videoUrl, options) => {
    try {
      console.log("Starting videostil...\n");

      const extractOptions = {
        videoUrl,
        fps: Number.parseInt(options.fps, 10),
        threshold: Number.parseFloat(options.threshold),
        algo: options.algo,
        ...(options.start && { startTime: Number.parseInt(options.start, 10) }),
        ...(options.duration && {
          duration: Number.parseInt(options.duration, 10),
        }),
        ...(options.output && { workingDir: options.output }),
      };

      const result = await extractUniqueFrames(extractOptions);

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
      if (options.serve) {
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
          console.log("  videostil serve");
        }
      }
    } catch (error: any) {
      console.error("\n✗ Error:", error.message);
      process.exit(1);
    }
  });

// Serve command
program
  .command("serve")
  .description("Start analysis viewer (browses all analyses from ~/.videostil/)")
  .option("--port <number>", "Server port", "63745")
  .option("--host <string>", "Server host", "127.0.0.1")
  .option("--no-open", "Don't open browser automatically")
  .action(async (options) => {
    try {
      const serveOptions = {
        port: Number.parseInt(options.port, 10),
        host: options.host,
        openBrowser: options.open,
      };

      const handle = await serve(serveOptions);
      console.log("Press Ctrl+C to stop the server\n");

      process.on("SIGINT", async () => {
        console.log("\n\nStopping server...");
        await handle.close();
        console.log("Server stopped");
        process.exit(0);
      });
    } catch (error: any) {
      console.error("\n✗ Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
