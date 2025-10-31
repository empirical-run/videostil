import path from "node:path";
import fs from "node:fs";
import { extractUniqueFrames, startServer, analyseFrames } from "..";
import { checkApiKeys } from "../utils/api-keys";
import type { Attachment } from "../agent/types";
import type { DefaultCommandOptions } from "./types";
import { createHashBasedOnParams, formatTimestampToSeconds } from "../utils";

export async function defaultCommand(
  videoUrl: string,
  options: DefaultCommandOptions,
) {
  console.log("Starting videostil...\n");

  const extractOptions = {
    videoUrl,
    fps: Number.parseInt(options.fps, 10),
    threshold: Number.parseFloat(options.threshold),
    ...(options.start
      ? { startTime: formatTimestampToSeconds(options.start) }
      : { startTime: 0 }),
    ...(options.duration && {
      duration: Number.parseFloat(options.duration),
    }),
    ...(options.output && { workingDir: options.output }),
  };

  const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
  const videostilRoot = path.join(homeDir, ".videostil");
  const videoAnalysisHash = createHashBasedOnParams(videoUrl, extractOptions);
  const workingDir = path.join(videostilRoot, videoAnalysisHash);

  const result = await extractUniqueFrames({
    ...extractOptions,
    workingDir,
  });

  console.log("\n✓ Frame extraction complete!\n");
  console.log(`Total frames extracted: ${result.totalFramesCount}`);
  console.log(
    `Unique frames after deduplication: ${result.uniqueFrames.length}`,
  );
  console.log(`Video duration: ${result.videoDurationSeconds.toFixed(2)}s`);
  console.log(`Output directory: ${result.uniqueFramesDir}\n`);

  if (result.uniqueFrames.length > 5) {
    console.log(`  ... and ${result.uniqueFrames.length - 5} more frames`);
  }

  const { hasKeys } = checkApiKeys();
  if (hasKeys) {
    console.log("\n🤖 Analyzing frames with LLM...\n");

    try {
      const frameBatch: Attachment[] = result.uniqueFrames.map((frame) => ({
        name: frame.fileName,
        contentType: "image/png",
        base64Data: frame.base64,
      }));

      console.log(`Preparing ${frameBatch.length} frames for LLM analysis...`);
      const analysisResult = await analyseFrames({
        selectedModel: options.model as any,
        frameBatch,
        systemPrompt: options.systemPrompt,
        initialUserPrompt: options.userPrompt,
        apiKeys: {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
      });

      console.log("\n✓ Frame analysis complete!\n");

      console.log(analysisResult.analysis);

      try {
        const analysisFilePath = path.join(
          result.uniqueFramesDir,
          "..",
          "analysis-result.json",
        );

        let existingData: any = {};
        try {
          const fileContent = await fs.promises.readFile(
            analysisFilePath,
            "utf8",
          );
          existingData = JSON.parse(fileContent);
        } catch (readError) {
          console.warn(
            "Could not read existing analysis-result.json, creating new one",
          );
        }

        const interleavedToolResult: any[] = [];

        for (const section of analysisResult.parsedXml) {
          interleavedToolResult.push({
            type: "text",
            text: JSON.stringify({
              key_frame: section.key_frame,
              description: section.description,
            }),
          });

          const frameNumberMatch = section.key_frame.match(/frame_(\d+)/);
          const frameIndex =
            frameNumberMatch && frameNumberMatch[1]
              ? parseInt(frameNumberMatch[1], 10)
              : null;

          if (frameIndex !== null) {
            const matchingFrame = result.uniqueFrames.find(
              (frame) => frame.index === frameIndex,
            );

            if (matchingFrame && matchingFrame.base64) {
              const imageDataUrl = `data:image/png;base64,${matchingFrame.base64}`;
              interleavedToolResult.push({
                type: "image/png",
                url: imageDataUrl,
              });
            }
          }
        }

        const updatedData = {
          ...existingData,
          analysis: analysisResult.analysis,
          all_messages: analysisResult.allMessages,
          interleaved_tool_result: interleavedToolResult,
          analysis_timestamp: new Date().toISOString(),
        };

        await fs.promises.writeFile(
          analysisFilePath,
          JSON.stringify(updatedData, null, 2),
          "utf8",
        );

        console.log(`\n✓ LLM analysis saved to: ${analysisFilePath}`);
      } catch (saveError: any) {
        console.error(`\n⚠ Failed to save LLM analysis: ${saveError.message}`);
      }
    } catch (error: any) {
      console.error("\n⚠ Frame analysis failed:", error.message);
      console.log("Continuing without analysis...\n");
    }
  } else {
    console.log(
      "\n⚠ Skipping frame analysis - no API keys found. Set ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY to enable.\n",
    );
  }

  if (options.serve) {
    console.log("\nStarting analysis viewer...");

    try {
      const handle = await startServer();
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
}
