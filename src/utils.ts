import type { SurveyRating } from "./api";
import { questions } from "./data";

export const dimensionsList = [
  "Openness",
  "Conscientiousness",
  "Extraversion",
  "Agreeableness",
  "Neuroticism",
];

// ─── String normalization ────────────────────────────────────────────

/** Normalize a name for case/whitespace-insensitive comparison. */
const key = (s: string) => s.trim().toLowerCase();

// ─── Filtering helpers ───────────────────────────────────────────────

/** All ratings where `subject` is the person being rated. */
function ratingsOf(subject: string, data: SurveyRating[]): SurveyRating[] {
  const k = key(subject);
  return data.filter((r) => key(r.subject) === k);
}

/** All ratings where `subject` is rated by someone OTHER than themselves. */
function friendRatingsOf(
  subject: string,
  data: SurveyRating[],
): SurveyRating[] {
  const k = key(subject);
  return data.filter((r) => key(r.subject) === k && key(r.rater) !== k);
}

/** The self-rating row where rater === subject, or null. */
function selfRatingOf(
  subject: string,
  data: SurveyRating[],
): SurveyRating | undefined {
  const k = key(subject);
  return data.find((r) => key(r.rater) === k && key(r.subject) === k);
}

/** All ratings made BY `rater` about OTHER people (not themselves). */
function ratingsBy(rater: string, data: SurveyRating[]): SurveyRating[] {
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

// ─── Core data extraction ────────────────────────────────────────────

/** Extract 15 answers from a SurveyRating row as a number array. */
export function extractAnswers(row: SurveyRating): number[] {
  const out: number[] = [];
  for (let i = 1; i <= 15; i++) {
    out.push(Number(row[`q${i}` as keyof SurveyRating]) || 0);
  }
  return out;
}

/** Average an array of 15-element answer arrays into one 15-element array. */
function averageAnswerRows(ratings: SurveyRating[]): number[] {
  const totals = new Array(15).fill(0);
  ratings.forEach((r) => {
    const answers = extractAnswers(r);
    answers.forEach((a, i) => (totals[i] += a));
  });
  return totals.map((t) => Math.round(t / ratings.length));
}

// ─── Subject scores (OCEAN dimension averages) ───────────────────────

export function getSubjectScores(subject: string, allData: SurveyRating[]) {
  const ratings = ratingsOf(subject, allData);
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

    return { dimension: d, score };
  });
}

// ─── Subject answer averages ─────────────────────────────────────────

/** Average score for each of the 15 questions for a given subject. */
export function getSubjectAverageAnswers(
  subject: string,
  allData: SurveyRating[],
): number[] {
  const ratings = ratingsOf(subject, allData);
  if (ratings.length === 0) return new Array(15).fill(50);
  return averageAnswerRows(ratings);
}

/**
 * Average score for each of the 15 questions for a given subject,
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
  const maxDifference = 1500; // 15 * 100
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

// ─── Question stats ──────────────────────────────────────────────────

/** Calculates statistics for a single question given all its answers. */
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
    .filter((r): r is { person: string; accuracy: number } => r.accuracy !== null)
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
    .filter((r): r is { person: string; accuracy: number } => r.accuracy !== null)
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

