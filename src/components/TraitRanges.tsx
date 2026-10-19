import type { TraitRange } from "../utils";

const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

function describe(r: TraitRange): string {
  const parts: string[] = [r.dimension];
  if (r.self !== null) parts.push(`self ${r.self}`);
  if (r.friends !== null) {
    parts.push(
      r.margin !== null
        ? `friends ${r.friends}, likely ${Math.max(0, r.friends - r.margin)} to ${Math.min(100, r.friends + r.margin)}`
        : `friends ${r.friends}`,
    );
  }
  return parts.join(", ");
}

/**
 * One row per trait: a 0–100 track with the self-rating, the friends'
 * average, and a shaded band showing where the friends' average would
 * likely land with more raters.
 */
export function TraitRanges({ ranges }: { ranges: TraitRange[] }) {
  if (ranges.every((r) => r.self === null && r.friends === null)) return null;
  const friendCount = ranges[0]?.friendCount ?? 0;

  return (
    <div className="trait-ranges">
      <div className="trait-legend">
        <span>
          <i className="trait-dot-key self" /> Self
        </span>
        {friendCount > 0 && (
          <>
            <span>
              <i className="trait-dot-key friends" /> Friends
            </span>
            <span>
              <i className="trait-band-key" /> Likely range
            </span>
          </>
        )}
      </div>

      {ranges.map((r) => (
        <div className="trait-row" key={r.dimension}>
          <span className="trait-name" title={r.dimension}>
            {r.dimension}
          </span>
          <div className="trait-track" role="img" aria-label={describe(r)}>
            {r.friends !== null && r.margin !== null && (
              <div
                className="trait-band"
                style={{
                  left: pct(r.friends - r.margin),
                  right: `calc(100% - ${pct(r.friends + r.margin)})`,
                }}
              />
            )}
            {r.friends !== null && (
              <div className="trait-dot friends" style={{ left: pct(r.friends) }} />
            )}
            {r.self !== null && (
              <div className="trait-dot self" style={{ left: pct(r.self) }} />
            )}
          </div>
          <span className="trait-value">
            {r.friends !== null
              ? `${r.friends}${r.margin !== null ? ` ±${r.margin}` : ""}`
              : r.self}
          </span>
        </div>
      ))}

      {friendCount > 0 && friendCount < 3 && (
        <p className="trait-note">
          Based on just {friendCount}{" "}
          {friendCount === 1 ? "friend" : "friends"}. A few more ratings would
          sharpen the picture.
        </p>
      )}
    </div>
  );
}
