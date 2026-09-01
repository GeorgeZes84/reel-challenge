import type { RANKS } from "../data/game-engine";

type Rank = (typeof RANKS)[number];

export function RankPopup({ rank }: { rank: Rank | null }) {
  if (!rank) return null;
  return (
    <div className="rank-popup" role="status" aria-live="polite">
      <p>Rank up!</p>
      <strong>{rank.title}</strong>
      <small>{rank.quip}</small>
    </div>
  );
}
