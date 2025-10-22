import fs from "fs";
import http from "http";
import path from "path";
import { URL } from "url";
import { compareImageBuffers } from "../utils/image-comparison.js";

export type ServerOptions = {
  port?: number;
  host?: string;
  openBrowser?: boolean;
  /** Custom working directory. If provided, server will use this as root instead of ~/.videostil */
  workingDir?: string;
};

export type ServerHandle = {
  url: string;
  port: number;
  host: string;
  server: http.Server;
  close: () => Promise<void>;
};

type AnalysisDirectory = {
  id: string;
  name: string;
  path: string;
  data: AnalysisData;
  modifiedTime: Date;
};

type AnalysisData = {
  unique_frames_count: number;
  video_url: string;
  analysis: string;
  analysis_id: string;
  params: any;
  unique_frames: any[];
  videoDurationSeconds?: number;
};

async function discoverAnalysisDirectories(
  rootPath: string,
): Promise<AnalysisDirectory[]> {
  const analyses: AnalysisDirectory[] = [];

  try {
    await fs.promises.access(rootPath);
    const entries = await fs.promises.readdir(rootPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(rootPath, entry.name);
        const analysisFilePath = path.join(dirPath, "analysis-result.json");

        try {
          await fs.promises.access(analysisFilePath);
          const fileData = await fs.promises.readFile(analysisFilePath, "utf8");
          const analysisData = JSON.parse(fileData) as AnalysisData;
          const stat = await fs.promises.stat(analysisFilePath);

          analyses.push({
            id: entry.name,
            name: entry.name,
            path: dirPath,
            data: analysisData,
            modifiedTime: stat.mtime,
          });
        } catch (error) {
          // Skip directories without analysis-result.json
          continue;
        }
      }
    }

    // Sort by modification time, newest first
    analyses.sort(
      (a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime(),
    );
  } catch (error) {
    // Root path doesn't exist or is inaccessible
    console.log(`Warning: Could not access root path ${rootPath}`);
  }

  return analyses;
}

async function findAvailablePort(
  startPort: number,
  host: string,
): Promise<number> {
  const testPort = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close();
        resolve(true);
      });
      server.listen(port, host);
    });
  };

  let port = startPort;
  while (port < startPort + 100) {
    const available = await testPort(port);
    if (available) {
      return port;
    }
    port++;
  }

  throw new Error(
    `Could not find an available port between ${startPort} and ${startPort + 100}`,
  );
}

