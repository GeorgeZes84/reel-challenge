"use client";

import type { RefObject } from "react";
import type { Director, Film } from "../data/directors";
import { DIRECTOR_HINT_LABELS, DIRECTOR_HINT_TYPES, type DirectorHintType } from "../data/director-hints";
import { canUseEliminationHint, GAME_CONFIG, hintCostForMovie, HINT_TYPES, type DirectorHintReveal, type GameState, type HintType } from "../data/game-engine";
import { CoinWalletEffects, type CoinRewardEvent } from "./CoinRewardFx";

const hintCopy: Record<HintType, { icon: string; name: string; detail: string }> = {
  movieIdentification: { icon: "▣", name: "Frame check", detail: "See one production frame" },
  releaseDate: { icon: "#", name: "Release date", detail: "Reveal the movie's release year" },
  verbalDirectorClue: { icon: "≡", name: "Director note", detail: "Reveal another credit" },
  elimination: { icon: "×", name: "Cross one out", detail: "Eliminate another candidate" },
  directAnswer: { icon: "!", name: "EMERGENCY ANSWER", detail: "Reveal the correct director · no move spent · reduced score" },
};

const directorHintCopy: Record<DirectorHintType, { icon: string; detail: string }> = {
  origin: { icon: "◎", detail: "Where this filmmaker comes from" },
  careerPeriod: { icon: "⌛", detail: "When their directing voice emerged" },
  genreTendency: { icon: "▦", detail: "The genres they repeatedly explore" },
  thematicDNA: { icon: "◇", detail: "The ideas that recur across their work" },
  styleNote: { icon: "✦", detail: "A recognizable visual or formal habit" },
  knownFor: { icon: "★", detail: "Their wider contribution to cinema" },
};

type GameHudProps = {
  game: GameState;
  selectedFilm: Film | null;
  hintContextFilm: Film | null;
  hintContextDirector: Director | null;
  openDirectorHint: DirectorHintReveal | null;
  hintRescueVisible: boolean;
  directorsById: Map<string, Director>;
  message: string;
  coinRewards: readonly CoinRewardEvent[];
  coinWalletRef: RefObject<HTMLDivElement | null>;
  directorCounterRef: RefObject<HTMLElement | null>;
  directorArrivalActive: boolean;
  onHint: (type: HintType) => void;
  onDirectorHint: (type: DirectorHintType) => void;
  onOpenDirectorHint: (type: DirectorHintType) => void;
  onAssign: (directorId: string) => void;
};

