import type { SurveyRating } from "../api";
import { getSubjectScores } from "../utils";

export function RadarChart({
  subject,
  allData,
}: {
  subject: string;
  allData: SurveyRating[];
}) {
  const selfData = allData.filter(
    (r) =>
      r.rater.trim().toLowerCase() === subject.trim().toLowerCase() &&
      r.subject.trim().toLowerCase() === subject.trim().toLowerCase(),
  );
  const friendData = allData.filter(
    (r) =>
      r.rater.trim().toLowerCase() !== subject.trim().toLowerCase() &&
      r.subject.trim().toLowerCase() === subject.trim().toLowerCase(),
  );

  const selfScores = getSubjectScores(subject, selfData);
  const friendScores = getSubjectScores(subject, friendData);

  if (selfScores.length === 0 && friendScores.length === 0) return null;

  const axisData = selfScores.length > 0 ? selfScores : friendScores;

  const size = 110;
  const center = size / 2;
  const radius = size / 2 - 14;

  const selfColor = `hsl(280, 80%, 65%)`;
  const selfFill = `hsla(280, 80%, 65%, 0.3)`;

  const friendColor = `hsl(190, 80%, 55%)`;
  const friendFill = `hsla(190, 80%, 55%, 0.3)`;

  const renderPolygon = (
    data: { dimension: string; score: number }[],
    color: string,
    fill: string,
  ) => {
    if (data.length === 0) return null;
    const points = data
      .map((d, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const r = (d.score / 100) * radius;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(" ");

    return (
      <g key={color}>
        <polygon
          points={points}
          fill={fill}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const r = (d.score / 100) * radius;
          return (
            <circle
              key={`dot-${i}`}
              cx={center + r * Math.cos(angle)}
              cy={center + r * Math.sin(angle)}
              r="2"
              fill={color}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <svg width={size} height={size}>
          {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
            <polygon
              key={scale}
              points={axisData
                .map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                  const r = scale * radius;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                })
                .join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
            />
          ))}
          {axisData.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            return (
              <line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="rgba(255,255,255,0.05)"
              />
            );
          })}
          {renderPolygon(selfScores, selfColor, selfFill)}
          {renderPolygon(friendScores, friendColor, friendFill)}
        </svg>
        {axisData.map((d, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const labelR = radius + 9;
          const x = center + labelR * Math.cos(angle);
          const y = center + labelR * Math.sin(angle);
          return (
            <div
              key={`label-${i}`}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
                fontSize: "7px",
                color: "#94a3b8",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {d.dimension.substring(0, 3)}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          fontSize: "0.6rem",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {selfScores.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: selfColor,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                background: selfColor,
                borderRadius: "2px",
              }}
            />{" "}
            Self
          </div>
        )}
        {friendScores.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: friendColor,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                background: friendColor,
                borderRadius: "2px",
              }}
            />{" "}
            Friends
          </div>
        )}
      </div>
    </div>
  );
}
