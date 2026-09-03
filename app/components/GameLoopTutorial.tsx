"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { directors, type Film } from "../data/directors";
import { directorHintProfile } from "../data/director-hints";
import type { MovieRuntime } from "../data/game-engine";
import { DirectorSlot, MovieTicket, type Position } from "./ConstellationCard";

type TutorialPhase = "first-match" | "wrong-match" | "second-match" | "final-match" | "director-complete" | "director-archived" | "movie-hint" | "director-hint" | "reference";
type TutorialDrag = { filmId: string; pointerId: number; startX: number; startY: number; startPosition: Position; boardRect: DOMRect; targetRect: DOMRect; element: HTMLElement };

const tutorialDirector = directors.find((director) => director.id === "stanley-kubrick") ?? directors[0];
const wrongFilm = directors.find((director) => director.id === "ridley-scott")?.films[0] ?? directors[1].films[0];
const tutorialFilms = [...tutorialDirector.films.slice(0, 3), wrongFilm];
const tutorialFilmIds = tutorialDirector.films.slice(0, 3).map((film) => film.id);
const initialPositions: Record<string, Position> = {
  [tutorialFilms[0].id]: { x: 4, y: 7, rotation: -3 },
  [tutorialFilms[1].id]: { x: 4, y: 70, rotation: 2 },
  [tutorialFilms[2].id]: { x: 68, y: 70, rotation: -2 },
  [wrongFilm.id]: { x: 68, y: 7, rotation: 3 },
};

function makeRuntime(film: Film, ownerDirectorId: string): MovieRuntime {
  return { filmId: film.id, ownerDirectorId, status: "active", punchCount: 0, wrongDirectorIds: [], hints: {} };
}

const phaseCopy: Record<TutorialPhase, { label: string; title: string; body: string }> = {
  "first-match": { label: "Training 1 / 6", title: "Drag this movie ticket onto the Director.", body: "The glowing rectangle is a real movie ticket. The glowing blue card is the real drop target." },
  "wrong-match": { label: "Training 2 / 6", title: `Now drag ${wrongFilm.title} onto ${tutorialDirector.name}.`, body: "This one is deliberately wrong. Try it so you can see what a failed deduction does." },
  "second-match": { label: "Training 3 / 6", title: `Drag ${tutorialFilms[1].title} onto the Director.`, body: "The wrong ticket stayed on the board and gained a punch. Correct tickets fill the Director’s receivers." },
  "final-match": { label: "Training 4 / 6", title: `Drag ${tutorialFilms[2].title} to complete the Director.`, body: "Three correct movie tickets complete one Director and clear that Director slot." },
  "director-complete": { label: "Result", title: "Director complete — file leaving the board.", body: "Completion is a bigger event than one correct match because it removes an entire problem from the board." },
  "director-archived": { label: "Training 4 / 6 complete", title: "The Director slot is clear.", body: "Stage 1 is about matching movies to Directors. Later Stages introduce new cinema challenges while your total score keeps growing." },
  "movie-hint": { label: "Training 5 / 6", title: "Try one free Movie Hint.", body: "This one’s on us. Hints reveal extra information you can use to narrow down the answer." },
  "director-hint": { label: "Training 6 / 6", title: "Now try one free Director Hint.", body: "Movie Hints stay on tickets. Director Hints build a separate file about the filmmaker." },
  reference: { label: "How to play", title: "Quick reference", body: "The playable lesson is complete. You can replay it here whenever you want." },
};

const dragActionCopy: Partial<Record<TutorialPhase, { step: string; action: string; detail: string }>> = {
  "first-match": { step: "1 · START HERE", action: `Hold + drag ${tutorialFilms[0].title}`, detail: "Move the glowing ticket toward the center." },
  "wrong-match": { step: "2 · TRY A WRONG MATCH", action: `Hold + drag ${wrongFilm.title}`, detail: "This highlighted ticket is deliberately incorrect." },
  "second-match": { step: "3 · CONTINUE", action: `Hold + drag ${tutorialFilms[1].title}`, detail: "Use the next glowing ticket." },
  "final-match": { step: "4 · FINISH", action: `Hold + drag ${tutorialFilms[2].title}`, detail: "This final ticket completes the Director." },
};

