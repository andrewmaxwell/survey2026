import type { SurveyRating } from "./api";
import {
  dimensionsList,
  QUESTION_COUNT,
  questionKeys,
  questions,
  type Dimension,
  type Question,
} from "./data";

export { dimensionsList };
// ─── String normalization ────────────────────────────────────────────

/** Normalize a name for case/whitespace-insensitive comparison. */
const key = (s: string) => s.trim().toLowerCase();
export { key as nameKey };

// ─── Filtering helpers ───────────────────────────────────────────────

/** All ratings where `subject` is the person being rated. */
function ratingsOf(subject: string, data: SurveyRating[]): SurveyRating[] {
  const k = key(subject);
  return data.filter((r) => key(r.subject) === k);
}

/** All ratings where `subject` is rated by someone OTHER than themselves. */
export function friendRatingsOf(
  subject: string,
  data: SurveyRating[],
): SurveyRating[] {
  const k = key(subject);
  return data.filter((r) => key(r.subject) === k && key(r.rater) !== k);
}

/** The self-rating row where rater === subject (case/whitespace-insensitive). */
export function selfRatingOf(
  subject: string,
  data: SurveyRating[],
): SurveyRating | undefined {
  const k = key(subject);
  return data.find((r) => key(r.rater) === k && key(r.subject) === k);
}

/** All ratings made BY `rater` about OTHER people (not themselves). */
export function ratingsBy(rater: string, data: SurveyRating[]): SurveyRating[] {
  const k = key(rater);
  return data.filter((r) => key(r.rater) === k && key(r.subject) !== k);
}

/** Find the specific rating where `rater` rated `subject`. */
function findRating(
  rater: string,
  subject: string,
  data: SurveyRating[],
): SurveyRating | undefined {
  const rk = key(rater);
  const sk = key(subject);
  return data.find((r) => key(r.rater) === rk && key(r.subject) === sk);
}

// ─── Subject list ────────────────────────────────────────────────────

export interface SubjectSummary {
  /** Display name, as first seen in the data. */
  subject: string;
  /** People other than the subject who have rated them. */
  friendCount: number;
  /** People other than themselves this person has rated. */
  ratedCount: number;
  /** Whether `currentUser` has rated this subject. */
  hasCurrentRater: boolean;
}

/**
 * Everyone who appears in the data, as a rater or a subject, sorted by name.
 * Names match case- and whitespace-insensitively.
 */
