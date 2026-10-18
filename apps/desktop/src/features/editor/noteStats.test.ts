import { describe, expect, it } from "vitest";
import { countWords, countCharacters, calculateReadingTime, calculateNoteStats } from "./noteStats";

describe("noteStats", () => {
  describe("countWords", () => {
    it("returns 0 for empty string", () => {
      expect(countWords("")).toBe(0);
    });

    it("returns 0 for whitespace-only string", () => {
      expect(countWords("   ")).toBe(0);
      expect(countWords("\n\t")).toBe(0);
    });

    it("counts single word", () => {
      expect(countWords("hello")).toBe(1);
    });

    it("counts multiple words separated by spaces", () => {
      expect(countWords("hello world")).toBe(2);
    });

    it("counts words separated by various whitespace", () => {
      expect(countWords("hello\nworld")).toBe(2);
      expect(countWords("hello\tworld")).toBe(2);
      expect(countWords("hello  world")).toBe(2);
    });

    it("handles leading and trailing whitespace", () => {
      expect(countWords("  hello world  ")).toBe(2);
    });
  });

  describe("countCharacters", () => {
    it("returns 0 for empty string", () => {
      expect(countCharacters("")).toBe(0);
    });

    it("counts all characters including whitespace", () => {
      expect(countCharacters("hello world")).toBe(11);
      expect(countCharacters("  hello  ")).toBe(9);
    });

    it("counts special characters", () => {
      expect(countCharacters("hello\nworld")).toBe(11);
      expect(countCharacters("😀")).toBe(2);
    });
  });

  describe("calculateReadingTime", () => {
    it("returns at least 1 minute for 0 words", () => {
      expect(calculateReadingTime(0)).toBe(1);
    });

    it("returns 1 minute for 1 word", () => {
      expect(calculateReadingTime(1)).toBe(1);
    });

    it("returns 1 minute for 220 words", () => {
      expect(calculateReadingTime(220)).toBe(1);
    });

    it("rounds up at 221 words (2 minutes)", () => {
      expect(calculateReadingTime(221)).toBe(2);
    });

    it("rounds up correctly for larger word counts", () => {
      expect(calculateReadingTime(440)).toBe(2);
      expect(calculateReadingTime(441)).toBe(3);
      expect(calculateReadingTime(660)).toBe(3);
    });
  });

  describe("calculateNoteStats", () => {
    it("returns zeros for empty text", () => {
      const stats = calculateNoteStats("");
      expect(stats.words).toBe(0);
      expect(stats.characters).toBe(0);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it("calculates all stats correctly", () => {
      const stats = calculateNoteStats("hello world");
      expect(stats.words).toBe(2);
      expect(stats.characters).toBe(11);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it("handles multi-line text", () => {
      const stats = calculateNoteStats("line one\nline two\nline three");
      expect(stats.words).toBe(6);
      expect(stats.characters).toBe(28);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it("handles text requiring 2 minutes reading time", () => {
      const words = "word ".repeat(221).trim();
      const stats = calculateNoteStats(words);
      expect(stats.words).toBe(221);
      expect(stats.readingTimeMinutes).toBe(2);
    });
  });
});