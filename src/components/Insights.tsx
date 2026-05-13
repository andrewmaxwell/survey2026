import { motion } from "framer-motion";
import type { SurveyRating } from "../api";
import { questions } from "../data";
import {
  getBlindSpots,
  getControversyIndex,
  getDimensionLeaderboard,
} from "../utils";

// ── Shared Types ──────────────────────────────────────────────────────

interface InsightsProps {
  analysisData: SurveyRating[];
  subjects: string[];
  currentUser: string;
}

interface InsightCardProps {
  icon: string;
  title: string;
  subtitle: string;
  description?: string;
  delay: number;
  children: React.ReactNode;
}

interface RankedBarProps {
  /** Display name */
  name: string;
  /** Numeric value (0–100) */
  value: number;
  /** Rank position (0-indexed) */
  rank: number;
  /** Suffix for the value label (e.g. "%" or "") */
  valueSuffix?: string;
  /** Bar gradient/color */
  barColor: string;
  /** Highlight color for the #1 rank's value label */
  topValueColor?: string;
  /** Whether this entry represents the current user */
  isCurrentUser?: boolean;
  /** Animation stagger delay (in seconds) */
  staggerDelay?: number;
}

// ── Reusable Components ───────────────────────────────────────────────

const RANK_LABELS = ["🥇", "🥈", "🥉"];