export async function startServer(
  options: ServerOptions = {},
): Promise<ServerHandle> {
  const host = options.host || "127.0.0.1";
  const requestedPort = options.port || 63745;

  // Find an available port if the requested one is not available
  const port = await findAvailablePort(requestedPort, host);

  // Path to Vite build output
  const viewerDistPath = path.join(__dirname, "..", "viewer");
  const htmlFilePath = path.join(viewerDistPath, "index.html");

  // Determine root path for analyses
  // If workingDir is provided, use it directly; otherwise use ~/.videostil
  const rootPath = options.workingDir
    ? path.resolve(options.workingDir)
    : path.join(
        process.env.HOME || process.env.USERPROFILE || process.cwd(),
        ".videostil",
      );

  let workingDir: string | undefined;
  let currentAnalysisId: string | undefined;

  // Verify HTML file exists
  try {
    await fs.promises.access(htmlFilePath, fs.constants.R_OK);
  } catch {
    throw new Error(`Viewer HTML file not found: ${htmlFilePath}`);
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // API endpoint to list all available analyses
    if (url.pathname === "/api/analyses" && req.method === "GET") {
      const analyses = await discoverAnalysisDirectories(rootPath);
      const analysesInfo = analyses.map((analysis) => ({
        id: analysis.id,
        name: analysis.name,
        modifiedTime: analysis.modifiedTime.toISOString(),
        video_url: analysis.data.video_url,
        analysis_id: analysis.data.analysis_id,
        unique_frames_count: analysis.data.unique_frames_count,
        params: analysis.data.params,
      }));

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(analysesInfo));
      return;
    }

    // API endpoint to get specific analysis data
    if (url.pathname === "/api/data" && req.method === "GET") {
      const analysisId = url.searchParams.get("id");

      if (analysisId) {
        const analyses = await discoverAnalysisDirectories(rootPath);
        const analysis = analyses.find((a) => a.id === analysisId);

        if (analysis) {
          workingDir = analysis.path;
          currentAnalysisId = analysisId;
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(analysis.data));
          return;
        } else {
          res.statusCode = 404;
          res.end("Analysis not found");
          return;
        }
      } else if (currentAnalysisId) {
        // Return current analysis data if no ID specified but one is already loaded
        const analyses = await discoverAnalysisDirectories(rootPath);
        const analysis = analyses.find((a) => a.id === currentAnalysisId);

        if (analysis) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(analysis.data));
          return;
        }
      }

      res.statusCode = 404;
      res.end("No analysis specified or found");
      return;
    }

    // API: Get unique frames list
    if (url.pathname === "/api/unique-frames" && req.method === "GET") {
      if (!workingDir || !currentAnalysisId) {
        res.statusCode = 404;
        res.end("No analysis loaded or working directory not found");
        return;
      }

      // Get current analysis data
      const analyses = await discoverAnalysisDirectories(rootPath);
      const analysis = analyses.find((a) => a.id === currentAnalysisId);

      if (!analysis) {
        res.statusCode = 404;
        res.end("Current analysis not found");
        return;
      }

      const uniqueFramesDir = path.join(workingDir, "unique_frames");
      const fps = analysis.data?.params?.fps || 25;

      try {
        const frameFiles = fs
          .readdirSync(uniqueFramesDir)
          .filter((f) => f.endsWith(".png"))
          .sort();

        const frameDataPromises = frameFiles.map(async (filename, index) => {
          if (!filename) return null;

          const frameNumber =
            filename.match(/frame_(\d+)/)?.[1] || String(index);
          const framePath = path.join(uniqueFramesDir, filename);

          try {
            const stat = await fs.promises.stat(framePath);

            return {
              index: parseInt(frameNumber),
              path: filename,
              fileName: filename,
              url: `/api/frame/${encodeURIComponent(filename)}`,
              timestamp: `${Math.floor(parseInt(frameNumber) / fps / 60)}m${Math.floor(
                (parseInt(frameNumber) / fps) % 60,
              )
                .toString()
                .padStart(2, "0")}s`,
              size: stat.size,
              similarityPercentage: null,
            };
          } catch (error) {
            return null;
          }
        });

        const frameDataResults = await Promise.all(frameDataPromises);
        const frameData = frameDataResults.filter((frame) => frame !== null);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(frameData));
        return;
      } catch (error) {
        res.statusCode = 500;
        res.end(
          `Error reading frames directory: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        return;
      }
    }

    // API: Serve individual frame
    if (url.pathname.startsWith("/api/frame/") && req.method === "GET") {
      if (!workingDir) {
        res.statusCode = 404;
        res.end("Working directory not found");
        return;
      }

      const filename = decodeURIComponent(
        url.pathname.substring("/api/frame/".length),
      );

      // Security checks
      if (
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\") ||
        !filename.endsWith(".png")
      ) {
        res.statusCode = 400;
        res.end("Invalid filename");
        return;
      }

      const uniqueFramesDir = path.join(workingDir, "unique_frames");
      const framePath = path.join(uniqueFramesDir, filename);

      try {
        const imageBuffer = await fs.promises.readFile(framePath);
        res.statusCode = 200;
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.end(imageBuffer);
        return;
      } catch (error) {
        res.statusCode = 404;
        res.end("Frame not found");
        return;
      }
    }

    // API: Calculate similarity between two frames
    if (url.pathname === "/api/similarity" && req.method === "GET") {
      if (!workingDir) {
        res.statusCode = 404;
        res.end("Working directory not found");
        return;
      }

      const frame1 = url.searchParams.get("frame1");
      const frame2 = url.searchParams.get("frame2");

      if (!frame1 || !frame2) {
        res.statusCode = 400;
        res.end("Missing frame1 or frame2 parameter");
        return;
      }

      // Security checks
      if (
        frame1.includes("..") ||
        frame1.includes("/") ||
        frame1.includes("\\") ||
        frame2.includes("..") ||
        frame2.includes("/") ||
        frame2.includes("\\") ||
        !frame1.endsWith(".png") ||
        !frame2.endsWith(".png")
      ) {
        res.statusCode = 400;
        res.end("Invalid filename");
        return;
      }

      const uniqueFramesDir = path.join(workingDir, "unique_frames");
      const frame1Path = path.join(uniqueFramesDir, frame1);
      const frame2Path = path.join(uniqueFramesDir, frame2);

      try {
        const [buffer1, buffer2] = await Promise.all([
          fs.promises.readFile(frame1Path),
          fs.promises.readFile(frame2Path),
        ]);

        const { diffFraction } = await compareImageBuffers(
          buffer1,
          buffer2,
          0.1,
        );

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ similarity: diffFraction }));
        return;
      } catch (error) {
        res.statusCode = 500;
        res.end("Error calculating similarity");
        return;
      }
    }

    // API: Frame diff data for graphs
    if (url.pathname === "/api/frame-diff-data" && req.method === "GET") {
      if (!workingDir || !currentAnalysisId) {
        res.statusCode = 404;
        res.end("No analysis loaded");
        return;
      }

      const diffDataFilePath = path.join(workingDir, "frame-diff-data.json");

      try {
        // Try to read cache file
        const diffData = await fs.promises.readFile(diffDataFilePath, "utf8");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(diffData);
        return;
      } catch (error) {
        // Cache file not found
        console.error("[frame-diff-data] Data file not found:", error);
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Frame diff data not found",
            message:
              "This analysis does not have a frame diff data. Please re-run videostil to generate it.",
          })
        );
        return;
      }
    }

    // Serve static assets from Vite build
    if (url.pathname.startsWith("/assets/")) {
      const assetPath = path.join(viewerDistPath, url.pathname);
      try {
        const content = await fs.promises.readFile(assetPath);

        // Set content type based on file extension
        const ext = path.extname(assetPath);
        const contentTypes: Record<string, string> = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
        };

        res.statusCode = 200;
        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        res.end(content);
        return;
      } catch (error) {
        res.statusCode = 404;
        res.end("Asset not found");
        return;
      }
    }

    // Serve the viewer HTML
    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const htmlContent = await fs.promises.readFile(htmlFilePath, "utf8");

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(htmlContent);
        return;
      } catch (error) {
        res.statusCode = 500;
        res.end("Error loading viewer");
        return;
      }
    }

    // 404 for all other routes
    res.statusCode = 404;
    res.end("Not found");
  });

  // Start server
  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.on("error", reject);
  });

  const url = `http://${host}:${port}`;

  // Notify if using a different port than requested
  if (port !== requestedPort) {
    console.log(
      `\n⚠️  Port ${requestedPort} was busy, using port ${port} instead`,
    );
  }

  console.log(`\n🚀 Analysis viewer started at: ${url}`);
  console.log(`📁 Serving analyses from: ${rootPath}\n`);

  // Open browser if requested
  if (options.openBrowser !== false) {
    try {
      const open = await import("open");
      await open.default(url);
    } catch {
      console.log(
        "Could not open browser automatically. Please visit the URL above.\n",
      );
    }
  }

  return {
    url,
    port,
    host,
    server,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}
