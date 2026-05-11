import { motion } from "framer-motion";
import { Check, Loader2, LogOut, RefreshCcw, User } from "lucide-react";
import type { SurveyRating } from "../api";
import type { SurveyState } from "../types";
import { getSubjectScores } from "../utils";
import { RadarChart } from "./RadarChart";

interface SubjectInfo {
  subject: string;
  friendCount: number;
  hasCurrentRater: boolean;
}

interface DashboardProps {
  state: SurveyState;
  isLoading: boolean;
  analysisData: SurveyRating[];
  subjectsArray: SubjectInfo[];
  handleSwitchUser: () => void;
  handleStartFriendSurvey: (friendName: string) => void;
  handleRefresh: () => void;
}

export function Dashboard({
  state,
  isLoading,
  analysisData,
  subjectsArray,
  handleSwitchUser,
  handleStartFriendSurvey,
  handleRefresh,
}: DashboardProps) {
  const allScores = new Map<string, { dimension: string; score: number }[]>();
  subjectsArray.forEach((s) => {
    allScores.set(s.subject, getSubjectScores(s.subject, analysisData));
  });

  return (
    <motion.div
      key="analysis"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-panel card analysis-card"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h2
          className="title"
          style={{ margin: 0, fontSize: "1.8rem", textAlign: "left" }}
        >
          Dashboard
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCcw size={16} className={isLoading ? "spin" : ""} />{" "}
            Refresh
          </button>
          <button
            onClick={handleSwitchUser}
            className="btn btn-secondary"
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LogOut size={16} /> Switch User
          </button>
        </div>
      </div>
      <p
        className="subtitle"
        style={{ textAlign: "left", marginBottom: "16px" }}
      >
        Welcome back, <strong>{state.userName}</strong>!
      </p>

      <div className="friend-list">
        {isLoading && analysisData.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "40px 0",
            }}
          >
            <Loader2 className="spin" size={32} />
          </div>
        ) : subjectsArray.length === 0 ? (
          <p
            className="hint"
            style={{ textAlign: "center", marginTop: "16px" }}
          >
            No one else has taken the survey yet! Check back later.
          </p>
        ) : (
          subjectsArray.map((subj) => {
            const hasSubmitted =
              subj.hasCurrentRater || subj.subject === state.userName;
            return (
              <div
                key={subj.subject}
                className="glass-panel"
                style={{
                  padding: "16px",
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  marginBottom: "12px",
                  borderRadius: "12px",
                }}
              >
                <RadarChart subject={subj.subject} allData={analysisData} />

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "1.2rem",
                      marginBottom: "4px",
                    }}
                  >
                    {subj.subject}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      marginBottom: "12px",
                    }}
                  >
                    {subj.friendCount}{" "}
                    {subj.friendCount === 1 ? "friend has" : "friends have"}{" "}
                    rated them
                  </div>

                  {(() => {
                    const currentScores = allScores.get(subj.subject)!;
                    if (!currentScores || currentScores.length === 0) return null;

                    const distances = subjectsArray
                      .filter((s) => s.subject !== subj.subject)
                      .map((s) => {
                        const sScores = allScores.get(s.subject)!;
                        if (!sScores || sScores.length === 0) return { subject: s.subject, distance: Infinity };
                        let dist = 0;
                        for (let i = 0; i < 5; i++) {
                          dist += Math.abs(currentScores[i].score - sScores[i].score);
                        }
                        return { subject: s.subject, distance: dist };
                      })
                      .filter(d => d.distance !== Infinity)
                      .sort((a, b) => a.distance - b.distance);

                    if (distances.length < 2) return null;

                    const numToShow = Math.min(5, Math.floor(distances.length / 2));
                    const mostSimilar = distances.slice(0, numToShow).map((d) => d.subject);
                    const leastSimilar = [...distances].reverse().slice(0, numToShow).map((d) => d.subject);

                    return (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                          <strong style={{ color: "#f8fafc" }}>Most similar:</strong>{" "}
                          {mostSimilar.join(", ")}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                          <strong style={{ color: "#f8fafc" }}>Least similar:</strong>{" "}
                          {leastSimilar.join(", ")}
                        </div>
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {!hasSubmitted && (
                      <button
                        className="btn"
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                        onClick={() => handleStartFriendSurvey(subj.subject)}
                      >
                        Rate {subj.subject}
                      </button>
                    )}
                    {hasSubmitted && subj.subject !== state.userName && (
                      <span
                        style={{
                          color: "#4ade80",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Check size={14} /> Rated
                      </span>
                    )}
                    {subj.subject === state.userName && (
                      <span
                        style={{
                          color: "#818cf8",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <User size={14} /> You
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
