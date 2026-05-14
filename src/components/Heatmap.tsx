import { motion } from "framer-motion";
import { useMemo } from "react";
import type { SurveyRating } from "../api";
import {
  getKnowledgeMatrix,
  getSimilarityMatrix,
  getSubjectAverageAnswers,
} from "../utils";

interface HeatmapProps {
  analysisData: SurveyRating[];
  subjects: string[];
}

/**
 * Interpolate color from cool purple (low) → teal (mid) → warm gold (high).
 * `t` is 0-1, mapped to the *actual data range* not 0-100.
 */
function lerpColor(t: number): string {
  if (t < 0.5) {
    const s = t * 2;
    return `hsl(${260 - s * 80}, ${50 + s * 30}%, ${25 + s * 20}%)`;
  } else {
    const s = (t - 0.5) * 2;
    return `hsl(${180 - s * 140}, ${80 - s * 10}%, ${45 + s * 15}%)`;
  }
}

// ── Shared helpers ────────────────────────────────────────────────────

function computeMinMax(matrix: (number | null)[][]) {
  let minVal = 100;
  let maxVal = 0;
  matrix.forEach((row, ri) => {
    row.forEach((val, ci) => {
      if (ri !== ci && val !== null) {
        minVal = Math.min(minVal, val);
        maxVal = Math.max(maxVal, val);
      }
    });
  });
  return { minVal, maxVal };
}

function sortByAverage(
  subjects: string[],
  matrix: (number | null)[][],
): { sortedSubjects: string[]; sortedMatrix: (number | null)[][] } {
  const avgs = subjects.map((_, i) => {
    let sum = 0;
    let count = 0;
    matrix[i].forEach((val, j) => {
      if (i !== j && val !== null) {
        sum += val;
        count++;
      }
    });
    return { index: i, avg: count > 0 ? sum / count : 0 };
  });
  avgs.sort((a, b) => b.avg - a.avg);

  const sortedSubjects = avgs.map((s) => subjects[s.index]);
  const sortedMatrix = avgs.map((s) =>
    avgs.map((t) => matrix[s.index][t.index]),
  );
  return { sortedSubjects, sortedMatrix };
}

// ── Shared Grid Component ─────────────────────────────────────────────

interface GridData {
  sortedSubjects: string[];
  matrix: (number | null)[][];
  minVal: number;
  maxVal: number;
}

interface HeatmapGridProps extends GridData {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  /** Label between names in tooltip ("↔" or "→") */
  arrowLabel?: string;
  selfLabel?: string;
}

