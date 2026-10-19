/**
 * Turns raw sheet rows into the rows every chart and insight reads.
 *
 *   raw rows
 *     → correctRaterHabits       (#1: some people slide everything right, some hug 50)
 *     → standardizeSelfAndFriends (#4: self-ratings and friend ratings each get their own baseline)
 *     → analysis rows (same shape, 0–100, mean ≈ 50)
 *
 * The output keeps the SurveyRating shape, so downstream code doesn't change.
 */
import type { SurveyRating } from "./api";
import { questionKeys } from "./data";
import { extractAnswers, nameKey } from "./utils";

/** Scale analysis rows use: mean 50, one standard deviation = 20 points. */
const TARGET_MEAN = 50;
const TARGET_SD = 20;

function meanAndSd(values: number[]): { mean: number; sd: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, sd: Math.sqrt(variance) };
}

/**
 * Per-question Z-score Standardization.
 *
 * For each question, computes the mean and standard deviation
 * across ALL answers in the dataset, then rescales every answer so that
 * the question's mean maps to 50 and each standard deviation spans 20 points.
 *
 * Why this helps:
 *  - Different questions have different natural baselines (Q1 might average
 *    70 while Q3 averages 40). Without standardization, high-baseline
 *    questions dominate their OCEAN dimension score. This levels them.
 *  - Preserves relative distances (someone who scored 10 points above
 *    another person stays proportionally above them).
 *  - Handles ties gracefully — identical raw answers stay identical.
 *  - Keeps the natural shape of each question's distribution (bimodal
 *    questions stay bimodal) while centering and stretching it.
 *
 * Output values are clamped to [0, 100].
 */
export function standardizeAnswers(data: SurveyRating[]): SurveyRating[] {
  if (data.length < 2) return data;

  const normalizedData = JSON.parse(JSON.stringify(data)) as SurveyRating[];

  questionKeys.forEach((qKey) => {
    const values = data.map((r) => Number(r[qKey]) || 0);

    const { mean, sd: stdDev } = meanAndSd(values);

    // If everyone gave the exact same answer, leave as-is (can't standardize)
    if (stdDev === 0) return;

    normalizedData.forEach((row, i) => {
      const z = (values[i] - mean) / stdDev;
      // Map: z = 0 → 50,  z = ±1 → 30/70,  z = ±2 → 10/90
      const normalized = Math.round(z * TARGET_SD + TARGET_MEAN);
      row[qKey] = Math.max(0, Math.min(100, normalized));
    });
  });

  return normalizedData;
}


// ─── Rater habits (#1) ───────────────────────────────────────────────

/**
 * How many ratings' worth of weight the group's habits get when estimating
 * one rater's habits. With 2, someone who submitted 1 rating is corrected a
 * third of the way; someone who submitted 8 is corrected 80% of the way.
 * This keeps one rating from being mistaken for a habit.
 */
const RATER_PRIOR_WEIGHT = 2;

/** Floor for a rater's spread, so someone who left every slider at 50 isn't blown up. */
const MIN_RATER_SD = 5;

/**
 * Remove each rater's slider habits: where they tend to sit (some slide
 * everything right, some hug the middle) and how widely they spread their
 * answers. Each rater's answers are rescaled so their typical answer and
 * spread match the group's, keeping who they rated higher or lower intact.
 *
 * Habits are measured over everything the rater submitted (self-rating
 * included) and shrunk toward the group for people with few ratings.
 * Values are left unrounded; standardization rounds afterwards.
 */
export function correctRaterHabits(data: SurveyRating[]): SurveyRating[] {
  if (data.length < 2) return data;

  const group = meanAndSd(data.flatMap(extractAnswers));
  if (group.sd === 0) return data;

  const byRater = new Map<string, SurveyRating[]>();
  data.forEach((r) => {
    const k = nameKey(r.rater);
    byRater.set(k, [...(byRater.get(k) ?? []), r]);
  });

  const habits = new Map<string, { mean: number; sd: number }>();
  byRater.forEach((rows, k) => {
    const own = meanAndSd(rows.flatMap(extractAnswers));
    const w = rows.length / (rows.length + RATER_PRIOR_WEIGHT);
    habits.set(k, {
      mean: group.mean + w * (own.mean - group.mean),
      sd: Math.max(MIN_RATER_SD, group.sd + w * (own.sd - group.sd)),
    });
  });

  return data.map((r) => {
    const h = habits.get(nameKey(r.rater))!;
    const out = { ...r };
    questionKeys.forEach((k) => {
      const v = Number(r[k]) || 0;
      out[k] = ((v - h.mean) / h.sd) * group.sd + group.mean;
    });
    return out;
  });
}

// ─── Separate baselines for self and friends (#4) ───────────────────

/**
 * Standardize self-ratings against other self-ratings and friend ratings
 * against other friend ratings. People describe themselves differently than
 * others describe them (often more flatteringly), so sharing one baseline
 * would make every self-vs-friends gap partly a group-wide artifact.
 */
export function standardizeSelfAndFriends(
  data: SurveyRating[],
): SurveyRating[] {
  const isSelf = (r: SurveyRating) => nameKey(r.rater) === nameKey(r.subject);
  const selfIdx: number[] = [];
  const friendIdx: number[] = [];
  data.forEach((r, i) => (isSelf(r) ? selfIdx : friendIdx).push(i));

  const out = [...data];
  const place = (idx: number[]) => {
    const standardized = standardizeAnswers(idx.map((i) => data[i]));
    idx.forEach((i, j) => (out[i] = standardized[j]));
  };
  place(selfIdx);
  place(friendIdx);
  return out;
}

/** The full preparation pipeline. See the top of this file. */
export function prepareAnalysisData(raw: SurveyRating[]): SurveyRating[] {
  return standardizeSelfAndFriends(correctRaterHabits(raw));
}
