import { motion } from "framer-motion";
import type { SurveyRating } from "../api";
import { questions } from "../data";
import { getQuestionStats } from "../utils";

interface QuestionBreakdownProps {
  analysisData: SurveyRating[];
}

export function QuestionBreakdown({ analysisData }: QuestionBreakdownProps) {
  if (analysisData.length === 0) return null;

  return (
    <div style={{ marginTop: "48px" }}>
      <h3
        className="title"
        style={{ fontSize: "1.5rem", marginBottom: "24px", textAlign: "left" }}
      >
        Question Breakdown
      </h3>
      <p
        style={{
          color: "#94a3b8",
          marginBottom: "24px",
          fontSize: "0.95rem",
          lineHeight: 1.5,
        }}
      >
        A deeper dive into the exact answers given for each question across all
        participants. See where people find consensus, and where they are
        completely polarized!
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {questions.map((q, idx) => {
          const answers = analysisData.map(
            (r) => Number(r[`q${idx + 1}` as keyof SurveyRating]) || 0,
          );

          const { avg, median, stdDev, polarization, bins } =
            getQuestionStats(answers);
          const maxBin = Math.max(...bins, 1);

          return (
            <div
              key={idx}
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
                {q.dimension}
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "20px",
                  lineHeight: 1.4,
                }}
              >
                {q.question}
              </div>

              {/* Histogram */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  height: "80px",
                  gap: "4px",
                  marginBottom: "8px",
                }}
              >
                {bins.map((count, bIdx) => {
                  const heightPct = (count / maxBin) * 100;
                  return (
                    <div
                      key={bIdx}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#94a3b8",
                          marginBottom: "4px",
                          opacity: count > 0 ? 1 : 0,
                        }}
                      >
                        {count}
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        style={{
                          width: "100%",
                          background:
                            count > 0
                              ? "var(--primary)"
                              : "rgba(255,255,255,0.03)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: count > 0 ? "4px" : "1px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Histogram Labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                  marginBottom: "24px",
                  padding: "0 8px",
                  lineHeight: 1.3,
                  gap: "16px",
                }}
              >
                <span style={{ textAlign: "left", flex: 1 }}>
                  {q.answers[0]}
                </span>
                <span style={{ textAlign: "center", flex: 1 }}>
                  {q.answers[1]}
                </span>
                <span style={{ textAlign: "right", flex: 1 }}>
                  {q.answers[2]}
                </span>
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                  background: "rgba(0,0,0,0.2)",
                  padding: "16px",
                  borderRadius: "12px",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Average
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      color: "#4ade80",
                    }}
                  >
                    {avg}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    borderLeft: "1px solid rgba(255,255,255,0.1)",
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Median
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      color: "#60a5fa",
                    }}
                  >
                    {median}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Polarization
                  </div>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color:
                        stdDev > 25
                          ? "#f87171"
                          : stdDev > 15
                            ? "#eab308"
                            : "#4ade80",
                      marginTop: "2px",
                    }}
                  >
                    {polarization}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
