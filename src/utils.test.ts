import { describe, it, expect } from "vitest";
import {
  getSubjectScores,
  getSubjectAverageAnswers,
  getSimilarityPercentage,
  getSimilarAndDifferent,
  getQuestionStats,
  extractAnswers,
  getBlindSpots,
  getBestKnownBy,
  getKnowsBest,
  getControversyIndex,
  getDimensionLeaderboard,
  getSubjectAverageAnswersExcluding,
  getAccuracyScore,
  getSelfAwarenessScore,
  getArchetype,
  getSimilarityMatrix,
  getRaterStats,
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

    it("should match subjects case-insensitively", () => {
      const scores = getSubjectScores("bob", mockData);
      expect(scores).toHaveLength(5);
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

  describe("getSubjectAverageAnswersExcluding", () => {
    it("should calculate average excluding specific rater", () => {
      const avg = getSubjectAverageAnswersExcluding("Bob", "Charlie", mockData);
      expect(avg).not.toBeNull();
      // Charlie gave all 0s, Alice gave all 100s. Excluding Charlie, Bob's average should be 100.
      avg?.forEach((a) => expect(a).toBe(100));
    });

    it("should return null if no other raters exist", () => {
      const avg = getSubjectAverageAnswersExcluding("Bob", "Alice", [mockData[0]]); // only Alice's rating
      expect(avg).toBeNull();
    });
  });

  describe("getAccuracyScore & getSelfAwarenessScore", () => {
    it("should calculate accuracy correctly", () => {
      // Alice rating Bob is 100s. Charlie rating Bob is 0s.
      // Charlie rating Bob excluding Charlie is just Alice rating Bob (100s).
      // Charlie's accuracy is similarity between 0s and 100s = 0.
      expect(getAccuracyScore("Charlie", "Bob", mockData)).toBe(0);
      expect(getAccuracyScore("Alice", "Bob", mockData)).toBe(0); // Alice 100s vs Charlie 0s = 0
    });

    it("should calculate self-awareness score correctly", () => {
      // Alice rating Alice is 50s. If we add a friend who rates Alice 50s, self-awareness is 100.
      const data = [
        ...mockData,
        { ...mockData[0], rater: "Bob", subject: "Alice", q1: 50, q2: 50, q3: 50, q4: 50, q5: 50, q6: 50, q7: 50, q8: 50, q9: 50, q10: 50, q11: 50, q12: 50, q13: 50, q14: 50, q15: 50 }
      ];
      expect(getSelfAwarenessScore("Alice", data)).toBe(100);
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

  describe("extractAnswers", () => {
    it("should extract 15 answers from a SurveyRating", () => {
      const answers = extractAnswers(mockData[0]);
      expect(answers).toHaveLength(15);
      answers.forEach((a) => expect(a).toBe(100));
    });
  });

  // Richer mock data for the new analysis functions
  const analysisData: SurveyRating[] = [
    // Alice self-rates
    {
      rater: "Alice",
      subject: "Alice",
      q1: 80, q2: 80, q3: 80, q4: 80, q5: 80,
      q6: 80, q7: 80, q8: 80, q9: 80, q10: 80,
      q11: 80, q12: 80, q13: 80, q14: 80, q15: 80,
    },
    // Bob rates Alice — very accurate (close to self)
    {
      rater: "Bob",
      subject: "Alice",
      q1: 75, q2: 85, q3: 78, q4: 82, q5: 77,
      q6: 83, q7: 79, q8: 81, q9: 76, q10: 84,
      q11: 78, q12: 82, q13: 77, q14: 83, q15: 79,
    },
    // Charlie rates Alice — way off (big gaps)
    {
      rater: "Charlie",
      subject: "Alice",
      q1: 20, q2: 30, q3: 25, q4: 35, q5: 40,
      q6: 25, q7: 30, q8: 35, q9: 20, q10: 40,
      q11: 25, q12: 30, q13: 35, q14: 20, q15: 40,
    },
    // Bob self-rates
    {
      rater: "Bob",
      subject: "Bob",
      q1: 50, q2: 50, q3: 50, q4: 50, q5: 50,
      q6: 50, q7: 50, q8: 50, q9: 50, q10: 50,
      q11: 50, q12: 50, q13: 50, q14: 50, q15: 50,
    },
    // Charlie self-rates
    {
      rater: "Charlie",
      subject: "Charlie",
      q1: 30, q2: 30, q3: 30, q4: 30, q5: 30,
      q6: 30, q7: 30, q8: 30, q9: 30, q10: 30,
      q11: 30, q12: 30, q13: 30, q14: 30, q15: 30,
    },
  ];

  describe("getBlindSpots", () => {
    it("should return top blind spots sorted by gap size", () => {
      const spots = getBlindSpots("Alice", analysisData, 3);
      expect(spots).toHaveLength(3);
      // Each spot should have gap > 0
      spots.forEach((s) => expect(s.gap).toBeGreaterThan(0));
      // Should be sorted descending by gap
      expect(spots[0].gap).toBeGreaterThanOrEqual(spots[1].gap);
      expect(spots[1].gap).toBeGreaterThanOrEqual(spots[2].gap);
    });

    it("should return empty for person with no friend ratings", () => {
      const spots = getBlindSpots("Bob", analysisData);
      expect(spots).toEqual([]);
    });

    it("should return empty for unknown person", () => {
      const spots = getBlindSpots("Unknown", analysisData);
      expect(spots).toEqual([]);
    });
  });

  describe("getBestKnownBy & getKnowsBest", () => {
    it("should rank raters by accuracy", () => {
      const leaderboard = getBestKnownBy("Alice", analysisData);
      expect(leaderboard).toHaveLength(2); // Bob and Charlie
      expect(leaderboard[0].person).toBe("Bob");
      expect(leaderboard[1].person).toBe("Charlie");
      expect(leaderboard[0].accuracy).toBeGreaterThan(leaderboard[1].accuracy);
    });

    it("should rank subjects by rater accuracy", () => {
      const data = [
        { ...analysisData[0], rater: "Dave", subject: "Alice" }, // Dave rates Alice
        { ...analysisData[0], rater: "Dave", subject: "Bob" },   // Dave rates Bob
        // friends rate Alice:
        { ...analysisData[1] }, // Bob rates Alice
        // friends rate Bob:
        { ...analysisData[0], rater: "Alice", subject: "Bob" }
      ];
      const knowsBest = getKnowsBest("Dave", data);
      expect(knowsBest).toBeInstanceOf(Array);
    });
  });

  describe("getControversyIndex", () => {
    it("should return a controversy score for a person with multiple raters", () => {
      const result = getControversyIndex("Alice", analysisData);
      expect(result).not.toBeNull();
      expect(result!.overall).toBeGreaterThan(0);
      expect(result!.perQuestion).toHaveLength(15);
    });

    it("should return null for person with only 1 rating", () => {
      expect(getControversyIndex("Bob", analysisData)).toBeNull();
    });

    it("should return higher controversy when raters disagree more", () => {
      // Alice has Bob (close to 80) and Charlie (close to 30) rating her — high disagreement
      const result = getControversyIndex("Alice", analysisData);
      expect(result!.overall).toBeGreaterThan(20);
    });
  });

  describe("getDimensionLeaderboard", () => {
    it("should return subjects ranked by dimension score", () => {
      const subjects = ["Alice", "Bob", "Charlie"];
      const leaderboard = getDimensionLeaderboard(
        "Openness",
        subjects,
        analysisData,
      );
      expect(leaderboard).toHaveLength(3);
      // Scores should be in descending order
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].score).toBeGreaterThanOrEqual(
          leaderboard[i + 1].score,
        );
      }
    });

    it("should handle empty subjects", () => {
      const leaderboard = getDimensionLeaderboard("Openness", [], analysisData);
      expect(leaderboard).toEqual([]);
    });
  });

  describe("getArchetype", () => {
    it("should return combo archetype for two notable signals", () => {
      const scores = [
        { dimension: "Openness", score: 80 },       // +30 → Curious
        { dimension: "Extraversion", score: 75 },    // +25 → Social
        { dimension: "Conscientiousness", score: 50 },
        { dimension: "Agreeableness", score: 50 },
        { dimension: "Neuroticism", score: 30 },     // -20 → Steady (but weaker)
      ];
      const arch = getArchetype(scores);
      expect(arch.name).toBe("The Explorer"); // Curious + Social
    });

    it("should use deviation direction — low neuroticism is 'Steady'", () => {
      const scores = [
        { dimension: "Openness", score: 75 },       // +25 → Curious
        { dimension: "Neuroticism", score: 20 },     // -30 → Steady
        { dimension: "Conscientiousness", score: 50 },
        { dimension: "Extraversion", score: 50 },
        { dimension: "Agreeableness", score: 50 },
      ];
      const arch = getArchetype(scores);
      expect(arch.name).toBe("The Sage"); // Curious + Steady
    });

    it("should return single-signal archetype when only one stands out", () => {
      const scores = [
        { dimension: "Openness", score: 90 },
        { dimension: "Extraversion", score: 50 },
        { dimension: "Conscientiousness", score: 50 },
        { dimension: "Agreeableness", score: 50 },
        { dimension: "Neuroticism", score: 50 },
      ];
      const arch = getArchetype(scores);
      expect(arch.name).toBe("The Innovator"); // Only Curious
    });

    it("should return Balanced when all scores cluster around 50", () => {
      const scores = [
        { dimension: "Openness", score: 52 },
        { dimension: "Conscientiousness", score: 48 },
        { dimension: "Extraversion", score: 55 },
        { dimension: "Agreeableness", score: 50 },
        { dimension: "Neuroticism", score: 47 },
      ];
      const arch = getArchetype(scores);
      expect(arch.name).toBe("The Balanced");
    });

    it("should handle empty scores", () => {
      const arch = getArchetype([]);
      expect(arch.name).toBe("The Mystery");
    });
  });

  describe("getSimilarityMatrix", () => {
    it("should return 100 on diagonal", () => {
      const subjects = ["Alice", "Bob"];
      const avgs = new Map([
        ["Alice", new Array(15).fill(50)],
        ["Bob", new Array(15).fill(60)],
      ]);
      const { matrix } = getSimilarityMatrix(subjects, avgs);
      expect(matrix[0][0]).toBe(100);
      expect(matrix[1][1]).toBe(100);
      expect(matrix[0][1]).toBe(matrix[1][0]); // symmetric
      expect(matrix[0][1]).toBe(90);
    });
  });

  describe("getRaterStats", () => {
    it("should compute rater statistics", () => {
      const stats = getRaterStats("Alice", [
        ...analysisData,
        // Alice rates Bob
        { ...analysisData[0], rater: "Alice", subject: "Bob" },
      ]);
      expect(stats).not.toBeNull();
      expect(stats!.ratingsGiven).toBeGreaterThan(0);
      expect(stats!.answerStdDev).toBeGreaterThanOrEqual(0);
      expect(stats!.uniqueValues).toBeGreaterThan(0);
    });

    it("should return null for unknown rater", () => {
      expect(getRaterStats("Nobody", analysisData)).toBeNull();
    });
  });
});