export function getSubjectSummaries(
  data: SurveyRating[],
  currentUser: string,
): SubjectSummary[] {
  const people = new Map<
    string,
    { displayName: string; raters: Set<string>; ratedCount: number }
  >();
  const person = (name: string) => {
    const k = key(name);
    if (!people.has(k)) {
      people.set(k, { displayName: name.trim(), raters: new Set(), ratedCount: 0 });
    }
    return people.get(k)!;
  };

  data.forEach((row) => {
    if (!row.subject || !row.rater) return;
    const subject = person(row.subject);
    const rater = person(row.rater);
    subject.raters.add(key(row.rater));
    if (key(row.rater) !== key(row.subject)) rater.ratedCount += 1;
  });

  const me = key(currentUser);
  return Array.from(people.entries())
    .map(([k, p]) => ({
      subject: p.displayName,
      friendCount: p.raters.has(k) ? p.raters.size - 1 : p.raters.size,
      ratedCount: p.ratedCount,
      hasCurrentRater: p.raters.has(me),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

// ─── Core data extraction ────────────────────────────────────────────

/** Extract every answer from a SurveyRating row as a number array. */
export function extractAnswers(row: SurveyRating): number[] {
  return questionKeys.map((key) => Number(row[key]) || 0);
}

/** Build a SurveyRating row from an answers array (one per question). */
export function ratingFromAnswers(
  rater: string,
  subject: string,
  answers: number[],
): SurveyRating {
  const rating = { rater, subject } as SurveyRating;
  questionKeys.forEach((key, i) => {
    rating[key] = answers[i];
  });
  return rating;
}

/**
 * Convert a slider answer to a trait score, where 100 always means HIGH in
 * the question's dimension (reverse-scored questions are flipped).
 */
export function traitValue(question: Question, answer: number): number {
  return question.reversed ? 100 - answer : answer;
}

/** Average rows of per-question answers into one per-question array. */
function averageAnswerRows(ratings: SurveyRating[]): number[] {
  const totals = new Array(QUESTION_COUNT).fill(0);
  ratings.forEach((r) => {
    const answers = extractAnswers(r);
    answers.forEach((a, i) => (totals[i] += a));
  });
  return totals.map((t) => Math.round(t / ratings.length));
}

// ─── Subject scores (OCEAN dimension averages) ───────────────────────

/** One rating row's score in each dimension (100 = high in the trait). */
function rowDimensionScores(row: SurveyRating): Record<Dimension, number> {
  const totals = {} as Record<Dimension, { total: number; count: number }>;
  dimensionsList.forEach((d) => (totals[d] = { total: 0, count: 0 }));
  questions.forEach((q, idx) => {
    const val = row[questionKeys[idx]];
    if (typeof val === "number") {
      totals[q.dimension].total += traitValue(q, val);
      totals[q.dimension].count += 1;
    }
  });
  const out = {} as Record<Dimension, number>;
  dimensionsList.forEach((d) => {
    out[d] = totals[d].count > 0 ? totals[d].total / totals[d].count : 50;
  });
  return out;
}

/** Unrounded average dimension scores across rows (each row weighs the same). */
function meanDimensionScores(rows: SurveyRating[]): Record<Dimension, number> {
  const out = {} as Record<Dimension, number>;
  dimensionsList.forEach((d) => (out[d] = 0));
  rows.forEach((r) => {
    const scores = rowDimensionScores(r);
    dimensionsList.forEach((d) => (out[d] += scores[d] / rows.length));
  });
  return out;
}

export function getSubjectScores(subject: string, allData: SurveyRating[]) {
  const ratings = ratingsOf(subject, allData);
  if (ratings.length === 0) return [];
  const means = meanDimensionScores(ratings);
  return dimensionsList.map((d) => ({
    dimension: d,
    score: Math.round(means[d]),
  }));
}

// ─── Consensus scores (#2) ───────────────────────────────────────────

/**
 * How many ratings' worth of weight the group average gets in consensus
 * scores. With 1, a person rated once lands halfway between that rating and
 * the group average; rated 4 times, 80% of the way to their own average.
 */
const CONSENSUS_PRIOR_WEIGHT = 1;

/**
 * Dimension scores from everyone who rated `subject` (self included),
 * pulled toward the group average in proportion to how little data there
 * is. Use this for rankings, so one enthusiastic rating can't top a
 * leaderboard.
 */
export function getConsensusScores(subject: string, allData: SurveyRating[]) {
  const ratings = ratingsOf(subject, allData);
  if (ratings.length === 0) return [];
  const own = meanDimensionScores(ratings);
  const group = meanDimensionScores(allData);
  const w = ratings.length / (ratings.length + CONSENSUS_PRIOR_WEIGHT);
  return dimensionsList.map((d) => ({
    dimension: d,
    score: Math.round(group[d] + w * (own[d] - group[d])),
  }));
}

// ─── Trait ranges (#3) ───────────────────────────────────────────────

/** z for an 80% interval: the range we call "likely". */
const LIKELY_RANGE_Z = 1.28;

/** Spread assumed between raters when there isn't data to measure it. */
const DEFAULT_RATER_SPREAD = 20;

/**
 * How much different friends' ratings of the same person typically disagree,
 * per dimension, pooled over everyone with 2+ friend raters.
 */
function friendRatingSpread(allData: SurveyRating[]): Record<Dimension, number> {
  const ss = {} as Record<Dimension, number>;
  dimensionsList.forEach((d) => (ss[d] = 0));
  let df = 0;

  const subjects = new Set(allData.map((r) => key(r.subject)));
  subjects.forEach((s) => {
    const friends = friendRatingsOf(s, allData);
    if (friends.length < 2) return;
    const mean = meanDimensionScores(friends);
    friends.forEach((r) => {
      const scores = rowDimensionScores(r);
      dimensionsList.forEach((d) => (ss[d] += (scores[d] - mean[d]) ** 2));
    });
    df += friends.length - 1;
  });

  const out = {} as Record<Dimension, number>;
  dimensionsList.forEach((d) => {
    out[d] = df > 0 ? Math.sqrt(ss[d] / df) : DEFAULT_RATER_SPREAD;
  });
  return out;
}

export interface TraitRange {
  dimension: Dimension;
  /** Self-rating score, or null if they haven't rated themselves. */
  self: number | null;
  /** Friends' average score, or null if no friends have rated them. */
  friends: number | null;
  /** Half-width of the 80% likely range around `friends`. */
  margin: number | null;
  friendCount: number;
}

/**
 * Per dimension: the self-rating, the friends' average, and how far the
 * friends' average could plausibly move with more raters. The margin uses
 * the group-wide disagreement between friends, so it works even for someone
 * with a single rater.
 */
export function getTraitRanges(
  subject: string,
  allData: SurveyRating[],
): TraitRange[] {
  const self = selfRatingOf(subject, allData);
  const friends = friendRatingsOf(subject, allData);
  const selfScores = self ? rowDimensionScores(self) : null;
  const friendScores = friends.length ? meanDimensionScores(friends) : null;
  const spread = friends.length ? friendRatingSpread(allData) : null;

  return dimensionsList.map((d) => ({
    dimension: d,
    self: selfScores ? Math.round(selfScores[d]) : null,
    friends: friendScores ? Math.round(friendScores[d]) : null,
    margin: spread
      ? Math.round((LIKELY_RANGE_Z * spread[d]) / Math.sqrt(friends.length))
      : null,
    friendCount: friends.length,
  }));
}

// ─── Answer highlights (#10) ─────────────────────────────────────────

/** Which of a question's three answers a slider value is closest to: 0, 1 or 2. */
export function answerIndexFor(value: number): 0 | 1 | 2 {
  return Math.max(0, Math.min(2, Math.floor((value * 3) / 100))) as 0 | 1 | 2;
}

export interface AnswerHighlight {
  questionIndex: number;
  /** The answer most friends' sliders landed closest to. */
  answerIndex: 0 | 1 | 2;
  /** How many friends landed on it, out of `total`. */
  count: number;
  total: number;
  /** The answer their own self-rating landed on, if they rated themselves. */
  selfAnswerIndex: 0 | 1 | 2 | null;
}

/**
 * The most quotable questions about `subject`: where friends agree on a
 * specific answer, preferring vivid (non-middle) answers and ones that
 * differ from how the person answered for themselves.
 *
 * Pass RAW rows: this quotes what friends actually picked, so it must not
 * see standardized or habit-corrected values.
 */
export function getAnswerHighlights(
  subject: string,
  rawData: SurveyRating[],
  maxResults = 3,
): AnswerHighlight[] {
  const friends = friendRatingsOf(subject, rawData);
  if (friends.length === 0) return [];
  const self = selfRatingOf(subject, rawData);

  const scored = questionKeys.map((qKey, questionIndex) => {
    const counts = [0, 0, 0];
    friends.forEach((r) => counts[answerIndexFor(Number(r[qKey]) || 0)]++);
    // Most-picked answer; on a tie prefer an end answer over the middle one.
    const answerIndex = ([0, 2, 1] as const).reduce((best, i) =>
      counts[i] > counts[best] ? i : best,
    );
    const selfAnswerIndex = self ? answerIndexFor(Number(self[qKey]) || 0) : null;
    const share = counts[answerIndex] / friends.length;
    const interest =
      share +
      (answerIndex !== 1 ? 0.3 : 0) +
      (selfAnswerIndex !== null && selfAnswerIndex !== answerIndex ? 0.4 : 0);
    const highlight: AnswerHighlight = {
      questionIndex,
      answerIndex,
      count: counts[answerIndex],
      total: friends.length,
      selfAnswerIndex,
    };
    return { highlight, interest };
  });

  return scored
    // With several friends, a "consensus" of one isn't worth quoting.
    .filter(({ highlight: h }) => h.total < 2 || h.count >= 2)
    .sort((a, b) => b.interest - a.interest || b.highlight.count - a.highlight.count)
    .slice(0, maxResults)
    .map(({ highlight }) => highlight);
}

// ─── Subject answer averages ─────────────────────────────────────────

/** Average score for each question for a given subject. */
export function getSubjectAverageAnswers(
  subject: string,
  allData: SurveyRating[],
): number[] {
  const ratings = ratingsOf(subject, allData);
  if (ratings.length === 0) return new Array(QUESTION_COUNT).fill(50);
  return averageAnswerRows(ratings);
}

/**
 * Average score for each question for a given subject,
 * explicitly excluding a specific rater's rating from the average.
 */
export function getSubjectAverageAnswersExcluding(
  subject: string,
  excludedRater: string,
  allData: SurveyRating[],
): number[] | null {
  const sk = key(subject);
  const ek = key(excludedRater);
  const ratings = allData.filter(
    (r) => key(r.subject) === sk && key(r.rater) !== ek,
  );
  if (ratings.length === 0) return null;
  return averageAnswerRows(ratings);
}

// ─── Similarity ──────────────────────────────────────────────────────

/**
 * Calculates the similarity between two full sets of answers.
 * Uses Manhattan distance to calculate a percentage (0 to 100).
 */
export function getSimilarityPercentage(
  answersA: number[],
  answersB: number[],
): number {
  if (
    answersA.length !== QUESTION_COUNT ||
    answersB.length !== QUESTION_COUNT
  )
    return 0;
  let totalDifference = 0;
  for (let i = 0; i < QUESTION_COUNT; i++) {
    totalDifference += Math.abs(answersA[i] - answersB[i]);
  }
  const maxDifference = QUESTION_COUNT * 100;
  const similarity = 100 * (1 - totalDifference / maxDifference);
  return Math.round(similarity);
}

// ─── Accuracy & self-awareness ───────────────────────────────────────

/**
 * Calculates the accuracy score for a rater rating a subject.
 * Accuracy is similarity to the average of EVERYONE ELSE's rating of that subject.
 */
export function getAccuracyScore(
  rater: string,
  subject: string,
  allData: SurveyRating[],
): number | null {
  const rating = findRating(rater, subject, allData);
  if (!rating) return null;
  const othersAvg = getSubjectAverageAnswersExcluding(subject, rater, allData);
  if (!othersAvg) return null;
  return getSimilarityPercentage(extractAnswers(rating), othersAvg);
}

/**
 * Calculates self-awareness score for a subject.
 * Accuracy of their self-rating compared to friends' average rating of them.
 */
export function getSelfAwarenessScore(
  subject: string,
  allData: SurveyRating[],
): number | null {
  return getAccuracyScore(subject, subject, allData);
}

// ─── Rating Stats (Given/Received) ───────────────────────────────────

export interface RatingStats {
  mean: number;
  median: number;
  stdDev: number;
}

export function getRatingStats(ratings: SurveyRating[]): RatingStats | null {
  if (ratings.length === 0) return null;

  const values: number[] = [];
  ratings.forEach((r) => {
    questions.forEach((q, idx) => {
      values.push(traitValue(q, Number(r[questionKeys[idx]]) || 0));
    });
  });

  if (values.length === 0) return null;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean),
    median: Math.round(median),
    stdDev: Math.round(stdDev),
  };
}

// ─── Similar / different ─────────────────────────────────────────────

/** Returns the most and least similar subjects for a given subject. */
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

// ─── Blind spots ─────────────────────────────────────────────────────

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
  const self = selfRatingOf(subject, allData);
  if (!self) return [];

  const friends = friendRatingsOf(subject, allData);
  if (friends.length === 0) return [];

  const selfAnswers = extractAnswers(self);
  const friendAvgs = averageAnswerRows(friends);

  const gaps = selfAnswers.map((selfVal, i) => ({
    questionIndex: i,
    selfValue: selfVal,
    friendAvg: friendAvgs[i],
    gap: Math.abs(selfVal - friendAvgs[i]),
  }));

  gaps.sort((a, b) => b.gap - a.gap);
  return gaps.slice(0, maxResults);
}

// ─── Leaderboards ────────────────────────────────────────────────────

/**
 * "Knows best" Leaderboard.
 * For a given rater, ranks the people they rated by how accurate their rating was.
 */
export function getKnowsBest(
  rater: string,
  allData: SurveyRating[],
): { person: string; accuracy: number }[] {
  return ratingsBy(rater, allData)
    .map((r) => ({
      person: r.subject,
      accuracy: getAccuracyScore(rater, r.subject, allData),
    }))
    .filter(
      (r): r is { person: string; accuracy: number } => r.accuracy !== null,
    )
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);
}

