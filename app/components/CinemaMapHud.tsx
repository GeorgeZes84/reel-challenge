"use client";

import { useEffect, useRef, type Ref } from "react";
import { CINEMA_MAP_COUNTRY_NAMES } from "../data/cinema-map-data";
import type { CinemaMapProgress, CinemaMapResult } from "../data/cinema-map-engine";
import { CinemaJourneyMap, cinemaCountryName } from "./CinemaWorldMap";

function keepFocusInResults(event: globalThis.KeyboardEvent, dialog: HTMLDivElement) {
  if (event.key !== "Tab") return;
  const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])")];
  if (focusable.length === 0) return;
  const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
  if (activeIndex === -1 || (event.shiftKey && activeIndex === 0) || (!event.shiftKey && activeIndex === focusable.length - 1)) {
    event.preventDefault();
    focusable[event.shiftKey ? focusable.length - 1 : 0]?.focus();
  }
}

export function CinemaMapHud({ totalScore, progress, quickPlay = false }: { totalScore: number; progress: CinemaMapProgress; quickPlay?: boolean }) {
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

export function CinemaMapResults({
  result,
  totalScore,
  headingRef,
  onReplay,
  onContinue,
  quickPlay = false,
  onSelectGame,
}: {
  result: CinemaMapResult;
  totalScore: number;
  headingRef?: Ref<HTMLHeadingElement>;
  onReplay: () => void;
  onContinue: () => void;
  quickPlay?: boolean;
  onSelectGame?: () => void;
}) {
  const journey = result.visitedCountryIds.map((countryId) => CINEMA_MAP_COUNTRY_NAMES[countryId] ?? cinemaCountryName(countryId));
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => keepFocusInResults(event, dialog);
    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, []);
  return (
    <div ref={dialogRef} className="screen-overlay stage-results-overlay cinema-map-results-overlay" role="dialog" aria-modal="true" aria-labelledby="cinema-map-results-title">
      <p>{quickPlay ? "Game 04 complete · Cinema Map" : "Stage 4 complete · Cinema Map"}</p>
      <h2 id="cinema-map-results-title" ref={headingRef} tabIndex={-1}>Your cinema journey is stamped.</h2>
      <div className="cinema-map-results-layout">
        <div>
          <div className="stage-score-transfer">
            <div><span>{quickPlay ? "Game score" : "Map score"}</span><strong>+{result.score.toLocaleString("en-US")}</strong></div>
            <i aria-hidden="true">→</i>
            <div><span>Total score</span><strong>{(totalScore + result.score).toLocaleString("en-US")}</strong></div>
          </div>
          <div className="stage-results-grid cinema-map-results-grid">
            <div><span>Movies placed</span><strong>{result.moviesPlaced}/{result.moviesTotal}</strong></div>
            <div><span>First try</span><strong>{result.firstTryCorrect}</strong></div>
            <div><span>Mistakes</span><strong>{result.incorrect}</strong></div>
            <div><span>Accuracy</span><strong>{result.accuracy}%</strong></div>
            <div><span>Best streak</span><strong>{result.bestStreak}</strong></div>
            <div><span>Routes revealed</span><strong>{result.revealedMovies}</strong></div>
          </div>
        </div>
        <div className="cinema-journey-summary">
          <span>Your cinema journey</span>
          <CinemaJourneyMap visitedCountryCounts={result.visitedCountryCounts} />
          <p>{journey.join(" · ")}</p>
        </div>
      </div>
      <div className="cinema-map-result-actions">
        <button type="button" className="primary-pixel-button" onClick={quickPlay ? onReplay : onContinue}>{quickPlay ? "Travel again" : "Continue to Stage 5"}</button>
        {quickPlay
          ? onSelectGame ? <button type="button" className="secondary-pixel-button" onClick={onSelectGame}>Select another game</button> : null
          : <button type="button" className="secondary-pixel-button" onClick={onReplay}>Replay Cinema Map</button>}
      </div>
    </div>
  );
}
