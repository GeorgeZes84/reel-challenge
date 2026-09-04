"use client";

import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Film } from "../data/directors";
import { genreColor, genreFamily } from "../data/genre-colors";

export const TIMELINE_CARD_COUNT = 7;
export const TIMELINE_POINTS_PER_CORRECT = 500;

export type TimelineProgress = {
  attempted: number;
  correct: number;
  score: number;
  total: number;
};

export type TimelineResult = TimelineProgress & {
  anchorTitle: string;
  earliestYear: number;
  latestYear: number;
};

type PlacedFilm = { film: Film; result: "anchor" | "correct" | "corrected" };
type DragRecord = {
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLElement;
  gaps: Array<{ index: number; rect: DOMRect }>;
};

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    value += 0x6d2b79f5;
    let random = value;
    random = Math.imul(random ^ (random >>> 15), random | 1);
    random ^= random + Math.imul(random ^ (random >>> 7), random | 61);
    const swapIndex = Math.floor((((random ^ (random >>> 14)) >>> 0) / 4294967296) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function correctGapIndex(placed: readonly PlacedFilm[], film: Film) {
  const nextLaterFilm = placed.findIndex((candidate) => candidate.film.year > film.year);
  return nextLaterFilm < 0 ? placed.length : nextLaterFilm;
}

function isCorrectGap(placed: readonly PlacedFilm[], film: Film, gapIndex: number) {
  const left = placed[gapIndex - 1]?.film.year ?? Number.NEGATIVE_INFINITY;
  const right = placed[gapIndex]?.film.year ?? Number.POSITIVE_INFINITY;
  return film.year >= left && film.year <= right;
}

function TimelineFilmCard({ film, result, dateHidden = false, cardRef }: { film: Film; result?: PlacedFilm["result"]; dateHidden?: boolean; cardRef?: (element: HTMLElement | null) => void }) {
  return (
    <article
      ref={cardRef}
      className={`timeline-film-card${result ? ` is-${result}` : ""}${dateHidden ? " is-date-hidden" : ""}`}
      style={{ "--timeline-accent": genreColor(film.genre) } as CSSProperties}
      aria-label={`${film.title}. ${dateHidden ? "Release date hidden" : `Released ${film.year}`}.`}
    >
      <span>{result === "anchor" ? "ANCHOR" : result === "corrected" ? "DATE LEARNED" : result === "correct" ? "CORRECT" : "MOVIE TICKET"}</span>
      <strong>{film.title}</strong>
      <small>{genreFamily(film.genre)}</small>
      <b>{dateHidden ? "DATE ?" : film.year}</b>
    </article>
  );
}

export function ReleaseTimelineStage({
  films,
  seed,
  onProgress,
  onComplete,
  quickPlay = false,
}: {
  films: readonly Film[];
  seed: string;
  onProgress: (progress: TimelineProgress) => void;
  onComplete: (result: TimelineResult) => void;
  quickPlay?: boolean;
}) {
  const deck = useMemo(() => {
    const unique = Array.from(new Map(films.map((film) => [film.id, film])).values());
    const shuffled = seededShuffle(unique, `${seed}-release-timeline`);
    return { anchorOptions: shuffled.slice(0, 3), challengeFilms: shuffled.slice(3, 3 + TIMELINE_CARD_COUNT) };
  }, [films, seed]);
  const [anchor, setAnchor] = useState<Film | null>(null);
  const [placed, setPlaced] = useState<PlacedFilm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [hoveredGap, setHoveredGap] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState(quickPlay
    ? "Choose one movie. Its year becomes your timeline anchor."
    : "Choose one movie from Stage 1. Its year becomes your timeline anchor.");
  const gapRefs = useRef(new Map<number, HTMLButtonElement>());
  const filmRefs = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<DragRecord | null>(null);
  const hoveredGapRef = useRef<number | null>(null);
  const [focusedDecade, setFocusedDecade] = useState<number | null>(null);
  const currentFilm = anchor ? deck.challengeFilms[currentIndex] ?? null : null;
  const decadeMarkers = useMemo(() => {
    if (placed.length === 0) return [];
    const earliestDecade = Math.floor(placed[0].film.year / 10) * 10;
    const latestDecade = Math.floor(placed[placed.length - 1].film.year / 10) * 10;
    return Array.from({ length: (latestDecade - earliestDecade) / 10 + 1 }, (_, index) => {
      const decade = earliestDecade + index * 10;
      return {
        decade,
        films: placed.filter(({ film }) => Math.floor(film.year / 10) * 10 === decade).map(({ film }) => film),
      };
    });
  }, [placed]);

  const focusDecade = (decade: number, eraFilms: Film[]) => {
    setFocusedDecade(decade);
    filmRefs.current.get(eraFilms[0]?.id)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setMessage(`${decade}s: ${eraFilms.length} ${eraFilms.length === 1 ? "movie" : "movies"} currently filed in this span.`);
  };

  const selectAnchor = (film: Film) => {
    setAnchor(film);
    setPlaced([{ film, result: "anchor" }]);
    setMessage(`${film.title} (${film.year}) is your anchor. Place the next ticket before, between or after the dated cards.`);
    onProgress({ attempted: 0, correct: 0, score: 0, total: deck.challengeFilms.length });
  };

  const placeAt = (gapIndex: number) => {
    if (!anchor || !currentFilm) return;
    const placementCorrect = isCorrectGap(placed, currentFilm, gapIndex);
    const insertionIndex = placementCorrect ? gapIndex : correctGapIndex(placed, currentFilm);
    const nextPlaced = [...placed];
    nextPlaced.splice(insertionIndex, 0, { film: currentFilm, result: placementCorrect ? "correct" : "corrected" });
    const nextAttempted = currentIndex + 1;
    const nextCorrect = correct + (placementCorrect ? 1 : 0);
    const score = nextCorrect * TIMELINE_POINTS_PER_CORRECT;
    setPlaced(nextPlaced);
    setCorrect(nextCorrect);
    setCurrentIndex(nextAttempted);
    setMessage(placementCorrect
      ? `Correct — ${currentFilm.title} was released in ${currentFilm.year}. +${TIMELINE_POINTS_PER_CORRECT} points.`
      : `Not quite — ${currentFilm.title} was released in ${currentFilm.year}. It has been filed in the correct position.`);
    const progress = { attempted: nextAttempted, correct: nextCorrect, score, total: deck.challengeFilms.length };
    onProgress(progress);
    if (nextAttempted >= deck.challengeFilms.length) {
      onComplete({
        ...progress,
        anchorTitle: anchor.title,
        earliestYear: nextPlaced[0].film.year,
        latestYear: nextPlaced[nextPlaced.length - 1].film.year,
      });
    }
  };

  const gapAtPoint = (clientX: number, clientY: number, gaps: DragRecord["gaps"]) => {
    const match = gaps.find(({ rect }) => clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
    return match?.index ?? null;
  };

  const startDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (!currentFilm || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      element: event.currentTarget,
      gaps: Array.from(gapRefs.current, ([index, element]) => ({ index, rect: element.getBoundingClientRect() })),
    };
    hoveredGapRef.current = null;
    setDragging(true);
    setMessage("Release the ticket on a glowing gap in the timeline.");
  };

  const moveDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    drag.element.style.transform = `translate3d(${event.clientX - drag.startX}px, ${event.clientY - drag.startY}px, 0) rotate(0deg) scale(1.06)`;
    const gap = gapAtPoint(event.clientX, event.clientY, drag.gaps);
    if (gap !== hoveredGapRef.current) {
      hoveredGapRef.current = gap;
      setHoveredGap(gap);
    }
  };

  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const gap = gapAtPoint(event.clientX, event.clientY, drag.gaps);
    drag.element.style.transform = "";
    dragRef.current = null;
    hoveredGapRef.current = null;
    setDragging(false);
    setHoveredGap(null);
    if (gap === null) {
      setMessage("Drop the ticket directly on one of the timeline gaps. You can also click a gap.");
      return;
    }
    placeAt(gap);
  };

  const cancelDragging = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.element.style.transform = "";
    dragRef.current = null;
    hoveredGapRef.current = null;
    setDragging(false);
    setHoveredGap(null);
  };

  if (!anchor) {
    return (
      <div className="timeline-stage is-choosing-anchor">
        <header className="timeline-stage-heading">
          <span>{quickPlay ? "GAME 02 · RELEASE TIMELINE" : "STAGE 2 · RELEASE TIMELINE"}</span>
          <h2>Choose your starting point.</h2>
          <p>{quickPlay
            ? "Pick any movie; its release year will become the first fixed point on your timeline."
            : "These are movies you encountered in Stage 1. Pick one; its release year will become the first fixed point on the timeline."}</p>
        </header>
        <div className="timeline-anchor-options">
          {deck.anchorOptions.map((film) => (
            <div className="timeline-anchor-option" key={film.id}>
              <TimelineFilmCard film={film} dateHidden />
              <button type="button" onClick={() => selectAnchor(film)}>Use as anchor</button>
            </div>
          ))}
        </div>
        <div className="timeline-status" role="status">{message}</div>
      </div>
    );
  }

  return (
    <div className="timeline-stage" onPointerMove={moveDragging} onPointerUp={stopDragging} onPointerCancel={cancelDragging} onLostPointerCapture={cancelDragging}>
      <header className="timeline-stage-heading"><span>{quickPlay ? "GAME 02 · RELEASE TIMELINE" : "STAGE 2 · RELEASE TIMELINE"}</span><h2>When did it come out?</h2><p>Drag the current ticket into the correct chronological gap. A wrong placement reveals the year and files it correctly, so the timeline always teaches as it grows.</p></header>
      <nav className="timeline-decade-guide" aria-label="Jump to a decade in the movie timeline">
        <div className="timeline-decade-summary">
          <span>DECADE FINDER</span>
          <strong>{decadeMarkers.length === 1 ? `${decadeMarkers[0].decade}s` : `${decadeMarkers[0]?.decade}s → ${decadeMarkers.at(-1)?.decade}s`}</strong>
          <small>Pick an era to center its movies.</small>
        </div>
        <div className="timeline-decade-scale">
          {decadeMarkers.map(({ decade, films: eraFilms }) => (
            <button type="button" aria-pressed={focusedDecade === decade} disabled={eraFilms.length === 0} onClick={() => focusDecade(decade, eraFilms)} key={decade}>
              <span>{decade}s</span>
              <strong>{eraFilms.length}</strong>
              <small>{eraFilms.length === 1 ? "MOVIE" : "MOVIES"}</small>
            </button>
          ))}
        </div>
      </nav>
      <div className="timeline-track-wrap" aria-label="Chronological movie timeline">
        <div className="timeline-track">
          {placed.flatMap((entry, index) => [
            <button
              type="button"
              className={`timeline-gap${hoveredGap === index ? " is-hovered" : ""}`}
              ref={(element) => { if (element) gapRefs.current.set(index, element); else gapRefs.current.delete(index); }}
              onClick={() => placeAt(index)}
              aria-label={index === 0 ? `Place ${currentFilm?.title ?? "movie"} before ${entry.film.title}` : `Place ${currentFilm?.title ?? "movie"} between dated movies`}
              disabled={!currentFilm}
              key={`gap-${index}`}
            ><span>DROP</span><b>+</b></button>,
            <TimelineFilmCard
              film={entry.film}
              result={entry.result}
              cardRef={(element) => { if (element) filmRefs.current.set(entry.film.id, element); else filmRefs.current.delete(entry.film.id); }}
              key={entry.film.id}
            />,
          ]).concat(
            <button
              type="button"
              className={`timeline-gap${hoveredGap === placed.length ? " is-hovered" : ""}`}
              ref={(element) => { if (element) gapRefs.current.set(placed.length, element); else gapRefs.current.delete(placed.length); }}
              onClick={() => placeAt(placed.length)}
              aria-label={`Place ${currentFilm?.title ?? "movie"} after ${placed.at(-1)?.film.title ?? "the timeline"}`}
              disabled={!currentFilm}
              key={`gap-${placed.length}`}
            ><span>DROP</span><b>+</b></button>,
          )}
        </div>
      </div>
      <div className="timeline-current-tray">
        <div><span>NOW FILE THIS TICKET</span><strong>{currentIndex + (currentFilm ? 1 : 0)} / {deck.challengeFilms.length}</strong></div>
        {currentFilm ? (
          <div className={`timeline-drag-ticket${dragging ? " is-dragging" : ""}`} onPointerDown={startDragging}>
            <TimelineFilmCard film={currentFilm} dateHidden />
          </div>
        ) : <div className="timeline-deck-complete">TIMELINE COMPLETE ✓</div>}
        <small>Drag to a gap, or click the gap where this movie belongs.</small>
      </div>
      <div className="timeline-status" role="status" aria-live="polite">{message}</div>
    </div>
  );
}