/**
 * "Best known by" Leaderboard.
 * For a given subject, ranks all their raters by how accurate they were.
 */
export function getBestKnownBy(
  subject: string,
  allData: SurveyRating[],
): { person: string; accuracy: number }[] {
  return friendRatingsOf(subject, allData)
    .map((r) => ({
      person: r.rater,
      accuracy: getAccuracyScore(r.rater, subject, allData),
    }))
    .filter(
      (r): r is { person: string; accuracy: number } => r.accuracy !== null,
    )
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);
}

// ─── Controversy ─────────────────────────────────────────────────────

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
  const ratings = ratingsOf(subject, allData);
  if (ratings.length < 2) return null;

  const perQuestion: number[] = [];
  for (const qKey of questionKeys) {
    const values = ratings.map((r) => Number(r[qKey]) || 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    perQuestion.push(Math.round(Math.sqrt(variance)));
  }

  // Overall is the average stdDev across all questions, scaled to 0-100.
  // Max possible stdDev for a question is 50 (half of 0-100 range).
  const avgStdDev = perQuestion.reduce((a, b) => a + b, 0) / perQuestion.length;
  const overall = Math.round((avgStdDev / 50) * 100);

  return { overall, perQuestion };
}

// ─── Dimension leaderboard ───────────────────────────────────────────

