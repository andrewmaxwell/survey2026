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
