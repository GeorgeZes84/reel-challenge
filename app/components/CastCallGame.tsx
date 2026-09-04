"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { castActorMap, type CastCallMovie } from "../data/cast-call-data";
import {
  advanceCastCall,
  castCallProgress,
  castCallResult,
  createCastCallState,
  markCastActorReady,
  resolveCastDrop,
  type CastDropOutcome,
  type CastCallProgress,
  type CastCallResult,
  type CastCallState,
} from "../data/cast-call-engine";
import { ActorPolaroid, CameraFlash, MovieCastTarget, type ActorPolaroidPhase, type MovieTargetFeedback } from "./CastCallCards";
import { CastCallResults } from "./CastCallHud";

type DragRecord = {
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLButtonElement;
  cardRect: DOMRect;
  targets: Array<{ movieId: string; rect: DOMRect }>;
};

type DropMotion = {
  element: HTMLButtonElement;
  cardRect: DOMRect;
  targetRect: DOMRect;
  releaseX: number;
  releaseY: number;
  releaseTilt: number;
};

type CastSoundCue = "flash" | "pick" | "correct" | "wrong" | "complete";

const INITIAL_MESSAGE = "One casting photo. Two possible movies. Drag the Polaroid, or choose a movie ticket.";

function transitionDelay(status: CastCallState["status"], reducedMotion: boolean) {
  if (reducedMotion) {
    if (status === "presentingActor") return 40;
    if (status === "resolvingCorrect") return 420;
    if (status === "resolvingWrong") return 650;
    if (status === "retryPause") return 600;
    if (status === "movieComplete") return 800;
    return 0;
  }
  if (status === "presentingActor") return 390;
  if (status === "resolvingCorrect") return 330;
  if (status === "resolvingWrong") return 430;
  if (status === "retryPause") return 560;
  if (status === "movieComplete") return 760;
  return 0;
}

