import { describe, it, expect } from "vitest";
import {
  getSubjectScores,
  getSubjectAverageAnswers,
  getSimilarityPercentage,
  getGrade,
  getSimilarAndDifferent,
  getQuestionStats,
} from "./utils";
import type { SurveyRating } from "./api";

const mockData: SurveyRating[] = [
  {
    rater: "Alice",
    subject: "Bob",
    q1: 100,
    q2: 100,
    q3: 100,
    q4: 100,
    q5: 100,
    q6: 100,
    q7: 100,
    q8: 100,
    q9: 100,
    q10: 100,
    q11: 100,
    q12: 100,
    q13: 100,
    q14: 100,
    q15: 100,
  },
  {
    rater: "Charlie",
    subject: "Bob",
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0,
    q6: 0,
    q7: 0,
    q8: 0,
    q9: 0,
    q10: 0,
    q11: 0,
    q12: 0,
    q13: 0,
    q14: 0,
    q15: 0,
  },
  {
    rater: "Alice",
    subject: "Alice",
    q1: 50,
    q2: 50,
    q3: 50,
    q4: 50,
    q5: 50,
    q6: 50,
    q7: 50,
    q8: 50,
    q9: 50,
    q10: 50,
    q11: 50,
    q12: 50,
    q13: 50,
    q14: 50,
    q15: 50,
  },
];

describe("utils", () => {
  describe("getSubjectScores", () => {
    it("should calculate correct dimension scores including inverted ones", () => {
      const scores = getSubjectScores("Bob", mockData);

      // Bob has one rating of all 100s, one rating of all 0s. Average is 50 for all raw answers.
      // Inverted dimensions (Neuroticism, Agreeableness) will be 100 - 50 = 50.
      expect(scores).toHaveLength(5);
      scores.forEach((s) => {
        expect(s.score).toBe(50);
      });
    });

    it("should correctly handle inverted dimensions for extreme values", () => {
      const extremeData: SurveyRating[] = [
        {
          rater: "Dave",
          subject: "Dave",
          q1: 100,
          q2: 100,
          q3: 100,
          q4: 100,
          q5: 100,
          q6: 100,
          q7: 100,
          q8: 100,
          q9: 100,
          q10: 100,
          q11: 100,
          q12: 100,
          q13: 100,
          q14: 100,
          q15: 100,
        },
      ];
      const scores = getSubjectScores("Dave", extremeData);
      const agreeableness = scores.find(
        (s) => s.dimension === "Agreeableness",
      )?.score;
      const neuroticism = scores.find(
        (s) => s.dimension === "Neuroticism",
      )?.score;
      const openness = scores.find((s) => s.dimension === "Openness")?.score;

      expect(openness).toBe(100);
      expect(agreeableness).toBe(0); // Inverted from 100
      expect(neuroticism).toBe(0); // Inverted from 100
    });

    it("should return empty array for unknown subject", () => {
      expect(getSubjectScores("Unknown", mockData)).toEqual([]);
    });
  });

  describe("getSubjectAverageAnswers", () => {
    it("should average multiple ratings correctly", () => {
      const averages = getSubjectAverageAnswers("Bob", mockData);
      expect(averages).toHaveLength(15);
      averages.forEach((avg) => expect(avg).toBe(50));
    });

    it("should handle single ratings correctly", () => {
      const averages = getSubjectAverageAnswers("Alice", mockData);
      averages.forEach((avg) => expect(avg).toBe(50));
    });

    it("should return array of 50s for unknown subject", () => {
      const averages = getSubjectAverageAnswers("Unknown", mockData);
      averages.forEach((avg) => expect(avg).toBe(50));
    });
  });

  describe("getSimilarityPercentage", () => {
    it("should return 100 for identical answers", () => {
      const a = new Array(15).fill(50);
      const b = new Array(15).fill(50);
      expect(getSimilarityPercentage(a, b)).toBe(100);
    });

    it("should return 0 for completely opposite answers", () => {
      const a = new Array(15).fill(100);
      const b = new Array(15).fill(0);
      expect(getSimilarityPercentage(a, b)).toBe(0);
    });

    it("should calculate correctly for partial differences", () => {
      const a = new Array(15).fill(50);
      const b = new Array(15).fill(60); // Difference of 10 per question = 150 total
      // 150 / 1500 = 10% difference => 90% similarity
      expect(getSimilarityPercentage(a, b)).toBe(90);
    });
  });

  describe("getGrade", () => {
    it("should assign correct grades", () => {
      expect(getGrade(95)).toBe("A");
      expect(getGrade(90)).toBe("A");
      expect(getGrade(85)).toBe("B");
      expect(getGrade(79)).toBe("C");
      expect(getGrade(60)).toBe("D");
      expect(getGrade(59)).toBe("F");
      expect(getGrade(0)).toBe("F");
    });
  });

  describe("getSimilarAndDifferent", () => {
    it("should identify most and least similar subjects", () => {
      const subjectsArray = [
        { subject: "Alice" },
        { subject: "Bob" },
        { subject: "Charlie" },
        { subject: "Dave" },
      ];
      const allAverages = new Map([
        ["Alice", new Array(15).fill(50)],
        ["Bob", new Array(15).fill(55)], // 95% similar to Alice
        ["Charlie", new Array(15).fill(100)], // 50% similar to Alice
        ["Dave", new Array(15).fill(25)], // 75% similar to Alice
      ]);

      const result = getSimilarAndDifferent(
        "Alice",
        subjectsArray,
        allAverages,
      );
      expect(result).not.toBeNull();

      // Sorted by similarity descending
      expect(result?.mostSimilar[0].subject).toBe("Bob");
      expect(result?.mostSimilar[0].similarity).toBe(95);

      expect(result?.leastSimilar[0].subject).toBe("Charlie");
      expect(result?.leastSimilar[0].similarity).toBe(50);
    });

    it("should return null if there are less than 2 other subjects", () => {
      const subjectsArray = [{ subject: "Alice" }, { subject: "Bob" }];
      const allAverages = new Map([
        ["Alice", new Array(15).fill(50)],
        ["Bob", new Array(15).fill(55)],
      ]);

      const result = getSimilarAndDifferent(
        "Alice",
        subjectsArray,
        allAverages,
      );
      expect(result).toBeNull();
    });
  });

  describe("getQuestionStats", () => {
    it("should calculate correct stats for a spread of answers", () => {
      const answers = [0, 50, 100];
      const stats = getQuestionStats(answers);

      expect(stats.avg).toBe(50);
      expect(stats.median).toBe(50);
      // Variance = ((0-50)^2 + (50-50)^2 + (100-50)^2) / 3 = (2500 + 0 + 2500) / 3 = 1666.66
      // StdDev = sqrt(1666.66) = 41
      expect(stats.stdDev).toBe(41);
      expect(stats.polarization).toBe("High (Polarized)");

      expect(stats.bins[0]).toBe(1); // 0
      expect(stats.bins[5]).toBe(1); // 50
      expect(stats.bins[9]).toBe(1); // 100
    });

    it("should calculate correct stats for consensus answers", () => {
      const answers = [50, 52, 48];
      const stats = getQuestionStats(answers);

      expect(stats.avg).toBe(50);
      expect(stats.median).toBe(50);
      // Variance = ((50-50)^2 + (52-50)^2 + (48-50)^2) / 3 = (0 + 4 + 4) / 3 = 2.66
      // StdDev = sqrt(2.66) = 2
      expect(stats.stdDev).toBe(2);
      expect(stats.polarization).toBe("Low (Consensus)");
    });
  });
});
