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
  const ratings = allData.filter((r) => r.subject === subject);
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
