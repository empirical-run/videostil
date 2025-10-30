/**
 * Converts a time string in MM:SS format to seconds
 * Also supports legacy numeric format (seconds as number) with deprecation warning
 * @param timeString - Time in format "MM:SS" (e.g., "1:23" or "01:23") or numeric seconds (deprecated)
 * @returns Time in seconds
 * @throws Error if format is invalid
 */
export function timeStringToSeconds(timeString: string | number): number {
  // Handle legacy numeric format (deprecated)
  if (typeof timeString === "number") {
    console.warn(
      "⚠️  DEPRECATED: Passing numeric seconds for time values is deprecated. Please use MM:SS format (e.g., '1:30' instead of 90)."
    );
    return timeString;
  }

  // Check for negative sign
  if (timeString.includes("-")) {
    throw new Error(
      `Invalid time format: "${timeString}". Minutes and seconds cannot be negative`
    );
  }

  const parts = timeString.split(":");

  if (parts.length !== 2) {
    throw new Error(
      `Invalid time format: "${timeString}". Expected format is MM:SS (e.g., "1:23" or "01:23")`
    );
  }

  const minutes = parseInt(parts[0]!, 10);
  const seconds = parseInt(parts[1]!, 10);

  if (isNaN(minutes) || isNaN(seconds)) {
    throw new Error(
      `Invalid time format: "${timeString}". Minutes and seconds must be numbers`
    );
  }

  if (minutes < 0 || seconds < 0) {
    throw new Error(
      `Invalid time format: "${timeString}". Minutes and seconds cannot be negative`
    );
  }

  if (seconds >= 60) {
    throw new Error(
      `Invalid time format: "${timeString}". Seconds must be less than 60`
    );
  }

  return minutes * 60 + seconds;
}

/**
 * Converts seconds to a time string in MM:SS format
 * @param seconds - Time in seconds
 * @returns Time in format "M:SS" (e.g., "1:23" or "12:34")
 */
export function secondsToTimeString(seconds: number): string {
  if (seconds < 0) {
    throw new Error("Seconds cannot be negative");
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