function interactionNowMs() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function CastCallGame({
  movies,
  seed,
  totalScore,
  onProgress,
  onContinue,
  onSound,
  onStatus,
  quickPlay = false,
  onSelectGame,
}: {
  movies: readonly CastCallMovie[];
  seed: string;
  totalScore: number;
  onProgress: (progress: CastCallProgress) => void;
  onContinue: (result: CastCallResult) => void;
  onSound: (cue: CastSoundCue) => void;
  onStatus?: (message: string) => void;
  quickPlay?: boolean;
  onSelectGame?: () => void;
}) {
  const [replayNumber, setReplayNumber] = useState(0);
  const roundSeed = `${seed}:cast-call:${replayNumber}`;
  const [game, setGame] = useState(() => createCastCallState(movies, roundSeed));
  const [hoveredMovieId, setHoveredMovieId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const targetRefs = useRef(new Map<string, HTMLButtonElement>());
  const actorCardRef = useRef<HTMLButtonElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const dragRef = useRef<DragRecord | null>(null);
  const keyboardModeRef = useRef(false);
  const interactionLockedRef = useRef(true);
  const gameRef = useRef(game);
  const onProgressRef = useRef(onProgress);
  const onSoundRef = useRef(onSound);
  const onStatusRef = useRef(onStatus);
  const continueLockedRef = useRef(false);
  const actorsById = useMemo(() => castActorMap(movies), [movies]);
  const moviesById = useMemo(() => new Map(movies.map((movie) => [movie.id, movie] as const)), [movies]);
  const castTotal = useMemo(() => movies.reduce((total, movie) => total + movie.cast.length, 0), [movies]);
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onSoundRef.current = onSound; }, [onSound]);
  useEffect(() => { onStatusRef.current = onStatus; }, [onStatus]);

  const reportMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    onStatusRef.current?.(nextMessage);
  };

  const replaceGame = (next: CastCallState) => {
    gameRef.current = next;
    setGame(next);
  };

  useEffect(() => {
    const progress = castCallProgress(game, movies);
    onProgressRef.current(progress);
  }, [game, movies]);

  const resolvedMovie = game.pendingCompletedMovieId ? moviesById.get(game.pendingCompletedMovieId) : null;
  const statusMessage = game.status === "roundComplete"
    ? "Cast Call complete. Four pictures are locked."
    : game.status === "presentingActor"
      ? "New casting photo developing…"
      : game.status === "resolvingCorrect"
        ? `Correct casting. +${(game.lastResolution?.scoreAwarded ?? 0).toLocaleString("en-US")} points.`
        : game.status === "resolvingWrong"
          ? "Not this picture. The photo will return after a few other auditions."
          : game.status === "retryPause"
            ? "Resetting the casting desk for one more take."
            : game.status === "movieComplete"
              ? `${resolvedMovie?.title ?? "Picture"} cast locked. Bringing in the next production.`
              : message;

  useEffect(() => {
    onStatusRef.current?.(statusMessage);
  }, [statusMessage]);

  useEffect(() => {
    if (game.status === "roundComplete") {
      interactionLockedRef.current = true;
      return;
    }

    if (game.status === "awaitingInput") {
      interactionLockedRef.current = false;
      return;
    }

    interactionLockedRef.current = true;
    const delay = transitionDelay(game.status, reducedMotion);
    if (game.status === "presentingActor") {
      onSoundRef.current("flash");
      const timer = window.setTimeout(() => {
        setMessage(INITIAL_MESSAGE);
        const next = markCastActorReady(gameRef.current, interactionNowMs());
        replaceGame(next);
        if (keyboardModeRef.current) {
          window.requestAnimationFrame(() => actorCardRef.current?.focus({ preventScroll: true }));
        }
      }, delay);
      return () => window.clearTimeout(timer);
    }

    if (delay <= 0) return;
    const completionSoundTimer = game.status === "movieComplete"
      ? window.setTimeout(() => onSoundRef.current("complete"), reducedMotion ? 60 : 120)
      : null;
    const timer = window.setTimeout(() => {
      setMessage(INITIAL_MESSAGE);
      replaceGame(advanceCastCall(gameRef.current, movies));
    }, delay);
    return () => {
      window.clearTimeout(timer);
      if (completionSoundTimer !== null) window.clearTimeout(completionSoundTimer);
    };
  }, [game.status, game.currentActorId, game.transitionSerial, game.pendingCompletedMovieId, game.lastResolution, movies, moviesById, reducedMotion]);

  useEffect(() => {
    if (game.status !== "roundComplete") return;
    const frame = window.requestAnimationFrame(() => resultsHeadingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [game.status]);

  const targetAtPoint = (clientX: number, clientY: number, targets: DragRecord["targets"]) => (
    targets.find(({ rect }) => clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom)?.movieId ?? null
  );

  const clearDropMotion = (element: HTMLButtonElement) => {
    element.style.transform = "";
    element.style.removeProperty("--cast-release-x");
    element.style.removeProperty("--cast-release-y");
    element.style.removeProperty("--cast-release-tilt");
    element.style.removeProperty("--cast-snap-x");
    element.style.removeProperty("--cast-snap-y");
  };

  const prepareCorrectSnap = (motion: DropMotion) => {
    const cardCenterX = motion.cardRect.left + motion.cardRect.width / 2;
    const cardCenterY = motion.cardRect.top + motion.cardRect.height / 2;
    const targetCenterX = motion.targetRect.left + motion.targetRect.width / 2;
    const targetCenterY = motion.targetRect.top + motion.targetRect.height / 2;
    motion.element.style.setProperty("--cast-release-x", `${motion.releaseX}px`);
    motion.element.style.setProperty("--cast-release-y", `${motion.releaseY}px`);
    motion.element.style.setProperty("--cast-release-tilt", `${motion.releaseTilt}deg`);
    motion.element.style.setProperty("--cast-snap-x", `${targetCenterX - cardCenterX}px`);
    motion.element.style.setProperty("--cast-snap-y", `${targetCenterY - cardCenterY}px`);
    motion.element.style.transform = "";
  };

  const submitToMovie = (movieId: string, motion?: DropMotion): CastDropOutcome | null => {
    if (interactionLockedRef.current) {
      if (motion) clearDropMotion(motion.element);
      return null;
    }
    interactionLockedRef.current = true;
    const outcome = resolveCastDrop(gameRef.current, movieId, interactionNowMs(), movies);
    if (!outcome.accepted) {
      interactionLockedRef.current = false;
      if (motion) clearDropMotion(motion.element);
      return outcome;
    }
    if (motion) {
      if (outcome.correct) prepareCorrectSnap(motion);
      else clearDropMotion(motion.element);
    }
    replaceGame(outcome.state);
    onSoundRef.current(outcome.correct ? "correct" : "wrong");
    return outcome;
  };

  const startDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (gameRef.current.status !== "awaitingInput" || interactionLockedRef.current || event.button !== 0) return;
    event.preventDefault();
    keyboardModeRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      element: event.currentTarget,
      cardRect: event.currentTarget.getBoundingClientRect(),
      targets: Array.from(targetRefs.current, ([movieId, element]) => ({ movieId, rect: element.getBoundingClientRect() })),
    };
    setDragging(true);
    onSoundRef.current("pick");
    reportMessage("Release the Polaroid over either glowing movie ticket.");
  };

  const moveDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const tilt = Math.max(-7, Math.min(7, deltaX / 35));
    drag.element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${tilt}deg) scale(1.045)`;
    const targetMovieId = targetAtPoint(event.clientX, event.clientY, drag.targets);
    setHoveredMovieId((current) => current === targetMovieId ? current : targetMovieId);
  };

  const resetDrag = () => {
    const drag = dragRef.current;
    if (drag) clearDropMotion(drag.element);
    dragRef.current = null;
    setDragging(false);
    setHoveredMovieId(null);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = drag.targets.find(({ rect }) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) ?? null;
    dragRef.current = null;
    setDragging(false);
    setHoveredMovieId(null);
    if (!target) {
      clearDropMotion(drag.element);
      reportMessage("The photo returned to the casting desk. Drop it directly on a movie ticket, or click one.");
      return;
    }
    const releaseX = event.clientX - drag.startX;
    const releaseY = event.clientY - drag.startY;
    submitToMovie(target.movieId, {
      element: drag.element,
      cardRect: drag.cardRect,
      targetRect: target.rect,
      releaseX,
      releaseY,
      releaseTilt: Math.max(-7, Math.min(7, releaseX / 35)),
    });
  };

  const cancelDragging = () => {
    if (!dragRef.current) return;
    resetDrag();
    reportMessage(INITIAL_MESSAGE);
  };

  const handleActorKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "1" && event.key !== "2") return;
    event.preventDefault();
    keyboardModeRef.current = true;
    const targetIndex = event.key === "ArrowLeft" || event.key === "1" ? 0 : 1;
    const movieId = gameRef.current.activeMovieIds[targetIndex];
    if (movieId) submitToMovie(movieId);
  };

  const replay = () => {
    const nextReplayNumber = replayNumber + 1;
    const next = createCastCallState(movies, `${seed}:cast-call:${nextReplayNumber}`);
    continueLockedRef.current = false;
    interactionLockedRef.current = true;
    setReplayNumber(nextReplayNumber);
    setHoveredMovieId(null);
    setDragging(false);
    setMessage(INITIAL_MESSAGE);
    replaceGame(next);
  };

  const continueRun = () => {
    if (continueLockedRef.current || gameRef.current.status !== "roundComplete") return;
    continueLockedRef.current = true;
    onContinue(castCallResult(gameRef.current, movies));
  };

  const actor = game.currentActorId ? actorsById.get(game.currentActorId) ?? null : null;
  const auditionNumber = Math.min(castTotal, game.totalCorrect + (["resolvingCorrect", "movieComplete", "roundComplete"].includes(game.status) ? 0 : 1));
  const actorPhase: ActorPolaroidPhase = dragging
    ? "dragging"
    : game.status === "presentingActor"
      ? "presenting"
      : game.status === "resolvingWrong"
        ? "wrong"
        : game.status === "resolvingCorrect" || game.status === "movieComplete"
          ? "correct"
          : "ready";

  const feedbackFor = (movieId: string): MovieTargetFeedback => {
    if (game.status === "movieComplete" && game.pendingCompletedMovieId === movieId) return "completing";
    if (game.lastResolution?.targetMovieId === movieId && game.status === "resolvingWrong") return "wrong";
    if (game.lastResolution?.targetMovieId === movieId && game.status === "resolvingCorrect") return "correct";
    if (hoveredMovieId === movieId) return "hovered";
    return "neutral";
  };

  return (
    <div
      className={`cast-call-stage is-${game.status}${dragging ? " is-dragging" : ""}`}
      onPointerMove={moveDragging}
      onPointerUp={stopDragging}
      onPointerCancel={cancelDragging}
      onLostPointerCapture={cancelDragging}
    >
      {game.status === "presentingActor" ? <CameraFlash serial={game.transitionSerial} key={`flash-${game.transitionSerial}-${game.currentActorId}`} /> : null}
      <header className="cast-call-heading">
        <span>{quickPlay ? "GAME 03 · CAST CALL" : "STAGE 3 · CAST CALL"}</span>
        <h2>Who belongs in this picture?</h2>
        <p>One casting photo at a time. Match the actor to either active movie—there is no countdown.</p>
      </header>

      <div className="cast-call-movies" aria-label="Active movie casting targets">
        {game.activeMovieIds.map((movieId) => {
          const movie = moviesById.get(movieId);
          if (!movie) return null;
          const completedIds = new Set(game.completedCastByMovie[movieId] ?? []);
          const completedActors = movie.cast.filter((castMember) => completedIds.has(castMember.actorId));
          return (
            <MovieCastTarget
              movie={movie}
              completedActors={completedActors}
              feedback={feedbackFor(movieId)}
              isEntering={game.enteringMovieId === movieId}
              disabled={game.status !== "awaitingInput"}
              targetRef={(element) => { if (element) targetRefs.current.set(movieId, element); else targetRefs.current.delete(movieId); }}
              onChoose={(event) => {
                keyboardModeRef.current = event.detail === 0;
                submitToMovie(movieId);
              }}
              key={movieId}
            />
          );
        })}
      </div>

      <div className="actor-polaroid-tray">
        <div className="casting-desk-label"><span>CURRENT AUDITION</span><b>{auditionNumber}/{castTotal}</b></div>
        {actor ? (
          <ActorPolaroid
            key={`${actor.actorId}-${game.transitionSerial}`}
            actor={actor}
            phase={actorPhase}
            cardRef={actorCardRef}
            onPointerDown={startDragging}
            onKeyDown={handleActorKey}
          />
        ) : <div className="cast-call-deck-complete">{game.status === "retryPause" ? "RESETTING FOR RETAKE" : "CASTING COMPLETE ✓"}</div>}
        <small>Drag the photo, click a movie ticket, or use ← / →.</small>
      </div>

      <div className="cast-call-status" role="status" aria-live="polite">{statusMessage}</div>

      {game.status === "roundComplete" ? (
        <CastCallResults
          result={castCallResult(game, movies)}
          totalScore={totalScore}
          headingRef={resultsHeadingRef}
          onReplay={replay}
          onContinue={continueRun}
          quickPlay={quickPlay}
          onSelectGame={onSelectGame}
        />
      ) : null}
    </div>
  );
}
