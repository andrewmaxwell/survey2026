import { motion } from "framer-motion";
import type { SurveyRating } from "../api";
import { questions } from "../data";
import {
  dimensionsList,
  getBlindSpots,
  getBestKnownBy,
  getControversyIndex,
  getDimensionLeaderboard,
} from "../utils";

interface InsightsProps {
  analysisData: SurveyRating[];
  subjects: string[];
  currentUser: string;
}

const dimEmoji: Record<string, string> = {
  Openness: "🔭",
  Conscientiousness: "📋",
  Extraversion: "🗣️",
  Agreeableness: "🤝",
  Neuroticism: "🧘",
};

export function Insights({
  analysisData,
  subjects,
  currentUser,
}: InsightsProps) {
  if (analysisData.length === 0 || subjects.length === 0) return null;

  // ── Blind Spots ──
  const blindSpots = getBlindSpots(currentUser, analysisData, 3);

  // ── Who Knows You Best ──
  const whoKnows = getBestKnownBy(currentUser, analysisData);

  // ── Controversy Index ──
  const controversyRanking = subjects
    .map((s) => {
      const result = getControversyIndex(s, analysisData);
      return { subject: s, overall: result?.overall ?? null };
    })
    .filter((r) => r.overall !== null)
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

  // ── Dimension Leaderboards ──
  const leaderboards = dimensionsList.map((dim) => ({
    dimension: dim,
    ranking: getDimensionLeaderboard(dim, subjects, analysisData),
  }));

  const hasBlindSpots = blindSpots.length > 0;
  const hasWhoKnows = whoKnows.length > 0;
  const hasControversy = controversyRanking.length > 0;

  if (!hasBlindSpots && !hasWhoKnows && !hasControversy) return null;

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
              🪞 Self-Perception Gap
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "16px",
                lineHeight: 1.4,
              }}
            >
              Your biggest blind spots
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#94a3b8",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              Questions where how you see yourself differs the most from how
              your friends see you.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
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
            </div>
          </motion.div>
        )}

        {/* ── Who Knows You Best ── */}
        {hasWhoKnows && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
              🎯 Who Knows You Best?
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "16px",
                lineHeight: 1.4,
              }}
            >
              Friends ranked by how accurately they rated you
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {whoKnows.map((entry: { person: string; accuracy: number }, i: number) => {
                const barWidth = Math.max(entry.accuracy, 5);
                const isTop = i === 0;
                return (
                  <div
                    key={entry.person}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: isTop ? "#facc15" : "#64748b",
                        textAlign: "center",
                      }}
                    >
                      {isTop ? "👑" : `#${i + 1}`}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        position: "relative",
                        height: "32px",
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        style={{
                          height: "100%",
                          background: isTop
                            ? "linear-gradient(90deg, #6366f1, #ec4899)"
                            : "rgba(99, 102, 241, 0.4)",
                          borderRadius: "8px",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: "12px",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.85rem",
                          fontWeight: isTop ? 700 : 500,
                          color: "#f1f5f9",
                        }}
                      >
                        {entry.person}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: "12px",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: isTop ? "#facc15" : "#94a3b8",
                        }}
                      >
                        {entry.accuracy}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Controversy Index ── */}
        {hasControversy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
              🌡️ Controversy Index
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "8px",
                lineHeight: 1.4,
              }}
            >
              Who is the most "hard to read"?
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#94a3b8",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              Higher scores mean people have wildly different perceptions of
              this person. Lower scores mean everyone agrees on who they are.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {controversyRanking.map((entry, i) => {
                const score = entry.overall ?? 0;
                const barWidth = Math.max(score, 5);
                const barColor =
                  score > 50
                    ? "#f87171"
                    : score > 30
                      ? "#eab308"
                      : "#4ade80";
                return (
                  <div
                    key={entry.subject}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "90px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#f1f5f9",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {i === 0 ? "🔥 " : ""}
                      {entry.subject}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: "24px",
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        style={{
                          height: "100%",
                          background: barColor,
                          borderRadius: "8px",
                          opacity: 0.7,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: "8px",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#94a3b8",
                        }}
                      >
                        {score}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Dimension Leaderboards ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
            📈 Dimension Leaderboards
          </div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "16px",
              lineHeight: 1.4,
            }}
          >
            Who scores highest in each personality trait?
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
            }}
          >
            {leaderboards.map((lb) => (
              <div
                key={lb.dimension}
                style={{
                  background: "rgba(0,0,0,0.2)",
                  padding: "16px",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: "12px",
                    fontSize: "0.95rem",
                  }}
                >
                  {dimEmoji[lb.dimension] || "📊"} {lb.dimension}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {lb.ranking.slice(0, 5).map((entry, i) => {
                    const isCurrentUser =
                      entry.subject.toLowerCase() ===
                      currentUser.toLowerCase();
                    return (
                      <div
                        key={entry.subject}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: isCurrentUser
                            ? "rgba(99, 102, 241, 0.15)"
                            : "transparent",
                        }}
                      >
                        <span
                          style={{
                            color: i === 0 ? "#facc15" : "#cbd5e1",
                            fontWeight: i === 0 ? 700 : 400,
                          }}
                        >
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}{" "}
                          {entry.subject}
                          {isCurrentUser && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "#818cf8",
                                marginLeft: "4px",
                              }}
                            >
                              (you)
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#94a3b8",
                            fontSize: "0.8rem",
                          }}
                        >
                          {entry.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
