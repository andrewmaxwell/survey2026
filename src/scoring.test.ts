import { describe, expect, it } from "vitest";
import type { SurveyRating } from "./api";
import { QUESTION_COUNT, questionKeys } from "./data";
import {
  correctRaterHabits,
  prepareAnalysisData,
  standardizeSelfAndFriends,
} from "./scoring";
import { extractAnswers, ratingFromAnswers } from "./utils";

/** Answers that vary by question so nothing is constant. */
const base = (offset: number) =>
  Array.from({ length: QUESTION_COUNT }, (_, i) => 10 + ((i * 7 + offset) % 50));

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("correctRaterHabits", () => {
  // Bob and Ann rate the same three people with the same pattern,
  // but Ann slides everything 30 points further right.
  const subjects = ["X", "Y", "Z"];
  const data: SurveyRating[] = subjects.flatMap((s, i) => [
    ratingFromAnswers("Bob", s, base(i * 5)),
    ratingFromAnswers("Ann", s, base(i * 5).map((v) => v + 30)),
  ]);

  it("closes most of the gap a lenient rater creates", () => {
    const corrected = correctRaterHabits(data);
    for (let i = 0; i < data.length; i += 2) {
      const before = mean(extractAnswers(data[i + 1])) - mean(extractAnswers(data[i]));
      const after =
        mean(extractAnswers(corrected[i + 1])) - mean(extractAnswers(corrected[i]));
      expect(before).toBeCloseTo(30);
      expect(Math.abs(after)).toBeLessThan(15);
    }
  });

  it("keeps each rater's ordering of answers", () => {
    const corrected = correctRaterHabits(data);
    corrected.forEach((row, r) => {
      const raw = extractAnswers(data[r]);
      const adj = extractAnswers(row);
      for (let i = 1; i < raw.length; i++) {
        expect(Math.sign(adj[i] - adj[0])).toBe(Math.sign(raw[i] - raw[0]));
      }
    });
  });

  it("corrects someone with a single rating only partly", () => {
    const one = [
      ...data,
      ratingFromAnswers("Cara", "X", base(0).map((v) => v + 30)),
    ];
    const corrected = correctRaterHabits(one);
    const cara = corrected[corrected.length - 1];
    const bobOnX = corrected[0];
    const gap = mean(extractAnswers(cara)) - mean(extractAnswers(bobOnX));
    // Pulled toward the group, but not all the way: one rating isn't a habit.
    expect(gap).toBeGreaterThan(5);
    expect(gap).toBeLessThan(30);
  });

  it("leaves tiny datasets alone", () => {
    const single = [ratingFromAnswers("Ann", "Ann", base(0))];
    expect(correctRaterHabits(single)).toBe(single);
  });
});

describe("standardizeSelfAndFriends", () => {
  // Everyone rates themselves high and friends low.
  const people = ["Ann", "Bob", "Cara"];
  const data: SurveyRating[] = people.flatMap((p, i) => [
    ratingFromAnswers(p, p, base(i).map((v) => v + 40)),
    ratingFromAnswers(p, people[(i + 1) % 3], base(i + 3)),
  ]);

  it("gives self-ratings and friend ratings each their own baseline", () => {
    const out = standardizeSelfAndFriends(data);
    const selfRows = out.filter((r) => r.rater === r.subject);
    const friendRows = out.filter((r) => r.rater !== r.subject);
    questionKeys.forEach((k) => {
      expect(Math.abs(mean(selfRows.map((r) => r[k])) - 50)).toBeLessThanOrEqual(1);
      expect(Math.abs(mean(friendRows.map((r) => r[k])) - 50)).toBeLessThanOrEqual(1);
    });
  });

  it("keeps rows in their original order", () => {
    const out = standardizeSelfAndFriends(data);
    expect(out.map((r) => [r.rater, r.subject])).toEqual(
      data.map((r) => [r.rater, r.subject]),
    );
  });
});

describe("prepareAnalysisData", () => {
  it("returns one 0–100 row per input row, in order", () => {
    const data = [
      ratingFromAnswers("Ann", "Ann", base(1)),
      ratingFromAnswers("Ann", "Bob", base(2)),
      ratingFromAnswers("Bob", "Bob", base(3)),
      ratingFromAnswers("Bob", "Ann", base(4).map((v) => v + 45)),
    ];
    const out = prepareAnalysisData(data);
    expect(out.map((r) => r.rater + ">" + r.subject)).toEqual(
      data.map((r) => r.rater + ">" + r.subject),
    );
    out.forEach((r) =>
      extractAnswers(r).forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }),
    );
  });

  it("doesn't mutate its input", () => {
    const data = [
      ratingFromAnswers("Ann", "Bob", base(1)),
      ratingFromAnswers("Bob", "Ann", base(2)),
    ];
    const copy = JSON.parse(JSON.stringify(data));
    prepareAnalysisData(data);
    expect(data).toEqual(copy);
  });
});
