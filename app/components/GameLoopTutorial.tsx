"use client";

export const GAME_LOOP_BEATS = [
  { id: "match", title: "MATCH 3 FILMS", caption: "Complete a director’s set" },
  { id: "clear", title: "CLEAR DIRECTORS", caption: "Finished directors leave the board" },
  { id: "overflow", title: "DON’T FILL THE BOARD", caption: "Incoming director + 5 full slots = Game Over" },
] as const;

function MatchVisual() {
  return (
    <span className="game-loop-art tutorial-match-visual" aria-hidden="true">
      <span className="tutorial-ticket-fan"><i /><i /><i /></span>
      <b>→</b>
      <span className="tutorial-sockets"><i /><i /><i /></span>
    </span>
  );
}

function ClearVisual() {
  return (
    <span className="game-loop-art tutorial-clear-visual" aria-hidden="true">
      <span className="tutorial-director-clear"><i /><i /><i /></span>
      <b>→</b>
      <span className="tutorial-victory-chip">✓</span>
    </span>
  );
}

function OverflowVisual() {
  return (
    <span className="game-loop-art tutorial-board-pressure" aria-hidden="true">
      <span className="tutorial-board-slots"><i /><i /><i /><i /><i /></span>
      <b>+</b>
      <span className="tutorial-incoming-director">D</span>
      <em>!</em>
    </span>
  );
}

const visuals = {
  match: <MatchVisual />,
  clear: <ClearVisual />,
  overflow: <OverflowVisual />,
};

export function GameLoopTutorial({ onClose }: { onClose: () => void }) {
  return (
    <div className="screen-overlay help-overlay game-loop-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <button type="button" className="overlay-close" onClick={onClose} aria-label="Close instructions">×</button>
      <span className="tutorial-kicker">How to play</span>
      <h2 id="help-title">THE GAME LOOP</h2>
      <ol className="game-loop-steps">
        {GAME_LOOP_BEATS.map((step, index) => (
          <li className={`game-loop-step is-${step.id}`} data-loop={step.id} key={step.id}>
            <span className="game-loop-number" aria-hidden="true">0{index + 1}</span>
            {visuals[step.id]}
            <h3>{step.title}</h3>
            <span className="game-loop-caption">{step.caption}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="primary-pixel-button" onClick={onClose}>Start sorting</button>
    </div>
  );
}
