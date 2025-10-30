import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Gets the package version from package.json
 * @returns Package version string (e.g., "0.2.3")
 */
export function getPackageVersion(): string {
  try {
    const packageJsonPath = join(__dirname, "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version || "unknown";
  } catch (error) {
    console.warn("Could not read package version:", error);
    return "unknown";
  }
}
