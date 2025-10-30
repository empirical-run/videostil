#!/usr/bin/env node

import { Command } from "commander";
import { startServer } from "..";
import { defaultCommand } from "./default";
import type { DefaultCommandOptions, ServeCommandOptions } from "./types";

const pkg = require("../../package.json");

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


program
  .argument("<video-url>", "Video URL or path to extract frames from")
  .option("--fps <number>", "Frames per second", "25")
  .option("--threshold <number>", "Deduplication threshold", "0.01")
  .option("--start <MM:SS>", "Start time in video (format: MM:SS, e.g., 1:30)")
  .option("--duration <seconds>", "Duration to extract in seconds")
  .option("--output <dir>", "Output directory")
  .option("--no-serve", "Don't start viewer after extraction")
  .option("--model <string>", "LLM model to use for analysis")
  .option("--system-prompt <string>")
  .option("--user-prompt <string>")
  .action(async (videoUrl: string, options: DefaultCommandOptions) => {
    try {
      await defaultCommand(videoUrl, options);
    } catch (error: any) {
      console.error("\n✗ Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("serve")
  .description(
    "Start analysis viewer (browses all analyses from ~/.videostil/)",
  )
  .option("--port <number>", "Server port", "63745")
  .option("--host <string>", "Server host", "127.0.0.1")
  .option("--no-open", "Don't open browser automatically")
  .action(async (options: ServeCommandOptions) => {
    try {
      const serveOptions = {
        port: Number.parseInt(options.port, 10),
        host: options.host,
        openBrowser: options.open,
      };

      const handle = await startServer(serveOptions);
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