function expectedFilmId(phase: TutorialPhase) {
  if (phase === "first-match") return tutorialFilms[0].id;
  if (phase === "wrong-match") return wrongFilm.id;
  if (phase === "second-match") return tutorialFilms[1].id;
  if (phase === "final-match") return tutorialFilms[2].id;
  return null;
}

export function GameLoopTutorial({ onClose, onComplete, startInReference = false }: { onClose: () => void; onComplete: () => void; startInReference?: boolean }) {
  const [phase, setPhase] = useState<TutorialPhase>(startInReference ? "reference" : "first-match");
  const [positions, setPositions] = useState(initialPositions);
  const [runtimeByFilm, setRuntimeByFilm] = useState<Record<string, MovieRuntime>>(() => Object.fromEntries(tutorialFilms.map((film) => [film.id, makeRuntime(film, film.id === wrongFilm.id ? "ridley-scott" : tutorialDirector.id)])));
  const [assignedFilmIds, setAssignedFilmIds] = useState<string[]>([]);
  const [draggingFilmId, setDraggingFilmId] = useState<string | null>(null);
  const [hoveringDirector, setHoveringDirector] = useState(false);
  const [directorFeedback, setDirectorFeedback] = useState<"correct" | "wrong" | null>(null);
  const [rejectedFilmId, setRejectedFilmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Follow the glow, then drag and release.");
  const [movieHintBought, setMovieHintBought] = useState(false);
  const [directorHintBought, setDirectorHintBought] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const directorRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<TutorialDrag | null>(null);
  const hoveringDirectorRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((candidate) => candidate !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  };

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const focusFilmId = expectedFilmId(phase);
  const isDragPhase = Boolean(focusFilmId);
  const copy = phaseCopy[phase];
  const dragAction = dragActionCopy[phase];
  const assignedFilms = assignedFilmIds.map((filmId) => tutorialDirector.films.find((film) => film.id === filmId)).filter((film): film is Film => Boolean(film));

  const resetLesson = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPhase("first-match");
    setPositions(initialPositions);
    setRuntimeByFilm(Object.fromEntries(tutorialFilms.map((film) => [film.id, makeRuntime(film, film.id === wrongFilm.id ? "ridley-scott" : tutorialDirector.id)])));
    setAssignedFilmIds([]);
    setDraggingFilmId(null);
    setHoveringDirector(false);
    setDirectorFeedback(null);
    setRejectedFilmId(null);
    setStatusMessage("Follow the glow, then drag and release.");
    setMovieHintBought(false);
    setDirectorHintBought(false);
  };

  const startDragging = (event: ReactPointerEvent<HTMLElement>, filmId: string) => {
    if (!isDragPhase || filmId !== focusFilmId || !boardRef.current || !directorRef.current) {
      setStatusMessage(isDragPhase ? "Use the glowing ticket for this step." : "This step uses the hint controls below.");
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { filmId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startPosition: positions[filmId], boardRect: boardRef.current.getBoundingClientRect(), targetRect: directorRef.current.getBoundingClientRect(), element: event.currentTarget };
    hoveringDirectorRef.current = false;
    setDraggingFilmId(filmId);
    setStatusMessage("Keep holding. Move the ticket over the blue Director card.");
  };

  const moveDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const x = Math.max(0, Math.min(82, drag.startPosition.x + (deltaX / drag.boardRect.width) * 100));
    const y = Math.max(0, Math.min(78, drag.startPosition.y + (deltaY / drag.boardRect.height) * 100));
    const visualDeltaX = ((x - drag.startPosition.x) / 100) * drag.boardRect.width;
    const visualDeltaY = ((y - drag.startPosition.y) / 100) * drag.boardRect.height;
    drag.element.style.transform = `translate3d(${visualDeltaX}px, ${visualDeltaY}px, 0) rotate(0deg) scale(1.08)`;
    const isHoveringDirector = event.clientX >= drag.targetRect.left && event.clientX <= drag.targetRect.right && event.clientY >= drag.targetRect.top && event.clientY <= drag.targetRect.bottom;
    if (isHoveringDirector !== hoveringDirectorRef.current) {
      hoveringDirectorRef.current = isHoveringDirector;
      setHoveringDirector(isHoveringDirector);
    }
  };

  const finishCorrectMatch = (filmId: string) => {
    setRuntimeByFilm((current) => ({ ...current, [filmId]: { ...current[filmId], status: "assigned" } }));
    setAssignedFilmIds((current) => [...current, filmId]);
    setDirectorFeedback("correct");
    setStatusMessage("Correct — the ticket locked into a real Director receiver.");
    const nextPhase: TutorialPhase = phase === "first-match" ? "wrong-match" : phase === "second-match" ? "final-match" : "director-complete";
    schedule(() => {
      setDirectorFeedback(null);
      setPhase(nextPhase);
      if (nextPhase === "wrong-match") setStatusMessage("Now test a wrong deduction.");
      if (nextPhase === "final-match") setStatusMessage("One more correct movie completes the Director.");
      if (nextPhase === "director-complete") {
        setStatusMessage("Three matches complete the Director. Watch the full file clear.");
        schedule(() => setPhase("director-archived"), 1120);
      }
    }, 520);
  };

  const finishWrongMatch = (filmId: string, startPosition: Position) => {
    setPositions((current) => ({ ...current, [filmId]: startPosition }));
    setRuntimeByFilm((current) => ({ ...current, [filmId]: { ...current[filmId], punchCount: current[filmId].punchCount + 1, wrongDirectorIds: [tutorialDirector.id] } }));
    setRejectedFilmId(filmId);
    setDirectorFeedback("wrong");
    setStatusMessage("Incorrect — one punch records the miss, but the ticket stays playable.");
    schedule(() => {
      setRejectedFilmId(null);
      setDirectorFeedback(null);
      setPhase("second-match");
      setStatusMessage("The punched ticket stayed. Continue with the next glowing movie.");
    }, 900);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const landed = event.clientX >= drag.targetRect.left && event.clientX <= drag.targetRect.right && event.clientY >= drag.targetRect.top && event.clientY <= drag.targetRect.bottom;
    dragRef.current = null;
    hoveringDirectorRef.current = false;
    setDraggingFilmId(null);
    setHoveringDirector(false);
    if (!landed) {
      drag.element.style.transform = "";
      setStatusMessage("Almost. Drop the ticket directly on the glowing blue Director card.");
      return;
    }
    if (phase === "wrong-match") {
      drag.element.style.transform = "";
      finishWrongMatch(drag.filmId, drag.startPosition);
    }
    else finishCorrectMatch(drag.filmId);
  };

  const cancelDragging = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.element.style.transform = "";
    dragRef.current = null;
    hoveringDirectorRef.current = false;
    setDraggingFilmId(null);
    setHoveringDirector(false);
  };

  const buyMovieHint = () => {
    if (movieHintBought) return;
    setMovieHintBought(true);
    setRuntimeByFilm((current) => ({ ...current, [wrongFilm.id]: { ...current[wrongFilm.id], hints: { ...current[wrongFilm.id].hints, releaseDate: { type: "releaseDate", label: "Release date", content: String(wrongFilm.year), purchasedAtMove: 0 } } } }));
    setStatusMessage(`Free Movie Hint revealed: ${wrongFilm.year}. The sticker now stays on the ticket.`);
  };

  const buyDirectorHint = () => {
    if (directorHintBought) return;
    setDirectorHintBought(true);
    setStatusMessage("Free Director Hint revealed. Director clues stay in the Director file.");
  };

  const finishTutorial = () => {
    onComplete();
    setPhase("reference");
  };

  const renderTrainingBoard = phase !== "movie-hint" && phase !== "director-hint" && phase !== "reference";

  return (
    <div className="screen-overlay help-overlay interactive-tutorial" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <button type="button" className="overlay-close" onClick={onClose} aria-label="Close instructions">×</button>
      <header className="interactive-tutorial-heading">
        <span className="tutorial-kicker">{copy.label}</span>
        <h2 id="help-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </header>

      {renderTrainingBoard ? (
        <div className={`interactive-tutorial-board${isDragPhase ? " is-awaiting-drag" : ""}${phase === "director-complete" ? " is-completing" : ""}`} ref={boardRef} onPointerMove={moveDragging} onPointerUp={stopDragging} onPointerCancel={cancelDragging} data-focus-film={focusFilmId ?? undefined}>
          {dragAction ? (
            <div className={`tutorial-action-popup is-${phase}`} role="note">
              <b>{dragAction.step}</b><strong>{dragAction.action}</strong><small>{dragAction.detail}</small>
            </div>
          ) : null}
          {phase === "director-complete" ? <div className="tutorial-action-popup is-watching" role="status"><b>WATCH THE RESULT</b><strong>The completed Director clears</strong><small>No click needed—the next step appears automatically.</small></div> : null}
          {tutorialFilms.map((film) => {
            const runtime = runtimeByFilm[film.id];
            if (!runtime || runtime.status === "assigned" || (phase === "director-archived" && film.id !== wrongFilm.id)) return null;
            return <MovieTicket film={film} runtime={runtime} position={positions[film.id]} isDragging={draggingFilmId === film.id} isRejected={rejectedFilmId === film.id} isSpawning={false} isSelected={focusFilmId === film.id} lastHintType={undefined} autoOpenHintType={undefined} onPointerDown={startDragging} onSelect={(filmId) => setStatusMessage(filmId === focusFilmId ? "Hold and drag this ticket onto the blue Director card." : "Use the glowing ticket for this step.")} onOpenDossier={() => setStatusMessage("The magnifying glass opens this ticket’s Movie File during the game.")} key={film.id} />;
          })}

          {phase !== "director-archived" ? (
            <div className={`tutorial-director-target${isDragPhase ? " is-highlighted" : ""}${hoveringDirector ? " is-hovered" : ""}`}>
              {isDragPhase ? <div className="tutorial-drop-instruction"><b>2</b><span><strong>RELEASE HERE</strong><small>Drop on this Director card</small></span></div> : null}
              <DirectorSlot slotIndex={0} director={tutorialDirector} films={assignedFilms} expectedFilmIds={tutorialFilmIds} isReceiving={Boolean(draggingFilmId)} dropState={hoveringDirector ? "neutral" : directorFeedback} isSpawning={false} arrivalImpactOrder={null} isArchiving={phase === "director-complete"} isEliminated={false} isSelected={false} registerRef={(_, element) => { directorRef.current = element; }} onSelect={() => setStatusMessage("This blue card is the Director drop target.")} onOpenDossier={() => undefined} />
            </div>
          ) : <div className="tutorial-cleared-slot" role="status"><span>✓</span><strong>DIRECTOR COMPLETE</strong><small>Slot cleared for the next arrival</small></div>}
        </div>
      ) : null}

      {phase === "movie-hint" ? (
        <div className="tutorial-hint-demo is-movie-demo">
          <div className="tutorial-hint-object">
            <MovieTicket film={wrongFilm} runtime={runtimeByFilm[wrongFilm.id]} position={{ x: 0, y: 0, rotation: -2 }} isDragging={false} isRejected={false} isSpawning={false} isSelected lastHintType={movieHintBought ? "releaseDate" : undefined} autoOpenHintType={movieHintBought ? "releaseDate" : undefined} onPointerDown={() => undefined} onSelect={() => undefined} onOpenDossier={() => undefined} />
          </div>
          <div className="tutorial-hint-purchase"><span>MOVIE HINT · SMALL CLUE</span><strong>Release year</strong><small>{movieHintBought ? `${wrongFilm.year} revealed and stored on the ticket.` : "Normally 1 coin · Tutorial sample is free"}</small><div className="tutorial-click-stack"><span>{movieHintBought ? "DONE · THE STICKER STAYS ON THE TICKET" : "CLICK HERE TO REVEAL THE DATE ↓"}</span><button type="button" className="primary-pixel-button" onClick={buyMovieHint}>{movieHintBought ? "Hint owned ✓" : "Try free Movie Hint"}</button></div></div>
        </div>
      ) : null}

      {phase === "director-hint" ? (
        <div className="tutorial-hint-demo is-director-demo">
          <div className="tutorial-hint-object tutorial-director-file"><DirectorSlot slotIndex={0} director={tutorialDirector} films={[]} expectedFilmIds={tutorialFilmIds} isReceiving={false} dropState={null} isSpawning={false} arrivalImpactOrder={null} isArchiving={false} isEliminated={false} isSelected registerRef={() => undefined} onSelect={() => undefined} onOpenDossier={() => undefined} /></div>
          <div className="tutorial-hint-purchase"><span>DIRECTOR HINT · STRONG CLUE</span><strong>Career period</strong><small>{directorHintBought ? directorHintProfile(tutorialDirector.id)?.careerPeriod : "Normally priced by strength · Tutorial sample is free"}</small><div className="tutorial-click-stack"><span>{directorHintBought ? "DONE · THIS NOTE STAYS IN THE DIRECTOR FILE" : "CLICK HERE TO OPEN THE DIRECTOR CLUE ↓"}</span><button type="button" className="primary-pixel-button" onClick={buyDirectorHint}>{directorHintBought ? "Hint owned ✓" : "Try free Director Hint"}</button></div></div>
        </div>
      ) : null}

      {phase === "reference" ? (
        <div className="tutorial-quick-reference">
          <ol>
            <li><b>1</b><span><strong>Drag tickets to Directors</strong><small>Match three movies to clear one Director.</small></span></li>
            <li><b>2</b><span><strong>Wrong guesses add punches</strong><small>The ticket stays on the board so you can keep deducing.</small></span></li>
            <li><b>3</b><span><strong>Use files when needed</strong><small>Magnifying glass = Movie Hints. Blue Director card = Director Hints.</small></span></li>
            <li><b>4</b><span><strong>Keep ahead of arrivals</strong><small>A new Director arrives every three moves. Five full slots means Game Over.</small></span></li>
            <li><b>5</b><span><strong>Complete each Stage</strong><small>Each Stage can introduce a different cinema challenge. Your total score carries forward.</small></span></li>
          </ol>
          <div><button type="button" onClick={resetLesson}>Replay playable lesson</button><button type="button" className="primary-pixel-button" onClick={onClose}>Continue to game</button></div>
        </div>
      ) : null}

      {phase !== "reference" ? <div className="tutorial-live-status" role="status" aria-live="polite">{statusMessage}</div> : null}
      {phase === "director-archived" ? <div className="tutorial-next-action"><span>CLICK TO CONTINUE ↓</span><button type="button" className="primary-pixel-button tutorial-next-button" onClick={() => { setPhase("movie-hint"); setStatusMessage("Choose the free Release Year sample."); }}>Try a Movie Hint</button></div> : null}
      {phase === "movie-hint" && movieHintBought ? <div className="tutorial-next-action"><span>NEXT STEP ↓</span><button type="button" className="primary-pixel-button tutorial-next-button" onClick={() => { setPhase("director-hint"); setStatusMessage("Now open one clue about the filmmaker."); }}>Next: Director Hint</button></div> : null}
      {phase === "director-hint" && directorHintBought ? <div className="tutorial-next-action"><span>YOU’RE READY ↓</span><button type="button" className="primary-pixel-button tutorial-next-button" onClick={finishTutorial}>Finish tutorial</button></div> : null}
    </div>
  );
}
