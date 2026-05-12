import { useMemo } from "react";
import { motion } from "framer-motion";
import type { SurveyRating } from "../api";
import { getSubjectAverageAnswers, getSimilarityMatrix } from "../utils";

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

export function Heatmap({ analysisData, subjects }: HeatmapProps) {
  const { sortedSubjects, matrix, minVal, maxVal } = useMemo(() => {
    const allAverages = new Map<string, number[]>();
    subjects.forEach((s) => {
      allAverages.set(s, getSubjectAverageAnswers(s, analysisData));
    });

    const result = getSimilarityMatrix(subjects, allAverages);

    // Find actual min/max of OFF-DIAGONAL values to stretch the color range
    let minVal = 100;
    let maxVal = 0;
    result.matrix.forEach((row, ri) => {
      row.forEach((val, ci) => {
        if (ri !== ci) {
          minVal = Math.min(minVal, val);
          maxVal = Math.max(maxVal, val);
        }
      });
    });

    // Sort by average similarity (most connected first)
    const avgSims = result.subjects.map((_, i) => {
      const row = result.matrix[i];
      const sum = row.reduce((a, b) => a + b, 0) - 100;
      return { index: i, avg: sum / (row.length - 1) };
    });
    avgSims.sort((a, b) => b.avg - a.avg);

    const sortedSubjects = avgSims.map((s) => result.subjects[s.index]);
    const sortedMatrix = avgSims.map((s) =>
      avgSims.map((t) => result.matrix[s.index][t.index]),
    );

    return { sortedSubjects, matrix: sortedMatrix, minVal, maxVal };
  }, [analysisData, subjects]);

  if (subjects.length < 3) return null;

  const cellSize = Math.min(40, Math.max(24, Math.floor(360 / subjects.length)));
  const range = maxVal - minVal || 1; // avoid division by zero

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
        🗺️ Relationship Heatmap
      </div>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: "8px",
          lineHeight: 1.4,
        }}
      >
        How similar is everyone to each other?
      </div>
      <p
        style={{
          fontSize: "0.85rem",
          color: "#94a3b8",
          marginBottom: "20px",
          lineHeight: 1.5,
        }}
      >
        Colors are stretched to the data range ({minVal}%–{maxVal}%). Warmer = more similar.
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

          {/* Column headers — rotated 45° */}
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
                // Map val to 0-1 within the actual data range
                const t = isSelf ? 1 : (val - minVal) / range;

                return (
                  <div
                    key={`${rowName}-${colName}`}
                    title={isSelf ? `${rowName}` : `${rowName} ↔ ${colName}: ${val}%`}
                    className="heatmap-cell"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: "4px",
                      background: isSelf
                        ? "rgba(255,255,255,0.06)"
                        : lerpColor(t),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: cellSize < 30 ? "0.5rem" : "0.6rem",
                      fontWeight: 600,
                      color: isSelf
                        ? "rgba(255,255,255,0.12)"
                        : t > 0.6
                          ? "rgba(0,0,0,0.5)"
                          : "rgba(255,255,255,0.7)",
                      cursor: "default",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
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
                    {isSelf ? "—" : val}
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