// ─── Dimension leaderboard ───────────────────────────────────────────

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
  "Curious+Disciplined":  { name: "The Visionary",     emoji: "🔮", description: "Creative yet disciplined — turns big ideas into reality" },
  "Curious+Social":       { name: "The Explorer",      emoji: "🧭", description: "Adventurous and outgoing, always chasing the next experience" },
  "Curious+Warm":         { name: "The Idealist",      emoji: "🌈", description: "A compassionate dreamer who sees the best in everyone" },
  "Curious+Sensitive":    { name: "The Poet",          emoji: "🪶", description: "Deeply thoughtful with a rich inner world" },
  "Curious+Steady":       { name: "The Sage",          emoji: "📚", description: "Intellectually curious and unflappable under pressure" },
  "Curious+Direct":       { name: "The Maverick",      emoji: "🚀", description: "Bold and original, challenges conventions" },
  "Curious+Reflective":   { name: "The Philosopher",   emoji: "🤔", description: "A deep thinker who finds meaning in ideas" },
  "Disciplined+Social":   { name: "The Captain",       emoji: "⚓", description: "Organized and assertive, a natural leader" },
  "Disciplined+Warm":     { name: "The Guardian",      emoji: "🛡️", description: "Dependable, caring, and always looking out for others" },
  "Disciplined+Sensitive": { name: "The Perfectionist", emoji: "🎯", description: "Meticulous and driven, holds themselves to high standards" },
  "Disciplined+Steady":   { name: "The Architect",     emoji: "📐", description: "Methodical, reliable, and cool under pressure" },
  "Disciplined+Direct":   { name: "The Strategist",    emoji: "♟️", description: "Efficient and straightforward, gets things done" },
  "Social+Warm":          { name: "The Connector",     emoji: "🌟", description: "A natural social glue who brings people together" },
  "Social+Sensitive":     { name: "The Performer",     emoji: "🎭", description: "Expressive and passionate, brings big energy everywhere" },
  "Social+Steady":        { name: "The Catalyst",      emoji: "⚡", description: "Radiates confident energy and sparks action" },
  "Social+Direct":        { name: "The Firebrand",     emoji: "🔥", description: "Outspoken and magnetic, never afraid to take charge" },
  "Warm+Sensitive":       { name: "The Empath",        emoji: "💜", description: "Deeply feeling and compassionate, absorbs the emotions around them" },
  "Warm+Steady":          { name: "The Peacemaker",    emoji: "🕊️", description: "Harmony-seeking and kind, everyone's trusted friend" },
  "Warm+Direct":          { name: "The Coach",         emoji: "🏅", description: "Caring but honest — gives you the truth because they care" },
  "Sensitive+Reflective": { name: "The Artist",        emoji: "🎨", description: "Emotionally deep and introspective, sees the world through a unique lens" },
  "Direct+Steady":        { name: "The Rock",          emoji: "🪨", description: "Unshakable and straightforward, says it like it is" },
  "Grounded+Disciplined": { name: "The Anchor",        emoji: "⚓", description: "Practical and reliable, the person everyone can count on" },
  "Grounded+Warm":        { name: "The Nurturer",      emoji: "🌻", description: "Down-to-earth and caring, brings comfort to those around them" },
  "Reflective+Steady":    { name: "The Observer",      emoji: "🔭", description: "Quiet, calm, and perceptive — takes it all in" },
  "Reflective+Warm":      { name: "The Counselor",     emoji: "🫶", description: "A thoughtful listener who makes people feel understood" },
};

// Single-signal fallbacks
const singleArchetypes: Record<string, Archetype> = {
  Curious:     { name: "The Innovator",    emoji: "💡", description: "Endlessly curious, always thinking outside the box" },
  Disciplined: { name: "The Architect",    emoji: "📐", description: "Methodical and reliable, builds things that last" },
  Social:      { name: "The Catalyst",     emoji: "⚡", description: "Pure social energy, lights up every room" },
  Warm:        { name: "The Peacemaker",   emoji: "🕊️", description: "Harmony-seeking and kind, everyone's trusted friend" },
  Sensitive:   { name: "The Sentinel",     emoji: "🔍", description: "Highly attuned and perceptive, feels things deeply" },
  Steady:      { name: "The Rock",         emoji: "🪨", description: "Calm, composed, and unshakable" },
  Direct:      { name: "The Maverick",     emoji: "🚀", description: "Speaks their mind and does things their own way" },
  Reflective:  { name: "The Philosopher",  emoji: "🤔", description: "A quiet thinker who finds depth in everything" },
  Grounded:    { name: "The Anchor",       emoji: "⚓", description: "Practical and steady, prefers the tried-and-true" },
};

const balanced: Archetype = { name: "The Balanced", emoji: "⚖️", description: "Well-rounded with no single trait dominating — adaptable to any situation" };

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
      trait = {
        Openness: "Curious",
        Conscientiousness: "Disciplined",
        Extraversion: "Social",
        Agreeableness: "Warm",
        Neuroticism: "Sensitive",
      }[dimension] ?? dimension;
    } else {
      trait = {
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
  if (scores.length === 0) return { name: "The Mystery", emoji: "❓", description: "Not enough data yet" };

  const signals = getTraitSignals(scores);

  // No standout traits → balanced
  if (signals.length === 0) return balanced;

  // Single standout trait
  if (signals.length === 1) {
    return singleArchetypes[signals[0].trait] ?? balanced;
  }

  // Top-2 combo (alphabetical key)
  const comboKey = [signals[0].trait, signals[1].trait].sort().join("+");
  return comboArchetypes[comboKey]
    ?? singleArchetypes[signals[0].trait]
    ?? balanced;
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
      for (let i = 0; i < 15; i++) {
        diff += Math.abs(myAnswers[i] - othersAvg[i]);
      }
      totalDeviation += diff / 15; // Average per-question deviation
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

  return stats.sort((a, b) => b.avgDeviationFromConsensus - a.avgDeviationFromConsensus);
}
