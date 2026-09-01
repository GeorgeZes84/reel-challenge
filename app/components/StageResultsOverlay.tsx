"use client";

import { useEffect, useState } from "react";
import {
  currentStageVictoryCount,
  hasNextStage,
  stageAccuracy,
  type GameState,
} from "../data/game-engine";

export function StageResultsOverlay({ game, onContinue }: { game: GameState; onContinue: () => void }) {
  const stageScore = game.score - game.stageStartScore;
  const stageMoves = game.moveCount - game.stageStartMoveCount;
  const stageCorrect = game.correctAttempts - game.stageStartCorrectAttempts;
  const stageWrong = game.wrongAttempts - game.stageStartWrongAttempts;
  const directorsCompleted = currentStageVictoryCount(game);
  const nextStageAvailable = hasNextStage(game);
  const [animatedTotal, setAnimatedTotal] = useState(game.stageStartScore);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || stageScore <= 0) {
      const timer = window.setTimeout(() => setAnimatedTotal(game.score), 0);
      return () => window.clearTimeout(timer);
    }
    const steps = 30;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setAnimatedTotal(Math.round(game.stageStartScore + stageScore * eased));
      if (step >= steps) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [game.score, game.stageStartScore, stageScore]);

  return (
    <div className="screen-overlay stage-results-overlay" role="dialog" aria-modal="true" aria-labelledby="stage-result-title">
      <p>Board cleared · Stage {game.stageNumber}</p>
      <h2 id="stage-result-title">Stage completed!</h2>

      <div className="stage-score-transfer" role="status" aria-live="polite" aria-atomic="true">
        <div><span>Stage score</span><strong>+{stageScore.toLocaleString("en-US")}</strong></div>
        <i aria-hidden="true">→</i>
        <div><span>Total score</span><strong>{animatedTotal.toLocaleString("en-US")}</strong></div>
        <small>+{stageScore.toLocaleString("en-US")} gained during this stage</small>
      </div>

      <div className="stage-results-grid">
        <div><span>Best combo</span><strong>{game.stageBestCombo}</strong></div>
        <div className={`stage-multiplier multiplier-${game.stageHighestMultiplier}`}><span>Highest multiplier</span><strong>×{game.stageHighestMultiplier}</strong></div>
        <div><span>Directors completed</span><strong>{directorsCompleted}/{game.stageDirectorIds.length}</strong></div>
        <div><span>Accuracy</span><strong>{stageAccuracy(game)}%</strong></div>
        <div><span>Correct</span><strong>{stageCorrect}</strong></div>
        <div><span>Mistakes</span><strong>{stageWrong}</strong></div>
        <div><span>Moves</span><strong>{stageMoves}</strong></div>
        <div><span>Run-best combo</span><strong>{game.bestCombo}</strong></div>
      </div>

      <div className="future-reward-slot">
        <span>Reward bay</span>
        <strong>Intermission slot reserved</strong>
        <small>Future bonuses and stage modifiers can dock here.</small>
      </div>

      <button type="button" className="primary-pixel-button" onClick={onContinue}>
        {nextStageAvailable ? `Continue to Stage ${game.stageNumber + 1}` : "Complete the archive"}
      </button>
    </div>
  );
}
