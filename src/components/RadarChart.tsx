import type { SurveyRating } from "../api";
import { getSubjectScores } from "../utils";

export function RadarChart({
  subject,
  allData,
}: {
  subject: string;
  allData: SurveyRating[];
}) {
  const data = getSubjectScores(subject, allData);
  if (data.length === 0) return null;

  const size = 90;
  const center = size / 2;
  const radius = size / 2 - 12;

  const points = data
    .map((d, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const r = (d.score / 100) * radius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(" ");

  const extScore =
    data.find((d) => d.dimension === "Extraversion")?.score || 50;
  const hue = Math.round(extScore * 2.5); // 0 to 250 (Red to Blueish)
  const color = `hsl(${hue}, 80%, 60%)`;
  const fill = `hsla(${hue}, 80%, 60%, 0.4)`;

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size}>
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
          <polygon
            key={scale}
            points={data
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
        {data.map((_, i) => {
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
      </svg>
      {data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const labelR = radius + 8;
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
              fontSize: "6px",
              color: "#64748b",
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
  );
}
