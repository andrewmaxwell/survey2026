import { motion } from "framer-motion";
import { Check, Loader2, LogOut, RefreshCcw, User } from "lucide-react";
import type { SurveyRating } from "../api";
import type { SurveyState } from "../types";
import {
  getSubjectScores,
  getSubjectAverageAnswers,
  getSimilarityPercentage,
  getGrade,
  getSimilarAndDifferent,
  extractAnswers,
} from "../utils";
import { RadarChart } from "./RadarChart";
import { QuestionBreakdown } from "./QuestionBreakdown";
import { Insights } from "./Insights";

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
  const allAverages = new Map<string, number[]>();

  subjectsArray.forEach((s) => {
    allScores.set(s.subject, getSubjectScores(s.subject, analysisData));
    allAverages.set(
      s.subject,
      getSubjectAverageAnswers(s.subject, analysisData),
    );
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
          Analysis
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
            <RefreshCcw size={16} className={isLoading ? "spin" : ""} /> Refresh
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
                    const result = getSimilarAndDifferent(
                      subj.subject,
                      subjectsArray,
                      allAverages,
                    );
                    if (!result) return null;

                    const renderList = (
                      list: { subject: string; similarity: number }[],
                    ) => {
                      return list.map((item, idx) => (
                        <span key={item.subject}>
                          {idx > 0 && ", "}
                          {item.subject}{" "}
                          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                            ({item.similarity}%)
                          </span>
                        </span>
                      ));
                    };

                    return (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                          <strong style={{ color: "#f8fafc" }}>
                            Most similar:
                          </strong>{" "}
                          {renderList(result.mostSimilar)}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#cbd5e1",
                            marginTop: "4px",
                          }}
                        >
                          <strong style={{ color: "#f8fafc" }}>
                            Least similar:
                          </strong>{" "}
                          {renderList(result.leastSimilar)}
                        </div>
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginTop: "12px",
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

                  {(() => {
                    const userRating = analysisData.find(
                      (r) =>
                        r.rater.toLowerCase() ===
                          state.userName.toLowerCase() &&
                        r.subject.toLowerCase() === subj.subject.toLowerCase(),
                    );
                    if (userRating && subj.friendCount > 0) {
                      const accuracy = getSimilarityPercentage(
                        extractAnswers(userRating),
                        allAverages.get(subj.subject)!,
                      );
                      const grade = getGrade(accuracy);
                      const label =
                        subj.subject === state.userName
                          ? "Self-awareness score:"
                          : "Your accuracy score:";
                      const colorMap: Record<string, string> = {
                        A: "#4ade80",
                        B: "#60a5fa",
                        C: "#facc15",
                        D: "#fb923c",
                        F: "#f87171",
                      };

                      return (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#94a3b8",
                            marginTop: "8px",
                          }}
                        >
                          {label}{" "}
                          <strong
                            style={{ color: colorMap[grade] || "#f87171" }}
                          >
                            {grade}
                          </strong>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Insights
        analysisData={analysisData}
        subjects={subjectsArray.map((s) => s.subject)}
        currentUser={state.userName}
      />

      <QuestionBreakdown analysisData={analysisData} />
    </motion.div>
  );
}