export function GameHud({
  game,
  selectedFilm,
  hintContextFilm,
  hintContextDirector,
  openDirectorHint,
  hintRescueVisible,
  directorsById,
  message,
  coinRewards,
  coinWalletRef,
  directorCounterRef,
  directorArrivalActive,
  onHint,
  onDirectorHint,
  onOpenDirectorHint,
  onAssign,
}: GameHudProps) {
  const hintRuntime = hintContextFilm ? game.movies[hintContextFilm.id] : undefined;
  const directorCount = game.activeDirectorIds.length;
  const stageVictoryDirectors = game.victoryDirectors.filter((victory) => game.stageDirectorIds.includes(victory.directorId));
  const stageVictories = stageVictoryDirectors.length;
  const isCleanup = game.stagePhase === "cleanup";
  const isFinalReelsPending = !isCleanup && game.upcomingDirectorIds.length === 0;
  const arrivalState = isCleanup ? "cleanup" : isFinalReelsPending ? "finalizing" : game.nextDirectorIn <= 1 ? "critical" : game.nextDirectorIn === 2 ? "hot" : game.nextDirectorIn === 3 ? "warm" : "safe";
  const isLastSafeMove = !isCleanup && !isFinalReelsPending && directorCount === GAME_CONFIG.maximumActiveDirectors - 1 && game.nextDirectorIn === 1;
  const hintMode = hintContextDirector ? "director" : hintContextFilm ? "movie" : "none";
  const hintContextName = hintContextDirector?.name ?? hintContextFilm?.title ?? "Select a movie or director";

  return (
    <>
      <section className={`hud-panel score-panel multiplier-${game.currentMultiplier}`} aria-label={`Score ${game.score}. Combo ${game.correctStreak}. Multiplier ${game.currentMultiplier} times.`}>
        <div className="score-heading"><span className="hud-label">Stage {game.stageNumber} · Total score</span><b>{stageVictories}/{game.stageDirectorIds.length} cleared</b></div>
        <div className="score-line">
          <strong>{game.score.toLocaleString("en-US")}</strong>
          <div className="multiplier-badge" key={game.currentMultiplier}>
            <span aria-hidden="true">{game.currentMultiplier === 3 ? "🔥" : game.currentMultiplier === 2 ? "♨" : "×"}</span>
            <b>×{game.currentMultiplier}</b>
            <small>{game.currentMultiplier === 3 ? "ON FIRE" : game.currentMultiplier === 2 ? "STEAMING" : `${game.correctStreak} COMBO`}</small>
          </div>
        </div>
      </section>

      <section
        className={`hud-panel next-director-panel arrival-${arrivalState}${isLastSafeMove ? " is-last-safe" : ""}${directorArrivalActive ? " is-launching" : ""}`}
        ref={directorCounterRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={isCleanup ? `Stage cleanup. ${game.visibleMovieIds.length} movies remain. Solved tickets will not be replaced.` : isFinalReelsPending ? "Final stage tickets are entering. Cleanup begins when every remaining movie is on the board." : `Next director in ${game.nextDirectorIn} ${game.nextDirectorIn === 1 ? "move" : "moves"}.${isLastSafeMove ? " Last safe move. Clear a director now." : ""}`}
      >
        <span className="next-director-label">{isCleanup ? "Stage cleanup" : isFinalReelsPending ? "Final stage reels" : "Next director in"}</span>
        {isCleanup ? <div className="cleanup-display"><strong>CLEANUP · {game.visibleMovieIds.length} LEFT</strong><b>Solved tickets will not be replaced</b></div> : (
          isFinalReelsPending ? <div className="cleanup-display"><strong>LAST TICKETS ENTERING</strong><b>Cleanup begins when all are on the board</b></div> : (
            <div className="next-director-display" aria-hidden="true">
              <strong>{game.nextDirectorIn}</strong>
              <b>{game.nextDirectorIn === 1 ? "Move" : "Moves"}</b>
            </div>
          )
        )}
        {isLastSafeMove ? <small className="next-director-warning">Last safe move · Clear a director now</small> : null}
      </section>

      <section className={`hud-panel hint-panel hint-mode-${hintMode}${hintRescueVisible && hintMode === "movie" ? " is-rescue" : ""}`} aria-label="Hint shop">
        <div className="panel-heading"><span className="hud-label">Hint shop</span><b>{hintMode === "director" ? "DIRECTOR HINTS" : hintMode === "movie" ? "MOVIE HINTS" : "SELECT CONTEXT"}</b></div>
        <div className={`hint-context${hintMode !== "none" ? ` has-${hintMode}` : ""}`} role="status" aria-live="polite" aria-atomic="true">
          <span>Hints for:</span><strong>{hintContextName}</strong>
        </div>
        {hintRescueVisible && hintMode === "movie" ? <div className="hint-rescue" role="status">Four misses—try one clue. Your sticker stays on the ticket.</div> : null}
        <div className="hint-shop-intro">
          <div
            className="coin-readout"
            ref={coinWalletRef}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${game.coins} coins available`}
          >
            <span className="coin-symbol" aria-hidden="true">●</span>
            <span className="coin-copy"><small>Wallet</small><strong>{game.coins} coins</strong></span>
            <CoinWalletEffects events={coinRewards} />
          </div>
          <p className="selected-readout is-empty">{hintMode === "director" ? "Build a director file without revealing the three movie answers." : "Buy a clue. Its sticker stays with this ticket."}</p>
        </div>
        {hintMode === "director" && openDirectorHint ? (
          <div className="director-hint-reveal" role="status" aria-live="polite" aria-atomic="true" key={`${hintContextDirector?.id}-${openDirectorHint.type}`}>
            <span>{openDirectorHint.label}</span><strong>{openDirectorHint.content}</strong>
          </div>
        ) : null}
        {hintMode === "director" ? (
          <div className="hint-grid director-hint-grid">
            {DIRECTOR_HINT_TYPES.map((type) => {
              const owned = game.directorHints[hintContextDirector.id]?.[type];
              const cost = GAME_CONFIG.directorHintCosts[type];
              const disabled = game.status !== "playing" || (!owned && game.coins < cost);
              return (
                <button type="button" className={owned ? "is-owned" : ""} disabled={disabled} onClick={() => owned ? onOpenDirectorHint(type) : onDirectorHint(type)} title={owned ? `Open ${DIRECTOR_HINT_LABELS[type]}` : directorHintCopy[type].detail} key={type}>
                  <span className="hint-icon" aria-hidden="true">{directorHintCopy[type].icon}</span>
                  <span><strong>{DIRECTOR_HINT_LABELS[type]}</strong><small>{owned ? "FILED · OPEN AGAIN" : directorHintCopy[type].detail}</small></span>
                  <span className="hint-price"><small>{owned ? "Owned" : "Cost"}</small><b>{owned ? "OPEN" : `${cost} ●`}</b></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="hint-grid movie-hint-grid">
            {HINT_TYPES.map((type) => {
              const cost = hintContextFilm ? hintCostForMovie(game, hintContextFilm.id, type) : GAME_CONFIG.hintCosts[type];
              const owned = Boolean(hintRuntime?.hints[type]);
              const gated = (type === "elimination" || type === "directAnswer") && game.activeDirectorIds.length < 3;
              const eliminationAvailable = Boolean(hintContextFilm && canUseEliminationHint(game, hintContextFilm.id));
              const eliminationUses = hintRuntime?.hints.elimination?.purchaseCount ?? 0;
              const unavailable = type === "elimination" && !gated && !eliminationAvailable;
              const disabled = !hintContextFilm || (owned && type !== "elimination") || gated || unavailable || game.coins < cost || game.status !== "playing";
              const buttonClass = type === "directAnswer" ? `is-emergency${owned ? " is-owned" : ""}` : owned && type !== "elimination" ? "is-owned" : type === "elimination" && eliminationUses > 0 ? "is-repeatable" : "";
              return (
                <button type="button" className={buttonClass} disabled={disabled} onClick={() => onHint(type)} title={gated ? "Unlocks with 3 active directors" : unavailable ? "Only one candidate remains" : hintCopy[type].detail} key={type}>
                  <span className="hint-icon" aria-hidden="true">{hintCopy[type].icon}</span>
                  <span><strong>{hintCopy[type].name}</strong><small>{gated ? "LOCKED · 3 DIRECTORS" : unavailable ? "ONE CANDIDATE LEFT" : type === "elimination" && eliminationUses > 0 ? `USED ${eliminationUses}× · USE AGAIN` : owned ? "STICKER OWNED" : type === "directAnswer" ? `PANIC OPTION · ${Math.round(GAME_CONFIG.emergencyAnswerScoreMultiplier * 100)}% MATCH SCORE` : hintCopy[type].detail}</small></span>
                  <span className="hint-price"><small>{owned && type !== "elimination" ? "Owned" : "Cost"}</small><b>{owned && type !== "elimination" ? "✓" : `${cost} ●`}</b></span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedFilm ? (
        <section className="hud-panel quick-file" aria-label={`Choose the director of ${selectedFilm.title} without dragging`}>
          <span className="hud-label">Choose this movie&apos;s director</span>
          <div>
            {game.activeDirectorIds.map((directorId, index) => (
              <button
                type="button"
                onClick={() => onAssign(directorId)}
                disabled={game.status !== "playing"}
                aria-label={`Assign ${selectedFilm.title} to ${directorsById.get(directorId)?.name ?? "this director"}`}
                key={directorId}
              >
                <span>{index + 1}</span>{directorsById.get(directorId)?.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="hud-message" role="status" aria-live="polite">{message}</div>
    </>
  );
}