export function ReleaseTimelineHud({ totalScore, progress, quickPlay = false }: { totalScore: number; progress: TimelineProgress; quickPlay?: boolean }) {
  const accuracy = progress.attempted === 0 ? 100 : Math.round((progress.correct / progress.attempted) * 100);
  return (
    <>
      <section className="hud-panel score-panel timeline-score-panel">
        <div className="stage-progress-line"><strong>{quickPlay ? "GAME 02" : "STAGE 2"}</strong><b>GLOBAL CINEMA FILE</b></div>
        <div className="score-heading"><span className="hud-label">Total score</span><b>{quickPlay ? "Game" : "Stage"} score +{progress.score.toLocaleString("en-US")}</b></div>
        <div className="score-line"><strong>{(totalScore + progress.score).toLocaleString("en-US")}</strong><div className="timeline-accuracy"><span>Accuracy</span><b>{accuracy}%</b></div></div>
      </section>
      <section className="hud-panel timeline-progress-panel">
        <span className="hud-label">Release timeline</span>
        <strong>{progress.correct} correct</strong>
        <div><span>{progress.attempted} placed</span><b>{progress.total - progress.attempted} remaining</b></div>
      </section>
      <section className="hud-panel timeline-rules-panel">
        <span className="hud-label">How this {quickPlay ? "game" : "Stage"} works</span>
        <ol><li>{quickPlay ? "Choose a movie as your anchor." : "Choose an anchor from Stage 1."}</li><li>Place each hidden-date ticket chronologically.</li><li>Earn {TIMELINE_POINTS_PER_CORRECT} points for every correct position.</li></ol>
        <small>Incorrect dates are revealed and filed automatically. {quickPlay ? "You can play again from the results." : "Your run continues either way."}</small>
      </section>
    </>
  );
}

