"use client";

import type { Ref } from "react";
import type { CastCallProgress, CastCallResult } from "../data/cast-call-engine";

export function CastCallHud({ totalScore, progress, quickPlay = false }: { totalScore: number; progress: CastCallProgress; quickPlay?: boolean }) {
  const attempts = progress.correct + progress.incorrect;
  const accuracy = attempts === 0 ? 100 : Math.round((progress.correct / attempts) * 100);
  return (
    <>
      <section className="hud-panel score-panel cast-call-score-panel">
        <div className="stage-progress-line"><strong>{quickPlay ? "GAME 03" : "STAGE 3"}</strong><b>CAST CALL</b></div>
        <div className="score-heading"><span className="hud-label">Total score</span><b>{quickPlay ? "Game" : "Stage"} score +{progress.score.toLocaleString("en-US")}</b></div>
        <div className="score-line"><strong>{(totalScore + progress.score).toLocaleString("en-US")}</strong><div className="timeline-accuracy"><span>Accuracy</span><b>{accuracy}%</b></div></div>
      </section>
      <section className="hud-panel cast-call-progress-panel">
        <span className="hud-label">Casting progress</span>
        <strong>{progress.moviesCompleted}/{progress.moviesTotal} pictures locked</strong>
        <div className="cast-hud-meter"><i style={{ width: `${progress.castTotal === 0 ? 0 : (progress.castCompleted / progress.castTotal) * 100}%` }} /></div>
        <div><span>{progress.castCompleted}/{progress.castTotal} actors</span><b>Streak {progress.streak}</b></div>
      </section>
      <section className="hud-panel cast-call-rules-panel">
        <span className="hud-label">Casting desk</span>
        <ol><li>One actor arrives at a time.</li><li>Drag the photo to either movie.</li><li>A missed actor returns later.</li></ol>
        <small>No countdown. First-try recognition, streaks and quick answers add small bonuses.</small>
      </section>
    </>
  );
}

export function CastCallResults({
  result,
  totalScore,
  headingRef,
  onReplay,
  onContinue,
  quickPlay = false,
  onSelectGame,
}: {
  result: CastCallResult;
  totalScore: number;
  headingRef?: Ref<HTMLHeadingElement>;
  onReplay: () => void;
  onContinue: () => void;
  quickPlay?: boolean;
  onSelectGame?: () => void;
}) {
  return (
    <div className="screen-overlay stage-results-overlay cast-call-results-overlay" role="dialog" aria-modal="true" aria-labelledby="cast-call-results-title">
      <p>{quickPlay ? "Game 03 complete · Cast Call" : "Stage 3 complete · Cast Call"}</p>
      <h2 id="cast-call-results-title" ref={headingRef} tabIndex={-1}>That&apos;s a picture wrap.</h2>
      <div className="stage-score-transfer">
        <div><span>{quickPlay ? "Game score" : "Cast Call score"}</span><strong>+{result.score.toLocaleString("en-US")}</strong></div>
        <i aria-hidden="true">→</i>
        <div><span>Total score</span><strong>{(totalScore + result.score).toLocaleString("en-US")}</strong></div>
        <small>{quickPlay ? "Quick Play score · every picture locked" : `Score before Stage 3: ${totalScore.toLocaleString("en-US")}`}</small>
      </div>
      <div className="stage-results-grid cast-call-results-grid">
        <div><span>Movies completed</span><strong>{result.moviesCompleted}/{result.moviesTotal}</strong></div>
        <div><span>First-try casts</span><strong>{result.firstTryCorrect}/{result.castTotal}</strong></div>
        <div><span>Mistakes</span><strong>{result.incorrect}</strong></div>
        <div><span>Accuracy</span><strong>{result.accuracy}%</strong></div>
        <div><span>Best streak</span><strong>{result.bestStreak}</strong></div>
      </div>
      <div className="cast-call-result-actions">
        <button type="button" className="primary-pixel-button" onClick={quickPlay ? onReplay : onContinue}>{quickPlay ? "Play again" : "Continue to Stage 4"}</button>
        {quickPlay
          ? onSelectGame ? <button type="button" className="secondary-pixel-button" onClick={onSelectGame}>Select another game</button> : null
          : <button type="button" className="secondary-pixel-button" onClick={onReplay}>Replay Cast Call</button>}
      </div>
      <small className="stage-continue-note">{quickPlay ? "Replay this casting desk or choose another movie game." : "Replay resets this casting desk. Continue adds its score to your ongoing run."}</small>
    </div>
  );
}
