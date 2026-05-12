import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  RefreshCcw,
  User,
} from "lucide-react";
import type { SurveyRating } from "../api";
import type { SurveyState } from "../types";
import {
  getSubjectScores,
  getSubjectAverageAnswers,
  getSimilarityPercentage,
  getSimilarAndDifferent,
  getAccuracyScore,
  getSelfAwarenessScore,
  getKnowsBest,
  getBestKnownBy,
  getArchetype,
} from "../utils";
import { RadarChart } from "./RadarChart";
import { QuestionBreakdown } from "./QuestionBreakdown";
import { Insights } from "./Insights";
import { Heatmap } from "./Heatmap";

interface SubjectInfo {
  subject: string;
  friendCount: number;
  ratedCount: number;
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

/** Render a name + percentage pair, with the percent styled subtly. */
function NamePct({ name, pct }: { name: string; pct: number }) {
  return (
    <span>
      {name}{" "}
      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{pct}%</span>
    </span>
  );
}

function SubjectCard({
  subj,
  state,
  allAverages,
  analysisData,
  subjectsArray,
  handleStartFriendSurvey,
}: {
  subj: SubjectInfo;
  state: SurveyState;
  allAverages: Map<string, number[]>;
  analysisData: SurveyRating[];
  subjectsArray: SubjectInfo[];
  handleStartFriendSurvey: (friendName: string) => void;
}) {
  const isSelf =
    subj.subject.trim().toLowerCase() === state.userName.trim().toLowerCase();
  const [isExpanded, setIsExpanded] = useState(isSelf);

  const hasSubmitted = subj.hasCurrentRater || isSelf;
  const lowConfidence = subj.friendCount < 3;
  const result = getSimilarAndDifferent(
    subj.subject,
    subjectsArray,
    allAverages,
  );

  const knowsBestList = getKnowsBest(subj.subject, analysisData);
  const bestKnownByList = getBestKnownBy(subj.subject, analysisData);

  const accuracyScore = !isSelf
    ? getAccuracyScore(state.userName, subj.subject, analysisData)
    : null;
  const selfAwarenessScore = getSelfAwarenessScore(subj.subject, analysisData);

  const currentUserAverages = allAverages.get(state.userName);
  const myAvg = allAverages.get(subj.subject);
  const simToMe =
    currentUserAverages && myAvg && !isSelf
      ? getSimilarityPercentage(currentUserAverages, myAvg)
      : null;

  // Archetype
  const scores = getSubjectScores(subj.subject, analysisData);
  const archetype = getArchetype(scores);

  return (
    <div
      className="glass-panel"
      style={{
        padding: "16px",
        marginBottom: "12px",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <RadarChart subject={subj.subject} allData={analysisData} />

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "1.2rem",
                  marginBottom: "2px",
                }}
              >
                {subj.subject}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#818cf8",
                  fontWeight: 600,
                }}
              >
                {archetype.emoji} {archetype.name}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {!hasSubmitted && (
                <button
                  className="btn"
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.8rem",
                    borderRadius: "12px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartFriendSurvey(subj.subject);
                  }}
                >
                  Rate
                </button>
              )}
              {hasSubmitted && !isSelf && (
                <span
                  style={{
                    color: "#4ade80",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Check size={14} /> Rated
                </span>
              )}
              {isSelf && (
                <span
                  style={{
                    color: "#818cf8",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <User size={14} /> You
                </span>
              )}
              {isExpanded ? (
                <ChevronUp size={20} color="#94a3b8" />
              ) : (
                <ChevronDown size={20} color="#94a3b8" />
              )}
            </div>
          </div>

          <div
            style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}
          >
            {subj.friendCount}{" "}
            {subj.friendCount === 1 ? "friend has" : "friends have"} rated them
            <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
            Rated {subj.ratedCount}{" "}
            {subj.ratedCount === 1 ? "friend" : "friends"}
            {lowConfidence && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "0.7rem",
                  color: "#64748b",
                  fontStyle: "italic",
                }}
              >
                — limited data
              </span>
            )}
          </div>

          {simToMe !== null && (
            <div
              style={{
                fontSize: "0.85rem",
                color: "#cbd5e1",
                marginTop: "2px",
              }}
            >
              <strong style={{ color: "#f8fafc" }}>Similarity to you:</strong>{" "}
              <span style={{ color: "#94a3b8" }}>{simToMe}%</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                marginTop: "16px",
              }}
            >
              {/* Archetype description */}
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#94a3b8",
                  marginBottom: "12px",
                  fontStyle: "italic",
                }}
              >
                {archetype.description}
              </div>

              {result && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                    <strong style={{ color: "#f8fafc" }}>Most similar:</strong>{" "}
                    {result.mostSimilar.map((item, i) => (
                      <span key={item.subject}>
                        {i > 0 && ", "}
                        <NamePct name={item.subject} pct={item.similarity} />
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#cbd5e1",
                      marginTop: "4px",
                    }}
                  >
                    <strong style={{ color: "#f8fafc" }}>Least similar:</strong>{" "}
                    {result.leastSimilar.map((item, i) => (
                      <span key={item.subject}>
                        {i > 0 && ", "}
                        <NamePct name={item.subject} pct={item.similarity} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {knowsBestList.length > 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#cbd5e1",
                    marginBottom: "4px",
                  }}
                >
                  <strong style={{ color: "#f8fafc" }}>Knows best:</strong>{" "}
                  {knowsBestList.map((item, i) => (
                    <span key={item.person}>
                      {i > 0 && ", "}
                      <NamePct name={item.person} pct={item.accuracy} />
                    </span>
                  ))}
                </div>
              )}

              {bestKnownByList.length > 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#cbd5e1",
                    marginBottom: "12px",
                  }}
                >
                  <strong style={{ color: "#f8fafc" }}>Best known by:</strong>{" "}
                  {bestKnownByList.map((item, i) => (
                    <span key={item.person}>
                      {i > 0 && ", "}
                      <NamePct name={item.person} pct={item.accuracy} />
                    </span>
                  ))}
                </div>
              )}

              {accuracyScore !== null && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#94a3b8",
                    marginTop: "8px",
                  }}
                >
                  Your accuracy score:{" "}
                  <strong
                    style={{
                      color: "#4ade80",
                      opacity: lowConfidence ? 0.6 : 1,
                    }}
                  >
                    {accuracyScore}%
                  </strong>
                  {lowConfidence && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#64748b",
                        marginLeft: "6px",
                      }}
                    >
                      *
                    </span>
                  )}
                </div>
              )}

              {selfAwarenessScore !== null && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#94a3b8",
                    marginTop: "4px",
                  }}
                >
                  {isSelf ? "Self-awareness score:" : "Their self-awareness:"}{" "}
                  <strong
                    style={{
                      color: "#a855f7",
                      opacity: lowConfidence ? 0.6 : 1,
                    }}
                  >
                    {selfAwarenessScore}%
                  </strong>
                  {lowConfidence && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#64748b",
                        marginLeft: "6px",
                      }}
                    >
                      *
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const allAverages = new Map<string, number[]>();

  subjectsArray.forEach((s) => {
    allAverages.set(
      s.subject,
      getSubjectAverageAnswers(s.subject, analysisData),
    );
  });

  const currentUserAverages = allAverages.get(state.userName);
  const sortedSubjects = [...subjectsArray].sort((a, b) => {
    const aIsSelf =
      a.subject.trim().toLowerCase() === state.userName.trim().toLowerCase();
    const bIsSelf =
      b.subject.trim().toLowerCase() === state.userName.trim().toLowerCase();
    if (aIsSelf) return -1;
    if (bIsSelf) return 1;

    if (!currentUserAverages) return 0;

    const aAvg = allAverages.get(a.subject);
    const bAvg = allAverages.get(b.subject);

    const simA = aAvg ? getSimilarityPercentage(currentUserAverages, aAvg) : 0;
    const simB = bAvg ? getSimilarityPercentage(currentUserAverages, bAvg) : 0;

    return simB - simA; // Most similar first
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
          marginBottom: "16px",
        }}
      >
        <h2
          className="title"
          style={{ margin: 0, fontSize: "1.8rem", textAlign: "left" }}
        >
          Analysis
        </h2>
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
      </div>

      <div className="friend-list">
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "40px 0",
            }}
          >
            <Loader2 className="spin" size={32} />
          </div>
        ) : sortedSubjects.length === 0 ? (
          <p
            className="hint"
            style={{ textAlign: "center", marginTop: "16px" }}
          >
            No one else has taken the survey yet! Check back later.
          </p>
        ) : (
          sortedSubjects.map((subj) => (
            <SubjectCard
              key={subj.subject}
              subj={subj}
              state={state}
              allAverages={allAverages}
              analysisData={analysisData}
              subjectsArray={subjectsArray}
              handleStartFriendSurvey={handleStartFriendSurvey}
            />
          ))
        )}
      </div>

      <Insights
        analysisData={analysisData}
        subjects={subjectsArray.map((s) => s.subject)}
        currentUser={state.userName}
      />

      <Heatmap
        analysisData={analysisData}
        subjects={subjectsArray.map((s) => s.subject)}
      />

      <QuestionBreakdown analysisData={analysisData} />

      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}
      >
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
    </motion.div>
  );
}
