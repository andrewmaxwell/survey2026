/**
 * Rater quality stats for VibeCheck.
 * Run with: npx tsx src/rater-stats.ts
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the most recent CSV
const dir = path.resolve(__dirname, "..");
const csvFiles = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".csv"))
  .sort();
const csvPath = path.join(dir, csvFiles[csvFiles.length - 1]);
console.log(`\n📊 Analyzing: ${path.basename(csvPath)}\n`);

const raw = fs.readFileSync(csvPath, "utf-8");
const lines = raw.split("\n").filter((l) => l.trim().length > 0);
const header = lines[0].split(",").map((h) => h.trim());

interface Row {
  rater: string;
  subject: string;
  answers: number[];
}

const rows: Row[] = lines.slice(1).map((line) => {
  const cols = line.split(",").map((c) => c.trim().replace(/\r/g, ""));
  return {
    rater: cols[1],
    subject: cols[2],
    answers: cols.slice(3).map(Number),
  };
});

console.log(`Total ratings: ${rows.length}`);
console.log(`Unique raters: ${new Set(rows.map((r) => r.rater)).size}`);
console.log(`Unique subjects: ${new Set(rows.map((r) => r.subject)).size}\n`);

// ── Per-rater analysis ──

const raters = new Map<string, Row[]>();
rows.forEach((r) => {
  const friendRatings = rows.filter(
    (x) =>
      x.rater.toLowerCase().trim() === r.rater.toLowerCase().trim() &&
      x.subject.toLowerCase().trim() !== r.rater.toLowerCase().trim(),
  );
  raters.set(r.rater, friendRatings);
});

// Deduplicate raters by lowercase key
const uniqueRaters = new Map<string, { name: string; ratings: Row[] }>();
rows.forEach((r) => {
  const k = r.rater.toLowerCase().trim();
  if (!uniqueRaters.has(k)) {
    const friendRatings = rows.filter(
      (x) =>
        x.rater.toLowerCase().trim() === k &&
        x.subject.toLowerCase().trim() !== k,
    );
    uniqueRaters.set(k, { name: r.rater, ratings: friendRatings });
  }
});

console.log("═══════════════════════════════════════════════════════════════");
console.log("  RATER QUALITY REPORT");
console.log(
  "═══════════════════════════════════════════════════════════════\n",
);

const stats: {
  name: string;
  count: number;
  avg: number;
  stdDev: number;
  unique: number;
  allSame: boolean;
  suspiciousRows: string[];
}[] = [];

uniqueRaters.forEach(({ name, ratings }) => {
  const allAnswers = ratings.flatMap((r) => r.answers);
  if (allAnswers.length === 0) {
    stats.push({
      name,
      count: 0,
      avg: 0,
      stdDev: 0,
      unique: 0,
      allSame: false,
      suspiciousRows: ["⚠️  Has not rated anyone else yet"],
    });
    return;
  }

  const avg = allAnswers.reduce((a, b) => a + b, 0) / allAnswers.length;
  const variance =
    allAnswers.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    allAnswers.length;
  const stdDev = Math.sqrt(variance);
  const unique = new Set(allAnswers).size;

  const suspiciousRows: string[] = [];

  // Check for "all same" ratings
  ratings.forEach((r) => {
    const distinctValues = new Set(r.answers).size;
    if (distinctValues === 1) {
      suspiciousRows.push(
        `  🚩 Rated ${r.subject} with ALL ${r.answers[0]}s (every answer identical)`,
      );
    } else if (distinctValues <= 3) {
      suspiciousRows.push(
        `  ⚠️  Rated ${r.subject} using only ${distinctValues} distinct values: [${[...new Set(r.answers)].sort((a, b) => a - b).join(", ")}]`,
      );
    }
  });

  // Check if they cluster too tightly
  if (stdDev < 10 && allAnswers.length > 15) {
    suspiciousRows.push(
      `  ⚠️  Very low answer variance (stdDev=${stdDev.toFixed(1)}). Answers cluster tightly around ${avg.toFixed(0)}.`,
    );
  }

  stats.push({
    name,
    count: ratings.length,
    avg: Math.round(avg),
    stdDev: Math.round(stdDev),
    unique,
    allSame: unique === 1,
    suspiciousRows,
  });
});

// Sort: most suspicious first
stats.sort((a, b) => a.stdDev - b.stdDev);

stats.forEach((s) => {
  const flags = s.suspiciousRows.length > 0 ? " ⚠️" : " ✅";
  console.log(`${s.name}${flags}`);
  console.log(
    `  Friends rated: ${s.count} | Avg answer: ${s.avg} | StdDev: ${s.stdDev} | Unique values: ${s.unique}`,
  );
  s.suspiciousRows.forEach((r) => console.log(r));
  console.log();
});

// ── Anomaly summary ──
console.log("═══════════════════════════════════════════════════════════════");
console.log("  ANOMALY SUMMARY");
console.log(
  "═══════════════════════════════════════════════════════════════\n",
);

const flagged = stats.filter((s) => s.suspiciousRows.length > 0);
if (flagged.length === 0) {
  console.log("✅ No anomalies detected!\n");
} else {
  console.log(`🚩 ${flagged.length} rater(s) flagged:\n`);
  flagged.forEach((s) => {
    console.log(`  • ${s.name}: ${s.suspiciousRows.length} issue(s)`);
  });
  console.log();
}

// ── Data distribution overview ──
console.log("═══════════════════════════════════════════════════════════════");
console.log("  RATING COVERAGE");
console.log(
  "═══════════════════════════════════════════════════════════════\n",
);

// Who has the most/fewest raters?
const subjectCounts = new Map<string, number>();
rows.forEach((r) => {
  const sk = r.subject.toLowerCase().trim();
  const rk = r.rater.toLowerCase().trim();
  if (sk !== rk) {
    subjectCounts.set(r.subject, (subjectCounts.get(r.subject) || 0) + 1);
  }
});

const sortedSubjects = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1]);
console.log("Friend ratings received:");
sortedSubjects.forEach(([name, count]) => {
  const bar = "█".repeat(count);
  console.log(`  ${name.padEnd(18)} ${bar} ${count}`);
});

// Who has only self-rated?
const selfOnly = [...uniqueRaters.entries()]
  .filter(([, v]) => v.ratings.length === 0)
  .map(([, v]) => v.name);

if (selfOnly.length > 0) {
  console.log(
    `\n⚠️  Self-rated only (no friend ratings given): ${selfOnly.join(", ")}`,
  );
}
console.log();