function RankedBar({
  name,
  value,
  rank,
  valueSuffix = "%",
  barColor,
  topValueColor = "#facc15",
  isCurrentUser = false,
  staggerDelay = 0,
}: RankedBarProps) {
  const isTop = rank === 0;
  const barWidth = Math.max(value, 5);
  const rankLabel = RANK_LABELS[rank] ?? `#${rank + 1}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          width: "28px",
          fontSize: "0.85rem",
          fontWeight: 700,
          color: isTop ? "#facc15" : "#64748b",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {rankLabel}
      </div>
      <div
        style={{
          flex: 1,
          position: "relative",
          height: "30px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.6, delay: staggerDelay }}
          style={{
            height: "100%",
            background: barColor,
            borderRadius: "8px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "10px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            fontSize: "0.83rem",
            fontWeight: isTop ? 700 : 500,
            color: "#f1f5f9",
            gap: "5px",
          }}
        >
          {name}
          {isCurrentUser && (
            <span style={{ fontSize: "0.68rem", color: "#818cf8" }}>(you)</span>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "10px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: isTop ? topValueColor : "#94a3b8",
          }}
        >
          {value}
          {valueSuffix}
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  subtitle,
  description,
  delay,
  children,
}: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-panel"
      style={{ padding: "24px", borderRadius: "16px" }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          color: "#ec4899",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "8px",
        }}
      >
        {icon} {title}
      </div>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: description ? "8px" : "16px",
          lineHeight: 1.4,
        }}
      >
        {subtitle}
      </div>
      {description && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "#94a3b8",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── Leaderboard Config ────────────────────────────────────────────────

const leaderboardConfigs = [
  { dim: "Openness", label: "Openness", emoji: "🔭", invert: false },
  { dim: "Openness", label: "Conventionality", emoji: "🏡", invert: true },
  {
    dim: "Conscientiousness",
    label: "Conscientiousness",
    emoji: "📋",
    invert: false,
  },
  {
    dim: "Conscientiousness",
    label: "Disinhibition",
    emoji: "🎢",
    invert: true,
  },
  { dim: "Extraversion", label: "Extraversion", emoji: "🗣️", invert: false },
  { dim: "Extraversion", label: "Introversion", emoji: "🤫", invert: true },
  { dim: "Agreeableness", label: "Agreeableness", emoji: "🤝", invert: false },
  { dim: "Agreeableness", label: "Antagonism", emoji: "⚔️", invert: true },
  { dim: "Neuroticism", label: "Neuroticism", emoji: "🌪️", invert: false },
  { dim: "Neuroticism", label: "Resilience", emoji: "🧘", invert: true },
];

// ── Main Component ────────────────────────────────────────────────────

export function Insights({
  analysisData,
  subjects,
  currentUser,
}: InsightsProps) {
  if (analysisData.length === 0 || subjects.length === 0) return null;

  const blindSpots = getBlindSpots(currentUser, analysisData, 3);

  const controversyRanking = subjects
    .map((s) => {
      const result = getControversyIndex(s, analysisData);
      return { subject: s, overall: result?.overall ?? null };
    })
    .filter((r) => r.overall !== null)
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

  const leaderboards = leaderboardConfigs.map((config) => {
    let ranking = getDimensionLeaderboard(config.dim, subjects, analysisData);
    if (config.invert) {
      ranking = ranking
        .map((r) => ({ ...r, score: 100 - r.score }))
        .sort((a, b) => b.score - a.score);
    }
    return { ...config, ranking };
  });

  const hasBlindSpots = blindSpots.length > 0;
  const hasControversy = controversyRanking.length > 0;

  if (!hasBlindSpots && !hasControversy) return null;

  /** Bar color for controversy scores — warm gradient for high, cool for low */
  const controversyBarColor = (score: number) =>
    score > 50
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : score > 30
        ? "linear-gradient(90deg, #eab308, #f59e0b)"
        : "linear-gradient(90deg, #22c55e, #4ade80)";

  return (
    <div style={{ marginTop: "48px" }}>
      <h3
        className="title"
        style={{ fontSize: "1.5rem", marginBottom: "24px", textAlign: "left" }}
      >
        Insights
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ── Blind Spots ── */}
        {hasBlindSpots && (
          <InsightCard
            icon="🪞"
            title="Self-Perception Gap"
            subtitle="Your biggest blind spots"
            description="Questions where how you see yourself differs the most from how your friends see you."
            delay={0.1}
          >
            {blindSpots.map((spot, i) => {
              const q = questions[spot.questionIndex];
              const direction =
                spot.selfValue > spot.friendAvg
                  ? "You rated higher"
                  : "You rated lower";
              return (
                <div
                  key={i}
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    padding: "16px",
                    borderRadius: "12px",
                    borderLeft: "3px solid #ec4899",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "8px",
                      lineHeight: 1.4,
                    }}
                  >
                    Q{spot.questionIndex + 1}: {q.question}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      You said{" "}
                      <strong style={{ color: "#818cf8" }}>
                        {spot.selfValue}
                      </strong>{" "}
                      · Friends say{" "}
                      <strong style={{ color: "#4ade80" }}>
                        {spot.friendAvg}
                      </strong>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#f87171",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {direction} by {spot.gap} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </InsightCard>
        )}

        {/* ── Controversy Index ── */}
        {hasControversy && (
          <InsightCard
            icon="🌡️"
            title="Controversy Index"
            subtitle='Who is the most "hard to read"?'
            description="Higher scores mean people have wildly different perceptions of this person. Lower scores mean everyone agrees on who they are."
            delay={0.3}
          >
            {controversyRanking.map((entry, i) => (
              <RankedBar
                key={entry.subject}
                name={entry.subject}
                value={entry.overall ?? 0}
                rank={i}
                barColor={controversyBarColor(entry.overall ?? 0)}
                topValueColor={
                  (entry.overall ?? 0) > 50 ? "#f87171" : "#facc15"
                }
                staggerDelay={i * 0.08}
              />
            ))}
          </InsightCard>
        )}

        {/* ── Dimension Leaderboards ── */}
        <InsightCard
          icon="📈"
          title="Dimension Leaderboards"
          subtitle="Who scores highest in each personality trait?"
          delay={0.4}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {leaderboards.map((lb) => (
              <div
                key={lb.label}
                style={{
                  background: "rgba(0,0,0,0.2)",
                  padding: "16px",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: "10px",
                    fontSize: "0.95rem",
                  }}
                >
                  {lb.emoji} {lb.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  {lb.ranking.slice(0, 5).map((entry, i) => (
                    <RankedBar
                      key={entry.subject}
                      name={entry.subject}
                      value={entry.score}
                      rank={i}
                      valueSuffix=""
                      barColor={
                        i === 0
                          ? "linear-gradient(90deg, #6366f1, #a855f7)"
                          : "rgba(99, 102, 241, 0.25)"
                      }
                      isCurrentUser={
                        entry.subject.toLowerCase() ===
                        currentUser.toLowerCase()
                      }
                      staggerDelay={i * 0.05}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </InsightCard>
      </div>
    </div>
  );
}
