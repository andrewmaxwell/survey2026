/**
 * Compare the old scoring (one shared standardization, no corrections)
 * with the new pipeline on real data, before anyone sees the change.
 *
 *   npm run compare-scoring              # fetches live data from the sheet
 *   npm run compare-scoring -- rows.json # or reads a saved getAllData response
 */
import * as fs from "fs";
import { fetchData, type SurveyRating } from "../src/api";
import { dimensionsList, QUESTION_COUNT } from "../src/data";
import { prepareAnalysisData, standardizeAnswers } from "../src/scoring";
import {
  getConsensusScores,
  getDimensionLeaderboard,
  getSubjectScores,
  getSubjectSummaries,
  getTraitRanges,
} from "../src/utils";

function fromSheetRows(rows: Record<string, unknown>[]): SurveyRating[] {
  return rows.map((row) => {
    const r = {
      rater: String(row.Rater || ""),
      subject: String(row.Subject || ""),
    } as SurveyRating;
    for (let i = 1; i <= QUESTION_COUNT; i++) r[`q${i}`] = Number(row[`Q${i}`] || 0);
    return r;
  });
}

const file = process.argv[2];
const raw = file
  ? fromSheetRows(JSON.parse(fs.readFileSync(file, "utf8")))
  : await fetchData();

const before = standardizeAnswers(raw);
const after = prepareAnalysisData(raw);
const people = getSubjectSummaries(after, "").map((s) => s.subject);
const short = (d: string) => d.slice(0, 4);

console.log(`\n${raw.length} ratings, ${people.length} people\n`);

// ── Overall scores per person: before vs after ──
console.log("Overall trait scores (before → after, Δ). Rankings use these.\n");
console.log("Name".padEnd(16) + dimensionsList.map((d) => short(d).padStart(16)).join(""));
let bigMoves = 0;
for (const p of people) {
  const b = getSubjectScores(p, before);
  const a = getConsensusScores(p, after);
  const cells = dimensionsList.map((_, i) => {
    const delta = a[i].score - b[i].score;
    if (Math.abs(delta) >= 10) bigMoves++;
    return `${b[i].score}→${a[i].score} (${delta >= 0 ? "+" : ""}${delta})`.padStart(16);
  });
  console.log(p.padEnd(16) + cells.join(""));
}

// ── Leaderboards ──
console.log("\nLeaderboard top 3 (before | after)\n");
for (const d of dimensionsList) {
  const top = (data: SurveyRating[], useConsensus: boolean) =>
    (useConsensus
      ? getDimensionLeaderboard(d, people, data)
      : people
          .map((p) => ({
            subject: p,
            score: getSubjectScores(p, data).find((s) => s.dimension === d)?.score ?? 50,
          }))
          .sort((x, y) => y.score - x.score)
    )
      .slice(0, 3)
      .map((e) => `${e.subject} ${e.score}`)
      .join(", ");
  console.log(`${d.padEnd(18)} ${top(before, false)}  |  ${top(after, true)}`);
}

// ── Self vs friends gaps ──
console.log("\nLargest self-vs-friends gaps after the change (with friends' likely range)\n");
const gaps = people.flatMap((p) =>
  getTraitRanges(p, after)
    .filter((r) => r.self !== null && r.friends !== null)
    .map((r) => ({ p, ...r, gap: r.self! - r.friends! })),
);
gaps
  .sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap))
  .slice(0, 8)
  .forEach((g) => {
    const outside = Math.abs(g.gap) > (g.margin ?? 0) ? "" : "  (within the likely range)";
    console.log(
      `${g.p.padEnd(16)} ${g.dimension.padEnd(18)} self ${g.self}, friends ${g.friends} ±${g.margin}${outside}`,
    );
  });

console.log(
  `\n${bigMoves} person-trait scores moved by 10+ points.` +
    (bigMoves ? " Those are mostly people rated by lenient/strict raters or with few ratings.\n" : "\n"),
);