/**
 * Dimension Leaderboard.
 * Returns all subjects ranked by score for a given OCEAN dimension.
 * Uses consensus scores (all raters averaged, shrunk toward the group
 * for people with few ratings).
 */
export function getDimensionLeaderboard(
  dimension: string,
  subjects: string[],
  allData: SurveyRating[],
): { subject: string; score: number }[] {
  const results = subjects
    .map((subject) => {
      const scores = getConsensusScores(subject, allData);
      const dimScore = scores.find((s) => s.dimension === dimension);
      return { subject, score: dimScore?.score ?? 50 };
    })
    .filter((r) => r.score !== undefined);

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ─── Similarity heatmap ──────────────────────────────────────────────

/** Compute NxN similarity matrix for all subjects. */
export function getSimilarityMatrix(
  subjects: string[],
  allAverages: Map<string, number[]>,
): { subjects: string[]; matrix: number[][] } {
  const matrix = subjects.map((a) => {
    const aAvg = allAverages.get(a);
    return subjects.map((b) => {
      if (a === b) return 100;
      const bAvg = allAverages.get(b);
      if (!aAvg || !bAvg) return 0;
      return getSimilarityPercentage(aAvg, bAvg);
    });
  });
  return { subjects, matrix };
}

/** Compute NxN knowledge matrix for all subjects (how well rater knows subject). */
export function getKnowledgeMatrix(
  subjects: string[],
  allData: SurveyRating[],
): { subjects: string[]; matrix: (number | null)[][] } {
  const matrix = subjects.map((rater) => {
    return subjects.map((subject) => getAccuracyScore(rater, subject, allData));
  });
  return { subjects, matrix };
}

// ─── Personality archetypes ──────────────────────────────────────────

export interface Archetype {
  name: string;
  emoji: string;
  description: string;
}

/**
 * Archetype mapping based on the top-2 *notable* trait signals.
 *
 * A "signal" is a dimension that deviates significantly from neutral (50).
 * We translate the raw OCEAN dimensions into friendlier trait names:
 *   - High Openness → "Curious"
 *   - High Conscientiousness → "Disciplined"
 *   - High Extraversion → "Social"
 *   - High Agreeableness → "Warm"
 *   - High Neuroticism → "Sensitive" (not pejorative)
 *   - Low Openness → "Grounded"
 *   - Low Extraversion → "Reflective"
 *   - Low Agreeableness → "Direct"
 *   - Low Neuroticism → "Steady"
 */

interface TraitSignal {
  trait: string; // e.g. "Curious", "Social", "Direct"
  strength: number; // absolute deviation from 50
}

// Map from combo of top-2 signals → archetype. Keys are sorted alphabetically.
const comboArchetypes: Record<string, Archetype> = {
  "Curious+Disciplined": {
    name: "The Visionary",
    emoji: "🔮",
    description: "Creative yet disciplined — turns big ideas into reality",
  },
  "Curious+Social": {
    name: "The Explorer",
    emoji: "🧭",
    description: "Adventurous and outgoing, always chasing the next experience",
  },
  "Curious+Warm": {
    name: "The Idealist",
    emoji: "🌈",
    description: "A compassionate dreamer who sees the best in everyone",
  },
  "Curious+Sensitive": {
    name: "The Poet",
    emoji: "🪶",
    description: "Deeply thoughtful with a rich inner world",
  },
  "Curious+Steady": {
    name: "The Sage",
    emoji: "📚",
    description: "Intellectually curious and unflappable under pressure",
  },
  "Curious+Direct": {
    name: "The Maverick",
    emoji: "🚀",
    description: "Bold and original, challenges conventions",
  },
  "Curious+Reflective": {
    name: "The Philosopher",
    emoji: "🤔",
    description: "A deep thinker who finds meaning in ideas",
  },
  "Disciplined+Social": {
    name: "The Captain",
    emoji: "⚓",
    description: "Organized and assertive, a natural leader",
  },
  "Disciplined+Warm": {
    name: "The Guardian",
    emoji: "🛡️",
    description: "Dependable, caring, and always looking out for others",
  },
  "Disciplined+Sensitive": {
    name: "The Perfectionist",
    emoji: "🎯",
    description: "Meticulous and driven, holds themselves to high standards",
  },
  "Disciplined+Steady": {
    name: "The Architect",
    emoji: "📐",
    description: "Methodical, reliable, and cool under pressure",
  },
  "Disciplined+Direct": {
    name: "The Strategist",
    emoji: "♟️",
    description: "Efficient and straightforward, gets things done",
  },
  "Social+Warm": {
    name: "The Connector",
    emoji: "🌟",
    description: "A natural social glue who brings people together",
  },
  "Social+Sensitive": {
    name: "The Performer",
    emoji: "🎭",
    description: "Expressive and passionate, brings big energy everywhere",
  },
  "Social+Steady": {
    name: "The Catalyst",
    emoji: "⚡",
    description: "Radiates confident energy and sparks action",
  },
  "Social+Direct": {
    name: "The Firebrand",
    emoji: "🔥",
    description: "Outspoken and magnetic, never afraid to take charge",
  },
  "Warm+Sensitive": {
    name: "The Empath",
    emoji: "💜",
    description:
      "Deeply feeling and compassionate, absorbs the emotions around them",
  },
  "Warm+Steady": {
    name: "The Peacemaker",
    emoji: "🕊️",
    description: "Harmony-seeking and kind, everyone's trusted friend",
  },
  "Warm+Direct": {
    name: "The Coach",
    emoji: "🏅",
    description: "Caring but honest — gives you the truth because they care",
  },
  "Sensitive+Reflective": {
    name: "The Artist",
    emoji: "🎨",
    description:
      "Emotionally deep and introspective, sees the world through a unique lens",
  },
  "Direct+Steady": {
    name: "The Rock",
    emoji: "🪨",
    description: "Unshakable and straightforward, says it like it is",
  },
  "Grounded+Disciplined": {
    name: "The Anchor",
    emoji: "⚓",
    description: "Practical and reliable, the person everyone can count on",
  },
  "Grounded+Warm": {
    name: "The Nurturer",
    emoji: "🌻",
    description:
      "Down-to-earth and caring, brings comfort to those around them",
  },
  "Reflective+Steady": {
    name: "The Observer",
    emoji: "🔭",
    description: "Quiet, calm, and perceptive — takes it all in",
  },
  "Reflective+Warm": {
    name: "The Counselor",
    emoji: "🫶",
    description: "A thoughtful listener who makes people feel understood",
  },
};

// Single-signal fallbacks
const singleArchetypes: Record<string, Archetype> = {
  Curious: {
    name: "The Innovator",
    emoji: "💡",
    description: "Endlessly curious, always thinking outside the box",
  },
  Disciplined: {
    name: "The Architect",
    emoji: "📐",
    description: "Methodical and reliable, builds things that last",
  },
  Social: {
    name: "The Catalyst",
    emoji: "⚡",
    description: "Pure social energy, lights up every room",
  },
  Warm: {
    name: "The Peacemaker",
    emoji: "🕊️",
    description: "Harmony-seeking and kind, everyone's trusted friend",
  },
  Sensitive: {
    name: "The Sentinel",
    emoji: "🔍",
    description: "Highly attuned and perceptive, feels things deeply",
  },
  Steady: {
    name: "The Rock",
    emoji: "🪨",
    description: "Calm, composed, and unshakable",
  },
  Direct: {
    name: "The Maverick",
    emoji: "🚀",
    description: "Speaks their mind and does things their own way",
  },
  Reflective: {
    name: "The Philosopher",
    emoji: "🤔",
    description: "A quiet thinker who finds depth in everything",
  },
  Grounded: {
    name: "The Anchor",
    emoji: "⚓",
    description: "Practical and steady, prefers the tried-and-true",
  },
  Spontaneous: {
    name: "The Free Spirit",
    emoji: "🍃",
    description: "Adaptable and improvisational, goes with the flow",
  },
};

const balanced: Archetype = {
  name: "The Balanced",
  emoji: "⚖️",
  description:
    "Well-rounded with no single trait dominating — adaptable to any situation",
};

/**
 * Convert OCEAN dimension scores into human-readable trait signals.
 * Only returns signals that deviate meaningfully from neutral (50).
 */
function getTraitSignals(
  scores: { dimension: string; score: number }[],
  threshold = 10,
): TraitSignal[] {
  const signals: TraitSignal[] = [];

  for (const { dimension, score } of scores) {
    const deviation = score - 50;
    const absDeviation = Math.abs(deviation);
    if (absDeviation < threshold) continue;

    // Map dimension + direction to a friendly trait name
    let trait: string;
    if (deviation > 0) {
      trait =
        {
          Openness: "Curious",
          Conscientiousness: "Disciplined",
          Extraversion: "Social",
          Agreeableness: "Warm",
          Neuroticism: "Sensitive",
        }[dimension] ?? dimension;
    } else {
      trait =
        {
          Openness: "Grounded",
          Conscientiousness: "Spontaneous",
          Extraversion: "Reflective",
          Agreeableness: "Direct",
          Neuroticism: "Steady",
        }[dimension] ?? dimension;
    }

    signals.push({ trait, strength: absDeviation });
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

/**
 * Determine personality archetype from OCEAN scores.
 * Uses deviation from neutral (50) so only genuinely notable traits matter.
 * Considers BOTH high and low dimensions as meaningful signals.
 */
export function getArchetype(
  scores: { dimension: string; score: number }[],
): Archetype {
  if (scores.length === 0)
    return {
      name: "The Mystery",
      emoji: "❓",
      description: "Not enough data yet",
    };

  const signals = getTraitSignals(scores);

  // No standout traits → balanced
  if (signals.length === 0) return balanced;

  // Single standout trait
  if (signals.length === 1) {
    return singleArchetypes[signals[0].trait] ?? balanced;
  }

  // Top-2 combo (alphabetical key)
  const comboKey = [signals[0].trait, signals[1].trait].sort().join("+");
  return (
    comboArchetypes[comboKey] ?? singleArchetypes[signals[0].trait] ?? balanced
  );
}

// ─── Rater quality stats ─────────────────────────────────────────────

export interface RaterStats {
  name: string;
  ratingsGiven: number;
  avgAnswer: number;
  answerStdDev: number;
  uniqueValues: number;
  avgDeviationFromConsensus: number;
}

/**
 * Analyze the quality of a rater's ratings.
 * Measures whether they use the full range, give thoughtful distinct answers,
 * or just spam 50s / random values.
 */
export function getRaterStats(
  rater: string,
  allData: SurveyRating[],
): RaterStats | null {
  const given = ratingsBy(rater, allData);
  if (given.length === 0) return null;

  // Collect all individual answer values across all their ratings
  const allAnswerValues: number[] = [];
  given.forEach((r) => allAnswerValues.push(...extractAnswers(r)));

  const avg = Math.round(
    allAnswerValues.reduce((a, b) => a + b, 0) / allAnswerValues.length,
  );

  const variance =
    allAnswerValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    allAnswerValues.length;
  const answerStdDev = Math.round(Math.sqrt(variance));

  const uniqueValues = new Set(allAnswerValues).size;

  // Average deviation from consensus: for each person they rated,
  // how far was their rating from the average of everyone else's?
  let totalDeviation = 0;
  let deviationCount = 0;
  given.forEach((r) => {
    const othersAvg = getSubjectAverageAnswersExcluding(
      r.subject,
      rater,
      allData,
    );
    if (othersAvg) {
      const myAnswers = extractAnswers(r);
      let diff = 0;
      for (let i = 0; i < QUESTION_COUNT; i++) {
        diff += Math.abs(myAnswers[i] - othersAvg[i]);
      }
      totalDeviation += diff / QUESTION_COUNT; // Average per-question deviation
      deviationCount++;
    }
  });

  const avgDeviationFromConsensus =
    deviationCount > 0 ? Math.round(totalDeviation / deviationCount) : 0;

  return {
    name: rater,
    ratingsGiven: given.length,
    avgAnswer: avg,
    answerStdDev,
    uniqueValues,
    avgDeviationFromConsensus,
  };
}

/**
 * Get quality stats for ALL raters.
 * Returns sorted by deviation from consensus (most deviant first).
 */
export function getAllRaterStats(allData: SurveyRating[]): RaterStats[] {
  const raters = new Set<string>();
  allData.forEach((r) => raters.add(r.rater.trim()));

  const stats: RaterStats[] = [];
  raters.forEach((name) => {
    const s = getRaterStats(name, allData);
    if (s) stats.push(s);
  });

  return stats.sort(
    (a, b) => b.avgDeviationFromConsensus - a.avgDeviationFromConsensus,
  );
}
