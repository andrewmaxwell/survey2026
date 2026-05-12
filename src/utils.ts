import type { SurveyRating } from "./api";
import { questions } from "./data";

export const dimensionsList = [
  "Openness",
  "Conscientiousness",
  "Extraversion",
  "Agreeableness",
  "Neuroticism",
];

export function getSubjectScores(subject: string, allData: SurveyRating[]) {
  const ratings = allData.filter(
    (r) => r.subject.toLowerCase() === subject.toLowerCase(),
  );
  if (ratings.length === 0) return [];

  const dimScores: Record<string, { total: number; count: number }> = {};
  dimensionsList.forEach((d) => (dimScores[d] = { total: 0, count: 0 }));

  ratings.forEach((r) => {
    questions.forEach((q, idx) => {
      const qKey = `q${idx + 1}` as keyof SurveyRating;
      const val = r[qKey];
      if (typeof val === "number") {
        dimScores[q.dimension].total += val;
        dimScores[q.dimension].count += 1;
      }
    });
  });

  return dimensionsList.map((d) => {
    let score =
      dimScores[d].count > 0
        ? Math.round(dimScores[d].total / dimScores[d].count)
        : 50;

    // For Neuroticism and Agreeableness, moving the slider to 100 (the right-most answer)
    // actually corresponds to LOW Neuroticism and LOW Agreeableness based on the data.ts answers.
    // So we must invert them to correctly display 'High' on the radar chart.
    if (d === "Neuroticism" || d === "Agreeableness") {
      score = 100 - score;
    }

    return {
      dimension: d,
      score,
    };
  });
}

/**
 * Returns the average score for each of the 15 questions for a given subject.
 * Returns an array of 15 numbers.
 */
export function getSubjectAverageAnswers(
  subject: string,
  allData: SurveyRating[],
): number[] {
  const ratings = allData.filter(
    (r) => r.subject.toLowerCase() === subject.toLowerCase(),
  );
  if (ratings.length === 0) return new Array(15).fill(50);

  const totals = new Array(15).fill(0);
  ratings.forEach((r) => {
    for (let i = 0; i < 15; i++) {
      const qKey = `q${i + 1}` as keyof SurveyRating;
      totals[i] += Number(r[qKey]) || 0;
    }
  });

  return totals.map((t) => Math.round(t / ratings.length));
}

/**
 * Calculates the similarity between two sets of 15 answers.
 * Uses Manhattan distance to calculate a percentage (0 to 100).
 */
export function getSimilarityPercentage(
  answersA: number[],
  answersB: number[],
): number {
  if (answersA.length !== 15 || answersB.length !== 15) return 0;
  let totalDifference = 0;
  for (let i = 0; i < 15; i++) {
    totalDifference += Math.abs(answersA[i] - answersB[i]);
  }
  // Max possible difference is 15 * 100 = 1500
  const maxDifference = 1500;
  const similarity = 100 * (1 - totalDifference / maxDifference);
  return Math.round(similarity);
}

/**
 * Converts an accuracy percentage into a letter grade.
 */