function HeatmapGrid({
  sortedSubjects,
  matrix,
  minVal,
  maxVal,
  icon,
  title,
  subtitle,
  description,
  arrowLabel = "↔",
  selfLabel = "—",
}: HeatmapGridProps) {
  const cellSize = Math.min(
    40,
    Math.max(24, Math.floor(360 / sortedSubjects.length)),
  );
  const range = maxVal - minVal || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-panel"
      style={{ padding: "24px", borderRadius: "16px", marginTop: "24px" }}
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
          marginBottom: "8px",
          lineHeight: 1.4,
        }}
      >
        {subtitle}
      </div>
      <p
        style={{
          fontSize: "0.85rem",
          color: "#94a3b8",
          marginBottom: "20px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: `100px repeat(${sortedSubjects.length}, ${cellSize}px)`,
            gridTemplateRows: `auto repeat(${sortedSubjects.length}, ${cellSize}px)`,
            gap: "2px",
          }}
        >
          {/* Empty top-left corner */}
          <div />

          {/* Column headers — rotated 55° */}
          {sortedSubjects.map((name) => (
            <div
              key={`col-${name}`}
              style={{
                height: "70px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                paddingBottom: "4px",
                paddingLeft: "2px",
              }}
            >
              <div
                style={{
                  transform: "rotate(-55deg)",
                  transformOrigin: "bottom left",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "visible",
                }}
                title={name}
              >
                {name}
              </div>
            </div>
          ))}

          {/* Rows */}
          {sortedSubjects.map((rowName, ri) => (
            <>
              {/* Row label */}
              <div
                key={`row-${rowName}`}
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  paddingRight: "8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={rowName}
              >
                {rowName}
              </div>

              {/* Cells */}
              {sortedSubjects.map((colName, ci) => {
                const val = matrix[ri][ci];
                const isSelf = ri === ci;
                const isEmpty = val === null;
                const t = isSelf || isEmpty ? 0 : (val - minVal) / range;

                return (
                  <div
                    key={`${rowName}-${colName}`}
                    title={
                      isSelf
                        ? rowName
                        : isEmpty
                          ? `${rowName} ${arrowLabel} ${colName}: no data`
                          : `${rowName} ${arrowLabel} ${colName}: ${val}%`
                    }
                    className="heatmap-cell"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: "4px",
                      background:
                        isSelf || isEmpty
                          ? "rgba(255,255,255,0.06)"
                          : lerpColor(t),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: cellSize < 30 ? "0.5rem" : "0.6rem",
                      fontWeight: 600,
                      color:
                        isSelf || isEmpty
                          ? "rgba(255,255,255,0.12)"
                          : t > 0.6
                            ? "rgba(0,0,0,0.5)"
                            : "rgba(255,255,255,0.7)",
                      cursor: "default",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (isSelf || isEmpty) return;
                      const el = e.currentTarget;
                      el.style.transform = "scale(1.25)";
                      el.style.zIndex = "10";
                      el.style.boxShadow = "0 0 12px rgba(0,0,0,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.transform = "scale(1)";
                      el.style.zIndex = "0";
                      el.style.boxShadow = "none";
                    }}
                  >
                    {isSelf ? selfLabel : isEmpty ? "" : val}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "16px",
          fontSize: "0.7rem",
          color: "#94a3b8",
        }}
      >
        <span>{minVal}%</span>
        <div
          style={{
            flex: 1,
            maxWidth: "200px",
            height: "10px",
            borderRadius: "5px",
            background: `linear-gradient(90deg, ${lerpColor(0)}, ${lerpColor(0.25)}, ${lerpColor(0.5)}, ${lerpColor(0.75)}, ${lerpColor(1)})`,
          }}
        />
        <span>{maxVal}%</span>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function Heatmap({ analysisData, subjects }: HeatmapProps) {
  const similarityData = useMemo((): GridData | null => {
    if (subjects.length < 3) return null;

    const allAverages = new Map<string, number[]>();
    subjects.forEach((s) => {
      allAverages.set(s, getSubjectAverageAnswers(s, analysisData));
    });

    const result = getSimilarityMatrix(subjects, allAverages);
    const { minVal, maxVal } = computeMinMax(result.matrix);
    const { sortedSubjects, sortedMatrix } = sortByAverage(
      result.subjects,
      result.matrix,
    );

    return { sortedSubjects, matrix: sortedMatrix, minVal, maxVal };
  }, [analysisData, subjects]);

  const knowledgeData = useMemo((): GridData | null => {
    if (subjects.length < 3) return null;

    const result = getKnowledgeMatrix(subjects, analysisData);
    const { minVal, maxVal } = computeMinMax(result.matrix);
    const { sortedSubjects, sortedMatrix } = sortByAverage(
      result.subjects,
      result.matrix,
    );

    return { sortedSubjects, matrix: sortedMatrix, minVal, maxVal };
  }, [analysisData, subjects]);

  if (!similarityData) return null;

  return (
    <>
      <HeatmapGrid
        {...similarityData}
        icon="🗺️"
        title="Similarity Heatmap"
        subtitle="How similar is everyone to each other?"
        description={`Colors are stretched to the data range (${similarityData.minVal}%–${similarityData.maxVal}%). Warmer = more similar.`}
        arrowLabel="↔"
        selfLabel="—"
      />
      {knowledgeData && (
        <HeatmapGrid
          {...knowledgeData}
          icon="🧠"
          title="Knowledge Heatmap"
          subtitle="How well does each person know the others?"
          description={`Each cell shows how accurately the row person rated the column person vs. consensus. Gray = no rating. Range: ${knowledgeData.minVal}%–${knowledgeData.maxVal}%.`}
          arrowLabel="→"
          selfLabel="—"
        />
      )}
    </>
  );
}
