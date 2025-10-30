import { describe, it, expect, vi } from "vitest";
import { timeStringToSeconds, secondsToTimeString } from "./time-converter.js";

describe("timeStringToSeconds", () => {
  it("should convert MM:SS format to seconds correctly", () => {
    expect(timeStringToSeconds("0:00")).toBe(0);
    expect(timeStringToSeconds("0:30")).toBe(30);
    expect(timeStringToSeconds("1:00")).toBe(60);
    expect(timeStringToSeconds("1:23")).toBe(83);
    expect(timeStringToSeconds("5:45")).toBe(345);
    expect(timeStringToSeconds("10:05")).toBe(605);
    expect(timeStringToSeconds("123:59")).toBe(7439);
  });

  it("should handle leading zeros", () => {
    expect(timeStringToSeconds("01:23")).toBe(83);
    expect(timeStringToSeconds("00:05")).toBe(5);
  });

  it("should support legacy numeric format (deprecated)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    expect(timeStringToSeconds(0)).toBe(0);
    expect(timeStringToSeconds(30)).toBe(30);
    expect(timeStringToSeconds(90)).toBe(90);
    expect(timeStringToSeconds(123.5)).toBe(123.5);
    
    expect(warnSpy).toHaveBeenCalledTimes(4);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("DEPRECATED: Passing numeric seconds")
    );
    
    warnSpy.mockRestore();
  });

  it("should throw error for invalid format", () => {
    expect(() => timeStringToSeconds("123")).toThrow("Invalid time format");
    expect(() => timeStringToSeconds("1:2:3")).toThrow("Invalid time format");
    expect(() => timeStringToSeconds("abc:def")).toThrow("Invalid time format");
    expect(() => timeStringToSeconds("")).toThrow("Invalid time format");
  });

  it("should throw error for negative values", () => {
    expect(() => timeStringToSeconds("-1:30")).toThrow(
      "Minutes and seconds cannot be negative"
    );
    expect(() => timeStringToSeconds("1:-30")).toThrow(
      "Minutes and seconds cannot be negative"
    );
  });

  it("should throw error for seconds >= 60", () => {
    expect(() => timeStringToSeconds("1:60")).toThrow(
      "Seconds must be less than 60"
    );
    expect(() => timeStringToSeconds("1:99")).toThrow(
      "Seconds must be less than 60"
    );
  });
});

describe("secondsToTimeString", () => {
  it("should convert seconds to MM:SS format correctly", () => {
    expect(secondsToTimeString(0)).toBe("0:00");
    expect(secondsToTimeString(30)).toBe("0:30");
    expect(secondsToTimeString(60)).toBe("1:00");
    expect(secondsToTimeString(83)).toBe("1:23");
    expect(secondsToTimeString(345)).toBe("5:45");
    expect(secondsToTimeString(605)).toBe("10:05");
    expect(secondsToTimeString(7439)).toBe("123:59");
  });

  it("should handle decimal seconds by flooring", () => {
    expect(secondsToTimeString(83.7)).toBe("1:23");
    expect(secondsToTimeString(59.9)).toBe("0:59");
  });

  it("should throw error for negative seconds", () => {
    expect(() => secondsToTimeString(-1)).toThrow(
      "Seconds cannot be negative"
    );
  });
});

describe("round-trip conversion", () => {
  it("should maintain consistency when converting back and forth", () => {
    const testCases = ["0:00", "1:30", "5:45", "12:34", "99:59"];

    for (const timeString of testCases) {
      const seconds = timeStringToSeconds(timeString);
      const converted = secondsToTimeString(seconds);
      expect(converted).toBe(timeString);
    }
  });
});
