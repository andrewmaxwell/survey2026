import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  RefreshCcw,
  User,
} from "lucide-react";
import { useState } from "react";
import type { SurveyRating } from "../api";
import type { SurveyState } from "../types";
import {
  getAccuracyScore,
  getAnswerHighlights,
  getArchetype,
  getBestKnownBy,
  getConsensusScores,
  getKnowsBest,
  getSelfAwarenessScore,
  getSimilarAndDifferent,
  getSimilarityPercentage,
  getSubjectAverageAnswers,
  getSubjectScores,
  getTraitRanges,
  type SubjectSummary,
} from "../utils";
import { FriendQuotes } from "./FriendQuotes";
import { Heatmap } from "./Heatmap";
import { Insights } from "./Insights";
import { RadarChart } from "./RadarChart";
import { TraitRanges } from "./TraitRanges";

type SubjectInfo = SubjectSummary;

interface DashboardProps {
  state: SurveyState;
  isLoading: boolean;
  analysisData: SurveyRating[];
  /** Unadjusted rows, for quoting what friends actually picked. */
  rawData: SurveyRating[];
  loadError?: string | null;
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

/** Interpret mean as a tendency label + color */
// function interpretMean(mean: number): { label: string; color: string } {
//   if (mean >= 60) return { label: "Positive", color: "#4ade80" };
//   if (mean >= 55) return { label: "Slightly positive", color: "#86efac" };
//   if (mean > 45) return { label: "Neutral", color: "#94a3b8" };
//   if (mean > 40) return { label: "Slightly negative", color: "#fbbf24" };
//   return { label: "Negative", color: "#f87171" };
// }

// /** Interpret stdDev as a spread label + color */
// function interpretSpread(stdDev: number): { label: string; color: string } {
//   if (stdDev >= 22) return { label: "Wide spread", color: "#c084fc" };
//   if (stdDev >= 15) return { label: "Moderate spread", color: "#94a3b8" };
//   return { label: "Narrow spread", color: "#67e8f9" };
// }

// const pillStyle = (color: string): React.CSSProperties => ({
//   display: "inline-block",
//   padding: "2px 8px",
//   borderRadius: "8px",
//   fontSize: "0.7rem",
//   fontWeight: 600,
//   color,
//   background: `${color}18`,
//   border: `1px solid ${color}30`,
// });

// function RatingStatsRow({
//   label,
//   icon,
//   stats,
// }: {
//   label: string;
//   icon: string;
//   stats: { mean: number; median: number; stdDev: number };
// }) {
//   const meanI = interpretMean(stats.mean);
//   const spreadI = interpretSpread(stats.stdDev);

//   return (
//     <div style={{ marginBottom: "8px" }}>
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: "8px",
//           flexWrap: "wrap",
//           marginBottom: "4px",
//         }}
//       >
//         <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", minWidth: "90px" }}>
//           {icon} {label}
//         </span>
//         <span style={pillStyle(meanI.color)}>{meanI.label}</span>
//         <span style={pillStyle(spreadI.color)}>{spreadI.label}</span>
//       </div>
//       <div style={{ fontSize: "0.7rem", color: "#64748b", marginLeft: "28px" }}>
//         avg {stats.mean} · med {stats.median} · σ {stats.stdDev}
//       </div>
//     </div>
//   );
// }

function SubjectCard({
  subj,
  state,
  allAverages,
  analysisData,
  rawData,
  subjectsArray,
  handleStartFriendSurvey,
}: {
  subj: SubjectInfo;
  state: SurveyState;
  allAverages: Map<string, number[]>;
  analysisData: SurveyRating[];
  rawData: SurveyRating[];
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

  // Archetypes: Self vs Friends
  const selfRatings = analysisData.filter(
    (r) => r.subject.trim().toLowerCase() === subj.subject.trim().toLowerCase() && r.rater.trim().toLowerCase() === subj.subject.trim().toLowerCase()
  );
  const friendRatings = analysisData.filter(
    (r) => r.subject.trim().toLowerCase() === subj.subject.trim().toLowerCase() && r.rater.trim().toLowerCase() !== subj.subject.trim().toLowerCase()
  );

  const selfScores = selfRatings.length > 0 ? getSubjectScores(subj.subject, selfRatings) : null;
  const friendScores = friendRatings.length > 0 ? getSubjectScores(subj.subject, friendRatings) : null;

  const selfArchetype = selfScores ? getArchetype(selfScores) : null;
  const friendArchetype = friendScores ? getArchetype(friendScores) : null;

  // Fallback to overall archetype if we don't have both
  const overallScores = getConsensusScores(subj.subject, analysisData);
  const traitRanges = getTraitRanges(subj.subject, analysisData);
  const highlights = getAnswerHighlights(subj.subject, rawData);
  const overallArchetype = getArchetype(overallScores);

  // const givenStats = getRatingStats(ratingsBy(subj.subject, analysisData));
  // const receivedStats = getRatingStats(friendRatingsOf(subj.subject, analysisData));

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
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "1.2rem",
                  marginBottom: "2px",
                }}
              >
                {subj.subject}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, marginTop: "2px" }}>
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
            style={{
              fontSize: "0.75rem",
              color: "#818cf8",
              fontWeight: 600,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {selfArchetype && friendArchetype ? (
              <>
                <span style={{ whiteSpace: "nowrap" }}><span style={{ color: "#94a3b8" }}>Self:</span> {selfArchetype.emoji} {selfArchetype.name}</span>
                <span style={{ margin: "0 6px", opacity: 0.5 }}>|</span>
                <span style={{ whiteSpace: "nowrap" }}><span style={{ color: "#94a3b8" }}>Friends:</span> {friendArchetype.emoji} {friendArchetype.name}</span>
              </>
            ) : (
              <span style={{ whiteSpace: "nowrap" }}>
                {overallArchetype.emoji} {overallArchetype.name}
              </span>
            )}
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
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                {selfArchetype && friendArchetype ? (
                  <>
                    <div><strong style={{color: "#cbd5e1"}}>Self ({selfArchetype.name}):</strong> {selfArchetype.description}</div>
                    <div><strong style={{color: "#cbd5e1"}}>Friends ({friendArchetype.name}):</strong> {friendArchetype.description}</div>
                  </>
                ) : (
                  <div>{overallArchetype.description}</div>
                )}
              </div>

              <TraitRanges ranges={traitRanges} />
              <FriendQuotes highlights={highlights} isSelf={isSelf} />

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
                  {isSelf ? "Alignment with friends:" : "Alignment with friends:"}{" "}
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

              {/* Rating Stats */}
              {/* {(givenStats || receivedStats) && (
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: "0.7rem", color: "#ec4899", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
                    📊 Rating Tendencies
                  </div>
                  {givenStats && <RatingStatsRow label="Given" icon="📤" stats={givenStats} />}
                  {receivedStats && <RatingStatsRow label="Received" icon="📥" stats={receivedStats} />}
                </div>
              )} */}
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
  rawData,
  loadError,
  subjectsArray,
  handleSwitchUser,
  handleStartFriendSurvey,
  handleRefresh,
}: DashboardProps) {
  const allAverages = new Map<string, number[]>();

  subjectsArray.forEach((s) => {
    // For similarity, compare how the *group* perceives people
    const friendRatings = analysisData.filter(
      (r) => r.subject.trim().toLowerCase() === s.subject.trim().toLowerCase() && r.rater.trim().toLowerCase() !== s.subject.trim().toLowerCase()
    );
    // If friends have rated, use their average to represent the subject. Otherwise fallback to self.
    const dataToUse = friendRatings.length > 0 ? friendRatings : analysisData.filter(r => r.subject.trim().toLowerCase() === s.subject.trim().toLowerCase());
    
    allAverages.set(
      s.subject,
      getSubjectAverageAnswers(s.subject, dataToUse),
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

      {loadError && (
        <p className="error-message" role="alert">
          {loadError}
        </p>
      )}

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
        ) : sortedSubjects.length === 0 && !loadError ? (
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
              rawData={rawData}
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