export function ReleaseTimelineResults({
  result,
  totalScore,
  onContinue,
  quickPlay = false,
  onReplay,
  onSelectGame,
}: {
  result: TimelineResult;
  totalScore: number;
  onContinue: () => void;
  quickPlay?: boolean;
  onReplay?: () => void;
  onSelectGame?: () => void;
}) {
  const accuracy = result.total === 0 ? 100 : Math.round((result.correct / result.total) * 100);
  return (
    <div className="screen-overlay stage-results-overlay timeline-results-overlay" role="dialog" aria-modal="true" aria-labelledby="timeline-results-title">
      <p>{quickPlay ? "Game 02 complete · Release timeline" : "Stage 2 complete · Release timeline"}</p>
      <h2 id="timeline-results-title">Your cinema timeline is filed.</h2>
      <div className="stage-score-transfer">
        <div><span>{quickPlay ? "Game score" : "Timeline score"}</span><strong>+{result.score.toLocaleString("en-US")}</strong></div>
        <i aria-hidden="true">→</i>
        <div><span>Total score</span><strong>{totalScore.toLocaleString("en-US")}</strong></div>
        <small>{quickPlay ? "Quick Play score · ready for another take" : `Stage 1 total: ${(totalScore - result.score).toLocaleString("en-US")}`}</small>
      </div>
      <div className="stage-results-grid">
        <div><span>Correct placements</span><strong>{result.correct}/{result.total}</strong></div>
        <div><span>Accuracy</span><strong>{accuracy}%</strong></div>
        <div><span>Anchor</span><strong>{result.anchorTitle}</strong></div>
        <div><span>Timeline span</span><strong>{result.earliestYear}–{result.latestYear}</strong></div>
      </div>
      {quickPlay ? (
        <div className="cast-call-result-actions">
          {onReplay ? <button type="button" className="primary-pixel-button" onClick={onReplay}>Play again</button> : null}
          {onSelectGame ? <button type="button" className="secondary-pixel-button" onClick={onSelectGame}>Select another game</button> : null}
        </div>
      ) : <button type="button" className="primary-pixel-button" onClick={onContinue}>Continue to Stage 3</button>}
      <small className="stage-continue-note">{quickPlay ? "Replay this challenge or choose another movie game." : "Your total score carries forward into the next game mode."}</small>
    </div>
  );
}
