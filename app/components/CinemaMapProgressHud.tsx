"use client";

import type { CinemaMapProgress } from "../data/cinema-map-engine";

export function CinemaMapProgressHud({ totalScore, progress, quickPlay = false }: { totalScore: number; progress: CinemaMapProgress; quickPlay?: boolean }) {
  const attempts = progress.correct + progress.incorrect;
  const accuracy = attempts === 0 ? 100 : Math.round((progress.correct / attempts) * 100);
  return (
    <>
      <section className="hud-panel score-panel cinema-map-score-panel">
        <div className="stage-progress-line"><strong>{quickPlay ? "GAME 04" : "STAGE 4"}</strong><b>CINEMA MAP</b></div>
        <div className="score-heading"><span className="hud-label">Total score</span><b>{quickPlay ? "Game" : "Stage"} score +{progress.score.toLocaleString("en-US")}</b></div>
        <div className="score-line"><strong>{(totalScore + progress.score).toLocaleString("en-US")}</strong><div className="timeline-accuracy"><span>Accuracy</span><b>{accuracy}%</b></div></div>
      </section>
      <section className="hud-panel cinema-map-progress-panel">
        <span className="hud-label">Cinema journey</span>
        <strong>{progress.moviesPlaced}/{progress.moviesTotal} tickets stamped</strong>
        <div className="cinema-map-hud-meter"><i style={{ width: `${progress.moviesTotal === 0 ? 0 : (progress.moviesPlaced / progress.moviesTotal) * 100}%` }} /></div>
        <div><span>First try {progress.firstTryCorrect}</span><b>Streak {progress.streak}</b></div>
      </section>
      <section className="hud-panel cinema-map-rules-panel">
        <span className="hud-label">Travel desk</span>
        <ol><li>Zoom into a region.</li><li>Drag the ticket or tap a country.</li><li>Three misses reveal the route.</li></ol>
        <small>No timer. The map is forgiving around small countries, and World View always takes you home.</small>
      </section>
    </>
  );
}