export function getGrade(percentage: number): string {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

/**
 * Returns the most and least similar subjects for a given subject.
 */
export function getSimilarAndDifferent(
  subjectName: string,
  subjectsArray: { subject: string }[],
  allAverages: Map<string, number[]>,
): {
  mostSimilar: { subject: string; similarity: number }[];
  leastSimilar: { subject: string; similarity: number }[];
} | null {
  const currentAverages = allAverages.get(subjectName);
  if (!currentAverages || currentAverages.length === 0) return null;

  const distances = subjectsArray
    .filter((s) => s.subject !== subjectName)
    .map((s) => {
      const sAverages = allAverages.get(s.subject);
      if (!sAverages) return { subject: s.subject, similarity: 0 };
      const similarity = getSimilarityPercentage(currentAverages, sAverages);
      return { subject: s.subject, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity);

  if (distances.length < 2) return null;

  const numToShow = Math.min(5, Math.floor(distances.length / 2));
  const mostSimilar = distances.slice(0, numToShow);
  const leastSimilar = [...distances].reverse().slice(0, numToShow);

  return { mostSimilar, leastSimilar };
}

/**
 * Calculates statistics for a single question given all its answers.
 */
export function getQuestionStats(answers: number[]): {
  avg: number;
  median: number;
  stdDev: number;
  polarization: string;
  bins: number[];
} {
  if (answers.length === 0) {
    return {
      avg: 50,
      median: 50,
      stdDev: 0,
      polarization: "Low (Consensus)",
      bins: new Array(10).fill(0),
    };
  }

  const avg = Math.round(answers.reduce((a, b) => a + b, 0) / answers.length);
  const sorted = [...answers].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const variance =
    answers.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    answers.length;
  const stdDev = Math.round(Math.sqrt(variance));

  let polarization = "Low (Consensus)";
  if (stdDev > 25) polarization = "High (Polarized)";
  else if (stdDev > 15) polarization = "Medium";

  const bins = new Array(10).fill(0);
  answers.forEach((a) => {
    const binIdx = Math.min(9, Math.floor(a / 10));
    bins[binIdx]++;
  });

  return { avg, median, stdDev, polarization, bins };
}

/** Helper: extract 15 answers from a SurveyRating row as a number array. */
export function extractAnswers(row: SurveyRating): number[] {
  const out: number[] = [];
  for (let i = 1; i <= 15; i++) {
    out.push(Number(row[`q${i}` as keyof SurveyRating]) || 0);
  }
  return out;
}

/**
 * Self-Perception Gap ("Blind Spot" Score).
 * Compares a person's self-rating to the average of how others rated them.
 * Returns the top blind spots (largest absolute gaps) with question index and values.
 */
export function getBlindSpots(
  subject: string,
  allData: SurveyRating[],
  maxResults = 3,
): {
  questionIndex: number;
  selfValue: number;
  friendAvg: number;
  gap: number;
}[] {
  const subjectLower = subject.toLowerCase();

  const selfRating = allData.find(
    (r) =>
      r.rater.toLowerCase() === subjectLower &&
      r.subject.toLowerCase() === subjectLower,
  );
  if (!selfRating) return [];

  const friendRatings = allData.filter(
    (r) =>
      r.subject.toLowerCase() === subjectLower &&
      r.rater.toLowerCase() !== subjectLower,
  );
  if (friendRatings.length === 0) return [];

  const selfAnswers = extractAnswers(selfRating);
  const friendTotals = new Array(15).fill(0);
  friendRatings.forEach((r) => {
    const answers = extractAnswers(r);
    answers.forEach((a, i) => (friendTotals[i] += a));
  });
  const friendAvgs = friendTotals.map((t) =>
    Math.round(t / friendRatings.length),
  );

  const gaps = selfAnswers.map((selfVal, i) => ({
    questionIndex: i,
    selfValue: selfVal,
    friendAvg: friendAvgs[i],
    gap: Math.abs(selfVal - friendAvgs[i]),
  }));

  gaps.sort((a, b) => b.gap - a.gap);
  return gaps.slice(0, maxResults);
}

/**
 * "Who Knows You Best?" Leaderboard.
 * For a given subject, ranks all raters by how close their individual
 * rating was to the consensus average of ALL ratings for that subject.
 */
export function getWhoKnowsYouBest(
  subject: string,
  allData: SurveyRating[],
): { rater: string; accuracy: number }[] {
  const subjectLower = subject.toLowerCase();

  const allRatings = allData.filter(
    (r) => r.subject.toLowerCase() === subjectLower,
  );
  if (allRatings.length < 2) return [];

  const consensusAvg = getSubjectAverageAnswers(subject, allData);

  const raterScores = allRatings
    .filter((r) => r.rater.toLowerCase() !== subjectLower)
    .map((r) => ({
      rater: r.rater,
      accuracy: getSimilarityPercentage(extractAnswers(r), consensusAvg),
    }));

  raterScores.sort((a, b) => b.accuracy - a.accuracy);
  return raterScores;
}

/**
 * Controversy Index for a given subject.
 * Measures how much raters DISAGREE about this person.
 * Returns an overall controversy score (0 = total agreement, 100 = max disagreement)
 * and per-question controversy scores.
 */
export function getControversyIndex(
  subject: string,
  allData: SurveyRating[],
): { overall: number; perQuestion: number[] } | null {
  const subjectLower = subject.toLowerCase();

  const ratings = allData.filter(
    (r) => r.subject.toLowerCase() === subjectLower,
  );
  if (ratings.length < 2) return null;

  const perQuestion: number[] = [];
  for (let i = 0; i < 15; i++) {
    const qKey = `q${i + 1}` as keyof SurveyRating;
    const values = ratings.map((r) => Number(r[qKey]) || 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    perQuestion.push(Math.round(Math.sqrt(variance)));
  }

  // Overall is the average stdDev across all questions, scaled to 0-100.
  // Max possible stdDev for a question is 50 (half of 0-100 range).
  const avgStdDev =
    perQuestion.reduce((a, b) => a + b, 0) / perQuestion.length;
  const overall = Math.round((avgStdDev / 50) * 100);

  return { overall, perQuestion };
}

/**
 * Dimension Leaderboard.
 * Returns all subjects ranked by score for a given OCEAN dimension.
 * Uses consensus scores (all raters averaged).
 */
export function getDimensionLeaderboard(
  dimension: string,
  subjects: string[],
  allData: SurveyRating[],
): { subject: string; score: number }[] {
  const results = subjects
    .map((subject) => {
      const scores = getSubjectScores(subject, allData);
      const dimScore = scores.find((s) => s.dimension === dimension);
      return { subject, score: dimScore?.score ?? 50 };
    })
    .filter((r) => r.score !== undefined);

  results.sort((a, b) => b.score - a.score);
  return results;
}

